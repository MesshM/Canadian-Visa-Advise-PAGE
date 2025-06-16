from flask import Blueprint, render_template, redirect, url_for, session, flash
import datetime
from config.database import create_connection

panel_asesor_bp = Blueprint('panel_asesor', __name__, url_prefix='/asesor')

def get_dashboard_data(asesor_id=None):
    connection = create_connection()
    data = {
        'total_solicitudes': 0,
        'asesorias_pendientes': 0,
        'formularios_completados': 0,
        'formularios_pendientes': 0,
        'ingresos_totales': 0.0,
        'calificacion_promedio': 0.0,
        'visas_aprobadas': 0,
        'solicitudes_recientes': [],
        'tendencia_asesorias': [],
        'distribucion_tipos': [],
        'ingresos_mensuales': [],
    }
    if not connection:
        return data
    try:
        cursor = connection.cursor(dictionary=True)
        # Total asesorías
        cursor.execute("""
            SELECT COUNT(*) as total FROM tbl_asesoria
            {where}
        """.format(where=f"WHERE id_asesor = {asesor_id}" if asesor_id else ''))
        data['total_solicitudes'] = cursor.fetchone()['total']
        # Asesorías pendientes
        cursor.execute("""
            SELECT COUNT(*) as pendientes FROM tbl_asesoria
            WHERE estado = 'Pendiente' {and_asesor}
        """.format(and_asesor=f"AND id_asesor = {asesor_id}" if asesor_id else ''))
        data['asesorias_pendientes'] = cursor.fetchone()['pendientes']
        # Formularios completados y pendientes
        cursor.execute("""
            SELECT SUM(completado=1) as completados, SUM(completado=0) as pendientes FROM tbl_form_eligibilidadCVA
        """)
        row = cursor.fetchone()
        data['formularios_completados'] = row['completados'] or 0
        data['formularios_pendientes'] = row['pendientes'] or 0
        # Ingresos totales
        cursor.execute("""
            SELECT SUM(pa.monto) as total FROM tbl_pago_asesoria pa
            JOIN tbl_asesoria a ON pa.codigo_asesoria = a.codigo_asesoria
            {where}
        """.format(where=f"WHERE a.id_asesor = {asesor_id}" if asesor_id else ''))
        data['ingresos_totales'] = float(cursor.fetchone()['total'] or 0)
        # Calificación promedio
        cursor.execute("""
            SELECT AVG(ca.puntuacion) as promedio FROM tbl_calificacion_asesoria ca
            JOIN tbl_asesoria a ON ca.codigo_asesoria = a.codigo_asesoria
            {where}
        """.format(where=f"WHERE a.id_asesor = {asesor_id}" if asesor_id else ''))
        data['calificacion_promedio'] = round(float(cursor.fetchone()['promedio'] or 0), 2)
        # Visas aprobadas
        cursor.execute("""
            SELECT COUNT(*) as aprobadas FROM tbl_asesoria
            WHERE estado = 'Aprobada' {and_asesor}
        """.format(and_asesor=f"AND id_asesor = {asesor_id}" if asesor_id else ''))
        data['visas_aprobadas'] = cursor.fetchone()['aprobadas']
        # Solicitudes recientes (últimas 5)
        cursor.execute("""
            SELECT a.codigo_asesoria, a.fecha_asesoria as fecha_solicitud, a.tipo_asesoria as tipo_solicitud, a.estado,
                   u.nombres, u.apellidos, u.correo
            FROM tbl_asesoria a
            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            {where}
            ORDER BY a.fecha_asesoria DESC LIMIT 5
        """.format(where=f"WHERE a.id_asesor = {asesor_id}" if asesor_id else ''))
        data['solicitudes_recientes'] = cursor.fetchall()
        # Tendencia de asesorías por mes (últimos 6 meses)
        cursor.execute("""
            SELECT DATE_FORMAT(fecha_asesoria, '%Y-%m') as mes, COUNT(*) as total
            FROM tbl_asesoria
            {where}
            GROUP BY mes ORDER BY mes DESC LIMIT 6
        """.format(where=f"WHERE id_asesor = {asesor_id}" if asesor_id else ''))
        data['tendencia_asesorias'] = cursor.fetchall()[::-1]  # Orden ascendente
        # Distribución por tipo de visa
        cursor.execute("""
            SELECT tipo_asesoria, COUNT(*) as total
            FROM tbl_asesoria
            {where}
            GROUP BY tipo_asesoria
        """.format(where=f"WHERE id_asesor = {asesor_id}" if asesor_id else ''))
        data['distribucion_tipos'] = cursor.fetchall()
        # Ingresos mensuales (últimos 6 meses)
        cursor.execute("""
            SELECT DATE_FORMAT(a.fecha_asesoria, '%Y-%m') as mes, SUM(pa.monto) as total
            FROM tbl_pago_asesoria pa
            JOIN tbl_asesoria a ON pa.codigo_asesoria = a.codigo_asesoria
            {where}
            GROUP BY mes ORDER BY mes DESC LIMIT 6
        """.format(where=f"WHERE a.id_asesor = {asesor_id}" if asesor_id else ''))
        data['ingresos_mensuales'] = cursor.fetchall()[::-1]
        cursor.close()
        connection.close()
    except Exception as e:
        print(f"Error obteniendo datos dashboard: {e}")
    return data

@panel_asesor_bp.route('/dashboard')
def dashboard_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))
    try:
        asesor_id = session['user_id']
        dashboard_data = get_dashboard_data(asesor_id)
        return render_template('asesor/index_asesor.html', **dashboard_data)
    except Exception as e:
        print(f"Error al renderizar la plantilla: {str(e)}")
        return redirect(url_for('panel_asesor.asesorias_asesor'))

@panel_asesor_bp.route('/')
def index_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))
    asesor_id = session['user_id']
    dashboard_data = get_dashboard_data(asesor_id)
    return render_template('asesor/index_asesor.html', **dashboard_data)

@panel_asesor_bp.route('/reportes')
def reportes_asesor():
    # ...mueve aquí la función reportes_asesor completa...
    pass