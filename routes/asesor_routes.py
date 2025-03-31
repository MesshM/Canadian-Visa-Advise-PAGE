from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify, send_file
from database import create_connection
from mysql.connector import Error
from datetime import datetime

asesor_bp = Blueprint('asesor', __name__)

@asesor_bp.route('/asesor', methods=['GET'])
@asesor_bp.route('/index_asesor')
@asesor_bp.route('/dashboard_asesor')
def index_asesor():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    return render_template('Administrador/index_asesor.html')

@asesor_bp.route('/asesorias_admin')
def asesorias_admin():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    return render_template('Administrador/asesorias_admin.html')

@asesor_bp.route('/documentos_asesor')
def documentos_asesor():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    
    return render_template('Administrador/documentos_asesor.html')

@asesor_bp.route('/documentos/<int:id_solicitante>')
def documentos_cliente(id_solicitante):
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))

    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            # Get client information
            cursor.execute("""
                SELECT 
                    s.id_solicitante, 
                    s.codigo_expediente,
                    s.estado, 
                    s.pais,
                    s.tipo_visa,
                    CONCAT(u.nombres, ' ', u.apellidos) as nombre_completo,
                    u.correo
                FROM tbl_solicitante s
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                WHERE s.id_solicitante = %s
            """, (id_solicitante,))
            cliente = cursor.fetchone()
            
            if not cliente:
                flash('Cliente no encontrado', 'error')
                return redirect(url_for('admin.clientes_admin'))
            
            # Get documents for this client
            cursor.execute("""
                SELECT 
                    d.id_documento,
                    d.nombre_documento,
                    d.nombre_archivo,
                    d.tipo_archivo,
                    d.fecha_carga,
                    d.estado_documento,
                    d.observaciones,
                    d.ruta_archivo
                FROM tbl_documento d
                WHERE d.id_solicitante = %s
                ORDER BY d.fecha_carga DESC
            """, (id_solicitante,))
            documentos = cursor.fetchall()
            
            # Process documents for display
            for doc in documentos:
                # Format date
                if doc['fecha_carga']:
                    doc['fecha_formateada'] = doc['fecha_carga'].strftime("%d/%m/%Y")
                else:
                    doc['fecha_formateada'] = "N/A"
                
                # Determine document icon based on file type
                if doc['tipo_archivo'] in ['jpg', 'jpeg', 'png', 'gif']:
                    doc['icon_type'] = 'image'
                elif doc['tipo_archivo'] in ['pdf']:
                    doc['icon_type'] = 'pdf'
                else:
                    doc['icon_type'] = 'document'
            
            # Calculate document statistics
            total_docs = len(documentos)
            aprobados = sum(1 for doc in documentos if doc['estado_documento'] == 'Aprobado')
            pendientes = sum(1 for doc in documentos if doc['estado_documento'] == 'Pendiente')
            rechazados = sum(1 for doc in documentos if doc['estado_documento'] == 'Requiere corrección')
            
            # Determine overall status
            if total_docs == 0:
                estado_documentacion = "Sin documentos"
                estado_class = "bg-gray-100 text-gray-800"
            elif aprobados == total_docs:
                estado_documentacion = "Documentación completa"
                estado_class = "bg-green-100 text-green-800"
            elif rechazados > 0:
                estado_documentacion = "Requiere correcciones"
                estado_class = "bg-red-100 text-red-800"
            else:
                estado_documentacion = "Documentación incompleta"
                estado_class = "bg-yellow-100 text-yellow-800"
            
        connection.close()
        return render_template('Administrador/documentos_asesor.html',
                              cliente=cliente, 
                              documentos=documentos, 
                              total_docs=total_docs,
                              aprobados=aprobados,
                              pendientes=pendientes,
                              rechazados=rechazados,
                              estado_documentacion=estado_documentacion,
                              estado_class=estado_class)

    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('admin.clientes_admin'))

@asesor_bp.route('/actualizar_estado_documento', methods=['POST'])
def actualizar_estado_documento():
    if 'user_id' not in session or not session.get('is_admin', False):
        return jsonify({'error': 'No autorizado'}), 403

    # Get form data
    id_documento = request.form.get('id_documento')
    nuevo_estado = request.form.get('estado')
    observaciones = request.form.get('observaciones')
    id_solicitante = request.form.get('id_solicitante')
    
    # Validate required fields
    if not all([id_documento, nuevo_estado, id_solicitante]):
        flash('Todos los campos son obligatorios', 'error')
        return redirect(url_for('asesor.documentos_cliente', id_solicitante=id_solicitante))
    
    connection = create_connection()
    if connection:
        try:
            with connection.cursor() as cursor:
                # Update document status
                cursor.execute("""
                    UPDATE tbl_documento 
                    SET estado_documento = %s, observaciones = %s
                    WHERE id_documento = %s
                """, (nuevo_estado, observaciones, id_documento))
                
                connection.commit()
                flash('Estado del documento actualizado correctamente', 'success')
        except Exception as e:
            connection.rollback()
            flash(f'Error al actualizar el estado del documento: {str(e)}', 'error')
        finally:
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
    
    return redirect(url_for('asesor.documentos_cliente', id_solicitante=id_solicitante))

@asesor_bp.route('/descargar_documento/<int:id_documento>')
def descargar_documento(id_documento):
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))

    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            # Get document information
            cursor.execute("""
                SELECT nombre_archivo, ruta_archivo, tipo_archivo
                FROM tbl_documento
                WHERE id_documento = %s
            """, (id_documento,))
            documento = cursor.fetchone()
            
            if documento:
                # Construct file path
                file_path = os.path.join(Config.UPLOAD_FOLDER, documento['ruta_archivo'])
                
                # Check if file exists
                if os.path.exists(file_path):
                    return send_file(file_path, 
                                    as_attachment=True, 
                                    download_name=documento['nombre_archivo'],
                                    mimetype=f'application/{documento["tipo_archivo"]}')
                else:
                    flash('El archivo no existe en el servidor', 'error')
            else:
                flash('Documento no encontrado', 'error')
        
        connection.close()
    
    # If we get here, something went wrong
    return redirect(url_for('admin.clientes_admin'))

@asesor_bp.route('/generar_reporte/<int:id_solicitante>')
def generar_reporte(id_solicitante):
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            # Get client information
            cursor.execute("""
                SELECT 
                    s.id_solicitante, 
                    s.codigo_expediente,
                    s.estado, 
                    s.pais,
                    s.tipo_visa,
                    CONCAT(u.nombres, ' ', u.apellidos) as nombre_completo,
                    u.correo
                FROM tbl_solicitante s
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                WHERE s.id_solicitante = %s
            """, (id_solicitante,))
            cliente = cursor.fetchone()
            
            # Get documents for this client
            cursor.execute("""
                SELECT 
                    d.id_documento,
                    d.nombre_documento,
                    d.nombre_archivo,
                    d.fecha_carga,
                    d.estado_documento,
                    d.observaciones
                FROM tbl_documento d
                WHERE d.id_solicitante = %s
                ORDER BY d.fecha_carga DESC
            """, (id_solicitante,))
            documentos = cursor.fetchall()
            
            # Process documents for the report
            for doc in documentos:
                if doc['fecha_carga']:
                    doc['fecha_formateada'] = doc['fecha_carga'].strftime("%d/%m/%Y")
                else:
                    doc['fecha_formateada'] = "N/A"
        
        connection.close()
        
        # Generate PDF report (this would require a PDF library like ReportLab or WeasyPrint)
        # For now, we'll just return a simple HTML report
        return render_template('Administrador/reporte_documentos.html', cliente=cliente, documentos=documentos)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('admin.clientes_admin'))