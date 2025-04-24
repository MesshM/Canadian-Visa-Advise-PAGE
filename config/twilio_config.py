import os
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Obtener credenciales de Twilio desde variables de entorno
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_VERIFY_SERVICE_ID = os.environ.get('TWILIO_VERIFY_SERVICE_ID')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER', '+19472227927')  # Usar el número como fallback

# Inicializar el cliente de Twilio
try:
    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    logger.info("Cliente Twilio inicializado correctamente")
except Exception as e:
    logger.error(f"Error al inicializar el cliente Twilio: {str(e)}")
    client = None

def send_verification_code(phone_number, channel="sms"):
    """
    Envía un código de verificación al número de teléfono proporcionado.
    
    Args:
        phone_number (str): Número de teléfono en formato E.164 (ej: +573001234567)
        channel (str): Canal para enviar el código (sms o call)
        
    Returns:
        dict: Diccionario con 'success' (bool) y 'message' (str)
    """
    if not client:
        logger.error("Cliente Twilio no inicializado")
        return {'success': False, 'message': 'Error de configuración de Twilio'}
    
    # Verificar si estamos usando el servicio Verify o SMS directo
    use_verify_service = TWILIO_VERIFY_SERVICE_ID and TWILIO_VERIFY_SERVICE_ID.startswith('VA')
    
    # Asegurarse de que el número tenga el formato correcto
    if not phone_number.startswith('+'):
        phone_number = '+' + phone_number
    
    try:
        if use_verify_service:
            # Usar el servicio Verify de Twilio
            logger.info(f"Enviando código mediante Verify Service a {phone_number}")
            verification = client.verify \
                .v2 \
                .services(TWILIO_VERIFY_SERVICE_ID) \
                .verifications \
                .create(to=phone_number, channel=channel)
            
            logger.info(f"Código de verificación enviado a {phone_number} por {channel}")
            return {'success': True, 'message': f'Código enviado por {channel}'}
        else:
            # Usar SMS directo como alternativa
            logger.info(f"Enviando SMS directo a {phone_number} (sin Verify Service)")
            
            # Generar un código de 6 dígitos
            import random
            code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
            
            # Enviar SMS con el código
            message = client.messages.create(
                body=f'Tu código de verificación es: {code}',
                from_=TWILIO_PHONE_NUMBER,
                to=phone_number
            )
            
            logger.info(f"SMS enviado a {phone_number}, SID: {message.sid}")
            return {
                'success': True, 
                'message': 'Código enviado por SMS',
                'code': code  # Devolver el código para guardarlo en la sesión
            }
    except TwilioRestException as e:
        error_msg = f"Error de Twilio al enviar código: {str(e)}"
        logger.error(error_msg)
        
        # Proporcionar mensajes de error más específicos
        if e.code == 21211:
            return {'success': False, 'message': 'Número de teléfono inválido'}
        elif e.code == 21608:
            return {'success': False, 'message': 'El número de teléfono no está verificado para este tipo de mensaje'}
        elif e.code == 21610:
            return {'success': False, 'message': 'Este número no puede recibir mensajes de Twilio'}
        else:
            return {'success': False, 'message': f'Error de Twilio: {e.msg}'}
    except Exception as e:
        error_msg = f"Error inesperado al enviar código: {str(e)}"
        logger.error(error_msg)
        return {'success': False, 'message': 'Error interno al enviar el código'}

def check_verification_code(phone_number, code):
    """
    Verifica el código proporcionado para el número de teléfono.
    
    Args:
        phone_number (str): Número de teléfono en formato E.164 (ej: +573001234567)
        code (str): Código de verificación de 6 dígitos
        
    Returns:
        dict: Diccionario con 'success' (bool), 'message' (str) y 'direct' (bool) opcional
    """
    if not client:
        logger.error("Cliente Twilio no inicializado")
        return {'success': False, 'message': 'Error de configuración de Twilio'}
    
    # Verificar si estamos usando el servicio Verify o SMS directo
    use_verify_service = TWILIO_VERIFY_SERVICE_ID and TWILIO_VERIFY_SERVICE_ID.startswith('VA')
    
    # Asegurarse de que el número tenga el formato correcto
    if not phone_number.startswith('+'):
        phone_number = '+' + phone_number
    
    try:
        if use_verify_service:
            # Usar el servicio Verify de Twilio
            verification_check = client.verify \
                .v2 \
                .services(TWILIO_VERIFY_SERVICE_ID) \
                .verification_checks \
                .create(to=phone_number, code=code)
            
            if verification_check.status == 'approved':
                logger.info(f"Código verificado correctamente para {phone_number}")
                return {'success': True, 'message': 'Código verificado correctamente'}
            else:
                logger.warning(f"Código incorrecto para {phone_number}: {verification_check.status}")
                return {'success': False, 'message': 'Código incorrecto'}
        else:
            # En este caso, la verificación debe hacerse comparando con el código guardado en la sesión
            logger.info(f"Verificación directa para {phone_number} (sin Verify Service)")
            return {'success': None, 'message': 'Verificación directa requerida', 'direct': True}
    except TwilioRestException as e:
        logger.error(f"Error de Twilio al verificar código: {str(e)}")
        return {'success': False, 'message': f'Error de Twilio: {e.msg}'}
    except Exception as e:
        logger.error(f"Error inesperado al verificar código: {str(e)}")
        return {'success': False, 'message': f'Error interno: {str(e)}'}
