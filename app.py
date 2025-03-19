import smtplib
from email.mime.text import MIMEText
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
import mysql.connector
from mysql.connector import Error
import os
from datetime import datetime, timedelta, date
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
from pytz import timezone
from dotenv import load_dotenv
import random
import string
import json
import stripe
import threading
import time

# Cargar variables de entorno desde .env
load_dotenv()

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Configurar la duración de la sesión
app.permanent_session_lifetime = timedelta(days=30)

# Configuración de Zoho Mail
ZOHO_EMAIL = os.getenv('ZOHO_EMAIL')  # Tu correo de Zoho
ZOHO_PASSWORD = os.getenv('ZOHO_PASSWORD')  # Contraseña de aplicación de Zoho
# Configurar Stripe con la clave secreta del .env
app.config['STRIPE_SECRET_KEY'] = os.getenv('STRIPE_SECRET_KEY')
app.config['STRIPE_PUBLIC_KEY'] = os.getenv('STRIPE_PUBLIC_KEY')

stripe.api_key = app.config['STRIPE_SECRET_KEY']

# Definir precios por tipo de visa
PRECIOS_VISA = {
    'Visa de Trabajo': 150.00,
    'Visa de Estudio': 100.00,
    'Residencia Permanente': 200.00,
    'Ciudadanía': 250.00,
    'Otro': 150.00
}

def send_email_via_zoho(to_email, subject, body):
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = ZOHO_EMAIL
    msg['To'] = to_email

    try:
        server = smtplib.SMTP('smtp.zoho.com', 587)
        server.starttls()
        server.login(ZOHO_EMAIL, ZOHO_PASSWORD)
        server.sendmail(ZOHO_EMAIL, [to_email], msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print("Error al enviar correo:", e)
        return False

# Configuración de la base de datos para AWS
def create_connection():
    try:
        connection = mysql.connector.connect(
            host='cva.ch86isccq37m.us-east-2.rds.amazonaws.com',  # Endpoint de RDS
            database='CVA',  # Nombre de tu base de datos
            user='admin',  # Usuario de MySQL en RDS
            password='root.2025'  # Contraseña de MySQL en RDS
        )
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"Error al conectar a MySQL: {e}")
        return None

# Función para limpiar asesorías no pagadas después de 2 días
def limpiar_asesorias_vencidas():
    while True:
        try:
            print("Ejecutando limpieza de asesorías vencidas...")
            connection = create_connection()
            if connection:
                cursor = connection.cursor()
                # Obtener asesorías pendientes con más de 2 días de antigüedad
                dos_dias_atras = datetime.now() - timedelta(days=2)
                cursor.execute("""
                    DELETE FROM tbl_asesoria 
                    WHERE estado = 'Pendiente' 
                    AND fecha_creacion < %s
                """, (dos_dias_atras,))
                
                eliminadas = cursor.rowcount
                connection.commit()
                cursor.close()
                connection.close()
                print(f"Se eliminaron {eliminadas} asesorías vencidas")
        except Exception as e:
            print(f"Error al limpiar asesorías vencidas: {e}")
        
        # Esperar 12 horas antes de la próxima ejecución
        time.sleep(12 * 60 * 60)

# Iniciar el hilo de limpieza de asesorías
limpieza_thread = threading.Thread(target=limpiar_asesorias_vencidas, daemon=True)
limpieza_thread.start()

# Definir el filtro personalizado
@app.template_filter('split')
def split_filter(s, delimiter=None):
    return s.split(delimiter)

# Rutas
@app.route('/')
def index():
    if 'user_id' not in session:
        # Si no hay usuario logueado, mostrar la página de inicio con botones de registro y login
        return render_template('index.html', logged_in=False)
    else:
        # Si hay usuario logueado, mostrar el dashboard
        return render_template('index.html', logged_in=True)

# Agregar la ruta para el perfil de usuario
@app.route('/perfil')
def perfil():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Aquí puedes agregar lógica para cargar datos del usuario si es necesario
    # Por ejemplo, obtener información del usuario desde la base de datos
    
    return render_template('perfil.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        remember_me = request.form.get('remember_me')  # Verificar si marcó "Mantener la sesión abierta"
        
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
                
                # Si marcó "Mantener la sesión abierta", hacer la sesión permanente
                if remember_me:
                    session.permanent = True
                else:
                    session.permanent = False
                
                return redirect(url_for('index'))
            else:
                flash('Correo o contraseña incorrectos', 'error')
        else:
            flash('Error de conexión a la base de datos', 'error')
    
    return render_template('login.html')

#generar un texto aleatorio para el captcha
def generate_captcha_text(length=6):
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for i in range(length))

# Ruta para olvidar contraseña
@app.route('/forgot_password', methods=['GET', 'POST'])
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
                    reset_url = url_for('reset_password', token=token, _external=True)
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

@app.route('/refresh_captcha')
def refresh_captcha():
    captcha_text = generate_captcha_text()
    session['captcha_text'] = captcha_text  # Guardar el nuevo captcha en la sesión
    return jsonify({'captcha_text': captcha_text})

# Ruta para restablecer contraseña
@app.route('/reset_password/<token>', methods=['GET', 'POST'])
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
                return redirect(url_for('login'))
            
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
                return redirect(url_for('login'))
            
            return render_template('reset_password.html', token=token)
            
        except Error as e:
            connection.rollback()
            flash('Error al restablecer la contraseña', 'error')
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
    
    return redirect(url_for('login'))

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('user_name', None)
    return redirect(url_for('login'))

@app.route('/registro', methods=['GET', 'POST'])
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
            return redirect(url_for('registro'))
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            try:
                # ✅ Verificar si el correo ya está registrado
                cursor.execute("SELECT * FROM tbl_usuario WHERE correo = %s", (correo,))
                existing_user = cursor.fetchone()
                if existing_user:
                    flash('El correo ya está registrado. Por favor, usa otro correo.', 'error')
                    return redirect(url_for('registro'))
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
                return redirect(url_for('login'))
            except Error as e:
                connection.rollback()
                flash(f'Error al registrar: {e}', 'error')
            finally:
                cursor.close()
                connection.close()
        else:
            flash('Error de conexión a la base de datos', 'error')
    return render_template('registro.html')

@app.route('/solicitantes')
def solicitantes():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Obtener parámetros de paginación
    page = request.args.get('page', 1, type=int)
    per_page = 10  # Número de solicitantes por página
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            # Contar el total de solicitantes para la paginación
            cursor.execute("SELECT COUNT(*) as total FROM tbl_solicitante")
            total = cursor.fetchone()['total']
            
            # Calcular el offset para la paginación
            offset = (page - 1) * per_page
            
            # Obtener los solicitantes para la página actual
            cursor.execute("""
                SELECT s.id_solicitante, u.id_usuario, u.nombres, u.apellidos, u.correo, u.fecha_nacimiento 
                FROM tbl_solicitante s
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                ORDER BY s.id_solicitante DESC
                LIMIT %s OFFSET %s
            """, (per_page, offset))
            
            solicitantes = cursor.fetchall()
            
            # Obtener usuarios que no son solicitantes para el formulario de agregar
            cursor.execute("""
                SELECT id_usuario, CONCAT(nombres, ' ', apellidos) as nombre_completo, correo
                FROM tbl_usuario
                WHERE id_usuario NOT IN (SELECT id_usuario FROM tbl_solicitante)
                ORDER BY nombres
            """)
            
            usuarios_disponibles = cursor.fetchall()
            
            # Calcular el número total de páginas
            total_pages = (total + per_page - 1) // per_page
            
            return render_template(
                'solicitudes.html', 
                solicitantes=solicitantes,
                usuarios_disponibles=usuarios_disponibles,
                page=page,
                total_pages=total_pages,
                total=total
            )
        except Error as e:
            flash(f'Error al cargar los solicitantes: {e}', 'error')
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
    
    return redirect(url_for('index'))
    
@app.route('/agregar_solicitante', methods=['POST'])
def agregar_solicitante():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Obtener el ID del usuario seleccionado
    id_usuario = request.form.get('id_usuario')
    
    if not id_usuario:
        flash('Debes seleccionar un usuario', 'error')
        return redirect(url_for('solicitantes'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            # Verificar si el usuario ya es un solicitante
            cursor.execute("SELECT * FROM tbl_solicitante WHERE id_usuario = %s", (id_usuario,))
            existing_solicitante = cursor.fetchone()
            
            if existing_solicitante:
                flash('Este usuario ya es un solicitante', 'error')
                return redirect(url_for('solicitantes'))
            
            # Insertar nuevo solicitante
            cursor.execute("INSERT INTO tbl_solicitante (id_usuario) VALUES (%s)", (id_usuario,))
            
            connection.commit()
            flash('Usuario agregado como solicitante con éxito', 'success')
        except Error as e:
            connection.rollback()
            flash(f'Error al agregar solicitante: {e}', 'error')
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
    
    return redirect(url_for('solicitantes'))

@app.route('/formularios')
def formularios():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("""
                SELECT fe.id_formElegibilidad, CONCAT(u.nombres, ' ', u.apellidos) as solicitante, 
                    fe.motivo_viaje, fe.codigo_pasaporte, fe.pais_residencia, fe.provincia_destino
                FROM tbl_form_eligibilidadCVA 
                           fe
                JOIN tbl_solicitante s ON fe.id_solicitante = s.id_solicitante
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            """)
            formularios = cursor.fetchall()
            return render_template('formularios.html', formularios=formularios)
        except Exception as e:
            print(f"Error en la consulta: {e}")
            flash('Error al cargar los formularios', 'error')
            return redirect(url_for('index'))
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('index'))

# Modificación de la función asesorias para mostrar solo las asesorías del usuario logueado
@app.route('/asesorias')
def asesorias():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Obtener el id_solicitante del usuario logueado
        cursor.execute("""
            SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s
        """, (session['user_id'],))
        solicitante_result = cursor.fetchone()
        
        if not solicitante_result:
            flash('No se encontró información de solicitante para este usuario', 'error')
            return redirect(url_for('index'))
        
        id_solicitante = solicitante_result['id_solicitante']
        
        # Obtener asesorías con información adicional solo del usuario logueado
        cursor.execute("""
            SELECT a.codigo_asesoria, a.fecha_asesoria, a.asesor_asignado,
                CONCAT(u.nombres, ' ', u.apellidos) as solicitante,
                a.id_solicitante, a.id_asesor, a.tipo_asesoria,
                p.metodo_pago, 
                COALESCE(pa.monto, CASE 
                    WHEN a.tipo_asesoria = 'Visa de Trabajo' THEN 150.00
                    WHEN a.tipo_asesoria = 'Visa de Estudio' THEN 100.00
                    WHEN a.tipo_asesoria = 'Residencia Permanente' THEN 200.00
                    WHEN a.tipo_asesoria = 'Ciudadanía' THEN 250.00
                    ELSE 150.00
                END) as precio,
                'Virtual (Zoom)' as lugar,
                a.descripcion, a.estado,
                pa.metodo_pago as metodo_pago_stripe
            FROM tbl_asesoria a
            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            LEFT JOIN tbl_pago p ON s.id_solicitante = p.id_solicitante
            LEFT JOIN tbl_pago_asesoria pa ON a.codigo_asesoria = pa.codigo_asesoria
            WHERE a.id_solicitante = %s
            ORDER BY a.fecha_asesoria DESC
        """, (id_solicitante,))
        asesorias = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        # Pasar los precios de visa al template
        return render_template('asesorias.html', asesorias=asesorias, precios_visa=PRECIOS_VISA)
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('index'))

# Modificación de la función nueva_asesoria para incluir el número de documento y precio según tipo de visa
@app.route('/nueva_asesoria', methods=['POST'])
def nueva_asesoria():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Obtener datos del formulario
    id_solicitante = request.form['id_solicitante']
    fecha_asesoria = request.form['fecha_asesoria']
    tipo_asesoria = request.form.get('tipo_asesoria', 'Visa de Trabajo')
    descripcion = request.form.get('descripcion', '')
    lugar = request.form.get('lugar', 'Virtual (Zoom)')
    metodo_pago = request.form.get('metodo_pago', 'Tarjeta de Crédito')
    tipo_documento = request.form.get('tipo_documento', 'C.C')
    numero_documento = request.form.get('numero_documento', '')
    
    # Obtener el precio según el tipo de visa
    precio = PRECIOS_VISA.get(tipo_asesoria, 150.00)
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor()
        try:
            # Obtener el último número de asesoría para este solicitante
            cursor.execute("""
                SELECT COALESCE(MAX(numero_asesoria), 0) + 1 as next_num
                FROM tbl_asesoria
                WHERE id_solicitante = %s
            """, (id_solicitante,))
            
            result = cursor.fetchone()
            numero_asesoria = result[0] if result else 1
            
            # Insertar nueva asesoría con estado "Pendiente" y documento
            cursor.execute("""
                INSERT INTO tbl_asesoria (fecha_asesoria, asesor_asignado, id_solicitante, tipo_asesoria, descripcion, lugar, estado, tipo_documento, numero_documento, numero_asesoria)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (fecha_asesoria, "Por asignar", id_solicitante, tipo_asesoria, descripcion, lugar, "Pendiente", tipo_documento, numero_documento, numero_asesoria))
            
            # Obtener el ID de la asesoría recién creada
            asesoria_id = cursor.lastrowid
            
            # Verificar si ya existe un pago para este solicitante
            cursor.execute("""
                SELECT num_factura FROM tbl_pago WHERE id_solicitante = %s
            """, (id_solicitante,))
            
            pago_existente = cursor.fetchone()
            
            # Si no existe un pago, crear uno nuevo con el precio según el tipo de visa
            if not pago_existente:
                cursor.execute("""
                    INSERT INTO tbl_pago (metodo_pago, total_pago, id_solicitante)
                    VALUES (%s, %s, %s)
                """, (metodo_pago, precio, id_solicitante))
            
            connection.commit()
            flash('Asesoría solicitada con éxito. Un asesor será asignado pronto.', 'success')
        except Error as e:
            connection.rollback()
            flash(f'Error al solicitar la asesoría: {e}', 'error')
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
    
    return redirect(url_for('asesorias'))

# Modificación de la función editar_asesoria para el usuario común
@app.route('/editar_asesoria/<int:codigo_asesoria>', methods=['GET', 'POST'])
def editar_asesoria(codigo_asesoria):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Verificar que la asesoría pertenezca al usuario logueado
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Obtener el id_solicitante del usuario logueado
        cursor.execute("""
            SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s
        """, (session['user_id'],))
        solicitante_result = cursor.fetchone()
        
        if not solicitante_result:
            cursor.close()
            connection.close()
            flash('No se encontró información de solicitante para este usuario', 'error')
            return redirect(url_for('asesorias'))
        
        id_solicitante = solicitante_result['id_solicitante']
        
        # Verificar que la asesoría pertenezca al usuario
        cursor.execute("""
            SELECT * FROM tbl_asesoria WHERE codigo_asesoria = %s AND id_solicitante = %s
        """, (codigo_asesoria, id_solicitante))
        asesoria = cursor.fetchone()
        
        if not asesoria:
            cursor.close()
            connection.close()
            flash('No tienes permiso para editar esta asesoría', 'error')
            return redirect(url_for('asesorias'))
        
        # Solo permitir editar asesorías pendientes
        if asesoria['estado'] != 'Pendiente':
            cursor.close()
            connection.close()
            flash('Solo puedes editar asesorías en estado pendiente', 'warning')
            return redirect(url_for('asesorias'))
        
        cursor.close()
        connection.close()
    
    if request.method == 'POST':
        try:
            fecha_asesoria = request.form.get('fecha_asesoria')
            tipo_asesoria = request.form.get('tipo_asesoria')
            descripcion = request.form.get('descripcion')
            lugar = request.form.get('lugar')
            metodo_pago = request.form.get('metodo_pago')
            
            connection = create_connection()
            if connection:
                cursor = connection.cursor()
                
                # Actualizar la asesoría
                cursor.execute("""
                    UPDATE tbl_asesoria 
                    SET fecha_asesoria = %s, tipo_asesoria = %s, descripcion = %s, lugar = %s
                    WHERE codigo_asesoria = %s AND id_solicitante = %s
                """, (fecha_asesoria, tipo_asesoria, descripcion, lugar, codigo_asesoria, id_solicitante))
                
                # Actualizar el método de pago
                cursor.execute("""
                    UPDATE tbl_pago 
                    SET metodo_pago = %s
                    WHERE id_solicitante = %s
                """, (metodo_pago, id_solicitante))
                
                connection.commit()
                cursor.close()
                connection.close()
                flash('Asesoría actualizada exitosamente', 'success')
            else:
                flash('Error de conexión a la base de datos', 'danger')
            return redirect(url_for('asesorias'))
        except Exception as e:
            flash(f'Error al actualizar la asesoría: {str(e)}', 'danger')
            return redirect(url_for('asesorias'))
    
    # Si es GET, obtener los datos de la asesoría para mostrar en el formulario
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT a.*, p.metodo_pago
            FROM tbl_asesoria a
            LEFT JOIN tbl_pago p ON a.id_solicitante = p.id_solicitante
            WHERE a.codigo_asesoria = %s
        """, (codigo_asesoria,))
        asesoria = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        return render_template('editar_asesoria.html', asesoria=asesoria)
    else:
        flash('Error de conexión a la base de datos', 'danger')
        return redirect(url_for('asesorias'))

# Función para cancelar una asesoría (solo para asesorías pendientes)
@app.route('/cancelar_asesoria/<int:codigo_asesoria>', methods=['GET'])
def cancelar_asesoria(codigo_asesoria):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Verificar que la asesoría pertenezca al usuario logueado
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Obtener el id_solicitante del usuario logueado
        cursor.execute("""
            SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s
        """, (session['user_id'],))
        solicitante_result = cursor.fetchone()
        
        if not solicitante_result:
            cursor.close()
            connection.close()
            flash('No se encontró información de solicitante para este usuario', 'error')
            return redirect(url_for('asesorias'))
        
        id_solicitante = solicitante_result['id_solicitante']
        
        # Verificar que la asesoría pertenezca al usuario y esté pendiente
        cursor.execute("""
            SELECT * FROM tbl_asesoria 
            WHERE codigo_asesoria = %s AND id_solicitante = %s AND estado = 'Pendiente'
        """, (codigo_asesoria, id_solicitante))
        asesoria = cursor.fetchone()
        
        if not asesoria:
            cursor.close()
            connection.close()
            flash('No puedes cancelar esta asesoría', 'error')
            return redirect(url_for('asesorias'))
        
        # Cancelar la asesoría
        cursor.execute("""
            UPDATE tbl_asesoria SET estado = 'Cancelada'
            WHERE codigo_asesoria = %s
        """, (codigo_asesoria,))
        
        connection.commit()
        cursor.close()
        connection.close()
        flash('Asesoría cancelada exitosamente', 'success')
    else:
        flash('Error de conexión a la base de datos', 'error')
    
    return redirect(url_for('asesorias'))

# Ruta para crear una intención de pago con Stripe
@app.route('/create-payment-intent', methods=['POST'])
def create_payment_intent():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()  # Cambiado de request.json a request.get_json()
        codigo_asesoria = data.get('codigo_asesoria')
        tipo_asesoria = data.get('tipo_asesoria', 'Visa de Trabajo')  # Obtener el tipo de asesoría
        
        # Obtener el precio según el tipo de visa
        monto = PRECIOS_VISA.get(tipo_asesoria, 150.00)
        
        # Crear una intención de pago con Stripe
        intent = stripe.PaymentIntent.create(
            amount=int(float(monto) * 100),  # Convertir a centavos
            currency='usd',
            metadata={
                'codigo_asesoria': codigo_asesoria,
                'user_id': str(session['user_id']),  # Convertir a string para evitar errores
                'tipo_asesoria': tipo_asesoria,
                'metodo_pago': 'Tarjeta de Crédito (Stripe)'
            },
            automatic_payment_methods={
                'enabled': True,
            },
        )
        
        return jsonify({
            'clientSecret': intent.client_secret,
            'monto': monto
        })
    except Exception as e:
        print(f"Error en create_payment_intent: {str(e)}")  # Log para depuración
        return jsonify({'error': str(e)}), 500

# Ruta para procesar pagos con Stripe
@app.route('/procesar_pago', methods=['POST'])
def procesar_pago():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()  # Cambiado de request.json a request.get_json()
        if not data:
            data = request.form  # Intentar obtener datos del formulario si no hay JSON
            
        codigo_asesoria = data.get('codigo_asesoria')
        monto = data.get('monto')
        metodo_pago = data.get('metodo_pago')
        datos_adicionales = data.get('datos_adicionales', {})
        
        if isinstance(datos_adicionales, str):
            try:
                datos_adicionales = json.loads(datos_adicionales)
            except:
                datos_adicionales = {}
        
        connection = create_connection()
        if connection:
            cursor = connection.cursor()
            try:
                # Registrar el pago
                cursor.execute("""
                    INSERT INTO tbl_pago_asesoria (codigo_asesoria, monto, metodo_pago, estado_pago, datos_adicionales)
                    VALUES (%s, %s, %s, 'Completado', %s)
                """, (codigo_asesoria, monto, metodo_pago, json.dumps(datos_adicionales)))
                
                # Actualizar el estado de la asesoría a "Pagada"
                cursor.execute("""
                    UPDATE tbl_asesoria SET estado = 'Pagada' WHERE codigo_asesoria = %s
                """, (codigo_asesoria,))
                
                connection.commit()
                
                if request.is_json:
                    return jsonify({'success': True, 'message': 'Pago procesado exitosamente'})
                else:
                    flash('Pago procesado exitosamente', 'success')
                    return redirect(url_for('asesorias'))
                    
            except Error as e:
                connection.rollback()
                if request.is_json:
                    return jsonify({'error': f'Error al procesar el pago: {e}'}), 500
                else:
                    flash(f'Error al procesar el pago: {e}', 'error')
                    return redirect(url_for('asesorias'))
            finally:
                cursor.close()
                connection.close()
        else:
            if request.is_json:
                return jsonify({'error': 'Error de conexión a la base de datos'}), 500
            else:
                flash('Error de conexión a la base de datos', 'error')
                return redirect(url_for('asesorias'))
    except Exception as e:
        print(f"Error en procesar_pago: {str(e)}")  # Log para depuración
        if request.is_json:
            return jsonify({'error': str(e)}), 500
        else:
            flash(f'Error al procesar el pago: {e}', 'error')
            return redirect(url_for('asesorias'))

# Ruta para manejar el éxito del pago
@app.route('/payment-success')
def payment_success():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    payment_intent_id = request.args.get('payment_intent')
    if payment_intent_id:
        try:
            # Verificar el estado del pago con Stripe
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            if payment_intent.status == 'succeeded':
                # Obtener el código de asesoría de los metadatos
                codigo_asesoria = payment_intent.metadata.get('codigo_asesoria')
                
                if codigo_asesoria:
                    # Actualizar el estado de la asesoría en la base de datos
                    connection = create_connection()
                    if connection:
                        cursor = connection.cursor()
                        try:
                            # Verificar si ya existe un registro de pago para esta asesoría
                            cursor.execute("""
                                SELECT id_pago FROM tbl_pago_asesoria 
                                WHERE codigo_asesoria = %s AND estado_pago = 'Completado'
                            """, (codigo_asesoria,))
                            
                            existing_payment = cursor.fetchone()
                            
                            if not existing_payment:
                                # Obtener el método de pago utilizado
                                payment_method_id = payment_intent.payment_method
                                payment_method = stripe.PaymentMethod.retrieve(payment_method_id)
                                payment_type = payment_method.type
                                
                                # Formatear el método de pago para mostrar
                                if payment_type == 'card':
                                    brand = payment_method.card.brand.capitalize()
                                    last4 = payment_method.card.last4
                                    metodo_pago_detalle = f"{brand} **** {last4}"
                                else:
                                    metodo_pago_detalle = payment_type.capitalize()
                                
                                # Registrar el pago
                                cursor.execute("""
                                    INSERT INTO tbl_pago_asesoria (codigo_asesoria, monto, metodo_pago, estado_pago, datos_adicionales, referencia_pago)
                                    VALUES (%s, %s, %s, 'Completado', %s, %s)
                                """, (
                                    codigo_asesoria, 
                                    payment_intent.amount / 100,  # Convertir de centavos a dólares
                                    metodo_pago_detalle, 
                                    json.dumps({'payment_intent_id': payment_intent_id, 'payment_method': payment_method_id}),
                                    payment_intent_id
                                ))
                                
                                # Actualizar el estado de la asesoría a "Pagada"
                                cursor.execute("""
                                    UPDATE tbl_asesoria SET estado = 'Pagada' WHERE codigo_asesoria = %s
                                """, (codigo_asesoria,))
                                
                                connection.commit()
                            
                            flash('Pago procesado exitosamente', 'success')
                        except Error as e:
                            connection.rollback()
                            flash(f'Error al registrar el pago: {e}', 'error')
                        finally:
                            cursor.close()
                            connection.close()
                    else:
                        flash('Error de conexión a la base de datos', 'error')
                else:
                    flash('No se pudo identificar la asesoría asociada al pago', 'error')
            else:
                flash(f'El pago no se completó correctamente. Estado: {payment_intent.status}', 'error')
        except Exception as e:
            flash(f'Error al verificar el pago: {str(e)}', 'error')
    else:
        flash('No se pudo identificar el pago', 'error')
    
    return redirect(url_for('asesorias'))

# Función para obtener la fecha y hora actual (para usar en las plantillas)
@app.context_processor
def utility_processor():
    def now():
        return datetime.now()
    return dict(now=now)

@app.route('/pagos')
def pagos():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            # Consulta para obtener pagos
            cursor.execute("""
                SELECT 
                    p.num_factura,
                    p.id_solicitante,
                    CONCAT(u.nombres, ' ', u.apellidos) as solicitante,
                    p.metodo_pago,
                    p.total_pago,
                    CURDATE() as fecha_pago,
                    'Pendiente' as estado
                FROM tbl_pago p
                JOIN tbl_solicitante s ON p.id_solicitante = s.id_solicitante
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                ORDER BY p.num_factura DESC
            """)
            pagos = cursor.fetchall()
            
            # Consulta para obtener solicitantes
            cursor.execute("""
                SELECT 
                    s.id_solicitante,
                    CONCAT(u.nombres, ' ', u.apellidos) as nombre
                FROM tbl_solicitante s
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                ORDER BY u.nombres, u.apellidos
            """)
            solicitantes = cursor.fetchall()
            
            # Imprime para depuración
            print(f"Solicitantes encontrados: {len(solicitantes)}")
            for s in solicitantes:
                print(f"ID: {s['id_solicitante']}, Nombre: {s['nombre']}")
            
            cursor.close()
            connection.close()
            
            return render_template('pagos.html', pagos=pagos, solicitantes=solicitantes)
        except Exception as e:
            if connection.is_connected():
                cursor.close()
                connection.close()
            print(f"Error en la consulta: {str(e)}")
            flash(f'Error al cargar la página de pagos: {str(e)}', 'danger')
            return render_template('pagos.html', pagos=[], solicitantes=[])
    else:
        flash('Error de conexión a la base de datos', 'danger')
        return render_template('pagos.html', pagos=[], solicitantes=[])

@app.route('/generar_pago', methods=['POST'])
def generar_pago():
    # Resto del código...
    if 'user_id' not in session:
        return redirect(url_for('login'))
    try:
        id_solicitante = request.form.get('id_solicitante')
        metodo_pago = request.form.get('metodo_pago')
        total_pago = request.form.get('total_pago')
        if not id_solicitante or not metodo_pago or not total_pago:
            flash('Todos los campos son obligatorios', 'danger')
            return redirect(url_for('pagos'))
        connection = create_connection()
        if connection:
            cursor = connection.cursor()
            query = """
            INSERT INTO tbl_pago (id_solicitante, metodo_pago, total_pago)
            VALUES (%s, %s, %s)
            """
            cursor.execute(query, (id_solicitante, metodo_pago, total_pago))
            connection.commit()
            cursor.close()
            connection.close()
            flash('Pago registrado exitosamente', 'success')
        else:
            flash('Error de conexión a la base de datos', 'danger')
    except Exception as e:
        flash(f'Error al registrar el pago: {str(e)}', 'danger')
    return redirect(url_for('pagos'))

@app.route('/eliminar_pago/<int:id_pago>')
def eliminar_pago(id_pago):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    try:
        connection = create_connection()
        if connection:
            cursor = connection.cursor()
            cursor.execute("DELETE FROM tbl_pago WHERE num_factura = %s", (id_pago,))
            connection.commit()
            cursor.close()
            connection.close()
            flash('Pago eliminado exitosamente', 'success')
        else:
            flash('Error de conexión a la base de datos', 'danger')
    except Exception as e:
        flash(f'Error al eliminar el pago: {str(e)}', 'danger')
    return redirect(url_for('pagos'))

@app.route('/editar_pago/<int:id_pago>', methods=['GET', 'POST'])
def editar_pago(id_pago):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    if request.method == 'POST':
        try:
            id_solicitante = request.form.get('id_solicitante')
            metodo_pago = request.form.get('metodo_pago')
            total_pago = request.form.get('total_pago')
            if not id_solicitante or not metodo_pago or not total_pago:
                flash('Todos los campos son obligatorios', 'danger')
                return redirect(url_for('editar_pago', id_pago=id_pago))
            connection = create_connection()
            if connection:
                cursor = connection.cursor()
                cursor.execute("""
                    UPDATE tbl_pago 
                    SET id_solicitante = %s, metodo_pago = %s, total_pago = %s
                    WHERE num_factura = %s
                """, (id_solicitante, metodo_pago, total_pago, id_pago))
                connection.commit()
                cursor.close()
                connection.close()
                flash('Pago actualizado exitosamente', 'success')
            else:
                flash('Error de conexión a la base de datos', 'danger')
            return redirect(url_for('pagos'))
        except Exception as e:
            flash(f'Error al actualizar el pago: {str(e)}', 'danger')
            return redirect(url_for('pagos'))
    try:
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT * FROM tbl_pago WHERE num_factura = %s
            """, (id_pago,))
            pago = cursor.fetchone()
            cursor.execute("""
                SELECT s.id_solicitante, CONCAT(u.nombres, ' ', u.apellidos) as nombre
                FROM tbl_solicitante s
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                ORDER BY u.nombres, u.apellidos
            """)
            solicitantes = cursor.fetchall()
            cursor.close()
            connection.close()
            if pago:
                return render_template('editar_pago.html', pago=pago, solicitantes=solicitantes)
            else:
                flash('Pago no encontrado', 'danger')
                return redirect(url_for('pagos'))
        else:
            flash('Error de conexión a la base de datos', 'danger')
            return redirect(url_for('pagos'))
    except Exception as e:
        flash(f'Error al cargar el formulario: {str(e)}', 'danger')
        return redirect(url_for('pagos'))

@app.route('/documentos')
def documentos():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT d.id_documento, CONCAT(u.nombres, ' ', u.apellidos) as solicitante,
                d.pasaporte, d.historial_viajes, d.foto_digital, d.proposito_viaje
            FROM tbl_documentos_adjuntos d
            JOIN tbl_form_eligibilidadcva fe ON d.id_formElegibilidad = fe.id_formElegibilidad
            JOIN tbl_solicitante s ON fe.id_solicitante = s.id_solicitante
            JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        """)
        documentos = cursor.fetchall()
        cursor.close()
        connection.close()
        return render_template('documentos.html', documentos=documentos)
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('index'))

@app.route('/ayuda')
def ayuda():
    return render_template('ayuda.html')

if __name__ == '__main__':
    app.run(debug=True)

