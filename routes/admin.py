from flask import Blueprint, render_template, redirect, url_for, flash, session, request, jsonify
from config.database import create_connection
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import os
from werkzeug.utils import secure_filename

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

@admin_bp.route('/')
def index():
    """Ruta principal de administración - funciona para ambos admin y asesor"""
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    # Verificar si es administrador o asesor
    user_role = session.get('user_role', '')
    
    if user_role == 'Administrador':
        return admin_dashboard()
    elif user_role == 'Asesor':
        return asesor_dashboard()
    else:
        flash('No tienes permisos para acceder a esta área', 'error')
        return redirect(url_for('auth.login'))

def admin_dashboard():
    """Dashboard específico para administradores"""
    try:
        # Initialize statistics
        estadisticas = {
            'total_clientes': 0,
            'asesorias_pendientes': 0,
            'documentos_pendientes': 0,
            'pagos_recientes': 0
        }
        
        connection = create_connection()
        if connection:
            with connection.cursor(dictionary=True) as cursor:
                # Total clients
                cursor.execute("SELECT COUNT(*) as total FROM tbl_solicitante")
                result = cursor.fetchone()
                estadisticas['total_clientes'] = result['total'] if result and 'total' in result else 0
                
                # Pending appointments
                cursor.execute("""
                    SELECT COUNT(*) as total FROM tbl_asesoria
                    WHERE estado = 'Pendiente'
                """)
                result = cursor.fetchone()
                estadisticas['asesorias_pendientes'] = result['total'] if result and 'total' in result else 0
                
                # Pending documents
                cursor.execute("""
                    SELECT COUNT(*) as total FROM tbl_documento
                    WHERE estado = 'Pendiente'
                """)
                result = cursor.fetchone()
                estadisticas['documentos_pendientes'] = result['total'] if result and 'total' in result else 0
                
                # Recent payments
                cursor.execute("""
                    SELECT COUNT(*) as total FROM tbl_pago_asesoria
                    WHERE fecha_pago >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                """)
                result = cursor.fetchone()
                estadisticas['pagos_recientes'] = result['total'] if result and 'total' in result else 0
            
            # Recent activities (example data)
            actividades_recientes = [
                {
                    'mensaje': 'Nuevo cliente registrado: Juan Pérez',
                    'fecha': '19/05/2025 14:30',
                    'color': 'blue',
                    'icono': 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
                },
                {
                    'mensaje': 'Asesoría completada con María González',
                    'fecha': '19/05/2025 12:15',
                    'color': 'green',
                    'icono': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                },
                {
                    'mensaje': 'Nuevo pago recibido: $250.00',
                    'fecha': '19/05/2025 10:45',
                    'color': 'red',
                    'icono': 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                },
                {
                    'mensaje': 'Documento aprobado para Carlos Ramírez',
                    'fecha': '18/05/2025 16:20',
                    'color': 'purple',
                    'icono': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                },
                {
                    'mensaje': 'Nueva asesoría programada',
                    'fecha': '18/05/2025 11:05',
                    'color': 'yellow',
                    'icono': 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                }
            ]
            
            connection.close()
            
            return render_template('admin/index.html', 
                                  estadisticas=estadisticas,
                                  actividades_recientes=actividades_recientes)
    except Exception as e:
        print(f"Error en admin dashboard: {str(e)}")
        flash(f"Error al cargar el panel de administración: {str(e)}", "error")
        return redirect(url_for('auth.login'))

def asesor_dashboard():
    """Dashboard específico para asesores"""
    try:
        return render_template('asesor/index_asesor.html')
    except Exception as e:
        print(f"Error en asesor dashboard: {str(e)}")
        flash(f"Error al cargar el panel de asesor: {str(e)}", "error")
        return redirect(url_for('auth.login'))

@admin_bp.route('/index_admin')
def index_admin():
    """Ruta específica para administradores - redirige a la principal"""
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        return redirect(url_for('auth.login'))
    
    return redirect(url_for('admin.index'))

@admin_bp.route('/index_asesor')
def index_asesor():
    """Ruta específica para asesores - redirige a la principal"""
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))
    
    return redirect(url_for('admin.index'))

@admin_bp.route('/usuarios')
def usuarios():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        flash('No tienes permisos para acceder a esta sección', 'error')
        return redirect(url_for('admin.index'))
    
    # Pagination parameters
    pagina_actual = request.args.get('pagina', 1, type=int)
    items_por_pagina = 10
    offset = (pagina_actual - 1) * items_por_pagina
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            # Count total users
            cursor.execute("SELECT COUNT(*) as total FROM tbl_usuario")
            result = cursor.fetchone()
            total_usuarios = result['total'] if result else 0
            
            # Calculate total pages
            total_paginas = (total_usuarios + items_por_pagina - 1) // items_por_pagina
            
            # Get users with pagination
            cursor.execute("""
                SELECT u.id_usuario, u.nombres, u.apellidos, u.correo, u.fecha_nacimiento,
                       CASE 
                           WHEN a.id_asesor IS NOT NULL THEN 'Asesor'
                           WHEN adm.id_administrador IS NOT NULL THEN 'Administrador'
                           ELSE 'Cliente'
                       END as tipo,
                       CASE 
                           WHEN a.id_asesor IS NOT NULL THEN a.especialidad
                           ELSE NULL
                       END as especialidad,
                       TRUE as activo
                FROM tbl_usuario u
                LEFT JOIN tbl_asesor a ON u.id_usuario = a.id_usuario
                LEFT JOIN tbl_administrador adm ON u.id_usuario = adm.id_usuario
                ORDER BY u.id_usuario DESC
                LIMIT %s OFFSET %s
            """, (items_por_pagina, offset))
            
            usuarios = cursor.fetchall()
            
            # Format dates
            for usuario in usuarios:
                if 'fecha_nacimiento' in usuario and usuario['fecha_nacimiento']:
                    if isinstance(usuario['fecha_nacimiento'], datetime.date):
                        usuario['fecha_nacimiento'] = usuario['fecha_nacimiento'].strftime('%d/%m/%Y')
        
        connection.close()
        
        return render_template('admin/usuarios.html', 
                              usuarios=usuarios,
                              pagina_actual=pagina_actual,
                              total_paginas=total_paginas,
                              total_usuarios=total_usuarios)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('admin.index'))

@admin_bp.route('/clientes')
def clientes():
    """Ruta para gestión de clientes - disponible para admin y asesor"""
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    user_role = session.get('user_role', '')
    
    if user_role == 'Administrador':
        # Redirigir a usuarios para administradores
        return redirect(url_for('admin.usuarios'))
    elif user_role == 'Asesor':
        # Mostrar clientes para asesores
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
        return redirect(url_for('admin.index'))
    else:
        flash('No tienes permisos para acceder a esta sección', 'error')
        return redirect(url_for('auth.login'))

@admin_bp.route('/asignacion_clientes')
def asignacion_clientes():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        flash('No tienes permisos para acceder a esta sección', 'error')
        return redirect(url_for('admin.index'))
    
    # Pagination parameters
    pagina_actual = request.args.get('pagina', 1, type=int)
    items_por_pagina = 10
    offset = (pagina_actual - 1) * items_por_pagina
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            # Count total clients
            cursor.execute("SELECT COUNT(*) as total FROM tbl_solicitante")
            result = cursor.fetchone()
            total_clientes = result['total'] if result else 0
            
            # Calculate total pages
            total_paginas = (total_clientes + items_por_pagina - 1) // items_por_pagina
            
            # Get clients with pagination
            cursor.execute("""
                SELECT s.id_solicitante, u.nombres, u.apellidos, u.correo, u.telefono,
                       s.id_asesor, a.nombre as asesor_nombre, a.apellidos as asesor_apellidos,
                       DATE_FORMAT(s.fecha_registro, '%d/%m/%Y') as fecha_registro
                FROM tbl_solicitante s
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                LEFT JOIN tbl_asesor a ON s.id_asesor = a.id_asesor
                ORDER BY s.id_solicitante DESC
                LIMIT %s OFFSET %s
            """, (items_por_pagina, offset))
            
            clientes = cursor.fetchall()
            
            # Get all advisors for assignment
            cursor.execute("""
                SELECT id_asesor, nombre, apellidos, especialidad
                FROM tbl_asesor
                WHERE activo = TRUE
                ORDER BY nombre, apellidos
            """)
            
            asesores = cursor.fetchall()
        
        connection.close()
        
        return render_template('admin/asignacion_clientes.html', 
                              clientes=clientes,
                              asesores=asesores,
                              pagina_actual=pagina_actual,
                              total_paginas=total_paginas,
                              total_clientes=total_clientes)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('admin.index'))

@admin_bp.route('/asignar_asesor', methods=['POST'])
def asignar_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        return redirect(url_for('auth.login'))
    
    try:
        client_id = request.form.get('client_id')
        advisor_id = request.form.get('advisor_id')
        notes = request.form.get('notes', '')
        
        if not client_id:
            flash('ID de cliente no proporcionado', 'error')
            return redirect(url_for('admin.asignacion_clientes'))
        
        connection = create_connection()
        if connection:
            cursor = connection.cursor()
            
            # If advisor_id is 0, remove assignment
            if advisor_id == '0':
                cursor.execute("""
                    UPDATE tbl_solicitante 
                    SET id_asesor = NULL, notas_asignacion = %s, fecha_asignacion = NULL
                    WHERE id_solicitante = %s
                """, (notes, client_id))
                
                flash('Asignación de asesor removida exitosamente', 'success')
            else:
                # Assign advisor
                cursor.execute("""
                    UPDATE tbl_solicitante 
                    SET id_asesor = %s, notas_asignacion = %s, fecha_asignacion = NOW()
                    WHERE id_solicitante = %s
                """, (advisor_id, notes, client_id))
                
                flash('Cliente asignado exitosamente', 'success')
            
            connection.commit()
            cursor.close()
            connection.close()
            
            return redirect(url_for('admin.asignacion_clientes'))
        else:
            flash('Error de conexión a la base de datos', 'error')
            return redirect(url_for('admin.asignacion_clientes'))
    except Exception as e:
        flash(f'Error al asignar asesor: {str(e)}', 'error')
        return redirect(url_for('admin.asignacion_clientes'))

@admin_bp.route('/asesores')
def asesores():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        flash('No tienes permisos para acceder a esta sección', 'error')
        return redirect(url_for('admin.index'))
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT a.id_asesor, a.nombre, a.apellidos, a.correo, a.especialidad,
                       COUNT(DISTINCT as2.codigo_asesoria) as total_asesorias,
                       COUNT(DISTINCT CASE WHEN as2.estado = 'Completada' THEN as2.codigo_asesoria END) as asesorias_completadas
                FROM tbl_asesor a
                LEFT JOIN tbl_asesoria as2 ON a.id_asesor = as2.id_asesor
                GROUP BY a.id_asesor
                ORDER BY a.id_asesor DESC
            """)
            asesores = cursor.fetchall()
        
        connection.close()
        
        return render_template('admin/asesores.html', asesores=asesores)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('admin.index'))

@admin_bp.route('/asesorias_admin')
def asesorias_admin():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        return redirect(url_for('auth.login'))
    
    # Pagination parameters
    pagina_actual = request.args.get('pagina', 1, type=int)
    items_por_pagina = 10
    offset = (pagina_actual - 1) * items_por_pagina
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            # Count total appointments
            cursor.execute("SELECT COUNT(*) as total FROM tbl_asesoria")
            result = cursor.fetchone()
            total_asesorias = result['total'] if result else 0
            
            # Calculate total pages
            total_paginas = (total_asesorias + items_por_pagina - 1) // items_por_pagina
            
            # Get appointments with pagination
            cursor.execute("""
                SELECT a.codigo_asesoria, a.tipo_asesoria, a.fecha_asesoria, a.estado,
                       CONCAT(u.nombres, ' ', u.apellidos) as solicitante,
                       CONCAT(as2.nombre, ' ', as2.apellidos) as asesor
                FROM tbl_asesoria a
                JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                LEFT JOIN tbl_asesor as2 ON a.id_asesor = as2.id_asesor
                ORDER BY a.fecha_asesoria DESC
                LIMIT %s OFFSET %s
            """, (items_por_pagina, offset))
            
            asesorias = cursor.fetchall()
            
            # Format dates
            for asesoria in asesorias:
                if 'fecha_asesoria' in asesoria and asesoria['fecha_asesoria']:
                    if isinstance(asesoria['fecha_asesoria'], datetime.datetime):
                        asesoria['fecha_asesoria'] = asesoria['fecha_asesoria'].strftime('%d/%m/%Y %H:%M')
        
        connection.close()
        
        return render_template('admin/asesorias_admin.html', 
                              asesorias=asesorias,
                              pagina_actual=pagina_actual,
                              total_paginas=total_paginas,
                              total_asesorias=total_asesorias)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('admin.index'))

@admin_bp.route('/documentos')
def documentos():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        flash('No tienes permisos para acceder a esta sección', 'error')
        return redirect(url_for('admin.index'))
    
    # Pagination parameters
    pagina_actual = request.args.get('pagina', 1, type=int)
    items_por_pagina = 10
    offset = (pagina_actual - 1) * items_por_pagina
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            # Count total documents
            cursor.execute("SELECT COUNT(*) as total FROM tbl_documento")
            result = cursor.fetchone()
            total_documentos = result['total'] if result else 0
            
            # Calculate total pages
            total_paginas = (total_documentos + items_por_pagina - 1) // items_por_pagina
            
            # Get documents with pagination
            cursor.execute("""
                SELECT d.id_documento, d.nombre, d.tipo, d.fecha_subida, d.estado,
                       CONCAT(u.nombres, ' ', u.apellidos) as solicitante,
                       d.ruta_archivo
                FROM tbl_documento d
                JOIN tbl_solicitante s ON d.id_solicitante = s.id_solicitante
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                ORDER BY d.fecha_subida DESC
                LIMIT %s OFFSET %s
            """, (items_por_pagina, offset))
            
            documentos = cursor.fetchall()
            
            # Format dates
            for documento in documentos:
                if 'fecha_subida' in documento and documento['fecha_subida']:
                    if isinstance(documento['fecha_subida'], datetime.datetime):
                        documento['fecha_subida'] = documento['fecha_subida'].strftime('%d/%m/%Y %H:%M')
        
        connection.close()
        
        return render_template('admin/documentos.html', 
                              documentos=documentos,
                              pagina_actual=pagina_actual,
                              total_paginas=total_paginas,
                              total_documentos=total_documentos)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('admin.index'))

@admin_bp.route('/pagos_admin')
def pagos_admin():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        return redirect(url_for('auth.login'))
    
    # Pagination parameters
    pagina_actual = request.args.get('pagina', 1, type=int)
    items_por_pagina = 10
    offset = (pagina_actual - 1) * items_por_pagina
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            # Count total payments
            cursor.execute("SELECT COUNT(*) as total FROM tbl_pago_asesoria")
            result = cursor.fetchone()
            total_pagos = result['total'] if result else 0
            
            # Calculate total pages
            total_paginas = (total_pagos + items_por_pagina - 1) // items_por_pagina
            
            # Get payments with pagination
            cursor.execute("""
                SELECT p.id_pago, p.codigo_asesoria, p.monto, p.metodo_pago, p.fecha_pago, p.estado_pago,
                       CONCAT(u.nombres, ' ', u.apellidos) as solicitante,
                       a.tipo_asesoria
                FROM tbl_pago_asesoria p
                JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
                JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                ORDER BY p.fecha_pago DESC
                LIMIT %s OFFSET %s
            """, (items_por_pagina, offset))
            
            pagos = cursor.fetchall()
            
            # Format dates
            for pago in pagos:
                if 'fecha_pago' in pago and pago['fecha_pago']:
                    if isinstance(pago['fecha_pago'], datetime.datetime):
                        pago['fecha_pago'] = pago['fecha_pago'].strftime('%d/%m/%Y %H:%M')
        
        connection.close()
        
        return render_template('admin/pagos_admin.html', 
                              pagos=pagos,
                              pagina_actual=pagina_actual,
                              total_paginas=total_paginas,
                              total_pagos=total_pagos)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('admin.index'))

@admin_bp.route('/reportes')
def reportes():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        flash('No tienes permisos para acceder a esta sección', 'error')
        return redirect(url_for('admin.index'))
    
    return render_template('admin/reportes.html')

@admin_bp.route('/configuracion')
def configuracion():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        flash('No tienes permisos para acceder a esta sección', 'error')
        return redirect(url_for('admin.index'))
    
    # Example configuration data
    config = {
        'site_name': 'Canadian Visa Advise',
        'site_url': 'https://canadianvisaadvise.com',
        'admin_email': 'admin@canadianvisaadvise.com',
        'timezone': 'America/Toronto',
        'maintenance_mode': False,
        'company_name': 'Canadian Visa Advise Inc.',
        'company_phone': '+1 (123) 456-7890',
        'company_email': 'info@canadianvisaadvise.com',
        'company_address': '123 Visa Street, Toronto, ON, Canada',
        'company_logo': '/static/img/logo-canadian-visa-advise.jpg',
        'company_description': 'Canadian Visa Advise es una empresa dedicada a brindar asesoría profesional para trámites migratorios a Canadá.',
        'notify_new_client': True,
        'notify_new_appointment': True,
        'notify_new_document': True,
        'notify_new_payment': True,
        'notify_appointment_reminder': True,
        'reminder_hours': 24,
        'notification_email': 'notificaciones@canadianvisaadvise.com',
        'terms_content': 'Términos y condiciones de Canadian Visa Advise...',
        'privacy_content': 'Política de privacidad de Canadian Visa Advise...',
        'last_updated': datetime.datetime.now().strftime('%Y-%m-%d')
    }
    
    # Example backup data
    backups = [
        {
            'name': 'backup_20250519_143022.zip',
            'date': '19/05/2025 14:30',
            'size': '24.5 MB'
        },
        {
            'name': 'backup_20250510_093512.zip',
            'date': '10/05/2025 09:35',
            'size': '23.8 MB'
        },
        {
            'name': 'backup_20250501_120045.zip',
            'date': '01/05/2025 12:00',
            'size': '22.1 MB'
        }
    ]
    
    return render_template('admin/configuracion.html', config=config, backups=backups)

@admin_bp.route('/crear_cliente', methods=['POST'])
def crear_cliente():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        return redirect(url_for('auth.login'))
    
    try:
        nombres = request.form.get('nombres')
        apellidos = request.form.get('apellidos')
        correo = request.form.get('correo')
        fecha_nacimiento = request.form.get('fecha_nacimiento')
        contrasena = request.form.get('contrasena')
        
        if not nombres or not apellidos or not correo or not fecha_nacimiento or not contrasena:
            flash('Todos los campos son obligatorios', 'error')
            return redirect(url_for('admin.usuarios'))
        
        # Verify if email already exists
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            cursor.execute("SELECT * FROM tbl_usuario WHERE correo = %s", (correo,))
            existing_user = cursor.fetchone()
            
            if existing_user:
                flash('El correo ya está registrado', 'error')
                cursor.close()
                connection.close()
                return redirect(url_for('admin.usuarios'))
            
            # Create new user
            hashed_password = generate_password_hash(contrasena)
            
            cursor.execute("""INSERT INTO tbl_usuario (nombres, apellidos, correo, contrasena, fecha_nacimiento, correo_verificado) VALUES (%s, %s, %s, %s, %s, 1)""", (nombres, apellidos, correo, hashed_password, fecha_nacimiento))
            
            user_id = cursor.lastrowid
            
            # Create client record
            cursor.execute("INSERT INTO tbl_solicitante (id_usuario) VALUES (%s)", (user_id,))
            
            connection.commit()
            cursor.close()
            connection.close()
            
            flash('Cliente creado exitosamente', 'success')
            return redirect(url_for('admin.usuarios'))
        else:
            flash('Error de conexión a la base de datos', 'error')
            return redirect(url_for('admin.usuarios'))
    except Exception as e:
        flash(f'Error al crear cliente: {str(e)}', 'error')
        return redirect(url_for('admin.usuarios'))

@admin_bp.route('/crear_asesor', methods=['POST'])
def crear_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        return redirect(url_for('auth.login'))

    try:
        nombre = request.form.get('nombre')
        apellidos = request.form.get('apellidos_asesor')
        correo = request.form.get('correo_asesor')
        especialidad = request.form.get('especialidad')
        contrasena = request.form.get('contrasena_asesor')
        
        if not nombre or not apellidos or not correo or not especialidad or not contrasena:
            flash('Todos los campos son obligatorios', 'error')
            return redirect(url_for('admin.usuarios'))
        
        # Verify if email already exists
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            cursor.execute("SELECT * FROM tbl_usuario WHERE correo = %s", (correo,))
            existing_user = cursor.fetchone()
            
            if existing_user:
                flash('El correo ya está registrado', 'error')
                cursor.close()
                connection.close()
                return redirect(url_for('admin.usuarios'))
            
            # Create new user
            hashed_password = generate_password_hash(contrasena)
            
            cursor.execute("""INSERT INTO tbl_usuario (nombres, apellidos, correo, contrasena, correo_verificado) VALUES (%s, %s, %s, %s, 1)""", (nombre, apellidos, correo, hashed_password))
            
            user_id = cursor.lastrowid
            
            # Create advisor record
            cursor.execute("""INSERT INTO tbl_asesor (id_usuario, nombre, apellidos, correo, especialidad, password) VALUES (%s, %s, %s, %s, %s, %s)""", (user_id, nombre, apellidos, correo, especialidad, hashed_password))
            
            connection.commit()
            cursor.close()
            connection.close()
            
            flash('Asesor creado exitosamente', 'success')
            return redirect(url_for('admin.usuarios'))
        else:
            flash('Error de conexión a la base de datos', 'error')
            return redirect(url_for('admin.usuarios'))
    except Exception as e:
        flash(f'Error al crear asesor: {str(e)}', 'error')
        return redirect(url_for('admin.usuarios'))

@admin_bp.route('/obtener_usuario/<int:user_id>')
def obtener_usuario(user_id):
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        return jsonify({'error': 'No autorizado'}), 401

    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT u.id_usuario, u.nombres, u.apellidos, u.correo, u.fecha_nacimiento,
                       CASE 
                           WHEN a.id_asesor IS NOT NULL THEN 'Asesor'
                           WHEN adm.id_administrador IS NOT NULL THEN 'Administrador'
                           ELSE 'Cliente'
                       END as tipo,
                       a.especialidad
                FROM tbl_usuario u
                LEFT JOIN tbl_asesor a ON u.id_usuario = a.id_usuario
                LEFT JOIN tbl_administrador adm ON u.id_usuario = adm.id_usuario
                WHERE u.id_usuario = %s
            """, (user_id,))
            
            usuario = cursor.fetchone()
        
        connection.close()
        
        if usuario:
            # Format date for JSON response
            if 'fecha_nacimiento' in usuario and usuario['fecha_nacimiento']:
                if isinstance(usuario['fecha_nacimiento'], datetime.date):
                    usuario['fecha_nacimiento'] = usuario['fecha_nacimiento'].strftime('%Y-%m-%d')
            
            return jsonify(usuario)
        
        return jsonify({'error': 'Usuario no encontrado'}), 404

    return jsonify({'error': 'Error de conexión a la base de datos'}), 500

@admin_bp.route('/actualizar_usuario', methods=['POST'])
def actualizar_usuario():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        return redirect(url_for('auth.login'))

    try:
        user_id = request.form.get('user_id')
        user_type = request.form.get('user_type')
        nombres = request.form.get('nombres')
        apellidos = request.form.get('apellidos')
        correo = request.form.get('correo')
        especialidad = request.form.get('especialidad')
        change_password = request.form.get('change_password') == 'on'
        new_password = request.form.get('new_password')
        
        if not user_id or not nombres or not apellidos or not correo:
            flash('Faltan campos obligatorios', 'error')
            return redirect(url_for('admin.usuarios'))
        
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Update user data
            cursor.execute("""UPDATE tbl_usuario SET nombres = %s, apellidos = %s, correo = %s WHERE id_usuario = %s""", (nombres, apellidos, correo, user_id))
            
            # Update password if requested
            if change_password and new_password:
                hashed_password = generate_password_hash(new_password)
                cursor.execute("""UPDATE tbl_usuario SET contrasena = %s WHERE id_usuario = %s""", (hashed_password, user_id))
            
            # If user is an advisor, update advisor data
            if user_type == 'asesor':
                cursor.execute("""UPDATE tbl_asesor SET nombre = %s, apellidos = %s, correo = %s, especialidad = %s WHERE id_usuario = %s""", (nombres, apellidos, correo, especialidad, user_id))
                
                # Update password in advisor table if changed
                if change_password and new_password:
                    cursor.execute("""UPDATE tbl_asesor SET password = %s WHERE id_usuario = %s""", (hashed_password, user_id))
            
            # If user is an administrator, update administrator data
            if user_type == 'administrador':
                cursor.execute("""UPDATE tbl_administrador SET nombre = %s, apellidos = %s, correo = %s WHERE id_usuario = %s""", (nombres, apellidos, correo, user_id))
                
                # Update password in administrator table if changed
                if change_password and new_password:
                    cursor.execute("""UPDATE tbl_administrador SET password = %s WHERE id_usuario = %s""", (hashed_password, user_id))
            
            connection.commit()
            cursor.close()
            connection.close()
            
            flash('Usuario actualizado exitosamente', 'success')
            return redirect(url_for('admin.usuarios'))
        else:
            flash('Error de conexión a la base de datos', 'error')
            return redirect(url_for('admin.usuarios'))
    except Exception as e:
        flash(f'Error al actualizar usuario: {str(e)}', 'error')
        return redirect(url_for('admin.usuarios'))

@admin_bp.route('/eliminar_usuario', methods=['POST'])
def eliminar_usuario():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        return redirect(url_for('auth.login'))

    try:
        user_id = request.form.get('user_id')
        
        if not user_id:
            flash('ID de usuario no proporcionado', 'error')
            return redirect(url_for('admin.usuarios'))
        
        connection = create_connection()
        if connection:
            cursor = connection.cursor()
            
            # Delete user (cascade will delete related records)
            cursor.execute("DELETE FROM tbl_usuario WHERE id_usuario = %s", (user_id,))
            
            connection.commit()
            cursor.close()
            connection.close()
            
            flash('Usuario eliminado exitosamente', 'success')
            return redirect(url_for('admin.usuarios'))
        else:
            flash('Error de conexión a la base de datos', 'error')
            return redirect(url_for('admin.usuarios'))
    except Exception as e:
        flash(f'Error al eliminar usuario: {str(e)}', 'error')
        return redirect(url_for('admin.usuarios'))

@admin_bp.route('/guardar_configuracion_general', methods=['POST'])
def guardar_configuracion_general():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        return redirect(url_for('auth.login'))
    
    # Here you would save the configuration to the database
    flash('Configuración general guardada exitosamente', 'success')
    return redirect(url_for('admin.configuracion'))

@admin_bp.route('/guardar_datos_institucionales', methods=['POST'])
def guardar_datos_institucionales():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        return redirect(url_for('auth.login'))
    
    # Here you would save the institutional data to the database
    flash('Datos institucionales guardados exitosamente', 'success')
    return redirect(url_for('admin.configuracion'))

@admin_bp.route('/guardar_configuracion_notificaciones', methods=['POST'])
def guardar_configuracion_notificaciones():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        return redirect(url_for('auth.login'))
    
    # Here you would save the notification settings to the database
    flash('Configuración de notificaciones guardada exitosamente', 'success')
    return redirect(url_for('admin.configuracion'))

@admin_bp.route('/guardar_permisos_rol', methods=['POST'])
def guardar_permisos_rol():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        return redirect(url_for('auth.login'))
    
    # Here you would save the role permissions to the database
    flash('Permisos del rol guardados exitosamente', 'success')
    return redirect(url_for('admin.configuracion'))

@admin_bp.route('/guardar_terminos', methods=['POST'])
def guardar_terminos():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        return redirect(url_for('auth.login'))
    
    # Here you would save the terms and conditions to the database
    flash('Términos y condiciones guardados exitosamente', 'success')
    return redirect(url_for('admin.configuracion'))

@admin_bp.route('/crear_respaldo', methods=['POST'])
def crear_respaldo():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        return redirect(url_for('auth.login'))
    
    # Here you would create a backup of the database
    flash('Respaldo creado exitosamente', 'success')
    return redirect(url_for('admin.configuracion'))

@admin_bp.route('/restaurar_respaldo', methods=['POST'])
def restaurar_respaldo():
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        return redirect(url_for('auth.login'))
    
    # Here you would restore the database from a backup
    flash('Respaldo restaurado exitosamente', 'success')
    return redirect(url_for('admin.configuracion'))

@admin_bp.route('/descargar_respaldo/<filename>')
def descargar_respaldo(filename):
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        return redirect(url_for('auth.login'))
    
    # Here you would download the backup file
    # This is a placeholder, you would need to implement the actual file download
    return redirect(url_for('admin.configuracion'))
