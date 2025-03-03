from flask import Flask, render_template, request, redirect, url_for, flash, session
import mysql.connector
from mysql.connector import Error
import os
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = os.urandom(24)


# Configuración de la base de datos para XAMPP
def create_connection():
    try:
        connection = mysql.connector.connect(
            host='localhost',      # Host de XAMPP
            database='CVA',        # Nombre de la base de datos
            user='root',           # Usuario de MySQL en XAMPP (por defecto es 'root')
            password=''            # Contraseña de MySQL en XAMPP (por defecto está vacía)
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
        
        # Verificar si el correo ya está registrado
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT * FROM tbl_usuario WHERE correo = %s", (correo,))
            existing_user = cursor.fetchone()
            
            if existing_user:
                flash('El correo ya está registrado. Por favor, usa otro correo.', 'error')
                cursor.close()
                connection.close()
                return redirect(url_for('registro'))
            
            # Si el correo no está registrado, proceder con el registro
            hashed_password = generate_password_hash(contrasena)
            
            try:
                # Insertar en tbl_usuario
                cursor.execute(
                    "INSERT INTO tbl_usuario (nombres, apellidos, correo, contrasena, fecha_nacimiento) VALUES (%s, %s, %s, %s, %s)",
                    (nombres, apellidos, correo, hashed_password, fecha_nacimiento)
                )
                user_id = cursor.lastrowid
                
                # Insertar en tbl_solicitante
                cursor.execute(
                    "INSERT INTO tbl_solicitante (id_usuario) VALUES (%s)",
                    (user_id,)
                )
                
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
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT s.id_solicitante, u.id_usuario, u.nombres, u.apellidos, u.correo, u.fecha_nacimiento 
            FROM tbl_solicitante s
            JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        """)
        solicitantes = cursor.fetchall()
        cursor.close()
        connection.close()
        return render_template('solicitantes.html', solicitantes=solicitantes)
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
        cursor.execute("""
            SELECT fe.id_formElegibilidad, CONCAT(u.nombres, ' ', u.apellidos) as solicitante, 
                fe.motivo_viaje, fe.codigo_pasaporte, fe.pais_residencia, fe.provincia_destino
            FROM tbl_form_eligibilidadCVA fe
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
        cursor.execute("""
            SELECT a.codigo_asesoria, a.fecha_asesoria, a.asesor_asignado,
                CONCAT(u.nombres, ' ', u.apellidos) as solicitante
            FROM tbl_asesoria a
            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        """)
        asesorias = cursor.fetchall()
        cursor.close()
        connection.close()
        return render_template('asesorias.html', asesorias=asesorias)
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('index'))

@app.route('/pagos')
def pagos():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT p.num_factura, CONCAT(u.nombres, ' ', u.apellidos) as solicitante,
                p.metodo_pago, p.total_pago
            FROM tbl_pago p
            JOIN tbl_solicitante s ON p.id_solicitante = s.id_solicitante
            JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        """)
        pagos = cursor.fetchall()
        cursor.close()
        connection.close()
        return render_template('pagos.html', pagos=pagos)
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('index'))

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
            JOIN tbl_form_eligibilidadCVA fe ON d.id_formElegibilidad = fe.id_formElegibilidad
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