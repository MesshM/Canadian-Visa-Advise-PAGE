from flask import Flask, render_template, request, redirect, url_for, flash, session
import mysql.connector
from mysql.connector import Error
import os
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import boto3
from dotenv import load_dotenv
import secrets

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Load environment variables
load_dotenv()

# Configuración de SES
ses_client = boto3.client(
    'ses',
    region_name=os.getenv('AWS_REGION'),
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
)

# Configuración de la base de datos para XAMPP (localhost)
def create_connection():
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='cva',
            user='root',
            password=''
        )
        if connection.is_connected():
            print("Conexión exitosa a MySQL en XAMPP")
            return connection
    except Error as e:
        print(f"Error al conectar a MySQL en XAMPP: {e}")
        return None

# Rutas
@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        
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
                return redirect(url_for('index'))
            else:
                flash('Correo o contraseña incorrectos', 'error')
        else:
            flash('Error de conexión a la base de datos', 'error')
    
    return render_template('login.html')

@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form['email']
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            try:
                cursor.execute("SELECT id_usuario FROM tbl_usuario WHERE correo = %s", (email,))
                user = cursor.fetchone()
                
                if user:
                    token = secrets.token_urlsafe(32)
                    expiration = datetime.now() + timedelta(hours=1)
                    
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS tbl_password_reset (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            user_id INT NOT NULL,
                            token VARCHAR(255) NOT NULL,
                            expiration DATETIME NOT NULL,
                            FOREIGN KEY (user_id) REFERENCES tbl_usuario(id_usuario)
                        )
                    """)
                    
                    cursor.execute("""
                        INSERT INTO tbl_password_reset (user_id, token, expiration)
                        VALUES (%s, %s, %s)
                    """, (user['id_usuario'], token, expiration))
                    connection.commit()
                    
                    reset_url = url_for('reset_password', token=token, _external=True)
                    body = f"""Para restablecer tu contraseña, haz clic en el siguiente enlace:
                            {reset_url}
                            
                            Este enlace expirará en 1 hora."""
                    
                    ses_client.send_email(
                        Source=os.getenv('AWS_SES_SENDER'),
                        Destination={'ToAddresses': [email]},
                        Message={
                            'Subject': {'Data': 'Restablecimiento de contraseña - CVA'},
                            'Body': {'Text': {'Data': body}}
                        }
                    )
                    
                    flash('Se ha enviado un correo con instrucciones para restablecer tu contraseña', 'success')
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
    
    return render_template('forgot_password.html')

@app.route('/documentos')
def documentos():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("""
                SELECT d.id_documento, CONCAT(u.nombres, ' ', u.apellidos) as solicitante,
                    d.pasaporte, d.historial_viajes, d.foto_digital, d.proposito_viaje
                FROM tbl_documentos_adjuntos d
                JOIN tbl_form_eligibilidadcva fe ON d.id_formElegibilidad = fe.id_formElegibilidad
                JOIN tbl_solicitante s ON fe.id_solicitante = s.id_solicitante
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            """)
            documentos = cursor.fetchall()
            return render_template('documentos.html', documentos=documentos)
        except Exception as e:
            print(f"Error en la consulta: {e}")
            flash('Error al cargar los documentos', 'error')
            return redirect(url_for('index'))
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('index'))

@app.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("""
                SELECT user_id, expiration 
                FROM tbl_password_reset 
                WHERE token = %s AND expiration > NOW()
            """, (token,))
            
            reset_request = cursor.fetchone()
            
            if not reset_request:
                flash('El enlace es inválido o ha expirado', 'error')
                return redirect(url_for('login'))
            
            if request.method == 'POST':
                new_password = request.form['password']
                hashed_password = generate_password_hash(new_password)
                
                cursor.execute("""
                    UPDATE tbl_usuario 
                    SET contrasena = %s 
                    WHERE id_usuario = %s
                """, (hashed_password, reset_request['user_id']))
                
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
                cursor.execute("SELECT * FROM tbl_usuario WHERE correo = %s", (correo,))
                existing_user = cursor.fetchone()
                if existing_user:
                    flash('El correo ya está registrado. Por favor, usa otro correo.', 'error')
                    return redirect(url_for('registro'))
                
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

@app.route('/solicitudes')
def solicitantes():  # Mantenemos el nombre 'solicitantes' para la función
    if 'user_id' not in session:
        return redirect(url_for('login'))

    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT s.id_solicitante, u.id_usuario, u.nombres, u.apellidos, u.correo, u.fecha_nacimiento 
            FROM tbl_solicitante s
            JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        """)
        solicitantes = cursor.fetchall()  # Cambiado a plural para mayor claridad
        cursor.close()
        connection.close()
        
        # No pasamos url_map_endpoints a la plantilla
        return render_template('solicitudes.html', solicitantes=solicitantes)
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('index'))
      

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
                FROM tbl_form_eligibilidadcva 
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

@app.route('/asesorias')
def asesorias():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("""
                SELECT a.codigo_asesoria, a.fecha_asesoria, a.asesor_asignado,
                    CONCAT(u.nombres, ' ', u.apellidos) as solicitante
                FROM tbl_asesoria a
                JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            """)
            asesorias = cursor.fetchall()
            return render_template('asesorias.html', asesorias=asesorias)
        except Exception as e:
            print(f"Error en la consulta: {e}")
            flash('Error al cargar las asesorías', 'error')
            return redirect(url_for('index'))
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('index'))

@app.route('/nueva_asesoria', methods=['GET', 'POST'])
def nueva_asesoria():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            # Fetch solicitantes for the dropdown
            cursor.execute("""
                SELECT s.id_solicitante, CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo
                FROM tbl_solicitante s
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            """)
            solicitantes = cursor.fetchall()

            if request.method == 'POST':
                id_solicitante = request.form['id_solicitante']
                fecha_asesoria = request.form['fecha_asesoria']
                asesor_asignado = request.form['asesor_asignado']

                # Insert new advisory
                cursor.execute("""
                    INSERT INTO tbl_asesoria (id_solicitante, fecha_asesoria, asesor_asignado)
                    VALUES (%s, %s, %s)
                """, (id_solicitante, fecha_asesoria, asesor_asignado))
                connection.commit()
                flash('Asesoría registrada exitosamente', 'success')
                return redirect(url_for('asesorias'))
            
            return render_template('nueva_asesoria.html', solicitantes=solicitantes)
        except Error as e:
            print(f"Error: {e}")
            flash('Error al procesar la solicitud', 'error')
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
            cursor.execute("""
                SELECT p.num_factura, CONCAT(u.nombres, ' ', u.apellidos) as solicitante,
                    p.metodo_pago, p.total_pago
                FROM tbl_pago p
                JOIN tbl_solicitante s ON p.id_solicitante = s.id_solicitante
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            """)
            pagos = cursor.fetchall()
            return render_template('pagos.html', pagos=pagos)
        except Exception as e:
            print(f"Error en la consulta: {e}")
            flash('Error al cargar los pagos', 'error')
            return redirect(url_for('index'))
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('index'))

@app.route('/ayuda')
def ayuda():
    return render_template('ayuda.html')

if __name__ == '__main__':
    app.run(debug=True)