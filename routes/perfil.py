import os
import uuid
from PIL import Image
from io import BytesIO
import re
from flask import Blueprint, request, redirect, url_for, flash, render_template, session, jsonify, send_file, send_from_directory
from config.database import create_connection
from utils.auth_helpers import hash_password, verify_password
from config.email import send_email_via_zoho
import random
import string
from datetime import datetime, timedelta
import json
import io
from werkzeug.utils import secure_filename

perfil_bp = Blueprint('perfil', __name__)

# Definir la carpeta para almacenar las imágenes de perfil
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'uploads', 'profile_images')
# Asegurar que la carpeta existe
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

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



@perfil_bp.route('/actualizar_informacion_basica', methods=['POST'])
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
          
          # Actualizar la contraseña
          hashed_password = hash_password(new_password)
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

@perfil_bp.route('/enviar_codigo_verificacion', methods=['POST'])
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
      webp_filename = f"{random_filename}.webp"
      
      # Abrir la imagen con PIL
      img = Image.open(file)
      
      # Redimensionar si es demasiado grande (opcional)
      max_size = (800, 800)
      if img.width > max_size[0] or img.height > max_size[1]:
          img.thumbnail(max_size, Image.LANCZOS)
      
      # Guardar como WebP
      webp_path = os.path.join(UPLOAD_FOLDER, webp_filename)
      img.save(webp_path, 'WEBP', quality=85)
      
      # Guardar la ruta en la base de datos
      connection = create_connection()
      if connection:
          cursor = connection.cursor(dictionary=True)
          
          # Verificar si ya existe una imagen de perfil para este usuario
          cursor.execute("SELECT id, ruta_foto FROM tbl_perfil_fotos WHERE id_usuario = %s", (session['user_id'],))
          existing_image = cursor.fetchone()
          
          if existing_image:
              # Eliminar la imagen anterior del sistema de archivos
              if existing_image['ruta_foto']:
                  old_image_path = os.path.join(UPLOAD_FOLDER, existing_image['ruta_foto'])
                  if os.path.exists(old_image_path):
                      os.remove(old_image_path)
              
              # Actualizar la imagen existente
              cursor.execute(
                  "UPDATE tbl_perfil_fotos SET ruta_foto = %s, fecha_creacion = NOW() WHERE id_usuario = %s",
                  (webp_filename, session['user_id'])
              )
          else:
              # Insertar nueva imagen
              cursor.execute(
                  "INSERT INTO tbl_perfil_fotos (id_usuario, ruta_foto) VALUES (%s, %s)",
                  (session['user_id'], webp_filename)
              )
          
          connection.commit()
          cursor.close()
          connection.close()
          
          # Devolver la URL de la imagen
          image_url = url_for('perfil.obtener_imagen_perfil_archivo', filename=webp_filename)
          return jsonify({'success': True, 'image_url': image_url})
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
          
          # Obtener la ruta de la imagen actual
          cursor.execute("SELECT ruta_foto FROM tbl_perfil_fotos WHERE id_usuario = %s", (session['user_id'],))
          result = cursor.fetchone()
          
          if result and result['ruta_foto']:
              # Eliminar el archivo físico
              file_path = os.path.join(UPLOAD_FOLDER, result['ruta_foto'])
              if os.path.exists(file_path):
                  os.remove(file_path)
              
              # Eliminar el registro de la base de datos
              cursor.execute("DELETE FROM tbl_perfil_fotos WHERE id_usuario = %s", (session['user_id'],))
              connection.commit()
              
              cursor.close()
              connection.close()
              
              return jsonify({'success': True, 'message': 'Imagen de perfil eliminada correctamente'})
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
          
          # Obtener la ruta de la imagen de perfil y datos del usuario
          cursor.execute("""
              SELECT p.ruta_foto, u.nombres, u.apellidos 
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
              
              if result['ruta_foto']:
                  # Si hay imagen, devolver la URL
                  response_data['image_url'] = url_for('perfil.obtener_imagen_perfil_archivo', filename=result['ruta_foto'])
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

@perfil_bp.route('/uploads/profile_images/<filename>')
def obtener_imagen_perfil_archivo(filename):
  # Validar el nombre del archivo para evitar ataques de path traversal
  if not re.match(r'^[a-zA-Z0-9_.-]+\.webp$', filename):
      return "Archivo no encontrado", 404
  
  return send_from_directory(UPLOAD_FOLDER, filename)
