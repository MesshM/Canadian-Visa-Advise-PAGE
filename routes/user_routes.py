# routes/user_routes.py

from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from database import create_connection
from config import UPLOAD_FOLDER, ALLOWED_EXTENSIONS
import os
import time
from utils.file_utils import save_uploaded_file

# Definir el Blueprint
user_bp = Blueprint('user', __name__, url_prefix='/user')

def allowed_file(filename):
    """Verifica si el archivo tiene una extensión permitida."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@user_bp.route('/perfil')
def perfil():
    """Muestra el perfil del usuario y sus asesorías asociadas."""
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

            # Obtener asesorías asociadas al usuario
            cursor.execute("""
                SELECT a.codigo_asesoria, a.fecha_asesoria, a.tipo_asesoria, 
                       a.asesor_asignado, a.estado, a.descripcion
                FROM tbl_asesoria a
                WHERE a.id_solicitante = %s
                ORDER BY a.fecha_asesoria DESC
            """, (user['id_solicitante'],))
            asesorias = cursor.fetchall()

            return render_template('perfil.html', user=user, asesorias=asesorias)
        except Exception as e:
            flash(f'Error al cargar el perfil: {str(e)}', 'error')
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('index'))

@user_bp.route('/actualizar_foto_perfil', methods=['POST'])
def actualizar_foto_perfil():
    """Actualiza la foto de perfil del usuario."""
    if 'photo' not in request.files:
        return jsonify({'error': 'No se envió ninguna foto'}), 400
    file = request.files['photo']
    if file.filename == '':
        return jsonify({'error': 'No se seleccionó ningún archivo'}), 400
    if file and allowed_file(file.filename):
        # Generar un nombre seguro para el archivo
        filename = secure_filename(f"profile_{session['user_id']}_{int(time.time())}.{file.filename.rsplit('.', 1)[1].lower()}")
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        # Actualizar la sesión con la nueva ruta de la foto
        session['profile_photo'] = f"/static/uploads/{filename}"
        return jsonify({'success': True, 'photo_url': session['profile_photo']})
    else:
        return jsonify({'error': 'Tipo de archivo no permitido. Solo se permiten imágenes (png, jpg, jpeg, gif)'}), 400

@user_bp.route('/actualizar_informacion_basica', methods=['POST'])
def actualizar_informacion_basica():
    """Actualiza la información básica del usuario."""
    data = request.get_json()
    nombres = data.get('first-name')
    apellidos = data.get('last-name')
    correo = data.get('email')

    connection = create_connection()
    if connection:
        cursor = connection.cursor()
        try:
            cursor.execute("""
                UPDATE tbl_usuario 
                SET nombres = %s, apellidos = %s, correo = %s
                WHERE id_usuario = %s
            """, (nombres, apellidos, correo, session['user_id']))
            session['user_name'] = f"{nombres} {apellidos}"
            connection.commit()
            return jsonify({'success': True, 'message': 'Información actualizada con éxito'})
        except Exception as e:
            connection.rollback()
            return jsonify({'error': f'Error al actualizar la información: {str(e)}'}), 500
        finally:
            cursor.close()
            connection.close()
    else:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

@user_bp.route('/cambiar_contrasena', methods=['POST'])
def cambiar_contrasena():
    """Cambia la contraseña del usuario."""
    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT contrasena FROM tbl_usuario WHERE id_usuario = %s", (session['user_id'],))
            user = cursor.fetchone()
            if not user or not check_password_hash(user['contrasena'], current_password):
                return jsonify({'error': 'La contraseña actual es incorrecta'}), 400

            hashed_password = generate_password_hash(new_password)
            cursor.execute("UPDATE tbl_usuario SET contrasena = %s WHERE id_usuario = %s", 
                          (hashed_password, session['user_id']))
            connection.commit()
            return jsonify({'success': True, 'message': 'Contraseña actualizada con éxito'})
        except Exception as e:
            connection.rollback()
            return jsonify({'error': f'Error al cambiar la contraseña: {str(e)}'}), 500
        finally:
            cursor.close()
            connection.close()
    else:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500