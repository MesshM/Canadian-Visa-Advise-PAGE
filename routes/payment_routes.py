# routes/payment_routes.py

from flask import Blueprint, jsonify, request, session
from database import create_connection
import json
from config import PRECIOS_VISA  # Importación absoluta desde el módulo config

# Registrar el Blueprint
payment_bp = Blueprint('payment', __name__, url_prefix='/payment')

@payment_bp.route('/procesar_pago', methods=['POST'])
def procesar_pago():
    """
    Procesa el pago de una asesoría.
    
    Args:
        JSON con los siguientes campos:
        - codigo_asesoria (str): Código de la asesoría.
        - monto (float): Monto del pago.
        - metodo_pago (str): Método de pago utilizado.
        - datos_adicionales (dict, opcional): Datos adicionales relacionados con el pago.
        - fecha_asesoria (str, opcional): Fecha de la asesoría.
        - id_asesor (int, opcional): ID del asesor asociado.
    
    Returns:
        JSON: Respuesta indicando éxito o error.
    """
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401

    try:
        data = request.get_json()
        codigo_asesoria = data.get('codigo_asesoria')
        monto = data.get('monto')
        metodo_pago = data.get('metodo_pago')
        datos_adicionales = data.get('datos_adicionales', {})
        fecha_asesoria = data.get('fecha_asesoria')
        id_asesor = data.get('id_asesor')

        # Validar datos obligatorios
        if not all([codigo_asesoria, monto, metodo_pago]):
            return jsonify({'error': 'Faltan datos obligatorios (código de asesoría, monto o método de pago)'}), 400

        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            try:
                # Insertar el pago en la tabla de pagos
                cursor.execute("""
                    INSERT INTO tbl_pago_asesoria 
                    (codigo_asesoria, monto, metodo_pago, estado_pago, datos_adicionales, fecha_pago)
                    VALUES (%s, %s, %s, 'Completado', %s, NOW())
                """, (codigo_asesoria, monto, metodo_pago, json.dumps(datos_adicionales)))

                # Actualizar el estado de la asesoría a "Pagada"
                cursor.execute("""
                    UPDATE tbl_asesoria 
                    SET estado = 'Pagada' 
                    WHERE codigo_asesoria = %s
                """, (codigo_asesoria,))

                connection.commit()
                return jsonify({'success': True, 'message': 'Pago procesado exitosamente'})
            except Exception as e:
                connection.rollback()
                return jsonify({'error': f'Error al procesar el pago: {str(e)}'}), 500
            finally:
                cursor.close()
                connection.close()
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        return jsonify({'error': f'Error inesperado: {str(e)}'}), 500

@payment_bp.route('/historial_pagos')
def historial_pagos():
    """
    Muestra el historial de pagos del usuario.
    
    Returns:
        JSON: Lista de pagos realizados por el usuario.
    """
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401

    connection = create_connection()
    if connection:
        try:
            with connection.cursor(dictionary=True) as cursor:
                # Obtener el historial de pagos del usuario actual
                cursor.execute("""
                    SELECT pa.id_pago, pa.codigo_asesoria, pa.monto, pa.metodo_pago, pa.estado_pago, 
                           pa.fecha_pago, a.tipo_asesoria
                    FROM tbl_pago_asesoria pa
                    JOIN tbl_asesoria a ON pa.codigo_asesoria = a.codigo_asesoria
                    JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
                    WHERE s.id_usuario = %s
                    ORDER BY pa.fecha_pago DESC
                """, (session['user_id'],))
                pagos = cursor.fetchall()

                # Formatear fechas para mejor visualización
                for pago in pagos:
                    pago['fecha_formateada'] = pago['fecha_pago'].strftime("%d/%m/%Y %H:%M") if pago['fecha_pago'] else "N/A"

            return jsonify({'success': True, 'pagos': pagos})
        except Exception as e:
            return jsonify({'error': f'Error al cargar el historial de pagos: {str(e)}'}), 500
        finally:
            connection.close()
    else:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500