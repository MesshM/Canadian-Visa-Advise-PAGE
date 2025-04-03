from flask import Blueprint, render_template, redirect, url_for, flash, session
from config.database import create_connection

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

@admin_bp.route('/')
def admin_index():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    
    try:
        # Renderizar la plantilla de administrador
        return render_template('index_administrador.html')
    except Exception as e:
        # Capturar y mostrar cualquier error
        print(f"Error al renderizar la plantilla: {str(e)}")
        # Mostrar el error al usuario
        return f"Error: {str(e)}", 500

@admin_bp.route('/asesor')
def index_asesor():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    return render_template('Administrador/index_asesor.html')

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
        return render_template('Administrador/clientes.html', clientes=clientes)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('admin.index_asesor'))

@admin_bp.route('/asesorias')
def asesorias_admin():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT a.codigo_asesoria, a.fecha_asesoria, a.tipo_asesoria,
                       CONCAT(u.nombres, ' ', u.apellidos) AS solicitante,
                       a.estado, a.descripcion
                FROM tbl_asesoria a
                JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                ORDER BY a.fecha_asesoria DESC
            """)
            asesorias = cursor.fetchall()
        connection.close()
        return render_template('Administrador/asesorias_admin.html', asesorias=asesorias)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('admin.index_asesor'))

@admin_bp.route('/documentos_asesor')
def documentos():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    
    return render_template('admin/documentos_asesor.html')

@admin_bp.route('/pagos')
def pagos_admin():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT p.num_factura, CONCAT(u.nombres, ' ', u.apellidos) AS solicitante,
                       p.metodo_pago, p.total_pago
                FROM tbl_pago p
                JOIN tbl_solicitante s ON p.id_solicitante = s.id_solicitante
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                ORDER BY p.num_factura DESC
            """)
            pagos = cursor.fetchall()
        connection.close()
        return render_template('Administrador/pagos_admin.html', pagos=pagos)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('admin.index_asesor'))

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
        return render_template('Administrador/solicitudes.html', solicitudes=solicitudes)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('admin.index_asesor'))

@admin_bp.route('/dashboard')
def dashboard_asesor():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    try:
        return render_template('Administrador/index_asesor.html')
    except Exception as e:
        print(f"Error al renderizar la plantilla: {str(e)}")
        return redirect(url_for('admin.asesorias_admin'))

@admin_bp.route('/reportes')
def reportes():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    return render_template('reportes.html')

