# utils/captcha_utils.py

import random
import string

def generate_captcha_text(length=6):
    """
    Genera un texto aleatorio para CAPTCHA.
    
    Args:
        length (int): Longitud del texto CAPTCHA (por defecto 6 caracteres).
    
    Returns:
        str: Texto CAPTCHA generado.
    """
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for _ in range(length))

def validate_captcha(user_input, session_captcha):
    """
    Valida si el CAPTCHA ingresado por el usuario coincide con el almacenado en la sesión.
    
    Args:
        user_input (str): Entrada del usuario para validar el CAPTCHA.
        session_captcha (str): CAPTCHA almacenado en la sesión.
    
    Returns:
        bool: True si el CAPTCHA es válido, False en caso contrario.
    """
    return user_input.strip().lower() == session_captcha.strip().lower()

def verify_captcha(captcha_response):
    """
    Verifica la respuesta del CAPTCHA.
    
    Args:
        captcha_response (str): Respuesta del CAPTCHA a verificar.
    
    Returns:
        bool: True si el CAPTCHA es verificado, False en caso contrario.
    """
    # Placeholder implementation
    # En un escenario real, integrarías con un servicio de CAPTCHA como reCAPTCHA
    if not captcha_response:
        return False
    
    # Para este ejemplo, simplemente se devuelve True
    # Reemplaza esto con lógica real para verificar el CAPTCHA
    return True