from flask import Blueprint, render_template, session, redirect, url_for, flash, request, jsonify
from functools import wraps
from datetime import datetime, timedelta
import sqlite3

panel_admin_bp = Blueprint('panel_admin', __name__)

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

@panel_admin_bp.route('/admin')
@admin_required
def index_admin():
    """Panel principal del administrador"""
    try:
        conn = get_db_connection()
        
        # Obtener estadísticas generales
        total_usuarios = conn.execute('SELECT COUNT(*) as count FROM usuarios').fetchone()['count']
        total_asesores = conn.execute('SELECT COUNT(*) as count FROM asesores WHERE estado = "Activo"').fetchone()['count']
        
        # Asesorías del mes actual
        inicio_mes = datetime.now().replace(day=1)
        total_asesorias_mes = conn.execute(
            'SELECT COUNT(*) as count FROM asesorias WHERE fecha_asesoria >= ?', 
            (inicio_mes,)
        ).fetchone()['count']
        
        # Ingresos del mes
        ingresos_mes = conn.execute(
            'SELECT COALESCE(SUM(monto), 0) as total FROM pagos WHERE estado_pago = "Completado" AND fecha_pago >= ?',
            (inicio_mes,)
        ).fetchone()['total']
        
        # Usuarios recientes (últimos 10)
        usuarios_recientes = conn.execute('''
            SELECT id_usuario, nombres, apellidos, correo, fecha_registro
            FROM usuarios 
            ORDER BY fecha_registro DESC 
            LIMIT 10
        ''').fetchall()
        
        conn.close()
        
        return render_template('admin/index_admin.html',
                             total_usuarios=total_usuarios,
                             total_asesores=total_asesores,
                             total_asesorias_mes=total_asesorias_mes,
                             ingresos_mes=f"{ingresos_mes:.2f}",
                             usuarios_recientes=usuarios_recientes)
                             
    except Exception as e:
        flash(f'Error al cargar el panel: {str(e)}', 'error')
        return render_template('admin/index_admin.html')

@panel_admin_bp.route('/admin/notificaciones')
@admin_required
def obtener_notificaciones():
    """Obtener notificaciones del sistema para el administrador"""
    try:
        conn = get_db_connection()
        
        # Documentos pendientes de revisión
        docs_pendientes = conn.execute(
            'SELECT COUNT(*) as count FROM documentos WHERE estado = "Pendiente"'
        ).fetchone()['count']
        
        # Pagos pendientes de aprobación
        pagos_pendientes = conn.execute(
            'SELECT COUNT(*) as count FROM pagos WHERE estado_pago = "Pendiente"'
        ).fetchone()['count']
        
        # Asesorías sin asesor asignado
        asesorias_sin_asesor = conn.execute(
            'SELECT COUNT(*) as count FROM asesorias WHERE asesor_asignado IS NULL'
        ).fetchone()['count']
        
        conn.close()
        
        notificaciones = {
            'documentos_pendientes': docs_pendientes,
            'pagos_pendientes': pagos_pendientes,
            'asesorias_sin_asesor': asesorias_sin_asesor,
            'total': docs_pendientes + pagos_pendientes + asesorias_sin_asesor
        }
        
        return jsonify(notificaciones)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@panel_admin_bp.route('/admin/estadisticas')
@admin_required
def obtener_estadisticas():
    """Obtener estadísticas para gráficos del dashboard"""
    try:
        conn = get_db_connection()
        
        # Estadísticas de usuarios por mes (últimos 6 meses)
        usuarios_por_mes = []
        for i in range(6):
            fecha = datetime.now() - timedelta(days=30*i)
            inicio_mes = fecha.replace(day=1)
            fin_mes = (inicio_mes + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            count = conn.execute(
                'SELECT COUNT(*) as count FROM usuarios WHERE fecha_registro BETWEEN ? AND ?',
                (inicio_mes, fin_mes)
            ).fetchone()['count']
            
            usuarios_por_mes.append({
                'mes': fecha.strftime('%B'),
                'usuarios': count
            })
        
        # Estadísticas de asesorías por estado
        asesorias_por_estado = conn.execute('''
            SELECT estado, COUNT(*) as count 
            FROM asesorias 
            GROUP BY estado
        ''').fetchall()
        
        # Ingresos por mes (últimos 6 meses)
        ingresos_por_mes = []
        for i in range(6):
            fecha = datetime.now() - timedelta(days=30*i)
            inicio_mes = fecha.replace(day=1)
            fin_mes = (inicio_mes + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            total = conn.execute(
                'SELECT COALESCE(SUM(monto), 0) as total FROM pagos WHERE estado_pago = "Completado" AND fecha_pago BETWEEN ? AND ?',
                (inicio_mes, fin_mes)
            ).fetchone()['total']
            
            ingresos_por_mes.append({
                'mes': fecha.strftime('%B'),
                'ingresos': float(total)
            })
        
        conn.close()
        
        estadisticas = {
            'usuarios_por_mes': list(reversed(usuarios_por_mes)),
            'asesorias_por_estado': [dict(row) for row in asesorias_por_estado],
            'ingresos_por_mes': list(reversed(ingresos_por_mes))
        }
        
        return jsonify(estadisticas)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
