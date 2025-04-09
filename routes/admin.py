from flask import Blueprint, render_template, redirect, url_for, flash, session, request, jsonify
from config.database import create_connection
import datetime

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

@admin_bp.route('/')
def admin_index():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    
    try:
        # Renderizar la plantilla de administrador
        return render_template('asesor/index_asesor.html')
    except Exception as e:
        # Capturar y mostrar cualquier error
        print(f"Error al renderizar la plantilla: {str(e)}")
        # Mostrar el error al usuario
        return f"Error: {str(e)}", 500

@admin_bp.route('/asesor')
def index_asesor():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    return render_template('asesor/index_asesor.html')

@admin_bp.route('/clientes')
def clientes():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT s.id_solicitante, u.nombres, u.apellidos, u.correo, u.fecha_nacimiento 
                FROM tbl_solicitante s
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                ORDER BY s.id_solicitante DESC
            """)
            clientes = cursor.fetchall()
        connection.close()
        return render_template('asesor/clientes.html', clientes=clientes)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('admin.index_asesor'))

@admin_bp.route('/asesorias')
def asesorias_admin():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            # Obtener asesorías
            cursor.execute("""
                SELECT a.codigo_asesoria, a.fecha_asesoria, a.tipo_asesoria,
                       CONCAT(u.nombres, ' ', u.apellidos) AS solicitante,
                       u.correo,
                       a.estado, a.descripcion
                FROM tbl_asesoria a
                JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                ORDER BY a.fecha_asesoria DESC
            """)
            asesorias = cursor.fetchall()
            
            # Obtener clientes para el formulario de nueva asesoría
            cursor.execute("""
                SELECT s.id_solicitante, u.nombres, u.apellidos
                FROM tbl_solicitante s
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                ORDER BY u.nombres, u.apellidos
            """)
            clientes = cursor.fetchall()
            
        connection.close()
        return render_template('asesor/asesorias_admin.html', asesorias=asesorias, clientes=clientes)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('admin.index_asesor'))

@admin_bp.route('/documentos')
def documentos():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    
    # Get list of all clients for selection
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT s.id_solicitante, 
                       CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
                       u.correo
                FROM tbl_solicitante s
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                ORDER BY u.nombres, u.apellidos
            """)
            clientes_lista = cursor.fetchall()
        connection.close()
        
        # Create default empty values for template variables
        cliente = {
            'id_solicitante': '',
            'nombre_completo': 'No seleccionado',
            'codigo_expediente': 'N/A',
            'correo': ''
        }
        documentos = []
        estado_documentacion = 'Sin documentos'
        estado_class = 'bg-gray-100 text-gray-700'
        aprobados = 0
        total_docs = 0
        
        return render_template('asesor/documentos_asesor.html', 
                              cliente=cliente,
                              documentos=documentos,
                              clientes_lista=clientes_lista,
                              estado_documentacion=estado_documentacion,
                              estado_class=estado_class,
                              aprobados=aprobados,
                              total_docs=total_docs)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('admin.index_asesor'))

@admin_bp.route('/documentos/<int:cliente_id>')
def documentos_cliente(cliente_id):
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            # Get client information
            cursor.execute("""
                SELECT s.id_solicitante, 
                       CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
                       u.correo
                FROM tbl_solicitante s
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                WHERE s.id_solicitante = %s
            """, (cliente_id,))
            cliente = cursor.fetchone()
            
            if not cliente:
                flash('Cliente no encontrado', 'error')
                return redirect(url_for('admin.documentos'))
            
            # Add a default expedition code if not available in database
            cliente['codigo_expediente'] = f"EXP-{cliente_id}-{datetime.datetime.now().year}"
            
            # Get client documents
            cursor.execute("""
                SELECT d.id_documento, d.nombre_documento, d.tipo_documento, 
                       d.fecha_subida, d.ruta_archivo, d.estado AS estado_documento,
                       d.observaciones, d.nombre_archivo
                FROM tbl_documento d
                WHERE d.id_solicitante = %s
                ORDER BY d.fecha_subida DESC
            """, (cliente_id,))
            documentos = cursor.fetchall()
            
            # Process documents for display
            for doc in documentos:
                # Format date
                if 'fecha_subida' in doc and doc['fecha_subida']:
                    if isinstance(doc['fecha_subida'], datetime.datetime):
                        doc['fecha_formateada'] = doc['fecha_subida'].strftime('%d/%m/%Y %H:%M')
                    else:
                        doc['fecha_formateada'] = str(doc['fecha_subida'])
                else:
                    doc['fecha_formateada'] = 'N/A'
                
                # Determine icon type
                doc['icon_type'] = 'image' if doc.get('tipo_documento', '').lower() in ['jpg', 'jpeg', 'png', 'gif'] else 'document'
            
            # Get list of all clients for selection
            cursor.execute("""
                SELECT s.id_solicitante, 
                       CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
                       u.correo
                FROM tbl_solicitante s
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                ORDER BY u.nombres, u.apellidos
            """)
            clientes_lista = cursor.fetchall()
            
            # Calculate document statistics
            total_docs = len(documentos)
            aprobados = sum(1 for doc in documentos if doc.get('estado_documento') == 'Aprobado')
            
            # Determine overall documentation status
            if total_docs == 0:
                estado_documentacion = 'Sin documentos'
                estado_class = 'bg-gray-100 text-gray-700'
            elif aprobados == total_docs:
                estado_documentacion = 'Documentación completa'
                estado_class = 'bg-green-100 text-green-800'
            else:
                estado_documentacion = 'Documentación incompleta'
                estado_class = 'bg-yellow-100 text-yellow-800'
            
        connection.close()
        return render_template('asesor/documentos_asesor.html', 
                              cliente=cliente, 
                              documentos=documentos, 
                              clientes_lista=clientes_lista,
                              estado_documentacion=estado_documentacion,
                              estado_class=estado_class,
                              aprobados=aprobados,
                              total_docs=total_docs)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('admin.index_asesor'))

@admin_bp.route('/actualizar_estado_documento', methods=['POST'])
def actualizar_estado_documento():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    
    try:
        # Get form data
        documento_id = request.form.get('id_documento')
        cliente_id = request.form.get('id_solicitante')
        nuevo_estado = request.form.get('estado')
        observaciones = request.form.get('observaciones')
        
        # Validate data
        if not documento_id or not nuevo_estado or not cliente_id:
            flash('Datos incompletos para actualizar el estado', 'error')
            return redirect(url_for('admin.documentos_cliente', cliente_id=cliente_id))
        
        connection = create_connection()
        if connection:
            with connection.cursor() as cursor:
                # Update document status
                cursor.execute("""
                    UPDATE tbl_documento 
                    SET estado = %s, observaciones = %s
                    WHERE id_documento = %s
                """, (nuevo_estado, observaciones, documento_id))
                
            connection.commit()
            connection.close()
            
            flash('Estado del documento actualizado exitosamente', 'success')
        else:
            flash('Error de conexión a la base de datos', 'error')
            
        return redirect(url_for('admin.documentos_cliente', cliente_id=cliente_id))
        
    except Exception as e:
        print(f"Error al actualizar estado del documento: {str(e)}")
        flash(f'Error al actualizar estado: {str(e)}', 'error')
        return redirect(url_for('admin.documentos'))

@admin_bp.route('/pagos')
def pagos_admin():
    # Obtener todos los pagos de la base de datos
    pagos = []
    
    # Inicializar estadísticas
    stats = {
        'total_recibido': 0,
        'pagos_pendientes': 0,
        'pagos_completados': 0,
        'pagos_rechazados': 0
    }
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Consulta para obtener los pagos con información del cliente
        query = """
        SELECT p.*, s.nombre_completo, s.email
        FROM pagos p
        JOIN solicitantes s ON p.id_solicitante = s.id_solicitante
        ORDER BY p.fecha_pago DESC
        """
        cursor.execute(query)
        pagos_raw = cursor.fetchall()
        
        # Procesar los pagos para mostrarlos en la interfaz
        for pago in pagos_raw:
            # Calcular estadísticas
            if pago['estado_pago'] == 'Completado':
                stats['pagos_completados'] += 1
                stats['total_recibido'] += float(pago['monto'])
            elif pago['estado_pago'] == 'Pendiente':
                stats['pagos_pendientes'] += 1
            elif pago['estado_pago'] == 'Rechazado':
                stats['pagos_rechazados'] += 1
            
            # Formatear fecha
            fecha = pago['fecha_pago']
            fecha_formateada = fecha.strftime('%d/%m/%Y') if fecha else 'N/A'
            
            # Obtener iniciales del nombre para el avatar
            nombre_completo = pago['nombre_completo']
            initials = ''.join([name[0].upper() for name in nombre_completo.split() if name])[:2]
            
            # Determinar clase de color para el avatar
            avatar_classes = [
                'bg-red-100 text-red-600',
                'bg-blue-100 text-blue-600',
                'bg-green-100 text-green-600',
                'bg-yellow-100 text-yellow-600',
                'bg-purple-100 text-purple-600'
            ]
            avatar_class = avatar_classes[hash(nombre_completo) % len(avatar_classes)]
            
            # Formatear ID para mostrar
            id_formateado = f"PAG-{pago['id_pago']:04d}"
            
            # Agregar datos procesados al pago
            pago_procesado = {
                **pago,
                'fecha_formateada': fecha_formateada,
                'initials': initials,
                'avatar_class': avatar_class,
                'id_formateado': id_formateado,
                'cliente_nombre': nombre_completo,
                'cliente_email': pago['email']
            }
            
            pagos.append(pago_procesado)
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error al obtener pagos: {e}")
        flash('Error al cargar los pagos', 'error')
    
    return render_template('asesor/pagos_admin.html', pagos=pagos, stats=stats)

@admin_bp.route('/solicitudes')
def solicitudes():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT s.id_solicitud, s.fecha_solicitud, s.estado,
                       CONCAT(u.nombres, ' ', u.apellidos) AS solicitante,
                       s.tipo_solicitud, s.descripcion
                FROM tbl_solicitud s
                JOIN tbl_solicitante sol ON s.id_solicitante = sol.id_solicitante
                JOIN tbl_usuario u ON sol.id_usuario = u.id_usuario
                ORDER BY s.fecha_solicitud DESC
            """)
            solicitudes = cursor.fetchall()
        connection.close()
        return render_template('asesor/solicitudes.html', solicitudes=solicitudes)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('admin.index_asesor'))

@admin_bp.route('/dashboard')
def dashboard_asesor():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    try:
        return render_template('asesor/index_asesor.html')
    except Exception as e:
        print(f"Error al renderizar la plantilla: {str(e)}")
        return redirect(url_for('admin.asesorias_admin'))

@admin_bp.route('/reportes')
def reportes():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    return render_template('asesor/reportes.html')

# Nuevas rutas que faltan

@admin_bp.route('/crear_asesoria', methods=['POST'])
def crear_asesoria():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    
    try:
        # Obtener datos del formulario
        client_id = request.form.get('client')
        asesoria_type = request.form.get('type')
        date = request.form.get('date')
        time = request.form.get('time')
        description = request.form.get('description')
        
        # Validar datos
        if not client_id or not asesoria_type or not date or not time:
            flash('Todos los campos son obligatorios', 'error')
            return redirect(url_for('admin.asesorias_admin'))
        
        # Combinar fecha y hora
        fecha_asesoria = f"{date} {time}"
        
        # Generar código único para la asesoría (ejemplo: ASE-2023-001)
        codigo_asesoria = f"ASE-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        connection = create_connection()
        if connection:
            with connection.cursor() as cursor:
                # Insertar nueva asesoría
                cursor.execute("""
                    INSERT INTO tbl_asesoria 
                    (codigo_asesoria, id_solicitante, fecha_asesoria, tipo_asesoria, estado, descripcion) 
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (codigo_asesoria, client_id, fecha_asesoria, asesoria_type, 'Pendiente', description))
                
            connection.commit()
            connection.close()
            
            flash('Asesoría creada exitosamente', 'success')
        else:
            flash('Error de conexión a la base de datos', 'error')
            
        return redirect(url_for('admin.asesorias_admin'))
        
    except Exception as e:
        print(f"Error al crear asesoría: {str(e)}")
        flash(f'Error al crear asesoría: {str(e)}', 'error')
        return redirect(url_for('admin.asesorias_admin'))

@admin_bp.route('/actualizar_estado_asesoria', methods=['POST'])
def actualizar_estado_asesoria():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    
    try:
        # Obtener datos del formulario
        appointment_id = request.form.get('appointment-id')
        new_status = request.form.get('status')
        notes = request.form.get('status-notes')
        
        # Validar datos
        if not appointment_id or not new_status:
            flash('El ID de la asesoría y el estado son obligatorios', 'error')
            return redirect(url_for('admin.asesorias_admin'))
        
        connection = create_connection()
        if connection:
            with connection.cursor() as cursor:
                # Actualizar estado de la asesoría
                cursor.execute("""
                    UPDATE tbl_asesoria 
                    SET estado = %s, 
                        descripcion = CONCAT(IFNULL(descripcion, ''), '\n\nNota: ', %s) 
                    WHERE codigo_asesoria = %s
                """, (new_status, notes, appointment_id))
                
            connection.commit()
            connection.close()
            
            flash('Estado de asesoría actualizado exitosamente', 'success')
        else:
            flash('Error de conexión a la base de datos', 'error')
            
        return redirect(url_for('admin.asesorias_admin'))
        
    except Exception as e:
        print(f"Error al actualizar estado: {str(e)}")
        flash(f'Error al actualizar estado: {str(e)}', 'error')
        return redirect(url_for('admin.asesorias_admin'))

@admin_bp.route('/obtener_asesoria/<string:codigo_asesoria>')
def obtener_asesoria(codigo_asesoria):
    if 'user_id' not in session or not session.get('is_admin', False):
        return jsonify({'error': 'No autorizado'}), 401
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT a.codigo_asesoria, a.fecha_asesoria, a.tipo_asesoria,
                       CONCAT(u.nombres, ' ', u.apellidos) AS solicitante,
                       u.correo, a.estado, a.descripcion
                FROM tbl_asesoria a
                JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                WHERE a.codigo_asesoria = %s
            """, (codigo_asesoria,))
            asesoria = cursor.fetchone()
        connection.close()
        
        if asesoria:
            # Formatear fecha para la respuesta JSON
            fecha = asesoria['fecha_asesoria']
            if isinstance(fecha, datetime.datetime):
                fecha_formateada = fecha.strftime('%d/%m/%Y %H:%M')
                asesoria['fecha_hora'] = fecha_formateada
            
            return jsonify(asesoria)
        
        return jsonify({'error': 'Asesoría no encontrada'}), 404
    
    return jsonify({'error': 'Error de conexión a la base de datos'}), 500