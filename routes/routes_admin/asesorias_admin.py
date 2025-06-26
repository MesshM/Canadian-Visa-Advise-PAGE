from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session, send_file
from functools import wraps
import mysql.connector
from mysql.connector import Error
from datetime import datetime, timedelta, time as dt_time
from config.database import create_connection

# Importaciones para PDF mejoradas
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.utils import ImageReader
import io
import base64
import os

asesorias_admin_bp = Blueprint('asesorias_admin', __name__)

def get_pdf_styles():
    """Obtener estilos mejorados para PDF"""
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        spaceAfter=24,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1f2937'),
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=16,
        spaceBefore=24,
        textColor=colors.HexColor('#374151'),
        fontName='Helvetica-Bold'
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=8,
        fontName='Helvetica'
    )
    
    return styles, title_style, heading_style, normal_style

def get_logo_image():
    """Obtener imagen del logo con mejor manejo de errores"""
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        logo_path = os.path.join(base_dir, "static", "img", "logo-cva.png")
        if os.path.exists(logo_path):
            return Image(logo_path, width=150, height=50)
    except Exception as e:
        print(f"Error al cargar logo: {e}")
    return None

def admin_required(f):
    """Decorador para verificar que el usuario sea administrador"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or session.get('user_role') != 'Administrador':
            flash('Acceso denegado. Se requieren permisos de administrador.', 'error')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

@asesorias_admin_bp.route('/admin/asesores/<int:id_asesor>/horarios-disponibles')
@admin_required
def horarios_disponibles_asesor(id_asesor):
    """Devuelve los horarios disponibles para un asesor específico con mejor validación"""
    try:
        conn = create_connection()
        if not conn:
            return jsonify({'success': False, 'error': 'Error de conexión a la base de datos'}), 500
        cursor = conn.cursor(dictionary=True)

        fecha = request.args.get('fecha')
        if fecha:
            try:
                fecha_obj = datetime.strptime(fecha, '%Y-%m-%d')
            except ValueError:
                return jsonify({'success': False, 'error': 'Formato de fecha inválido'}), 400
                
            dia_semana = fecha_obj.weekday() + 1

            # Generar horarios de 7:00 a 15:00 (solo días laborales)
            if dia_semana >= 1 and dia_semana <= 5:
                horarios_base = []
                for hora in range(7, 16):
                    horarios_base.append(f"{hora:02d}:00")
            else:
                horarios_base = []

            # Verificar horarios ocupados con mejor consulta
            cursor.execute("""
                SELECT TIME_FORMAT(TIME(fecha_asesoria), '%H:%i') as hora
                FROM tbl_asesoria
                WHERE id_asesor = %s AND DATE(fecha_asesoria) = %s 
                AND estado NOT IN ('Cancelada', 'Cancelado')
            """, (id_asesor, fecha_obj.date()))
            ocupadas = [r['hora'] for r in cursor.fetchall()]

            # Verificar reservas temporales activas
            cursor.execute("""
                SELECT TIME_FORMAT(TIME(fecha), '%H:%i') as hora
                FROM tbl_reservas_temporales
                WHERE id_asesor = %s AND DATE(fecha) = %s AND expiracion > NOW()
            """, (id_asesor, fecha_obj.date()))
            reservadas = [r['hora'] for r in cursor.fetchall()]

            horarios_disponibles = [h for h in horarios_base if h not in ocupadas and h not in reservadas]
            conn.close()
            return jsonify({'success': True, 'horarios': horarios_disponibles})
        else:
            # Horarios para los próximos 30 días con mejor lógica
            hoy = datetime.now().date()
            disponibles = {}
            for i in range(0, 30):
                dia = hoy + timedelta(days=i)
                dia_semana = dia.weekday() + 1
                
                if dia_semana >= 1 and dia_semana <= 5:
                    horarios_base = []
                    for hora in range(7, 16):
                        horarios_base.append(f"{hora:02d}:00")
                    
                    cursor.execute("""
                        SELECT TIME_FORMAT(TIME(fecha_asesoria), '%H:%i') as hora
                        FROM tbl_asesoria
                        WHERE id_asesor = %s AND DATE(fecha_asesoria) = %s 
                        AND estado NOT IN ('Cancelada', 'Cancelado')
                    """, (id_asesor, dia))
                    ocupadas = [r['hora'] for r in cursor.fetchall()]
                    
                    cursor.execute("""
                        SELECT TIME_FORMAT(TIME(fecha), '%H:%i') as hora
                        FROM tbl_reservas_temporales
                        WHERE id_asesor = %s AND DATE(fecha) = %s AND expiracion > NOW()
                    """, (id_asesor, dia))
                    reservadas = [r['hora'] for r in cursor.fetchall()]
                    
                    horarios_disponibles = [h for h in horarios_base if h not in ocupadas and h not in reservadas]
                    if horarios_disponibles:
                        disponibles[dia.strftime('%Y-%m-%d')] = horarios_disponibles
            
            conn.close()
            return jsonify({'success': True, 'disponibles': disponibles})
    except Exception as e:
        print(f"Error en horarios_disponibles_asesor: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@asesorias_admin_bp.route('/admin/asesorias/horarios-ocupados')
@admin_required
def horarios_ocupados():
    """Devuelve los horarios ocupados con mejor validación"""
    try:
        fecha = request.args.get('fecha')
        asesor = request.args.get('asesor')
        
        if not fecha or not asesor:
            return jsonify({'success': False, 'error': 'Parámetros faltantes'}), 400

        try:
            datetime.strptime(fecha, '%Y-%m-%d')
        except ValueError:
            return jsonify({'success': False, 'error': 'Formato de fecha inválido'}), 400

        conn = create_connection()
        if not conn:
            return jsonify({'success': False, 'error': 'Error de conexión a la base de datos'}), 500
        cursor = conn.cursor(dictionary=True)

        # Obtener horarios ocupados por asesorías existentes
        cursor.execute("""
            SELECT TIME_FORMAT(TIME(fecha_asesoria), '%H:%i') as hora
            FROM tbl_asesoria
            WHERE id_asesor = %s AND DATE(fecha_asesoria) = %s 
            AND estado NOT IN ('Cancelada', 'Cancelado')
        """, (asesor, fecha))
        ocupadas = [r['hora'] for r in cursor.fetchall()]

        # Obtener horarios con reservas temporales activas
        cursor.execute("""
            SELECT TIME_FORMAT(TIME(fecha), '%H:%i') as hora
            FROM tbl_reservas_temporales
            WHERE id_asesor = %s AND DATE(fecha) = %s AND expiracion > NOW()
        """, (asesor, fecha))
        reservadas = [r['hora'] for r in cursor.fetchall()]

        horarios_ocupados = list(set(ocupadas + reservadas))
        
        conn.close()
        return jsonify({'success': True, 'horarios': horarios_ocupados})
    except Exception as e:
        print(f"Error en horarios_ocupados: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@asesorias_admin_bp.route('/admin/asesorias/validar-horario', methods=['POST'])
@admin_required
def validar_horario_asesoria():
    """Valida si un horario está disponible con mejor lógica de validación"""
    try:
        data = request.get_json()
        id_asesor = data.get('id_asesor')
        fecha_asesoria = data.get('fecha_asesoria')
        codigo_asesoria_actual = data.get('codigo_asesoria')

        if not id_asesor or not fecha_asesoria:
            return jsonify({'success': False, 'error': 'Datos incompletos'}), 400

        try:
            id_asesor = int(id_asesor)
            # Validar formato de fecha
            datetime.strptime(fecha_asesoria.replace('T', ' '), '%Y-%m-%d %H:%M')
        except (ValueError, TypeError):
            return jsonify({'success': False, 'error': 'Datos inválidos'}), 400

        conn = create_connection()
        cursor = conn.cursor(dictionary=True)

        # Verificar si el horario está ocupado
        if codigo_asesoria_actual:
            cursor.execute('''
                SELECT COUNT(*) as total
                FROM tbl_asesoria
                WHERE id_asesor = %s AND fecha_asesoria = %s 
                AND estado NOT IN ('Cancelada', 'Cancelado') 
                AND codigo_asesoria != %s
            ''', (id_asesor, fecha_asesoria.replace('T', ' '), codigo_asesoria_actual))
        else:
            cursor.execute('''
                SELECT COUNT(*) as total
                FROM tbl_asesoria
                WHERE id_asesor = %s AND fecha_asesoria = %s 
                AND estado NOT IN ('Cancelada', 'Cancelado')
            ''', (id_asesor, fecha_asesoria.replace('T', ' ')))
        
        ocupado = cursor.fetchone()['total'] > 0

        conn.close()
        return jsonify({'success': not ocupado, 'ocupado': ocupado})
    except Exception as e:
        print(f"Error en validar_horario_asesoria: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@asesorias_admin_bp.route('/admin/asesorias/<int:codigo>/exportar-pdf')
@admin_required
def exportar_asesoria_pdf(codigo):
    """Exporta una asesoría individual a PDF con logo mejorado"""
    try:
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT a.*, 
                   CONCAT(u.nombres, ' ', u.apellidos) as cliente_nombre,
                   u.correo as cliente_correo, u.celular as cliente_telefono,
                   ase.nombre as asesor_nombre, ase.apellidos as asesor_apellidos, 
                   ase.correo as asesor_correo
            FROM tbl_asesoria a
            LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            LEFT JOIN tbl_asesor ase ON a.id_asesor = ase.id_asesor
            WHERE a.codigo_asesoria = %s
        ''', (codigo,))
        asesoria = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not asesoria:
            return jsonify({'error': 'Asesoría no encontrada'}), 404

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=60, leftMargin=50, rightMargin=50, bottomMargin=50)
        styles, title_style, heading_style, normal_style = get_pdf_styles()
        elements = []

        # Header con logo
        logo_img = get_logo_image()
        if logo_img:
            elements.append(logo_img)
            elements.append(Spacer(1, 20))
        
        # Título principal
        elements.append(Paragraph("REPORTE DE ASESORÍA", title_style))
        elements.append(Spacer(1, 30))

        # Información de la asesoría en tabla mejorada
        data = [
            ["CÓDIGO DE ASESORÍA", str(asesoria['codigo_asesoria'])],
            ["CLIENTE", asesoria.get('cliente_nombre', 'N/A')],
            ["CORREO CLIENTE", asesoria.get('cliente_correo', 'N/A')],
            ["TELÉFONO CLIENTE", asesoria.get('cliente_telefono', 'N/A')],
            ["TIPO DE ASESORÍA", asesoria.get('tipo_asesoria', 'N/A')],
            ["FECHA Y HORA", asesoria['fecha_asesoria'].strftime('%d/%m/%Y %H:%M') if asesoria['fecha_asesoria'] else 'Por programar'],
            ["LUGAR", asesoria.get('lugar', 'N/A')],
            ["ASESOR ASIGNADO", f"{asesoria.get('asesor_nombre', '')} {asesoria.get('asesor_apellidos', '')}".strip() or 'Sin asignar'],
            ["CORREO ASESOR", asesoria.get('asesor_correo', 'N/A')],
            ["ESPECIALIDAD", asesoria.get('especialidad', 'N/A')],
            ["ESTADO", asesoria.get('estado', 'N/A')],
            ["ESTADO PROCESO", asesoria.get('estado_proceso', 'N/A')],
            ["TIPO DOCUMENTO", asesoria.get('tipo_documento', 'N/A')],
            ["NÚMERO DOCUMENTO", asesoria.get('numero_documento', 'N/A')],
        ]
        
        if asesoria.get('descripcion'):
            data.append(["DESCRIPCIÓN", asesoria.get('descripcion', '')])

        table = Table(data, colWidths=[140, 350])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#f8fafc")),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#d1d5db")),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(table)
        
        # Footer con fecha de generación
        elements.append(Spacer(1, 30))
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#6b7280'),
            alignment=TA_CENTER
        )
        elements.append(Paragraph(f"Documento generado el {datetime.now().strftime('%d/%m/%Y a las %H:%M')}", footer_style))
        
        doc.build(elements)
        buffer.seek(0)
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"asesoria_{codigo}.pdf",
            mimetype='application/pdf'
        )
    except Exception as e:
        print(f"Error al generar PDF: {e}")
        return jsonify({'error': f'Error al generar PDF: {str(e)}'}), 500

@asesorias_admin_bp.route('/admin/asesorias/exportar-todas-pdf')
@admin_required
def exportar_todas_asesorias_pdf():
    """Exporta todas las asesorías a un solo PDF con mejor formato"""
    try:
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT a.codigo_asesoria, a.fecha_asesoria, a.tipo_asesoria, 
                   a.lugar, a.estado, a.estado_proceso, a.descripcion,
                   CONCAT(u.nombres, ' ', u.apellidos) as cliente_nombre,
                   u.correo as cliente_correo,
                   CONCAT(ase.nombre, ' ', ase.apellidos) as asesor_completo
            FROM tbl_asesoria a
            LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            LEFT JOIN tbl_asesor ase ON a.id_asesor = ase.id_asesor
            WHERE a.estado NOT IN ('Cancelada', 'Cancelado')
            ORDER BY a.codigo_asesoria DESC
        ''')
        asesorias = cursor.fetchall()
        cursor.close()
        conn.close()

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20, leftMargin=20, topMargin=50, bottomMargin=30)
        styles, title_style, heading_style, normal_style = get_pdf_styles()
        elements = []

        # Header con logo
        logo_img = get_logo_image()
        if logo_img:
            elements.append(logo_img)
            elements.append(Spacer(1, 20))
        
        elements.append(Paragraph("REPORTE GENERAL DE ASESORÍAS", title_style))
        elements.append(Spacer(1, 10))
        
        # Información del reporte
        info_style = ParagraphStyle(
            'Info',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#6b7280'),
            alignment=TA_CENTER
        )
        elements.append(Paragraph(f"Generado el {datetime.now().strftime('%d/%m/%Y a las %H:%M')} | Total de asesorías: {len(asesorias)}", info_style))
        elements.append(Spacer(1, 20))

        # Encabezados y datos de la tabla
        table_data = [
            [
                Paragraph("<b>Código</b>", normal_style),
                Paragraph("<b>Cliente</b>", normal_style),
                Paragraph("<b>Tipo</b>", normal_style),
                Paragraph("<b>Fecha</b>", normal_style),
                Paragraph("<b>Asesor</b>", normal_style),
                Paragraph("<b>Estado</b>", normal_style),
            ]
        ]
        
        for a in asesorias:
            fecha_formateada = a['fecha_asesoria'].strftime('%d/%m/%Y %H:%M') if a['fecha_asesoria'] else 'Por programar'
            table_data.append([
                Paragraph(str(a['codigo_asesoria']), normal_style),
                Paragraph(a.get('cliente_nombre', 'N/A') or 'N/A', normal_style),
                Paragraph(a.get('tipo_asesoria', 'N/A') or 'N/A', normal_style),
                Paragraph(fecha_formateada, normal_style),
                Paragraph(a.get('asesor_completo', 'Sin asignar') or 'Sin asignar', normal_style),
                Paragraph(a.get('estado_proceso', 'N/A') or 'N/A', normal_style),
            ])

        # Ajustar anchos de columna
        col_widths = [50, 120, 80, 80, 120, 80]

        table = Table(table_data, colWidths=col_widths, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#d1d5db")),
            ('WORDWRAP', (0, 0), (-1, -1), True),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(table)
        doc.build(elements)
        buffer.seek(0)
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"reporte_asesorias_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf",
            mimetype='application/pdf'
        )
    except Exception as e:
        print(f"Error al generar reporte PDF: {e}")
        return jsonify({'error': f'Error al generar PDF: {str(e)}'}), 500

@asesorias_admin_bp.route('/admin/asesorias')
@admin_required
def listar_asesorias():
    """Vista principal mejorada para la gestión de asesorías"""
    try:
        conn = create_connection()
        if not conn:
            flash('Error de conexión a la base de datos', 'error')
            return render_template('admin/asesorias_admin.html', asesorias=[], asesores=[])
        cursor = conn.cursor(dictionary=True)
        
        # Obtener asesorías con mejor consulta
        cursor.execute('''
            SELECT a.codigo_asesoria, a.fecha_asesoria, a.tipo_asesoria, 
                   COALESCE(p.estado_pago, 'Pendiente') AS estado_pago, 
                   a.estado_proceso, a.estado,
                   a.lugar, a.descripcion, a.asesor_asignado,
                   CONCAT(u.nombres, ' ', u.apellidos) as cliente_nombre,
                   u.correo as cliente_correo,
                   CONCAT(ase.nombre, ' ', ase.apellidos) as asesor_nombre
            FROM tbl_asesoria a
            LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            LEFT JOIN tbl_asesor ase ON a.id_asesor = ase.id_asesor
            LEFT JOIN tbl_pago_asesoria p ON a.codigo_asesoria = p.codigo_asesoria
            WHERE a.estado NOT IN ('Cancelada', 'Cancelado')
            ORDER BY a.codigo_asesoria DESC
            LIMIT 50
        ''')
        asesorias = cursor.fetchall()
        
        # Obtener lista de asesores
        cursor.execute('SELECT id_asesor, nombre, apellidos FROM tbl_asesor ORDER BY nombre, apellidos')
        asesores = cursor.fetchall()
        conn.close()
        return render_template('admin/asesorias_admin.html', asesorias=asesorias, asesores=asesores)
    except Exception as e:
        print(f"Error al cargar asesorías: {e}")
        flash(f'Error al cargar asesorías: {str(e)}', 'error')
        return render_template('admin/asesorias_admin.html', asesorias=[], asesores=[])

@asesorias_admin_bp.route('/admin/asesorias/filtrar')
@admin_required
def filtrar_asesorias_admin():
    """Filtrar asesorías con mejor rendimiento y validación"""
    try:
        buscar = request.args.get("buscar", "").strip().lower()
        asesor = request.args.get("asesor", "").strip()
        estado_proceso = request.args.get("estado_proceso", "").strip()
        fecha = request.args.get("fecha", "").strip()

        conn = create_connection()
        if not conn:
            return jsonify({"success": False, "error": "Error de conexión a la base de datos"}), 500
        cursor = conn.cursor(dictionary=True)

        query = '''
            SELECT a.codigo_asesoria, a.fecha_asesoria, a.tipo_asesoria, 
                   COALESCE(p.estado_pago, 'Pendiente') AS estado_pago, 
                   a.estado_proceso, a.estado,
                   a.lugar, a.descripcion, a.asesor_asignado,
                   CONCAT(u.nombres, ' ', u.apellidos) as cliente_nombre,
                   u.correo as cliente_correo,
                   CONCAT(ase.nombre, ' ', ase.apellidos) as asesor_nombre,
                   a.id_asesor
            FROM tbl_asesoria a
            LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            LEFT JOIN tbl_asesor ase ON a.id_asesor = ase.id_asesor
            LEFT JOIN tbl_pago_asesoria p ON a.codigo_asesoria = p.codigo_asesoria
            WHERE a.estado NOT IN ('Cancelada', 'Cancelado')
        '''
        params = []

        if buscar:
            query += " AND (LOWER(CONCAT(u.nombres, ' ', u.apellidos)) LIKE %s OR LOWER(u.correo) LIKE %s) "
            params.extend([f"%{buscar}%", f"%{buscar}%"])
        if asesor:
            try:
                asesor_id = int(asesor)
                query += " AND a.id_asesor = %s "
                params.append(asesor_id)
            except ValueError:
                pass
        if estado_proceso:
            query += " AND a.estado_proceso = %s "
            params.append(estado_proceso)
        if fecha:
            try:
                datetime.strptime(fecha, '%Y-%m-%d')
                query += " AND DATE(a.fecha_asesoria) = %s "
                params.append(fecha)
            except ValueError:
                pass

        query += " ORDER BY a.codigo_asesoria DESC LIMIT 100"

        cursor.execute(query, params)
        asesorias = cursor.fetchall()
        cursor.close()
        conn.close()

        # Formatear fechas para el frontend
        for a in asesorias:
            if a["fecha_asesoria"]:
                a["fecha_asesoria"] = a["fecha_asesoria"].strftime("%Y-%m-%dT%H:%M")
        
        return jsonify({"success": True, "asesorias": asesorias})
    except Exception as e:
        print(f"Error en filtrar_asesorias_admin: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@asesorias_admin_bp.route('/admin/asesorias/<int:codigo>/ver')
@admin_required
def ver_asesoria(codigo):
    """Ver detalles de asesoría con mejor manejo de datos"""
    try:
        conn = create_connection()
        if not conn:
            return jsonify({'success': False, '': 'Error de conexión a la base de datos'}), 500
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT a.*, 
                   CONCAT(u.nombres, ' ', u.apellidos) as cliente_nombre,
                   u.correo as cliente_correo, u.celular as cliente_telefono,
                   CONCAT(ase.nombre, ' ', ase.apellidos) as asesor_nombre, 
                   ase.correo as asesor_correo
            FROM tbl_asesoria a
            LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            LEFT JOIN tbl_asesor ase ON a.id_asesor = ase.id_asesor
            WHERE a.codigo_asesoria = %s
        ''', (codigo,))
        asesoria = cursor.fetchone()
        
        # Obtener historial de pagos
        cursor.execute('''
            SELECT monto, metodo_pago, estado_pago, fecha_pago
            FROM tbl_pago_asesoria
            WHERE codigo_asesoria = %s
            ORDER BY fecha_pago DESC
        ''', (codigo,))
        pagos = cursor.fetchall()
        cursor.close()
        conn.close()
        
        if not asesoria:
            return jsonify({'success': False, 'error': 'Asesoría no encontrada'})
        
        # Formatear fecha para el frontend
        if asesoria.get("fecha_asesoria"):
            asesoria["fecha_asesoria_formatted"] = asesoria["fecha_asesoria"].strftime("%d/%m/%Y %H:%M")
        
        return jsonify({'success': True, 'asesoria': asesoria, 'pagos': pagos})
    except Exception as e:
        print(f"Error en ver_asesoria: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@asesorias_admin_bp.route('/admin/asesorias/<int:codigo>/editar', methods=['POST'])
@admin_required
def editar_asesoria(codigo):
    """Actualiza los datos de una asesoría con validación mejorada y liberación automática de horarios"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No se recibieron datos"}), 400

        campos = [
            "tipo_asesoria", "lugar", "estado_proceso", "id_asesor",
            "especialidad", "tipo_documento", "numero_documento", "descripcion"
        ]
        valores = [data.get(c) for c in campos]
        fecha_asesoria = data.get("fecha_asesoria")
        
        # Validaciones básicas
        if data.get("id_asesor"):
            try:
                int(data.get("id_asesor"))
            except (ValueError, TypeError):
                return jsonify({"error": "ID de asesor inválido"}), 400

        conn = create_connection()
        if not conn:
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
        cursor = conn.cursor(dictionary=True)

        # Obtener información actual de la asesoría
        cursor.execute("""
            SELECT a.fecha_asesoria, a.id_asesor, s.id_usuario
            FROM tbl_asesoria a
            LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            WHERE a.codigo_asesoria = %s
        """, (codigo,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return jsonify({"error": "Asesoría no encontrada"}), 404

        fecha_anterior = row["fecha_asesoria"]
        id_asesor_anterior = row["id_asesor"]
        id_usuario = row["id_usuario"]

        # Validar disponibilidad del nuevo horario si se cambió
        if fecha_asesoria and data.get("id_asesor"):
            nueva_fecha_hora = fecha_asesoria.replace("T", " ")
            
            # Verificar si el horario está ocupado (excluyendo la asesoría actual)
            cursor.execute("""
                SELECT COUNT(*) as total
                FROM tbl_asesoria
                WHERE id_asesor = %s AND fecha_asesoria = %s 
                AND estado NOT IN ('Cancelada', 'Cancelado') 
                AND codigo_asesoria != %s
            """, (data.get("id_asesor"), nueva_fecha_hora, codigo))
            
            if cursor.fetchone()['total'] > 0:
                conn.close()
                return jsonify({"error": "El horario seleccionado ya está ocupado"}), 400

        # Construir query de actualización
        set_fields = ", ".join([f"{c}=%s" for c in campos])
        params = valores
        if fecha_asesoria:
            set_fields += ", fecha_asesoria=%s"
            params.append(fecha_asesoria.replace("T", " "))
        params.append(codigo)

        # Actualizar la asesoría
        cursor = conn.cursor()
        cursor.execute(
            f"UPDATE tbl_asesoria SET {set_fields} WHERE codigo_asesoria=%s",
            params
        )
        conn.commit()

        # Gestión de horarios: liberar el anterior y ocupar el nuevo
        if fecha_asesoria and id_usuario:
            fecha_anterior_str = fecha_anterior.strftime("%Y-%m-%dT%H:%M") if fecha_anterior else None
            
            # Si cambió la fecha/hora o el asesor, liberar el horario anterior
            if (fecha_anterior_str and 
                (fecha_anterior_str != fecha_asesoria or str(id_asesor_anterior) != str(data.get("id_asesor")))):
                
                # Liberar el horario anterior
                cursor.execute("""
                    DELETE FROM tbl_reservas_temporales
                    WHERE id_asesor = %s AND fecha = %s AND id_usuario = %s
                """, (id_asesor_anterior, fecha_anterior, id_usuario))
                conn.commit()
            
            # Crear/actualizar reserva temporal para el nuevo horario
            if data.get("id_asesor") and id_usuario:
                cursor.execute("""
                    INSERT INTO tbl_reservas_temporales (id_asesor, fecha, expiracion, id_usuario)
                    VALUES (%s, %s, DATE_ADD(NOW(), INTERVAL 2 HOUR), %s)
                    ON DUPLICATE KEY UPDATE expiracion = DATE_ADD(NOW(), INTERVAL 2 HOUR)
                """, (data.get("id_asesor"), fecha_asesoria.replace("T", " "), id_usuario))
                conn.commit()

        cursor.close()
        conn.close()
        return jsonify({"mensaje": "Asesoría actualizada exitosamente"})
    except Exception as e:
        print(f"Error en editar_asesoria: {e}")
        return jsonify({"error": f"Error al actualizar la asesoría: {str(e)}"}), 500

@asesorias_admin_bp.route('/admin/asesorias/<int:codigo>/eliminar', methods=['POST'])
@admin_required
def eliminar_asesoria(codigo):
    """Cancela una asesoría y libera el horario automáticamente"""
    try:
        data = request.get_json()
        motivo = data.get('motivo', 'Cancelada por administrador') if data else 'Cancelada por administrador'

        conn = create_connection()
        if not conn:
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
        cursor = conn.cursor(dictionary=True)

        # Obtener información de la asesoría antes de cancelarla
        cursor.execute("""
            SELECT a.fecha_asesoria, a.id_asesor, s.id_usuario
            FROM tbl_asesoria a
            LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            WHERE a.codigo_asesoria = %s
        """, (codigo,))
        asesoria = cursor.fetchone()

        if not asesoria:
            conn.close()
            return jsonify({"error": "Asesoría no encontrada"}), 404

        # Actualizar el estado de la asesoría a cancelada
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE tbl_asesoria 
            SET estado = 'Cancelada', estado_proceso = 'Cancelado'
            WHERE codigo_asesoria = %s
        """, (codigo,))
        conn.commit()

        # Liberar el horario automáticamente
        if asesoria['fecha_asesoria'] and asesoria['id_asesor'] and asesoria['id_usuario']:
            cursor.execute("""
                DELETE FROM tbl_reservas_temporales
                WHERE id_asesor = %s AND fecha = %s AND id_usuario = %s
            """, (asesoria['id_asesor'], asesoria['fecha_asesoria'], asesoria['id_usuario']))
            conn.commit()

        cursor.close()
        conn.close()
        return jsonify({"mensaje": "Asesoría cancelada exitosamente y horario liberado"})
    except Exception as e:
        print(f"Error en eliminar_asesoria: {e}")
        return jsonify({"error": f"Error al cancelar la asesoría: {str(e)}"}), 500
