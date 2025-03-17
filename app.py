import smtplib
from email.mime.text import MIMEText
from flask import Flask, render_template, request, redirect, url_for, flash, session,jsonify
import mysql.connector
from mysql.connector import Error
import os
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
from pytz import timezone
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Configurar la duración de la sesión
app.permanent_session_lifetime = timedelta(days=30)

# Configuración de Zoho Mail
ZOHO_EMAIL = os.getenv('ZOHO_EMAIL')  # Tu correo de Zoho
ZOHO_PASSWORD = os.getenv('ZOHO_PASSWORD')  # Contraseña de aplicación de Zoho

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

# Rutas
@app.route('/')
def index():
    if 'user_id' not in session:
        # Si no hay usuario logueado, mostrar la página de inicio con botones de registro y login
        return render_template('index.html', logged_in=False)
    else:
        # Si hay usuario logueado, mostrar el dashboard
        return render_template('index.html', logged_in=True)

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
                    expiration = datetime.now() + timedelta(hours=1)
                    
                    # Guardar token en la base de datos
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS tbl_password_reset (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            user_id INT NOT NULL,
                            token VARCHAR(255) NOT NULL,
                            expiration DATETIME NOT NULL,
                            FOREIGN KEY (user_id) REFERENCES tbl_usuario(id_usuario)
                        """)
                    
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

from datetime import datetime, date

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
        cursor.execute("""
            SELECT s.id_solicitante, u.id_usuario, u.nombres, u.apellidos, u.correo, u.fecha_nacimiento 
            FROM tbl_solicitante
            JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        """)
        solicitante = cursor.fetchall()
        cursor.close()
        connection.close()
        return render_template('solicitante.html', solicitante=solicitante)
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
        cursor.execute("""
            SELECT fe.id_formElegibilidad, CONCAT(u.nombres, ' ', u.apellidos) as solicitante, 
                fe.motivo_viaje, fe.codigo_pasaporte, fe.pais_residencia, fe.provincia_destino
            FROM tbl_form_eligibilidadcva fe
            JOIN tbl_solicitante s ON fe.id_solicitante = s.id_solicitante
            JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        """)
        formularios = cursor.fetchall()
        cursor.close()
        connection.close()
        return render_template('formularios.html', formularios=formularios)
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('index'))


@app.route('/asesorias')
def asesorias():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Obtener asesorías
        cursor.execute("""
            SELECT a.codigo_asesoria, a.fecha_asesoria, a.asesor_asignado,
                CONCAT(u.nombres, ' ', u.apellidos) as solicitante
            FROM tbl_asesoria a
            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        """)
        asesorias = cursor.fetchall()
        
        # Obtener solicitantes para el formulario
        cursor.execute("""
            SELECT s.id_solicitante, CONCAT(u.nombres, ' ', u.apellidos) as nombre
            FROM tbl_solicitante s
            JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        """)
        solicitantes = cursor.fetchall()
        
        cursor.close()
        connection.close()
        return render_template('asesorias.html', asesorias=asesorias, solicitantes=solicitantes)
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('index'))
    
@app.route('/nueva_asesoria', methods=['POST'])
def nueva_asesoria():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Obtener datos del formulario
    id_solicitante = request.form['id_solicitante']
    fecha_asesoria = request.form['fecha_asesoria']
    asesor_asignado = request.form['asesor_asignado']
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor()
        try:
            # Insertar nueva asesoría
            cursor.execute("""
                INSERT INTO tbl_asesoria (fecha_asesoria, asesor_asignado, id_solicitante)
                VALUES (%s, %s, %s)
            """, (fecha_asesoria, asesor_asignado, id_solicitante))
            
            connection.commit()
            flash('Asesoría creada con éxito', 'success')
        except Error as e:
            connection.rollback()
            flash(f'Error al crear la asesoría: {e}', 'error')
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
    
    return redirect(url_for('asesorias'))  
  
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
            JOIN tbl_solicitante ON fe.id_solicitante = s.id_solicitante
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




    