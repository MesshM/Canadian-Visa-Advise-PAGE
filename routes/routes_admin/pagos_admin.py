from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from functools import wraps
import sqlite3
from datetime import datetime, timedelta

pagos_admin = Blueprint('pagos_admin', __name__)

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

@pagos_admin.route('/admin/pagos')
@admin_required
def listar_pagos():
    """Listar todos los pagos del sistema"""
    try:
        conn = get_db_connection()
        
        # Obtener parámetros de filtro
        buscar_cliente = request.args.get('cliente', '')
        metodo_filtro = request.args.get('metodo', '')
        estado_filtro = request.args.get('estado', '')
        fecha_inicio = request.args.get('fecha_inicio', '')
        
        # Construir consulta con filtros
        query = '''
            SELECT p.id_pago, p.monto, p.metodo_pago, p.estado_pago, p.fecha_pago,
                   p.referencia_pago, p.codigo_asesoria,
                   u.nombres || ' ' || u.apellidos as cliente_nombre,
                   u.correo as cliente_correo,
                   a.tipo_asesoria
            FROM pagos p
            LEFT JOIN asesorias ase ON p.codigo_asesoria = ase.codigo_asesoria
            LEFT JOIN usuarios u ON ase.id_usuario = u.id_usuario
            LEFT JOIN asesorias a ON p.codigo_asesoria = a.codigo_asesoria
            WHERE 1=1
        '''
        params = []
        
        if buscar_cliente:
            query += ' AND (u.nombres LIKE ? OR u.apellidos LIKE ? OR u.correo LIKE ?)'
            params.extend([f'%{buscar_cliente}%', f'%{buscar_cliente}%', f'%{buscar_cliente}%'])
        
        if metodo_filtro:
            query += ' AND p.metodo_pago = ?'
            params.append(metodo_filtro)
        
        if estado_filtro:
            query += ' AND p.estado_pago = ?'
            params.append(estado_filtro)
        
        if fecha_inicio:
            query += ' AND DATE(p.fecha_pago) >= ?'
            params.append(fecha_inicio)
        
        query += ' ORDER BY p.fecha_pago DESC'
        
        pagos = conn.execute(query, params).fetchall()
        
        # Obtener estadísticas
        inicio_mes = datetime.now().replace(day=1)
        
        # Ingresos del mes
        ingresos_mes = conn.execute(
            'SELECT COALESCE(SUM(monto), 0) as total FROM pagos WHERE estado_pago = "Completado" AND fecha_pago >= ?',
            (inicio_mes,)
        ).fetchone()['total']
        
        # Contadores por estado
        pagos_pendientes = len([p for p in pagos if p['estado_pago'] == 'Pendiente'])
        pagos_completados = len([p for p in pagos if p['estado_pago'] == 'Completado'])
        pagos_rechazados = len([p for p in pagos if p['estado_pago'] == 'Rechazado'])
        
        conn.close()
        
        return render_template('admin/pagos_admin.html',
                             pagos=pagos,
                             ingresos_mes=f"{ingresos_mes:.2f}",
                             pagos_pendientes=pagos_pendientes,
                             pagos_completados=pagos_completados,
                             pagos_rechazados=pagos_rechazados)
                             
    except Exception as e:
        flash(f'Error al cargar pagos: {str(e)}', 'error')
        return render_template('admin/pagos_admin.html', pagos=[])

@pagos_admin.route('/admin/pagos/<int:id>/aprobar', methods=['POST'])
@admin_required
def aprobar_pago(id):
    """Aprobar un pago pendiente"""
    try:
        comentarios = request.json.get('comentarios', '')
        
        conn = get_db_connection()
        
        # Verificar que el pago existe y está pendiente
        pago = conn.execute(
            'SELECT * FROM pagos WHERE id_pago = ?', (id,)
        ).fetchone()
        
        if not pago:
            return jsonify({'error': 'Pago no encontrado'}), 404
        
        if pago['estado_pago'] != 'Pendiente':
            return jsonify({'error': 'Solo se pueden aprobar pagos pendientes'}), 400
        
        # Aprobar pago
        conn.execute('''
            UPDATE pagos 
            SET estado_pago = 'Completado', fecha_aprobacion = ?, 
                aprobado_por = ?, comentarios_admin = ?
            WHERE id_pago = ?
        ''', (datetime.now(), session['user_id'], comentarios, id))
        
        # Actualizar estado de la asesoría relacionada
        if pago['codigo_asesoria']:
            conn.execute('''
                UPDATE asesorias 
                SET estado_pago = 'Completado'
                WHERE codigo_asesoria = ?
            ''', (pago['codigo_asesoria'],))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': 'Pago aprobado exitosamente'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pagos_admin.route('/admin/pagos/<int:id>/rechazar', methods=['POST'])
@admin_required
def rechazar_pago(id):
    """Rechazar un pago"""
    try:
        motivo = request.json.get('motivo', '')
        comentarios = request.json.get('comentarios', '')
        
        if not motivo:
            return jsonify({'error': 'El motivo de rechazo es obligatorio'}), 400
        
        conn = get_db_connection()
        
        # Verificar que el pago existe
        pago = conn.execute(
            'SELECT * FROM pagos WHERE id_pago = ?', (id,)
        ).fetchone()
        
        if not pago:
            return jsonify({'error': 'Pago no encontrado'}), 404
        
        # Rechazar pago
        conn.execute('''
            UPDATE pagos 
            SET estado_pago = 'Rechazado', fecha_rechazo = ?, 
                rechazado_por = ?, motivo_rechazo = ?, comentarios_admin = ?
            WHERE id_pago = ?
        ''', (datetime.now(), session['user_id'], motivo, comentarios, id))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': 'Pago rechazado exitosamente'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pagos_admin.route('/admin/pagos/<int:id>/reembolsar', methods=['POST'])
@admin_required
def reembolsar_pago(id):
    """Procesar reembolso de un pago"""
    try:
        motivo = request.json.get('motivo', '')
        monto_reembolso = request.json.get('monto_reembolso')
        
        if not motivo:
            return jsonify({'error': 'El motivo del reembolso es obligatorio'}), 400
        
        conn = get_db_connection()
        
        # Verificar que el pago existe y está completado
        pago = conn.execute(
            'SELECT * FROM pagos WHERE id_pago = ?', (id,)
        ).fetchone()
        
        if not pago:
            return jsonify({'error': 'Pago no encontrado'}), 404
        
        if pago['estado_pago'] != 'Completado':
            return jsonify({'error': 'Solo se pueden reembolsar pagos completados'}), 400
        
        # Si no se especifica monto, reembolsar el total
        if not monto_reembolso:
            monto_reembolso = pago['monto']
        
        # Procesar reembolso
        conn.execute('''
            UPDATE pagos 
            SET estado_pago = 'Reembolsado', fecha_reembolso = ?, 
                reembolsado_por = ?, motivo_reembolso = ?, monto_reembolsado = ?
            WHERE id_pago = ?
        ''', (datetime.now(), session['user_id'], motivo, monto_reembolso, id))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': f'Reembolso de ${monto_reembolso} procesado exitosamente'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pagos_admin.route('/admin/pagos/<int:id>/detalles')
@admin_required
def ver_detalles_pago(id):
    """Ver detalles completos de un pago"""
    try:
        conn = get_db_connection()
        
        # Obtener información del pago
        pago = conn.execute('''
            SELECT p.*, 
                   u.nombres || ' ' || u.apellidos as cliente_nombre,
                   u.correo as cliente_correo,
                   a.tipo_asesoria, a.fecha_asesoria
            FROM pagos p
            LEFT JOIN asesorias ase ON p.codigo_asesoria = ase.codigo_asesoria
            LEFT JOIN usuarios u ON ase.id_usuario = u.id_usuario
            LEFT JOIN asesorias a ON p.codigo_asesoria = a.codigo_asesoria
            WHERE p.id_pago = ?
        ''', (id,)).fetchone()
        
        if not pago:
            return jsonify({'error': 'Pago no encontrado'}), 404
        
        # Obtener historial de transacciones relacionadas
        historial = conn.execute('''
            SELECT * FROM historial_pagos 
            WHERE id_pago = ? 
            ORDER BY fecha DESC
        ''', (id,)).fetchall()
        
        conn.close()
        
        return jsonify({
            'pago': dict(pago),
            'historial': [dict(h) for h in historial]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pagos_admin.route('/admin/pagos/<int:id>/recibo')
@admin_required
def generar_recibo(id):
    """Generar recibo de pago en PDF"""
    try:
        conn = get_db_connection()
        
        pago = conn.execute('''
            SELECT p.*, 
                   u.nombres || ' ' || u.apellidos as cliente_nombre,
                   u.correo as cliente_correo,
                   a.tipo_asesoria
            FROM pagos p
            LEFT JOIN asesorias ase ON p.codigo_asesoria = ase.codigo_asesoria
            LEFT JOIN usuarios u ON ase.id_usuario = u.id_usuario
            LEFT JOIN asesorias a ON p.codigo_asesoria = a.codigo_asesoria
            WHERE p.id_pago = ?
        ''', (id,)).fetchone()
        
        conn.close()
        
        if not pago:
            flash('Pago no encontrado.', 'error')
            return redirect(url_for('pagos_admin.listar_pagos'))
        
        # TODO: Implementar generación de PDF con reportlab o similar
        # Por ahora retornamos los datos para generar el recibo en el frontend
        return jsonify({
            'pago': dict(pago),
            'empresa': {
                'nombre': 'Canadian Visa Advise',
                'direccion': '123 Main Street, Toronto, ON M5V 3A8, Canada',
                'telefono': '+1 (555) 123-4567',
                'email': 'info@canadianvisaadvise.com'
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pagos_admin.route('/admin/pagos/procesar-masivo', methods=['POST'])
@admin_required
def procesar_pagos_masivo():
    """Aprobar múltiples pagos"""
    try:
        pago_ids = request.json.get('pago_ids', [])
        accion = request.json.get('accion', 'aprobar')
        comentarios = request.json.get('comentarios', '')
        
        if not pago_ids:
            return jsonify({'error': 'Debe seleccionar al menos un pago'}), 400
        
        conn = get_db_connection()
        
        if accion == 'aprobar':
            # Aprobar pagos en lote
            placeholders = ','.join(['?' for _ in pago_ids])
            conn.execute(f'''
                UPDATE pagos 
                SET estado_pago = 'Completado', fecha_aprobacion = ?, 
                    aprobado_por = ?, comentarios_admin = ?
                WHERE id_pago IN ({placeholders}) AND estado_pago = 'Pendiente'
            ''', [datetime.now(), session['user_id'], comentarios] + pago_ids)
            
            mensaje = f'{len(pago_ids)} pagos aprobados exitosamente'
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': mensaje
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pagos_admin.route('/admin/pagos/reporte-financiero')
@admin_required
def reporte_financiero():
    """Generar reporte financiero"""
    try:
        periodo = request.args.get('periodo', 'mes')  # mes, trimestre, año
        
        conn = get_db_connection()
        
        # Calcular fechas según el período
        hoy = datetime.now()
        if periodo == 'mes':
            fecha_inicio = hoy.replace(day=1)
        elif periodo == 'trimestre':
            mes_inicio = ((hoy.month - 1) // 3) * 3 + 1
            fecha_inicio = hoy.replace(month=mes_inicio, day=1)
        else:  # año
            fecha_inicio = hoy.replace(month=1, day=1)
        
        # Ingresos por método de pago
        ingresos_por_metodo = conn.execute('''
            SELECT metodo_pago, SUM(monto) as total, COUNT(*) as cantidad
            FROM pagos 
            WHERE estado_pago = 'Completado' AND fecha_pago >= ?
            GROUP BY metodo_pago
        ''', (fecha_inicio,)).fetchall()
        
        # Ingresos por tipo de asesoría
        ingresos_por_tipo = conn.execute('''
            SELECT a.tipo_asesoria, SUM(p.monto) as total, COUNT(*) as cantidad
            FROM pagos p
            JOIN asesorias a ON p.codigo_asesoria = a.codigo_asesoria
            WHERE p.estado_pago = 'Completado' AND p.fecha_pago >= ?
            GROUP BY a.tipo_asesoria
        ''', (fecha_inicio,)).fetchall()
        
        # Ingresos diarios del período
        ingresos_diarios = conn.execute('''
            SELECT DATE(fecha_pago) as fecha, SUM(monto) as total
            FROM pagos 
            WHERE estado_pago = 'Completado' AND fecha_pago >= ?
            GROUP BY DATE(fecha_pago)
            ORDER BY fecha
        ''', (fecha_inicio,)).fetchall()
        
        # Total de ingresos
        total_ingresos = conn.execute('''
            SELECT SUM(monto) as total
            FROM pagos 
            WHERE estado_pago = 'Completado' AND fecha_pago >= ?
        ''', (fecha_inicio,)).fetchone()['total'] or 0
        
        conn.close()
        
        return jsonify({
            'periodo': periodo,
            'fecha_inicio': fecha_inicio.isoformat(),
            'total_ingresos': float(total_ingresos),
            'ingresos_por_metodo': [dict(row) for row in ingresos_por_metodo],
            'ingresos_por_tipo': [dict(row) for row in ingresos_por_tipo],
            'ingresos_diarios': [dict(row) for row in ingresos_diarios]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

pagos_admin_bp = pagos_admin