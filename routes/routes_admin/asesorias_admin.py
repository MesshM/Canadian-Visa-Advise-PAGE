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
        
        # Construir consulta con filtros
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
        print(f"DEBUG: Ruta llamada con código: {codigo}, tipo: {type(codigo)}")
        
        # Verificar que el request tiene contenido JSON
        if not request.is_json:
            print("DEBUG: Request no es JSON")
            return jsonify({'error': 'Content-Type debe ser application/json'}), 400
        
        data = request.get_json()
        print(f"DEBUG: Datos recibidos: {data}")
        
        motivo = data.get('motivo', 'Eliminada por administrador') if data else 'Eliminada por administrador'
        print(f"DEBUG: Motivo: {motivo}")
        
        conn = create_connection()
        if not conn:
            print("DEBUG: Error de conexión a la base de datos")
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Verificar que la asesoría existe
        print(f"DEBUG: Buscando asesoría con código: {codigo}")
        cursor.execute('SELECT estado, codigo_asesoria FROM tbl_asesoria WHERE codigo_asesoria = %s', (codigo,))
        asesoria = cursor.fetchone()
        
        print(f"DEBUG: Asesoría encontrada: {asesoria}")
        
        if not asesoria:
            print("DEBUG: Asesoría no encontrada en la base de datos")
            return jsonify({'error': 'Asesoría no encontrada'}), 404
        
        if asesoria['estado'] == 'Cancelada':
            print("DEBUG: Asesoría ya está cancelada")
            return jsonify({'error': 'La asesoría ya está cancelada'}), 400
        
        # Cancelar la asesoría en lugar de eliminarla físicamente
        print(f"DEBUG: Actualizando estado de asesoría {codigo} a Cancelada")
        cursor.execute('''
            UPDATE tbl_asesoria 
            SET estado = 'Cancelada', descripcion = CONCAT(COALESCE(descripcion, ''), ' - CANCELADA: ', %s)
            WHERE codigo_asesoria = %s
        ''', (motivo, codigo))
        
        print(f"DEBUG: Filas afectadas en tbl_asesoria: {cursor.rowcount}")
        
        if cursor.rowcount == 0:
            print("DEBUG: No se pudo actualizar la asesoría")
            return jsonify({'error': 'No se pudo actualizar la asesoría'}), 500
        
        # También cancelar pagos pendientes si existen
        cursor.execute('''
            UPDATE tbl_pago_asesoria 
            SET estado_pago = 'Cancelado'
            WHERE codigo_asesoria = %s AND estado_pago = 'Pendiente'
        ''', (codigo,))
        
        print(f"DEBUG: Filas afectadas en tbl_pago_asesoria: {cursor.rowcount}")
        
        conn.commit()
        conn.close()
        
        print("DEBUG: Eliminación exitosa")
        
        return jsonify({
            'success': True,
            'mensaje': 'Asesoría eliminada (cancelada) exitosamente'
        })
        
    except Error as e:
        print(f"DEBUG: Error de base de datos: {str(e)}")
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    except Exception as e:
        print(f"DEBUG: Error inesperado: {str(e)}")
        import traceback
        print(f"DEBUG: Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Error inesperado: {str(e)}'}), 500

@asesorias_admin_bp.route('/admin/asesorias/<int:codigo>/eliminar_fisico', methods=['POST'])
@admin_required
def eliminar_asesoria_fisico(codigo):
    """Elimina físicamente una asesoría y sus pagos asociados de la base de datos"""
    try:
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500

        cursor = conn.cursor()

        # Eliminar pagos asociados primero (si existen)
        cursor.execute('DELETE FROM tbl_pago_asesoria WHERE codigo_asesoria = %s', (codigo,))
        # Eliminar la asesoría
        cursor.execute('DELETE FROM tbl_asesoria WHERE codigo_asesoria = %s', (codigo,))

        if cursor.rowcount == 0:
            conn.rollback()
            conn.close()
            return jsonify({'error': 'No se encontró la asesoría o ya fue eliminada'}), 404

        conn.commit()
        conn.close()
        return jsonify({'success': True, 'mensaje': 'Asesoría eliminada permanentemente'})

    except Error as e:
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Error inesperado: {str(e)}'}), 500

@asesorias_admin_bp.route('/admin/asesorias/crear', methods=['POST'])
@admin_required
def crear_asesoria():
    """Crear una nueva asesoría"""
    try:
        data = request.get_json()
        
        # Validar datos requeridos
        if not data:
            return jsonify({'error': 'No se recibieron datos'}), 400
        
        # Validar campos requeridos
        campos_requeridos = ['cliente_correo', 'tipo_asesoria']
        for campo in campos_requeridos:
            if not data.get(campo):
                return jsonify({'error': f'El campo {campo} es requerido'}), 400
        
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Buscar o crear el usuario/solicitante
        cliente_correo = data['cliente_correo'].strip().lower()
        cliente_nombre = data.get('cliente_nombre', '').strip()
        
        # Verificar si el usuario ya existe
        cursor.execute('SELECT id_usuario FROM tbl_usuario WHERE correo = %s', (cliente_correo,))
        usuario_existente = cursor.fetchone()
        
        if usuario_existente:
            id_usuario = usuario_existente['id_usuario']
            
            # Verificar si ya es solicitante
            cursor.execute('SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s', (id_usuario,))
            solicitante_existente = cursor.fetchone()
            
            if solicitante_existente:
                id_solicitante = solicitante_existente['id_solicitante']
            else:
                # Crear registro de solicitante
                cursor.execute('INSERT INTO tbl_solicitante (id_usuario) VALUES (%s)', (id_usuario,))
                id_solicitante = cursor.lastrowid
        else:
            # Crear nuevo usuario
            if not cliente_nombre:
                return jsonify({'error': 'El nombre del cliente es requerido para usuarios nuevos'}), 400
            
            # Separar nombre y apellidos
            nombres_completos = cliente_nombre.split()
            nombres = nombres_completos[0] if nombres_completos else 'Cliente'
            apellidos = ' '.join(nombres_completos[1:]) if len(nombres_completos) > 1 else 'Nuevo'
            
            cursor.execute('''
                INSERT INTO tbl_usuario (nombres, apellidos, correo, contrasena, correo_verificado)
                VALUES (%s, %s, %s, %s, %s)
            ''', (nombres, apellidos, cliente_correo, 'temp_password_admin', 0))
            
            id_usuario = cursor.lastrowid
            
            # Crear registro de solicitante
            cursor.execute('INSERT INTO tbl_solicitante (id_usuario) VALUES (%s)', (id_usuario,))
            id_solicitante = cursor.lastrowid
        
        # Buscar asesor si se especifica
        id_asesor = None
        asesor_asignado = data.get('asesor_asignado', '').strip()
        
        if asesor_asignado:
            cursor.execute('''
                SELECT id_asesor FROM tbl_asesor 
                WHERE nombre LIKE %s OR CONCAT(nombre, ' ', apellidos) LIKE %s
                LIMIT 1
            ''', (f'%{asesor_asignado}%', f'%{asesor_asignado}%'))
            
            asesor_encontrado = cursor.fetchone()
            if asesor_encontrado:
                id_asesor = asesor_encontrado['id_asesor']
        
        # Preparar fecha de asesoría
        fecha_asesoria = None
        if data.get('fecha_asesoria'):
            try:
                fecha_asesoria = datetime.strptime(data['fecha_asesoria'], '%Y-%m-%dT%H:%M')
            except ValueError:
                return jsonify({'error': 'Formato de fecha inválido. Use YYYY-MM-DDTHH:MM'}), 400
        
        # Crear la asesoría
        cursor.execute('''
            INSERT INTO tbl_asesoria (
                id_solicitante, id_asesor, tipo_asesoria, fecha_asesoria, 
                estado_proceso, estado, lugar, descripcion, asesor_asignado,
                especialidad, fecha_creacion, tipo_documento, numero_documento
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            id_solicitante,
            id_asesor,
            data.get('tipo_asesoria', 'Visa de Trabajo'),
            fecha_asesoria,
            data.get('estado_proceso', 'Pendiente'),
            data.get('estado', 'Pendiente'),
            data.get('lugar', 'Virtual (Zoom)'),
            data.get('descripcion', f'Asesoría creada por administrador para {cliente_nombre or cliente_correo}'),
            asesor_asignado or None,
            data.get('especialidad', 'Inmigración Canadiense'),
            datetime.now(),
            data.get('tipo_documento', 'C.C'),
            data.get('numero_documento', '')
        ))
        
        codigo_asesoria = cursor.lastrowid
        
        # Si se especifica un monto, crear registro de pago
        if data.get('monto_pago'):
            try:
                monto = float(data['monto_pago'])
                cursor.execute('''
                    INSERT INTO tbl_pago_asesoria (
                        codigo_asesoria, monto, metodo_pago, estado_pago, fecha_pago
                    ) VALUES (%s, %s, %s, %s, %s)
                ''', (
                    codigo_asesoria,
                    monto,
                    data.get('metodo_pago', 'Pendiente'),
                    'Pendiente',
                    datetime.now()
                ))
            except (ValueError, TypeError):
                # Si el monto no es válido, continuar sin crear el pago
                pass
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': f'Asesoría creada exitosamente con código {codigo_asesoria}',
            'codigo_asesoria': codigo_asesoria
        })
        
    except Error as e:
        if conn:
            conn.rollback()
            conn.close()
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    except Exception as e:
        if conn:
            conn.rollback()
            conn.close()
        return jsonify({'error': f'Error inesperado: {str(e)}'}), 500

@asesorias_admin_bp.route('/admin/asesorias/exportar')
@admin_required
def exportar_asesorias():
    """Exportar asesorías a CSV"""
    try:
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
        
    except Error as e:
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Error inesperado: {str(e)}'}), 500

@asesorias_admin_bp.route('/admin/asesorias/<int:codigo>/cancelar', methods=['POST'])
@admin_required
def cancelar_asesoria(codigo):
    """Cancela una asesoría (cambia estado_proceso a Cancelado y libera el horario)"""
    try:
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500

        cursor = conn.cursor(dictionary=True)
        # Verificar que la asesoría existe
        cursor.execute('SELECT * FROM tbl_asesoria WHERE codigo_asesoria = %s', (codigo,))
        asesoria = cursor.fetchone()
        if not asesoria:
            return jsonify({'error': 'Asesoría no encontrada'}), 404

        # Cambiar estado_proceso a Cancelado y liberar horario
        cursor.execute('''
            UPDATE tbl_asesoria
            SET estado_proceso = %s, fecha_asesoria = NULL
            WHERE codigo_asesoria = %s
        ''', ('Cancelado', codigo))

        conn.commit()
        conn.close()
        return jsonify({'success': True, 'mensaje': 'Asesoría cancelada correctamente'})
    except Error as e:
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Error inesperado: {str(e)}'}), 500
