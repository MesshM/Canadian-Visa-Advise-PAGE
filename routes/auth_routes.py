# routes/auth_routes.py
from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from werkzeug.security import generate_password_hash, check_password_hash
from database import create_connection
from utils.email_utils import send_email_via_zoho, send_verification_email
from config import ZOHO_EMAIL, ZOHO_PASSWORD
import secrets
from pytz import timezone
from datetime import datetime, date
from utils.captcha_utils import verify_captcha

# Registrar el Blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        remember_me = request.form.get('remember_me')
        
        # Verificar CAPTCHA si es necesario
        captcha_response = request.form.get('g-recaptcha-response')
        if not verify_captcha(captcha_response):
            flash('Captcha no válido. Por favor, inténtalo de nuevo.', 'error')
            return redirect(url_for('auth.login'))

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

                # Determinar rol del usuario
                if email.endswith('@cva.com'):
                    session['user_role'] = 'Asesor'
                    session['is_admin'] = True
                else:
                    session['user_role'] = 'Usuario'
                    session['is_admin'] = False

                # Configurar sesión persistente si se selecciona "Recordarme"
                if remember_me:
                    session.permanent = True

                # Redirigir según el rol
                if email.endswith('@cva.com'):
                    return redirect(url_for('asesor.index_asesor'))
                else:
                    return redirect(url_for('index'))
            else:
                flash('Correo o contraseña incorrectos', 'error')
        else:
            flash('Error de conexión a la base de datos', 'error')
    
    return render_template('login.html')

@auth_bp.route('/logout')
def logout():
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

        # Validar edad mínima
        fecha_nac = datetime.strptime(fecha_nacimiento, '%Y-%m-%d').date()
        hoy = date.today()
        edad = hoy.year - fecha_nac.year - ((hoy.month, hoy.day) < (fecha_nac.month, fecha_nac.day))
        if edad < 18:
            flash('Debes tener al menos 18 años para registrarte.', 'error')
            return redirect(url_for('auth.registro'))

        # Verificar CAPTCHA si es necesario
        captcha_response = request.form.get('g-recaptcha-response')
        if not verify_captcha(captcha_response):
            flash('Captcha no válido. Por favor, inténtalo de nuevo.', 'error')
            return redirect(url_for('auth.registro'))

        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            try:
                # Verificar si el correo ya está registrado
                cursor.execute("SELECT * FROM tbl_usuario WHERE correo = %s", (correo,))
                existing_user = cursor.fetchone()
                if existing_user:
                    flash('El correo ya está registrado. Por favor, usa otro correo.', 'error')
                    return redirect(url_for('auth.registro'))

                # Crear usuario
                hashed_password = generate_password_hash(contrasena)
                cursor.execute(
                    "INSERT INTO tbl_usuario (nombres, apellidos, correo, contrasena, fecha_nacimiento) VALUES (%s, %s, %s, %s, %s)",
                    (nombres, apellidos, correo, hashed_password, fecha_nacimiento)
                )
                user_id = cursor.lastrowid

                # Asociar al solicitante
                cursor.execute("INSERT INTO tbl_solicitante (id_usuario) VALUES (%s)", (user_id,))
                
                # Generar token de verificación
                verification_token = secrets.token_urlsafe(32)
                cursor.execute(
                    "UPDATE tbl_usuario SET token_verificacion = %s WHERE id_usuario = %s",
                    (verification_token, user_id)
                )

                # Enviar correo de verificación
                verification_link = url_for('auth.verify_email', token=verification_token, _external=True)
                send_verification_email(correo, verification_link)

                connection.commit()
                flash('Registro exitoso. Por favor, verifica tu correo electrónico antes de iniciar sesión.', 'success')
                return redirect(url_for('auth.login'))
            except Exception as e:
                connection.rollback()
                flash(f'Error al registrar: {e}', 'error')
            finally:
                cursor.close()
                connection.close()
        else:
            flash('Error de conexión a la base de datos', 'error')
    
    return render_template('registro.html')

@auth_bp.route('/verify-email/<token>')
def verify_email(token):
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM tbl_usuario WHERE token_verificacion = %s", (token,))
            user = cursor.fetchone()
            if user:
                cursor.execute("UPDATE tbl_usuario SET token_verificacion = NULL, correo_verificado = 1 WHERE id_usuario = %s", (user['id_usuario'],))
                connection.commit()
                flash('Tu correo ha sido verificado con éxito. Ahora puedes iniciar sesión.', 'success')
            else:
                flash('El enlace de verificación es inválido o ha expirado.', 'error')
        except Exception as e:
            connection.rollback()
            flash(f'Error al verificar el correo: {e}', 'error')
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
    
    return redirect(url_for('auth.login'))