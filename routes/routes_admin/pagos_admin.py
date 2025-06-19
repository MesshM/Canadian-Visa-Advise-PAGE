from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from functools import wraps
import mysql.connector
from mysql.connector import Error
from datetime import datetime, timedelta
from config.database import create_connection

pagos_admin_bp = Blueprint('pagos_admin', __name__)

def admin_required(f):
    """Decorador para verificar que el usuario sea administrador"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or session.get('user_role') != 'Administrador':
            flash('Acceso denegado. Se requieren permisos de administrador.', 'error')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

@pagos_admin_bp.route('/admin/pagos')
@admin_required
def listar_pagos():
    """Listar todos los pagos del sistema"""
    try:
        conn = create_connection()
        if not conn:
            flash('Error de conexión a la base de datos', 'error')
            return render_template('admin/pagos_admin.html', pagos=[])
        
        cursor = conn.cursor(dictionary=True)
        
        # Obtener parámetros de filtro
        buscar = request.args.get('buscar', '')
        estado_filtro = request.args.get('estado', '')
        metodo_filtro = request.args.get('metodo', '')
        fecha_desde = request.args.get('fecha_desde', '')
        fecha_hasta = request.args.get('fecha_hasta', '')
        pagina = int(request.args.get('pagina', 1))
        por_pagina = 20
        
        # Construir consulta con filtros
        query = '''
            SELECT p.id_pago, p.codigo_asesoria, p.monto, p.metodo_pago, 
                   p.estado_pago, p.fecha_pago, p.referencia_pago,
                   CONCAT(u.nombres, ' ', u.apellidos) as cliente_nombre,
                   u.correo as cliente_correo,
                   a.tipo_asesoria
            FROM tbl_pago_asesoria p
            LEFT JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
            LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            WHERE 1=1
        '''
        params = []
        
        if buscar:
            query += ' AND (u.nombres LIKE %s OR u.apellidos LIKE %s OR p.referencia_pago LIKE %s)'
            params.extend([f'%{buscar}%', f'%{buscar}%', f'%{buscar}%'])
        
        if estado_filtro:
            query += ' AND p.estado_pago = %s'
            params.append(estado_filtro)
        
        if metodo_filtro:
            query += ' AND p.metodo_pago = %s'
            params.append(metodo_filtro)
        
        if fecha_desde:
            query += ' AND DATE(p.fecha_pago) >= %s'
            params.append(fecha_desde)
        
        if fecha_hasta:
            query += ' AND DATE(p.fecha_pago) <= %s'
            params.append(fecha_hasta)
        
        # Contar total de pagos
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as subquery"
        cursor.execute(count_query, params)
        total_pagos = cursor.fetchone()['total']
        
        # Agregar paginación
        query += ' ORDER BY p.fecha_pago DESC LIMIT %s OFFSET %s'
        params.extend([por_pagina, (pagina - 1) * por_pagina])
        
        cursor.execute(query, params)
        pagos = cursor.fetchall()
        
        # Obtener estadísticas
        cursor.execute("SELECT COUNT(*) as total FROM tbl_pago_asesoria")
        stats_total = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) as total FROM tbl_pago_asesoria WHERE estado_pago = 'Pendiente'")
        stats_pendientes = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) as total FROM tbl_pago_asesoria WHERE estado_pago = 'Completado'")
        stats_completados = cursor.fetchone()['total']
        
        cursor.execute("SELECT SUM(monto) as total FROM tbl_pago_asesoria WHERE estado_pago = 'Completado'")
        ingresos_result = cursor.fetchone()
        stats_ingresos = ingresos_result['total'] if ingresos_result['total'] else 0
        
        conn.close()
        
        return render_template('admin/pagos_admin.html',
                             pagos=pagos,
                             total_pagos=total_pagos,
                             pagina_actual=pagina,
                             total_paginas=(total_pagos + por_pagina - 1) // por_pagina,
                             stats={
                                 'total': stats_total,
                                 'pendientes': stats_pendientes,
                                 'completados': stats_completados,
                                 'ingresos': stats_ingresos
                             })
                             
    except Error as e:
        flash(f'Error al cargar pagos: {str(e)}', 'error')
        return render_template('admin/pagos_admin.html', pagos=[])

@pagos_admin_bp.route('/admin/pagos/<int:id>/cambiar-estado', methods=['POST'])
@admin_required
def cambiar_estado_pago(id):
    """Cambiar estado de un pago"""
    try:
        nuevo_estado = request.json.get('estado')
        
        if nuevo_estado not in ['Pendiente', 'Completado', 'Cancelado']:
            return jsonify({'error': 'Estado no válido'}), 400
        
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = conn.cursor()
        
        cursor.execute(
            'UPDATE tbl_pago_asesoria SET estado_pago = %s WHERE id_pago = %s',
            (nuevo_estado, id)
        )
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Pago no encontrado'}), 404
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': f'Estado del pago cambiado a {nuevo_estado} exitosamente'
        })
        
    except Error as e:
        return jsonify({'error': str(e)}), 500

@pagos_admin_bp.route('/admin/pagos/<int:id>/detalles')
@admin_required
def ver_detalles_pago(id):
    """Ver detalles completos de un pago"""
    try:
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Obtener información del pago
        cursor.execute('''
            SELECT p.*, 
                   CONCAT(u.nombres, ' ', u.apellidos) as cliente_nombre,
                   u.correo as cliente_correo, u.celular as cliente_celular,
                   a.tipo_asesoria, a.fecha_asesoria, a.estado as estado_asesoria
            FROM tbl_pago_asesoria p
            LEFT JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
            LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            WHERE p.id_pago = %s
        ''', (id,))
        
        pago = cursor.fetchone()
        
        if not pago:
            return jsonify({'error': 'Pago no encontrado'}), 404
        
        conn.close()
        
        return jsonify({
            'success': True,
            'pago': dict(pago)
        })
        
    except Error as e:
        return jsonify({'error': str(e)}), 500

@pagos_admin_bp.route('/admin/pagos/estadisticas')
@admin_required
def estadisticas_pagos():
    """Obtener estadísticas de pagos"""
    try:
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Ingresos por mes (últimos 6 meses)
        cursor.execute('''
            SELECT DATE_FORMAT(fecha_pago, '%Y-%m') as mes, 
                   SUM(monto) as ingresos
            FROM tbl_pago_asesoria 
            WHERE fecha_pago >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            AND estado_pago = 'Completado'
            GROUP BY DATE_FORMAT(fecha_pago, '%Y-%m')
            ORDER BY mes
        ''')
        ingresos_por_mes = cursor.fetchall()
        
        # Pagos por método
        cursor.execute('''
            SELECT metodo_pago, COUNT(*) as cantidad, SUM(monto) as total
            FROM tbl_pago_asesoria
            WHERE estado_pago = 'Completado'
            GROUP BY metodo_pago
        ''')
        pagos_por_metodo = cursor.fetchall()
        
        # Pagos por estado
        cursor.execute('''
            SELECT estado_pago, COUNT(*) as cantidad
            FROM tbl_pago_asesoria
            GROUP BY estado_pago
        ''')
        pagos_por_estado = cursor.fetchall()
        
        conn.close()
        
        return jsonify({
            'ingresos_por_mes': [dict(row) for row in ingresos_por_mes],
            'pagos_por_metodo': [dict(row) for row in pagos_por_metodo],
            'pagos_por_estado': [dict(row) for row in pagos_por_estado]
        })
        
    except Error as e:
        return jsonify({'error': str(e)}), 500
