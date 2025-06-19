from flask import Blueprint, render_template, session, redirect, url_for, flash, jsonify
import mysql.connector
from config.database import create_connection
from mysql.connector import Error
from datetime import datetime, timedelta

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

@panel_admin_bp.route('/')
@panel_admin_bp.route('/dashboard')
@admin_required
def index_admin():
    """Panel principal de administración"""
    try:
        conn = create_connection()
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
        cursor.execute("SELECT COUNT(*) as total FROM tbl_usuario WHERE DATE(id_usuario) = CURDATE()")
        stats['usuarios_hoy'] = cursor.fetchone()['total']
        
        # Asesorías de hoy
        cursor.execute("SELECT COUNT(*) as total FROM tbl_asesoria WHERE DATE(fecha_asesoria) = CURDATE()")
        stats['asesorias_hoy'] = cursor.fetchone()['total']
        
        # Últimas actividades
        cursor.execute("""
            SELECT 'usuario' as tipo, CONCAT(nombres, ' ', apellidos) as descripcion, 
                   id_usuario as fecha FROM tbl_usuario 
            ORDER BY id_usuario DESC LIMIT 5
            UNION ALL
            SELECT 'asesoria' as tipo, 'Asesoría programada' as descripcion, 
                   fecha_asesoria as fecha FROM tbl_asesoria 
            WHERE fecha_asesoria >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY fecha_asesoria DESC LIMIT 5
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
        
    except Error as e:
        print(f"Error en index_admin: {e}")
        flash('Error al cargar el panel de administración', 'error')
        return render_template('admin/index_admin.html', stats={})

@panel_admin_bp.route('/perfil')
@admin_required
def perfil_admin():
    """Perfil del administrador"""
    try:
        conn = create_connection()
        if not conn:
            flash('Error de conexión a la base de datos', 'error')
            return redirect(url_for('panel_admin.index_admin'))
        
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT a.*, u.nombres, u.apellidos, u.correo, u.celular, u.fecha_nacimiento
            FROM tbl_administrador a
            JOIN tbl_usuario u ON a.id_usuario = u.id_usuario
            WHERE a.id_administrador = %s
        """, (session['user_id'],))
        admin = cursor.fetchone()
        conn.close()
        
        if not admin:
            flash('Administrador no encontrado', 'error')
            return redirect(url_for('panel_admin.index_admin'))
        
        return render_template('admin/perfil_admin.html', admin=dict(admin))
        
    except Error as e:
        print(f"Error en perfil_admin: {e}")
        flash('Error al cargar el perfil', 'error')
        return redirect(url_for('panel_admin.index_admin'))
