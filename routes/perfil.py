import os
import uuid
from PIL import Image
from io import BytesIO
import re
import cloudinary
import cloudinary.uploader
import cloudinary.api
import json
import time
import hashlib
from flask import Blueprint, request, redirect, url_for, flash, render_template, session, jsonify, send_file, send_from_directory
from config.cloudinary_config import configure_cloudinary
from config.database import create_connection
from utils.auth_helpers import hash_password, verify_password
from config.email import send_email_via_zoho
import random
import string
from datetime import datetime, timedelta
import io
from werkzeug.utils import secure_filename

# Agregar las importaciones de Twilio al principio del archivo
from config.twilio_config import send_verification_code, check_verification_code

perfil_bp = Blueprint('perfil', __name__)

# Definir la carpeta para almacenar las imágenes de perfil en caché local
CACHE_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'cache', 'profile_images')
# Asegurar que la carpeta existe
os.makedirs(CACHE_FOLDER, exist_ok=True)

# Tiempo de expiración de caché en segundos (1 día)
CACHE_EXPIRATION = 86400

@perfil_bp.route('/perfil')
def perfil():
  if 'user_id' not in session:
      return redirect(url_for('auth.login'))
  
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
          
          # Obtener la imagen de perfil del usuario
          cursor.execute("""
              SELECT cloudinary_public_id FROM tbl_perfil_fotos
              WHERE id_usuario = %s
          """, (session['user_id'],))
          
          profile_photo = cursor.fetchone()
          if profile_photo and profile_photo['cloudinary_public_id']:
              # Guardar la URL de la imagen en la sesión
              session['profile_photo'] = cloudinary.CloudinaryImage(profile_photo['cloudinary_public_id']).build_url(
                  width=200, 
                  height=200, 
                  crop="fill", 
                  gravity="face", 
                  fetch_format="auto", 
                  quality="auto"
              )
          
          # Obtener asesorías del usuario si es solicitante
          asesorias = []
          if user['id_solicitante']:
              cursor.execute("""
                  SELECT a.codigo_asesoria, a.fecha_creacion, a.fecha_asesoria, a.tipo_asesoria, 
                         a.asesor_asignado, a.estado, a.descripcion
                  FROM tbl_asesoria a
                  WHERE a.id_solicitante = %s
                  ORDER BY a.fecha_creacion DESC
              """, (user['id_solicitante'],))
              asesorias = cursor.fetchall()
          
          # Incluir CSS adicional para correcciones
          return render_template('perfil.html', user=user, asesorias=asesorias)
      except Exception as e:
          flash(f'Error al cargar el perfil: {str(e)}', 'error')
      finally:
          cursor.close()
          connection.close()
  else:
      flash('Error de conexión a la base de datos', 'error')
  
  return redirect(url_for('index'))

@perfil_bp.route('/cargar_imagen_perfil_sesion', methods=['POST'])
def cargar_imagen_perfil_sesion():
  """
  Función para cargar la imagen de perfil en la sesión.
  Puede ser llamada directamente o desde el proceso de login.
  """
  if 'user_id' not in session:
      return jsonify({'error': 'No autorizado'}), 401
  
  try:
      connection = create_connection()
      if connection:
          cursor = connection.cursor(dictionary=True)
          
          # Obtener la imagen de perfil del usuario
          cursor.execute("""
              SELECT cloudinary_public_id FROM tbl_perfil_fotos
              WHERE id_usuario = %s
          """, (session['user_id'],))
          
          profile_photo = cursor.fetchone()
          if profile_photo and profile_photo['cloudinary_public_id']:
              # Guardar la URL de la imagen en la sesión
              image_url = cloudinary.CloudinaryImage(profile_photo['cloudinary_public_id']).build_url(
                  width=200, 
                  height=200, 
                  crop="fill", 
                  gravity="face", 
                  fetch_format="auto", 
                  quality="auto"
              )
              session['profile_photo'] = image_url
              return jsonify({'success': True, 'image_url': image_url})
          else:
              # Si no hay imagen, limpiar la sesión
              if 'profile_photo' in session:
                  session.pop('profile_photo')
              return jsonify({'success': True, 'has_image': False})
          
          cursor.close()
          connection.close()
      else:
          return jsonify({'error': 'Error de conexión a la base de datos'}), 500
  except Exception as e:
      print(f"Error al cargar imagen de perfil en sesión: {str(e)}")
      return jsonify({'error': str(e)}), 500

def cargar_imagen_perfil_en_sesion(user_id):
  """
  Función auxiliar para cargar la imagen de perfil en la sesión.
  Esta función puede ser importada y llamada desde el proceso de login.
  """
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
              session['profile_photo'] = cloudinary.CloudinaryImage(profile_photo['cloudinary_public_id']).build_url(
                  width=200, 
                  height=200, 
                  crop="fill", 
                  gravity="face", 
                  fetch_format="auto", 
                  quality="auto"
              )
          
          cursor.close()
          connection.close()
          
          return True
  except Exception as e:
      print(f"Error al cargar imagen de perfil en sesión: {str(e)}")
      return False

# Función para obtener imagen de Cloudinary con caché
def get_cloudinary_image_with_cache(public_id, width=200, height=200):
    """
    Obtiene una imagen de Cloudinary con sistema de caché local.
    Si la imagen está en caché y no ha expirado, la devuelve desde el caché.
    De lo contrario, la descarga de Cloudinary y la guarda en caché.
    """
    if not public_id:
        return None
    
    # Crear un hash del public_id y parámetros para el nombre del archivo en caché
    cache_key = hashlib.md5(f"{public_id}_{width}_{height}".encode()).hexdigest()
    cache_path = os.path.join(CACHE_FOLDER, f"{cache_key}.webp")
    cache_meta_path = os.path.join(CACHE_FOLDER, f"{cache_key}.meta")
    
    # Verificar si la imagen está en caché y no ha expirado
    if os.path.exists(cache_path) and os.path.exists(cache_meta_path):
        try:
            with open(cache_meta_path, 'r') as f:
                meta = json.load(f)
            
            # Verificar si el caché ha expirado
            if time.time() - meta['timestamp'] < CACHE_EXPIRATION:
                return cache_path
        except Exception as e:
            print(f"Error al leer metadatos de caché: {str(e)}")
    
    try:
        # Construir la URL de Cloudinary
        image_url = cloudinary.CloudinaryImage(public_id).build_url(
            width=width, 
            height=height, 
            crop="fill", 
            gravity="face", 
            fetch_format="auto", 
            quality="auto"
        )
        
        # Descargar la imagen de Cloudinary
        import requests
        response = requests.get(image_url)
        if response.status_code == 200:
            # Guardar la imagen en caché
            with open(cache_path, 'wb') as f:
                f.write(response.content)
            
            # Guardar metadatos de caché
            with open(cache_meta_path, 'w') as f:
                json.dump({
                    'timestamp': time.time(),
                    'public_id': public_id,
                    'width': width,
                    'height': height
                }, f)
            
            return cache_path
    except Exception as e:
        print(f"Error al obtener imagen de Cloudinary: {str(e)}")
    
    return None

@perfil_bp.route('/cambiar_contrasena', methods=['POST'])
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
            
            if not user or not verify_password(user['contrasena'], current_password):
                return jsonify({'error': 'La contraseña actual es incorrecta'}), 400
            
            cursor.close()
            connection.close()
            
            return jsonify({'success': True, 'message': 'Contraseña verificada, proceda con la verificación OTP'})
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        print(f"Error al verificar contraseña: {str(e)}")
        return jsonify({'error': str(e)}), 500

@perfil_bp.route('/enviar_codigo_cambio_contrasena', methods=['POST'])
def enviar_codigo_cambio_contrasena():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        
        current_password = data.get('current_password')
        
        if not current_password:
            return jsonify({'error': 'Falta la contraseña actual'}), 400
        
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Verificar la contraseña actual
            cursor.execute("SELECT contrasena, correo FROM tbl_usuario WHERE id_usuario = %s", (session['user_id'],))
            user = cursor.fetchone()
            
            if not user or not verify_password(user['contrasena'], current_password):
                return jsonify({'error': 'La contraseña actual es incorrecta'}), 400
            
            # Verificar si hay un tiempo de espera activo para este usuario
            cooldown_key = f'password_change_cooldown_{session["user_id"]}'
            if cooldown_key in session:
                cooldown_until = session.get(cooldown_key)
                if datetime.now().timestamp() < cooldown_until:
                    # Si el tiempo de espera no ha expirado, devolver error con tiempo restante
                    remaining_seconds = int(cooldown_until - datetime.now().timestamp())
                    return jsonify({
                        'error': 'Debes esperar antes de solicitar un nuevo código',
                        'cooldown': True,
                        'remaining_seconds': remaining_seconds
                    }), 429  # 429 Too Many Requests
            
            # Generar código OTP de 4 dígitos
            otp = ''.join(random.choices(string.digits, k=4))
            
            # Guardar el OTP en la sesión para verificarlo después
            session['password_change_otp'] = otp
            session['password_change_expiry'] = (datetime.now() + timedelta(minutes=10)).timestamp()
            
            # Establecer un tiempo de espera de 60 segundos antes de permitir un nuevo envío
            session[cooldown_key] = (datetime.now() + timedelta(seconds=60)).timestamp()
            
            # Enviar el código por correo
            subject = "Código de Verificación para Cambio de Contraseña - Canadian Visa Advise"
            body = f"""
            Hola {session.get('user_name', 'Usuario')},
            
            Tu código de verificación para cambiar la contraseña es: {otp}
            
            Este código expirará en 10 minutos.
            
            Si no solicitaste este cambio, por favor ignora este mensaje o contacta a soporte.
            
            Atentamente,
            Equipo CVA
            """
            
            if send_email_via_zoho(user['correo'], subject, body):
                return jsonify({
                    'success': True, 
                    'message': 'Código enviado al correo electrónico',
                    'cooldown_seconds': 60  # Informar al frontend del tiempo de espera
                })
            else:
                return jsonify({'error': 'Error al enviar el correo electrónico'}), 500
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        print(f"Error al enviar código de verificación: {str(e)}")
        return jsonify({'error': str(e)}), 500

@perfil_bp.route('/verificar_codigo_cambio_contrasena', methods=['POST'])
def verificar_codigo_cambio_contrasena():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        otp = data.get('otp')
        new_password = data.get('new_password')
        
        if not otp or not new_password:
            return jsonify({'error': 'Faltan parámetros requeridos'}), 400
        
        # Verificar que el OTP existe en la sesión y no ha expirado
        session_otp = session.get('password_change_otp')
        expiry = session.get('password_change_expiry')
        
        if not session_otp or not expiry:
            return jsonify({'error': 'No hay un código de verificación activo'}), 400
        
        if datetime.now().timestamp() > expiry:
            # Limpiar el OTP expirado
            session.pop('password_change_otp', None)
            session.pop('password_change_expiry', None)
            return jsonify({'error': 'El código ha expirado'}), 400
        
        if otp != session_otp:
            return jsonify({'error': 'Código incorrecto'}), 400
        
        # Código correcto, actualizar la contraseña
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Actualizar la contraseña
            hashed_password = hash_password(new_password)
            cursor.execute("UPDATE tbl_usuario SET contrasena = %s WHERE id_usuario = %s", 
                          (hashed_password, session['user_id']))
            
            connection.commit()
            cursor.close()
            connection.close()
            
            # Limpiar el OTP usado
            session.pop('password_change_otp', None)
            session.pop('password_change_expiry', None)
            
            return jsonify({'success': True, 'message': 'Contraseña actualizada con éxito'})
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        print(f"Error al verificar código: {str(e)}")
        return jsonify({'error': str(e)}), 500


@perfil_bp.route('/verificar_codigo', methods=['POST'])
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

@perfil_bp.route('/actualizar_preferencias_notificaciones', methods=['POST'])
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

@perfil_bp.route('/actualizar_preferencias_idioma', methods=['POST'])
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

@perfil_bp.route('/descargar_datos_personales')
def descargar_datos_personales():
  if 'user_id' not in session:
      return redirect(url_for('auth.login'))
  
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
              return redirect(url_for('perfil.perfil'))
          
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
          return redirect(url_for('perfil.perfil'))
  except Exception as e:
      flash(f'Error al descargar datos: {str(e)}', 'error')
      return redirect(url_for('perfil.perfil'))

@perfil_bp.route('/eliminar_cuenta', methods=['POST'])
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
          
          # Obtener la imagen de perfil para eliminarla de Cloudinary
          cursor.execute("SELECT cloudinary_public_id FROM tbl_perfil_fotos WHERE id_usuario = %s", (session['user_id'],))
          profile_photo = cursor.fetchone()
          
          if profile_photo and profile_photo[0]:
              # Eliminar la imagen de Cloudinary
              try:
                  cloudinary.uploader.destroy(profile_photo[0])
              except Exception as e:
                  print(f"Error al eliminar imagen de Cloudinary: {str(e)}")
          
          # Eliminar el registro de la foto de perfil
          cursor.execute("DELETE FROM tbl_perfil_fotos WHERE id_usuario = %s", (session['user_id'],))
          
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
      if 'connection' in locals() and connection and connection.is_connected():
          connection.rollback()
          cursor.close()
          connection.close()
      
      return jsonify({'error': str(e)}), 500

# Función para actualizar la imagen de perfil en todas las partes de la aplicación
def actualizar_imagen_perfil_en_sidebar(user_id, image_url=None):
  """
  Actualiza la imagen de perfil en la sesión para que se refleje en el sidebar
  """
  if image_url:
      session['profile_photo'] = image_url
  else:
      # Si no hay URL, intentar obtenerla de la base de datos
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
              session['profile_photo'] = cloudinary.CloudinaryImage(profile_photo['cloudinary_public_id']).build_url(
                  width=200, 
                  height=200, 
                  crop="fill", 
                  gravity="face", 
                  fetch_format="auto", 
                  quality="auto"
              )
          elif 'profile_photo' in session:
              # Si no hay imagen pero existe en la sesión, eliminarla
              session.pop('profile_photo')
          
          cursor.close()
          connection.close()
          
  return True

@perfil_bp.route('/subir_imagen_perfil', methods=['POST'])
def subir_imagen_perfil():
  if 'user_id' not in session:
      return jsonify({'error': 'No autorizado'}), 401
  
  try:
      if 'profile_image' not in request.files:
          return jsonify({'error': 'No se ha proporcionado ninguna imagen'}), 400
      
      file = request.files['profile_image']
      
      if file.filename == '':
          return jsonify({'error': 'No se ha seleccionado ningún archivo'}), 400
      
      # Verificar que es una imagen
      if not file.content_type.startswith('image/'):
          return jsonify({'error': 'El archivo debe ser una imagen'}), 400
      
      # Generar un nombre aleatorio para la imagen
      random_filename = str(uuid.uuid4())
      
      # Abrir la imagen con PIL
      img = Image.open(file)
      
      # Redimensionar si es demasiado grande (opcional)
      max_size = (800, 800)
      if img.width > max_size[0] or img.height > max_size[1]:
          img.thumbnail(max_size, Image.LANCZOS)
      
      # Convertir a BytesIO para subir a Cloudinary
      buffer = BytesIO()
      img.save(buffer, format='WEBP', quality=85)
      buffer.seek(0)
      
      # Subir la imagen a Cloudinary
      upload_result = cloudinary.uploader.upload(
          buffer,
          folder="profile_images",
          public_id=random_filename,
          overwrite=True,
          resource_type="image",
          format="webp",
          transformation=[
              {"width": 800, "height": 800, "crop": "limit"},
              {"quality": "auto", "fetch_format": "auto"}
          ]
      )
      # Guardar la referencia en la base de datos
      connection = create_connection()
      if connection:
          cursor = connection.cursor(dictionary=True)
          
          # Verificar si ya existe una imagen de perfil para este usuario
          cursor.execute("SELECT id, cloudinary_public_id FROM tbl_perfil_fotos WHERE id_usuario = %s", (session['user_id'],))
          existing_image = cursor.fetchone()
          
          if existing_image:
              # Eliminar la imagen anterior de Cloudinary
              if existing_image['cloudinary_public_id']:
                  try:
                      cloudinary.uploader.destroy(existing_image['cloudinary_public_id'])
                  except Exception as e:
                      print(f"Error al eliminar imagen anterior de Cloudinary: {str(e)}")
              
              # Actualizar la imagen existente
              cursor.execute(
                  "UPDATE tbl_perfil_fotos SET cloudinary_public_id = %s, fecha_creacion = NOW() WHERE id_usuario = %s",
                  (upload_result['public_id'], session['user_id'])
              )
          else:
              # Insertar nueva imagen
              cursor.execute(
                  "INSERT INTO tbl_perfil_fotos (id_usuario, cloudinary_public_id) VALUES (%s, %s)",
                  (session['user_id'], upload_result['public_id'])
              )
          
          connection.commit()
          cursor.close()
          connection.close()
          
          # Construir la URL de la imagen con transformaciones
          image_url = cloudinary.CloudinaryImage(upload_result['public_id']).build_url(
              width=200, 
              height=200, 
              crop="fill", 
              gravity="face", 
              fetch_format="auto", 
              quality="auto"
          )
          
          # Guardar la URL de la imagen en la sesión para actualizar el sidebar
          session['profile_photo'] = image_url
          
          # Devolver la URL de la imagen
          return jsonify({
              'success': True, 
              'image_url': image_url,
              'sidebar_update': True  # Indicador para el frontend
          })
      else:
          return jsonify({'error': 'Error de conexión a la base de datos'}), 500
  except Exception as e:
      print(f"Error al subir imagen de perfil: {str(e)}")
      return jsonify({'error': str(e)}), 500

@perfil_bp.route('/eliminar_imagen_perfil', methods=['POST'])
def eliminar_imagen_perfil():
  if 'user_id' not in session:
      return jsonify({'error': 'No autorizado'}), 401
  
  try:
      connection = create_connection()
      if connection:
          cursor = connection.cursor(dictionary=True)
          
          # Obtener la referencia de la imagen actual
          cursor.execute("SELECT cloudinary_public_id FROM tbl_perfil_fotos WHERE id_usuario = %s", (session['user_id'],))
          result = cursor.fetchone()
          
          if result and result['cloudinary_public_id']:
              # Eliminar la imagen de Cloudinary
              try:
                  cloudinary.uploader.destroy(result['cloudinary_public_id'])
              except Exception as e:
                  print(f"Error al eliminar imagen de Cloudinary: {str(e)}")
              
              # Eliminar el registro de la base de datos
              cursor.execute("DELETE FROM tbl_perfil_fotos WHERE id_usuario = %s", (session['user_id'],))
              connection.commit()
              
              # Eliminar la URL de la imagen de la sesión
              if 'profile_photo' in session:
                  session.pop('profile_photo')
              
              # Limpiar caché local
              try:
                  for file in os.listdir(CACHE_FOLDER):
                      if file.endswith('.webp') or file.endswith('.meta'):
                          os.remove(os.path.join(CACHE_FOLDER, file))
              except Exception as e:
                  print(f"Error al limpiar caché: {str(e)}")
              
              cursor.close()
              connection.close()
              
              return jsonify({
                  'success': True, 
                  'message': 'Imagen de perfil eliminada correctamente',
                  'sidebar_update': True  # Indicador para el frontend
              })
          else:
              cursor.close()
              connection.close()
              return jsonify({'error': 'No se encontró ninguna imagen de perfil'}), 404
      else:
          return jsonify({'error': 'Error de conexión a la base de datos'}), 500
  except Exception as e:
      print(f"Error al eliminar imagen de perfil: {str(e)}")
      return jsonify({'error': str(e)}), 500

@perfil_bp.route('/obtener_imagen_perfil')
def obtener_imagen_perfil():
  if 'user_id' not in session:
      return jsonify({'error': 'No autorizado'}), 401
  
  try:
      connection = create_connection()
      if connection:
          cursor = connection.cursor(dictionary=True)
          
          # Obtener la referencia de la imagen de perfil y datos del usuario
          cursor.execute("""
              SELECT p.cloudinary_public_id, u.nombres, u.apellidos 
              FROM tbl_perfil_fotos p
              RIGHT JOIN tbl_usuario u ON p.id_usuario = u.id_usuario
              WHERE u.id_usuario = %s
          """, (session['user_id'],))
          result = cursor.fetchone()
          
          cursor.close()
          connection.close()
          
          if result:
              response_data = {
                  'success': True,
                  'nombres': result['nombres'],
                  'apellidos': result['apellidos']
              }
              
              if result['cloudinary_public_id']:
                  # Si hay imagen, devolver la URL
                  image_url = cloudinary.CloudinaryImage(result['cloudinary_public_id']).build_url(
                      width=200, 
                      height=200, 
                      crop="fill", 
                      gravity="face", 
                      fetch_format="auto", 
                      quality="auto"
                  )
                  response_data['image_url'] = image_url
                  response_data['has_image'] = True
              else:
                  # Si no hay imagen, indicarlo para mostrar iniciales
                  response_data['has_image'] = False
              
              return jsonify(response_data)
          else:
              # Si no hay datos del usuario
              return jsonify({'success': False, 'error': 'Usuario no encontrado'}), 404
      else:
          return jsonify({'error': 'Error de conexión a la base de datos'}), 500
  except Exception as e:
      print(f"Error al obtener imagen de perfil: {str(e)}")
      return jsonify({'error': str(e)}), 500

@perfil_bp.route('/imagen_perfil_cache/<filename>')
def obtener_imagen_perfil_cache(filename):
  """
  Sirve imágenes de perfil desde el caché local
  """
  # Validar el nombre del archivo para evitar ataques de path traversal
  if not re.match(r'^[a-zA-Z0-9_.-]+\.webp$', filename):
      return "Archivo no encontrado", 404
  
  cache_path = os.path.join(CACHE_FOLDER, filename)
  if os.path.exists(cache_path):
      return send_from_directory(CACHE_FOLDER, filename)
  else:
      return "Archivo no encontrado", 404

@perfil_bp.route('/actualizar_datos_personales', methods=['POST'])
def actualizar_datos_personales():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        
        # Verificar que todos los campos requeridos estén presentes
        required_fields = ['nombres', 'apellidos', 'correo', 'fecha_nacimiento', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Falta el campo {field}'}), 400
        
        # Validar el formato del correo electrónico
        import re
        if not re.match(r"[^@]+@[^@]+\.[^@]+", data['correo']):
            return jsonify({'error': 'Formato de correo electrónico inválido'}), 400
        
        # Validar la fecha de nacimiento
        try:
            from datetime import datetime, date
            fecha_nac = datetime.strptime(data['fecha_nacimiento'], '%Y-%m-%d').date()
            hoy = date.today()
            edad = hoy.year - fecha_nac.year - ((hoy.month, hoy.day) < (fecha_nac.month, fecha_nac.day))
            if edad < 18:
                return jsonify({'error': 'Debes tener al menos 18 años'}), 400
        except ValueError:
            return jsonify({'error': 'Formato de fecha inválido'}), 400
        
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Verificar la contraseña actual
            cursor.execute("SELECT contrasena FROM tbl_usuario WHERE id_usuario = %s", (session['user_id'],))
            user = cursor.fetchone()
            
            if not user or not verify_password(user['contrasena'], data['password']):
                return jsonify({'error': 'Contraseña incorrecta'}), 400
            
            # Verificar si el correo ya está en uso por otro usuario
            if data['correo'] != session.get('user_email'):
                cursor.execute("SELECT id_usuario FROM tbl_usuario WHERE correo = %s AND id_usuario != %s", 
                              (data['correo'], session['user_id']))
                existing_email = cursor.fetchone()
                if existing_email:
                    return jsonify({'error': 'El correo electrónico ya está en uso por otro usuario'}), 400
            
            # Obtener la fecha de nacimiento actual del usuario
            cursor.execute("SELECT fecha_nacimiento FROM tbl_usuario WHERE id_usuario = %s", (session['user_id'],))
            fecha_actual = cursor.fetchone()['fecha_nacimiento']

            # Verificar si el correo ha cambiado
            if data['correo'] != session.get('user_email'):
                # Si el correo ha cambiado, actualizar el correo y establecer correo_verificado a 0
                cursor.execute("""
                    UPDATE tbl_usuario 
                    SET nombres = %s, apellidos = %s, correo = %s, correo_verificado = 0
                    WHERE id_usuario = %s
                """, (data['nombres'], data['apellidos'], data['correo'], session['user_id']))
            else:
                # Si el correo no ha cambiado, actualizar solo nombres y apellidos
                cursor.execute("""
                    UPDATE tbl_usuario 
                    SET nombres = %s, apellidos = %s
                    WHERE id_usuario = %s
                """, (data['nombres'], data['apellidos'], session['user_id']))
            
            connection.commit()
            
            # Actualizar la sesión con el nuevo nombre
            session['user_name'] = f"{data['nombres']} {data['apellidos']}"
            session['user_email'] = data['correo']
            
            cursor.close()
            connection.close()
            
            return jsonify({
                'success': True, 
                'message': 'Tus datos personales han sido actualizados correctamente'
            })
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        print(f"Error al actualizar datos personales: {str(e)}")
        return jsonify({'error': str(e)}), 500

@perfil_bp.route('/enviar_verificacion_correo', methods=['POST'])
def enviar_verificacion_correo():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Falta el correo electrónico'}), 400
        
        # Validar formato de correo
        import re
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            return jsonify({'error': 'Formato de correo electrónico inválido'}), 400
        
        # Verificar si hay un tiempo de espera activo para este usuario
        current_time = datetime.now().timestamp()
        cooldown_key = f'email_verification_cooldown_{session["user_id"]}'
        
        if cooldown_key in session:
            cooldown_until = session[cooldown_key]
            
            # Si el tiempo de espera no ha expirado, devolver error con tiempo restante
            if current_time < cooldown_until:
                remaining_seconds = int(cooldown_until - current_time)
                return jsonify({
                    'error': 'Debes esperar antes de solicitar un nuevo código',
                    'cooldown': True,
                    'remaining_seconds': remaining_seconds
                }), 429  # 429 Too Many Requests
        
        # Generar código OTP de 6 dígitos
        otp = ''.join(random.choices(string.digits, k=6))
        
        # Guardar el OTP en la sesión para verificarlo después
        session['email_verification_otp'] = otp
        session['email_verification_email'] = email
        session['email_verification_expiry'] = (datetime.now() + timedelta(minutes=10)).timestamp()
        
        # Establecer un tiempo de espera de 60 segundos antes de permitir un nuevo envío
        session[cooldown_key] = (datetime.now() + timedelta(seconds=60)).timestamp()
        
        # Enviar el código por correo
        subject = "Verificación de Correo Electrónico - Canadian Visa Advise"
        body = f"""
        Hola {session.get('user_name', 'Usuario')},
        
        Tu código de verificación es: {otp}
        
        Este código expirará en 10 minutos.
        
        Atentamente,
        Equipo CVA
        """
        
        if send_email_via_zoho(email, subject, body):
            return jsonify({
                'success': True, 
                'message': 'Código enviado al correo electrónico',
                'cooldown_seconds': 60  # Informar al frontend del tiempo de espera
            })
        else:
            return jsonify({'error': 'Error al enviar el correo electrónico'}), 500
    
    except Exception as e:
        print(f"Error al enviar código de verificación: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Añadir una nueva ruta para verificar el estado del cooldown
@perfil_bp.route('/verificar_cooldown_correo', methods=['GET'])
def verificar_cooldown_correo():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        current_time = datetime.now().timestamp()
        cooldown_key = f'email_verification_cooldown_{session["user_id"]}'
        
        if cooldown_key in session:
            cooldown_until = session[cooldown_key]
            
            # Si el tiempo de espera no ha expirado, devolver tiempo restante
            if current_time < cooldown_until:
                remaining_seconds = int(cooldown_until - current_time)
                return jsonify({
                    'cooldown': True,
                    'remaining_seconds': remaining_seconds
                })
        
        # Si no hay cooldown o ya expiró
        return jsonify({
            'cooldown': False,
            'remaining_seconds': 0
        })
    
    except Exception as e:
        print(f"Error al verificar cooldown: {str(e)}")
        return jsonify({'error': str(e)}), 500

@perfil_bp.route('/verificar_codigo_correo', methods=['POST'])
def verificar_codigo_correo():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        otp = data.get('otp')
        email = data.get('email')
        
        if not otp or not email:
            return jsonify({'error': 'Faltan parámetros requeridos'}), 400
        
        # Verificar que el OTP existe en la sesión y no ha expirado
        session_otp = session.get('email_verification_otp')
        session_email = session.get('email_verification_email')
        expiry = session.get('email_verification_expiry')
        
        if not session_otp or not session_email or not expiry:
            return jsonify({'error': 'No hay un código de verificación activo'}), 400
        
        if datetime.now().timestamp() > expiry:
            # Limpiar el OTP expirado
            session.pop('email_verification_otp', None)
            session.pop('email_verification_email', None)
            session.pop('email_verification_expiry', None)
            return jsonify({'error': 'El código ha expirado'}), 400
        
        if otp != session_otp or email != session_email:
            return jsonify({'error': 'Código incorrecto o correo electrónico no coincide'}), 400
        
        # Código correcto, marcar el correo como verificado
        connection = create_connection()
        if connection:
            cursor = connection.cursor()
            
            # Actualizar el estado de verificación del correo
            cursor.execute("UPDATE tbl_usuario SET correo_verificado = 1 WHERE id_usuario = %s", (session['user_id'],))
            connection.commit()
            
            cursor.close()
            connection.close()
            
            # Limpiar el OTP usado
            session.pop('email_verification_otp', None)
            session.pop('email_verification_email', None)
            session.pop('email_verification_expiry', None)
            
            return jsonify({'success': True, 'message': 'Correo electrónico verificado con éxito'})
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        print(f"Error al verificar código de correo: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Agregar estas nuevas rutas después de la ruta '/verificar_codigo_correo'

@perfil_bp.route('/enviar_verificacion_telefono', methods=['POST'])
def enviar_verificacion_telefono():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        phone = data.get('phone')
        
        if not phone:
            return jsonify({'error': 'Falta el número de teléfono'}), 400
        
        # Validar formato de teléfono (solo números)
        import re
        if not re.match(r"^\d+$", phone):
            return jsonify({'error': 'Formato de teléfono inválido, solo se permiten números'}), 400
        
        # Agregar el código de país de Colombia (+57) si no está presente
        if not phone.startswith('+'):
            phone = '+57' + phone
        
        # Verificar si hay un tiempo de espera activo para este usuario
        current_time = datetime.now().timestamp()
        cooldown_key = f'phone_verification_cooldown_{session["user_id"]}'
        
        if cooldown_key in session:
            cooldown_until = session[cooldown_key]
            
            # Si el tiempo de espera no ha expirado, devolver error con tiempo restante
            if current_time < cooldown_until:
                remaining_seconds = int(cooldown_until - current_time)
                return jsonify({
                    'error': 'Debes esperar antes de solicitar un nuevo código',
                    'cooldown': True,
                    'remaining_seconds': remaining_seconds
                }), 429  # 429 Too Many Requests
        
        # Importar la función de Twilio aquí para evitar problemas de importación circular
        from config.twilio_config import send_verification_code
        
        # Enviar el código de verificación a través de Twilio
        result = send_verification_code(phone)
        
        if result['success']:
            # Guardar el teléfono en la sesión para verificarlo después
            session['phone_verification_phone'] = phone
            session['phone_verification_expiry'] = (datetime.now() + timedelta(minutes=10)).timestamp()
            
            # Si estamos usando SMS directo, guardar el código en la sesión
            if 'code' in result:
                session['direct_verification_code'] = result['code']
            
            # Establecer un tiempo de espera de 60 segundos antes de permitir un nuevo envío
            session[cooldown_key] = (datetime.now() + timedelta(seconds=60)).timestamp()
            
            return jsonify({
                'success': True, 
                'message': 'Código enviado al número de teléfono',
                'cooldown_seconds': 60  # Informar al frontend del tiempo de espera
            })
        else:
            # Registrar el error en los logs del servidor
            print(f"Error al enviar código de verificación a {phone}: {result['message']}")
            return jsonify({'error': result['message']}), 500
    
    except Exception as e:
        # Registrar la excepción completa para depuración
        import traceback
        print(f"Error al enviar código de verificación al teléfono: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': 'Error interno del servidor. Por favor, inténtalo de nuevo más tarde.'}), 500

@perfil_bp.route('/verificar_codigo_telefono', methods=['POST'])
def verificar_codigo_telefono():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        otp = data.get('otp')
        phone = data.get('phone')
        
        if not otp or not phone:
            return jsonify({'error': 'Faltan parámetros requeridos'}), 400
        
        # Verificar que hay una verificación activa y no ha expirado
        session_phone = session.get('phone_verification_phone')
        expiry = session.get('phone_verification_expiry')
        
        if not session_phone or not expiry:
            return jsonify({'error': 'No hay una verificación de teléfono activa'}), 400
        
        if datetime.now().timestamp() > expiry:
            # Limpiar la verificación expirada
            session.pop('phone_verification_phone', None)
            session.pop('phone_verification_expiry', None)
            if 'direct_verification_code' in session:
                session.pop('direct_verification_code', None)
            return jsonify({'error': 'La verificación ha expirado'}), 400
        
        # Agregar el código de país de Colombia (+57) si no está presente
        if not phone.startswith('+'):
            phone = '+57' + phone
        
        if phone != session_phone:
            return jsonify({'error': 'El número de teléfono no coincide con el verificado'}), 400
        
        # Verificar si estamos usando verificación directa o Twilio Verify
        verification_success = False
        
        if 'direct_verification_code' in session:
            # Verificación directa por SMS
            direct_code = session.get('direct_verification_code')
            verification_success = (otp == direct_code)
            
            if verification_success:
                print(f"Código verificado correctamente para {phone} (verificación directa)")
            else:
                print(f"Código incorrecto para {phone}: {otp} != {direct_code}")
        else:
            # Importar la función de Twilio aquí para evitar problemas de importación circular
            from config.twilio_config import check_verification_code
            
            # Verificar el código con Twilio Verify
            result = check_verification_code(phone, otp)
            
            if result.get('direct', False):
                # Si es verificación directa pero no tenemos el código en la sesión
                return jsonify({'error': 'Error de configuración. Por favor, solicita un nuevo código.'}), 400
            
            verification_success = result.get('success', False)
        
        if verification_success:
            # Código correcto, marcar el teléfono como verificado en la base de datos
            connection = create_connection()
            if connection:
                try:
                    cursor = connection.cursor()
                    
                    # Actualizar el número de teléfono y marcarlo como verificado
                    cursor.execute("""
                        UPDATE tbl_usuario 
                        SET celular = %s, celular_verificado = 1 
                        WHERE id_usuario = %s
                    """, (phone.replace('+57', ''), session['user_id']))
                    connection.commit()
                    
                    cursor.close()
                    
                    # Limpiar la verificación usada
                    session.pop('phone_verification_phone', None)
                    session.pop('phone_verification_expiry', None)
                    if 'direct_verification_code' in session:
                        session.pop('direct_verification_code', None)
                    
                    return jsonify({'success': True, 'message': 'Número de teléfono verificado con éxito'})
                except Exception as db_error:
                    print(f"Error de base de datos: {str(db_error)}")
                    return jsonify({'error': f'Error al actualizar la base de datos: {str(db_error)}'}), 500
                finally:
                    connection.close()
            else:
                return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        else:
            return jsonify({'error': 'Código incorrecto'}), 400
    except Exception as e:
        # Registrar la excepción completa para depuración
        import traceback
        print(f"Error al verificar código de teléfono: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@perfil_bp.route('/verificar_cooldown_telefono', methods=['GET'])
def verificar_cooldown_telefono():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        current_time = datetime.now().timestamp()
        cooldown_key = f'phone_verification_cooldown_{session["user_id"]}'
        
        if cooldown_key in session:
            cooldown_until = session[cooldown_key]
            
            # Si el tiempo de espera no ha expirado, devolver tiempo restante
            if current_time < cooldown_until:
                remaining_seconds = int(cooldown_until - current_time)
                return jsonify({
                    'cooldown': True,
                    'remaining_seconds': remaining_seconds
                })
        
        # Si no hay cooldown o ya expiró
        return jsonify({
            'cooldown': False,
            'remaining_seconds': 0
        })
    
    except Exception as e:
        print(f"Error al verificar cooldown de teléfono: {str(e)}")
        return jsonify({'error': str(e)}), 500
