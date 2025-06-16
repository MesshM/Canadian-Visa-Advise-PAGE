from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session, send_file
from functools import wraps
import sqlite3
import json
from datetime import datetime, timedelta
import io
import csv

reportes_admin = Blueprint('reportes_admin', __name__)

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

@reportes_admin.route('/admin/reportes')
@admin_required
def panel_reportes():
    """Panel principal de reportes"""
    try:
        conn = get_db_connection()
        
        # Obtener reportes recientes
        reportes_recientes = conn.execute('''
            SELECT id_reporte, nombre, tipo, fecha_generacion, generado_por, estado
            FROM reportes 
            ORDER BY fecha_generacion DESC 
            LIMIT 10
        ''').fetchall()
        
        conn.close()
        
        return render_template('admin/reportes_admin.html',
                             reportes_recientes=reportes_recientes)
                             
    except Exception as e:
        flash(f'Error al cargar reportes: {str(e)}', 'error')
        return render_template('admin/reportes_admin.html', reportes_recientes=[])

@reportes_admin.route('/admin/reportes/generar-usuarios', methods=['POST'])
@admin_required
def generar_reporte_usuarios():
    """Generar reporte de usuarios"""
    try:
        formato = request.json.get('formato', 'pdf')
        fecha_inicio = request.json.get('fecha_inicio')
        fecha_fin = request.json.get('fecha_fin')
        
        conn = get_db_connection()
        
        # Construir consulta con filtros de fecha
        query = '''
            SELECT id_usuario, nombres, apellidos, correo, rol, estado, 
                   fecha_registro, ultimo_acceso
            FROM usuarios 
            WHERE 1=1
        '''
        params = []
        
        if fecha_inicio:
            query += ' AND fecha_registro >= ?'
            params.append(fecha_inicio)
        
        if fecha_fin:
            query += ' AND fecha_registro <= ?'
            params.append(fecha_fin)
        
        query += ' ORDER BY fecha_registro DESC'
        
        usuarios = conn.execute(query, params).fetchall()
        
        # Estadísticas adicionales
        total_usuarios = len(usuarios)
        usuarios_activos = len([u for u in usuarios if u['estado'] == 'Activo'])
        usuarios_por_rol = {}
        for usuario in usuarios:
            rol = usuario['rol'] or 'Cliente'
            usuarios_por_rol[rol] = usuarios_por_rol.get(rol, 0) + 1
        
        # Crear registro del reporte
        reporte_id = conn.execute('''
            INSERT INTO reportes (nombre, tipo, parametros, estado, fecha_generacion, generado_por)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            f'Reporte de Usuarios - {datetime.now().strftime("%Y-%m-%d")}',
            'usuarios',
            json.dumps({'fecha_inicio': fecha_inicio, 'fecha_fin': fecha_fin, 'formato': formato}),
            'Completado',
            datetime.now(),
            session['user_id']
        )).lastrowid
        
        conn.commit()
        conn.close()
        
        if formato == 'csv':
            return generar_csv_usuarios(usuarios)
        elif formato == 'excel':
            return generar_excel_usuarios(usuarios)
        else:  # PDF
            return generar_pdf_usuarios(usuarios, total_usuarios, usuarios_activos, usuarios_por_rol)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def generar_csv_usuarios(usuarios):
    """Generar CSV de usuarios"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Escribir encabezados
    writer.writerow(['ID', 'Nombres', 'Apellidos', 'Correo', 'Rol', 'Estado', 
                    'Fecha Registro', 'Último Acceso'])
    
    # Escribir datos
    for usuario in usuarios:
        writer.writerow([
            usuario['id_usuario'],
            usuario['nombres'],
            usuario['apellidos'],
            usuario['correo'],
            usuario['rol'],
            usuario['estado'],
            usuario['fecha_registro'],
            usuario['ultimo_acceso']
        ])
    
    output.seek(0)
    
    from flask import Response
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename=reporte_usuarios_{datetime.now().strftime("%Y%m%d")}.csv'}
    )

def generar_pdf_usuarios(usuarios, total_usuarios, usuarios_activos, usuarios_por_rol):
    """Generar PDF de usuarios"""
    # TODO: Implementar generación de PDF con reportlab
    # Por ahora retornamos los datos para generar en el frontend
    return jsonify({
        'success': True,
        'tipo': 'usuarios',
        'datos': {
            'usuarios': [dict(u) for u in usuarios],
            'estadisticas': {
                'total_usuarios': total_usuarios,
                'usuarios_activos': usuarios_activos,
                'usuarios_por_rol': usuarios_por_rol
            }
        }
    })

@reportes_admin.route('/admin/reportes/generar-asesorias', methods=['POST'])
@admin_required
def generar_reporte_asesorias():
    """Generar reporte de asesorías"""
    try:
        formato = request.json.get('formato', 'pdf')
        fecha_inicio = request.json.get('fecha_inicio')
        fecha_fin = request.json.get('fecha_fin')
        estado_filtro = request.json.get('estado')
        
        conn = get_db_connection()
        
        # Construir consulta
        query = '''
            SELECT a.codigo_asesoria, a.tipo_asesoria, a.fecha_asesoria, a.estado,
                   a.monto, a.estado_pago,
                   u.nombres || ' ' || u.apellidos as cliente,
                   ase.nombre || ' ' || ase.apellidos as asesor
            FROM asesorias a
            LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
            LEFT JOIN asesores ase ON a.asesor_asignado = ase.id_asesor
            WHERE 1=1
        '''
        params = []
        
        if fecha_inicio:
            query += ' AND a.fecha_asesoria >= ?'
            params.append(fecha_inicio)
        
        if fecha_fin:
            query += ' AND a.fecha_asesoria <= ?'
            params.append(fecha_fin)
        
        if estado_filtro:
            query += ' AND a.estado = ?'
            params.append(estado_filtro)
        
        query += ' ORDER BY a.fecha_asesoria DESC'
        
        asesorias = conn.execute(query, params).fetchall()
        
        # Estadísticas
        total_asesorias = len(asesorias)
        asesorias_por_estado = {}
        asesorias_por_tipo = {}
        ingresos_total = 0
        
        for asesoria in asesorias:
            # Por estado
            estado = asesoria['estado']
            asesorias_por_estado[estado] = asesorias_por_estado.get(estado, 0) + 1
            
            # Por tipo
            tipo = asesoria['tipo_asesoria']
            asesorias_por_tipo[tipo] = asesorias_por_tipo.get(tipo, 0) + 1
            
            # Ingresos
            if asesoria['estado_pago'] == 'Completado':
                ingresos_total += asesoria['monto'] or 0
        
        # Crear registro del reporte
        reporte_id = conn.execute('''
            INSERT INTO reportes (nombre, tipo, parametros, estado, fecha_generacion, generado_por)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            f'Reporte de Asesorías - {datetime.now().strftime("%Y-%m-%d")}',
            'asesorias',
            json.dumps({'fecha_inicio': fecha_inicio, 'fecha_fin': fecha_fin, 'estado': estado_filtro, 'formato': formato}),
            'Completado',
            datetime.now(),
            session['user_id']
        )).lastrowid
        
        conn.commit()
        conn.close()
        
        if formato == 'csv':
            return generar_csv_asesorias(asesorias)
        else:
            return jsonify({
                'success': True,
                'tipo': 'asesorias',
                'datos': {
                    'asesorias': [dict(a) for a in asesorias],
                    'estadisticas': {
                        'total_asesorias': total_asesorias,
                        'asesorias_por_estado': asesorias_por_estado,
                        'asesorias_por_tipo': asesorias_por_tipo,
                        'ingresos_total': ingresos_total
                    }
                }
            })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def generar_csv_asesorias(asesorias):
    """Generar CSV de asesorías"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Escribir encabezados
    writer.writerow(['Código', 'Tipo', 'Fecha', 'Estado', 'Monto', 'Estado Pago', 'Cliente', 'Asesor'])
    
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
            asesoria['asesor']
        ])
    
    output.seek(0)
    
    from flask import Response
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename=reporte_asesorias_{datetime.now().strftime("%Y%m%d")}.csv'}
    )

@reportes_admin.route('/admin/reportes/generar-financiero', methods=['POST'])
@admin_required
def generar_reporte_financiero():
    """Generar reporte financiero"""
    try:
        formato = request.json.get('formato', 'pdf')
        fecha_inicio = request.json.get('fecha_inicio')
        fecha_fin = request.json.get('fecha_fin')
        
        conn = get_db_connection()
        
        # Pagos en el período
        query = '''
            SELECT p.*, a.tipo_asesoria,
                   u.nombres || ' ' || u.apellidos as cliente
            FROM pagos p
            LEFT JOIN asesorias ase ON p.codigo_asesoria = ase.codigo_asesoria
            LEFT JOIN usuarios u ON ase.id_usuario = u.id_usuario
            LEFT JOIN asesorias a ON p.codigo_asesoria = a.codigo_asesoria
            WHERE 1=1
        '''
        params = []
        
        if fecha_inicio:
            query += ' AND p.fecha_pago >= ?'
            params.append(fecha_inicio)
        
        if fecha_fin:
            query += ' AND p.fecha_pago <= ?'
            params.append(fecha_fin)
        
        query += ' ORDER BY p.fecha_pago DESC'
        
        pagos = conn.execute(query, params).fetchall()
        
        # Calcular estadísticas financieras
        ingresos_total = sum(p['monto'] for p in pagos if p['estado_pago'] == 'Completado')
        pagos_pendientes = sum(p['monto'] for p in pagos if p['estado_pago'] == 'Pendiente')
        reembolsos_total = sum(p['monto_reembolsado'] or 0 for p in pagos if p['estado_pago'] == 'Reembolsado')
        
        # Ingresos por método de pago
        ingresos_por_metodo = {}
        for pago in pagos:
            if pago['estado_pago'] == 'Completado':
                metodo = pago['metodo_pago']
                ingresos_por_metodo[metodo] = ingresos_por_metodo.get(metodo, 0) + pago['monto']
        
        # Ingresos por tipo de asesoría
        ingresos_por_tipo = {}
        for pago in pagos:
            if pago['estado_pago'] == 'Completado' and pago['tipo_asesoria']:
                tipo = pago['tipo_asesoria']
                ingresos_por_tipo[tipo] = ingresos_por_tipo.get(tipo, 0) + pago['monto']
        
        # Crear registro del reporte
        reporte_id = conn.execute('''
            INSERT INTO reportes (nombre, tipo, parametros, estado, fecha_generacion, generado_por)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            f'Reporte Financiero - {datetime.now().strftime("%Y-%m-%d")}',
            'financiero',
            json.dumps({'fecha_inicio': fecha_inicio, 'fecha_fin': fecha_fin, 'formato': formato}),
            'Completado',
            datetime.now(),
            session['user_id']
        )).lastrowid
        
        conn.commit()
        conn.close()
        
        if formato == 'csv':
            return generar_csv_financiero(pagos)
        else:
            return jsonify({
                'success': True,
                'tipo': 'financiero',
                'datos': {
                    'pagos': [dict(p) for p in pagos],
                    'estadisticas': {
                        'ingresos_total': float(ingresos_total),
                        'pagos_pendientes': float(pagos_pendientes),
                        'reembolsos_total': float(reembolsos_total),
                        'ingresos_por_metodo': ingresos_por_metodo,
                        'ingresos_por_tipo': ingresos_por_tipo
                    }
                }
            })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def generar_csv_financiero(pagos):
    """Generar CSV de reporte financiero"""
    output = io.StringIO()
    writer = csv.writer(output)

    # Escribir encabezados
    writer.writerow([
        'ID Pago', 'Fecha Pago', 'Monto', 'Estado Pago', 'Método Pago',
        'Cliente', 'Tipo Asesoría', 'Monto Reembolsado'
    ])

    # Escribir datos
    for pago in pagos:
        writer.writerow([
            pago['id_pago'],
            pago['fecha_pago'],
            pago['monto'],
            pago['estado_pago'],
            pago['metodo_pago'],
            pago['cliente'],
            pago['tipo_asesoria'],
            pago['monto_reembolsado'] if 'monto_reembolsado' in pago.keys() else ''
        ])

    output.seek(0)

    from flask import Response
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename=reporte_financiero_{datetime.now().strftime("%Y%m%d")}.csv'}
    )

@reportes_admin.route('/admin/reportes/personalizado', methods=['POST'])
@admin_required
def generar_reporte_personalizado():
    """Generar reporte personalizado"""
    try:
        tipo_reporte = request.json.get('tipo_reporte')
        fecha_inicio = request.json.get('fecha_inicio')
        fecha_fin = request.json.get('fecha_fin')
        formato = request.json.get('formato', 'pdf')
        filtros = request.json.get('filtros_adicionales')
        
        if tipo_reporte == 'usuarios':
            return generar_reporte_usuarios()
        elif tipo_reporte == 'asesorias':
            return generar_reporte_asesorias()
        elif tipo_reporte == 'financiero':
            return generar_reporte_financiero()
        elif tipo_reporte == 'documentos':
            return generar_reporte_documentos()
        elif tipo_reporte == 'asesores':
            return generar_reporte_asesores()
        else:
            return jsonify({'error': 'Tipo de reporte no válido'}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reportes_admin.route('/admin/reportes/<int:id>/descargar')
@admin_required
def descargar_reporte(id):
    """Descargar un reporte generado"""
    try:
        conn = get_db_connection()
        
        reporte = conn.execute(
            'SELECT * FROM reportes WHERE id_reporte = ?', (id,)
        ).fetchone()
        
        conn.close()
        
        if not reporte:
            flash('Reporte no encontrado.', 'error')
            return redirect(url_for('reportes_admin.panel_reportes'))
        
        # TODO: Implementar descarga real del archivo
        # Por ahora redirigimos al panel
        flash('Funcionalidad de descarga en desarrollo.', 'info')
        return redirect(url_for('reportes_admin.panel_reportes'))
        
    except Exception as e:
        flash(f'Error al descargar reporte: {str(e)}', 'error')
        return redirect(url_for('reportes_admin.panel_reportes'))

@reportes_admin.route('/admin/reportes/<int:id>/eliminar', methods=['POST'])
@admin_required
def eliminar_reporte(id):
    """Eliminar un reporte"""
    try:
        conn = get_db_connection()
        
        # Verificar que el reporte existe
        reporte = conn.execute(
            'SELECT nombre FROM reportes WHERE id_reporte = ?', (id,)
        ).fetchone()
        
        if not reporte:
            return jsonify({'error': 'Reporte no encontrado'}), 404
        
        # Eliminar reporte
        conn.execute('DELETE FROM reportes WHERE id_reporte = ?', (id,))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': f'Reporte "{reporte["nombre"]}" eliminado exitosamente'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reportes_admin.route('/admin/reportes/programar', methods=['POST'])
@admin_required
def programar_reporte():
    """Programar generación automática de reportes"""
    try:
        tipo_reporte = request.json.get('tipo_reporte')
        frecuencia = request.json.get('frecuencia')  # diario, semanal, mensual
        parametros = request.json.get('parametros', {})
        
        conn = get_db_connection()
        
        # Crear programación de reporte
        conn.execute('''
            INSERT INTO reportes_programados (tipo_reporte, frecuencia, parametros, 
                                            estado, creado_por, fecha_creacion)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (tipo_reporte, frecuencia, json.dumps(parametros), 'Activo', 
              session['user_id'], datetime.now()))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': f'Reporte {tipo_reporte} programado para generación {frecuencia}'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def generar_reporte_documentos():
    """Generar reporte de documentos (pendiente de implementar)"""
    return jsonify({'error': 'Funcionalidad de reporte de documentos no implementada'}), 501

def generar_reporte_asesores():
    """Generar reporte de asesores (pendiente de implementar)"""
    return jsonify({'error': 'Funcionalidad de reporte de asesores no implementada'}), 501

reportes_admin_bp = reportes_admin