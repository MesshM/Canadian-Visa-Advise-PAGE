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

panel_admin_bp = Blueprint('panel_admin', __name__, url_prefix='/admin')

def verificar_sesion_admin():
    """Verifica si el usuario es un administrador autenticado"""
    if 'user_id' not in session or session.get('user_role') != 'Administrador':
        return False
    return True

@panel_admin_bp.route('/dashboard')
def index_admin():
    """Página principal del dashboard del administrador"""
    if not verificar_sesion_admin():
        flash('Debes iniciar sesión como administrador', 'error')
        return redirect(url_for('auth.login'))
    
    return render_template('admin/index_admin.html')

@panel_admin_bp.route('/api/metricas-principales')
def obtener_metricas_principales():
    """API para obtener las métricas principales del sistema"""
    if not verificar_sesion_admin():
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Total de asesorías realizadas
        cursor.execute("SELECT COUNT(*) as total_asesorias FROM tbl_asesoria")
        result = cursor.fetchone()
        total_asesorias = result['total_asesorias'] if result else 0
        
        # Asesorías en proceso activo
        cursor.execute("SELECT COUNT(*) as asesorias_activas FROM tbl_asesoria WHERE estado_proceso = 'Proceso activo'")
        result = cursor.fetchone()
        asesorias_activas = result['asesorias_activas'] if result else 0
        
        # Asesorías terminadas
        cursor.execute("SELECT COUNT(*) as asesorias_terminadas FROM tbl_asesoria WHERE estado_proceso = 'Terminado'")
        result = cursor.fetchone()
        asesorias_terminadas = result['asesorias_terminadas'] if result else 0
        
        # Asesorías pendientes
        cursor.execute("SELECT COUNT(*) as asesorias_pendientes FROM tbl_asesoria WHERE estado_proceso = 'Pendiente'")
        result = cursor.fetchone()
        asesorias_pendientes = result['asesorias_pendientes'] if result else 0
        
        # Ingresos totales
        cursor.execute("""
            SELECT COALESCE(SUM(monto), 0) as ingresos_totales
            FROM tbl_pago_asesoria 
            WHERE estado_pago = 'Completado'
        """)
        result = cursor.fetchone()
        ingresos_totales = float(result['ingresos_totales']) if result and result['ingresos_totales'] else 0.0
        
        # Ingresos del mes actual
        cursor.execute("""
            SELECT COALESCE(SUM(monto), 0) as ingresos_mes
            FROM tbl_pago_asesoria 
            WHERE estado_pago = 'Completado'
            AND MONTH(fecha_pago) = MONTH(CURDATE())
            AND YEAR(fecha_pago) = YEAR(CURDATE())
        """)
        result = cursor.fetchone()
        ingresos_mes = float(result['ingresos_mes']) if result and result['ingresos_mes'] else 0.0
        
        # Total de asesores activos
        cursor.execute("SELECT COUNT(*) as total_asesores FROM tbl_asesor")
        result = cursor.fetchone()
        total_asesores = result['total_asesores'] if result else 0
        
        # Total de usuarios registrados
        cursor.execute("SELECT COUNT(*) as total_usuarios FROM tbl_usuario")
        result = cursor.fetchone()
        total_usuarios = result['total_usuarios'] if result else 0
        
        # Promedio de ingresos por asesoría
        promedio_ingresos = 0
        if asesorias_terminadas > 0:
            promedio_ingresos = round(ingresos_totales / asesorias_terminadas, 2)
        
        # Tasa de completación general
        tasa_completacion = 0
        if total_asesorias > 0:
            tasa_completacion = round((asesorias_terminadas / total_asesorias) * 100, 1)
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'total_asesorias': total_asesorias,
            'asesorias_activas': asesorias_activas,
            'asesorias_terminadas': asesorias_terminadas,
            'asesorias_pendientes': asesorias_pendientes,
            'ingresos_totales': ingresos_totales,
            'ingresos_mes': ingresos_mes,
            'total_asesores': total_asesores,
            'total_usuarios': total_usuarios,
            'promedio_ingresos': promedio_ingresos,
            'tasa_completacion': tasa_completacion
        })
        
    except Error as e:
        print(f"Error en obtener_metricas_principales: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    except Exception as e:
        print(f"Error general en obtener_metricas_principales: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@panel_admin_bp.route('/api/asesorias-tipo-visa')
def obtener_asesorias_tipo_visa():
    """API para obtener datos del gráfico de asesorías por tipo de visa"""
    if not verificar_sesion_admin():
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                tipo_asesoria,
                COUNT(*) as cantidad
            FROM tbl_asesoria 
            GROUP BY tipo_asesoria
            ORDER BY cantidad DESC
        """)
        
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
            tipos = ['Sin datos']
            cantidades = [0]
        
        return jsonify({
            'tipos': tipos,
            'cantidades': cantidades
        })
        
    except Error as e:
        print(f"Error en obtener_asesorias_tipo_visa: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    except Exception as e:
        print(f"Error general en obtener_asesorias_tipo_visa: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@panel_admin_bp.route('/api/asesorias-modalidad')
def obtener_asesorias_modalidad():
    """API para obtener datos del gráfico de asesorías por modalidad"""
    if not verificar_sesion_admin():
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                lugar as modalidad,
                COUNT(*) as cantidad
            FROM tbl_asesoria 
            GROUP BY lugar
            ORDER BY cantidad DESC
        """)
        
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
            modalidades = ['Sin datos']
            cantidades = [0]
        
        return jsonify({
            'modalidades': modalidades,
            'cantidades': cantidades
        })
        
    except Error as e:
        print(f"Error en obtener_asesorias_modalidad: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    except Exception as e:
        print(f"Error general en obtener_asesorias_modalidad: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@panel_admin_bp.route('/api/estado-asesorias')
def obtener_estado_asesorias():
    """API para obtener datos del gráfico de estado general de asesorías"""
    if not verificar_sesion_admin():
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                estado_proceso,
                COUNT(*) as cantidad
            FROM tbl_asesoria 
            GROUP BY estado_proceso
            ORDER BY cantidad DESC
        """)
        
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

@panel_admin_bp.route('/api/ranking-asesores')
def obtener_ranking_asesores():
    """API para obtener el ranking de asesores con más asesorías"""
    if not verificar_sesion_admin():
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                CONCAT(ase.nombre, ' ', ase.apellidos) as nombre_asesor,
                COUNT(a.codigo_asesoria) as total_asesorias
            FROM tbl_asesor ase
            LEFT JOIN tbl_asesoria a ON ase.id_asesor = a.id_asesor
            GROUP BY ase.id_asesor, ase.nombre, ase.apellidos
            ORDER BY total_asesorias DESC
            LIMIT 10
        """)
        
        resultados = cursor.fetchall()
        cursor.close()
        connection.close()
        
        # Formatear datos para ApexCharts
        asesores = []
        cantidades = []
        
        if resultados:
            for resultado in resultados:
                asesores.append(resultado['nombre_asesor'] or 'Sin nombre')
                cantidades.append(int(resultado['total_asesorias']))
        else:
            asesores = ['Sin datos']
            cantidades = [0]
        
        return jsonify({
            'asesores': asesores,
            'cantidades': cantidades
        })
        
    except Error as e:
        print(f"Error en obtener_ranking_asesores: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    except Exception as e:
        print(f"Error general en obtener_ranking_asesores: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@panel_admin_bp.route('/api/asesorias-ultimos-dias')
def obtener_asesorias_ultimos_dias():
    """API para obtener asesorías por día en los últimos 7 días"""
    if not verificar_sesion_admin():
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                DATE(fecha_asesoria) as fecha,
                COUNT(*) as cantidad
            FROM tbl_asesoria 
            WHERE fecha_asesoria >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            AND fecha_asesoria IS NOT NULL
            GROUP BY DATE(fecha_asesoria)
            ORDER BY fecha ASC
        """)
        
        resultados = cursor.fetchall()
        cursor.close()
        connection.close()
        
        # Formatear datos para ApexCharts
        fechas = []
        cantidades = []
        
        if resultados:
            for resultado in resultados:
                fechas.append(resultado['fecha'].strftime('%Y-%m-%d'))
                cantidades.append(int(resultado['cantidad']))
        else:
            fechas = ['Sin datos']
            cantidades = [0]
        
        return jsonify({
            'fechas': fechas,
            'cantidades': cantidades
        })
        
    except Error as e:
        print(f"Error en obtener_asesorias_ultimos_dias: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    except Exception as e:
        print(f"Error general en obtener_asesorias_ultimos_dias: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@panel_admin_bp.route('/api/visas-mas-solicitadas')
def obtener_visas_mas_solicitadas():
    """API para obtener el ranking de visas más solicitadas"""
    if not verificar_sesion_admin():
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                tipo_asesoria,
                COUNT(*) as cantidad,
                ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tbl_asesoria)), 1) as porcentaje
            FROM tbl_asesoria 
            GROUP BY tipo_asesoria
            ORDER BY cantidad DESC
            LIMIT 8
        """)
        
        resultados = cursor.fetchall()
        cursor.close()
        connection.close()
        
        # Formatear datos para la tabla
        visas_ranking = []
        
        if resultados:
            for i, resultado in enumerate(resultados, 1):
                visa = {
                    'posicion': i,
                    'tipo_visa': resultado['tipo_asesoria'] or 'Sin tipo',
                    'cantidad': int(resultado['cantidad']),
                    'porcentaje': float(resultado['porcentaje'])
                }
                visas_ranking.append(visa)
        
        return jsonify({'visas_ranking': visas_ranking})
        
    except Error as e:
        print(f"Error en obtener_visas_mas_solicitadas: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    except Exception as e:
        print(f"Error general en obtener_visas_mas_solicitadas: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@panel_admin_bp.route('/api/generar-reporte-admin')
def generar_reporte_admin():
    """API para generar reporte PDF del administrador"""
    if not verificar_sesion_admin():
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        if not connection:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Obtener métricas importantes
        metricas = {}
        
        # Total de asesorías
        cursor.execute("SELECT COUNT(*) as total FROM tbl_asesoria")
        metricas['total_asesorias'] = cursor.fetchone()['total']
        
        # Asesorías por estado
        cursor.execute("SELECT COUNT(*) as terminadas FROM tbl_asesoria WHERE estado_proceso = 'Terminado'")
        metricas['asesorias_terminadas'] = cursor.fetchone()['terminadas']
        
        cursor.execute("SELECT COUNT(*) as activas FROM tbl_asesoria WHERE estado_proceso = 'Proceso activo'")
        metricas['asesorias_activas'] = cursor.fetchone()['activas']
        
        cursor.execute("SELECT COUNT(*) as pendientes FROM tbl_asesoria WHERE estado_proceso = 'Pendiente'")
        metricas['asesorias_pendientes'] = cursor.fetchone()['pendientes']
        
        # Ingresos
        cursor.execute("SELECT COALESCE(SUM(monto), 0) as total FROM tbl_pago_asesoria WHERE estado_pago = 'Completado'")
        result = cursor.fetchone()
        metricas['ingresos_totales'] = float(result['total']) if result and result['total'] else 0.0
        
        cursor.execute("""
            SELECT COALESCE(SUM(monto), 0) as mes 
            FROM tbl_pago_asesoria 
            WHERE estado_pago = 'Completado'
            AND MONTH(fecha_pago) = MONTH(CURDATE())
            AND YEAR(fecha_pago) = YEAR(CURDATE())
        """)
        result = cursor.fetchone()
        metricas['ingresos_mes'] = float(result['mes']) if result and result['mes'] else 0.0
        
        # Totales generales
        cursor.execute("SELECT COUNT(*) as total FROM tbl_asesor")
        metricas['total_asesores'] = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) as total FROM tbl_usuario")
        metricas['total_usuarios'] = cursor.fetchone()['total']
        
        # Tasa de completación
        if metricas['total_asesorias'] > 0:
            metricas['tasa_completacion'] = round((metricas['asesorias_terminadas'] / metricas['total_asesorias']) * 100, 1)
        else:
            metricas['tasa_completacion'] = 0
        
        cursor.close()
        connection.close()
        
        # Generar serial de 6 dígitos basado en timestamp
        serial = str(int(time.time()))[-6:]

        # Generar nombre del archivo
        fecha_generacion = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        nombre_archivo = f"admin_reporte_{serial}_{fecha_generacion}.pdf"
        
        # Generar PDF
        archivo_pdf = crear_reporte_admin_pdf(metricas)
        
        return send_file(
            archivo_pdf,
            as_attachment=True,
            download_name=nombre_archivo,
            mimetype='application/pdf'
        )
        
    except Error as e:
        print(f"Error en generar_reporte_admin: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    except Exception as e:
        print(f"Error general en generar_reporte_admin: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

def crear_reporte_admin_pdf(metricas):
    """Crear el archivo PDF del reporte del administrador"""
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
    story.append(Paragraph("Reporte Ejecutivo del Sistema", title_style))
    story.append(Paragraph("Panel de Administración", subtitle_style))
    
    story.append(Paragraph(f"Fecha de generación: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')}", normal_style))
    story.append(Spacer(1, 30))
    
    # Tabla de métricas principales
    story.append(Paragraph("Métricas Principales del Sistema", subtitle_style))
    
    # Datos de la tabla
    data = [
        ['Métrica', 'Valor'],
        ['Total de Asesorías', str(metricas['total_asesorias'])],
        ['Asesorías Terminadas', str(metricas['asesorias_terminadas'])],
        ['Asesorías en Proceso', str(metricas['asesorias_activas'])],
        ['Asesorías Pendientes', str(metricas['asesorias_pendientes'])],
        ['Tasa de Completación', f"{metricas['tasa_completacion']}%"],
        ['Ingresos Totales', f"${metricas['ingresos_totales']:,.0f} COP"],
        ['Ingresos del Mes', f"${metricas['ingresos_mes']:,.0f} COP"],
        ['Total de Asesores', str(metricas['total_asesores'])],
        ['Total de Usuarios', str(metricas['total_usuarios'])]
    ]
    
    # Crear tabla
    table = Table(data, colWidths=[3*inch, 2*inch])
    table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F2937')),
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
        ('LINEBELOW', (0, 0), (-1, 0), 2, colors.HexColor('#1F2937')),
        
        # Alternating rows
        ('BACKGROUND', (0, 2), (-1, 2), colors.white),
        ('BACKGROUND', (0, 4), (-1, 4), colors.white),
        ('BACKGROUND', (0, 6), (-1, 6), colors.white),
        ('BACKGROUND', (0, 8), (-1, 8), colors.white),
        
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
