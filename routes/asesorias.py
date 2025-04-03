from flask import Blueprint, request, redirect, url_for, flash, render_template, session, jsonify
from config.database import create_connection
from config.stripe_config import PRECIOS_VISA
from config.email import send_email_via_zoho
from datetime import datetime, timedelta
import json
import threading
import time
from mysql.connector import Error
import stripe
import os

# Configurar Stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

asesorias_bp = Blueprint('asesorias', __name__)

@asesorias_bp.route('/asesorias')
def asesorias():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Obtener el id_solicitante del usuario logueado
        cursor.execute("""
            SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s
        """, (session['user_id'],))
        solicitante_result = cursor.fetchone()
        
        if not solicitante_result:
            flash('No se encontró información de solicitante para este usuario', 'error')
            return redirect(url_for('index'))
        
        id_solicitante = solicitante_result['id_solicitante']
        
        # Obtener asesorías con información adicional solo del usuario logueado
        cursor.execute("""
            SELECT a.codigo_asesoria, a.fecha_asesoria, a.asesor_asignado,
                CONCAT(u.nombres, ' ', u.apellidos) as solicitante,
                a.id_solicitante, a.id_asesor, a.tipo_asesoria,
                a.especialidad, 
                p.metodo_pago, 
                COALESCE(pa.monto, CASE 
                    WHEN a.tipo_asesoria = 'Visa de Trabajo' THEN 150.00
                    WHEN a.tipo_asesoria = 'Visa de Estudio' THEN 100.00
                    WHEN a.tipo_asesoria = 'Residencia Permanente' THEN 200.00
                    WHEN a.tipo_asesoria = 'Ciudadanía' THEN 250.00
                    ELSE 150.00
                END) as precio,
                'Virtual (Zoom)' as lugar,
                a.descripcion, a.estado,
                pa.metodo_pago as metodo_pago_stripe
            FROM tbl_asesoria a
            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            LEFT JOIN tbl_pago p ON s.id_solicitante = p.id_solicitante
            LEFT JOIN tbl_pago_asesoria pa ON a.codigo_asesoria = pa.codigo_asesoria
            WHERE a.id_solicitante = %s
            ORDER BY a.fecha_asesoria DESC
        """, (id_solicitante,))
        asesorias = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        # Pasar los precios de visa al template
        return render_template('asesorias.html', asesorias=asesorias, precios_visa=PRECIOS_VISA)
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('index'))

@asesorias_bp.route('/obtener_asesores', methods=['GET'])
def obtener_asesores():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Obtener todos los asesores con su especialidad
            cursor.execute("""
                SELECT id_asesor, nombre, apellidos, correo, 
                       CASE 
                           WHEN id_asesor = 8 THEN 'Especialista en Visas de Trabajo'
                           WHEN id_asesor = 9 THEN 'Especialista en Visas de Estudio'
                           WHEN id_asesor = 10 THEN 'Especialista en Residencia Permanente'
                           ELSE 'Asesor de Inmigración'
                       END as especialidad
                FROM tbl_asesor
                WHERE id_asesor > 7  -- Filtrar solo asesores reales (no administradores)
                ORDER BY nombre, apellidos
            """)
            
            asesores = cursor.fetchall()
            cursor.close()
            connection.close()
            
            return jsonify({'asesores': asesores})
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        print(f"Error al obtener asesores: {str(e)}")
        return jsonify({'error': str(e)}), 500

@asesorias_bp.route('/reservar_horario_temporal', methods=['POST'])
def reservar_horario_temporal():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        id_asesor = data.get('id_asesor')
        fecha = data.get('fecha')
        hora = data.get('hora')
        
        if not id_asesor or not fecha or not hora:
            return jsonify({'error': 'Faltan parámetros requeridos'}), 400
        
        # Convertir la fecha y hora a un objeto datetime
        fecha_hora = datetime.strptime(f"{fecha} {hora}", '%Y-%m-%d %H:%M')
        
        # Verificar si el horario ya está reservado
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Verificar si ya existe una reserva para este horario
            cursor.execute("""
                SELECT id_calendario FROM tbl_calendario_asesorias
                WHERE id_asesor = %s AND DATE(fecha) = %s AND TIME(fecha) = %s
            """, (id_asesor, fecha, hora))
            
            if cursor.fetchone():
                cursor.close()
                connection.close()
                return jsonify({'error': 'Este horario ya está reservado'}), 400
            
            # Verificar si ya existe una reserva temporal para este horario
            cursor.execute("""
                SELECT id_reserva FROM tbl_reservas_temporales
                WHERE id_asesor = %s AND DATE(fecha) = %s AND TIME(fecha) = %s
                AND expiracion > NOW()
            """, (id_asesor, fecha, hora))
            
            if cursor.fetchone():
                cursor.close()
                connection.close()
                return jsonify({'error': 'Este horario está temporalmente reservado'}), 400
            
            # Crear una reserva temporal que expira en 10 minutos
            expiracion = datetime.now() + timedelta(minutes=10)
            
            cursor.execute("""
                INSERT INTO tbl_reservas_temporales (id_asesor, fecha, expiracion, id_usuario)
                VALUES (%s, %s, %s, %s)
            """, (id_asesor, fecha_hora, expiracion, session['user_id']))
            
            reserva_id = cursor.lastrowid
            connection.commit()
            
            # Actualizar el estado del horario en tbl_horarios_asesores
            dia_semana = fecha_hora.weekday() + 1  # +1 porque en la BD 1 es lunes
            hora_inicio = datetime.strptime(hora, '%H:%M').time()
            
            cursor.execute("""
                UPDATE tbl_horarios_asesores
                SET disponible = 0, reserva_temporal = %s
                WHERE id_asesor = %s AND dia_semana = %s AND hora_inicio = %s
            """, (reserva_id, id_asesor, dia_semana, hora_inicio))
            
            connection.commit()
            cursor.close()
            connection.close()
            
            # Programar la eliminación de la reserva temporal después de 10 minutos
            # En un entorno de producción, esto se haría con un job scheduler como Celery
            # Aquí usamos un hilo simple para la demostración
            def eliminar_reserva_temporal():
                time.sleep(10 * 60)  # Esperar 10 minutos
                try:
                    conn = create_connection()
                    if conn:
                        cur = conn.cursor()
                        
                        # Verificar si la reserva aún existe y no ha sido confirmada
                        cur.execute("""
                            SELECT id_reserva FROM tbl_reservas_temporales
                            WHERE id_reserva = %s AND confirmada = 0
                        """, (reserva_id,))
                        
                        if cur.fetchone():
                            # Eliminar la reserva temporal
                            cur.execute("DELETE FROM tbl_reservas_temporales WHERE id_reserva = %s", (reserva_id,))
                            
                            # Restaurar la disponibilidad del horario
                            cur.execute("""
                                UPDATE tbl_horarios_asesores
                                SET disponible = 1, reserva_temporal = NULL
                                WHERE id_asesor = %s AND dia_semana = %s AND hora_inicio = %s
                            """, (id_asesor, dia_semana, hora_inicio))
                            
                            conn.commit()
                        
                        cur.close()
                        conn.close()
                except Exception as e:
                    print(f"Error al eliminar reserva temporal: {e}")
            
            # Iniciar el hilo para eliminar la reserva temporal
            threading.Thread(target=eliminar_reserva_temporal, daemon=True).start()
            
            return jsonify({'success': True, 'reserva_id': reserva_id})
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        print(f"Error al reservar horario temporal: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
def limpiar_asesorias_vencidas():
    while True:
        try:
            print("Ejecutando limpieza de asesorías vencidas...")
            
            connection = create_connection()
            if connection:
                cursor = connection.cursor()
                # Obtener asesorías pendientes con más de 5 minutos de antigüedad
                cinco_minutos_atras = datetime.now() - timedelta(minutes=5)
                cursor.execute("""
                    DELETE FROM tbl_asesoria 
                    WHERE estado = 'Pendiente'
                    AND fecha_creacion < %s
                """, (cinco_minutos_atras,))
                
                eliminadas = cursor.rowcount
                connection.commit()
                cursor.close()
                connection.close()
                print(f"Se eliminaron {eliminadas} asesorías vencidas por tiempo de pago")
        except Exception as e:
            print(f"Error al limpiar asesorías vencidas: {e}")
        
        # Esperar 1 minuto antes de la próxima verificación
        time.sleep(60)
        
limpieza_thread =threading.Thread(target=limpiar_asesorias_vencidas, daemon=True)
limpieza_thread.start()

@asesorias_bp.route('/cancelar_reserva_temporal', methods=['POST'])
def cancelar_reserva_temporal():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        reserva_id = data.get('reserva_id')
        
        if not reserva_id:
            return jsonify({'error': 'Falta el ID de reserva'}), 400
        
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Obtener información de la reserva
            cursor.execute("""
                SELECT id_asesor, fecha FROM tbl_reservas_temporales
                WHERE id_reserva = %s AND id_usuario = %s
            """, (reserva_id, session['user_id']))
            
            reserva = cursor.fetchone()
            
            if not reserva:
                cursor.close()
                connection.close()
                return jsonify({'error': 'Reserva no encontrada o no autorizada'}), 404
            
            # Eliminar la reserva temporal
            cursor.execute("DELETE FROM tbl_reservas_temporales WHERE id_reserva = %s", (reserva_id,))
            
            # Restaurar la disponibilidad del horario
            fecha_hora = reserva['fecha']
            dia_semana = fecha_hora.weekday() + 1
            hora_inicio = fecha_hora.time()
            
            cursor.execute("""
                UPDATE tbl_horarios_asesores
                SET disponible = 1, reserva_temporal = NULL
                WHERE id_asesor = %s AND dia_semana = %s AND hora_inicio = %s
            """, (reserva['id_asesor'], dia_semana, hora_inicio))
            
            connection.commit()
            cursor.close()
            connection.close()
            
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        print(f"Error al cancelar reserva temporal: {str(e)}")
        return jsonify({'error': str(e)}), 500

@asesorias_bp.route('/nueva_asesoria', methods=['POST'])
def nueva_asesoria():
    if 'user_id' not in session:
        if request.is_json:
            return jsonify({'error': 'No autorizado'}), 401
        return redirect(url_for('auth.login'))

    try:
        # Determinar si la solicitud es AJAX o un envío de formulario tradicional
        if request.is_json:
            data = request.get_json()
            id_solicitante = data.get('id_solicitante')
            tipo_asesoria = data.get('tipo_asesoria', 'Visa de Trabajo')
            descripcion = data.get('descripcion', '')
            lugar = data.get('lugar', 'Virtual (Zoom)')
            metodo_pago = data.get('metodo_pago', 'Tarjeta de Crédito')
            tipo_documento = data.get('tipo_documento', 'C.C')
            numero_documento = data.get('numero_documento', '')
            id_asesor = data.get('id_asesor', '')
            asesor_asignado = data.get('asesor_asignado', 'Por asignar')
            asesor_especialidad = data.get('asesor_especialidad', 'Inmigración Canadiense')
            fecha_asesoria = data.get('fecha_asesoria')
        else:
            # Obtener datos del formulario tradicional
            id_solicitante = request.form['id_solicitante']
            tipo_asesoria = request.form.get('tipo_asesoria', 'Visa de Trabajo')
            descripcion = request.form.get('descripcion', '')
            lugar = request.form.get('lugar', 'Virtual (Zoom)')
            metodo_pago = request.form.get('metodo_pago', 'Tarjeta de Crédito')
            tipo_documento = request.form.get('tipo_documento', 'C.C')
            numero_documento = request.form.get('numero_documento', '')
            id_asesor = request.form.get('id_asesor', '')
            asesor_asignado = request.form.get('asesor_asignado', 'Por asignar')
            asesor_especialidad = request.form.get('asesor_especialidad', 'Inmigración Canadiense')
            fecha_asesoria = request.form.get('fecha_asesoria')
        
        # Obtener el precio según el tipo de visa
        precio = PRECIOS_VISA.get(tipo_asesoria, 150.00)
        
        connection = create_connection()
        if connection:
            cursor = connection.cursor()
            try:
                # Verificar si la fecha y hora ya están reservadas
                if fecha_asesoria and id_asesor:
                    fecha_obj = datetime.strptime(fecha_asesoria, '%Y-%m-%dT%H:%M') if isinstance(fecha_asesoria, str) else fecha_asesoria
                    
                    cursor.execute("""
                        SELECT codigo_asesoria FROM tbl_asesoria 
                        WHERE id_asesor = %s AND DATE(fecha_asesoria) = %s AND TIME(fecha_asesoria) = %s 
                        AND estado IN ('Pendiente', 'Pagada')
                    """, (id_asesor, fecha_obj.date(), fecha_obj.time()))
                    
                    existing_asesoria = cursor.fetchone()
                    if existing_asesoria:
                        if request.is_json:
                            return jsonify({'error': 'Esta fecha y hora ya están reservadas'}), 400
                        else:
                            flash('Esta fecha y hora ya están reservadas', 'error')
                            return redirect(url_for('asesorias.asesorias'))
                
                # Obtener el último número de asesoría para este solicitante
                cursor.execute("""
                    SELECT COALESCE(MAX(numero_asesoria), 0) + 1 as next_num
                    FROM tbl_asesoria
                    WHERE id_solicitante = %s
                """, (id_solicitante,))
                
                result = cursor.fetchone()
                numero_asesoria = result[0] if result else 1
                
                # Verificar si la columna 'especialidad' existe en la tabla
                cursor.execute("""
                    SHOW COLUMNS FROM tbl_asesoria LIKE 'especialidad'
                """)
                
                especialidad_column_exists = cursor.fetchone() is not None
                
                # Establecer la fecha de creación con la hora actual para el control de tiempo de pago
                fecha_creacion = datetime.now()

                if especialidad_column_exists:
                    # Insertar nueva asesoría con la fecha seleccionada y la especialidad
                    cursor.execute("""
                        INSERT INTO tbl_asesoria (fecha_asesoria, asesor_asignado, id_solicitante, tipo_asesoria, 
                        descripcion, lugar, estado, tipo_documento, numero_documento, numero_asesoria, id_asesor, 
                        nombre_asesor, especialidad, fecha_creacion)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (fecha_asesoria, asesor_asignado, id_solicitante, tipo_asesoria, descripcion, lugar, 
                         "Pendiente", tipo_documento, numero_documento, numero_asesoria, id_asesor, 
                         asesor_asignado, asesor_especialidad, fecha_creacion))
                else:
                    # Insertar nueva asesoría sin la columna especialidad
                    cursor.execute("""
                        INSERT INTO tbl_asesoria (fecha_asesoria, asesor_asignado, id_solicitante, tipo_asesoria, 
                        descripcion, lugar, estado, tipo_documento, numero_documento, numero_asesoria, id_asesor, 
                        nombre_asesor, fecha_creacion)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (fecha_asesoria, asesor_asignado, id_solicitante, tipo_asesoria, descripcion, lugar, 
                         "Pendiente", tipo_documento, numero_documento, numero_asesoria, id_asesor, 
                         asesor_asignado, fecha_creacion))
                
                # Obtener el ID de la asesoría recién creada
                codigo_asesoria = cursor.lastrowid
                
                # Si hay una reserva temporal, confirmarla
                if fecha_asesoria and id_asesor:
                    fecha_obj = datetime.strptime(fecha_asesoria, '%Y-%m-%dT%H:%M') if isinstance(fecha_asesoria, str) else fecha_asesoria
                    fecha = fecha_obj.date()
                    hora = fecha_obj.time()
                    
                    # Buscar si existe una reserva temporal para este horario
                    cursor.execute("""
                        SELECT id_reserva FROM tbl_reservas_temporales
                        WHERE id_asesor = %s AND DATE(fecha) = %s AND TIME(fecha) = %s
                        AND id_usuario = %s AND expiracion > NOW()
                    """, (id_asesor, fecha, hora, session['user_id']))
                    
                    reserva = cursor.fetchone()
                    if reserva:
                        reserva_id = reserva[0]
                        
                        # Marcar la reserva como confirmada
                        cursor.execute("""
                            UPDATE tbl_reservas_temporales
                            SET confirmada = 1
                            WHERE id_reserva = %s
                        """, (reserva_id,))
                
                # Verificar si ya existe un pago para este solicitante
                cursor.execute("""
                    SELECT num_factura FROM tbl_pago WHERE id_solicitante = %s
                """, (id_solicitante,))
                
                pago_existente = cursor.fetchone()
                
                # Si no existe un pago, crear uno nuevo con el precio según el tipo de visa
                if not pago_existente:
                    cursor.execute("""
                        INSERT INTO tbl_pago (metodo_pago, total_pago, id_solicitante)
                        VALUES (%s, %s, %s)
                    """, (metodo_pago, precio, id_solicitante))
                
                connection.commit()
                
                # Replace with updated response with timer reference:
                if request.is_json:
                    return jsonify({
                        'success': True, 
                        'codigo_asesoria': codigo_asesoria,
                        'message': 'Asesoría solicitada con éxito. Tienes 5 minutos para realizar el pago.',
                        'tiempo_limite': 5 * 60  # 5 minutos en segundos
                    })
                else:
                    flash('Asesoría solicitada con éxito. Tienes 5 minutos para realizar el pago.', 'success')
            except Error as e:
                connection.rollback()
                if request.is_json:
                    return jsonify({'error': f'Error al solicitar la asesoría: {e}'}), 500
                else:
                    flash(f'Error al solicitar la asesoría: {e}', 'error')
            finally:
                cursor.close()
                connection.close()
        else:
            if request.is_json:
                return jsonify({'error': 'Error de conexión a la base de datos'}), 500
            else:
                flash('Error de conexión a la base de datos', 'error')
        
        if request.is_json:
            return jsonify({'error': 'Error desconocido'}), 500
        return redirect(url_for('asesorias.asesorias'))
    except Exception as e:
        if request.is_json:
            return jsonify({'error': f'Error: {str(e)}'}), 500
        flash(f'Error: {str(e)}', 'error')
        return redirect(url_for('asesorias.asesorias'))

@asesorias_bp.route('/obtener_horarios_disponibles', methods=['GET'])
def obtener_horarios_disponibles():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        id_asesor = request.args.get('id_asesor')
        fecha = request.args.get('fecha')
        
        if not id_asesor or not fecha:
            return jsonify({'error': 'Faltan parámetros requeridos'}), 400
        
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Convertir la fecha a día de la semana (0-6, donde 0 es domingo)
            fecha_obj = datetime.strptime(fecha, '%Y-%m-%d')
            dia_semana = fecha_obj.weekday() + 1  # +1 porque en la BD 1 es lunes
            
            # Obtener los horarios disponibles del asesor para ese día de la semana
            cursor.execute("""
                SELECT TIME_FORMAT(hora_inicio, '%H:%i') as hora
                FROM tbl_horarios_asesores
                WHERE id_asesor = %s AND dia_semana = %s AND disponible = 1
                ORDER BY hora_inicio
            """, (id_asesor, dia_semana))
            
            horarios_disponibles = cursor.fetchall()
            
            # Obtener las citas ya programadas para ese asesor en esa fecha (tanto pagadas como pendientes)
            cursor.execute("""
                SELECT TIME_FORMAT(TIME(fecha_asesoria), '%H:%i') as hora
                FROM tbl_asesoria
                WHERE id_asesor = %s AND DATE(fecha_asesoria) = %s AND estado IN ('Pendiente', 'Pagada')
            """, (id_asesor, fecha))
            
            citas_programadas = cursor.fetchall()
            citas_horas = [cita['hora'] for cita in citas_programadas]
            
            # Obtener las reservas temporales activas
            cursor.execute("""
                SELECT TIME_FORMAT(TIME(fecha), '%H:%i') as hora
                FROM tbl_reservas_temporales
                WHERE id_asesor = %s AND DATE(fecha) = %s AND expiracion > NOW()
            """, (id_asesor, fecha))
            
            reservas_temporales = cursor.fetchall()
            reservas_horas = [reserva['hora'] for reserva in reservas_temporales]
            
            # Filtrar los horarios disponibles
            horarios = [h['hora'] for h in horarios_disponibles if h['hora'] not in citas_horas and h['hora'] not in reservas_horas]
            
            cursor.close()
            connection.close()
            
            return jsonify({'horarios': horarios})
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        print(f"Error al obtener horarios disponibles: {str(e)}")
        return jsonify({'error': str(e)}), 500

@asesorias_bp.route('/cancelar_asesoria', methods=['POST'])
def cancelar_asesoria_route():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        codigo_asesoria = data.get('codigo_asesoria')
        
        if not codigo_asesoria:
            return jsonify({'error': 'Falta el código de asesoría'}), 400
        
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Verify that the appointment belongs to the current user
            cursor.execute("""
                SELECT a.codigo_asesoria, a.id_solicitante, s.id_usuario 
                FROM tbl_asesoria a
                JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
                WHERE a.codigo_asesoria = %s AND s.id_usuario = %s
            """, (codigo_asesoria, session['user_id']))
            
            asesoria = cursor.fetchone()
            
            if not asesoria:
                cursor.close()
                connection.close()
                return jsonify({'error': 'Asesoría no encontrada o no autorizada'}), 404
            
            # Get appointment details before deleting (for freeing up the calendar slot)
            cursor.execute("""
                SELECT fecha_asesoria, id_asesor FROM tbl_asesoria 
                WHERE codigo_asesoria = %s
            """, (codigo_asesoria,))
            
            asesoria_details = cursor.fetchone()
            
            # Delete the appointment
            cursor.execute("DELETE FROM tbl_asesoria WHERE codigo_asesoria = %s", (codigo_asesoria,))
            
            # If there was a payment, delete it too
            cursor.execute("DELETE FROM tbl_pago_asesoria WHERE codigo_asesoria = %s", (codigo_asesoria,))
            
            # If the appointment was in the calendar, free up the slot
            if asesoria_details and asesoria_details['id_asesor']:
                fecha_obj = asesoria_details['fecha_asesoria']
                id_asesor = asesoria_details['id_asesor']
                
                # Delete from calendar if it exists
                cursor.execute("""
                    DELETE FROM tbl_calendario_asesorias 
                    WHERE codigo_asesoria = %s
                """, (codigo_asesoria,))
                
                # Update the availability in the schedule
                dia_semana = fecha_obj.weekday() + 1  # +1 porque en la BD 1 es lunes
                hora = fecha_obj.time()
                
                cursor.execute("""
                    UPDATE tbl_horarios_asesores
                    SET disponible = 1, reserva_temporal = NULL
                    WHERE id_asesor = %s AND dia_semana = %s AND hora_inicio = %s
                """, (id_asesor, dia_semana, hora))
            
            connection.commit()
            cursor.close()
            connection.close()
            
            return jsonify({'success': True, 'message': 'Asesoría cancelada exitosamente'})
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        print(f"Error al cancelar asesoría: {str(e)}")
        return jsonify({'error': str(e)}), 500

@asesorias_bp.route('/obtener_detalles_asesoria/<int:codigo_asesoria>')
def obtener_detalles_asesoria(codigo_asesoria):
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Verificar que la asesoría pertenece al usuario actual
            cursor.execute("""
                SELECT a.*, pa.monto, pa.metodo_pago as metodo_pago_stripe
                FROM tbl_asesoria a
                LEFT JOIN tbl_pago_asesoria pa ON a.codigo_asesoria = pa.codigo_asesoria
                JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
                WHERE a.codigo_asesoria = %s AND s.id_usuario = %s
            """, (codigo_asesoria, session['user_id']))
            
            asesoria = cursor.fetchone()
            
            cursor.close()
            connection.close()
            
            if not asesoria:
                return jsonify({'error': 'Asesoría no encontrada o no autorizada'}), 404
            
            # Convertir objetos datetime a string para que sean serializables
            if asesoria and 'fecha_asesoria' in asesoria and asesoria['fecha_asesoria']:
                asesoria['fecha_asesoria'] = asesoria['fecha_asesoria'].strftime('%Y-%m-%d %H:%M:%S')
            
            if asesoria and 'fecha_creacion' in asesoria and asesoria['fecha_creacion']:
                asesoria['fecha_creacion'] = asesoria['fecha_creacion'].strftime('%Y-%m-%d %H:%M:%S')
            
            return jsonify({'success': True, 'asesoria': asesoria})
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        print(f"Error al obtener detalles de asesoría: {str(e)}")
        return jsonify({'error': str(e)}), 500

