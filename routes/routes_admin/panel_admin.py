from flask import Blueprint, render_template, session, redirect, url_for, flash, jsonify, request
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
    """
    Renderiza el panel principal de administración.
    Los datos se cargan dinámicamente vía JS usando los endpoints API de abajo.
    """
    return render_template('admin/index_admin.html')

# API: Estadísticas del dashboard
@panel_admin_bp.route('/api/estadisticas')
@admin_required
def api_estadisticas():
    try:
        conn = create_connection()
        cursor = conn.cursor(dictionary=True)
        # Total usuarios
        cursor.execute("SELECT COUNT(*) as total FROM tbl_usuario")
        total_usuarios = cursor.fetchone()['total']
        # Total asesores
        cursor.execute("SELECT COUNT(*) as total FROM tbl_asesor")
        total_asesores = cursor.fetchone()['total']
        # Asesorías del mes actual
        cursor.execute("""
            SELECT COUNT(*) as total FROM tbl_asesoria
            WHERE MONTH(fecha_asesoria) = MONTH(CURDATE()) AND YEAR(fecha_asesoria) = YEAR(CURDATE())
        """)
        asesorias_mes = cursor.fetchone()['total']
        # Ingresos del mes (ejemplo: sumar columna monto en tabla pagos)
        cursor.execute("""
            SELECT IFNULL(SUM(monto),0) as total FROM tbl_pago
            WHERE estado='Aprobado' AND MONTH(fecha_pago) = MONTH(CURDATE()) AND YEAR(fecha_pago) = YEAR(CURDATE())
        """)
        ingresos_mes = float(cursor.fetchone()['total'] or 0)
        cursor.close()
        conn.close()
        return jsonify(success=True, estadisticas={
            "total_usuarios": total_usuarios,
            "total_asesores": total_asesores,
            "asesorias_mes": asesorias_mes,
            "ingresos_mes": f"{ingresos_mes:.2f}"
        })
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500

# API: Notificaciones del sistema
@panel_admin_bp.route('/api/notificaciones')
@admin_required
def api_notificaciones():
    try:
        # Ejemplo: notificaciones recientes (puedes adaptar según tu modelo)
        conn = create_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, titulo, mensaje, fecha_creacion
            FROM tbl_notificacion
            WHERE para_rol = 'Administrador'
            ORDER BY fecha_creacion DESC
            LIMIT 10
        """)
        notificaciones = []
        for row in cursor.fetchall():
            tiempo = row['fecha_creacion'].strftime('%d/%m/%Y %H:%M')
            notificaciones.append({
                "titulo": row['titulo'],
                "mensaje": row['mensaje'],
                "tiempo": tiempo
            })
        cursor.close()
        conn.close()
        return jsonify(success=True, count=len(notificaciones), notificaciones=notificaciones)
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500

# API: Usuarios recientes
@panel_admin_bp.route('/api/usuarios_recientes')
@admin_required
def api_usuarios_recientes():
    try:
        conn = create_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id_usuario, nombres, apellidos, correo, fecha_registro
            FROM tbl_usuario
            ORDER BY fecha_registro DESC
            LIMIT 10
        """)
        usuarios = []
        for row in cursor.fetchall():
            usuarios.append({
                "id_usuario": row['id_usuario'],
                "nombres": row['nombres'],
                "apellidos": row['apellidos'],
                "correo": row['correo'],
                "fecha_registro": row['fecha_registro'].strftime('%d %b, %Y') if row['fecha_registro'] else 'N/A'
            })
        cursor.close()
        conn.close()
        return jsonify(success=True, usuarios=usuarios)
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500

# API: Asesorías recientes
@panel_admin_bp.route('/api/asesorias_recientes')
@admin_required
def api_asesorias_recientes():
    try:
        conn = create_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT a.codigo_asesoria, a.fecha_asesoria, u.nombres, u.apellidos, a.estado
            FROM tbl_asesoria a
            JOIN tbl_usuario u ON a.id_asesor = u.id_usuario
            ORDER BY a.fecha_asesoria DESC
            LIMIT 10
        """)
        asesorias = []
        for row in cursor.fetchall():
            asesorias.append({
                "codigo_asesoria": row['codigo_asesoria'],
                "fecha_asesoria": row['fecha_asesoria'].strftime('%d %b, %Y %H:%M') if row['fecha_asesoria'] else 'N/A',
                "asesor": f"{row['nombres']} {row['apellidos']}",
                "estado": row['estado']
            })
        cursor.close()
        conn.close()
        return jsonify(success=True, asesorias=asesorias)
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500

# API: Pagos recientes
@panel_admin_bp.route('/api/pagos_recientes')
@admin_required
def api_pagos_recientes():
    try:
        conn = create_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id_pago, monto, estado, fecha_pago
            FROM tbl_pago
            ORDER BY fecha_pago DESC
            LIMIT 10
        """)
        pagos = []
        for row in cursor.fetchall():
            pagos.append({
                "id_pago": row['id_pago'],
                "monto": row['monto'],
                "estado": row['estado'],
                "fecha_pago": row['fecha_pago'].strftime('%d %b, %Y %H:%M') if row['fecha_pago'] else 'N/A'
            })
        cursor.close()
        conn.close()
        return jsonify(success=True, pagos=pagos)
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500

# API: Documentos pendientes
@panel_admin_bp.route('/api/documentos_pendientes')
@admin_required
def api_documentos_pendientes():
    try:
        conn = create_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id_documento, nombre_documento, estado, fecha_subida
            FROM tbl_documento
            WHERE estado = 'Pendiente'
            ORDER BY fecha_subida DESC
            LIMIT 10
        """)
        documentos = []
        for row in cursor.fetchall():
            documentos.append({
                "id_documento": row['id_documento'],
                "nombre_documento": row['nombre_documento'],
                "estado": row['estado'],
                "fecha_subida": row['fecha_subida'].strftime('%d %b, %Y %H:%M') if row['fecha_subida'] else 'N/A'
            })
        cursor.close()
        conn.close()
        return jsonify(success=True, documentos=documentos)
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500

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
