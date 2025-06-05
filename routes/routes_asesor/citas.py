from flask import Blueprint, render_template, redirect, url_for, session, flash, request, jsonify
import datetime
from config.database import create_connection

citas_asesor_bp = Blueprint('citas_asesor', __name__, url_prefix='/asesor')

@citas_asesor_bp.route('/asesorias')
def asesorias_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT a.codigo_asesoria, a.fecha_asesoria, a.tipo_asesoria,
                       CONCAT(u.nombres, ' ', u.apellidos) AS solicitante,
                       u.correo,
                       a.estado, a.descripcion
                FROM tbl_asesoria a
                JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                ORDER BY a.fecha_asesoria DESC
            """)
            asesorias = cursor.fetchall()
            
            cursor.execute("""
                SELECT s.id_solicitante, u.nombres, u.apellidos
                FROM tbl_solicitante s
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                ORDER BY u.nombres, u.apellidos
            """)
            clientes = cursor.fetchall()
            
        connection.close()
        return render_template('asesor/asesorias_asesor.html', asesorias=asesorias, clientes=clientes)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('panel_asesor.dashboard_asesor'))

@citas_asesor_bp.route('/crear_asesoria', methods=['POST'])
def crear_asesoria_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))
    
    try:
        client_id = request.form.get('client')
        asesoria_type = request.form.get('type')
        date = request.form.get('date')
        time = request.form.get('time')
        description = request.form.get('description')
        
        if not client_id or not asesoria_type or not date or not time:
            flash('Todos los campos son obligatorios', 'error')
            return redirect(url_for('citas_asesor.asesorias_asesor'))
        
        fecha_asesoria = f"{date} {time}"
        codigo_asesoria = f"ASE-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        connection = create_connection()
        if connection:
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO tbl_asesoria 
                    (codigo_asesoria, id_solicitante, fecha_asesoria, tipo_asesoria, estado, descripcion) 
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (codigo_asesoria, client_id, fecha_asesoria, asesoria_type, 'Pendiente', description))
                
            connection.commit()
            connection.close()
            
            flash('Asesoría creada exitosamente', 'success')
        else:
            flash('Error de conexión a la base de datos', 'error')
            
        return redirect(url_for('citas_asesor.asesorias_asesor'))
        
    except Exception as e:
        print(f"Error al crear asesoría: {str(e)}")
        flash(f'Error al crear asesoría: {str(e)}', 'error')
        return redirect(url_for('citas_asesor.asesorias_asesor'))

@citas_asesor_bp.route('/actualizar_estado_asesoria', methods=['POST'])
def actualizar_estado_asesoria_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))
    
    try:
        appointment_id = request.form.get('appointment-id')
        new_status = request.form.get('status')
        notes = request.form.get('status-notes')
        
        if not appointment_id or not new_status:
            flash('El ID de la asesoría y el estado son obligatorios', 'error')
            return redirect(url_for('citas_asesor.asesorias_asesor'))
        
        connection = create_connection()
        if connection:
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE tbl_asesoria 
                    SET estado = %s, 
                        descripcion = CONCAT(IFNULL(descripcion, ''), '\n\nNota: ', %s) 
                    WHERE codigo_asesoria = %s
                """, (new_status, notes, appointment_id))
                
            connection.commit()
            connection.close()
            
            flash('Estado de asesoría actualizado exitosamente', 'success')
        else:
            flash('Error de conexión a la base de datos', 'error')
            
        return redirect(url_for('citas_asesor.asesorias_asesor'))
        
    except Exception as e:
        print(f"Error al actualizar estado: {str(e)}")
        flash(f'Error al actualizar estado: {str(e)}', 'error')
        return redirect(url_for('citas_asesor.asesorias_asesor'))

@citas_asesor_bp.route('/obtener_asesoria/<string:codigo_asesoria>')
def obtener_asesoria_asesor(codigo_asesoria):
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return jsonify({'error': 'No autorizado'}), 401
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT a.codigo_asesoria, a.fecha_asesoria, a.tipo_asesoria,
                       CONCAT(u.nombres, ' ', u.apellidos) AS solicitante,
                       u.correo, a.estado, a.descripcion
                FROM tbl_asesoria a
                JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                WHERE a.codigo_asesoria = %s
            """, (codigo_asesoria,))
            asesoria = cursor.fetchone()
        connection.close()
        
        if asesoria:
            fecha = asesoria['fecha_asesoria']
            if isinstance(fecha, datetime.datetime):
                fecha_formateada = fecha.strftime('%d/%m/%Y %H:%M')
                asesoria['fecha_hora'] = fecha_formateada
            
            return jsonify(asesoria)
        
        return jsonify({'error': 'Asesoría no encontrada'}), 404
    
    return jsonify({'error': 'Error de conexión a la base de datos'}), 500

@citas_asesor_bp.route('/solicitudes')
def solicitudes_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT s.id_solicitud, s.fecha_solicitud, s.estado,
                       CONCAT(u.nombres, ' ', u.apellidos) AS solicitante,
                       s.tipo_solicitud, s.descripcion
                FROM tbl_solicitud s
                JOIN tbl_solicitante sol ON s.id_solicitante = sol.id_solicitante
                JOIN tbl_usuario u ON sol.id_usuario = u.id_usuario
                ORDER BY s.fecha_solicitud DESC
            """)
            solicitudes = cursor.fetchall()
        connection.close()
        return render_template('asesor/solicitudes_asesor.html', solicitudes=solicitudes)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('panel_asesor.dashboard_asesor'))