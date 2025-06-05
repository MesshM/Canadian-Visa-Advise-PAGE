from flask import Blueprint, render_template, redirect, url_for, flash, session, request, jsonify
from config.database import create_connection
import datetime

asesor_bp = Blueprint('asesor', __name__, url_prefix='/asesor')

@asesor_bp.route('/asesor')
def admin_index_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))

    try:
        # Renderizar la plantilla de administrador
        return render_template('asesor/index_asesor.html')
    except Exception as e:
        print(f"Error al renderizar la plantilla: {str(e)}")
        return f"Error: {str(e)}", 500

@asesor_bp.route('/asesor')
def index_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))
    return render_template('asesor/index_asesor.html')

@asesor_bp.route('/clientes')
def clientes_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
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
        return render_template('asesor/clientes_asesor.html', clientes=clientes)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('asesor.index_asesor'))

@asesor_bp.route('/asesorias')
def asesorias_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
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
            
            cursor.execute("""
                SELECT s.id_solicitante, u.nombres, u.apellidos
                FROM tbl_solicitante s
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                ORDER BY u.nombres, u.apellidos
            """)
            clientes = cursor.fetchall()
            
        connection.close()
        return render_template('asesor/asesorias_asesor.html', asesorias=asesorias, clientes=clientes)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('asesor.index_asesor'))

@asesor_bp.route('/documentos')
def documentos_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))
    
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
    return redirect(url_for('asesor.index_asesor'))

@asesor_bp.route('/documentos/<int:cliente_id>')
def documentos_cliente_asesor(cliente_id):
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
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
                return redirect(url_for('asesor.documentos_asesor'))
            
            cliente['codigo_expediente'] = f"EXP-{cliente_id}-{datetime.datetime.now().year}"
            
            cursor.execute("""
                SELECT d.id_documento, d.nombre_documento, d.tipo_documento, 
                       d.fecha_subida, d.ruta_archivo, d.estado AS estado_documento,
                       d.observaciones, d.nombre_archivo
                FROM tbl_documento d
                WHERE d.id_solicitante = %s
                ORDER BY d.fecha_subida DESC
            """, (cliente_id,))
            documentos = cursor.fetchall()
            
            for doc in documentos:
                if 'fecha_subida' in doc and doc['fecha_subida']:
                    if isinstance(doc['fecha_subida'], datetime.datetime):
                        doc['fecha_formateada'] = doc['fecha_subida'].strftime('%d/%m/%Y %H:%M')
                    else:
                        doc['fecha_formateada'] = str(doc['fecha_subida'])
                else:
                    doc['fecha_formateada'] = 'N/A'
                
                doc['icon_type'] = 'image' if doc.get('tipo_documento', '').lower() in ['jpg', 'jpeg', 'png', 'gif'] else 'document'
            
            cursor.execute("""
                SELECT s.id_solicitante, 
                       CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
                       u.correo
                FROM tbl_solicitante s
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                ORDER BY u.nombres, u.apellidos
            """)
            clientes_lista = cursor.fetchall()
            
            total_docs = len(documentos)
            aprobados = sum(1 for doc in documentos if doc.get('estado_documento') == 'Aprobado')
            
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
    return redirect(url_for('asesor.index_asesor'))

@asesor_bp.route('/actualizar_estado_documento', methods=['POST'])
def actualizar_estado_documento_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))
    
    try:
        documento_id = request.form.get('id_documento')
        cliente_id = request.form.get('id_solicitante')
        nuevo_estado = request.form.get('estado')
        observaciones = request.form.get('observaciones')
        
        if not documento_id or not nuevo_estado or not cliente_id:
            flash('Datos incompletos para actualizar el estado', 'error')
            return redirect(url_for('asesor.documentos_cliente_asesor', cliente_id=cliente_id))
        
        connection = create_connection()
        if connection:
            with connection.cursor() as cursor:
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
            
        return redirect(url_for('asesor.documentos_cliente_asesor', cliente_id=cliente_id))
        
    except Exception as e:
        print(f"Error al actualizar estado del documento: {str(e)}")
        flash(f'Error al actualizar estado: {str(e)}', 'error')
        return redirect(url_for('asesor.documentos_asesor'))

@asesor_bp.route('/pagos')
def pagos_asesor():
    pagos = []
    stats = {
        'total_recibido': 0,
        'pagos_pendientes': 0,
        'pagos_completados': 0,
        'pagos_rechazados': 0
    }
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        query = """
        SELECT p.*, s.nombre_completo, s.email
        FROM pagos p
        JOIN solicitantes s ON p.id_solicitante = s.id_solicitante
        ORDER BY p.fecha_pago DESC
        """
        cursor.execute(query)
        pagos_raw = cursor.fetchall()
        
        for pago in pagos_raw:
            if pago['estado_pago'] == 'Completado':
                stats['pagos_completados'] += 1
                stats['total_recibido'] += float(pago['monto'])
            elif pago['estado_pago'] == 'Pendiente':
                stats['pagos_pendientes'] += 1
            elif pago['estado_pago'] == 'Rechazado':
                stats['pagos_rechazados'] += 1
            
            fecha = pago['fecha_pago']
            fecha_formateada = fecha.strftime('%d/%m/%Y') if fecha else 'N/A'
            nombre_completo = pago['nombre_completo']
            initials = ''.join([name[0].upper() for name in nombre_completo.split() if name])[:2]
            avatar_classes = [
                'bg-red-100 text-red-600',
                'bg-blue-100 text-blue-600',
                'bg-green-100 text-green-600',
                'bg-yellow-100 text-yellow-600',
                'bg-purple-100 text-purple-600'
            ]
            avatar_class = avatar_classes[hash(nombre_completo) % len(avatar_classes)]
            id_formateado = f"PAG-{pago['id_pago']:04d}"
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
    
    return render_template('asesor/pagos_asesor.html', pagos=pagos, stats=stats)

@asesor_bp.route('/solicitudes')
def solicitudes_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
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
        return render_template('asesor/solicitudes_asesor.html', solicitudes=solicitudes)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('asesor.index_asesor'))

@asesor_bp.route('/dashboard')
def dashboard_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))
    try:
        return render_template('asesor/index_asesor.html')
    except Exception as e:
        print(f"Error al renderizar la plantilla: {str(e)}")
        return redirect(url_for('asesor.asesorias_asesor'))

@asesor_bp.route('/reportes')
def reportes_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))

    desde = request.args.get('desde', None)
    hasta = request.args.get('hasta', None)

    if not desde or not hasta:
        today = datetime.datetime.now()
        first_day = (today.replace(day=1) - datetime.timedelta(days=1)).replace(day=1)
        last_day = today
        desde = first_day.strftime('%Y-%m-%d')
        hasta = last_day.strftime('%Y-%m-%d')

    desde_sql = desde + " 00:00:00"
    hasta_sql = hasta + " 23:59:59"

    estadisticas = {
        'total_clientes': 0,
        'incremento_clientes': 0,
        'total_asesorias': 0,
        'incremento_asesorias': 0,
        'asesorias_pagadas': 0,
        'incremento_pagadas': 0,
        'ingresos_totales': 0,
        'incremento_ingresos': 0,
        'asesorias_trabajo': 0,
        'asesorias_estudio': 0,
        'asesorias_residencia': 0,
        'asesorias_ciudadania': 0,
        'asesorias_otros': 0,
        'asesorias_por_mes': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    }
    asesorias_recientes = []
    top_clientes = []
    
    try:
        connection = create_connection()
        if connection:
            with connection.cursor(dictionary=True) as cursor:
                try:
                    cursor.execute("SELECT COUNT(*) as total FROM tbl_solicitante")
                    result = cursor.fetchone()
                    estadisticas['total_clientes'] = result['total'] if result and 'total' in result else 0
                    
                    cursor.execute("""
                        SELECT COUNT(*) as total FROM tbl_solicitante 
                        WHERE id_solicitante IN (
                            SELECT DISTINCT s.id_solicitante FROM tbl_usuario u
                            JOIN tbl_solicitante s ON u.id_usuario = s.id_usuario
                            WHERE u.fecha_nacimiento >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
                        )
                    """)
                    result = cursor.fetchone()
                    new_clients = result['total'] if result and 'total' in result else 0
                    if estadisticas['total_clientes'] > 0:
                        estadisticas['incremento_clientes'] = round((new_clients / estadisticas['total_clientes']) * 100)
                    else:
                        estadisticas['incremento_clientes'] = 0
                    
                    try:
                        cursor.execute("""
                            SELECT COUNT(*) as total FROM tbl_asesoria
                            WHERE fecha_asesoria BETWEEN %s AND %s
                        """, (desde_sql, hasta_sql))
                        result = cursor.fetchone()
                        estadisticas['total_asesorias'] = result['total'] if result and 'total' in result else 0
                    except Exception as e:
                        print(f"Error al obtener total de asesorías: {str(e)}")
                    
                    try:
                        previous_month_start = (datetime.datetime.strptime(desde, '%Y-%m-%d') - datetime.timedelta(days=30)).strftime('%Y-%m-%d')
                        previous_month_end = (datetime.datetime.strptime(desde, '%Y-%m-%d') - datetime.timedelta(days=1)).strftime('%Y-%m-%d')
                        
                        cursor.execute("""
                            SELECT COUNT(*) as total FROM tbl_asesoria
                            WHERE fecha_asesoria BETWEEN %s AND %s
                        """, (previous_month_start + " 00:00:00", previous_month_end + " 23:59:59"))
                        result = cursor.fetchone()
                        prev_appointments = result['total'] if result and 'total' in result else 0
                        
                        if prev_appointments > 0:
                            estadisticas['incremento_asesorias'] = round(((estadisticas['total_asesorias'] - prev_appointments) / prev_appointments) * 100)
                        else:
                            estadisticas['incremento_asesorias'] = 100 if estadisticas['total_asesorias'] > 0 else 0
                    except Exception as e:
                        print(f"Error al calcular incremento de asesorías: {str(e)}")
                    
                    try:
                        cursor.execute("""
                            SELECT COUNT(*) as total FROM tbl_asesoria
                            WHERE estado = 'Pagada' AND fecha_asesoria BETWEEN %s AND %s
                        """, (desde_sql, hasta_sql))
                        result = cursor.fetchone()
                        estadisticas['asesorias_pagadas'] = result['total'] if result and 'total' in result else 0
                    except Exception as e:
                        print(f"Error al obtener asesorías pagadas: {str(e)}")
                    
                    try:
                        cursor.execute("""
                            SELECT COUNT(*) as total FROM tbl_asesoria
                            WHERE estado = 'Pagada' AND fecha_asesoria BETWEEN %s AND %s
                        """, (previous_month_start + " 00:00:00", previous_month_end + " 23:59:59"))
                        result = cursor.fetchone()
                        prev_paid = result['total'] if result and 'total' in result else 0
                        
                        if prev_paid > 0:
                            estadisticas['incremento_pagadas'] = round(((estadisticas['asesorias_pagadas'] - prev_paid) / prev_paid) * 100)
                        else:
                            estadisticas['incremento_pagadas'] = 100 if estadisticas['asesorias_pagadas'] > 0 else 0
                    except Exception as e:
                        print(f"Error al calcular incremento de asesorías pagadas: {str(e)}")
                    
                    try:
                        cursor.execute("""
                            SELECT SUM(p.monto) as total FROM tbl_pago_asesoria p
                            JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
                            WHERE p.estado_pago = 'Completado' AND a.fecha_asesoria BETWEEN %s AND %s
                        """, (desde_sql, hasta_sql))
                        result = cursor.fetchone()
                        estadisticas['ingresos_totales'] = result['total'] if result and result['total'] else 0
                    except Exception as e:
                        print(f"Error al obtener ingresos totales: {str(e)}")
                    
                    try:
                        cursor.execute("""
                            SELECT SUM(p.monto) as total FROM tbl_pago_asesoria p
                            JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
                            WHERE p.estado_pago = 'Completado' AND a.fecha_asesoria BETWEEN %s AND %s
                        """, (previous_month_start + " 00:00:00", previous_month_end + " 23:59:59"))
                        result = cursor.fetchone()
                        prev_income = result['total'] if result and result['total'] else 0
                        
                        if prev_income > 0:
                            estadisticas['incremento_ingresos'] = round(((estadisticas['ingresos_totales'] - prev_income) / prev_income) * 100)
                        else:
                            estadisticas['incremento_ingresos'] = 100 if estadisticas['ingresos_totales'] > 0 else 0
                    except Exception as e:
                        print(f"Error al calcular incremento de ingresos: {str(e)}")
                    
                    try:
                        cursor.execute("""
                            SELECT COUNT(*) as total FROM tbl_asesoria 
                            WHERE tipo_asesoria = 'Visa de Trabajo' AND fecha_asesoria BETWEEN %s AND %s
                        """, (desde_sql, hasta_sql))
                        result = cursor.fetchone()
                        estadisticas['asesorias_trabajo'] = result['total'] if result and 'total' in result else 0
                        
                        cursor.execute("""
                            SELECT COUNT(*) as total FROM tbl_asesoria 
                            WHERE tipo_asesoria = 'Visa de Estudio' AND fecha_asesoria BETWEEN %s AND %s
                        """, (desde_sql, hasta_sql))
                        result = cursor.fetchone()
                        estadisticas['asesorias_estudio'] = result['total'] if result and 'total' in result else 0
                        
                        cursor.execute("""
                            SELECT COUNT(*) as total FROM tbl_asesoria 
                            WHERE tipo_asesoria = 'Residencia Permanente' AND fecha_asesoria BETWEEN %s AND %s
                        """, (desde_sql, hasta_sql))
                        result = cursor.fetchone()
                        estadisticas['asesorias_residencia'] = result['total'] if result and 'total' in result else 0
                        
                        cursor.execute("""
                            SELECT COUNT(*) as total FROM tbl_asesoria 
                            WHERE tipo_asesoria = 'Ciudadanía' AND fecha_asesoria BETWEEN %s AND %s
                        """, (desde_sql, hasta_sql))
                        result = cursor.fetchone()
                        estadisticas['asesorias_ciudadania'] = result['total'] if result and 'total' in result else 0
                        
                        cursor.execute("""
                            SELECT COUNT(*) as total FROM tbl_asesoria 
                            WHERE tipo_asesoria NOT IN ('Visa de Trabajo', 'Visa de Estudio', 'Residencia Permanente', 'Ciudadanía')
                            AND fecha_asesoria BETWEEN %s AND %s
                        """, (desde_sql, hasta_sql))
                        result = cursor.fetchone()
                        estadisticas['asesorias_otros'] = result['total'] if result and 'total' in result else 0
                    except Exception as e:
                        print(f"Error al obtener asesorías por tipo: {str(e)}")
                    
                    try:
                        current_year = datetime.datetime.now().year;
                        
                        cursor.execute("""
                            SELECT MONTH(fecha_asesoria) as mes, COUNT(*) as total 
                            FROM tbl_asesoria 
                            WHERE YEAR(fecha_asesoria) = %s 
                            GROUP BY MONTH(fecha_asesoria)
                        """, (current_year,))
                        
                        for row in cursor.fetchall():
                            if row and 'mes' in row and 'total' in row and row['mes'] and 1 <= row['mes'] <= 12:
                                estadisticas['asesorias_por_mes'][row['mes'] - 1] = row['total']
                    except Exception as e:
                        print(f"Error al obtener asesorías por mes: {str(e)}")
                    
                    try:
                        cursor.execute("""
                            SELECT a.codigo_asesoria, a.fecha_asesoria, a.tipo_asesoria,
                                CONCAT(u.nombres, ' ', u.apellidos) AS solicitante,
                                u.correo, a.estado, a.asesor_asignado
                            FROM tbl_asesoria a
                            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
                            JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                            ORDER BY a.fecha_asesoria DESC
                            LIMIT 10
                        """)
                        asesorias_recientes = cursor.fetchall() or []
                        
                        for asesoria in asesorias_recientes:
                            if asesoria and 'fecha_asesoria' in asesoria and asesoria['fecha_asesoria']:
                                if isinstance(asesoria['fecha_asesoria'], datetime.datetime):
                                    asesoria['fecha_asesoria'] = asesoria['fecha_asesoria'].strftime('%d/%m/%Y %H:%M')
                    except Exception as e:
                        print(f"Error al obtener asesorías recientes: {str(e)}")
                        asesorias_recientes = []
                        
                except Exception as e:
                    print(f"Error en consultas de reportes: {str(e)}")
                    flash(f"Error al procesar datos: {str(e)}", "error")
            
            connection.close()
    except Exception as e:
        print(f"Error de conexión a la base de datos: {str(e)}")
        flash("Error de conexión a la base de datos", "error")
    
    return render_template('asesor/reportes_asesor.html', 
                          estadisticas=estadisticas, 
                          asesorias_recientes=asesorias_recientes,
                          top_clientes=top_clientes)

@asesor_bp.route('/crear_asesoria', methods=['POST'])
def crear_asesoria_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))
    
    try:
        client_id = request.form.get('client')
        asesoria_type = request.form.get('type')
        date = request.form.get('date')
        time = request.form.get('time')
        description = request.form.get('description')
        
        if not client_id or not asesoria_type or not date or not time:
            flash('Todos los campos son obligatorios', 'error')
            return redirect(url_for('asesor.asesorias_asesor'))
        
        fecha_asesoria = f"{date} {time}"
        codigo_asesoria = f"ASE-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        connection = create_connection()
        if connection:
            with connection.cursor() as cursor:
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
            
        return redirect(url_for('asesor.asesorias_asesor'))
        
    except Exception as e:
        print(f"Error al crear asesoría: {str(e)}")
        flash(f'Error al crear asesoría: {str(e)}', 'error')
        return redirect(url_for('asesor.asesorias_asesor'))

@asesor_bp.route('/actualizar_estado_asesoria', methods=['POST'])
def actualizar_estado_asesoria_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))
    
    try:
        appointment_id = request.form.get('appointment-id')
        new_status = request.form.get('status')
        notes = request.form.get('status-notes')
        
        if not appointment_id or not new_status:
            flash('El ID de la asesoría y el estado son obligatorios', 'error')
            return redirect(url_for('asesor.asesorias_asesor'))
        
        connection = create_connection()
        if connection:
            with connection.cursor() as cursor:
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
            
        return redirect(url_for('asesor.asesorias_asesor'))
        
    except Exception as e:
        print(f"Error al actualizar estado: {str(e)}")
        flash(f'Error al actualizar estado: {str(e)}', 'error')
        return redirect(url_for('asesor.asesorias_asesor'))

@asesor_bp.route('/obtener_asesoria/<string:codigo_asesoria>')
def obtener_asesoria_asesor(codigo_asesoria):
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
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
            fecha = asesoria['fecha_asesoria']
            if isinstance(fecha, datetime.datetime):
                fecha_formateada = fecha.strftime('%d/%m/%Y %H:%M')
                asesoria['fecha_hora'] = fecha_formateada
            
            return jsonify(asesoria)
        
        return jsonify({'error': 'Asesoría no encontrada'}), 404
    
    return jsonify({'error': 'Error de conexión a la base de datos'}), 500

@asesor_bp.route('/obtener_cliente/<int:cliente_id>')
def obtener_cliente_asesor(cliente_id):
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return jsonify({'error': 'No autorizado'}), 401
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT s.id_solicitante, u.nombres, u.apellidos, u.correo, u.fecha_nacimiento,
                       'activo' AS estado, 
                       CONCAT('CLI-', s.id_solicitante) AS id_formateado,
                       'Colombia' AS pais,
                       'Visa de Trabajo' AS tipo_visa,
                       NULL AS telefono,
                       NULL AS direccion,
                       NULL AS datos_adicionales
                FROM tbl_solicitante s
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                WHERE s.id_solicitante = %s
            """, (cliente_id,))
            cliente = cursor.fetchone()
            
            if not cliente:
                return jsonify({'error': 'Cliente no encontrado'}), 404
            
            if cliente['fecha_nacimiento']:
                if isinstance(cliente['fecha_nacimiento'], datetime.date):
                    cliente['fecha_nacimiento_formateada'] = cliente['fecha_nacimiento'].strftime('%d/%m/%Y')
                else:
                    cliente['fecha_nacimiento_formateada'] = str(cliente['fecha_nacimiento'])
            else:
                cliente['fecha_nacimiento_formateada'] = 'No disponible'
            
            cliente['fecha_registro_formateada'] = datetime.datetime.now().strftime('%d/%m/%Y')
            
            cursor.execute("""
                SELECT codigo_asesoria, tipo_asesoria, fecha_asesoria, estado
                FROM tbl_asesoria
                WHERE id_solicitante = %s
                ORDER BY fecha_asesoria DESC
            """, (cliente_id,))
            asesorias = cursor.fetchall()
            
            for asesoria in asesorias:
                if 'fecha_asesoria' in asesoria and asesoria['fecha_asesoria']:
                    if isinstance(asesoria['fecha_asesoria'], datetime.datetime):
                        asesoria['fecha_inicio_formateada'] = asesoria['fecha_asesoria'].strftime('%d/%m/%Y %H:%M')
                    else:
                        asesoria['fecha_inicio_formateada'] = str(asesoria['fecha_asesoria'])
                else:
                    asesoria['fecha_inicio_formateada'] = 'N/A'
            
            cliente['asesorias'] = asesorias
            
        connection.close()
        return jsonify(cliente)
    
    return jsonify({'error': 'Error de conexión a la base de datos'}), 500

@asesor_bp.route('/crear_cliente', methods=['POST'])
def crear_cliente_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))
    
    try:
        connection = create_connection()
        if connection:
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO tbl_usuario 
                    (nombres, apellidos, correo, contrasena, fecha_nacimiento) 
                    VALUES (%s, %s, %s, %s, %s)
                """, ('Nuevo', 'Cliente', f'cliente{datetime.datetime.now().strftime("%Y%m%d%H%M%S")}@example.com', 
                      'password_temporal', datetime.datetime.now().date()))
                
                user_id = cursor.lastrowid
                
                cursor.execute("""
                    INSERT INTO tbl_solicitante 
                    (id_usuario) 
                    VALUES (%s)
                """, (user_id,))
                
                client_id = cursor.lastrowid
                
                cursor.execute("""
                    INSERT INTO tbl_log_solicitante 
                    (log_msg) 
                    VALUES (%s)
                """, (f'Nuevo solicitante añadido: Nuevo Cliente',))
                
            connection.commit()
            connection.close()
            
            flash('Cliente creado exitosamente. Por favor actualice sus datos.', 'success')
        else:
            flash('Error de conexión a la base de datos', 'error')
            
        return redirect(url_for('asesor.clientes_asesor'))
        
    except Exception as e:
        print(f"Error al crear cliente: {str(e)}")
        flash(f'Error al crear cliente: {str(e)}', 'error')
        return redirect(url_for('asesor.clientes_asesor'))
