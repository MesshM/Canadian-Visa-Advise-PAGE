from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from functools import wraps
import sqlite3
from datetime import datetime, timedelta

asesorias_admin_bp = Blueprint('asesorias_admin', __name__)

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

@asesorias_admin_bp.route('/admin/asesorias')
@admin_required
def listar_asesorias():
    """Listar todas las asesorías del sistema"""
    try:
        conn = get_db_connection()
        
        # Obtener parámetros de filtro
        buscar_cliente = request.args.get('cliente', '')
        asesor_filtro = request.args.get('asesor', '')
        estado_filtro = request.args.get('estado', '')
        fecha_filtro = request.args.get('fecha', '')
        
        # Construir consulta con filtros
        query = '''
            SELECT a.codigo_asesoria, a.tipo_asesoria, a.fecha_asesoria, a.estado,
                   a.estado_pago, a.monto,
                   u.nombres || ' ' || u.apellidos as cliente_nombre,
                   u.correo as cliente_correo,
                   ase.nombre || ' ' || ase.apellidos as asesor_asignado
            FROM asesorias a
            LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
            LEFT JOIN asesores ase ON a.asesor_asignado = ase.id_asesor
            WHERE 1=1
        '''
        params = []
        
        if buscar_cliente:
            query += ' AND (u.nombres LIKE ? OR u.apellidos LIKE ? OR u.correo LIKE ?)'
            params.extend([f'%{buscar_cliente}%', f'%{buscar_cliente}%', f'%{buscar_cliente}%'])
        
        if asesor_filtro:
            query += ' AND a.asesor_asignado = ?'
            params.append(asesor_filtro)
        
        if estado_filtro:
            query += ' AND a.estado = ?'
            params.append(estado_filtro)
        
        if fecha_filtro:
            query += ' AND DATE(a.fecha_asesoria) = ?'
            params.append(fecha_filtro)
        
        query += ' ORDER BY a.fecha_asesoria DESC'
        
        asesorias = conn.execute(query, params).fetchall()
        
        # Obtener lista de asesores para el filtro
        asesores = conn.execute('''
            SELECT id_asesor, nombre, apellidos 
            FROM asesores 
            WHERE estado = 'Activo'
            ORDER BY nombre, apellidos
        ''').fetchall()
        
        # Obtener estadísticas
        total_asesorias = len(asesorias)
        asesorias_pendientes = len([a for a in asesorias if a['estado'] == 'Pendiente'])
        asesorias_completadas = len([a for a in asesorias if a['estado'] == 'Completada'])
        asesorias_canceladas = len([a for a in asesorias if a['estado'] == 'Cancelada'])
        
        conn.close()
        
        return render_template('admin/asesorias_admin.html',
                             asesorias=asesorias,
                             asesores=asesores,
                             total_asesorias=total_asesorias,
                             asesorias_pendientes=asesorias_pendientes,
                             asesorias_completadas=asesorias_completadas,
                             asesorias_canceladas=asesorias_canceladas)
                             
    except Exception as e:
        flash(f'Error al cargar asesorías: {str(e)}', 'error')
        return render_template('admin/asesorias_admin.html', asesorias=[])

@asesorias_admin_bp.route('/admin/asesorias/<codigo>/ver')
@admin_required
def ver_asesoria(codigo):
    """Ver detalles completos de una asesoría"""
    try:
        conn = get_db_connection()
        
        # Obtener información de la asesoría
        asesoria = conn.execute('''
            SELECT a.*, 
                   u.nombres || ' ' || u.apellidos as cliente_nombre,
                   u.correo as cliente_correo, u.celular as cliente_telefono,
                   ase.nombre || ' ' || ase.apellidos as asesor_nombre,
                   ase.correo as asesor_correo
            FROM asesorias a
            LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
            LEFT JOIN asesores ase ON a.asesor_asignado = ase.id_asesor
            WHERE a.codigo_asesoria = ?
        ''', (codigo,)).fetchone()
        
        if not asesoria:
            flash('Asesoría no encontrada.', 'error')
            return redirect(url_for('asesorias_admin.listar_asesorias'))
        
        # Obtener documentos relacionados
        documentos = conn.execute('''
            SELECT id_documento, tipo_documento, nombre_archivo, estado, fecha_subida
            FROM documentos
            WHERE id_usuario = ?
            ORDER BY fecha_subida DESC
        ''', (asesoria['id_usuario'],)).fetchall()
        
        # Obtener pagos relacionados
        pagos = conn.execute('''
            SELECT id_pago, monto, metodo_pago, estado_pago, fecha_pago, referencia_pago
            FROM pagos
            WHERE codigo_asesoria = ?
            ORDER BY fecha_pago DESC
        ''', (codigo,)).fetchall()
        
        # Obtener historial de cambios (si existe tabla de auditoría)
        historial = []
        
        conn.close()
        
        return jsonify({
            'asesoria': dict(asesoria),
            'documentos': [dict(d) for d in documentos],
            'pagos': [dict(p) for p in pagos],
            'historial': historial
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@asesorias_admin_bp.route('/admin/asesorias/<codigo>/reasignar', methods=['POST'])
@admin_required
def reasignar_asesoria(codigo):
    """Reasignar una asesoría a otro asesor"""
    try:
        nuevo_asesor_id = request.json.get('asesor_id')
        motivo = request.json.get('motivo', '')
        
        if not nuevo_asesor_id:
            return jsonify({'error': 'Debe seleccionar un asesor'}), 400
        
        conn = get_db_connection()
        
        # Verificar que la asesoría existe
        asesoria = conn.execute(
            'SELECT * FROM asesorias WHERE codigo_asesoria = ?', (codigo,)
        ).fetchone()
        
        if not asesoria:
            return jsonify({'error': 'Asesoría no encontrada'}), 404
        
        # Verificar que el asesor existe y está activo
        asesor = conn.execute(
            'SELECT nombre, apellidos FROM asesores WHERE id_asesor = ? AND estado = "Activo"',
            (nuevo_asesor_id,)
        ).fetchone()
        
        if not asesor:
            return jsonify({'error': 'Asesor no encontrado o inactivo'}), 400
        
        # Actualizar la asignación
        conn.execute('''
            UPDATE asesorias 
            SET asesor_asignado = ?, fecha_modificacion = ?
            WHERE codigo_asesoria = ?
        ''', (nuevo_asesor_id, datetime.now(), codigo))
        
        # Registrar el cambio en historial (si existe tabla de auditoría)
        # conn.execute('''
        #     INSERT INTO historial_asesorias (codigo_asesoria, accion, detalles, usuario_admin, fecha)
        #     VALUES (?, ?, ?, ?, ?)
        # ''', (codigo, 'Reasignación', f'Reasignado a {asesor["nombre"]} {asesor["apellidos"]}. Motivo: {motivo}', 
        #       session['user_id'], datetime.now()))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': f'Asesoría reasignada exitosamente a {asesor["nombre"]} {asesor["apellidos"]}'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@asesorias_admin_bp.route('/admin/asesorias/<codigo>/cancelar', methods=['POST'])
@admin_required
def cancelar_asesoria(codigo):
    """Cancelar una asesoría"""
    try:
        motivo = request.json.get('motivo', '')
        
        conn = get_db_connection()
        
        # Verificar que la asesoría existe y se puede cancelar
        asesoria = conn.execute(
            'SELECT estado FROM asesorias WHERE codigo_asesoria = ?', (codigo,)
        ).fetchone()
        
        if not asesoria:
            return jsonify({'error': 'Asesoría no encontrada'}), 404
        
        if asesoria['estado'] in ['Completada', 'Cancelada']:
            return jsonify({'error': 'No se puede cancelar una asesoría completada o ya cancelada'}), 400
        
        # Cancelar la asesoría
        conn.execute('''
            UPDATE asesorias 
            SET estado = 'Cancelada', motivo_cancelacion = ?, fecha_modificacion = ?
            WHERE codigo_asesoria = ?
        ''', (motivo, datetime.now(), codigo))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': 'Asesoría cancelada exitosamente'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@asesorias_admin_bp.route('/admin/asesorias/<codigo>/editar', methods=['GET', 'POST'])
@admin_required
def editar_asesoria(codigo):
    """Editar una asesoría"""
    try:
        conn = get_db_connection()
        
        if request.method == 'POST':
            # Obtener datos del formulario
            tipo_asesoria = request.form.get('tipo_asesoria')
            fecha_asesoria = request.form.get('fecha_asesoria')
            hora_asesoria = request.form.get('hora_asesoria')
            estado = request.form.get('estado')
            notas = request.form.get('notas', '')
            
            # Combinar fecha y hora
            if fecha_asesoria and hora_asesoria:
                fecha_completa = f"{fecha_asesoria} {hora_asesoria}"
                fecha_asesoria_dt = datetime.strptime(fecha_completa, '%Y-%m-%d %H:%M')
            else:
                fecha_asesoria_dt = None
            
            # Actualizar asesoría
            conn.execute('''
                UPDATE asesorias 
                SET tipo_asesoria = ?, fecha_asesoria = ?, estado = ?, 
                    notas = ?, fecha_modificacion = ?
                WHERE codigo_asesoria = ?
            ''', (tipo_asesoria, fecha_asesoria_dt, estado, notas, datetime.now(), codigo))
            
            conn.commit()
            conn.close()
            
            flash('Asesoría actualizada exitosamente.', 'success')
            return redirect(url_for('asesorias_admin.listar_asesorias'))
        
        # GET - Mostrar formulario de edición
        asesoria = conn.execute(
            'SELECT * FROM asesorias WHERE codigo_asesoria = ?', (codigo,)
        ).fetchone()
        
        if not asesoria:
            flash('Asesoría no encontrada.', 'error')
            return redirect(url_for('asesorias_admin.listar_asesorias'))
        
        # Obtener lista de asesores
        asesores = conn.execute('''
            SELECT id_asesor, nombre, apellidos, especialidad
            FROM asesores 
            WHERE estado = 'Activo'
            ORDER BY nombre, apellidos
        ''').fetchall()
        
        conn.close()
        
        return render_template('admin/editar_asesoria.html', 
                             asesoria=asesoria, asesores=asesores)
        
    except Exception as e:
        flash(f'Error al editar asesoría: {str(e)}', 'error')
        return redirect(url_for('asesorias_admin.listar_asesorias'))

@asesorias_admin_bp.route('/admin/asesorias/crear', methods=['GET', 'POST'])
@admin_required
def crear_asesoria():
    """Crear una nueva asesoría (para casos especiales)"""
    if request.method == 'POST':
        try:
            # Obtener datos del formulario
            id_usuario = request.form.get('id_usuario')
            tipo_asesoria = request.form.get('tipo_asesoria')
            fecha_asesoria = request.form.get('fecha_asesoria')
            hora_asesoria = request.form.get('hora_asesoria')
            asesor_asignado = request.form.get('asesor_asignado')
            notas = request.form.get('notas', '')
            monto = request.form.get('monto', 0)
            
            # Validaciones
            if not id_usuario or not tipo_asesoria:
                flash('Usuario y tipo de asesoría son obligatorios.', 'error')
                return render_template('admin/crear_asesoria.html')
            
            conn = get_db_connection()
            
            # Generar código único para la asesoría
            import random
            import string
            codigo_asesoria = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            
            # Verificar que el código no existe
            while conn.execute('SELECT codigo_asesoria FROM asesorias WHERE codigo_asesoria = ?', (codigo_asesoria,)).fetchone():
                codigo_asesoria = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            
            # Combinar fecha y hora
            fecha_asesoria_dt = None
            if fecha_asesoria and hora_asesoria:
                fecha_completa = f"{fecha_asesoria} {hora_asesoria}"
                fecha_asesoria_dt = datetime.strptime(fecha_completa, '%Y-%m-%d %H:%M')
            
            # Crear asesoría
            conn.execute('''
                INSERT INTO asesorias (codigo_asesoria, id_usuario, tipo_asesoria, 
                                     fecha_asesoria, asesor_asignado, estado, notas, 
                                     monto, fecha_creacion)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (codigo_asesoria, id_usuario, tipo_asesoria, fecha_asesoria_dt,
                  asesor_asignado, 'Pendiente', notas, monto, datetime.now()))
            
            conn.commit()
            conn.close()
            
            flash(f'Asesoría {codigo_asesoria} creada exitosamente.', 'success')
            return redirect(url_for('asesorias_admin.listar_asesorias'))
            
        except Exception as e:
            flash(f'Error al crear asesoría: {str(e)}', 'error')
            return render_template('admin/crear_asesoria.html')
    
    # GET - Mostrar formulario
    try:
        conn = get_db_connection()
        
        # Obtener usuarios activos
        usuarios = conn.execute('''
            SELECT id_usuario, nombres, apellidos, correo
            FROM usuarios 
            WHERE estado = 'Activo' AND rol = 'Cliente'
            ORDER BY nombres, apellidos
        ''').fetchall()
        
        # Obtener asesores activos
        asesores = conn.execute('''
            SELECT id_asesor, nombre, apellidos, especialidad
            FROM asesores 
            WHERE estado = 'Activo'
            ORDER BY nombre, apellidos
        ''').fetchall()
        
        conn.close()
        
        return render_template('admin/crear_asesoria.html', 
                             usuarios=usuarios, asesores=asesores)
        
    except Exception as e:
        flash(f'Error al cargar formulario: {str(e)}', 'error')
        return redirect(url_for('asesorias_admin.listar_asesorias'))

@asesorias_admin_bp.route('/admin/asesorias/exportar')
@admin_required
def exportar_asesorias():
    """Exportar asesorías a CSV/Excel"""
    try:
        formato = request.args.get('formato', 'csv')
        
        conn = get_db_connection()
        
        asesorias = conn.execute('''
            SELECT a.codigo_asesoria, a.tipo_asesoria, a.fecha_asesoria, a.estado,
                   a.monto, a.estado_pago,
                   u.nombres || ' ' || u.apellidos as cliente,
                   u.correo as cliente_correo,
                   ase.nombre || ' ' || ase.apellidos as asesor
            FROM asesorias a
            LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
            LEFT JOIN asesores ase ON a.asesor_asignado = ase.id_asesor
            ORDER BY a.fecha_asesoria DESC
        ''').fetchall()
        
        conn.close()
        
        if formato == 'csv':
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Escribir encabezados
            writer.writerow(['Código', 'Tipo', 'Fecha', 'Estado', 'Monto', 
                           'Estado Pago', 'Cliente', 'Correo Cliente', 'Asesor'])
            
            # Escribir datos
            for asesoria in asesorias:
                writer.writerow([
                    asesoria['codigo_asesoria'],
                    asesoria['tipo_asesoria'],
                    asesoria['fecha_asesoria'],
                    asesoria['estado'],
                    asesoria['monto'],
                    asesoria['estado_pago'],
                    asesoria['cliente'],
                    asesoria['cliente_correo'],
                    asesoria['asesor']
                ])
            
            output.seek(0)
            
            from flask import Response
            return Response(
                output.getvalue(),
                mimetype='text/csv',
                headers={'Content-Disposition': f'attachment; filename=asesorias_{datetime.now().strftime("%Y%m%d")}.csv'}
            )
        
        # TODO: Implementar exportación a Excel
        return jsonify({'error': 'Formato no soportado'}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

asesorias_admin_bp = asesorias_admin