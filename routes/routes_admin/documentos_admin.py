from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session, send_file
from functools import wraps
import sqlite3
import os
from datetime import datetime
from werkzeug.utils import secure_filename

documentos_admin_bp = Blueprint('documentos_admin', __name__)

def admin_required(f):
    """Decorador para verificar que el usuario sea administrador"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or session.get('user_role') != 'Administrador':
            flash('Acceso denegado. Se requieren permisos de administrador.', 'error')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

def get_db_connection():
    """Obtener conexión a la base de datos"""
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

@documentos_admin_bp.route('/admin/documentos')
@admin_required
def listar_documentos():
    """Listar todos los documentos del sistema"""
    try:
        conn = get_db_connection()
        
        # Obtener parámetros de filtro
        buscar_cliente = request.args.get('cliente', '')
        tipo_filtro = request.args.get('tipo', '')
        estado_filtro = request.args.get('estado', '')
        fecha_filtro = request.args.get('fecha', '')
        
        # Construir consulta con filtros
        query = '''
            SELECT d.id_documento, d.tipo_documento, d.nombre_archivo, d.estado,
                   d.fecha_subida, d.tamano_archivo, d.comentarios,
                   u.nombres || ' ' || u.apellidos as cliente_nombre,
                   u.correo as cliente_correo
            FROM documentos d
            LEFT JOIN usuarios u ON d.id_usuario = u.id_usuario
            WHERE 1=1
        '''
        params = []
        
        if buscar_cliente:
            query += ' AND (u.nombres LIKE ? OR u.apellidos LIKE ? OR u.correo LIKE ?)'
            params.extend([f'%{buscar_cliente}%', f'%{buscar_cliente}%', f'%{buscar_cliente}%'])
        
        if tipo_filtro:
            query += ' AND d.tipo_documento = ?'
            params.append(tipo_filtro)
        
        if estado_filtro:
            query += ' AND d.estado = ?'
            params.append(estado_filtro)
        
        if fecha_filtro:
            query += ' AND DATE(d.fecha_subida) = ?'
            params.append(fecha_filtro)
        
        query += ' ORDER BY d.fecha_subida DESC'
        
        documentos = conn.execute(query, params).fetchall()
        
        # Obtener estadísticas
        total_documentos = len(documentos)
        documentos_pendientes = len([d for d in documentos if d['estado'] == 'Pendiente'])
        documentos_validados = len([d for d in documentos if d['estado'] == 'Validado'])
        documentos_rechazados = len([d for d in documentos if d['estado'] == 'Rechazado'])
        
        conn.close()
        
        return render_template('admin/documentos_admin.html',
                             documentos=documentos,
                             total_documentos=total_documentos,
                             documentos_pendientes=documentos_pendientes,
                             documentos_validados=documentos_validados,
                             documentos_rechazados=documentos_rechazados)
                             
    except Exception as e:
        flash(f'Error al cargar documentos: {str(e)}', 'error')
        return render_template('admin/documentos_admin.html', documentos=[])

@documentos_admin_bp.route('/admin/documentos/<int:id>/validar', methods=['POST'])
@admin_required
def validar_documento(id):
    """Validar un documento"""
    try:
        data = request.get_json()
        comentarios = data.get('comentarios', '') if data else ''
        
        conn = get_db_connection()
        
        # Verificar que el documento existe
        documento = conn.execute(
            'SELECT * FROM documentos WHERE id_documento = ?', (id,)
        ).fetchone()
        
        if not documento:
            return jsonify({'error': 'Documento no encontrado'}), 404
        
        # Validar documento
        conn.execute('''
            UPDATE documentos 
            SET estado = 'Validado', comentarios = ?, fecha_revision = ?, 
                revisado_por = ?
            WHERE id_documento = ?
        ''', (comentarios, datetime.now(), session['user_id'], id))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': 'Documento validado exitosamente'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@documentos_admin_bp.route('/admin/documentos/<int:id>/rechazar', methods=['POST'])
@admin_required
def rechazar_documento(id):
    """Rechazar un documento"""
    try:
        data = request.get_json()
        motivo = data.get('motivo', '') if data else ''
        comentarios = data.get('comentarios', '') if data else ''
        
        if not motivo:
            return jsonify({'error': 'El motivo de rechazo es obligatorio'}), 400
        
        conn = get_db_connection()
        
        # Verificar que el documento existe
        documento = conn.execute(
            'SELECT * FROM documentos WHERE id_documento = ?', (id,)
        ).fetchone()
        
        if not documento:
            return jsonify({'error': 'Documento no encontrado'}), 404
        
        # Rechazar documento
        conn.execute('''
            UPDATE documentos 
            SET estado = 'Rechazado', motivo_rechazo = ?, comentarios = ?, 
                fecha_revision = ?, revisado_por = ?
            WHERE id_documento = ?
        ''', (motivo, comentarios, datetime.now(), session['user_id'], id))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': 'Documento rechazado exitosamente'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@documentos_admin_bp.route('/admin/documentos/<int:id>/descargar')
@admin_required
def descargar_documento(id):
    """Descargar un documento"""
    try:
        conn = get_db_connection()
        
        documento = conn.execute(
            'SELECT nombre_archivo, ruta_archivo FROM documentos WHERE id_documento = ?', (id,)
        ).fetchone()
        
        conn.close()
        
        if not documento:
            flash('Documento no encontrado.', 'error')
            return redirect(url_for('documentos_admin.listar_documentos'))
        
        # Verificar que el archivo existe
        if not os.path.exists(documento['ruta_archivo']):
            flash('Archivo no encontrado en el servidor.', 'error')
            return redirect(url_for('documentos_admin.listar_documentos'))
        
        return send_file(
            documento['ruta_archivo'],
            as_attachment=True,
            download_name=documento['nombre_archivo']
        )
        
    except Exception as e:
        flash(f'Error al descargar documento: {str(e)}', 'error')
        return redirect(url_for('documentos_admin.listar_documentos'))

@documentos_admin_bp.route('/admin/documentos/<int:id>/preview')
@admin_required
def preview_documento(id):
    """Vista previa de un documento"""
    try:
        conn = get_db_connection()
        
        documento = conn.execute('''
            SELECT d.*, u.nombres || ' ' || u.apellidos as cliente_nombre
            FROM documentos d
            LEFT JOIN usuarios u ON d.id_usuario = u.id_usuario
            WHERE d.id_documento = ?
        ''', (id,)).fetchone()
        
        conn.close()
        
        if not documento:
            return jsonify({'error': 'Documento no encontrado'}), 404
        
        # Determinar si se puede mostrar vista previa
        extension = os.path.splitext(documento['nombre_archivo'])[1].lower()
        puede_preview = extension in ['.pdf', '.jpg', '.jpeg', '.png', '.gif']
        
        return jsonify({
            'documento': dict(documento),
            'puede_preview': puede_preview,
            'url_preview': url_for('documentos_admin.descargar_documento', id=id) if puede_preview else None
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@documentos_admin_bp.route('/admin/documentos/validar-masivo', methods=['POST'])
@admin_required
def validar_documentos_masivo():
    """Validar múltiples documentos"""
    try:
        data = request.get_json()
        documento_ids = data.get('documento_ids', []) if data else []
        comentarios = data.get('comentarios', '') if data else ''
        
        if not documento_ids:
            return jsonify({'error': 'Debe seleccionar al menos un documento'}), 400
        
        conn = get_db_connection()
        
        # Validar documentos en lote
        placeholders = ','.join(['?' for _ in documento_ids])
        conn.execute(f'''
            UPDATE documentos 
            SET estado = 'Validado', comentarios = ?, fecha_revision = ?, 
                revisado_por = ?
            WHERE id_documento IN ({placeholders})
        ''', [comentarios, datetime.now(), session['user_id']] + documento_ids)
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': f'{len(documento_ids)} documentos validados exitosamente'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@documentos_admin_bp.route('/admin/documentos/exportar')
@admin_required
def exportar_documentos():
    """Exportar lista de documentos"""
    try:
        formato = request.args.get('formato', 'csv')
        
        conn = get_db_connection()
        
        documentos = conn.execute('''
            SELECT d.tipo_documento, d.nombre_archivo, d.estado, d.fecha_subida,
                   d.tamano_archivo, u.nombres || ' ' || u.apellidos as cliente,
                   u.correo as cliente_correo
            FROM documentos d
            LEFT JOIN usuarios u ON d.id_usuario = u.id_usuario
            ORDER BY d.fecha_subida DESC
        ''').fetchall()
        
        conn.close()
        
        if formato == 'csv':
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Escribir encabezados
            writer.writerow(['Tipo Documento', 'Nombre Archivo', 'Estado', 'Fecha Subida',
                           'Tamaño', 'Cliente', 'Correo Cliente'])
            
            # Escribir datos
            for doc in documentos:
                writer.writerow([
                    doc['tipo_documento'],
                    doc['nombre_archivo'],
                    doc['estado'],
                    doc['fecha_subida'],
                    doc['tamano_archivo'],
                    doc['cliente'],
                    doc['cliente_correo']
                ])
            
            output.seek(0)
            
            from flask import Response
            return Response(
                output.getvalue(),
                mimetype='text/csv',
                headers={'Content-Disposition': f'attachment; filename=documentos_{datetime.now().strftime("%Y%m%d")}.csv'}
            )
        
        return jsonify({'error': 'Formato no soportado'}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@documentos_admin_bp.route('/admin/documentos/nuevo', methods=['GET', 'POST'])
@admin_required
def nuevo_documento():
    """Crear un nuevo documento"""
    if request.method == 'POST':
        try:
            tipo_documento = request.form.get('tipo_documento')
            id_usuario = request.form.get('id_usuario')
            archivo = request.files.get('archivo')
            comentarios = request.form.get('comentarios', '')
            
            if not archivo or archivo.filename == '':
                flash('Debe seleccionar un archivo', 'error')
                return redirect(request.url)
            
            # Guardar archivo
            filename = secure_filename(archivo.filename)
            upload_folder = 'static/uploads/documentos'
            os.makedirs(upload_folder, exist_ok=True)
            file_path = os.path.join(upload_folder, filename)
            archivo.save(file_path)
            
            # Crear documento en la base de datos
            conn = get_db_connection()
            conn.execute('''
                INSERT INTO documentos (tipo_documento, nombre_archivo, ruta_archivo, 
                                      id_usuario, estado, fecha_subida, tamano_archivo, comentarios)
                VALUES (?, ?, ?, ?, 'Pendiente', ?, ?, ?)
            ''', (tipo_documento, filename, file_path, id_usuario, 
                  datetime.now(), os.path.getsize(file_path), comentarios))
            
            conn.commit()
            conn.close()
            
            flash('Documento creado exitosamente', 'success')
            return redirect(url_for('documentos_admin.listar_documentos'))
            
        except Exception as e:
            flash(f'Error al crear documento: {str(e)}', 'error')
    
    # Obtener usuarios para el formulario
    conn = get_db_connection()
    usuarios = conn.execute(
        'SELECT id_usuario, nombres, apellidos FROM usuarios WHERE estado = "Activo"'
    ).fetchall()
    conn.close()
    
    return render_template('admin/crear_documento.html', usuarios=usuarios)

@documentos_admin_bp.route('/admin/documentos/<int:id>/eliminar', methods=['POST'])
@admin_required
def eliminar_documento(id):
    """Eliminar un documento"""
    try:
        conn = get_db_connection()
        
        # Obtener información del documento
        documento = conn.execute(
            'SELECT ruta_archivo FROM documentos WHERE id_documento = ?', (id,)
        ).fetchone()
        
        if not documento:
            return jsonify({'error': 'Documento no encontrado'}), 404
        
        # Eliminar archivo físico si existe
        if os.path.exists(documento['ruta_archivo']):
            os.remove(documento['ruta_archivo'])
        
        # Eliminar registro de la base de datos
        conn.execute('DELETE FROM documentos WHERE id_documento = ?', (id,))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': 'Documento eliminado exitosamente'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
