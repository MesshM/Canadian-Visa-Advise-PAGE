from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session, send_file
from functools import wraps
import mysql.connector
from mysql.connector import Error
from datetime import datetime, timedelta, time as dt_time
from config.database import create_connection

# Agregar estas importaciones al inicio del archivo después de las importaciones existentes
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

# Asegúrate de que el blueprint se registre así:
asesorias_admin_bp = Blueprint('asesorias_admin', __name__)

def get_pdf_styles():
    """Obtener estilos para PDF"""
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
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=12,
        spaceBefore=20,
        textColor=colors.HexColor('#374151'),
        fontName='Helvetica-Bold'
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6,
        fontName='Helvetica'
    )
    
    return styles, title_style, heading_style, normal_style

def get_logo_image():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logo_path = os.path.join(base_dir, "static", "img", "logo-cva.png")
    if os.path.exists(logo_path):
        return Image(logo_path, width=120, height=40)
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
    """
    Devuelve los horarios disponibles para un asesor específico.
    Si se pasa el parámetro 'fecha', solo devuelve los horarios de ese día.
    """
    try:
        conn = create_connection()
        if not conn:
            return jsonify({'success': False, 'error': 'Error de conexión a la base de datos'}), 500
        cursor = conn.cursor(dictionary=True)

        fecha = request.args.get('fecha')
        if fecha:
            # Solo horarios de ese día
            fecha_obj = datetime.strptime(fecha, '%Y-%m-%d')
            dia_semana = fecha_obj.weekday() + 1  # 1=Lunes, 7=Domingo
            mes = fecha_obj.month
            anio = fecha_obj.year

            # Generar horarios de 7:00 a 15:00 (solo días laborales)
            if dia_semana >= 1 and dia_semana <= 5:  # Lunes a Viernes
                horarios_base = []
                for hora in range(7, 16):  # 7:00 a 15:00
                    horarios_base.append(f"{hora:02d}:00")
            else:
                horarios_base = []

            # Verificar horarios ocupados
            cursor.execute("""
                SELECT TIME_FORMAT(TIME(fecha_asesoria), '%H:%i') as hora
                FROM tbl_asesoria
                WHERE id_asesor = %s AND DATE(fecha_asesoria) = %s AND estado IN ('Pendiente', 'Pagada')
            """, (id_asesor, fecha_obj.date()))
            ocupadas = [r['hora'] for r in cursor.fetchall()]

            # Verificar reservas temporales
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
            # Horarios para los próximos 30 días
            hoy = datetime.now().date()
            disponibles = {}
            for i in range(0, 30):
                dia = hoy + timedelta(days=i)
                dia_semana = dia.weekday() + 1
                
                # Solo días laborales
                if dia_semana >= 1 and dia_semana <= 5:
                    horarios_base = []
                    for hora in range(7, 16):  # 7:00 a 15:00
                        horarios_base.append(f"{hora:02d}:00")
                    
                    cursor.execute("""
                        SELECT TIME_FORMAT(TIME(fecha_asesoria), '%H:%i') as hora
                        FROM tbl_asesoria
                        WHERE id_asesor = %s AND DATE(fecha_asesoria) = %s AND estado IN ('Pendiente', 'Pagada')
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
        return jsonify({'success': False, 'error': str(e)}), 500

@asesorias_admin_bp.route('/admin/asesorias/horarios-ocupados')
@admin_required
def horarios_ocupados():
    """
    Devuelve los horarios ocupados para una fecha y asesor específicos.
    """
    try:
        fecha = request.args.get('fecha')
        asesor = request.args.get('asesor')
        
        if not fecha or not asesor:
            return jsonify({'success': False, 'error': 'Parámetros faltantes'}), 400

        conn = create_connection()
        if not conn:
            return jsonify({'success': False, 'error': 'Error de conexión a la base de datos'}), 500
        cursor = conn.cursor(dictionary=True)

        # Obtener horarios ocupados por asesorías existentes
        cursor.execute("""
            SELECT TIME_FORMAT(TIME(fecha_asesoria), '%H:%i') as hora
            FROM tbl_asesoria
            WHERE id_asesor = %s AND DATE(fecha_asesoria) = %s AND estado != 'Cancelada'
        """, (asesor, fecha))
        ocupadas = [r['hora'] for r in cursor.fetchall()]

        # Obtener horarios con reservas temporales activas
        cursor.execute("""
            SELECT TIME_FORMAT(TIME(fecha), '%H:%i') as hora
            FROM tbl_reservas_temporales
            WHERE id_asesor = %s AND DATE(fecha) = %s AND expiracion > NOW()
        """, (asesor, fecha))
        reservadas = [r['hora'] for r in cursor.fetchall()]

        # Combinar horarios ocupados y reservados
        horarios_ocupados = list(set(ocupadas + reservadas))
        
        conn.close()
        return jsonify({'success': True, 'horarios': horarios_ocupados})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@asesorias_admin_bp.route('/admin/asesorias/validar-horario', methods=['POST'])
@admin_required
def validar_horario_asesoria():
    """
    Valida si un horario está disponible para un asesor.
    """
    try:
        data = request.get_json()
        id_asesor = int(data.get('id_asesor'))
        fecha_asesoria = data.get('fecha_asesoria')  # formato: YYYY-MM-DDTHH:MM
        codigo_asesoria_actual = data.get('codigo_asesoria')  # Para excluir la asesoría actual en edición

        if not id_asesor or not fecha_asesoria:
            return jsonify({'success': False, 'error': 'Datos incompletos'}), 400

        conn = create_connection()
        cursor = conn.cursor(dictionary=True)

        # Verificar si el horario está ocupado (excluyendo la asesoría actual si se está editando)
        if codigo_asesoria_actual:
            cursor.execute('''
                SELECT COUNT(*) as total
                FROM tbl_asesoria
                WHERE id_asesor = %s AND fecha_asesoria = %s AND estado != 'Cancelada' AND codigo_asesoria != %s
            ''', (id_asesor, fecha_asesoria.replace('T', ' '), codigo_asesoria_actual))
        else:
            cursor.execute('''
                SELECT COUNT(*) as total
                FROM tbl_asesoria
                WHERE id_asesor = %s AND fecha_asesoria = %s AND estado != 'Cancelada'
            ''', (id_asesor, fecha_asesoria.replace('T', ' ')))
        
        ocupado = cursor.fetchone()['total'] > 0

        conn.close()
        return jsonify({'success': not ocupado, 'ocupado': ocupado})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@asesorias_admin_bp.route('/admin/asesores/buscar-id')
@admin_required
def buscar_id_asesor():
    """
    Devuelve el id_asesor dado el nombre o nombre completo.
    """
    nombre = request.args.get('nombre', '').strip()
    if not nombre:
        return jsonify({'error': 'Nombre requerido'}), 400
    conn = create_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT id_asesor FROM tbl_asesor
        WHERE nombre LIKE %s OR CONCAT(nombre, ' ', apellidos) LIKE %s
        LIMIT 1
    """, (f'%{nombre}%', f'%{nombre}%'))
    row = cursor.fetchone()
    conn.close()
    if row:
        return jsonify({'id_asesor': row['id_asesor']})
    return jsonify({'id_asesor': None})

@asesorias_admin_bp.route('/admin/asesorias/<int:codigo>/exportar-pdf')
@admin_required
def exportar_asesoria_pdf(codigo):
    """
    Exporta una asesoría individual a PDF.
    """
    try:
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT a.*, 
                   CONCAT(u.nombres, ' ', u.apellidos) as cliente_nombre,
                   u.correo as cliente_correo, u.celular as cliente_telefono,
                   ase.nombre as asesor_nombre, ase.apellidos as asesor_apellidos, ase.correo as asesor_correo
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
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=40, leftMargin=40, rightMargin=40, bottomMargin=40)
        styles, title_style, heading_style, normal_style = get_pdf_styles()
        elements = []

        # Agrega el logo como elemento de contenido
        logo_img = get_logo_image()
        if logo_img:
            elements.append(logo_img)
            elements.append(Spacer(1, 12))
        elements.append(Paragraph("Resumen de Asesoría", title_style))
        elements.append(Spacer(1, 18))

        data = [
            ["Código", asesoria['codigo_asesoria']],
            ["Cliente", asesoria.get('cliente_nombre', '')],
            ["Correo Cliente", asesoria.get('cliente_correo', '')],
            ["Teléfono Cliente", asesoria.get('cliente_telefono', '')],
            ["Tipo de Asesoría", asesoria.get('tipo_asesoria', '')],
            ["Fecha de Asesoría", asesoria['fecha_asesoria'].strftime('%d/%m/%Y %H:%M') if asesoria['fecha_asesoria'] else ''],
            ["Lugar", asesoria.get('lugar', '')],
            ["Asesor", f"{asesoria.get('asesor_nombre', '')} {asesoria.get('asesor_apellidos', '')}"],
            ["Correo Asesor", asesoria.get('asesor_correo', '')],
            ["Especialidad", asesoria.get('especialidad', '')],
            ["Estado", asesoria.get('estado', '')],
            ["Estado Proceso", asesoria.get('estado_proceso', '')],
            ["Descripción", asesoria.get('descripcion', '')],
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
            download_name=f"asesoria_{codigo}.pdf",
            mimetype='application/pdf'
        )
    except Exception as e:
        return jsonify({'error': f'Error al generar PDF: {str(e)}'}), 500

@asesorias_admin_bp.route('/admin/asesorias/exportar-todas-pdf')
@admin_required
def exportar_todas_asesorias_pdf():
    """
    Exporta todas las asesorías a un solo PDF.
    """
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
                   ase.nombre as asesor_nombre, ase.apellidos as asesor_apellidos
            FROM tbl_asesoria a
            LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            LEFT JOIN tbl_asesor ase ON a.id_asesor = ase.id_asesor
            ORDER BY a.codigo_asesoria DESC
        ''')
        asesorias = cursor.fetchall()
        cursor.close()
        conn.close()

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=18, leftMargin=18, topMargin=40, bottomMargin=18)
        styles, title_style, heading_style, normal_style = get_pdf_styles()
        elements = []

        # Agrega el logo como elemento de contenido
        logo_img = get_logo_image()
        if logo_img:
            elements.append(logo_img)
            elements.append(Spacer(1, 12))
        elements.append(Paragraph("Reporte de Asesorías", title_style))
        elements.append(Spacer(1, 18))

        # Encabezados y datos
        table_data = [
            [
                Paragraph("<b>Código</b>", normal_style),
                Paragraph("<b>Cliente</b>", normal_style),
                Paragraph("<b>Tipo</b>", normal_style),
                Paragraph("<b>Fecha</b>", normal_style),
                Paragraph("<b>Lugar</b>", normal_style),
                Paragraph("<b>Asesor</b>", normal_style),
                Paragraph("<b>Estado</b>", normal_style),
                Paragraph("<b>Estado Proceso</b>", normal_style),
            ]
        ]
        for a in asesorias:
            table_data.append([
                str(a['codigo_asesoria']),
                Paragraph(a.get('cliente_nombre', '') or '', normal_style),
                Paragraph(a.get('tipo_asesoria', '') or '', normal_style),
                a['fecha_asesoria'].strftime('%d/%m/%Y %H:%M') if a['fecha_asesoria'] else '',
                Paragraph(a.get('lugar', '') or '', normal_style),
                Paragraph(f"{a.get('asesor_nombre', '')} {a.get('asesor_apellidos', '')}", normal_style),
                Paragraph(a.get('estado', '') or '', normal_style),
                Paragraph(a.get('estado_proceso', '') or '', normal_style),
            ])

        # Ajustar anchos de columna para mejor visualización
        col_widths = [35, 90, 70, 65, 60, 90, 45, 65]

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
            download_name=f"asesorias_reporte.pdf",
            mimetype='application/pdf'
        )
    except Exception as e:
        return jsonify({'error': f'Error al generar PDF: {str(e)}'}), 500

@asesorias_admin_bp.route('/admin/asesorias')
@admin_required
def listar_asesorias():
    """
    Vista principal para la gestión de asesorías en el panel de administrador.
    """
    try:
        conn = create_connection()
        if not conn:
            flash('Error de conexión a la base de datos', 'error')
            return render_template('admin/asesorias_admin.html', asesorias=[], asesores=[])
        cursor = conn.cursor(dictionary=True)
        # Obtener todas las asesorías
        cursor.execute('''
            SELECT a.codigo_asesoria, a.fecha_asesoria, a.tipo_asesoria, 
                   COALESCE(p.estado_pago, 'Pendiente') AS estado_pago, 
                   a.estado_proceso, a.estado,
                   a.lugar, a.descripcion, a.asesor_asignado,
                   CONCAT(u.nombres, ' ', u.apellidos) as cliente_nombre,
                   u.correo as cliente_correo,
                   ase.nombre as asesor_nombre, ase.apellidos as asesor_apellidos
            FROM tbl_asesoria a
            LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            LEFT JOIN tbl_asesor ase ON a.id_asesor = ase.id_asesor
            LEFT JOIN tbl_pago_asesoria p ON a.codigo_asesoria = p.codigo_asesoria
            WHERE a.estado != 'Cancelada'
            ORDER BY a.codigo_asesoria DESC
        ''')
        asesorias = cursor.fetchall()
        # Obtener lista de asesores
        cursor.execute('SELECT id_asesor, nombre, apellidos FROM tbl_asesor ORDER BY nombre, apellidos')
        asesores = cursor.fetchall()
        conn.close()
        return render_template('admin/asesorias_admin.html', asesorias=asesorias, asesores=asesores)
    except Exception as e:
        flash(f'Error al cargar asesorías: {str(e)}', 'error')
        return render_template('admin/asesorias_admin.html', asesorias=[], asesores=[])

@asesorias_admin_bp.route('/admin/asesorias/filtrar')
@admin_required
def filtrar_asesorias_admin():
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
               ase.nombre as asesor_nombre, ase.apellidos as asesor_apellidos,
               a.id_asesor
        FROM tbl_asesoria a
        LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
        LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        LEFT JOIN tbl_asesor ase ON a.id_asesor = ase.id_asesor
        LEFT JOIN tbl_pago_asesoria p ON a.codigo_asesoria = p.codigo_asesoria
        WHERE a.estado != 'Cancelada'
    '''
    params = []

    if buscar:
        query += " AND (LOWER(CONCAT(u.nombres, ' ', u.apellidos)) LIKE %s OR LOWER(u.correo) LIKE %s) "
        params.extend([f"%{buscar}%", f"%{buscar}%"])
    if asesor:
        query += " AND a.id_asesor = %s "
        params.append(asesor)
    if estado_proceso:
        query += " AND a.estado_proceso = %s "
        params.append(estado_proceso)
    if fecha:
        query += " AND DATE(a.fecha_asesoria) = %s "
        params.append(fecha)

    query += " ORDER BY a.codigo_asesoria DESC"

    cursor.execute(query, params)
    asesorias = cursor.fetchall()
    cursor.close()
    conn.close()

    # Formatea la fecha para el frontend
    for a in asesorias:
        if a["fecha_asesoria"]:
            a["fecha_asesoria"] = a["fecha_asesoria"].strftime("%Y-%m-%dT%H:%M")
    return jsonify({"success": True, "asesorias": asesorias})

@asesorias_admin_bp.route('/admin/asesorias/<int:codigo>/ver')
@admin_required
def ver_asesoria(codigo):
    conn = create_connection()
    if not conn:
        return jsonify({'success': False, 'error': 'Error de conexión a la base de datos'}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute('''
        SELECT a.*, 
               CONCAT(u.nombres, ' ', u.apellidos) as cliente_nombre,
               u.correo as cliente_correo, u.celular as cliente_telefono,
               ase.nombre as asesor_nombre, ase.apellidos as asesor_apellidos, ase.correo as asesor_correo
        FROM tbl_asesoria a
        LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
        LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        LEFT JOIN tbl_asesor ase ON a.id_asesor = ase.id_asesor
        WHERE a.codigo_asesoria = %s
    ''', (codigo,))
    asesoria = cursor.fetchone()
    # Opcional: obtener historial de pagos
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
    # Formatea la fecha para el frontend
    if asesoria.get("fecha_asesoria"):
        asesoria["fecha_asesoria_formatted"] = asesoria["fecha_asesoria"].strftime("%d/%m/%Y %H:%M")
    return jsonify({'success': True, 'asesoria': asesoria, 'pagos': pagos})

@asesorias_admin_bp.route('/admin/asesorias/<int:codigo>/editar', methods=['POST'])
@admin_required
def editar_asesoria(codigo):
    """
    Actualiza los datos de una asesoría.
    """
    try:
        data = request.get_json()
        campos = [
            "tipo_asesoria", "lugar", "estado_proceso", "id_asesor",
            "especialidad", "tipo_documento", "numero_documento", "descripcion"
        ]
        valores = [data.get(c) for c in campos]
        fecha_asesoria = data.get("fecha_asesoria")
        
        # Si hay fecha, agrégala al update
        set_fields = ", ".join([f"{c}=%s" for c in campos])
        params = valores
        if fecha_asesoria:
            set_fields += ", fecha_asesoria=%s"
            params.append(fecha_asesoria.replace("T", " "))
        params.append(codigo)

        conn = create_connection()
        if not conn:
            return jsonify({"error": "Error de conexión a la base de datos"}), 500
        cursor = conn.cursor(dictionary=True)

        # Obtener la fecha/hora anterior, el id_asesor anterior y el id_usuario
        cursor.execute("""
            SELECT a.fecha_asesoria, a.id_asesor, s.id_usuario
            FROM tbl_asesoria a
            LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            WHERE a.codigo_asesoria=%s
        """, (codigo,))
        row = cursor.fetchone()
        fecha_anterior = row["fecha_asesoria"]
        id_asesor_anterior = row["id_asesor"]
        id_usuario = row["id_usuario"]

        # Validar que el nuevo horario esté disponible si se cambió
        if fecha_asesoria and data.get("id_asesor"):
            nueva_fecha_hora = fecha_asesoria.replace("T", " ")
            
            # Verificar si el horario está ocupado (excluyendo la asesoría actual)
            cursor.execute("""
                SELECT COUNT(*) as total
                FROM tbl_asesoria
                WHERE id_asesor = %s AND fecha_asesoria = %s AND estado != 'Cancelada' AND codigo_asesoria != %s
            """, (data.get("id_asesor"), nueva_fecha_hora, codigo))
            
            if cursor.fetchone()['total'] > 0:
                conn.close()
                return jsonify({"error": "El horario seleccionado ya está ocupado"}), 400

        # Actualizar la asesoría
        cursor = conn.cursor()
        cursor.execute(
            f"UPDATE tbl_asesoria SET {set_fields} WHERE codigo_asesoria=%s",
            params
        )
        conn.commit()

        # Liberar el horario anterior si cambió la fecha/hora o el asesor
        if fecha_asesoria:
            fecha_anterior_str = fecha_anterior.strftime("%Y-%m-%dT%H:%M") if fecha_anterior else None
            if (fecha_anterior_str and (fecha_anterior_str != fecha_asesoria or str(id_asesor_anterior) != str(data.get("id_asesor")))):
                # Liberar el horario anterior (eliminar reserva temporal si existe)
                cursor.execute("""
                    DELETE FROM tbl_reservas_temporales
                    WHERE id_asesor=%s AND fecha=%s AND id_usuario=%s
                """, (id_asesor_anterior, fecha_anterior, id_usuario))
                conn.commit()
            
            # Ocupar el nuevo horario (crear reserva temporal para el nuevo horario)
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
        return jsonify({"error": f"Error al actualizar la asesoría: {str(e)}"}), 500

@asesorias_admin_bp.route('/admin/asesorias/<int:codigo>/eliminar', methods=['POST'])
@admin_required
def eliminar_asesoria(codigo):
    """
    Cancela una asesoría y libera el horario.
    """
    try:
        data = request.get_json()
        motivo = data.get('motivo', 'Cancelada por administrador')

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

        # Liberar el horario (eliminar reserva temporal si existe)
        if asesoria['fecha_asesoria'] and asesoria['id_asesor'] and asesoria['id_usuario']:
            cursor.execute("""
                DELETE FROM tbl_reservas_temporales
                WHERE id_asesor = %s AND fecha = %s AND id_usuario = %s
            """, (asesoria['id_asesor'], asesoria['fecha_asesoria'], asesoria['id_usuario']))
            conn.commit()

        cursor.close()
        conn.close()
        return jsonify({"mensaje": "Asesoría cancelada exitosamente"})
    except Exception as e:
        return jsonify({"error": f"Error al cancelar la asesoría: {str(e)}"}), 500
