from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session, send_file
from functools import wraps
import mysql.connector
from mysql.connector import Error
from datetime import datetime, timedelta
from config.database import create_connection
import io
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
import stripe



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
        fecha_desde = request.args.get('fecha_desde', '')
        fecha_hasta = request.args.get('fecha_hasta', '')
        pagina = int(request.args.get('pagina', 1))
        por_pagina = 100  # Puedes ajustar este valor

        # Construir consulta con filtros
        query = '''
            SELECT p.id_pago, p.codigo_asesoria, p.monto, p.metodo_pago, 
                   p.estado_pago, p.fecha_pago, p.referencia_pago, p.id_reembolso_stripe,
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

        # Estadísticas para los cards
        cursor.execute("SELECT SUM(monto) as total FROM tbl_pago_asesoria WHERE estado_pago = 'Completado' AND MONTH(fecha_pago) = MONTH(CURDATE()) AND YEAR(fecha_pago) = YEAR(CURDATE())")
        ingresos_mes = cursor.fetchone()['total'] or 0.0

        cursor.execute("SELECT COUNT(*) as total FROM tbl_pago_asesoria WHERE estado_pago = 'Pendiente'")
        pagos_pendientes = cursor.fetchone()['total'] or 0

        cursor.execute("SELECT COUNT(*) as total FROM tbl_pago_asesoria WHERE estado_pago = 'Completado'")
        pagos_completados = cursor.fetchone()['total'] or 0

        cursor.execute("SELECT COUNT(*) as total FROM tbl_pago_asesoria WHERE estado_pago = 'Cancelado'")
        pagos_rechazados = cursor.fetchone()['total'] or 0

        conn.close()

        return render_template('admin/pagos_admin.html',
                             pagos=pagos,
                             ingresos_mes=ingresos_mes,
                             pagos_pendientes=pagos_pendientes,
                             pagos_completados=pagos_completados,
                             pagos_rechazados=pagos_rechazados,
                             total_pagos=total_pagos,
                             pagina_actual=pagina,
                             total_paginas=(total_pagos + por_pagina - 1) // por_pagina
                             )

    except Error as e:
        flash(f'Error al cargar pagos: {str(e)}', 'error')
        return render_template('admin/pagos_admin.html', pagos=[])

@pagos_admin_bp.route('/admin/pagos/<int:id>/cambiar-estado', methods=['POST'])
@admin_required
def cambiar_estado_pago(id):
    """Cambiar estado de un pago"""
    try:
        nuevo_estado = request.json.get('estado')
        
        # Solo permitir los valores válidos de la tabla
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

@pagos_admin_bp.route('/admin/pagos/procesar-masivo', methods=['POST'])
@admin_required
def procesar_pagos_masivo():
    """Aprobar o cancelar varios pagos seleccionados"""
    try:
        data = request.json
        ids = data.get('ids', [])
        nuevo_estado = data.get('estado', 'Completado')
        if not ids or nuevo_estado not in ['Pendiente', 'Completado', 'Cancelado']:
            return jsonify({'error': 'Datos inválidos'}), 400

        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500

        cursor = conn.cursor()
        format_strings = ','.join(['%s'] * len(ids))
        cursor.execute(
            f'UPDATE tbl_pago_asesoria SET estado_pago = %s WHERE id_pago IN ({format_strings})',
            tuple([nuevo_estado] + ids)
        )
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'mensaje': f'{cursor.rowcount} pagos actualizados.'})
    except Error as e:
        return jsonify({'error': str(e)}), 500

@pagos_admin_bp.route('/admin/pagos/<int:id>/recibo')
@admin_required
def generar_recibo_pago(id):
    """Generar recibo PDF real para un pago"""
    try:
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT p.id_pago, p.codigo_asesoria, p.monto, p.metodo_pago, 
                   p.estado_pago, p.fecha_pago, p.referencia_pago, p.datos_adicionales,
                   CONCAT(u.nombres, ' ', u.apellidos) as cliente_nombre,
                   u.correo as cliente_correo,
                   a.tipo_asesoria
            FROM tbl_pago_asesoria p
            LEFT JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
            LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            WHERE p.id_pago = %s
        ''', (id,))
        pago = cursor.fetchone()
        cursor.close()
        conn.close()
        if not pago:
            return jsonify({'error': 'Pago no encontrado'}), 404

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#1f2937'),
            fontName='Helvetica-Bold'
        )
        normal_style = styles['Normal']
        elements = []
        elements.append(Paragraph("Recibo de Pago", title_style))
        elements.append(Spacer(1, 18))

        data = [
            ["ID Pago", pago['id_pago']],
            ["Cliente", pago.get('cliente_nombre', '')],
            ["Correo Cliente", pago.get('cliente_correo', '')],
            ["Tipo de Asesoría", pago.get('tipo_asesoria', '')],
            ["Código Asesoría", pago.get('codigo_asesoria', '')],
            ["Monto", f"${pago.get('monto', 0):,.2f}"],
            ["Método de Pago", pago.get('metodo_pago', '')],
            ["Estado", pago.get('estado_pago', '')],
            ["Fecha de Pago", pago['fecha_pago'].strftime('%d/%m/%Y %H:%M') if pago['fecha_pago'] else ''],
            ["Referencia", pago.get('referencia_pago', '')],
            ["Nota interna", pago.get('datos_adicionales', '') or ''],
        ]
        table = Table(data, colWidths=[120, 320])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (1, 0), colors.HexColor("#f3f4f6")),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
        ]))
        elements.append(table)
        doc.build(elements)
        buffer.seek(0)
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"recibo_pago_{id}.pdf",
            mimetype='application/pdf'
        )
    except Exception as e:
        return jsonify({'error': f'Error al generar PDF: {str(e)}'}), 500

@pagos_admin_bp.route('/admin/pagos/exportar-todos-pdf')
@admin_required
def exportar_todos_pagos_pdf():
    """Exporta todos los pagos a un solo PDF."""
    try:
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT p.id_pago, p.codigo_asesoria, p.monto, p.metodo_pago, 
                   p.estado_pago, p.fecha_pago, p.referencia_pago,
                   CONCAT(u.nombres, ' ', u.apellidos) as cliente_nombre,
                   u.correo as cliente_correo,
                   a.tipo_asesoria
            FROM tbl_pago_asesoria p
            LEFT JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
            LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            ORDER BY p.fecha_pago DESC
        ''')
        pagos = cursor.fetchall()
        cursor.close()
        conn.close()

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=18, leftMargin=18, topMargin=40, bottomMargin=18)
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#1f2937'),
            fontName='Helvetica-Bold'
        )
        normal_style = styles['Normal']
        elements = []
        elements.append(Paragraph("Reporte de Pagos", title_style))
        elements.append(Spacer(1, 18))

        table_data = [
            [
                Paragraph("<b>ID</b>", normal_style),
                Paragraph("<b>Cliente</b>", normal_style),
                Paragraph("<b>Correo</b>", normal_style),
                Paragraph("<b>Asesoría</b>", normal_style),
                Paragraph("<b>Monto</b>", normal_style),
                Paragraph("<b>Método</b>", normal_style),
                Paragraph("<b>Estado</b>", normal_style),
                Paragraph("<b>Fecha</b>", normal_style),
                Paragraph("<b>Referencia</b>", normal_style),
            ]
        ]
        for p in pagos:
            table_data.append([
                str(p['id_pago']),
                Paragraph(p.get('cliente_nombre', '') or '', normal_style),
                Paragraph(p.get('cliente_correo', '') or '', normal_style),
                Paragraph(p.get('tipo_asesoria', '') or '', normal_style),
                f"${p.get('monto', 0):,.2f}",
                Paragraph(p.get('metodo_pago', '') or '', normal_style),
                Paragraph(p.get('estado_pago', '') or '', normal_style),
                p['fecha_pago'].strftime('%d/%m/%Y %H:%M') if p['fecha_pago'] else '',
                Paragraph(p.get('referencia_pago', '') or '', normal_style),
            ])
        col_widths = [30, 70, 70, 60, 40, 50, 45, 60, 60]
        table = Table(table_data, colWidths=col_widths, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
            ('WORDWRAP', (0, 0), (-1, -1), True),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(table)
        doc.build(elements)
        buffer.seek(0)
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"pagos_reporte.pdf",
            mimetype='application/pdf'
        )
    except Exception as e:
        return jsonify({'error': f'Error al generar PDF: {str(e)}'}), 500
