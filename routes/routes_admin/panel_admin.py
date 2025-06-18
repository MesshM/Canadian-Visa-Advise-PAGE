from flask import Blueprint, render_template, session, redirect, url_for, flash, jsonify
import sqlite3
from datetime import datetime, timedelta
import os

panel_admin_bp = Blueprint('panel_admin', __name__, url_prefix='/admin')

def admin_required(f):
    """Decorador para verificar que el usuario sea administrador"""
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or session.get('user_role') != 'Administrador':
            flash('Acceso denegado. Se requieren permisos de administrador.', 'error')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

def get_db_connection():
    """Crear conexión a la base de datos MySQL"""
    try:
        from config.database import create_connection
        return create_connection()
    except Exception as e:
        print(f"Error conectando a la base de datos: {e}")
        return None

@panel_admin_bp.route('/')
@panel_admin_bp.route('/dashboard')
@admin_required
def index_admin():
    """Panel principal de administración"""
    try:
        conn = get_db_connection()
        if not conn:
            flash('Error de conexión a la base de datos', 'error')
            return render_template('admin/index_admin.html', stats={})
        
        cursor = conn.cursor(dictionary=True)
        
        # Estadísticas generales
        stats = {}
        
        # Total de usuarios
        cursor.execute("SELECT COUNT(*) as total FROM tbl_usuario")
        stats['total_usuarios'] = cursor.fetchone()['total']
        
        # Total de asesores
        cursor.execute("SELECT COUNT(*) as total FROM tbl_asesor")
        stats['total_asesores'] = cursor.fetchone()['total']
        
        # Total de asesorías
        cursor.execute("SELECT COUNT(*) as total FROM tbl_asesoria")
        stats['total_asesorias'] = cursor.fetchone()['total']
        
        # Asesorías pendientes
        cursor.execute("SELECT COUNT(*) as total FROM tbl_asesoria WHERE estado = 'Pendiente'")
        stats['asesorias_pendientes'] = cursor.fetchone()['total']
        
        # Usuarios registrados hoy
        cursor.execute("SELECT COUNT(*) as total FROM tbl_usuario WHERE DATE(fecha_registro) = CURDATE()")
        stats['usuarios_hoy'] = cursor.fetchone()['total']
        
        # Asesorías de hoy
        cursor.execute("SELECT COUNT(*) as total FROM tbl_asesoria WHERE DATE(fecha_asesoria) = CURDATE()")
        stats['asesorias_hoy'] = cursor.fetchone()['total']
        
        # Últimas actividades
        cursor.execute("""
            SELECT 'usuario' as tipo, CONCAT(nombres, ' ', apellidos) as descripcion, 
                   fecha_registro as fecha FROM tbl_usuario 
            WHERE fecha_registro >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            UNION ALL
            SELECT 'asesoria' as tipo, 'Asesoría programada' as descripcion, 
                   fecha_asesoria as fecha FROM tbl_asesoria 
            WHERE fecha_asesoria >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY fecha DESC LIMIT 10
        """)
        
        actividades = []
        for row in cursor.fetchall():
            actividades.append({
                'tipo': row['tipo'],
                'descripcion': row['descripcion'],
                'fecha': row['fecha']
            })
        
        cursor.close()
        conn.close()
        
        return render_template('admin/index_admin.html', 
                             stats=stats, 
                             actividades=actividades,
                             admin_name=session.get('user_name', 'Administrador'))
        
    except Exception as e:
        print(f"Error en index_admin: {e}")
        flash('Error al cargar el panel de administración', 'error')
        return render_template('admin/index_admin.html', stats={})

@panel_admin_bp.route('/api/stats')
@admin_required
def api_stats():
    """API para obtener estadísticas en tiempo real"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión'}), 500
        
        cursor = conn.cursor()
        
        # Estadísticas por mes (últimos 6 meses)
        cursor.execute("""
            SELECT strftime('%Y-%m', fecha_registro) as mes, COUNT(*) as usuarios
            FROM tbl_usuario 
            WHERE fecha_registro >= date('now', '-6 months')
            GROUP BY strftime('%Y-%m', fecha_registro)
            ORDER BY mes
        """)
        usuarios_por_mes = [dict(row) for row in cursor.fetchall()]
        
        # Asesorías por estado
        cursor.execute("""
            SELECT estado, COUNT(*) as cantidad
            FROM tbl_asesoria
            GROUP BY estado
        """)
        asesorias_por_estado = [dict(row) for row in cursor.fetchall()]
        
        # Asesores más activos
        cursor.execute("""
            SELECT a.nombre || ' ' || a.apellidos as asesor, COUNT(ase.id_asesoria) as asesorias
            FROM tbl_asesor a
            LEFT JOIN tbl_asesoria ase ON a.id_asesor = ase.id_asesor
            GROUP BY a.id_asesor
            ORDER BY asesorias DESC
            LIMIT 5
        """)
        asesores_activos = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'usuarios_por_mes': usuarios_por_mes,
            'asesorias_por_estado': asesorias_por_estado,
            'asesores_activos': asesores_activos
        })
        
    except Exception as e:
        print(f"Error en api_stats: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@panel_admin_bp.route('/perfil')
@admin_required
def perfil_admin():
    """Perfil del administrador"""
    try:
        conn = get_db_connection()
        if not conn:
            flash('Error de conexión a la base de datos', 'error')
            return redirect(url_for('panel_admin.index_admin'))
        
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tbl_administrador WHERE id_administrador = ?", 
                      (session['user_id'],))
        admin = cursor.fetchone()
        conn.close()
        
        if not admin:
            flash('Administrador no encontrado', 'error')
            return redirect(url_for('panel_admin.index_admin'))
        
        return render_template('admin/perfil_admin.html', admin=dict(admin))
        
    except Exception as e:
        print(f"Error en perfil_admin: {e}")
        flash('Error al cargar el perfil', 'error')
        return redirect(url_for('panel_admin.index_admin'))

@panel_admin_bp.route('/sistema/info')
@admin_required
def sistema_info():
    """Información del sistema"""
    try:
        # Información del sistema
        info = {
            'version_python': os.sys.version,
            'directorio_trabajo': os.getcwd(),
            'espacio_disco': get_disk_usage(),
            'base_datos_size': get_database_size(),
            'uptime': get_system_uptime()
        }
        
        return render_template('admin/sistema_info.html', info=info)
        
    except Exception as e:
        print(f"Error en sistema_info: {e}")
        flash('Error al obtener información del sistema', 'error')
        return redirect(url_for('panel_admin.index_admin'))

def get_disk_usage():
    """Obtener uso del disco"""
    try:
        import shutil
        total, used, free = shutil.disk_usage('.')
        return {
            'total': round(total / (1024**3), 2),  # GB
            'used': round(used / (1024**3), 2),    # GB
            'free': round(free / (1024**3), 2)     # GB
        }
    except:
        return {'total': 0, 'used': 0, 'free': 0}

def get_database_size():
    """Obtener tamaño de la base de datos"""
    try:
        size = os.path.getsize('database.db')
        return round(size / (1024**2), 2)  # MB
    except:
        return 0

def get_system_uptime():
    """Obtener tiempo de actividad del sistema"""
    try:
        import psutil
        boot_time = psutil.boot_time()
        uptime = datetime.now() - datetime.fromtimestamp(boot_time)
        return str(uptime).split('.')[0]  # Sin microsegundos
    except:
        return "No disponible"
