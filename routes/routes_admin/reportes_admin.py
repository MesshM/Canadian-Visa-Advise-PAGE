from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for, send_file
import sqlite3
from datetime import datetime, timedelta
import json
import io
import csv

# Crear el blueprint con el nombre correcto
reportes_admin_bp = Blueprint('reportes_admin', __name__, url_prefix='/admin/reportes')

# Verificar si reportlab está disponible (para PDFs)
REPORTLAB_DISPONIBLE = False
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import inch
    REPORTLAB_DISPONIBLE = True
except ImportError:
    print("AVISO: ReportLab no está instalado. La generación de PDFs no estará disponible.")
    print("Para habilitar PDFs, ejecute: pip install reportlab")

def verificar_admin():
    """Verificar si el usuario es administrador"""
    if 'user_id' not in session:
        return False
    if session.get('user_role') != 'Administrador':
        return False
    return True

@reportes_admin_bp.route('/')
def panel_reportes():
    """Panel principal de reportes"""
    if not verificar_admin():
        return redirect(url_for('auth.login'))
    
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        # Obtener estadísticas generales
        cursor.execute('SELECT COUNT(*) FROM usuarios WHERE eliminado = 0')
        total_usuarios = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM usuarios WHERE rol = "Asesor" AND eliminado = 0')
        total_asesores = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM asesorias')
        total_asesorias = cursor.fetchone()[0]
        
        cursor.execute('SELECT SUM(monto) FROM pagos WHERE estado = "Completado"')
        ingresos_totales = cursor.fetchone()[0] or 0
        
        conn.close()
        
        estadisticas = {
            'total_usuarios': total_usuarios,
            'total_asesores': total_asesores,
            'total_asesorias': total_asesorias,
            'ingresos_totales': ingresos_totales
        }
        
        return render_template('admin/reportes_admin.html', 
                              estadisticas=estadisticas, 
                              pdf_disponible=REPORTLAB_DISPONIBLE)
    
    except Exception as e:
        print(f"Error en panel_reportes: {e}")
        return render_template('admin/reportes_admin.html', 
                              estadisticas={}, 
                              pdf_disponible=REPORTLAB_DISPONIBLE)

@reportes_admin_bp.route('/generar')
def generar_reporte():
    """Generar reportes personalizados"""
    if not verificar_admin():
        return redirect(url_for('auth.login'))
    
    tipo_reporte = request.args.get('tipo', 'usuarios')
    formato = request.args.get('formato', 'html')
    fecha_inicio = request.args.get('fecha_inicio')
    fecha_fin = request.args.get('fecha_fin')
    
    # Verificar si se solicita PDF pero no está disponible
    if formato == 'pdf' and not REPORTLAB_DISPONIBLE:
        return jsonify({
            'success': False, 
            'error': 'La generación de PDFs no está disponible. Instale reportlab con: pip install reportlab'
        }), 400
    
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        if tipo_reporte == 'usuarios':
            query = '''
                SELECT id, nombre, email, telefono, rol, fecha_registro 
                FROM usuarios 
                WHERE eliminado = 0
            '''
            if fecha_inicio and fecha_fin:
                query += f" AND fecha_registro BETWEEN '{fecha_inicio}' AND '{fecha_fin}'"
            
            cursor.execute(query)
            datos = cursor.fetchall()
            columnas = ['ID', 'Nombre', 'Email', 'Teléfono', 'Rol', 'Fecha Registro']
            
        elif tipo_reporte == 'asesorias':
            query = '''
                SELECT a.id, u.nombre as cliente, as.nombre as asesor, 
                       a.fecha, a.hora, a.estado, a.tipo_asesoria
                FROM asesorias a
                LEFT JOIN usuarios u ON a.usuario_id = u.id
                LEFT JOIN usuarios as ON a.asesor_id = as.id
            '''
            if fecha_inicio and fecha_fin:
                query += f" WHERE a.fecha BETWEEN '{fecha_inicio}' AND '{fecha_fin}'"
            
            cursor.execute(query)
            datos = cursor.fetchall()
            columnas = ['ID', 'Cliente', 'Asesor', 'Fecha', 'Hora', 'Estado', 'Tipo']
            
        elif tipo_reporte == 'pagos':
            query = '''
                SELECT p.id, u.nombre as cliente, p.monto, p.estado, 
                       p.fecha_pago, p.metodo_pago
                FROM pagos p
                LEFT JOIN usuarios u ON p.usuario_id = u.id
            '''
            if fecha_inicio and fecha_fin:
                query += f" WHERE p.fecha_pago BETWEEN '{fecha_inicio}' AND '{fecha_fin}'"
            
            cursor.execute(query)
            datos = cursor.fetchall()
            columnas = ['ID', 'Cliente', 'Monto', 'Estado', 'Fecha Pago', 'Método']
        
        conn.close()
        
        if formato == 'csv':
            return generar_csv(datos, columnas, tipo_reporte)
        elif formato == 'pdf' and REPORTLAB_DISPONIBLE:
            return generar_pdf(datos, columnas, tipo_reporte)
        else:
            return jsonify({
                'success': True,
                'datos': datos,
                'columnas': columnas
            })
    
    except Exception as e:
        print(f"Error generando reporte: {e}")
        return jsonify({'success': False, 'error': str(e)})

def generar_csv(datos, columnas, tipo_reporte):
    """Generar reporte en formato CSV"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Escribir encabezados
    writer.writerow(columnas)
    
    # Escribir datos
    for fila in datos:
        writer.writerow(fila)
    
    # Crear respuesta
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'reporte_{tipo_reporte}_{datetime.now().strftime("%Y%m%d")}.csv'
    )

def generar_pdf(datos, columnas, tipo_reporte):
    """Generar reporte en formato PDF"""
    if not REPORTLAB_DISPONIBLE:
        return jsonify({
            'success': False, 
            'error': 'La generación de PDFs no está disponible'
        }), 400
        
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Título
    p.setFont("Helvetica-Bold", 16)
    p.drawString(50, height - 50, f"Reporte de {tipo_reporte.title()}")
    
    # Fecha
    p.setFont("Helvetica", 10)
    p.drawString(50, height - 70, f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    
    # Encabezados
    y_position = height - 100
    p.setFont("Helvetica-Bold", 10)
    x_positions = [50, 150, 250, 350, 450, 550]
    
    for i, columna in enumerate(columnas[:6]):  # Máximo 6 columnas
        if i < len(x_positions):
            p.drawString(x_positions[i], y_position, str(columna))
    
    # Datos
    p.setFont("Helvetica", 9)
    y_position -= 20
    
    for fila in datos:
        if y_position < 50:  # Nueva página si es necesario
            p.showPage()
            y_position = height - 50
        
        for i, valor in enumerate(fila[:6]):  # Máximo 6 columnas
            if i < len(x_positions):
                p.drawString(x_positions[i], y_position, str(valor)[:20])  # Truncar texto largo
        
        y_position -= 15
    
    p.save()
    buffer.seek(0)
    
    return send_file(
        buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'reporte_{tipo_reporte}_{datetime.now().strftime("%Y%m%d")}.pdf'
    )

@reportes_admin_bp.route('/estadisticas')
def estadisticas_api():
    """API para obtener estadísticas en tiempo real"""
    if not verificar_admin():
        return jsonify({'success': False, 'error': 'No autorizado'})
    
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        # Estadísticas por mes (últimos 12 meses)
        cursor.execute('''
            SELECT strftime('%Y-%m', fecha_registro) as mes, COUNT(*) as total
            FROM usuarios 
            WHERE eliminado = 0 AND fecha_registro >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', fecha_registro)
            ORDER BY mes
        ''')
        usuarios_por_mes = cursor.fetchall()
        
        # Asesorías por estado
        cursor.execute('''
            SELECT estado, COUNT(*) as total
            FROM asesorias
            GROUP BY estado
        ''')
        asesorias_por_estado = cursor.fetchall()
        
        # Ingresos por mes
        cursor.execute('''
            SELECT strftime('%Y-%m', fecha_pago) as mes, SUM(monto) as total
            FROM pagos 
            WHERE estado = 'Completado' AND fecha_pago >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', fecha_pago)
            ORDER BY mes
        ''')
        ingresos_por_mes = cursor.fetchall()
        
        conn.close()
        
        return jsonify({
            'success': True,
            'usuarios_por_mes': usuarios_por_mes,
            'asesorias_por_estado': asesorias_por_estado,
            'ingresos_por_mes': ingresos_por_mes
        })
    
    except Exception as e:
        print(f"Error en estadisticas_api: {e}")
        return jsonify({'success': False, 'error': str(e)})

@reportes_admin_bp.route('/exportar/<tipo>')
def exportar_reporte(tipo):
    """Exportar reportes específicos"""
    if not verificar_admin():
        return redirect(url_for('auth.login'))
    
    formato = request.args.get('formato', 'csv')
    
    # Verificar si se solicita PDF pero no está disponible
    if formato == 'pdf' and not REPORTLAB_DISPONIBLE:
        return jsonify({
            'success': False, 
            'error': 'La generación de PDFs no está disponible. Instale reportlab con: pip install reportlab'
        }), 400
    
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        if tipo == 'usuarios_activos':
            cursor.execute('''
                SELECT nombre, email, telefono, rol, fecha_registro
                FROM usuarios 
                WHERE eliminado = 0
                ORDER BY fecha_registro DESC
            ''')
            datos = cursor.fetchall()
            columnas = ['Nombre', 'Email', 'Teléfono', 'Rol', 'Fecha Registro']
            
        elif tipo == 'asesorias_pendientes':
            cursor.execute('''
                SELECT u.nombre as cliente, as.nombre as asesor, 
                       a.fecha, a.hora, a.tipo_asesoria
                FROM asesorias a
                LEFT JOIN usuarios u ON a.usuario_id = u.id
                LEFT JOIN usuarios as ON a.asesor_id = as.id
                WHERE a.estado = 'Programada'
                ORDER BY a.fecha, a.hora
            ''')
            datos = cursor.fetchall()
            columnas = ['Cliente', 'Asesor', 'Fecha', 'Hora', 'Tipo']
            
        elif tipo == 'pagos_completados':
            cursor.execute('''
                SELECT u.nombre as cliente, p.monto, p.fecha_pago, p.metodo_pago
                FROM pagos p
                LEFT JOIN usuarios u ON p.usuario_id = u.id
                WHERE p.estado = 'Completado'
                ORDER BY p.fecha_pago DESC
            ''')
            datos = cursor.fetchall()
            columnas = ['Cliente', 'Monto', 'Fecha Pago', 'Método']
        
        conn.close()
        
        if formato == 'pdf' and REPORTLAB_DISPONIBLE:
            return generar_pdf(datos, columnas, tipo)
        else:
            return generar_csv(datos, columnas, tipo)
    
    except Exception as e:
        print(f"Error exportando reporte: {e}")
        return jsonify({'success': False, 'error': str(e)})
