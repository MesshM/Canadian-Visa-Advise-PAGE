from flask import Blueprint, render_template, redirect, url_for, session, flash, jsonify
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

panel_asesor_bp = Blueprint('panel_asesor', __name__, url_prefix='/asesor')

def verificar_sesion_asesor():
    """Verifica si el usuario es un asesor autenticado"""
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return False
    if 'id_asesor' not in session:
        return False
    return True

@panel_asesor_bp.route('/dashboard')
def index_asesor():
    """Página principal del dashboard del asesor"""
    if not verificar_sesion_asesor():
        flash('Debes iniciar sesión como asesor', 'error')
        return redirect(url_for('auth.login'))
    
    return render_template('asesor/index_asesor.html')

@panel_asesor_bp.route('/api/metricas-principales')
def obtener_metricas_principales():
    """API para obtener las métricas principales del asesor"""
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
        
        # Total de asesorías asignadas
        cursor.execute("""
            SELECT COUNT(*) as total_asesorias
            FROM tbl_asesoria 
            WHERE id_asesor = %s
        """, (id_asesor,))
        result = cursor.fetchone()
        total_asesorias = result['total_asesorias'] if result else 0
        
        # Asesorías de hoy
        cursor.execute("""
            SELECT COUNT(*) as asesorias_hoy
            FROM tbl_asesoria a
            JOIN tbl_calendario_asesorias c ON a.codigo_asesoria = c.codigo_asesoria
            WHERE a.id_asesor = %s 
            AND c.fecha = CURDATE()
        """, (id_asesor,))
        result = cursor.fetchone()
        asesorias_hoy = result['asesorias_hoy'] if result else 0
        
        # Asesorías de la semana (lunes a domingo actual)
        cursor.execute("""
            SELECT COUNT(*) as asesorias_semana
            FROM tbl_asesoria a
            JOIN tbl_calendario_asesorias c ON a.codigo_asesoria = c.codigo_asesoria
            WHERE a.id_asesor = %s 
            AND YEARWEEK(c.fecha, 1) = YEARWEEK(CURDATE(), 1)
        """, (id_asesor,))
        result = cursor.fetchone()
        asesorias_semana = result['asesorias_semana'] if result else 0
        
        # Asesorías terminadas
        cursor.execute("""
            SELECT COUNT(*) as asesorias_terminadas
            FROM tbl_asesoria 
            WHERE id_asesor = %s AND estado_proceso = 'Terminado'
        """, (id_asesor,))
        result = cursor.fetchone()
        asesorias_terminadas = result['asesorias_terminadas'] if result else 0
        
        # Asesorías en proceso activo
        cursor.execute("""
            SELECT COUNT(*) as asesorias_proceso
            FROM tbl_asesoria 
            WHERE id_asesor = %s AND estado_proceso = 'Proceso activo'
        """, (id_asesor,))
        result = cursor.fetchone()
        asesorias_proceso = result['asesorias_proceso'] if result else 0
        
        # Calificación promedio
        cursor.execute("""
            SELECT AVG(cal.puntuacion) as calificacion_promedio
            FROM tbl_calificacion_asesoria cal
            JOIN tbl_asesoria a ON cal.codigo_asesoria = a.codigo_asesoria
            WHERE a.id_asesor = %s
        """, (id_asesor,))
        result = cursor.fetchone()
        calificacion_promedio = round(float(result['calificacion_promedio']), 1) if result and result['calificacion_promedio'] else 0.0
        
        # Asesorías del mes actual
        cursor.execute("""
            SELECT COUNT(*) as asesorias_mes
            FROM tbl_asesoria a
            JOIN tbl_calendario_asesorias c ON a.codigo_asesoria = c.codigo_asesoria
            WHERE a.id_asesor = %s 
            AND MONTH(c.fecha) = MONTH(CURDATE())
            AND YEAR(c.fecha) = YEAR(CURDATE())
        """, (id_asesor,))
        result = cursor.fetchone()
        asesorias_mes = result['asesorias_mes'] if result else 0

        # Asesorías pendientes
        cursor.execute("""
            SELECT COUNT(*) as asesorias_pendientes
            FROM tbl_asesoria 
            WHERE id_asesor = %s AND estado_proceso = 'Pendiente'
        """, (id_asesor,))
        result = cursor.fetchone()
        asesorias_pendientes = result['asesorias_pendientes'] if result else 0

        # Tasa de completación (porcentaje)
        tasa_completacion = 0
        if total_asesorias > 0:
            tasa_completacion = round((asesorias_terminadas / total_asesorias) * 100, 1)

        # Ingresos del mes (de asesorías completadas)
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
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'total_asesorias': total_asesorias,
            'asesorias_hoy': asesorias_hoy,
            'asesorias_semana': asesorias_semana,
            'asesorias_mes': asesorias_mes,
            'asesorias_terminadas': asesorias_terminadas,
            'asesorias_proceso': asesorias_proceso,
            'asesorias_pendientes': asesorias_pendientes,
            'tasa_completacion': tasa_completacion,
            'ingresos_mes': ingresos_mes,
            'calificacion_promedio': calificacion_promedio
        })
        
    except Error as e:
        print(f"Error en obtener_metricas_principales: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    except Exception as e:
        print(f"Error general en obtener_metricas_principales: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@panel_asesor_bp.route('/api/estado-asesorias')
def obtener_estado_asesorias():
    """API para obtener datos del gráfico de estado de asesorías"""
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
                estado_proceso,
                COUNT(*) as cantidad
            FROM tbl_asesoria 
            WHERE id_asesor = %s
            GROUP BY estado_proceso
            ORDER BY cantidad DESC
        """, (id_asesor,))
        
        resultados = cursor.fetchall()
        cursor.close()
        connection.close()
        
        # Formatear datos para ApexCharts
        estados = []
        cantidades = []
        
        if resultados:
            for resultado in resultados:
                estados.append(resultado['estado_proceso'] or 'Sin estado')
                cantidades.append(int(resultado['cantidad']))
        else:
            # Datos por defecto si no hay resultados
            estados = ['Sin datos']
            cantidades = [0]
        
        return jsonify({
            'estados': estados,
            'cantidades': cantidades
        })
        
    except Error as e:
        print(f"Error en obtener_estado_asesorias: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    except Exception as e:
        print(f"Error general en obtener_estado_asesorias: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@panel_asesor_bp.route('/api/modalidad-asesorias')
def obtener_modalidad_asesorias():
    """API para obtener datos del gráfico de modalidad de asesorías"""
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
                lugar as modalidad,
                COUNT(*) as cantidad
            FROM tbl_asesoria 
            WHERE id_asesor = %s
            GROUP BY lugar
            ORDER BY cantidad DESC
        """, (id_asesor,))
        
        resultados = cursor.fetchall()
        cursor.close()
        connection.close()
        
        # Formatear datos para ApexCharts
        modalidades = []
        cantidades = []
        
        if resultados:
            for resultado in resultados:
                modalidades.append(resultado['modalidad'] or 'Sin modalidad')
                cantidades.append(int(resultado['cantidad']))
        else:
            # Datos por defecto si no hay resultados
            modalidades = ['Sin datos']
            cantidades = [0]
        
        return jsonify({
            'modalidades': modalidades,
            'cantidades': cantidades
        })
        
    except Error as e:
        print(f"Error en obtener_modalidad_asesorias: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    except Exception as e:
        print(f"Error general en obtener_modalidad_asesorias: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@panel_asesor_bp.route('/api/tipo-visa-asesorias')
def obtener_tipo_visa_asesorias():
    """API para obtener datos del gráfico de asesorías por tipo de visa"""
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
                tipo_asesoria,
                COUNT(*) as cantidad
            FROM tbl_asesoria 
            WHERE id_asesor = %s
            GROUP BY tipo_asesoria
            ORDER BY cantidad DESC
        """, (id_asesor,))
        
        resultados = cursor.fetchall()
        cursor.close()
        connection.close()
        
        # Formatear datos para ApexCharts
        tipos = []
        cantidades = []
        
        if resultados:
            for resultado in resultados:
                tipos.append(resultado['tipo_asesoria'] or 'Sin tipo')
                cantidades.append(int(resultado['cantidad']))
        else:
            # Datos por defecto si no hay resultados
            tipos = ['Sin datos']
            cantidades = [0]
        
        return jsonify({
            'tipos': tipos,
            'cantidades': cantidades
        })
        
    except Error as e:
        print(f"Error en obtener_tipo_visa_asesorias: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    except Exception as e:
        print(f"Error general en obtener_tipo_visa_asesorias: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@panel_asesor_bp.route('/api/proximas-asesorias')
def obtener_proximas_asesorias():
    """API para obtener las próximas asesorías del asesor"""
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
                a.codigo_asesoria,
                u.nombres,
                u.apellidos,
                a.tipo_asesoria,
                a.lugar,
                a.fecha_asesoria,
                a.estado_proceso
            FROM tbl_asesoria a
            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            WHERE a.id_asesor = %s 
            AND a.fecha_asesoria >= NOW()
            ORDER BY a.fecha_asesoria ASC
            LIMIT 10
        """, (id_asesor,))
        
        resultados = cursor.fetchall()
        cursor.close()
        connection.close()
        
        # Formatear fechas para el frontend
        proximas_asesorias = []
        for resultado in resultados:
            asesoria = {
                'codigo_asesoria': resultado['codigo_asesoria'],
                'nombres': resultado['nombres'] or 'Sin nombre',
                'apellidos': resultado['apellidos'] or 'Sin apellido',
                'tipo_asesoria': resultado['tipo_asesoria'] or 'Sin tipo',
                'lugar': resultado['lugar'] or 'Sin lugar',
                'estado_proceso': resultado['estado_proceso'] or 'Sin estado',
                'fecha_hora_formateada': 'Sin fecha'
            }
            
            if resultado['fecha_asesoria']:
                asesoria['fecha_hora_formateada'] = resultado['fecha_asesoria'].strftime('%d/%m/%Y %H:%M')
            
            proximas_asesorias.append(asesoria)
        
        return jsonify({'proximas_asesorias': proximas_asesorias})
        
    except Error as e:
        print(f"Error en obtener_proximas_asesorias: {str(e)}")
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    except Exception as e:
        print(f"Error general en obtener_proximas_asesorias: {str(e)}")
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

@panel_asesor_bp.route('/api/generar-reporte')
def generar_reporte():
    """API para generar reporte PDF del asesor"""
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
        
        # Obtener métricas importantes
        metricas = {}
        
        # Total de asesorías
        cursor.execute("SELECT COUNT(*) as total FROM tbl_asesoria WHERE id_asesor = %s", (id_asesor,))
        metricas['total_asesorias'] = cursor.fetchone()['total']
        
        # Asesorías terminadas
        cursor.execute("SELECT COUNT(*) as terminadas FROM tbl_asesoria WHERE id_asesor = %s AND estado_proceso = 'Terminado'", (id_asesor,))
        metricas['asesorias_terminadas'] = cursor.fetchone()['terminadas']
        
        # Asesorías en proceso
        cursor.execute("SELECT COUNT(*) as proceso FROM tbl_asesoria WHERE id_asesor = %s AND estado_proceso = 'Proceso activo'", (id_asesor,))
        metricas['asesorias_proceso'] = cursor.fetchone()['proceso']
        
        # Asesorías pendientes
        cursor.execute("SELECT COUNT(*) as pendientes FROM tbl_asesoria WHERE id_asesor = %s AND estado_proceso = 'Pendiente'", (id_asesor,))
        metricas['asesorias_pendientes'] = cursor.fetchone()['pendientes']
        
        # Tasa de completación
        if metricas['total_asesorias'] > 0:
            metricas['tasa_completacion'] = round((metricas['asesorias_terminadas'] / metricas['total_asesorias']) * 100, 1)
        else:
            metricas['tasa_completacion'] = 0
        
        # Calificación promedio
        cursor.execute("""
            SELECT AVG(cal.puntuacion) as promedio
            FROM tbl_calificacion_asesoria cal
            JOIN tbl_asesoria a ON cal.codigo_asesoria = a.codigo_asesoria
            WHERE a.id_asesor = %s
        """, (id_asesor,))
        result = cursor.fetchone()
        metricas['calificacion_promedio'] = round(float(result['promedio']), 1) if result and result['promedio'] else 0.0
        
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
        nombre_archivo = f"{id_asesor}_{serial}_{fecha_generacion}.pdf"
        
        # Generar PDF
        archivo_pdf = crear_reporte_pdf(asesor_info, metricas)
        
        return send_file(
            archivo_pdf,
            as_attachment=True,
            download_name=nombre_archivo,
            mimetype='application/pdf'
        )
        
    except Error as e:
        print(f"Error en generar_reporte: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    except Exception as e:
        print(f"Error general en generar_reporte: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

def crear_reporte_pdf(asesor_info, metricas):
    """Crear el archivo PDF del reporte"""
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
    story.append(Paragraph("Reporte de Rendimiento del Asesor", title_style))
    
    # Información del asesor
    asesor_nombre = f"{asesor_info['nombre']} {asesor_info['apellidos']}" if asesor_info else "Asesor"
    story.append(Paragraph(f"Asesor: {asesor_nombre}", subtitle_style))
    
    if asesor_info and asesor_info['correo']:
        story.append(Paragraph(f"Correo: {asesor_info['correo']}", normal_style))
    
    story.append(Paragraph(f"Fecha de generación: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')}", normal_style))
    story.append(Spacer(1, 30))
    
    # Tabla de métricas importantes
    story.append(Paragraph("Métricas de Rendimiento", subtitle_style))
    
    # Datos de la tabla
    data = [
        ['Métrica', 'Valor'],
        ['Total de Asesorías', str(metricas['total_asesorias'])],
        ['Asesorías Terminadas', str(metricas['asesorias_terminadas'])],
        ['Asesorías en Proceso', str(metricas['asesorias_proceso'])],
        ['Asesorías Pendientes', str(metricas['asesorias_pendientes'])],
        ['Tasa de Completación', f"{metricas['tasa_completacion']}%"],
        ['Calificación Promedio', f"{metricas['calificacion_promedio']}/5.0"],
        ['Ingresos del Mes', f"${metricas['ingresos_mes']:,.0f} COP"]
    ]
    
    # Crear tabla
    table = Table(data, colWidths=[3*inch, 2*inch])
    table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B82F6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        
        # Body
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F9FAFB')),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#1F2937')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 12),
        
        # Borders
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E5E7EB')),
        ('LINEBELOW', (0, 0), (-1, 0), 2, colors.HexColor('#3B82F6')),
        
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
