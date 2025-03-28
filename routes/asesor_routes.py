# routes/asesor_routes.py

from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from database import create_connection
from utils.email_utils import send_email_via_zoho

# Registrar el Blueprint
asesor_bp = Blueprint('asesor', __name__, url_prefix='/asesor')

@asesor_bp.route('/dashboard')
def dashboard():
    """Muestra el panel principal del asesor."""
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('login'))
    connection = create_connection()
    if connection:
        try:
            with connection.cursor(dictionary=True) as cursor:
                # Obtener estadísticas relevantes para el dashboard
                cursor.execute("""
                    SELECT COUNT(*) as total_solicitantes 
                    FROM tbl_solicitante
                """)
                total_solicitantes = cursor.fetchone()['total_solicitantes']

                cursor.execute("""
                    SELECT COUNT(*) as total_asesorias 
                    FROM tbl_asesoria
                """)
                total_asesorias = cursor.fetchone()['total_asesorias']

                cursor.execute("""
                    SELECT COUNT(*) as total_pagos_completados 
                    FROM tbl_pago_asesoria 
                    WHERE estado_pago = 'Completado'
                """)
                total_pagos_completados = cursor.fetchone()['total_pagos_completados']
        except Exception as e:
            flash(f'Error al cargar el dashboard: {str(e)}', 'error')
        finally:
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('index'))

    return render_template('Administrador/dashboard.html', 
                           total_solicitantes=total_solicitantes,
                           total_asesorias=total_asesorias,
                           total_pagos_completados=total_pagos_completados)

@asesor_bp.route('/asesoria')
def asesoria():
    """Muestra la página de gestión de asesorías."""
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('login'))
    return render_template('Administrador/asesoria.html')

@asesor_bp.route('/index_asesor')
def index_asesor_route():
    """Muestra la página principal del asesor."""
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('login'))
    return render_template('Administrador/index_asesor.html')

@asesor_bp.route('/asesorias_admin')
def asesorias_admin():
    """Muestra la página de administración de asesorías."""
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('login'))
    return render_template('Administrador/asesorias_admin.html')

@asesor_bp.route('/enviar_recordatorio', methods=['POST'])
def enviar_recordatorio():
    """Envía un recordatorio por correo electrónico."""
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401


    data = request.get_json()
    email = data.get('email')
    mensaje = data.get('mensaje')

    if not all([email, mensaje]):
        return jsonify({'error': 'Faltan datos obligatorios (email o mensaje)'}), 400

    subject = "Recordatorio - Canadian Visa Advise"
    body = f"""
    Hola,
    Este es un recordatorio importante:
    {mensaje}
    Atentamente,
    Equipo CVA
    """

    if send_email_via_zoho(email, subject, body):
        return jsonify({'success': True, 'message': 'Recordatorio enviado correctamente'})
    else:
        return jsonify({'error': 'Error al enviar el correo'}), 500