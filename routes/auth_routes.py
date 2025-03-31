from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from database import create_connection
from utils.email_utils import send_email_via_zoho
from utils.captcha_utils import generate_captcha_text
import secrets
from datetime import datetime, timedelta, date
from pytz import timezone
from mysql.connector import Error

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/')
def index():
    if 'user_id' not in session:
        # Si no hay usuario logueado, mostrar la página de inicio con botones de registro y login
        return render_template('index.html', logged_in=False)
    else:
        # Si hay usuario logueado, mostrar el dashboard
        return render_template('index.html', logged_in=True)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        remember_me = request.form.get('remember_me')
        
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT * FROM tbl_usuario WHERE correo = %s", (email,))
            user = cursor.fetchone()
            cursor.close()
            connection.close()
            
            if user and check_password_hash(user['contrasena'], password):
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
                
                # Redirigir según el rol
                if email.endswith('@cva.com'):
                    return redirect(url_for('asesor.index_asesor'))
                else:
                    return redirect(url_for('auth.index'))
            else:
                flash('Correo o contraseña incorrectos', 'error')
        else:
            flash('Error de conexión a la base de datos', 'error')
    
    return render_template('login.html')

@auth_bp.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    captcha_text = generate_captcha_text()  # Generar el texto del captcha
    
    if request.method == 'POST':
        email = request.form['email']
        user_captcha = request.form.get('captcha')  # Captcha ingresado por el usuario
        
        # Validar el captcha
        if user_captcha != session.get('captcha_text'):
            flash('El código de verificación es incorrecto', 'error')
            return render_template('forgot_password.html', captcha_text=generate_captcha_text())
        
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            try:
                cursor.execute("SELECT id_usuario FROM tbl_usuario WHERE correo = %s", (email,))
                user = cursor.fetchone()
                
                if user:
                    # Generar token y fecha de expiración
                    token = secrets.token_urlsafe(32)
                    colombia_tz = timezone('America/Bogota')
                    expiration = datetime.now(colombia_tz) + timedelta(hours=1)

                    cursor.execute("""
                        INSERT INTO tbl_password_reset (user_id, token, expiration)
                        VALUES (%s, %s, %s)
                    """, (user['id_usuario'], token, expiration))
                    connection.commit()

                    # Enviar correo electrónico
                    reset_url = url_for('auth.reset_password', token=token, _external=True)
                    body = f"""Para restablecer tu contraseña, haz clic en el siguiente enlace:
                            {reset_url}
                            
                            Este enlace expirará en 1 hora."""
                    
                    if send_email_via_zoho(email, 'Restablecimiento de contraseña - CVA', body):
                        flash('Se ha enviado un correo con instrucciones para restablecer tu contraseña', 'success')
                    else:
                        flash('Error al enviar el correo', 'error')
                else:
                    flash('No existe una cuenta con este correo electrónico', 'error')
                    
            except Error as e:
                connection.rollback()
                flash('Error al procesar la solicitud', 'error')
            finally:
                cursor.close()
                connection.close()
        else:
            flash('Error de conexión a la base de datos', 'error')
    
    # Guardar el captcha en la sesión para validarlo después
    session['captcha_text'] = captcha_text
    return render_template('forgot_password.html', captcha_text=captcha_text)

@auth_bp.route('/refresh_captcha')
def refresh_captcha():
    captcha_text = generate_captcha_text()
    session['captcha_text'] = captcha_text  # Guardar el nuevo captcha en la sesión
    return jsonify({'captcha_text': captcha_text})

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
    # Limpiar toda la sesión en lugar de solo user_id y user_name
    session.clear()
    return redirect(url_for('auth.login'))

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