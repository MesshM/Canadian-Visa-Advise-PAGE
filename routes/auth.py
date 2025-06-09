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
import logging

# Configurar logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

def cargar_imagen_perfil_en_sesion(user_id):
    """Cargar imagen de perfil del usuario en la sesión"""
    try:
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            cursor.execute("""
                SELECT cloudinary_public_id FROM tbl_perfil_fotos
                WHERE id_usuario = %s
            """, (user_id,))
            
            profile_photo = cursor.fetchone()
            if profile_photo and profile_photo['cloudinary_public_id']:
                session['profile_photo'] = cloudinary.CloudinaryImage(profile_photo['cloudinary_public_id']).build_url(
                    width=200, 
                    height=200, 
                    crop="fill", 
                    gravity="face", 
                    fetch_format="auto", 
                    quality="auto"
                )
            else:
                cursor.execute("SELECT foto_perfil FROM tbl_usuario WHERE id_usuario = %s", (user_id,))
                user_photo = cursor.fetchone()
                if user_photo and user_photo['foto_perfil']:
                    session['profile_photo'] = user_photo['foto_perfil']
                elif 'profile_photo' in session:
                    session.pop('profile_photo')
            
            cursor.close()
            connection.close()
            return True
    except Exception as e:
        logger.error(f"Error al cargar imagen de perfil en sesión: {str(e)}")
        return False

def verificar_password(password_input, password_stored):
    """Verificar contraseña, manejando tanto texto plano como hash"""
    if not password_stored:
        logger.debug("No hay contraseña almacenada")
        return False
    
    logger.debug(f"Verificando contraseña. Input: {password_input}, Stored length: {len(password_stored)}")
    
    # Si la contraseña almacenada parece ser un hash (más de 50 caracteres y empieza con algoritmos conocidos)
    if len(password_stored) > 50 and password_stored.startswith(('scrypt:', 'pbkdf2:', 'argon2:')):
        logger.debug("Contraseña almacenada es hash, usando check_password_hash")
        return check_password_hash(password_stored, password_input)
    else:
        # Si es texto plano, comparar directamente
        logger.debug("Contraseña almacenada es texto plano, comparando directamente")
        result = password_input == password_stored
        logger.debug(f"Resultado comparación texto plano: {result}")
        return result

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

        # Manejar login de administradores
        if email.endswith('@admincva.com'):
            connection = create_connection()
            if connection:
                cursor = connection.cursor(dictionary=True)
<<<<<<< HEAD
                cursor.execute("SELECT * FROM tbl_administrador WHERE correo = %s", (email,))
                admin = cursor.fetchone()
                if admin and verificar_password(password, admin['password']):
                    session['user_id'] = admin['id_usuario']  # Usar id_usuario
                    session['user_name'] = f"{admin['nombre']} {admin['apellidos']}"
                    session['user_role'] = 'Administrador'
                    session['is_admin'] = True
                    session['admin_id'] = admin['id_administrador']
=======
                cursor.execute("SELECT * FROM tbl_asesor WHERE correo = %s", (email,))
                asesor = cursor.fetchone()
                if asesor and check_password_hash(asesor['password'], password):
                    # Iniciar sesión solo con datos de tbl_asesor
                    session['user_id'] = asesor['id_asesor']
                    session['user_name'] = f"{asesor['nombre']} {asesor['apellidos']}"
                    session['user_role'] = 'Asesor'
>>>>>>> 9640e1e49e2215a464c9e5a42f112539c54e5812
                    session.permanent = True if remember_me else False
                    cursor.close()
                    connection.close()
<<<<<<< HEAD
                    flash('Bienvenido, Administrador', 'success')
                    return redirect(url_for('admin.index'))
=======
                    return redirect(url_for('panel_asesor.index_asesor'))
>>>>>>> 9640e1e49e2215a464c9e5a42f112539c54e5812
                else:
                    flash('Correo o contraseña incorrectos', 'error')
                cursor.close()
                connection.close()
            else:
                flash('Error de conexión a la base de datos', 'error')
            return render_template('login.html', needs_2fa=False)

        # Manejar login de asesores
        elif email.endswith('@cva.com') or email.endswith('@asesorcva.com'):
            connection = create_connection()
            if connection:
                cursor = connection.cursor(dictionary=True)
                cursor.execute("SELECT * FROM tbl_asesor WHERE correo = %s", (email,))
                asesor = cursor.fetchone()
                if asesor and verificar_password(password, asesor['password']):
                    session['user_id'] = asesor['id_usuario']  # Usar id_usuario
                    session['user_name'] = f"{asesor['nombre']} {asesor['apellidos']}"
                    session['user_role'] = 'Asesor'
                    session['is_admin'] = True
                    session['advisor_id'] = asesor['id_asesor']
                    session.permanent = True if remember_me else False
                    cursor.close()
                    connection.close()
                    flash('Bienvenido, Asesor', 'success')
                    return redirect(url_for('asesor.index'))  # Cambiar a asesor.index
                else:
                    flash('Correo o contraseña incorrectos', 'error')
                cursor.close()
                connection.close()
            else:
                flash('Error de conexión a la base de datos', 'error')
            return render_template('login.html', needs_2fa=False)

        # Manejar login de usuarios regulares
        else:
            connection = create_connection()
            if connection:
                cursor = connection.cursor(dictionary=True)
                cursor.execute("SELECT * FROM tbl_usuario WHERE correo = %s", (email,))
                user = cursor.fetchone()
                
                if user and verificar_password(password, user['contrasena']):
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
                        session['temp_user_role'] = 'Usuario'
                        
                        cursor.close()
                        connection.close()
                        return render_template('login.html', needs_2fa=True)
                    
                    # Si no tiene 2FA, continuar con el login normal
                    session['user_id'] = user['id_usuario']
                    session['user_name'] = f"{user['nombres']} {user['apellidos']}"
                    session['user_role'] = 'Usuario'
                    session['is_admin'] = False
                    
                    if remember_me:
                        session.permanent = True
                    else:
                        session.permanent = False
                    
                    # Cargar la imagen de perfil en la sesión
                    cargar_imagen_perfil_en_sesion(user['id_usuario'])
                    
<<<<<<< HEAD
                    cursor.close()
                    connection.close()
                    flash('Bienvenido', 'success')
                    return redirect(url_for('index'))
=======
                    # Redirigir según el rol
                    if email.endswith('@cva.com'):
                        return redirect(url_for('asesor.index_asesor'))
                    else:
                        return redirect(url_for('index'))
>>>>>>> 9640e1e49e2215a464c9e5a42f112539c54e5812
                else:
                    flash('Correo o contraseña incorrectos', 'error')
                    cursor.close()
                    connection.close()
            else:
                flash('Error de conexión a la base de datos', 'error')
    
    return render_template('login.html')

@auth_bp.route('/verify_2fa', methods=['POST'])
def verify_2fa():
    if 'temp_user_id' not in session or '2fa_secret' not in session:
        return redirect(url_for('auth.login'))
    
    code = request.form.get('totp_code')
    if not code:
        flash('Código de verificación requerido', 'error')
        return render_template('login.html', needs_2fa=True)
    
    # Limpiar el código
    code = ''.join(c for c in code if c.isdigit())
    
    if len(code) != 6:
        flash('El código debe tener 6 dígitos', 'error')
        return render_template('login.html', needs_2fa=True)
    
    # Verificar código TOTP
    totp = pyotp.TOTP(session['2fa_secret'])
    
    if totp.verify(code, valid_window=2):
        # Código válido - completar login
        session['user_id'] = session['temp_user_id']
        session['user_name'] = session['temp_user_name']
        session['user_role'] = session['temp_user_role']
        session['is_admin'] = False
        
        if session.get('temp_remember_me'):
            session.permanent = True
        
        cargar_imagen_perfil_en_sesion(session['temp_user_id'])
        
        # Limpiar variables temporales
        for key in ['temp_user_id', 'temp_user_name', 'temp_remember_me', 'temp_email', 
                   'temp_user_role', 'needs_2fa', '2fa_secret']:
            session.pop(key, None)
        
<<<<<<< HEAD
        flash('Autenticación exitosa', 'success')
        return redirect(url_for('index'))
=======
        # Redirigir según el rol
        if session.get('user_role') == 'Asesor':
            return redirect(url_for('asesor.index_asesor'))
        else:
            return redirect(url_for('index'))
>>>>>>> 9640e1e49e2215a464c9e5a42f112539c54e5812
    else:
        flash('Código de verificación incorrecto', 'error')
        return render_template('login.html', needs_2fa=True)

@auth_bp.route('/registro', methods=['GET', 'POST'])
def registro():
    if request.method == 'POST':
        nombres = request.form['nombres']
        apellidos = request.form['apellidos']
        correo = request.form['correo']
        contrasena = request.form['contrasena']
        fecha_nacimiento = request.form['fecha_nacimiento']
        
        # Verificar si la persona tiene al menos 18 años
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
                # Verificar si el correo ya existe
                cursor.execute("SELECT * FROM tbl_usuario WHERE correo = %s", (correo,))
                existing_user = cursor.fetchone()
                if existing_user:
                    flash('El correo ya está registrado. Por favor, usa otro correo.', 'error')
                    return redirect(url_for('auth.registro'))
                
                hashed_password = generate_password_hash(contrasena)
                
                # Crear usuario
                if fecha_nacimiento:
                    cursor.execute(
                        "INSERT INTO tbl_usuario (nombres, apellidos, correo, contrasena, fecha_nacimiento) VALUES (%s, %s, %s, %s, %s)",
                        (nombres, apellidos, correo, hashed_password, fecha_nacimiento)
                    )
                else:
                    cursor.execute(
                        "INSERT INTO tbl_usuario (nombres, apellidos, correo, contrasena) VALUES (%s, %s, %s, %s)",
                        (nombres, apellidos, correo, hashed_password)
                    )
                
                user_id = cursor.lastrowid
                
                # Crear registro según el tipo de correo
                if correo.endswith('@cva.com') or correo.endswith('@asesorcva.com'):
                    cursor.execute("""
                        INSERT INTO tbl_asesor (id_usuario, nombre, apellidos, correo, password) 
                        VALUES (%s, %s, %s, %s, %s)
                    """, (user_id, nombres, apellidos, correo, hashed_password))
                elif correo.endswith('@admincva.com'):
                    cursor.execute("""
                        INSERT INTO tbl_administrador (id_usuario, nombre, apellidos, correo, password) 
                        VALUES (%s, %s, %s, %s, %s)
                    """, (user_id, nombres, apellidos, correo, hashed_password))
                else:
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
    # Generar captcha
    if 'captcha_text' not in session or request.method == 'GET':
        captcha_text = generate_captcha_text()
        session['captcha_text'] = captcha_text
    else:
        captcha_text = session['captcha_text']
    
    if request.method == 'POST':
        email = request.form['email']
        user_captcha = request.form.get('captcha')
        
        # Validar captcha
        if user_captcha != session.get('captcha_text'):
            flash('El código de verificación es incorrecto', 'error')
            new_captcha = generate_captcha_text()
            session['captcha_text'] = new_captcha
            return render_template('forgot_password.html', captcha_text=new_captcha)
        
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            try:
                user_id = None
                
                # Buscar usuario según el tipo de correo
                if email.endswith('@admincva.com'):
                    cursor.execute("SELECT id_usuario FROM tbl_administrador WHERE correo = %s", (email,))
                    result = cursor.fetchone()
                    if result:
                        user_id = result['id_usuario']
                elif email.endswith('@cva.com') or email.endswith('@asesorcva.com'):
                    cursor.execute("SELECT id_usuario FROM tbl_asesor WHERE correo = %s", (email,))
                    result = cursor.fetchone()
                    if result:
                        user_id = result['id_usuario']
                else:
                    cursor.execute("SELECT id_usuario FROM tbl_usuario WHERE correo = %s", (email,))
                    result = cursor.fetchone()
                    if result:
                        user_id = result['id_usuario']
                
                if not user_id:
                    flash('No existe una cuenta con este correo electrónico', 'error')
                    return render_template('forgot_password.html', captcha_text=captcha_text)
                
                # Generar token de reset
                token = generate_reset_token()
                expiration = generate_token_expiration()
                
                # Eliminar tokens anteriores
                cursor.execute("DELETE FROM tbl_password_reset WHERE user_id = %s", (user_id,))
                
                # Guardar nuevo token
                cursor.execute("""
                    INSERT INTO tbl_password_reset (user_id, token, expiration) 
                    VALUES (%s, %s, %s)
                """, (user_id, token, expiration))
                
                connection.commit()
                
                # Enviar correo
                reset_url = url_for('auth.reset_password', token=token, _external=True)
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
                logger.error(f"Error en forgot_password: {str(e)}")
                flash('Ocurrió un error al procesar tu solicitud', 'error')
            finally:
                cursor.close()
                connection.close()
        else:
            flash('Error de conexión a la base de datos', 'error')
    
    return render_template('forgot_password.html', captcha_text=captcha_text)

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
                confirm_password = request.form.get('confirm_password')
                
                if 'confirm_password' in request.form and new_password != confirm_password:
                    flash('Las contraseñas no coinciden', 'error')
                    return render_template('reset_password.html', token=token)
                
                hashed_password = generate_password_hash(new_password)
                
                # Actualizar contraseña en tbl_usuario
                cursor.execute("""
                    UPDATE tbl_usuario 
                    SET contrasena = %s 
                    WHERE id_usuario = %s
                """, (hashed_password, reset_request['user_id']))
                
                # Obtener correo del usuario
                cursor.execute("SELECT correo FROM tbl_usuario WHERE id_usuario = %s", (reset_request['user_id'],))
                user_email = cursor.fetchone()['correo']
                
                # Actualizar también en tabla de asesor o administrador si corresponde
                if user_email.endswith('@cva.com') or user_email.endswith('@asesorcva.com'):
                    cursor.execute("""
                        UPDATE tbl_asesor 
                        SET password = %s 
                        WHERE id_usuario = %s
                    """, (hashed_password, reset_request['user_id']))
                elif user_email.endswith('@admincva.com'):
                    cursor.execute("""
                        UPDATE tbl_administrador 
                        SET password = %s 
                        WHERE id_usuario = %s
                    """, (hashed_password, reset_request['user_id']))
                
                # Eliminar token usado
                cursor.execute("DELETE FROM tbl_password_reset WHERE token = %s", (token,))
                
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
    session.clear()
    flash('Has cerrado sesión correctamente', 'success')
    return redirect(url_for('auth.login'))

@auth_bp.route('/debug_login', methods=['GET'])
def debug_login():
    """Ruta para depurar problemas de inicio de sesión"""
    connection = create_connection()
    if not connection:
        return jsonify({"error": "No se pudo conectar a la base de datos"})
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        # Verificar administradores
        cursor.execute("""
            SELECT id_administrador, nombre, apellidos, correo, 
                   CASE 
                       WHEN password IS NULL THEN 'SIN CONTRASEÑA'
                       WHEN LENGTH(password) < 50 THEN 'TEXTO PLANO'
                       ELSE 'HASHEADA'
                   END as estado_password,
                   password,
                   id_usuario
            FROM tbl_administrador
        """)
        admins = cursor.fetchall()
        
        # Verificar asesores
        cursor.execute("""
            SELECT id_asesor, nombre, apellidos, correo,
                   CASE 
                       WHEN password IS NULL THEN 'SIN CONTRASEÑA'
                       WHEN LENGTH(password) < 50 THEN 'TEXTO PLANO'
                       ELSE 'HASHEADA'
                   END as estado_password,
                   password,
                   id_usuario
            FROM tbl_asesor
        """)
        asesores = cursor.fetchall()
        
        # Contar usuarios
        cursor.execute("SELECT COUNT(*) as total FROM tbl_usuario")
        total_usuarios = cursor.fetchone()['total']
        
        debug_info = {
            "connection_status": "Conexión exitosa",
            "total_usuarios": total_usuarios,
            "administradores": admins,
            "asesores": asesores,
            "session_data": {k: v for k, v in session.items() if k not in ['_permanent', 'csrf_token']}
        }
        
        return jsonify(debug_info)
        
    except Exception as e:
        return jsonify({"error": str(e)})
    finally:
        cursor.close()
        connection.close()
