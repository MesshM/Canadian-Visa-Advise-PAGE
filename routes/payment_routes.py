from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from database import create_connection
from config import PRECIOS_VISA
from mysql.connector import Error
import stripe
import json
from datetime import datetime
import os
from utils.email_utils import send_email_via_zoho

payment_bp = Blueprint('payment', __name__)

# Configure Stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

@payment_bp.route('/pagos')
def pagos():
    return render_template('pagos.html')

@payment_bp.route('/procesar_pago', methods=['POST'])
def procesar_pago():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()  # Cambiado de request.json a request.get_json()
        if not data:
            data = request.form  # Intentar obtener datos del formulario si no hay JSON
            
        codigo_asesoria = data.get('codigo_asesoria')
        monto = data.get('monto')
        metodo_pago = data.get('metodo_pago')
        datos_adicionales = data.get('datos_adicionales', {})
        fecha_asesoria = data.get('fecha_asesoria')
        id_asesor = data.get('id_asesor')
        
        if isinstance(datos_adicionales, str):
            try:
                datos_adicionales = json.loads(datos_adicionales)
            except:
                datos_adicionales = {}
        
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            try:
                # Registrar el pago
                cursor.execute("""
                    INSERT INTO tbl_pago_asesoria (codigo_asesoria, monto, metodo_pago, estado_pago, datos_adicionales)
                    VALUES (%s, %s, %s, 'Completado', %s)
                """, (codigo_asesoria, monto, metodo_pago, json.dumps(datos_adicionales)))
                
                # Actualizar el estado de la asesoría a "Pagada"
                cursor.execute("""
                    UPDATE tbl_asesoria SET estado = 'Pagada' WHERE codigo_asesoria = %s
                """, (codigo_asesoria,))
                
                # Obtener información de la asesoría
                cursor.execute("""
                    SELECT fecha_asesoria, id_asesor FROM tbl_asesoria WHERE codigo_asesoria = %s
                """, (codigo_asesoria,))
                
                asesoria = cursor.fetchone()
                
                if asesoria:
                    fecha_obj = asesoria['fecha_asesoria']
                    id_asesor_db = asesoria['id_asesor']
                    
                    # Si no se proporcionó fecha o id_asesor, usar los de la base de datos
                    if not fecha_asesoria:
                        fecha_asesoria = fecha_obj
                    if not id_asesor:
                        id_asesor = id_asesor_db
                    
                    # Registrar en tbl_calendario_asesorias
                    cursor.execute("""
                        INSERT INTO tbl_calendario_asesorias (id_asesor, fecha, codigo_asesoria)
                        VALUES (%s, %s, %s)
                        ON DUPLICATE KEY UPDATE codigo_asesoria = VALUES(codigo_asesoria)
                    """, (id_asesor, fecha_obj, codigo_asesoria))
                    
                    # Actualizar tbl_horarios_asesores para marcar el horario como no disponible
                    dia_semana = fecha_obj.weekday() + 1  # +1 porque en la BD 1 es lunes
                    hora = fecha_obj.time()
                    
                    cursor.execute("""
                        UPDATE tbl_horarios_asesores
                        SET disponible = 0, reserva_temporal = NULL
                        WHERE id_asesor = %s AND dia_semana = %s AND hora_inicio = %s
                    """, (id_asesor, dia_semana, hora))
                    
                    # Si había una reserva temporal, eliminarla
                    cursor.execute("""
                        DELETE FROM tbl_reservas_temporales
                        WHERE id_asesor = %s AND DATE(fecha) = %s AND TIME(fecha) = %s
                    """, (id_asesor, fecha_obj.date(), hora))
                
                connection.commit()
                
                if request.is_json:
                    return jsonify({'success': True, 'message': 'Pago procesado exitosamente'})
                else:
                    flash('Pago procesado exitosamente', 'success')
                    return redirect(url_for('user.asesorias'))
                    
            except Error as e:
                connection.rollback()
                if request.is_json:
                    return jsonify({'error': f'Error al procesar el pago: {e}'}), 500
                else:
                    flash(f'Error al procesar el pago: {e}', 'error')
                    return redirect(url_for('user.asesorias'))
            finally:
                cursor.close()
                connection.close()
        else:
            if request.is_json:
                return jsonify({'error': 'Error de conexión a la base de datos'}), 500
            else:
                flash('Error de conexión a la base de datos', 'error')
                return redirect(url_for('user.asesorias'))
    except Exception as e:
        print(f"Error en procesar_pago: {str(e)}")  # Log para depuración
        if request.is_json:
            return jsonify({'error': str(e)}), 500
        else:
            flash(f'Error al procesar el pago: {e}', 'error')
            return redirect(url_for('user.asesorias'))

@payment_bp.route('/crear_payment_intent', methods=['POST'])
def crear_payment_intent():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        monto = data.get('monto')  # Monto en centavos
        codigo_asesoria = data.get('codigo_asesoria')
        
        if not monto or not codigo_asesoria:
            return jsonify({'error': 'Faltan parámetros requeridos'}), 400
        
        # Verificar que la asesoría existe y está pendiente de pago
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT a.codigo_asesoria, a.tipo_asesoria, a.id_solicitante, 
                       CONCAT(u.nombres, ' ', u.apellidos) as nombre_solicitante,
                       u.correo as email_solicitante
                FROM tbl_asesoria a
                JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                WHERE a.codigo_asesoria = %s AND a.estado = 'Pendiente'
            """, (codigo_asesoria,))
            
            asesoria = cursor.fetchone()
            cursor.close()
            connection.close()
            
            if not asesoria:
                return jsonify({'error': 'Asesoría no encontrada o ya pagada'}), 404
            
            # Crear un PaymentIntent con Stripe
            try:
                # Convertir el monto a float primero y luego a centavos para Stripe
                monto_float = float(monto)
                monto_centavos = int(monto_float * 100)
                
                intent = stripe.PaymentIntent.create(
                    amount=monto_centavos,
                    currency='usd',
                    metadata={
                        'codigo_asesoria': codigo_asesoria,
                        'tipo_asesoria': asesoria['tipo_asesoria'],
                        'id_solicitante': asesoria['id_solicitante']
                    },
                    receipt_email=asesoria['email_solicitante'],
                    description=f"Pago de asesoría {asesoria['tipo_asesoria']} - {asesoria['nombre_solicitante']}",
                    payment_method_types=['card']
                )
                
                return jsonify({
                    'clientSecret': intent.client_secret,
                    'id': intent.id
                })
            except stripe.error.StripeError as e:
                return jsonify({'error': str(e)}), 500
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        print(f"Error al crear PaymentIntent: {str(e)}")
        return jsonify({'error': str(e)}), 500


@payment_bp.route('/confirmar_pago', methods=['GET'])
def confirmar_pago():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    payment_intent_id = request.args.get('payment_intent')
    payment_intent_client_secret = request.args.get('payment_intent_client_secret')
    redirect_status = request.args.get('redirect_status')
    
    if not payment_intent_id:
        flash('No se proporcionó información de pago', 'error')
        return redirect(url_for('user.asesorias'))
    
    try:
        # Verificar el estado del PaymentIntent
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if payment_intent.status == 'succeeded' or (redirect_status == 'succeeded'):
            # Obtener el código de asesoría desde los metadatos
            codigo_asesoria = payment_intent.metadata.get('codigo_asesoria')
            
            if codigo_asesoria:
                # Actualizar el estado de la asesoría en la base de datos
                connection = create_connection()
                if connection:
                    cursor = connection.cursor()
                    
                    # Registrar el pago
                    cursor.execute("""
                        INSERT INTO tbl_pago_asesoria (codigo_asesoria, monto, metodo_pago, estado_pago, datos_adicionales)
                        VALUES (%s, %s, %s, 'Completado', %s)
                    """, (
                        codigo_asesoria, 
                        payment_intent.amount / 100,  # Convertir de centavos a dólares
                        'Tarjeta de Crédito (Stripe)', 
                        json.dumps({'payment_intent': payment_intent_id})
                    ))
                    
                    # Actualizar el estado de la asesoría
                    cursor.execute("""
                        UPDATE tbl_asesoria SET estado = 'Pagada' WHERE codigo_asesoria = %s
                    """, (codigo_asesoria,))
                    
                    # Obtener información de la asesoría
                    cursor.execute("""
                        SELECT fecha_asesoria, id_asesor FROM tbl_asesoria WHERE codigo_asesoria = %s
                    """, (codigo_asesoria,))
                    
                    asesoria = cursor.fetchone()
                    
                    if asesoria:
                        fecha_obj = asesoria[0]
                        id_asesor = asesoria[1]
                        
                        # Registrar en tbl_calendario_asesorias
                        cursor.execute("""
                            INSERT INTO tbl_calendario_asesorias (id_asesor, fecha, codigo_asesoria)
                            VALUES (%s, %s, %s)
                            ON DUPLICATE KEY UPDATE codigo_asesoria = VALUES(codigo_asesoria)
                        """, (id_asesor, fecha_obj, codigo_asesoria))
                        
                        # Actualizar tbl_horarios_asesores para marcar el horario como no disponible
                        dia_semana = fecha_obj.weekday() + 1  # +1 porque en la BD 1 es lunes
                        hora = fecha_obj.time()
                        
                        cursor.execute("""
                            UPDATE tbl_horarios_asesores
                            SET disponible = 0, reserva_temporal = NULL
                            WHERE id_asesor = %s AND dia_semana = %s AND hora_inicio = %s
                        """, (id_asesor, dia_semana, hora))
                        
                        # Si había una reserva temporal, eliminarla
                        cursor.execute("""
                            DELETE FROM tbl_reservas_temporales
                            WHERE id_asesor = %s AND DATE(fecha) = %s AND TIME(fecha) = %s
                        """, (id_asesor, fecha_obj.date(), hora))
                    
                    connection.commit()
                    cursor.close()
                    connection.close()
                    
                    # Enviar correo de confirmación
                    try:
                        cursor = connection.cursor(dictionary=True)
                        cursor.execute("""
                            SELECT u.correo, CONCAT(u.nombres, ' ', u.apellidos) as nombre,
                                   a.tipo_asesoria, a.fecha_asesoria
                            FROM tbl_asesoria a
                            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
                            JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                            WHERE a.codigo_asesoria = %s
                        """, (codigo_asesoria,))
                        
                        usuario = cursor.fetchone()
                        cursor.close()
                        
                        if usuario:
                            subject = f"Confirmación de pago - Asesoría {usuario['tipo_asesoria']}"
                            body = f"""
                            Hola {usuario['nombre']},
                            
                            Tu pago para la asesoría de {usuario['tipo_asesoria']} ha sido procesado exitosamente.
                            
                            Detalles:
                            - Fecha y hora: {usuario['fecha_asesoria']}
                            - Monto: ${payment_intent.amount / 100} USD
                            - Método: Tarjeta de Crédito (Stripe)
                            
                            Gracias por confiar en nosotros.
                            
                            Atentamente,
                            Equipo CVA
                            """
                            
                            send_email_via_zoho(usuario['correo'], subject, body)
                    except Exception as e:
                        print(f"Error al enviar correo de confirmación: {e}")
                    
                    flash('Pago procesado exitosamente', 'success')
                else:
                    flash('Error de conexión a la base de datos', 'error')
            else:
                flash('No se pudo identificar la asesoría asociada al pago', 'error')
        else:
            flash(f'El pago no se completó correctamente. Estado: {payment_intent.status}', 'error')
    except Exception as e:
        flash(f'Error al procesar el pago: {str(e)}', 'error')
    
    return redirect(url_for('user.asesorias'))