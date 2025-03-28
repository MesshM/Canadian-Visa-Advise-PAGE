from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from werkzeug.utils import secure_filename
import os
import time
import sys
import logging

# Add project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import create_connection, close_connection
from config import UPLOAD_FOLDER
from utils.file_utils import save_uploaded_file, validate_document

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Register the Blueprint
document_bp = Blueprint('document', __name__, url_prefix='/document')

def allowed_file(filename):
    """
    Verifies if the file has an allowed extension.
    
    Args:
        filename (str): Name of the file to check
    
    Returns:
        bool: True if file extension is allowed, False otherwise
    """
    ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@document_bp.route('/subir_documento', methods=['GET', 'POST'])
def subir_documento():
    """
    Uploads a document associated with an applicant.
    
    Returns:
        Renders upload template or redirects based on upload status
    """
    # Check user authentication
    if 'user_id' not in session:
        flash('Debe iniciar sesión para subir documentos', 'error')
        return redirect(url_for('auth.login'))

    if request.method == 'POST':
        # Validate file upload
        if 'file' not in request.files:
            flash('No se envió ningún archivo', 'error')
            return redirect(request.url)

        file = request.files['file']
        id_solicitante = request.form.get('id_solicitante')
        tipo_documento = request.form.get('tipo_documento')

        # Additional validation
        if not id_solicitante or not tipo_documento:
            flash('Información del solicitante o tipo de documento faltante', 'error')
            return redirect(request.url)

        if file.filename == '':
            flash('No se seleccionó ningún archivo', 'error')
            return redirect(request.url)

        connection = None
        try:
            if file and allowed_file(file.filename):
                # Generate a secure filename
                file_extension = file.filename.rsplit('.', 1)[1].lower()
                filename = secure_filename(f"{id_solicitante}_{tipo_documento}_{int(time.time())}.{file_extension}")
                filepath = os.path.join(UPLOAD_FOLDER, filename)

                # Save the file
                file.save(filepath)

                # Optional: Validate document content
                if not validate_document(file):
                    os.remove(filepath)
                    flash('El archivo no cumple con los requisitos', 'error')
                    return redirect(request.url)

                # Database connection and insert
                connection = create_connection()
                if connection:
                    with connection.cursor() as cursor:
                        cursor.execute("""
                            INSERT INTO tbl_documento 
                            (id_solicitante, nombre_documento, tipo_archivo, ruta_archivo, estado_documento, fecha_carga)
                            VALUES (%s, %s, %s, %s, 'Pendiente', NOW())
                        """, (id_solicitante, tipo_documento, file.mimetype, f"/static/uploads/{filename}"))
                        connection.commit()
                        flash('Documento subido correctamente', 'success')
                        logger.info(f"Document uploaded: {filename} for applicant {id_solicitante}")

                return redirect(url_for('document.listar_documentos', id_solicitante=id_solicitante))

        except Exception as e:
            logger.error(f"Error uploading document: {str(e)}")
            flash(f'Error al subir el documento: {str(e)}', 'error')
            if os.path.exists(filepath):
                os.remove(filepath)

        finally:
            if connection:
                close_connection(connection)

    return render_template('document/subir_documento.html')

@document_bp.route('/documentos')
def listar_documentos():
    """
    Lists documents associated with an applicant.
    
    Returns:
        Renders document list template or redirects
    """
    if 'user_id' not in session:
        flash('Debe iniciar sesión para ver documentos', 'error')
        return redirect(url_for('auth.login'))

    id_solicitante = request.args.get('id_solicitante')
    if not id_solicitante:
        flash('ID del solicitante no proporcionado', 'error')
        return redirect(url_for('index'))

    connection = None
    try:
        connection = create_connection()
        if connection:
            with connection.cursor(dictionary=True) as cursor:
                cursor.execute("""
                    SELECT * FROM tbl_documento 
                    WHERE id_solicitante = %s
                    ORDER BY fecha_carga DESC
                """, (id_solicitante,))
                documentos = cursor.fetchall()

                # Format dates for better visualization
                for doc in documentos:
                    doc['fecha_formateada'] = doc['fecha_carga'].strftime("%d/%m/%Y %H:%M") if doc['fecha_carga'] else "N/A"

            return render_template('document/listar_documentos.html', documentos=documentos)

    except Exception as e:
        logger.error(f"Error listing documents: {str(e)}")
        flash(f'Error al cargar los documentos: {str(e)}', 'error')

    finally:
        if connection:
            close_connection(connection)

    return redirect(url_for('index'))

@document_bp.route('/actualizar_estado_documento', methods=['POST'])
def actualizar_estado_documento():
    """
    Updates the status of a document.
    
    Returns:
        JSON response about document status update
    """
    # Authorization check
    if 'user_id' not in session or not session.get('is_admin', False):
        return jsonify({'error': 'No autorizado'}), 403

    # Validate input
    id_documento = request.form.get('id_documento')
    nuevo_estado = request.form.get('estado')
    observaciones = request.form.get('observaciones')
    id_solicitante = request.form.get('id_solicitante')

    if not all([id_documento, nuevo_estado, id_solicitante]):
        return jsonify({'error': 'Todos los campos son obligatorios'}), 400

    connection = None
    try:
        connection = create_connection()
        if connection:
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE tbl_documento 
                    SET estado_documento = %s, observaciones = %s
                    WHERE id_documento = %s
                """, (nuevo_estado, observaciones, id_documento))
                connection.commit()
                logger.info(f"Document {id_documento} status updated to {nuevo_estado}")
                return jsonify({
                    'success': True, 
                    'message': 'Estado del documento actualizado correctamente'
                })

    except Exception as e:
        logger.error(f"Error updating document status: {str(e)}")
        if connection:
            connection.rollback()
        return jsonify({
            'error': f'Error al actualizar el estado del documento: {str(e)}'
        }), 500

    finally:
        if connection:
            close_connection(connection)

    return jsonify({
        'error': 'Error de conexión a la base de datos'
    }), 500