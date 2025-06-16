from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
import sqlite3
from datetime import datetime
import os

pagos_admin_bp = Blueprint('pagos_admin', __name__)

def verificar_admin():
    """Verificar si el usuario actual es administrador"""
    return session.get('user_role') == 'Administrador'

def get_db_connection():
    """Obtener conexión a la base de datos"""
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

@pagos_admin_bp.route('/admin/pagos')
def listar_pagos():
    """Listar todos los pagos"""
    if not verificar_admin():
        flash('No tienes permisos para acceder a esta sección.', 'danger')
        return redirect(url_for('auth.login'))
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Obtener filtros
        estado = request.args.get('estado', '')
        fecha_inicio = request.args.get('fecha_inicio', '')
        fecha_fin = request.args.get('fecha_fin', '')
        cliente_id = request.args.get('cliente_id', '')
        
        # Construir consulta con filtros
        query = '''
            SELECT p.*, u.nombre as cliente_nombre, u.email as cliente_email
            FROM pagos p
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            WHERE 1=1
        '''
        params = []
        
        if estado:
            query += ' AND p.estado = ?'
            params.append(estado)
        
        if fecha_inicio:
            query += ' AND p.fecha >= ?'
            params.append(fecha_inicio)
        
        if fecha_fin:
            query += ' AND p.fecha <= ?'
            params.append(fecha_fin)
        
        if cliente_id:
            query += ' AND p.usuario_id = ?'
            params.append(cliente_id)
        
        query += ' ORDER BY p.fecha DESC'
        
        cursor.execute(query, params)
        pagos = cursor.fetchall()
        
        # Obtener lista de clientes para el filtro
        cursor.execute('SELECT id, nombre FROM usuarios WHERE rol = "Cliente"')
        clientes = cursor.fetchall()
        
        conn.close()
        
        return render_template('admin/pagos_admin.html', 
                             pagos=pagos, 
                             clientes=clientes,
                             filtros={
                                 'estado': estado,
                                 'fecha_inicio': fecha_inicio,
                                 'fecha_fin': fecha_fin,
                                 'cliente_id': cliente_id
                             })
    
    except Exception as e:
        flash(f'Error al cargar los pagos: {str(e)}', 'danger')
        return redirect(url_for('panel_admin.index_admin'))

@pagos_admin_bp.route('/admin/pagos/crear', methods=['GET', 'POST'])
def crear_pago():
    """Crear un nuevo pago"""
    if not verificar_admin():
        flash('No tienes permisos para acceder a esta sección.', 'danger')
        return redirect(url_for('auth.login'))
    
    if request.method == 'POST':
        try:
            # Obtener datos del formulario
            usuario_id = request.form.get('usuario_id')
            monto = float(request.form.get('monto'))
            descripcion = request.form.get('descripcion')
            estado = request.form.get('estado', 'Pendiente')
            fecha = request.form.get('fecha') or datetime.now().strftime('%Y-%m-%d')
            
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO pagos (usuario_id, monto, descripcion, estado, fecha, fecha_creacion)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (usuario_id, monto, descripcion, estado, fecha, datetime.now()))
            
            conn.commit()
            conn.close()
            
            flash('Pago creado exitosamente.', 'success')
            return redirect(url_for('pagos_admin.listar_pagos'))
        
        except Exception as e:
            flash(f'Error al crear el pago: {str(e)}', 'danger')
    
    # Obtener lista de clientes
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id, nombre, email FROM usuarios WHERE rol = "Cliente"')
        clientes = cursor.fetchall()
        conn.close()
    except Exception as e:
        clientes = []
        flash(f'Error al cargar clientes: {str(e)}', 'warning')
    
    return render_template('admin/crear_pago.html', clientes=clientes)

@pagos_admin_bp.route('/admin/pagos/editar/<int:id>', methods=['GET', 'POST'])
def editar_pago(id):
    """Editar un pago existente"""
    if not verificar_admin():
        flash('No tienes permisos para acceder a esta sección.', 'danger')
        return redirect(url_for('auth.login'))
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if request.method == 'POST':
            # Actualizar pago
            monto = float(request.form.get('monto'))
            descripcion = request.form.get('descripcion')
            estado = request.form.get('estado')
            fecha = request.form.get('fecha')
            
            cursor.execute('''
                UPDATE pagos 
                SET monto = ?, descripcion = ?, estado = ?, fecha = ?
                WHERE id = ?
            ''', (monto, descripcion, estado, fecha, id))
            
            conn.commit()
            conn.close()
            
            flash('Pago actualizado exitosamente.', 'success')
            return redirect(url_for('pagos_admin.listar_pagos'))
        
        # Obtener datos del pago
        cursor.execute('''
            SELECT p.*, u.nombre as cliente_nombre, u.email as cliente_email
            FROM pagos p
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            WHERE p.id = ?
        ''', (id,))
        pago = cursor.fetchone()
        
        if not pago:
            flash('Pago no encontrado.', 'danger')
            return redirect(url_for('pagos_admin.listar_pagos'))
        
        # Obtener lista de clientes
        cursor.execute('SELECT id, nombre, email FROM usuarios WHERE rol = "Cliente"')
        clientes = cursor.fetchall()
        
        conn.close()
        
        return render_template('admin/editar_pago.html', pago=pago, clientes=clientes)
    
    except Exception as e:
        flash(f'Error al cargar el pago: {str(e)}', 'danger')
        return redirect(url_for('pagos_admin.listar_pagos'))

@pagos_admin_bp.route('/admin/pagos/eliminar/<int:id>')
def eliminar_pago(id):
    """Eliminar un pago"""
    if not verificar_admin():
        flash('No tienes permisos para acceder a esta sección.', 'danger')
        return redirect(url_for('auth.login'))
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM pagos WHERE id = ?', (id,))
        
        if cursor.rowcount > 0:
            conn.commit()
            flash('Pago eliminado exitosamente.', 'success')
        else:
            flash('Pago no encontrado.', 'danger')
        
        conn.close()
    
    except Exception as e:
        flash(f'Error al eliminar el pago: {str(e)}', 'danger')
    
    return redirect(url_for('pagos_admin.listar_pagos'))

@pagos_admin_bp.route('/admin/pagos/procesar/<int:id>')
def procesar_pago(id):
    """Procesar un pago (marcar como completado)"""
    if not verificar_admin():
        flash('No tienes permisos para acceder a esta sección.', 'danger')
        return redirect(url_for('auth.login'))
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE pagos 
            SET estado = 'Completado', fecha_procesamiento = ?
            WHERE id = ?
        ''', (datetime.now(), id))
        
        if cursor.rowcount > 0:
            conn.commit()
            flash('Pago procesado exitosamente.', 'success')
        else:
            flash('Pago no encontrado.', 'danger')
        
        conn.close()
    
    except Exception as e:
        flash(f'Error al procesar el pago: {str(e)}', 'danger')
    
    return redirect(url_for('pagos_admin.listar_pagos'))

@pagos_admin_bp.route('/admin/pagos/api/estadisticas')
def api_estadisticas_pagos():
    """API para obtener estadísticas de pagos"""
    if not verificar_admin():
        return jsonify({'error': 'No autorizado'}), 403
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Estadísticas generales
        cursor.execute('SELECT COUNT(*) as total FROM pagos')
        total_pagos = cursor.fetchone()['total']
        
        cursor.execute('SELECT SUM(monto) as total FROM pagos WHERE estado = "Completado"')
        total_ingresos = cursor.fetchone()['total'] or 0
        
        cursor.execute('SELECT COUNT(*) as total FROM pagos WHERE estado = "Pendiente"')
        pagos_pendientes = cursor.fetchone()['total']
        
        # Pagos por mes (últimos 6 meses)
        cursor.execute('''
            SELECT strftime('%Y-%m', fecha) as mes, 
                   COUNT(*) as cantidad,
                   SUM(monto) as total
            FROM pagos 
            WHERE fecha >= date('now', '-6 months')
            GROUP BY strftime('%Y-%m', fecha)
            ORDER BY mes
        ''')
        pagos_por_mes = cursor.fetchall()
        
        conn.close()
        
        return jsonify({
            'total_pagos': total_pagos,
            'total_ingresos': total_ingresos,
            'pagos_pendientes': pagos_pendientes,
            'pagos_por_mes': [dict(row) for row in pagos_por_mes]
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

pagos_admin_bp = pagos_admin