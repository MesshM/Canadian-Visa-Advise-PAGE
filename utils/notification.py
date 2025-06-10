# Aca va el codigo python de notification util
from flask import session
from config.database import create_connection
from datetime import datetime
import traceback

# Tipos de notificaciones
NOTIFICATION_TYPES = {
    'appointment_created': 'appointment',
    'appointment_confirmed': 'appointment',
    'appointment_reminder': 'appointment',
    'payment_pending': 'payment',
    'payment_completed': 'payment',
    'form_incomplete': 'document_reminder',
    'form_submitted': 'document_reminder',
    'visa_update': 'visa_update',
    'general_news': 'news'
}

def create_notification(user_id, tipo, titulo, mensaje, enlace=None):
    """
    Crea una nueva notificación en la base de datos.
    
    Args:
        user_id (int): ID del usuario destinatario
        tipo (str): Tipo de notificación (debe estar en NOTIFICATION_TYPES)
        titulo (str): Título de la notificación
        mensaje (str): Contenido de la notificación
        enlace (str, optional): URL opcional para más detalles
    
    Returns:
        bool: True si la notificación se creó correctamente, False en caso contrario
    """
    try:
        # Validar que el tipo de notificación sea válido
        if tipo not in NOTIFICATION_TYPES:
            print(f"Tipo de notificación inválido: {tipo}")
            return False
        
        # Mapear al tipo general para filtrado de preferencias
        tipo_general = NOTIFICATION_TYPES[tipo]
        
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Inicializar la variable should_create como True por defecto
            should_create = True
            
            # Verificar las preferencias del usuario
            cursor.execute("""
                SELECT * FROM tbl_preferencias_notificaciones 
                WHERE id_usuario = %s
            """, (user_id,))
            
            prefs = cursor.fetchone()
            
            # Si hay preferencias, verificar si este tipo de notificación está habilitado
            if prefs:
                # Verificar si el tipo de notificación está habilitado
                if tipo_general == 'appointment' and not prefs.get('appointments', True):
                    should_create = False
                elif tipo_general == 'document_reminder' and not prefs.get('document_reminders', True):
                    should_create = False
                elif tipo_general == 'visa_update' and not prefs.get('visa_updates', True):
                    should_create = False
                elif tipo_general == 'news' and not prefs.get('news', False):
                    should_create = False
                
                # Verificar si el canal de app está habilitado
                if should_create and prefs.get('channels'):
                    channels = prefs.get('channels')
                    if isinstance(channels, str):
                        import json
                        channels = json.loads(channels)
                    
                    if not channels.get('app', True):
                        should_create = False
            
            # Si las preferencias indican que no se debe crear, salir
            if not should_create:
                cursor.close()
                connection.close()
                return True  # Retornamos True porque no es un error, simplemente el usuario no quiere este tipo de notificación
            
            # Crear la notificación
            cursor.execute("""
                INSERT INTO tbl_notificaciones (id_usuario, tipo, titulo, mensaje, leida, enlace, fecha_creacion)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (user_id, tipo_general, titulo, mensaje, False, enlace, datetime.now()))
            
            connection.commit()
            cursor.close()
            connection.close()
            
            return True
        else:
            print("Error de conexión a la base de datos")
            return False
    except Exception as e:
        print(f"Error al crear notificación: {str(e)}")
        print(traceback.format_exc())
        return False

def notify_appointment_created(user_id, codigo_asesoria, fecha_asesoria, tipo_asesoria):
    """
    Crea una notificación cuando se agenda una nueva asesoría.
    
    Args:
        user_id (int): ID del usuario
        codigo_asesoria (int): Código de la asesoría
        fecha_asesoria (datetime): Fecha y hora de la asesoría
        tipo_asesoria (str): Tipo de asesoría (Visa de Trabajo, etc.)
    
    Returns:
        bool: True si la notificación se creó correctamente, False en caso contrario
    """
    fecha_str = fecha_asesoria.strftime('%d/%m/%Y a las %H:%M')
    titulo = f"Nueva asesoría agendada: {tipo_asesoria}"
    mensaje = f"Has agendado una asesoría de {tipo_asesoria} para el {fecha_str}. Recuerda realizar el pago para confirmarla."
    enlace = f"/asesorias?codigo={codigo_asesoria}"
    
    return create_notification(user_id, 'appointment_created', titulo, mensaje, enlace)

def notify_appointment_confirmed(user_id, codigo_asesoria, fecha_asesoria, tipo_asesoria):
    """
    Crea una notificación cuando se confirma una asesoría (pago realizado).
    
    Args:
        user_id (int): ID del usuario
        codigo_asesoria (int): Código de la asesoría
        fecha_asesoria (datetime): Fecha y hora de la asesoría
        tipo_asesoria (str): Tipo de asesoría (Visa de Trabajo, etc.)
    
    Returns:
        bool: True si la notificación se creó correctamente, False en caso contrario
    """
    fecha_str = fecha_asesoria.strftime('%d/%m/%Y a las %H:%M')
    titulo = f"Asesoría confirmada: {tipo_asesoria}"
    mensaje = f"Tu asesoría de {tipo_asesoria} para el {fecha_str} ha sido confirmada. Te esperamos puntualmente."
    enlace = f"/asesorias?codigo={codigo_asesoria}"
    
    return create_notification(user_id, 'appointment_confirmed', titulo, mensaje, enlace)

def notify_appointment_reminder(user_id, codigo_asesoria, fecha_asesoria, tipo_asesoria):
    """
    Crea una notificación de recordatorio para una asesoría próxima.
    
    Args:
        user_id (int): ID del usuario
        codigo_asesoria (int): Código de la asesoría
        fecha_asesoria (datetime): Fecha y hora de la asesoría
        tipo_asesoria (str): Tipo de asesoría (Visa de Trabajo, etc.)
    
    Returns:
        bool: True si la notificación se creó correctamente, False en caso contrario
    """
    fecha_str = fecha_asesoria.strftime('%d/%m/%Y a las %H:%M')
    titulo = f"Recordatorio de asesoría: {tipo_asesoria}"
    mensaje = f"Te recordamos que tienes una asesoría de {tipo_asesoria} programada para el {fecha_str}."
    enlace = f"/asesorias?codigo={codigo_asesoria}"
    
    return create_notification(user_id, 'appointment_reminder', titulo, mensaje, enlace)

def notify_payment_pending(user_id, codigo_asesoria, monto, tipo_asesoria):
    """
    Crea una notificación de pago pendiente para una asesoría.
    
    Args:
        user_id (int): ID del usuario
        codigo_asesoria (int): Código de la asesoría
        monto (float): Monto a pagar
        tipo_asesoria (str): Tipo de asesoría (Visa de Trabajo, etc.)
    
    Returns:
        bool: True si la notificación se creó correctamente, False en caso contrario
    """
    titulo = "Pago pendiente"
    mensaje = f"Tienes un pago pendiente de ${monto} para tu asesoría de {tipo_asesoria}. Realiza el pago para confirmar tu cita."
    enlace = f"/asesorias?codigo={codigo_asesoria}&action=pagar"
    
    return create_notification(user_id, 'payment_pending', titulo, mensaje, enlace)

def notify_payment_completed(user_id, codigo_asesoria, monto, tipo_asesoria):
    """
    Crea una notificación de pago completado para una asesoría.
    
    Args:
        user_id (int): ID del usuario
        codigo_asesoria (int): Código de la asesoría
        monto (float): Monto pagado
        tipo_asesoria (str): Tipo de asesoría (Visa de Trabajo, etc.)
    
    Returns:
        bool: True si la notificación se creó correctamente, False en caso contrario
    """
    titulo = "Pago confirmado"
    mensaje = f"Hemos recibido tu pago de ${monto} para la asesoría de {tipo_asesoria}. Tu cita ha sido confirmada."
    enlace = f"/asesorias?codigo={codigo_asesoria}"
    
    return create_notification(user_id, 'payment_completed', titulo, mensaje, enlace)

def notify_form_incomplete(user_id, form_id=None):
    """
    Crea una notificación para recordar al usuario que tiene formularios incompletos.
    
    Args:
        user_id (int): ID del usuario
        form_id (int, optional): ID del formulario incompleto
    
    Returns:
        bool: True si la notificación se creó correctamente, False en caso contrario
    """
    titulo = "Formulario incompleto"
    mensaje = "Tienes un formulario de solicitud incompleto. Complétalo para continuar con tu proceso de visa."
    enlace = f"/formularios/solicitud" if not form_id else f"/formularios/solicitud?form_id={form_id}"
    
    return create_notification(user_id, 'form_incomplete', titulo, mensaje, enlace)

def notify_form_submitted(user_id, form_id):
    """
    Crea una notificación cuando un usuario envía un formulario completo.
    
    Args:
        user_id (int): ID del usuario
        form_id (int): ID del formulario enviado
    
    Returns:
        bool: True si la notificación se creó correctamente, False en caso contrario
    """
    titulo = "Formulario enviado"
    mensaje = "Tu formulario de solicitud ha sido enviado correctamente. Nuestros asesores lo revisarán pronto."
    enlace = f"/formularios/solicitud_exitosa/{form_id}"
    
    return create_notification(user_id, 'form_submitted', titulo, mensaje, enlace)

def notify_visa_update(user_id, update_type, details=None):
    """
    Crea una notificación sobre actualizaciones en el proceso de visa.
    
    Args:
        user_id (int): ID del usuario
        update_type (str): Tipo de actualización (aprobada, rechazada, en proceso, etc.)
        details (str, optional): Detalles adicionales sobre la actualización
    
    Returns:
        bool: True si la notificación se creó correctamente, False en caso contrario
    """
    titulo_map = {
        'approved': "¡Visa aprobada!",
        'rejected': "Visa rechazada",
        'in_process': "Visa en proceso",
        'documents_required': "Documentos adicionales requeridos",
        'interview': "Entrevista programada"
    }
    
    mensaje_map = {
        'approved': "¡Felicidades! Tu visa ha sido aprobada.",
        'rejected': "Lo sentimos, tu visa ha sido rechazada. Contacta a nuestros asesores para más información.",
        'in_process': "Tu solicitud de visa está siendo procesada. Te mantendremos informado.",
        'documents_required': "Se requieren documentos adicionales para tu solicitud de visa.",
        'interview': "Se ha programado una entrevista para tu solicitud de visa."
    }
    
    titulo = titulo_map.get(update_type, "Actualización de visa")
    mensaje = mensaje_map.get(update_type, "Hay una actualización en tu proceso de visa.")
    
    if details:
        mensaje += f" {details}"
    
    enlace = "/perfil"
    
    return create_notification(user_id, 'visa_update', titulo, mensaje, enlace)

def notify_general_news(user_id, titulo, mensaje, enlace=None):
    """
    Crea una notificación de noticias generales.
    
    Args:
        user_id (int): ID del usuario
        titulo (str): Título de la noticia
        mensaje (str): Contenido de la noticia
        enlace (str, optional): Enlace para más detalles
    
    Returns:
        bool: True si la notificación se creó correctamente, False en caso contrario
    """
    return create_notification(user_id, 'general_news', titulo, mensaje, enlace)

def get_unread_notifications_count(user_id):
    """
    Obtiene el número de notificaciones no leídas para un usuario.
    
    Args:
        user_id (int): ID del usuario
    
    Returns:
        int: Número de notificaciones no leídas
    """
    try:
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            cursor.execute("""
                SELECT COUNT(*) as count FROM tbl_notificaciones 
                WHERE id_usuario = %s AND leida = 0
            """, (user_id,))
            
            result = cursor.fetchone()
            count = result['count'] if result else 0
            
            cursor.close()
            connection.close()
            
            return count
        else:
            print("Error de conexión a la base de datos")
            return 0
    except Exception as e:
        print(f"Error al obtener conteo de notificaciones: {str(e)}")
        return 0

def check_incomplete_forms(user_id):
    """
    Verifica si el usuario tiene formularios incompletos y crea notificaciones si es necesario.
    """
    try:
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            # Obtener el id_solicitante del usuario
            cursor.execute("""
                SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s
            """, (user_id,))
            solicitante = cursor.fetchone()
            if not solicitante:
                cursor.close()
                connection.close()
                return True
            id_solicitante = solicitante['id_solicitante']
            # Buscar formularios con completado = 0
            cursor.execute("""
                SELECT id_formElegibilidad FROM tbl_form_eligibilidadCVA 
                WHERE id_solicitante = %s AND completado = 0
            """, (id_solicitante,))
            incomplete_forms = cursor.fetchall()
            if incomplete_forms:
                for form in incomplete_forms:
                    notify_form_incomplete(user_id, form['id_formElegibilidad'])
            cursor.close()
            connection.close()
            return True
        else:
            print("Error de conexión a la base de datos")
            return False
    except Exception as e:
        print(f"Error al verificar formularios incompletos: {str(e)}")
        return False

def marcar_notificaciones_incompletas_leidas(user_id, id_form_elegibilidad):
    """
    Marca como leídas las notificaciones de formularios incompletos para el usuario especificado.
    
    Args:
        user_id (int): ID del usuario
        id_form_elegibilidad (int): ID del formulario de elegibilidad
    
    Returns:
        bool: True si las notificaciones se marcaron como leídas correctamente, False en caso contrario
    """
    try:
        connection = create_connection()
        if connection:
            cursor = connection.cursor()
            cursor.execute("""
                UPDATE tbl_notificaciones
                SET leida = 1
                WHERE id_usuario = %s AND tipo = 'document_reminder' AND enlace LIKE %s
            """, (user_id, f"%form_id={id_form_elegibilidad}%"))
            connection.commit()
            cursor.close()
            connection.close()
            
            return True
        else:
            print("Error de conexión a la base de datos")
            return False
    except Exception as e:
        print(f"Error al marcar notificaciones como leídas: {str(e)}")
        return False
