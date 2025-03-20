import smtplib
from email.mime.text import MIMEText
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify, send_file
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
from werkzeug.utils import secure_filename
import io

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

# Configuración para subida de archivos
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max

# Asegurarse de que el directorio de uploads exista
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

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

# Función para obtener la fecha y hora actual (para usar en las plantillas)
@app.context_processor
def utility_processor():
  def now():
      return datetime.now()
  return dict(now=now)

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
                    return redirect(url_for('index_asesor'))
                else:
                    return redirect(url_for('index'))
            else:
                flash('Correo o contraseña incorrectos', 'error')
        else:
            flash('Error de conexión a la base de datos', 'error')
    
    return render_template('login.html')

# Ruta para la página de administrador
@app.route('/admin')
def admin_index():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('index_asesor'))
    
    # Depuración: Imprimir información sobre las plantillas
    import os
    print(f"Directorio de trabajo actual: {os.getcwd()}")
    print(f"Carpeta de plantillas: {app.template_folder}")
    print(f"¿Existe base_asesor.html?: {os.path.exists(os.path.join(app.template_folder, 'base_asesor.html'))}")
    
    try:
        # Renderizar la plantilla de administrador
        return render_template('index_administrador.html')
    except Exception as e:
        # Capturar y mostrar cualquier error
        print(f"Error al renderizar la plantilla: {str(e)}")
        # Mostrar el error al usuario
        return f"Error: {str(e)}", 500
    
@app.route('/asesor', methods=['GET'])
def index_asesor():
    return render_template('Administrador/index_asesor.html')


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
    # Limpiar toda la sesión en lugar de solo user_id y user_name
    session.clear()
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
                  fe.motivo_viaje, fe.codigo_pasaporte, fe.pais_residencia  as solicitante, 
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
              a.especialidad, 
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

# Esta ruta obtiene todos los asesores de la base de datos
@app.route('/obtener_asesores', methods=['GET'])
def obtener_asesores():
  if 'user_id' not in session:
      return jsonify({'error': 'No autorizado'}), 401
  
  try:
      connection = create_connection()
      if connection:
          cursor = connection.cursor(dictionary=True)
          
          # Obtener todos los asesores con su especialidad
          cursor.execute("""
              SELECT id_asesor, nombre, apellidos, correo, 
                     CASE 
                         WHEN id_asesor = 8 THEN 'Especialista en Visas de Trabajo'
                         WHEN id_asesor = 9 THEN 'Especialista en Visas de Estudio'
                         WHEN id_asesor = 10 THEN 'Especialista en Residencia Permanente'
                         ELSE 'Asesor de Inmigración'
                     END as especialidad
              FROM tbl_asesor
              WHERE id_asesor > 7  -- Filtrar solo asesores reales (no administradores)
              ORDER BY nombre, apellidos
          """)
          
          asesores = cursor.fetchall()
          cursor.close()
          connection.close()
          
          return jsonify({'asesores': asesores})
      else:
          return jsonify({'error': 'Error de conexión a la base de datos'}), 500
  except Exception as e:
      print(f"Error al obtener asesores: {str(e)}")
      return jsonify({'error': str(e)}), 500

# Añadir rutas para gestionar las reservas temporales y permanentes

@app.route('/reservar_horario_temporal', methods=['POST'])
def reservar_horario_temporal():
  if 'user_id' not in session:
      return jsonify({'error': 'No autorizado'}), 401
  
  try:
      data = request.get_json()
      id_asesor = data.get('id_asesor')
      fecha = data.get('fecha')
      hora = data.get('hora')
      
      if not id_asesor or not fecha or not hora:
          return jsonify({'error': 'Faltan parámetros requeridos'}), 400
      
      # Convertir la fecha y hora a un objeto datetime
      fecha_hora = datetime.strptime(f"{fecha} {hora}", '%Y-%m-%d %H:%M')
      
      # Verificar si el horario ya está reservado
      connection = create_connection()
      if connection:
          cursor = connection.cursor(dictionary=True)
          
          # Verificar si ya existe una reserva para este horario
          cursor.execute("""
              SELECT id_calendario FROM tbl_calendario_asesorias
              WHERE id_asesor = %s AND DATE(fecha) = %s AND TIME(fecha) = %s
          """, (id_asesor, fecha, hora))
          
          if cursor.fetchone():
              cursor.close()
              connection.close()
              return jsonify({'error': 'Este horario ya está reservado'}), 400
          
          # Verificar si ya existe una reserva temporal para este horario
          cursor.execute("""
              SELECT id_reserva FROM tbl_reservas_temporales
              WHERE id_asesor = %s AND DATE(fecha) = %s AND TIME(fecha) = %s
              AND expiracion > NOW()
          """, (id_asesor, fecha, hora))
          
          if cursor.fetchone():
              cursor.close()
              connection.close()
              return jsonify({'error': 'Este horario está temporalmente reservado'}), 400
          
          # Crear una reserva temporal que expira en 10 minutos
          expiracion = datetime.now() + timedelta(minutes=10)
          
          cursor.execute("""
              INSERT INTO tbl_reservas_temporales (id_asesor, fecha, expiracion, id_usuario)
              VALUES (%s, %s, %s, %s)
          """, (id_asesor, fecha_hora, expiracion, session['user_id']))
          
          reserva_id = cursor.lastrowid
          connection.commit()
          
          # Actualizar el estado del horario en tbl_horarios_asesores
          dia_semana = fecha_hora.weekday() + 1  # +1 porque en la BD 1 es lunes
          hora_inicio = datetime.strptime(hora, '%H:%M').time()
          
          cursor.execute("""
              UPDATE tbl_horarios_asesores
              SET disponible = 0, reserva_temporal = %s
              WHERE id_asesor = %s AND dia_semana = %s AND hora_inicio = %s
          """, (reserva_id, id_asesor, dia_semana, hora_inicio))
          
          connection.commit()
          cursor.close()
          connection.close()
          
          # Programar la eliminación de la reserva temporal después de 10 minutos
          # En un entorno de producción, esto se haría con un job scheduler como Celery
          # Aquí usamos un hilo simple para la demostración
          def eliminar_reserva_temporal():
              time.sleep(10 * 60)  # Esperar 10 minutos
              try:
                  conn = create_connection()
                  if conn:
                      cur = conn.cursor()
                      
                      # Verificar si la reserva aún existe y no ha sido confirmada
                      cur.execute("""
                          SELECT id_reserva FROM tbl_reservas_temporales
                          WHERE id_reserva = %s AND confirmada = 0
                      """, (reserva_id,))
                      
                      if cur.fetchone():
                          # Eliminar la reserva temporal
                          cur.execute("DELETE FROM tbl_reservas_temporales WHERE id_reserva = %s", (reserva_id,))
                          
                          # Restaurar la disponibilidad del horario
                          cur.execute("""
                              UPDATE tbl_horarios_asesores
                              SET disponible = 1, reserva_temporal = NULL
                              WHERE id_asesor = %s AND dia_semana = %s AND hora_inicio = %s
                          """, (id_asesor, dia_semana, hora_inicio))
                          
                          conn.commit()
                      
                      cur.close()
                      conn.close()
              except Exception as e:
                  print(f"Error al eliminar reserva temporal: {e}")
          
          # Iniciar el hilo para eliminar la reserva temporal
          threading.Thread(target=eliminar_reserva_temporal, daemon=True).start()
          
          return jsonify({'success': True, 'reserva_id': reserva_id})
      else:
          return jsonify({'error': 'Error de conexión a la base de datos'}), 500
  except Exception as e:
      print(f"Error al reservar horario temporal: {str(e)}")
      return jsonify({'error': str(e)}), 500

@app.route('/cancelar_reserva_temporal', methods=['POST'])
def cancelar_reserva_temporal():
  if 'user_id' not in session:
      return jsonify({'error': 'No autorizado'}), 401
  
  try:
      data = request.get_json()
      reserva_id = data.get('reserva_id')
      
      if not reserva_id:
          return jsonify({'error': 'Falta el ID de reserva'}), 400
      
      connection = create_connection()
      if connection:
          cursor = connection.cursor(dictionary=True)
          
          # Obtener información de la reserva
          cursor.execute("""
              SELECT id_asesor, fecha FROM tbl_reservas_temporales
              WHERE id_reserva = %s AND id_usuario = %s
          """, (reserva_id, session['user_id']))
          
          reserva = cursor.fetchone()
          
          if not reserva:
              cursor.close()
              connection.close()
              return jsonify({'error': 'Reserva no encontrada o no autorizada'}), 404
          
          # Eliminar la reserva temporal
          cursor.execute("DELETE FROM tbl_reservas_temporales WHERE id_reserva = %s", (reserva_id,))
          
          # Restaurar la disponibilidad del horario
          fecha_hora = reserva['fecha']
          dia_semana = fecha_hora.weekday() + 1
          hora_inicio = fecha_hora.time()
          
          cursor.execute("""
              UPDATE tbl_horarios_asesores
              SET disponible = 1, reserva_temporal = NULL
              WHERE id_asesor = %s AND dia_semana = %s AND hora_inicio = %s
          """, (reserva['id_asesor'], dia_semana, hora_inicio))
          
          connection.commit()
          cursor.close()
          connection.close()
          
          return jsonify({'success': True})
      else:
          return jsonify({'error': 'Error de conexión a la base de datos'}), 500
  except Exception as e:
      print(f"Error al cancelar reserva temporal: {str(e)}")
      return jsonify({'error': str(e)}), 500

# Modificación de la función nueva_asesoria para que no redirija automáticamente al pago
@app.route('/nueva_asesoria', methods=['POST'])
def nueva_asesoria():
    if 'user_id' not in session:
        if request.is_json:
            return jsonify({'error': 'No autorizado'}), 401
        return redirect(url_for('login'))

    try:
        # Determinar si la solicitud es AJAX o un envío de formulario tradicional
        if request.is_json:
            data = request.get_json()
            id_solicitante = data.get('id_solicitante')
            tipo_asesoria = data.get('tipo_asesoria', 'Visa de Trabajo')
            descripcion = data.get('descripcion', '')
            lugar = data.get('lugar', 'Virtual (Zoom)')
            metodo_pago = data.get('metodo_pago', 'Tarjeta de Crédito')
            tipo_documento = data.get('tipo_documento', 'C.C')
            numero_documento = data.get('numero_documento', '')
            id_asesor = data.get('id_asesor', '')
            asesor_asignado = data.get('asesor_asignado', 'Por asignar')
            asesor_especialidad = data.get('asesor_especialidad', 'Inmigración Canadiense')
            fecha_asesoria = data.get('fecha_asesoria')
        else:
            # Obtener datos del formulario tradicional
            id_solicitante = request.form['id_solicitante']
            tipo_asesoria = request.form.get('tipo_asesoria', 'Visa de Trabajo')
            descripcion = request.form.get('descripcion', '')
            lugar = request.form.get('lugar', 'Virtual (Zoom)')
            metodo_pago = request.form.get('metodo_pago', 'Tarjeta de Crédito')
            tipo_documento = request.form.get('tipo_documento', 'C.C')
            numero_documento = request.form.get('numero_documento', '')
            id_asesor = request.form.get('id_asesor', '')
            asesor_asignado = request.form.get('asesor_asignado', 'Por asignar')
            asesor_especialidad = request.form.get('asesor_especialidad', 'Inmigración Canadiense')
            fecha_asesoria = request.form.get('fecha_asesoria')
        
        # Obtener el precio según el tipo de visa
        precio = PRECIOS_VISA.get(tipo_asesoria, 150.00)
        
        connection = create_connection()
        if connection:
            cursor = connection.cursor()
            try:
                # Verificar si la fecha y hora ya están reservadas
                if fecha_asesoria and id_asesor:
                    fecha_obj = datetime.strptime(fecha_asesoria, '%Y-%m-%dT%H:%M') if isinstance(fecha_asesoria, str) else fecha_asesoria
                    
                    cursor.execute("""
                        SELECT codigo_asesoria FROM tbl_asesoria 
                        WHERE id_asesor = %s AND DATE(fecha_asesoria) = %s AND TIME(fecha_asesoria) = %s 
                        AND estado IN ('Pendiente', 'Pagada')
                    """, (id_asesor, fecha_obj.date(), fecha_obj.time()))
                    
                    existing_asesoria = cursor.fetchone()
                    if existing_asesoria:
                        if request.is_json:
                            return jsonify({'error': 'Esta fecha y hora ya están reservadas'}), 400
                        else:
                            flash('Esta fecha y hora ya están reservadas', 'error')
                            return redirect(url_for('asesorias'))
                
                # Obtener el último número de asesoría para este solicitante
                cursor.execute("""
                    SELECT COALESCE(MAX(numero_asesoria), 0) + 1 as next_num
                    FROM tbl_asesoria
                    WHERE id_solicitante = %s
                """, (id_solicitante,))
                
                result = cursor.fetchone()
                numero_asesoria = result[0] if result else 1
                
                # Verificar si la columna 'especialidad' existe en la tabla
                cursor.execute("""
                    SHOW COLUMNS FROM tbl_asesoria LIKE 'especialidad'
                """)
                
                especialidad_column_exists = cursor.fetchone() is not None
                
                if especialidad_column_exists:
                    # Insertar nueva asesoría con la fecha seleccionada y la especialidad
                    cursor.execute("""
                        INSERT INTO tbl_asesoria (fecha_asesoria, asesor_asignado, id_solicitante, tipo_asesoria, 
                        descripcion, lugar, estado, tipo_documento, numero_documento, numero_asesoria, id_asesor, 
                        nombre_asesor, especialidad)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (fecha_asesoria, asesor_asignado, id_solicitante, tipo_asesoria, descripcion, lugar, 
                         "Pendiente", tipo_documento, numero_documento, numero_asesoria, id_asesor, 
                         asesor_asignado, asesor_especialidad))
                else:
                    # Insertar nueva asesoría sin la columna especialidad
                    cursor.execute("""
                        INSERT INTO tbl_asesoria (fecha_asesoria, asesor_asignado, id_solicitante, tipo_asesoria, 
                        descripcion, lugar, estado, tipo_documento, numero_documento, numero_asesoria, id_asesor, 
                        nombre_asesor)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (fecha_asesoria, asesor_asignado, id_solicitante, tipo_asesoria, descripcion, lugar, 
                         "Pendiente", tipo_documento, numero_documento, numero_asesoria, id_asesor, 
                         asesor_asignado))
                
                # Obtener el ID de la asesoría recién creada
                codigo_asesoria = cursor.lastrowid
                
                # Si hay una reserva temporal, confirmarla
                if fecha_asesoria and id_asesor:
                    fecha_obj = datetime.strptime(fecha_asesoria, '%Y-%m-%dT%H:%M') if isinstance(fecha_asesoria, str) else fecha_asesoria
                    fecha = fecha_obj.date()
                    hora = fecha_obj.time()
                    
                    # Buscar si existe una reserva temporal para este horario
                    cursor.execute("""
                        SELECT id_reserva FROM tbl_reservas_temporales
                        WHERE id_asesor = %s AND DATE(fecha) = %s AND TIME(fecha) = %s
                        AND id_usuario = %s AND expiracion > NOW()
                    """, (id_asesor, fecha, hora, session['user_id']))
                    
                    reserva = cursor.fetchone()
                    if reserva:
                        reserva_id = reserva[0]
                        
                        # Marcar la reserva como confirmada
                        cursor.execute("""
                            UPDATE tbl_reservas_temporales
                            SET confirmada = 1
                            WHERE id_reserva = %s
                        """, (reserva_id,))
                
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
                
                if request.is_json:
                    return jsonify({
                        'success': True, 
                        'codigo_asesoria': codigo_asesoria,
                        'message': 'Asesoría solicitada con éxito. Tienes 5 minutos para realizar el pago.'
                    })
                else:
                    flash('Asesoría solicitada con éxito. Tienes 5 minutos para realizar el pago.', 'success')
            except Error as e:
                connection.rollback()
                if request.is_json:
                    return jsonify({'error': f'Error al solicitar la asesoría: {e}'}), 500
                else:
                    flash(f'Error al solicitar la asesoría: {e}', 'error')
            finally:
                cursor.close()
                connection.close()
        else:
            if request.is_json:
                return jsonify({'error': 'Error de conexión a la base de datos'}), 500
            else:
                flash('Error de conexión a la base de datos', 'error')
        
        if request.is_json:
            return jsonify({'error': 'Error desconocido'}), 500
        return redirect(url_for('asesorias'))
    except Exception as e:
        if request.is_json:
            return jsonify({'error': f'Error: {str(e)}'}), 500
        flash(f'Error: {str(e)}', 'error')
        return redirect(url_for('asesorias'))

# Modificar la ruta de procesar_pago para actualizar tbl_calendario_asesorias
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
      fecha_asesoria = data.get('fecha_asesoria')
      id_asesor = data.get('id_asesor')
      
      if isinstance(datos_adicionales, str):
          try:
              datos_adicionales = json.loads(datos_adicionales)
          except:
              datos_adicionales = {}
      
      connection = create_connection()
      if connection:
          cursor = connection.cursor(dictionary=True)
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
              
              # Obtener información de la asesoría
              cursor.execute("""
                  SELECT fecha_asesoria, id_asesor FROM tbl_asesoria WHERE codigo_asesoria = %s
              """, (codigo_asesoria,))
              
              asesoria = cursor.fetchone()
              
              if asesoria:
                  fecha_obj = asesoria['fecha_asesoria']
                  id_asesor_db = asesoria['id_asesor']
                  
                  # Si no se proporcionó fecha o id_asesor, usar los de la base de datos
                  if not fecha_asesoria:
                      fecha_asesoria = fecha_obj
                  if not id_asesor:
                      id_asesor = id_asesor_db
                  
                  # Registrar en tbl_calendario_asesorias
                  cursor.execute("""
                      INSERT INTO tbl_calendario_asesorias (id_asesor, fecha, codigo_asesoria)
                      VALUES (%s, %s, %s)
                      ON DUPLICATE KEY UPDATE codigo_asesoria = VALUES(codigo_asesoria)
                  """, (id_asesor, fecha_obj, codigo_asesoria))
                  
                  # Actualizar tbl_horarios_asesores para marcar el horario como no disponible
                  dia_semana = fecha_obj.weekday() + 1  # +1 porque en la BD 1 es lunes
                  hora = fecha_obj.time()
                  
                  cursor.execute("""
                      UPDATE tbl_horarios_asesores
                      SET disponible = 0, reserva_temporal = NULL
                      WHERE id_asesor = %s AND dia_semana = %s AND hora_inicio = %s
                  """, (id_asesor, dia_semana, hora))
                  
                  # Si había una reserva temporal, eliminarla
                  cursor.execute("""
                      DELETE FROM tbl_reservas_temporales
                      WHERE id_asesor = %s AND DATE(fecha) = %s AND TIME(fecha) = %s
                  """, (id_asesor, fecha_obj.date(), hora))
              
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

# Añadir ruta para obtener horarios disponibles
@app.route('/obtener_horarios_disponibles', methods=['GET'])
def obtener_horarios_disponibles():
  if 'user_id' not in session:
      return jsonify({'error': 'No autorizado'}), 401
  
  try:
      id_asesor = request.args.get('id_asesor')
      fecha = request.args.get('fecha')
      
      if not id_asesor or not fecha:
          return jsonify({'error': 'Faltan parámetros requeridos'}), 400
      
      connection = create_connection()
      if connection:
          cursor = connection.cursor(dictionary=True)
          
          # Convertir la fecha a día de la semana (0-6, donde 0 es domingo)
          fecha_obj = datetime.strptime(fecha, '%Y-%m-%d')
          dia_semana = fecha_obj.weekday() + 1  # +1 porque en la BD 1 es lunes
          
          # Obtener los horarios disponibles del asesor para ese día de la semana
          cursor.execute("""
              SELECT TIME_FORMAT(hora_inicio, '%H:%i') as hora
              FROM tbl_horarios_asesores
              WHERE id_asesor = %s AND dia_semana = %s AND disponible = 1
              ORDER BY hora_inicio
          """, (id_asesor, dia_semana))
          
          horarios_disponibles = cursor.fetchall()
          
          # Obtener las citas ya programadas para ese asesor en esa fecha (tanto pagadas como pendientes)
          cursor.execute("""
              SELECT TIME_FORMAT(TIME(fecha_asesoria), '%H:%i') as hora
              FROM tbl_asesoria
              WHERE id_asesor = %s AND DATE(fecha_asesoria) = %s AND estado IN ('Pendiente', 'Pagada')
          """, (id_asesor, fecha))
          
          citas_programadas = cursor.fetchall()
          citas_horas = [cita['hora'] for cita in citas_programadas]
          
          # Obtener las reservas temporales activas
          cursor.execute("""
              SELECT TIME_FORMAT(TIME(fecha), '%H:%i') as hora
              FROM tbl_reservas_temporales
              WHERE id_asesor = %s AND DATE(fecha) = %s AND expiracion > NOW()
          """, (id_asesor, fecha))
          
          reservas_temporales = cursor.fetchall()
          reservas_horas = [reserva['hora'] for reserva in reservas_temporales]
          
          # Filtrar los horarios disponibles
          horarios = [h['hora'] for h in horarios_disponibles if h['hora'] not in citas_horas and h['hora'] not in reservas_horas]
          
          cursor.close()
          connection.close()
          
          return jsonify({'horarios': horarios})
      else:
          return jsonify({'error': 'Error de conexión a la base de datos'}), 500
  except Exception as e:
      print(f"Error al obtener horarios disponibles: {str(e)}")
      return jsonify({'error': str(e)}), 500

# Añadir ruta para crear un PaymentIntent de Stripe
@app.route('/crear_payment_intent', methods=['POST'])
def crear_payment_intent():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        monto = data.get('monto')  # Monto en centavos
        codigo_asesoria = data.get('codigo_asesoria')
        
        if not monto or not codigo_asesoria:
            return jsonify({'error': 'Faltan parámetros requeridos'}), 400
        
        # Verificar que la asesoría existe y está pendiente de pago
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT a.codigo_asesoria, a.tipo_asesoria, a.id_solicitante, 
                       CONCAT(u.nombres, ' ', u.apellidos) as nombre_solicitante,
                       u.correo as email_solicitante
                FROM tbl_asesoria a
                JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                WHERE a.codigo_asesoria = %s AND a.estado = 'Pendiente'
            """, (codigo_asesoria,))
            
            asesoria = cursor.fetchone()
            cursor.close()
            connection.close()
            
            if not asesoria:
                return jsonify({'error': 'Asesoría no encontrada o ya pagada'}), 404
            
            # Crear un PaymentIntent con Stripe
            try:
                # Convertir el monto a float primero y luego a centavos para Stripe
                monto_float = float(monto)
                monto_centavos = int(monto_float * 100)
                
                intent = stripe.PaymentIntent.create(
                    amount=monto_centavos,
                    currency='usd',
                    metadata={
                        'codigo_asesoria': codigo_asesoria,
                        'tipo_asesoria': asesoria['tipo_asesoria'],
                        'id_solicitante': asesoria['id_solicitante']
                    },
                    receipt_email=asesoria['email_solicitante'],
                    description=f"Pago de asesoría {asesoria['tipo_asesoria']} - {asesoria['nombre_solicitante']}",
                    payment_method_types=['card']
                )
                
                return jsonify({
                    'clientSecret': intent.client_secret,
                    'id': intent.id
                })
            except stripe.error.StripeError as e:
                return jsonify({'error': str(e)}), 500
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        print(f"Error al crear PaymentIntent: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
#ruta 
@app.route('/pagos')
def pagos():
    return render_template('pagos.html')




    

# Añadir ruta para confirmar el pago
@app.route('/confirmar_pago', methods=['GET'])
def confirmar_pago():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    payment_intent_id = request.args.get('payment_intent')
    payment_intent_client_secret = request.args.get('payment_intent_client_secret')
    redirect_status = request.args.get('redirect_status')
    
    if not payment_intent_id:
        flash('No se proporcionó información de pago', 'error')
        return redirect(url_for('asesorias'))
    
    try:
        # Verificar el estado del PaymentIntent
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if payment_intent.status == 'succeeded' or (redirect_status == 'succeeded'):
            # Obtener el código de asesoría desde los metadatos
            codigo_asesoria = payment_intent.metadata.get('codigo_asesoria')
            
            if codigo_asesoria:
                # Actualizar el estado de la asesoría en la base de datos
                connection = create_connection()
                if connection:
                    cursor = connection.cursor()
                    
                    # Registrar el pago
                    cursor.execute("""
                        INSERT INTO tbl_pago_asesoria (codigo_asesoria, monto, metodo_pago, estado_pago, datos_adicionales)
                        VALUES (%s, %s, %s, 'Completado', %s)
                    """, (
                        codigo_asesoria, 
                        payment_intent.amount / 100,  # Convertir de centavos a dólares
                        'Tarjeta de Crédito (Stripe)', 
                        json.dumps({'payment_intent': payment_intent_id})
                    ))
                    
                    # Actualizar el estado de la asesoría
                    cursor.execute("""
                        UPDATE tbl_asesoria SET estado = 'Pagada' WHERE codigo_asesoria = %s
                    """, (codigo_asesoria,))
                    
                    # Obtener información de la asesoría
                    cursor.execute("""
                        SELECT fecha_asesoria, id_asesor FROM tbl_asesoria WHERE codigo_asesoria = %s
                    """, (codigo_asesoria,))
                    
                    asesoria = cursor.fetchone()
                    
                    if asesoria:
                        fecha_obj = asesoria[0]
                        id_asesor = asesoria[1]
                        
                        # Registrar en tbl_calendario_asesorias
                        cursor.execute("""
                            INSERT INTO tbl_calendario_asesorias (id_asesor, fecha, codigo_asesoria)
                            VALUES (%s, %s, %s)
                            ON DUPLICATE KEY UPDATE codigo_asesoria = VALUES(codigo_asesoria)
                        """, (id_asesor, fecha_obj, codigo_asesoria))
                        
                        # Actualizar tbl_horarios_asesores para marcar el horario como no disponible
                        dia_semana = fecha_obj.weekday() + 1  # +1 porque en la BD 1 es lunes
                        hora = fecha_obj.time()
                        
                        cursor.execute("""
                            UPDATE tbl_horarios_asesores
                            SET disponible = 0, reserva_temporal = NULL
                            WHERE id_asesor = %s AND dia_semana = %s AND hora_inicio = %s
                        """, (id_asesor, dia_semana, hora))
                        
                        # Si había una reserva temporal, eliminarla
                        cursor.execute("""
                            DELETE FROM tbl_reservas_temporales
                            WHERE id_asesor = %s AND DATE(fecha) = %s AND TIME(fecha) = %s
                        """, (id_asesor, fecha_obj.date(), hora))
                    
                    connection.commit()
                    cursor.close()
                    connection.close()
                    
                    # Enviar correo de confirmación
                    try:
                        cursor = connection.cursor(dictionary=True)
                        cursor.execute("""
                            SELECT u.correo, CONCAT(u.nombres, ' ', u.apellidos) as nombre,
                                   a.tipo_asesoria, a.fecha_asesoria
                            FROM tbl_asesoria a
                            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
                            JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                            WHERE a.codigo_asesoria = %s
                        """, (codigo_asesoria,))
                        
                        usuario = cursor.fetchone()
                        cursor.close()
                        
                        if usuario:
                            subject = f"Confirmación de pago - Asesoría {usuario['tipo_asesoria']}"
                            body = f"""
                            Hola {usuario['nombre']},
                            
                            Tu pago para la asesoría de {usuario['tipo_asesoria']} ha sido procesado exitosamente.
                            
                            Detalles:
                            - Fecha y hora: {usuario['fecha_asesoria']}
                            - Monto: ${payment_intent.amount / 100} USD
                            - Método: Tarjeta de Crédito (Stripe)
                            
                            Gracias por confiar en nosotros.
                            
                            Atentamente,
                            Equipo CVA
                            """
                            
                            send_email_via_zoho(usuario['correo'], subject, body)
                    except Exception as e:
                        print(f"Error al enviar correo de confirmación: {e}")
                    
                    flash('Pago procesado exitosamente', 'success')
                else:
                    flash('Error de conexión a la base de datos', 'error')
            else:
                flash('No se pudo identificar la asesoría asociada al pago', 'error')
        else:
            flash(f'El pago no se completó correctamente. Estado: {payment_intent.status}', 'error')
    except Exception as e:
        flash(f'Error al procesar el pago: {str(e)}', 'error')
    
    return redirect(url_for('asesorias'))

@app.route('/cancelar_asesoria', methods=['POST'])
def cancelar_asesoria_route():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        codigo_asesoria = data.get('codigo_asesoria')
        
        if not codigo_asesoria:
            return jsonify({'error': 'Falta el código de asesoría'}), 400
        
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Verify that the appointment belongs to the current user
            cursor.execute("""
                SELECT a.codigo_asesoria, a.id_solicitante, s.id_usuario 
                FROM tbl_asesoria a
                JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
                WHERE a.codigo_asesoria = %s AND s.id_usuario = %s
            """, (codigo_asesoria, session['user_id']))
            
            asesoria = cursor.fetchone()
            
            if not asesoria:
                cursor.close()
                connection.close()
                return jsonify({'error': 'Asesoría no encontrada o no autorizada'}), 404
            
            # Get appointment details before deleting (for freeing up the calendar slot)
            cursor.execute("""
                SELECT fecha_asesoria, id_asesor FROM tbl_asesoria 
                WHERE codigo_asesoria = %s
            """, (codigo_asesoria,))
            
            asesoria_details = cursor.fetchone()
            
            # Delete the appointment
            cursor.execute("DELETE FROM tbl_asesoria WHERE codigo_asesoria = %s", (codigo_asesoria,))
            
            # If there was a payment, delete it too
            cursor.execute("DELETE FROM tbl_pago_asesoria WHERE codigo_asesoria = %s", (codigo_asesoria,))
            
            # If the appointment was in the calendar, free up the slot
            if asesoria_details and asesoria_details['id_asesor']:
                fecha_obj = asesoria_details['fecha_asesoria']
                id_asesor = asesoria_details['id_asesor']
                
                # Delete from calendar if it exists
                cursor.execute("""
                    DELETE FROM tbl_calendario_asesorias 
                    WHERE codigo_asesoria = %s
                """, (codigo_asesoria,))
                
                # Update the availability in the schedule
                dia_semana = fecha_obj.weekday() + 1  # +1 porque en la BD 1 es lunes
                hora = fecha_obj.time()
                
                cursor.execute("""
                    UPDATE tbl_horarios_asesores
                    SET disponible = 1, reserva_temporal = NULL
                    WHERE id_asesor = %s AND dia_semana = %s AND hora_inicio = %s
                """, (id_asesor, dia_semana, hora))
            
            connection.commit()
            cursor.close()
            connection.close()
            
            return jsonify({'success': True, 'message': 'Asesoría cancelada exitosamente'})
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        print(f"Error al cancelar asesoría: {str(e)}")
        return jsonify({'error': str(e)}), 500
    


# Rutas para la página de perfil
@app.route('/perfil')
def perfil():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            # Obtener información del usuario
            cursor.execute("""
                SELECT u.*, s.id_solicitante 
                FROM tbl_usuario u
                LEFT JOIN tbl_solicitante s ON u.id_usuario = s.id_usuario
                WHERE u.id_usuario = %s
            """, (session['user_id'],))
            
            user = cursor.fetchone()
            
            if not user:
                flash('Usuario no encontrado', 'error')
                return redirect(url_for('index'))
            
            # Obtener asesorías del usuario si es solicitante
            asesorias = []
            if user['id_solicitante']:
                cursor.execute("""
                    SELECT a.codigo_asesoria, a.fecha_asesoria, a.tipo_asesoria, 
                           a.asesor_asignado, a.estado, a.descripcion
                    FROM tbl_asesoria a
                    WHERE a.id_solicitante = %s
                    ORDER BY a.fecha_asesoria DESC
                """, (user['id_solicitante'],))
                asesorias = cursor.fetchall()
            
            # Incluir CSS adicional para correcciones
            return render_template('perfil.html', user=user, asesorias=asesorias, 
                                  additional_css='/static/css/perfil-fixes.css')
        except Exception as e:
            flash(f'Error al cargar el perfil: {str(e)}', 'error')
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
    
    return redirect(url_for('index'))

# Función para verificar si un archivo tiene una extensión permitida
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Ruta para actualizar la foto de perfil
@app.route('/actualizar_foto_perfil', methods=['POST'])
def actualizar_foto_perfil():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        if 'photo' not in request.files:
            return jsonify({'error': 'No se envió ninguna foto'}), 400
        
        file = request.files['photo']
        
        if file.filename == '':
            return jsonify({'error': 'No se seleccionó ningún archivo'}), 400
        
        if file and allowed_file(file.filename):
            # Crear un nombre de archivo seguro
            filename = secure_filename(f"profile_{session['user_id']}_{int(time.time())}.{file.filename.rsplit('.', 1)[1].lower()}")
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            # Guardar el archivo
            file.save(filepath)
            
            # Actualizar la ruta de la foto en la base de datos (si tienes una tabla para eso)
            # Por ahora, solo guardamos la ruta en la sesión
            session['profile_photo'] = f"/static/uploads/{filename}"
            
            return jsonify({'success': True, 'photo_url': session['profile_photo']})
        else:
            return jsonify({'error': 'Tipo de archivo no permitido. Solo se permiten imágenes (png, jpg, jpeg, gif)'}), 400
    except Exception as e:
        print(f"Error al actualizar foto de perfil: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Ruta para actualizar información básica del usuario
@app.route('/actualizar_informacion_basica', methods=['POST'])
def actualizar_informacion_basica():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        
        # Obtener los datos del formulario
        nombres = data.get('first-name')
        apellidos = data.get('last-name')
        tipo_documento = data.get('document-type')
        numero_documento = data.get('id-document')
        correo = data.get('email')
        telefono = data.get('phone')
        direccion = data.get('address')
        
        connection = create_connection()
        if connection:
            cursor = connection.cursor()
            
            # Actualizar la información del usuario
            cursor.execute("""
                UPDATE tbl_usuario 
                SET nombres = %s, apellidos = %s, correo = %s
                WHERE id_usuario = %s
            """, (nombres, apellidos, correo, session['user_id']))
            
            # Actualizar la sesión con el nuevo nombre
            session['user_name'] = f"{nombres} {apellidos}"
            
            connection.commit()
            cursor.close()
            connection.close()
            
            return jsonify({'success': True, 'message': 'Información actualizada con éxito'})
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        print(f"Error al actualizar información básica: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Ruta para cambiar la contraseña
@app.route('/cambiar_contrasena', methods=['POST'])
def cambiar_contrasena():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Faltan parámetros requeridos'}), 400
        
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Verificar la contraseña actual
            cursor.execute("SELECT contrasena FROM tbl_usuario WHERE id_usuario = %s", (session['user_id'],))
            user = cursor.fetchone()
            
            if not user or not check_password_hash(user['contrasena'], current_password):
                return jsonify({'error': 'La contraseña actual es incorrecta'}), 400
            
            # Actualizar la contraseña
            hashed_password = generate_password_hash(new_password)
            cursor.execute("UPDATE tbl_usuario SET contrasena = %s WHERE id_usuario = %s", 
                          (hashed_password, session['user_id']))
            
            connection.commit()
            cursor.close()
            connection.close()
            
            return jsonify({'success': True, 'message': 'Contraseña actualizada con éxito'})
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        print(f"Error al cambiar contraseña: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Ruta para enviar código de verificación (email o SMS)
@app.route('/enviar_codigo_verificacion', methods=['POST'])
def enviar_codigo_verificacion():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        method = data.get('method')
        
        if method not in ['email', 'sms']:
            return jsonify({'error': 'Método de verificación no válido'}), 400
        
        # Generar código OTP de 6 dígitos
        otp = ''.join(random.choices(string.digits, k=6))
        
        # Guardar el OTP en la sesión para verificarlo después
        session[f'otp_{method}'] = otp
        session[f'otp_{method}_expiry'] = (datetime.now() + timedelta(minutes=10)).timestamp()
        
        if method == 'email':
            email = data.get('email')
            if not email:
                return jsonify({'error': 'Falta el correo electrónico'}), 400
            
            # Enviar el código por correo
            subject = "Código de verificación - Canadian Visa Advise"
            body = f"""
            Hola {session.get('user_name', 'Usuario')},
            
            Tu código de verificación es: {otp}
            
            Este código expirará en 10 minutos.
            
            Atentamente,
            Equipo CVA
            """
            
            if send_email_via_zoho(email, subject, body):
                return jsonify({'success': True, 'message': 'Código enviado al correo electrónico'})
            else:
                return jsonify({'error': 'Error al enviar el correo electrónico'}), 500
        
        elif method == 'sms':
            phone = data.get('phone')
            if not phone:
                return jsonify({'error': 'Falta el número de teléfono'}), 400
            
            # Aquí iría la lógica para enviar SMS (requiere un servicio externo como Twilio)
            # Por ahora, simulamos que se envió correctamente
            return jsonify({'success': True, 'message': 'Código enviado al teléfono (simulado)'})
        
    except Exception as e:
        print(f"Error al enviar código de verificación: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Ruta para verificar el código OTP
@app.route('/verificar_codigo', methods=['POST'])
def verificar_codigo():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        otp = data.get('otp')
        method = data.get('method')
        
        if not otp or not method:
            return jsonify({'error': 'Faltan parámetros requeridos'}), 400
        
        # Verificar que el OTP existe en la sesión y no ha expirado
        session_otp = session.get(f'otp_{method}')
        expiry = session.get(f'otp_{method}_expiry')
        
        if not session_otp or not expiry:
            return jsonify({'error': 'No hay un código de verificación activo'}), 400
        
        if datetime.now().timestamp() > expiry:
            # Limpiar el OTP expirado
            session.pop(f'otp_{method}', None)
            session.pop(f'otp_{method}_expiry', None)
            return jsonify({'error': 'El código ha expirado'}), 400
        
        if otp != session_otp:
            return jsonify({'error': 'Código incorrecto'}), 400
        
        # Código correcto, marcar como verificado
        session[f'{method}_verified'] = True
        
        # Limpiar el OTP usado
        session.pop(f'otp_{method}', None)
        session.pop(f'otp_{method}_expiry', None)
        
        return jsonify({'success': True, 'message': 'Verificación exitosa'})
    except Exception as e:
        print(f"Error al verificar código: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Ruta para actualizar preferencias de notificaciones
@app.route('/actualizar_preferencias_notificaciones', methods=['POST'])
def actualizar_preferencias_notificaciones():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        
        # Aquí iría la lógica para guardar las preferencias en la base de datos
        # Por ahora, solo simulamos que se guardaron correctamente
        
        return jsonify({'success': True, 'message': 'Preferencias actualizadas con éxito'})
    except Exception as e:
        print(f"Error al actualizar preferencias: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Ruta para actualizar preferencias de idioma
@app.route('/actualizar_preferencias_idioma', methods=['POST'])
def actualizar_preferencias_idioma():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        language = data.get('language')
        
        # Guardar la preferencia de idioma en la sesión
        session['language'] = language
        
        return jsonify({'success': True, 'message': 'Preferencias de idioma actualizadas con éxito'})
    except Exception as e:
        print(f"Error al actualizar preferencias de idioma: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Ruta para descargar datos personales
@app.route('/descargar_datos_personales')
def descargar_datos_personales():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    try:
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Obtener información del usuario
            cursor.execute("""
                SELECT u.id_usuario, u.nombres, u.apellidos, u.correo, u.fecha_nacimiento,
                       s.id_solicitante
                FROM tbl_usuario u
                LEFT JOIN tbl_solicitante s ON u.id_usuario = s.id_usuario
                WHERE u.id_usuario = %s
            """, (session['user_id'],))
            
            user_data = cursor.fetchone()
            
            if not user_data:
                flash('Usuario no encontrado', 'error')
                return redirect(url_for('perfil'))
            
            # Si es solicitante, obtener sus asesorías
            asesorias = []
            if user_data.get('id_solicitante'):
                cursor.execute("""
                    SELECT a.codigo_asesoria, a.fecha_asesoria, a.tipo_asesoria, 
                           a.asesor_asignado, a.estado, a.descripcion, a.lugar
                    FROM tbl_asesoria a
                    WHERE a.id_solicitante = %s
                    ORDER BY a.fecha_asesoria DESC
                """, (user_data['id_solicitante'],))
                asesorias = cursor.fetchall()
            
            # Crear un diccionario con todos los datos
            data = {
                'usuario': user_data,
                'asesorias': asesorias
            }
            
            # Convertir a JSON
            json_data = json.dumps(data, default=str, indent=4)
            
            # Crear un archivo en memoria
            mem_file = io.BytesIO()
            mem_file.write(json_data.encode('utf-8'))
            mem_file.seek(0)
            
            cursor.close()
            connection.close()
            
            return send_file(
                mem_file,
                mimetype='application/json',
                as_attachment=True,
                download_name=f'datos_personales_{session["user_id"]}.json'
            )
        else:
            flash('Error de conexión a la base de datos', 'error')
            return redirect(url_for('perfil'))
    except Exception as e:
        flash(f'Error al descargar datos: {str(e)}', 'error')
        return redirect(url_for('perfil'))

# Ruta para eliminar cuenta
@app.route('/eliminar_cuenta', methods=['POST'])
def eliminar_cuenta():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        if connection:
            cursor = connection.cursor()
            
            # Iniciar transacción
            connection.start_transaction()
            
            # Obtener el id_solicitante si existe
            cursor.execute("SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s", (session['user_id'],))
            solicitante = cursor.fetchone()
            
            if solicitante:
                id_solicitante = solicitante[0]
                
                # Eliminar registros relacionados en orden para evitar errores de clave foránea
                cursor.execute("DELETE FROM tbl_pago_asesoria WHERE codigo_asesoria IN (SELECT codigo_asesoria FROM tbl_asesoria WHERE id_solicitante = %s)", (id_solicitante,))
                cursor.execute("DELETE FROM tbl_calendario_asesorias WHERE codigo_asesoria IN (SELECT codigo_asesoria FROM tbl_asesoria WHERE id_solicitante = %s)", (id_solicitante,))
                cursor.execute("DELETE FROM tbl_asesoria WHERE id_solicitante = %s", (id_solicitante,))
                cursor.execute("DELETE FROM tbl_pago WHERE id_solicitante = %s", (id_solicitante,))
                cursor.execute("DELETE FROM tbl_solicitante WHERE id_solicitante = %s", (id_solicitante,))
            
            # Eliminar reservas temporales
            cursor.execute("DELETE FROM tbl_reservas_temporales WHERE id_usuario = %s", (session['user_id'],))
            
            # Eliminar tokens de restablecimiento de contraseña
            cursor.execute("DELETE FROM tbl_password_reset WHERE user_id = %s", (session['user_id'],))
            
            # Finalmente, eliminar el usuario
            cursor.execute("DELETE FROM tbl_usuario WHERE id_usuario = %s", (session['user_id'],))
            
            # Confirmar transacción
            connection.commit()
            
            cursor.close()
            connection.close()
            
            # Limpiar la sesión
            session.clear()
            
            return jsonify({'success': True, 'message': 'Cuenta eliminada con éxito'})
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        print(f"Error al eliminar cuenta: {str(e)}")
        
        # Si hay una conexión activa, hacer rollback
        if connection and connection.is_connected():
            connection.rollback()
            cursor.close()
            connection.close()
        
        return jsonify({'error': str(e)}), 500

# Ruta para obtener detalles de una asesoría
@app.route('/obtener_detalles_asesoria/<int:codigo_asesoria>')
def obtener_detalles_asesoria(codigo_asesoria):
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Verificar que la asesoría pertenece al usuario actual
            cursor.execute("""
                SELECT a.*, pa.monto, pa.metodo_pago as metodo_pago_stripe
                FROM tbl_asesoria a
                LEFT JOIN tbl_pago_asesoria pa ON a.codigo_asesoria = pa.codigo_asesoria
                JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
                WHERE a.codigo_asesoria = %s AND s.id_usuario = %s
            """, (codigo_asesoria, session['user_id']))
            
            asesoria = cursor.fetchone()
            
            cursor.close()
            connection.close()
            
            if not asesoria:
                return jsonify({'error': 'Asesoría no encontrada o no autorizada'}), 404
            
            return jsonify({'success': True, 'asesoria': asesoria})
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        print(f"Error al obtener detalles de asesoría: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)

