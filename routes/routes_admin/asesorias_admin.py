from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from functools import wraps
import mysql.connector
from mysql.connector import Error
from datetime import datetime, timedelta
from config.database import create_connection

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

@asesorias_admin_bp.route('/admin/asesorias')
@admin_required
def listar_asesorias():
    """Listar todas las asesorías del sistema"""
    try:
        conn = create_connection()
        if not conn:
            flash('Error de conexión a la base de datos', 'error')
            return render_template('admin/asesorias_admin.html', asesorias=[], asesores=[])
        
        cursor = conn.cursor(dictionary=True)
        
        # Obtener parámetros de filtro
        buscar = request.args.get('buscar', '')
        estado_filtro = request.args.get('estado', '')
        fecha_desde = request.args.get('fecha_desde', '')
        fecha_hasta = request.args.get('fecha_hasta', '')
        pagina = int(request.args.get('pagina', 1))
        por_pagina = 20
        
        # Construir consulta con filtros - CORREGIDO: estado viene de tbl_asesoria
        query = '''
            SELECT a.codigo_asesoria, a.fecha_asesoria, a.tipo_asesoria, 
                   COALESCE(p.estado_pago, 'Pendiente') AS estado_pago, 
                   a.estado_proceso, a.estado,
                   a.lugar, a.descripcion, a.asesor_asignado,
                   CONCAT(u.nombres, ' ', u.apellidos) as cliente_nombre,
                   u.correo as cliente_correo,
                   ase.nombre as asesor_nombre
            FROM tbl_asesoria a
            LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            LEFT JOIN tbl_asesor ase ON a.id_asesor = ase.id_asesor
            LEFT JOIN tbl_pago_asesoria p ON a.codigo_asesoria = p.codigo_asesoria
            WHERE 1=1
        '''
        params = []
        
        if buscar:
            query += ' AND (u.nombres LIKE %s OR u.apellidos LIKE %s OR a.codigo_asesoria LIKE %s)'
            params.extend([f'%{buscar}%', f'%{buscar}%', f'%{buscar}%'])
        
        # CORREGIDO: Filtrar por estado de la asesoría (a.estado)
        if estado_filtro:
            query += ' AND a.estado = %s'
            params.append(estado_filtro)
        
        if fecha_desde:
            query += ' AND DATE(a.fecha_asesoria) >= %s'
            params.append(fecha_desde)
        
        if fecha_hasta:
            query += ' AND DATE(a.fecha_asesoria) <= %s'
            params.append(fecha_hasta)
        
        # Contar total de asesorías
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as subquery"
        cursor.execute(count_query, params)
        total_asesorias = cursor.fetchone()['total']
        
        # Agregar paginación
        query += ' ORDER BY a.fecha_asesoria DESC LIMIT %s OFFSET %s'
        params.extend([por_pagina, (pagina - 1) * por_pagina])
        
        cursor.execute(query, params)
        asesorias = cursor.fetchall()
        
        # Obtener lista de asesores para filtros
        cursor.execute('''
            SELECT id_asesor, nombre, apellidos
            FROM tbl_asesor 
            ORDER BY nombre, apellidos
        ''')
        asesores = cursor.fetchall()
        
        conn.close()
        
        return render_template('admin/asesorias_admin.html',
                             asesorias=asesorias,
                             asesores=asesores,
                             total_asesorias=total_asesorias,
                             pagina_actual=pagina,
                             total_paginas=(total_asesorias + por_pagina - 1) // por_pagina)
                             
    except Error as e:
        flash(f'Error al cargar asesorías: {str(e)}', 'error')
        return render_template('admin/asesorias_admin.html', asesorias=[], asesores=[])

@asesorias_admin_bp.route('/admin/asesorias/<int:codigo>/cambiar-estado', methods=['POST'])
@admin_required
def cambiar_estado_asesoria(codigo):
    """Cambiar estado de una asesoría"""
    try:
        nuevo_estado = request.json.get('estado')
        
        if nuevo_estado not in ['Pendiente', 'Confirmada', 'En Proceso', 'Completada', 'Cancelada']:
            return jsonify({'error': 'Estado no válido'}), 400
        
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = conn.cursor()
        
        cursor.execute(
            'UPDATE tbl_asesoria SET estado = %s WHERE codigo_asesoria = %s',
            (nuevo_estado, codigo)
        )
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Asesoría no encontrada'}), 404
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': f'Estado cambiado a {nuevo_estado} exitosamente'
        })
        
    except Error as e:
        return jsonify({'error': str(e)}), 500

@asesorias_admin_bp.route('/admin/asesorias/<int:codigo>/detalles')
@admin_required
def ver_detalles_asesoria(codigo):
    """Ver detalles completos de una asesoría"""
    try:
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Obtener información de la asesoría
        cursor.execute('''
            SELECT a.*, 
                   CONCAT(u.nombres, ' ', u.apellidos) as cliente_nombre,
                   u.correo as cliente_correo, u.celular as cliente_celular,
                   ase.nombre as asesor_nombre, ase.correo as asesor_correo
            FROM tbl_asesoria a
            LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            LEFT JOIN tbl_asesor ase ON a.id_asesor = ase.id_asesor
            WHERE a.codigo_asesoria = %s
        ''', (codigo,))
        
        asesoria = cursor.fetchone()
        
        if not asesoria:
            return jsonify({'error': 'Asesoría no encontrada'}), 404
        
        # Obtener información de pago si existe
        cursor.execute('''
            SELECT * FROM tbl_pago_asesoria 
            WHERE codigo_asesoria = %s
        ''', (codigo,))
        pago = cursor.fetchone()
        
        conn.close()
        
        return jsonify({
            'success': True,
            'asesoria': dict(asesoria),
            'pago': dict(pago) if pago else None
        })
        
    except Error as e:
        return jsonify({'error': str(e)}), 500

@asesorias_admin_bp.route('/admin/asesorias/estadisticas')
@admin_required
def estadisticas_asesorias():
    """Obtener estadísticas de asesorías"""
    try:
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Asesorías por mes (últimos 6 meses)
        cursor.execute('''
            SELECT DATE_FORMAT(fecha_asesoria, '%Y-%m') as mes, 
                   COUNT(*) as cantidad
            FROM tbl_asesoria 
            WHERE fecha_asesoria >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(fecha_asesoria, '%Y-%m')
            ORDER BY mes
        ''')
        asesorias_por_mes = cursor.fetchall()
        
        # Asesorías por estado
        cursor.execute('''
            SELECT estado, COUNT(*) as cantidad
            FROM tbl_asesoria
            GROUP BY estado
        ''')
        asesorias_por_estado = cursor.fetchall()
        
        # Asesorías por tipo
        cursor.execute('''
            SELECT tipo_asesoria, COUNT(*) as cantidad
            FROM tbl_asesoria
            GROUP BY tipo_asesoria
            ORDER BY cantidad DESC
        ''')
        asesorias_por_tipo = cursor.fetchall()
        
        conn.close()
        
        return jsonify({
            'asesorias_por_mes': [dict(row) for row in asesorias_por_mes],
            'asesorias_por_estado': [dict(row) for row in asesorias_por_estado],
            'asesorias_por_tipo': [dict(row) for row in asesorias_por_tipo]
        })
        
    except Error as e:
        return jsonify({'error': str(e)}), 500

@asesorias_admin_bp.route('/admin/asesorias/<int:codigo>/ver')
@admin_required
def ver_asesoria(codigo):
    """Ver detalles completos de una asesoría"""
    try:
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Obtener información completa de la asesoría
        cursor.execute('''
            SELECT a.codigo_asesoria, a.fecha_asesoria, a.tipo_asesoria, a.descripcion,
                   a.lugar, a.estado, a.estado_proceso, a.asesor_asignado,
                   a.tipo_documento, a.numero_documento, a.numero_asesoria,
                   a.nombre_asesor, a.especialidad, a.fecha_creacion,
                   CONCAT(u.nombres, ' ', u.apellidos) as cliente_nombre,
                   u.correo as cliente_correo, u.celular as cliente_telefono,
                   u.fecha_nacimiento as cliente_fecha_nacimiento,
                   ase.nombre as asesor_nombre, ase.correo as asesor_correo,
                   s.id_solicitante
            FROM tbl_asesoria a
            LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            LEFT JOIN tbl_asesor ase ON a.id_asesor = ase.id_asesor
            WHERE a.codigo_asesoria = %s
        ''', (codigo,))
        
        asesoria = cursor.fetchone()
        
        if not asesoria:
            return jsonify({'error': 'Asesoría no encontrada'}), 404
        
        # Obtener información de pago si existe
        cursor.execute('''
            SELECT id_pago, monto, metodo_pago, estado_pago, fecha_pago, referencia_pago
            FROM tbl_pago_asesoria
            WHERE codigo_asesoria = %s
            ORDER BY fecha_pago DESC
        ''', (codigo,))
        pagos = cursor.fetchall()
        
        conn.close()
        
        # Formatear fechas para mostrar
        if asesoria['fecha_asesoria']:
            asesoria['fecha_asesoria_formatted'] = asesoria['fecha_asesoria'].strftime('%d/%m/%Y %H:%M')
        if asesoria['fecha_creacion']:
            asesoria['fecha_creacion_formatted'] = asesoria['fecha_creacion'].strftime('%d/%m/%Y %H:%M')
        if asesoria['cliente_fecha_nacimiento']:
            asesoria['cliente_fecha_nacimiento_formatted'] = asesoria['cliente_fecha_nacimiento'].strftime('%d/%m/%Y')
        
        return jsonify({
            'success': True,
            'asesoria': dict(asesoria),
            'pagos': [dict(p) for p in pagos]
        })
        
    except Error as e:
        return jsonify({'error': str(e)}), 500

@asesorias_admin_bp.route('/admin/asesorias/<int:codigo>/reasignar', methods=['POST'])
@admin_required
def reasignar_asesoria(codigo):
    """Reasignar una asesoría a otro asesor"""
    try:
        nuevo_asesor_id = request.json.get('asesor_id')
        motivo = request.json.get('motivo', '')
        
        if not nuevo_asesor_id:
            return jsonify({'error': 'Debe seleccionar un asesor'}), 400
        
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = conn.cursor()
        
        # Verificar que la asesoría existe
        cursor.execute(
            'SELECT * FROM tbl_asesoria WHERE codigo_asesoria = %s', (codigo,)
        )
        asesoria = cursor.fetchone()
        
        if not asesoria:
            return jsonify({'error': 'Asesoría no encontrada'}), 404
        
        # Verificar que el asesor existe
        cursor.execute(
            'SELECT nombre, apellidos FROM tbl_asesor WHERE id_asesor = %s',
            (nuevo_asesor_id,)
        )
        asesor = cursor.fetchone()
        
        if not asesor:
            return jsonify({'error': 'Asesor no encontrado'}), 400
        
        # Actualizar la asignación
        cursor.execute('''
            UPDATE tbl_asesoria 
            SET id_asesor = %s
            WHERE codigo_asesoria = %s
        ''', (nuevo_asesor_id, codigo))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': f'Asesoría reasignada exitosamente a {asesor["nombre"]} {asesor["apellidos"]}'
        })
        
    except Error as e:
        return jsonify({'error': str(e)}), 500

@asesorias_admin_bp.route('/admin/asesorias/<int:codigo>/cancelar', methods=['POST'])
@admin_required
def cancelar_asesoria(codigo):
    """Cancelar una asesoría"""
    try:
        motivo = request.json.get('motivo', '')
        
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            'SELECT estado FROM tbl_asesoria WHERE codigo_asesoria = %s', (codigo,)
        )
        asesoria = cursor.fetchone()
        
        if not asesoria:
            return jsonify({'error': 'Asesoría no encontrada'}), 404
        
        if asesoria['estado'] in ['Completada', 'Cancelada']:
            return jsonify({'error': 'No se puede cancelar una asesoría completada o ya cancelada'}), 400
        
        # Cancelar la asesoría
        cursor.execute('''
            UPDATE tbl_asesoria 
            SET estado = 'Cancelada'
            WHERE codigo_asesoria = %s
        ''', (codigo,))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': 'Asesoría cancelada exitosamente'
        })
        
    except Error as e:
        return jsonify({'error': str(e)}), 500

@asesorias_admin_bp.route('/admin/asesorias/<int:codigo>/editar', methods=['GET', 'POST'])
@admin_required
def editar_asesoria(codigo):
    """Editar una asesoría"""
    try:
        conn = create_connection()
        if not conn:
            flash('Error de conexión a la base de datos', 'error')
            return redirect(url_for('asesorias_admin.listar_asesorias'))
        
        cursor = conn.cursor(dictionary=True)
        
        if request.method == 'POST':
            data = request.get_json()
            
            # Verificar que la asesoría existe
            cursor.execute('SELECT * FROM tbl_asesoria WHERE codigo_asesoria = %s', (codigo,))
            asesoria_actual = cursor.fetchone()
            
            if not asesoria_actual:
                return jsonify({'error': 'Asesoría no encontrada'}), 404
            
            # Preparar datos para actualizar
            campos_actualizables = [
                'tipo_asesoria', 'descripcion', 'lugar', 'estado', 'estado_proceso',
                'asesor_asignado', 'tipo_documento', 'numero_documento', 'especialidad'
            ]
            
            # Construir query de actualización dinámicamente
            campos_update = []
            valores = []
            
            for campo in campos_actualizables:
                if campo in data and data[campo] is not None:
                    campos_update.append(f'{campo} = %s')
                    valores.append(data[campo])
            
            # Manejar fecha_asesoria por separado si viene en el request
            if 'fecha_asesoria' in data and data['fecha_asesoria']:
                try:
                    fecha_dt = datetime.strptime(data['fecha_asesoria'], '%Y-%m-%dT%H:%M')
                    campos_update.append('fecha_asesoria = %s')
                    valores.append(fecha_dt)
                except ValueError:
                    return jsonify({'error': 'Formato de fecha inválido'}), 400
            
            if not campos_update:
                return jsonify({'error': 'No hay campos para actualizar'}), 400
            
            # Agregar código de asesoría al final
            valores.append(codigo)
            
            query = f"UPDATE tbl_asesoria SET {', '.join(campos_update)} WHERE codigo_asesoria = %s"
            cursor.execute(query, valores)
            
            if cursor.rowcount == 0:
                return jsonify({'error': 'No se pudo actualizar la asesoría'}), 400
            
            conn.commit()
            conn.close()
            
            return jsonify({
                'success': True,
                'mensaje': 'Asesoría actualizada exitosamente'
            })
        
        # GET - Mostrar formulario de edición
        cursor.execute(
            'SELECT * FROM tbl_asesoria WHERE codigo_asesoria = %s', (codigo,)
        )
        asesoria = cursor.fetchone()
        
        if not asesoria:
            flash('Asesoría no encontrada.', 'error')
            return redirect(url_for('asesorias_admin.listar_asesorias'))
        
        # Obtener lista de asesores
        cursor.execute('''
            SELECT id_asesor, nombre, apellidos, especialidad
            FROM tbl_asesor 
            ORDER BY nombre, apellidos
        ''')
        asesores = cursor.fetchall()
        
        conn.close()
        
        return render_template('admin/editar_asesoria.html', 
                             asesoria=asesoria, asesores=asesores)
        
    except Error as e:
        flash(f'Error al editar asesoría: {str(e)}', 'error')
        return redirect(url_for('asesorias_admin.listar_asesorias'))

@asesorias_admin_bp.route('/admin/asesorias/<int:codigo>/eliminar', methods=['POST'])
@admin_required
def eliminar_asesoria(codigo):
    """Eliminar una asesoría (cambiar estado a Cancelada)"""
    try:
        data = request.get_json()
        motivo = data.get('motivo', 'Eliminada por administrador')
        
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Verificar que la asesoría existe
        cursor.execute('SELECT estado FROM tbl_asesoria WHERE codigo_asesoria = %s', (codigo,))
        asesoria = cursor.fetchone()
        
        if not asesoria:
            return jsonify({'error': 'Asesoría no encontrada'}), 404
        
        if asesoria['estado'] == 'Cancelada':
            return jsonify({'error': 'La asesoría ya está cancelada'}), 400
        
        # Cancelar la asesoría en lugar de eliminarla físicamente
        cursor.execute('''
            UPDATE tbl_asesoria 
            SET estado = 'Cancelada', descripcion = CONCAT(COALESCE(descripcion, ''), ' - CANCELADA: ', %s)
            WHERE codigo_asesoria = %s
        ''', (motivo, codigo))
        
        # También cancelar pagos pendientes si existen
        cursor.execute('''
            UPDATE tbl_pago_asesoria 
            SET estado_pago = 'Cancelado'
            WHERE codigo_asesoria = %s AND estado_pago = 'Pendiente'
        ''', (codigo,))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': 'Asesoría eliminada (cancelada) exitosamente'
        })
        
    except Error as e:
        return jsonify({'error': str(e)}), 500

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
            id_asesor = request.form.get('asesor_asignado')
            notas = request.form.get('notas', '')
            monto = request.form.get('monto', 0)
            
            # Validaciones
            if not id_usuario or not tipo_asesoria:
                flash('Usuario y tipo de asesoría son obligatorios.', 'error')
                return render_template('admin/crear_asesoria.html')
            
            conn = create_connection()
            if not conn:
                flash('Error de conexión a la base de datos', 'error')
                return render_template('admin/crear_asesoria.html')
            
            cursor = conn.cursor()
            
            # Generar código único para la asesoría
            import random
            import string
            codigo_asesoria = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            
            # Verificar que el código no existe
            cursor.execute('SELECT codigo_asesoria FROM tbl_asesoria WHERE codigo_asesoria = %s', (codigo_asesoria,))
            while cursor.fetchone():
                codigo_asesoria = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
                cursor.execute('SELECT codigo_asesoria FROM tbl_asesoria WHERE codigo_asesoria = %s', (codigo_asesoria,))
            
            # Combinar fecha y hora
            fecha_asesoria_dt = None
            if fecha_asesoria and hora_asesoria:
                fecha_completa = f"{fecha_asesoria} {hora_asesoria}"
                fecha_asesoria_dt = datetime.strptime(fecha_completa, '%Y-%m-%d %H:%M')
            
            # Crear asesoría
            cursor.execute('''
                INSERT INTO tbl_asesoria (codigo_asesoria, id_solicitante, tipo_asesoria, 
                                     fecha_asesoria, id_asesor, estado, descripcion, 
                                     fecha_creacion)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ''', (codigo_asesoria, id_usuario, tipo_asesoria, fecha_asesoria_dt,
                  id_asesor, 'Pendiente', notas, datetime.now()))
            
            conn.commit()
            conn.close()
            
            flash(f'Asesoría {codigo_asesoria} creada exitosamente.', 'success')
            return redirect(url_for('asesorias_admin.listar_asesorias'))
            
        except Error as e:
            flash(f'Error al crear asesoría: {str(e)}', 'error')
            return render_template('admin/crear_asesoria.html')
    
    # GET - Mostrar formulario
    try:
        conn = create_connection()
        if not conn:
            flash('Error de conexión a la base de datos', 'error')
            return redirect(url_for('asesorias_admin.listar_asesorias'))
        
        cursor = conn.cursor(dictionary=True)
        
        # Obtener usuarios activos (solicitantes)
        cursor.execute('''
            SELECT s.id_solicitante, u.nombres, u.apellidos, u.correo
            FROM tbl_solicitante s
            JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            ORDER BY u.nombres, u.apellidos
        ''')
        usuarios = cursor.fetchall()
        
        # Obtener asesores
        cursor.execute('''
            SELECT id_asesor, nombre, apellidos, especialidad
            FROM tbl_asesor 
            ORDER BY nombre, apellidos
        ''')
        asesores = cursor.fetchall()
        
        conn.close()
        
        return render_template('admin/crear_asesoria.html', 
                             usuarios=usuarios, asesores=asesores)
        
    except Error as e:
        flash(f'Error al cargar formulario: {str(e)}', 'error')
        return redirect(url_for('asesorias_admin.listar_asesorias'))

@asesorias_admin_bp.route('/admin/asesorias/exportar')
@admin_required
def exportar_asesorias():
    """Exportar asesorías a CSV/Excel"""
    try:
        formato = request.args.get('formato', 'csv')
        
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Consulta para obtener todas las asesorías con información completa
        cursor.execute('''
            SELECT a.codigo_asesoria, a.fecha_asesoria, a.tipo_asesoria, a.estado,
                   a.estado_proceso, a.lugar, a.descripcion, a.asesor_asignado,
                   a.tipo_documento, a.numero_documento, a.especialidad,
                   a.fecha_creacion,
                   CONCAT(u.nombres, ' ', u.apellidos) as cliente_nombre,
                   u.correo as cliente_correo, u.celular as cliente_telefono,
                   ase.nombre as asesor_nombre,
                   COALESCE(p.estado_pago, 'Pendiente') as estado_pago,
                   p.monto as monto_pago, p.metodo_pago, p.fecha_pago
            FROM tbl_asesoria a
            LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            LEFT JOIN tbl_asesor ase ON a.id_asesor = ase.id_asesor
            LEFT JOIN tbl_pago_asesoria p ON a.codigo_asesoria = p.codigo_asesoria
            ORDER BY a.fecha_asesoria DESC
        ''')
        
        asesorias = cursor.fetchall()
        conn.close()
        
        if formato == 'csv':
            import csv
            import io
            from flask import Response
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Escribir encabezados
            writer.writerow([
                'Código Asesoría', 'Fecha Asesoría', 'Tipo Asesoría', 'Estado', 
                'Estado Proceso', 'Lugar', 'Cliente', 'Correo Cliente', 'Teléfono Cliente',
                'Asesor Asignado', 'Asesor Nombre', 'Especialidad', 'Tipo Documento',
                'Número Documento', 'Estado Pago', 'Monto Pago', 'Método Pago',
                'Fecha Pago', 'Fecha Creación', 'Descripción'
            ])
            
            # Escribir datos
            for asesoria in asesorias:
                writer.writerow([
                    asesoria['codigo_asesoria'],
                    asesoria['fecha_asesoria'].strftime('%d/%m/%Y %H:%M') if asesoria['fecha_asesoria'] else '',
                    asesoria['tipo_asesoria'] or '',
                    asesoria['estado'] or '',
                    asesoria['estado_proceso'] or '',
                    asesoria['lugar'] or '',
                    asesoria['cliente_nombre'] or '',
                    asesoria['cliente_correo'] or '',
                    asesoria['cliente_telefono'] or '',
                    asesoria['asesor_asignado'] or '',
                    asesoria['asesor_nombre'] or '',
                    asesoria['especialidad'] or '',
                    asesoria['tipo_documento'] or '',
                    asesoria['numero_documento'] or '',
                    asesoria['estado_pago'] or '',
                    asesoria['monto_pago'] or '',
                    asesoria['metodo_pago'] or '',
                    asesoria['fecha_pago'].strftime('%d/%m/%Y %H:%M') if asesoria['fecha_pago'] else '',
                    asesoria['fecha_creacion'].strftime('%d/%m/%Y %H:%M') if asesoria['fecha_creacion'] else '',
                    (asesoria['descripcion'] or '').replace('\n', ' ').replace('\r', ' ')
                ])
            
            output.seek(0)
            
            return Response(
                output.getvalue(),
                mimetype='text/csv',
                headers={
                    'Content-Disposition': f'attachment; filename=asesorias_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
                }
            )
        
        elif formato == 'excel':
            try:
                import pandas as pd
                import io
                from flask import Response
                
                # Preparar datos para DataFrame
                data = []
                for asesoria in asesorias:
                    data.append({
                        'Código Asesoría': asesoria['codigo_asesoria'],
                        'Fecha Asesoría': asesoria['fecha_asesoria'].strftime('%d/%m/%Y %H:%M') if asesoria['fecha_asesoria'] else '',
                        'Tipo Asesoría': asesoria['tipo_asesoria'] or '',
                        'Estado': asesoria['estado'] or '',
                        'Estado Proceso': asesoria['estado_proceso'] or '',
                        'Lugar': asesoria['lugar'] or '',
                        'Cliente': asesoria['cliente_nombre'] or '',
                        'Correo Cliente': asesoria['cliente_correo'] or '',
                        'Teléfono Cliente': asesoria['cliente_telefono'] or '',
                        'Asesor Asignado': asesoria['asesor_asignado'] or '',
                        'Asesor Nombre': asesoria['asesor_nombre'] or '',
                        'Especialidad': asesoria['especialidad'] or '',
                        'Tipo Documento': asesoria['tipo_documento'] or '',
                        'Número Documento': asesoria['numero_documento'] or '',
                        'Estado Pago': asesoria['estado_pago'] or '',
                        'Monto Pago': asesoria['monto_pago'] or '',
                        'Método Pago': asesoria['metodo_pago'] or '',
                        'Fecha Pago': asesoria['fecha_pago'].strftime('%d/%m/%Y %H:%M') if asesoria['fecha_pago'] else '',
                        'Fecha Creación': asesoria['fecha_creacion'].strftime('%d/%m/%Y %H:%M') if asesoria['fecha_creacion'] else '',
                        'Descripción': (asesoria['descripcion'] or '').replace('\n', ' ').replace('\r', ' ')
                    })
                
                # Crear DataFrame
                df = pd.DataFrame(data)
                
                # Crear archivo Excel en memoria
                output = io.BytesIO()
                with pd.ExcelWriter(output, engine='openpyxl') as writer:
                    df.to_excel(writer, sheet_name='Asesorías', index=False)
                    
                    # Obtener el workbook y worksheet para formatear
                    workbook = writer.book
                    worksheet = writer.sheets['Asesorías']
                    
                    # Ajustar ancho de columnas
                    for column in worksheet.columns:
                        max_length = 0
                        column_letter = column[0].column_letter
                        for cell in column:
                            try:
                                if len(str(cell.value)) > max_length:
                                    max_length = len(str(cell.value))
                            except:
                                pass
                        adjusted_width = min(max_length + 2, 50)
                        worksheet.column_dimensions[column_letter].width = adjusted_width
                
                output.seek(0)
                
                return Response(
                    output.getvalue(),
                    mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    headers={
                        'Content-Disposition': f'attachment; filename=asesorias_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
                    }
                )
                
            except ImportError:
                return jsonify({
                    'error': 'Pandas y openpyxl son requeridos para exportar a Excel. Instala con: pip install pandas openpyxl'
                }), 500
        
        else:
            return jsonify({'error': 'Formato no soportado. Use csv o excel'}), 400
        
    except Error as e:
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Error inesperado: {str(e)}'}), 500
