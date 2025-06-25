from flask import Blueprint, render_template, jsonify, session, request, redirect, url_for, flash
import datetime
from config.database import create_connection
from mysql.connector import Error
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import os
from flask import send_file
import tempfile
import time

pagos_asesor_bp = Blueprint('pagos_asesor', __name__, url_prefix='/asesor')

def verificar_sesion_asesor():
    """Verifica si el usuario es un asesor autenticado"""
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return False
    if 'id_asesor' not in session:
        return False
    return True

@pagos_asesor_bp.route('/pagos')
def pagos_dashboard():
    """Página principal del dashboard de pagos del asesor"""
    if not verificar_sesion_asesor():
        flash('Debes iniciar sesión como asesor', 'error')
        return redirect(url_for('auth.login'))
    
    return render_template('asesor/pagos_asesor.html')

@pagos_asesor_bp.route('/api/metricas-pagos')
def obtener_metricas_pagos():
    """API para obtener las métricas principales de pagos del asesor"""
    if not verificar_sesion_asesor():
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = connection.cursor(dictionary=True)
        id_asesor = session.get('id_asesor')
        
        if not id_asesor:
            return jsonify({'error': 'ID de asesor no encontrado en sesión'}), 400
        
        # Ingresos totales
        cursor.execute("""
            SELECT COALESCE(SUM(p.monto), 0) as ingresos_totales
            FROM tbl_pago_asesoria p
            JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
            WHERE a.id_asesor = %s AND p.estado_pago = 'Completado'
        """, (id_asesor,))
        result = cursor.fetchone()
        ingresos_totales = float(result['ingresos_totales']) if result and result['ingresos_totales'] else 0.0
        
        # Total transacciones
        cursor.execute("""
            SELECT COUNT(*) as total_transacciones
            FROM tbl_pago_asesoria p
            JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
            WHERE a.id_asesor = %s
        """, (id_asesor,))
        result = cursor.fetchone()
        total_transacciones = result['total_transacciones'] if result else 0
        
        # Pagos pendientes
        cursor.execute("""
            SELECT COUNT(*) as pagos_pendientes
            FROM tbl_pago_asesoria p
            JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
            WHERE a.id_asesor = %s AND p.estado_pago = 'Pendiente'
        """, (id_asesor,))
        result = cursor.fetchone()
        pagos_pendientes = result['pagos_pendientes'] if result else 0
        
        # Pagos completados
        cursor.execute("""
            SELECT COUNT(*) as pagos_completados
            FROM tbl_pago_asesoria p
            JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
            WHERE a.id_asesor = %s AND p.estado_pago = 'Completado'
        """, (id_asesor,))
        result = cursor.fetchone()
        pagos_completados = result['pagos_completados'] if result else 0
        
        # Promedio por transacción
        promedio_transaccion = 0
        if pagos_completados > 0:
            promedio_transaccion = round(ingresos_totales / pagos_completados, 2)
        
        # Ingresos del mes actual
        cursor.execute("""
            SELECT COALESCE(SUM(p.monto), 0) as ingresos_mes
            FROM tbl_pago_asesoria p
            JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
            WHERE a.id_asesor = %s 
            AND p.estado_pago = 'Completado'
            AND MONTH(p.fecha_pago) = MONTH(CURDATE())
            AND YEAR(p.fecha_pago) = YEAR(CURDATE())
        """, (id_asesor,))
        result = cursor.fetchone()
        ingresos_mes = float(result['ingresos_mes']) if result and result['ingresos_mes'] else 0.0
        
        # Monto pendiente
        cursor.execute("""
            SELECT COALESCE(SUM(p.monto), 0) as monto_pendiente
            FROM tbl_pago_asesoria p
            JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
            WHERE a.id_asesor = %s AND p.estado_pago = 'Pendiente'
        """, (id_asesor,))
        result = cursor.fetchone()
        monto_pendiente = float(result['monto_pendiente']) if result and result['monto_pendiente'] else 0.0
        
        # Tasa de conversión (pagos completados vs total)
        tasa_conversion = 0
        if total_transacciones > 0:
            tasa_conversion = round((pagos_completados / total_transacciones) * 100, 1)
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'ingresos_totales': ingresos_totales,
            'total_transacciones': total_transacciones,
            'pagos_pendientes': pagos_pendientes,
            'pagos_completados': pagos_completados,
            'promedio_transaccion': promedio_transaccion,
            'ingresos_mes': ingresos_mes,
            'monto_pendiente': monto_pendiente,
            'tasa_conversion': tasa_conversion
        })
        
    except Error as e:
        print(f"Error en obtener_metricas_pagos: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    except Exception as e:
        print(f"Error general en obtener_metricas_pagos: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@pagos_asesor_bp.route('/api/ingresos-tipo-visa')
def obtener_ingresos_tipo_visa():
    """API para obtener datos del gráfico de ingresos por tipo de visa"""
    if not verificar_sesion_asesor():
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = connection.cursor(dictionary=True)
        id_asesor = session.get('id_asesor')
        
        if not id_asesor:
            return jsonify({'error': 'ID de asesor no encontrado en sesión'}), 400
        
        cursor.execute("""
            SELECT 
                a.tipo_asesoria,
                COALESCE(SUM(p.monto), 0) as total_ingresos
            FROM tbl_pago_asesoria p
            JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
            WHERE a.id_asesor = %s AND p.estado_pago = 'Completado'
            GROUP BY a.tipo_asesoria
            ORDER BY total_ingresos DESC
        """, (id_asesor,))
        
        resultados = cursor.fetchall()
        cursor.close()
        connection.close()
        
        # Formatear datos para ApexCharts
        tipos = []
        ingresos = []
        
        if resultados:
            for resultado in resultados:
                tipos.append(resultado['tipo_asesoria'] or 'Sin tipo')
                ingresos.append(float(resultado['total_ingresos']))
        else:
            tipos = ['Sin datos']
            ingresos = [0]
        
        return jsonify({
            'tipos': tipos,
            'ingresos': ingresos
        })
        
    except Error as e:
        print(f"Error en obtener_ingresos_tipo_visa: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    except Exception as e:
        print(f"Error general en obtener_ingresos_tipo_visa: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@pagos_asesor_bp.route('/api/metodos-pago')
def obtener_metodos_pago():
    """API para obtener datos del gráfico de métodos de pago"""
    if not verificar_sesion_asesor():
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = connection.cursor(dictionary=True)
        id_asesor = session.get('id_asesor')
        
        if not id_asesor:
            return jsonify({'error': 'ID de asesor no encontrado en sesión'}), 400
        
        cursor.execute("""
            SELECT 
                p.metodo_pago,
                COUNT(*) as cantidad,
                COALESCE(SUM(p.monto), 0) as total_monto
            FROM tbl_pago_asesoria p
            JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
            WHERE a.id_asesor = %s AND p.estado_pago = 'Completado'
            GROUP BY p.metodo_pago
            ORDER BY cantidad DESC
        """, (id_asesor,))
        
        resultados = cursor.fetchall()
        cursor.close()
        connection.close()
        
        # Formatear datos para ApexCharts
        metodos = []
        cantidades = []
        
        if resultados:
            for resultado in resultados:
                metodos.append(resultado['metodo_pago'] or 'Sin método')
                cantidades.append(int(resultado['cantidad']))
        else:
            metodos = ['Sin datos']
            cantidades = [0]
        
        return jsonify({
            'metodos': metodos,
            'cantidades': cantidades
        })
        
    except Error as e:
        print(f"Error en obtener_metodos_pago: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    except Exception as e:
        print(f"Error general en obtener_metodos_pago: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@pagos_asesor_bp.route('/api/tendencia-semanal')
def obtener_tendencia_semanal():
    """API para obtener datos de la tendencia semanal de ingresos"""
    if not verificar_sesion_asesor():
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = connection.cursor(dictionary=True)
        id_asesor = session.get('id_asesor')
        
        if not id_asesor:
            return jsonify({'error': 'ID de asesor no encontrado en sesión'}), 400
        
        cursor.execute("""
            SELECT 
                DATE(p.fecha_pago) as fecha,
                COALESCE(SUM(p.monto), 0) as ingresos_dia
            FROM tbl_pago_asesoria p
            JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
            WHERE a.id_asesor = %s 
            AND p.estado_pago = 'Completado'
            AND p.fecha_pago >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(p.fecha_pago)
            ORDER BY fecha ASC
        """, (id_asesor,))
        
        resultados = cursor.fetchall()
        cursor.close()
        connection.close()
        
        # Formatear datos para ApexCharts
        fechas = []
        ingresos = []
        
        if resultados:
            for resultado in resultados:
                fechas.append(resultado['fecha'].strftime('%Y-%m-%d'))
                ingresos.append(float(resultado['ingresos_dia']))
        else:
            fechas = ['Sin datos']
            ingresos = [0]
        
        return jsonify({
            'fechas': fechas,
            'ingresos': ingresos
        })
        
    except Error as e:
        print(f"Error en obtener_tendencia_semanal: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    except Exception as e:
        print(f"Error general en obtener_tendencia_semanal: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@pagos_asesor_bp.route('/api/transacciones-recientes')
def obtener_transacciones_recientes():
    """API para obtener las transacciones recientes del asesor"""
    if not verificar_sesion_asesor():
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = connection.cursor(dictionary=True)
        id_asesor = session.get('id_asesor')
        
        if not id_asesor:
            return jsonify({'error': 'ID de asesor no encontrado en sesión'}), 400
        
        cursor.execute("""
            SELECT 
                p.id_pago,
                p.monto,
                p.metodo_pago,
                p.estado_pago,
                p.fecha_pago,
                p.referencia_pago,
                u.nombres,
                u.apellidos,
                a.tipo_asesoria
            FROM tbl_pago_asesoria p
            JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            WHERE a.id_asesor = %s
            ORDER BY p.fecha_pago DESC
            LIMIT 15
        """, (id_asesor,))
        
        resultados = cursor.fetchall()
        cursor.close()
        connection.close()
        
        # Formatear fechas para el frontend
        transacciones_recientes = []
        for resultado in resultados:
            transaccion = {
                'id_pago': resultado['id_pago'],
                'monto': float(resultado['monto']),
                'metodo_pago': resultado['metodo_pago'] or 'Sin método',
                'estado_pago': resultado['estado_pago'] or 'Sin estado',
                'referencia_pago': resultado['referencia_pago'] or 'Sin referencia',
                'nombres': resultado['nombres'] or 'Sin nombre',
                'apellidos': resultado['apellidos'] or 'Sin apellido',
                'tipo_asesoria': resultado['tipo_asesoria'] or 'Sin tipo',
                'fecha_formateada': 'Sin fecha'
            }
            
            if resultado['fecha_pago']:
                transaccion['fecha_formateada'] = resultado['fecha_pago'].strftime('%d/%m/%Y %H:%M')
            
            transacciones_recientes.append(transaccion)
        
        return jsonify({'transacciones_recientes': transacciones_recientes})
        
    except Error as e:
        print(f"Error en obtener_transacciones_recientes: {str(e)}")
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    except Exception as e:
        print(f"Error general en obtener_transacciones_recientes: {str(e)}")
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@pagos_asesor_bp.route('/api/generar-reporte-pagos')
def generar_reporte_pagos():
    """API para generar reporte PDF de pagos del asesor"""
    if not verificar_sesion_asesor():
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = connection.cursor(dictionary=True)
        id_asesor = session.get('id_asesor')
        
        if not id_asesor:
            return jsonify({'error': 'ID de asesor no encontrado en sesión'}), 400
        
        # Obtener información del asesor
        cursor.execute("""
            SELECT a.nombre, a.apellidos, u.correo
            FROM tbl_asesor a
            JOIN tbl_usuario u ON a.id_usuario = u.id_usuario
            WHERE a.id_asesor = %s
        """, (id_asesor,))
        asesor_info = cursor.fetchone()
        
        # Obtener métricas de pagos
        metricas = {}
        
        # Ingresos totales
        cursor.execute("""
            SELECT COALESCE(SUM(p.monto), 0) as total
            FROM tbl_pago_asesoria p
            JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
            WHERE a.id_asesor = %s AND p.estado_pago = 'Completado'
        """, (id_asesor,))
        result = cursor.fetchone()
        metricas['ingresos_totales'] = float(result['total']) if result and result['total'] else 0.0
        
        # Total transacciones
        cursor.execute("""
            SELECT COUNT(*) as total
            FROM tbl_pago_asesoria p
            JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
            WHERE a.id_asesor = %s
        """, (id_asesor,))
        result = cursor.fetchone()
        metricas['total_transacciones'] = result['total'] if result else 0
        
        # Pagos completados
        cursor.execute("""
            SELECT COUNT(*) as completados
            FROM tbl_pago_asesoria p
            JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
            WHERE a.id_asesor = %s AND p.estado_pago = 'Completado'
        """, (id_asesor,))
        result = cursor.fetchone()
        metricas['pagos_completados'] = result['completados'] if result else 0
        
        # Pagos pendientes
        cursor.execute("""
            SELECT COUNT(*) as pendientes
            FROM tbl_pago_asesoria p
            JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
            WHERE a.id_asesor = %s AND p.estado_pago = 'Pendiente'
        """, (id_asesor,))
        result = cursor.fetchone()
        metricas['pagos_pendientes'] = result['pendientes'] if result else 0
        
        # Promedio por transacción
        if metricas['pagos_completados'] > 0:
            metricas['promedio_transaccion'] = round(metricas['ingresos_totales'] / metricas['pagos_completados'], 2)
        else:
            metricas['promedio_transaccion'] = 0
        
        # Tasa de conversión
        if metricas['total_transacciones'] > 0:
            metricas['tasa_conversion'] = round((metricas['pagos_completados'] / metricas['total_transacciones']) * 100, 1)
        else:
            metricas['tasa_conversion'] = 0
        
        # Ingresos del mes
        cursor.execute("""
            SELECT COALESCE(SUM(p.monto), 0) as ingresos
            FROM tbl_pago_asesoria p
            JOIN tbl_asesoria a ON p.codigo_asesoria = a.codigo_asesoria
            WHERE a.id_asesor = %s 
            AND p.estado_pago = 'Completado'
            AND MONTH(p.fecha_pago) = MONTH(CURDATE())
            AND YEAR(p.fecha_pago) = YEAR(CURDATE())
        """, (id_asesor,))
        result = cursor.fetchone()
        metricas['ingresos_mes'] = float(result['ingresos']) if result and result['ingresos'] else 0.0
        
        cursor.close()
        connection.close()
        
        # Generar serial de 6 dígitos basado en timestamp
        serial = str(int(time.time()))[-6:]

        # Generar nombre del archivo
        fecha_generacion = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        nombre_archivo = f"{id_asesor}_pagos_{serial}_{fecha_generacion}.pdf"
        
        # Generar PDF
        archivo_pdf = crear_reporte_pagos_pdf(asesor_info, metricas)
        
        return send_file(
            archivo_pdf,
            as_attachment=True,
            download_name=nombre_archivo,
            mimetype='application/pdf'
        )
        
    except Error as e:
        print(f"Error en generar_reporte_pagos: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    except Exception as e:
        print(f"Error general en generar_reporte_pagos: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

def crear_reporte_pagos_pdf(asesor_info, metricas):
    """Crear el archivo PDF del reporte de pagos"""
    # Crear archivo temporal
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    
    # Configurar documento
    doc = SimpleDocTemplate(
        temp_file.name,
        pagesize=A4,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18
    )
    
    # Estilos
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1F2937')
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=20,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#4B5563')
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=12,
        alignment=TA_LEFT
    )
    
    # Contenido del documento
    story = []
    
    # Logo (si existe)
    logo_path = 'static/img/logo-canadian-visa-advise.jpg'
    if os.path.exists(logo_path):
        logo = Image(logo_path, width=2*inch, height=1*inch)
        logo.hAlign = 'CENTER'
        story.append(logo)
        story.append(Spacer(1, 20))
    
    # Título
    story.append(Paragraph("Reporte de Métricas de Pagos", title_style))
    
    # Información del asesor
    asesor_nombre = f"{asesor_info['nombre']} {asesor_info['apellidos']}" if asesor_info else "Asesor"
    story.append(Paragraph(f"Asesor: {asesor_nombre}", subtitle_style))
    
    if asesor_info and asesor_info['correo']:
        story.append(Paragraph(f"Correo: {asesor_info['correo']}", normal_style))
    
    story.append(Paragraph(f"Fecha de generación: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')}", normal_style))
    story.append(Spacer(1, 30))
    
    # Tabla de métricas de pagos
    story.append(Paragraph("Métricas de Pagos", subtitle_style))
    
    # Datos de la tabla
    data = [
        ['Métrica', 'Valor'],
        ['Ingresos Totales', f"${metricas['ingresos_totales']:,.0f} USD"],
        ['Total Transacciones', str(metricas['total_transacciones'])],
        ['Pagos Completados', str(metricas['pagos_completados'])],
        ['Pagos Pendientes', str(metricas['pagos_pendientes'])],
        ['Promedio por Transacción', f"${metricas['promedio_transaccion']:,.0f} USD"],
        ['Tasa de Conversión', f"{metricas['tasa_conversion']}%"],
        ['Ingresos del Mes', f"${metricas['ingresos_mes']:,.0f} USD"]
    ]
    
    # Crear tabla
    table = Table(data, colWidths=[3*inch, 2*inch])
    table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10B981')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        
        # Body
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F0FDF4')),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#1F2937')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 12),
        
        # Borders
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E5E7EB')),
        ('LINEBELOW', (0, 0), (-1, 0), 2, colors.HexColor('#10B981')),
        
        # Alternating rows
        ('BACKGROUND', (0, 2), (-1, 2), colors.white),
        ('BACKGROUND', (0, 4), (-1, 4), colors.white),
        ('BACKGROUND', (0, 6), (-1, 6), colors.white),
        
        # Padding
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 20),
        ('RIGHTPADDING', (0, 0), (-1, -1), 20),
    ]))
    
    story.append(table)
    story.append(Spacer(1, 30))
    
    # Nota al pie
    story.append(Paragraph(
        "Este reporte fue generado automáticamente por el sistema Canadian Visa Advise.",
        ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=10,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#6B7280')
        )
    ))
    
    # Construir PDF
    doc.build(story)
    
    return temp_file.name
