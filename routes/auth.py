from flask import Blueprint, request, redirect, url_for, flash, render_template, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, date, timedelta
from config.database import create_connection
from config.email import send_email_via_zoho
from utils.auth_helpers import generate_captcha_text, generate_reset_token, generate_token_expiration
from mysql.connector import Error
import cloudinary
import cloudinary.api
import random, string
import pyotp
import time
import re

auth_bp = Blueprint('auth', __name__)

# Modificar la función cargar_imagen_perfil_en_sesion para que sea más eficiente
def cargar_imagen_perfil_en_sesion(user_id):
    try:
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Obtener la imagen de perfil del usuario
            cursor.execute("""
                SELECT cloudinary_public_id FROM tbl_perfil_fotos
                WHERE id_usuario = %s
            """, (user_id,))
            
            profile_photo = cursor.fetchone()
            if profile_photo and profile_photo['cloudinary_public_id']:
            # Guardar la URL de la imagen en la sesión
                
                # Construir la URL con Cloudinary para optimizar la carga
                session['profile_photo'] = cloudinary.CloudinaryImage(profile_photo['cloudinary_public_id']).build_url(
                    width=200, 
                    height=200, 
                    crop="fill", 
                    gravity="face", 
                    fetch_format="auto", 
                    quality="auto"
                )
            else:
                # Si no hay foto de perfil, asegurarse de que no haya una URL en la sesión
                if 'profile_photo' in session:
                    session.pop('profile_photo')
            
            cursor.close()
            connection.close()
            
            return True
    except Exception as e:
        print(f"Error al cargar imagen de perfil en sesión: {str(e)}")
        return False

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        # Limpiar variables temporales de 2FA si existen
        session.pop('temp_user_id', None)
        session.pop('temp_user_name', None)
        session.pop('temp_remember_me', None)
        session.pop('temp_email', None)
        session.pop('needs_2fa', None)
        session.pop('2fa_secret', None)
    
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        remember_me = request.form.get('remember_me')

        if email.endswith('@cva.com'):
            # Buscar en tbl_asesor
            connection = create_connection()
            if connection:
                cursor = connection.cursor(dictionary=True)
                cursor.execute("SELECT * FROM tbl_asesor WHERE correo = %s", (email,))
                asesor = cursor.fetchone()
                if asesor and check_password_hash(asesor['password'], password):
                    # Iniciar sesión solo con datos de tbl_asesor
                    session['user_id'] = asesor['id_asesor']
                    session['user_name'] = f"{asesor['nombre']} {asesor['apellidos']}"
                    session['user_role'] = 'Asesor'
                    session['is_admin'] = True
                    session.permanent = True if remember_me else False
                    # Si tienes fotos de perfil para asesores, llama aquí a cargar_imagen_perfil_en_sesion(asesor['id_asesor'])
                    cursor.close()
                    connection.close()
                    return redirect(url_for('admin.index_asesor'))
                else:
                    flash('Correo o contraseña incorrectos', 'error')
                cursor.close()
                connection.close()
            else:
                flash('Error de conexión a la base de datos', 'error')
            return render_template('login.html', needs_2fa=False)
        else:
            connection = create_connection()
            if connection:
                cursor = connection.cursor(dictionary=True)
                cursor.execute("SELECT * FROM tbl_usuario WHERE correo = %s", (email,))
                user = cursor.fetchone()
                
                if user and check_password_hash(user['contrasena'], password):
                    # Verificar si el usuario tiene 2FA activado
                    cursor.execute("SELECT * FROM tbl_2fa WHERE id_usuario = %s AND activo = 1", (user['id_usuario'],))
                    has_2fa = cursor.fetchone()
                    
                    if has_2fa:
                        # Si tiene 2FA, guardar datos temporales en la sesión y mostrar pantalla de verificación
                        session['temp_user_id'] = user['id_usuario']
                        session['temp_user_name'] = f"{user['nombres']} {user['apellidos']}"
                        session['temp_remember_me'] = True if remember_me else False
                        session['temp_email'] = email
                        session['needs_2fa'] = True
                        session['2fa_secret'] = has_2fa['secret_key']
                        
                        cursor.close()
                        connection.close()
                        return render_template('login.html', needs_2fa=True)
                    
                    # Si no tiene 2FA o después de verificarlo, continuar con el login normal
                    session['user_id'] = user['id_usuario']
                    session['user_name'] = f"{user['nombres']} {user['apellidos']}"
                    
                    # Verificar el rol del usuario
                    if email.endswith('@cva.com'):
                        session['user_role'] = 'Asesor'
                        session['is_admin'] = True
                    else:
                        session['user_role'] = 'Usuario'
                        session['is_admin'] = False
                    
                    if remember_me:
                        session.permanent = True
                    else:
                        session.permanent = False
                    
                    # Cargar la imagen de perfil en la sesión
                    cargar_imagen_perfil_en_sesion(user['id_usuario'])
                    
                    # Redirigir según el rol
                    if email.endswith('@cva.com'):
                        return redirect(url_for('admin.index_asesor'))
                    else:
                        return redirect(url_for('index'))
                else:
                    flash('Correo o contraseña incorrectos', 'error')
                    cursor.close()
                    connection.close()
            else:
                flash('Error de conexión a la base de datos', 'error')
    
    return render_template('login.html', needs_2fa=session.get('needs_2fa', False))

@auth_bp.route('/verify_2fa', methods=['POST'])
def verify_2fa():
    if 'temp_user_id' not in session or '2fa_secret' not in session:
        return redirect(url_for('auth.login'))
    
    code = request.form.get('totp_code')
    if not code:
        flash('Código de verificación requerido', 'error')
        return render_template('login.html', needs_2fa=True)
    
    # Limpiar el código (eliminar espacios y caracteres no numéricos)
    code = ''.join(c for c in code if c.isdigit())
    
    # Verificar que el código tenga 6 dígitos
    if len(code) != 6:
        flash('El código debe tener 6 dígitos', 'error')
        return render_template('login.html', needs_2fa=True)
    
    # Crear objeto TOTP con la clave secreta
    totp = pyotp.TOTP(session['2fa_secret'])
    
    # Intentar verificar con una ventana de tiempo más amplia (2 periodos antes y después)
    verified = False
    
    # Verificar el código con la ventana de validación estándar
    if totp.verify(code, valid_window=2):
        verified = True
    else:
        # Si falla, intentar verificar manualmente con diferentes desplazamientos de tiempo
        # Esto ayuda con problemas de sincronización de reloj
        
        timestamp = int(time.time())
        for drift in range(-4, 5):  # Probar con un rango más amplio de desplazamiento
            drift_timestamp = timestamp + (drift * 30)
            if totp.verify(code, for_time=drift_timestamp):
                verified = True
                break
    
    if verified:
        # Código válido, completar el inicio de sesión
        user_id = session['temp_user_id']
        
        # Establecer las variables de sesión permanentes
        session['user_id'] = user_id
        session['user_name'] = session['temp_user_name']
        
        # Verificar el rol del usuario
        if session['temp_email'].endswith('@cva.com'):
            session['user_role'] = 'Asesor'
            session['is_admin'] = True
        else:
            session['user_role'] = 'Usuario'
            session['is_admin'] = False
        
        if session.get('temp_remember_me'):
            session.permanent = True
        else:
            session.permanent = False
        
        # Cargar la imagen de perfil en la sesión
        cargar_imagen_perfil_en_sesion(user_id)
        
        # Limpiar variables temporales
        session.pop('temp_user_id', None)
        session.pop('temp_user_name', None)
        session.pop('temp_remember_me', None)
        session.pop('temp_email', None)
        session.pop('needs_2fa', None)
        session.pop('2fa_secret', None)
        
        # Redirigir según el rol
        if session.get('user_role') == 'Asesor':
            return redirect(url_for('admin.index_asesor'))
        else:
            return redirect(url_for('index'))
    else:
        flash('Código de verificación incorrecto. Por favor, inténtalo de nuevo.', 'error')
        return render_template('login.html', needs_2fa=True)

@auth_bp.route('/registro', methods=['GET', 'POST'])
def registro():
    if request.method == 'POST':
        nombres = request.form['nombres']
        apellidos = request.form['apellidos']
        correo = request.form['correo']
        contrasena = request.form['contrasena']
        fecha_nacimiento = request.form['fecha_nacimiento']
        # ✅ Verificar si la persona tiene al menos 18 años
        fecha_nac = datetime.strptime(fecha_nacimiento, '%Y-%m-%d').date()
        hoy = date.today()
        edad = hoy.year - fecha_nac.year - ((hoy.month, hoy.day) < (fecha_nac.month, fecha_nac.day))
        if edad < 18:
            flash('Debes tener al menos 18 años para registrarte.', 'error')
            return redirect(url_for('auth.registro'))
        # Validar solo letras y espacios, mínimo 2 caracteres
        if not re.match(r'^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,}$', nombres) or not re.match(r'^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,}$', apellidos):
            flash('Nombre y apellido solo pueden contener letras y espacios, mínimo 2 caracteres.', 'error')
            return redirect(url_for('auth.registro'))
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            try:
                # ✅ Verificar si el correo ya está registrado
                cursor.execute("SELECT * FROM tbl_usuario WHERE correo = %s", (correo,))
                existing_user = cursor.fetchone()
                if existing_user:
                    flash('El correo ya está registrado. Por favor, usa otro correo.', 'error')
                    return redirect(url_for('auth.registro'))
                # Si todo está bien, proceder con el registro
                hashed_password = generate_password_hash(contrasena)
                cursor.execute(
                    "INSERT INTO tbl_usuario (nombres, apellidos, correo, contrasena, fecha_nacimiento) VALUES (%s, %s, %s, %s, %s)",
                    (nombres, apellidos, correo, hashed_password, fecha_nacimiento)
                )
                user_id = cursor.lastrowid
                cursor.execute("INSERT INTO tbl_solicitante (id_usuario) VALUES (%s)", (user_id,))
                connection.commit()
                flash('Registro exitoso. Ahora puedes iniciar sesión.', 'success')
                return redirect(url_for('auth.login'))
            except Error as e:
                connection.rollback()
                flash(f'Error al registrar: {e}', 'error')
            finally:
                cursor.close()
                connection.close()
        else:
            flash('Error de conexión a la base de datos', 'error')
    return render_template('registro.html')

@auth_bp.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    # Generar un nuevo captcha si no existe en la sesión o si es una solicitud GET
    if 'captcha_text' not in session or request.method == 'GET':
        captcha_text = generate_captcha_text()
        session['captcha_text'] = captcha_text
    else:
        captcha_text = session['captcha_text']
    
    if request.method == 'POST':
        email = request.form['email']
        user_captcha = request.form.get('captcha')  # Captcha ingresado por el usuario
        
        # Validar el captcha
        if user_captcha != session.get('captcha_text'):
            flash('El código de verificación es incorrecto', 'error')
            # Generar un nuevo captcha después de un intento fallido
            new_captcha = generate_captcha_text()
            session['captcha_text'] = new_captcha
            return render_template('forgot_password.html', captcha_text=new_captcha)
        
        # Verificar si el correo existe en la base de datos
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            try:
                cursor.execute("SELECT id_usuario FROM tbl_usuario WHERE correo = %s", (email,))
                user = cursor.fetchone()
                
                if not user:
                    flash('No existe una cuenta con este correo electrónico', 'error')
                    return render_template('forgot_password.html', captcha_text=captcha_text)
                
                # Generar token y fecha de expiración
                token = generate_reset_token()
                expiration = generate_token_expiration()
                
                # Eliminar tokens anteriores para este usuario
                cursor.execute("DELETE FROM tbl_password_reset WHERE user_id = %s", (user['id_usuario'],))
                
                # Guardar el nuevo token
                cursor.execute("""
                    INSERT INTO tbl_password_reset (user_id, token, expiration) 
                    VALUES (%s, %s, %s)
                """, (user['id_usuario'], token, expiration))
                
                connection.commit()
                
                # Construir URL de restablecimiento
                reset_url = url_for('auth.reset_password', token=token, _external=True)
                
                # Enviar correo con instrucciones
                subject = "Instrucciones para restablecer tu contraseña"
                body = f"""
                Hola,
                
                Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:
                
                {reset_url}
                
                Este enlace expirará en 1 hora.
                
                Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.
                
                Saludos,
                El equipo de soporte
                """
                
                send_email_via_zoho(email, subject, body)
                
                flash('Se han enviado instrucciones para restablecer tu contraseña a tu correo electrónico', 'success')
                return redirect(url_for('auth.login'))
                
            except Exception as e:
                connection.rollback()
                print(f"Error en forgot_password: {str(e)}")
                flash('Ocurrió un error al procesar tu solicitud', 'error')
            finally:
                cursor.close()
                connection.close()
        else:
            flash('Error de conexión a la base de datos', 'error')
    
    return render_template('forgot_password.html', captcha_text=captcha_text)

@auth_bp.route('/refresh_captcha')
def refresh_captcha():
    try:
        captcha_text = generate_captcha_text()
        session['captcha_text'] = captcha_text  # Guardar el nuevo captcha en la sesión
        return jsonify({'captcha_text': captcha_text, 'success': True})
    except Exception as e:
        print(f"Error al generar captcha: {str(e)}")
        # Generar un captcha de respaldo en caso de error
        backup_captcha = ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(6))
        session['captcha_text'] = backup_captcha
        return jsonify({'captcha_text': backup_captcha, 'success': True})

@auth_bp.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("""
                SELECT user_id, expiration 
                FROM tbl_password_reset 
                WHERE token = %s AND expiration > CONVERT_TZ(NOW(), 'UTC', 'America/Bogota')
            """, (token,))
            
            reset_request = cursor.fetchone()
            
            if not reset_request:
                flash('El enlace es inválido o ha expirado', 'error')
                return redirect(url_for('auth.login'))
            
            if request.method == 'POST':
                new_password = request.form['password']
                hashed_password = generate_password_hash(new_password)
                
                # Actualizar contraseña
                cursor.execute("""
                    UPDATE tbl_usuario 
                    SET contrasena = %s 
                    WHERE id_usuario = %s
                """, (hashed_password, reset_request['user_id']))
                
                # Eliminar token usado
                cursor.execute("""
                    DELETE FROM tbl_password_reset 
                    WHERE token = %s
                """, (token,))
                
                connection.commit()
                flash('Tu contraseña ha sido actualizada exitosamente', 'success')
                return redirect(url_for('auth.login'))
            
            return render_template('reset_password.html', token=token)
            
        except Error as e:
            connection.rollback()
            flash('Error al restablecer la contraseña', 'error')
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
    
    return redirect(url_for('auth.login'))

@auth_bp.route('/logout')
def logout():
    # Eliminar todas las variables de sesión
    session.clear()
    flash('Has cerrado sesión correctamente', 'success')
    return redirect(url_for('auth.login'))
