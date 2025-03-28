# utils/email_utils.py

import smtplib
from email.mime.text import MIMEText
from config import ZOHO_EMAIL, ZOHO_PASSWORD

def send_email_via_zoho(to_email, subject, body):
    """
    Envía un correo electrónico a través de Zoho Mail.
    
    Args:
        to_email (str): Dirección de correo electrónico del destinatario.
        subject (str): Asunto del correo.
        body (str): Cuerpo del correo (contenido en texto plano).
    
    Returns:
        bool: True si el correo se envió correctamente, False en caso de error.
    """
    # Crear el mensaje
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = ZOHO_EMAIL
    msg['To'] = to_email

    try:
        # Conectar al servidor SMTP de Zoho
        server = smtplib.SMTP('smtp.zoho.com', 587)
        server.starttls()  # Iniciar conexión segura
        server.login(ZOHO_EMAIL, ZOHO_PASSWORD)  # Autenticarse con las credenciales de Zoho
        server.sendmail(ZOHO_EMAIL, [to_email], msg.as_string())  # Enviar el correo
        server.quit()  # Cerrar la conexión
        return True  # Éxito
    except Exception as e:
        print(f"Error al enviar correo: {e}")
        return False  # Error

def send_verification_email(to_email, verification_code):
    """
    Envía un correo de verificación con un código único.
    
    Args:
        to_email (str): Dirección de correo electrónico del destinatario.
        verification_code (str): Código de verificación a enviar.
    
    Returns:
        bool: True si el correo se envió correctamente, False en caso de error.
    """
    subject = "Verify Your Email"
    body = f"Your verification code is: {verification_code}"
    
    try:
        # Usar la función genérica para enviar el correo
        return send_email_via_zoho(to_email, subject, body)
    except Exception as e:
        print(f"Error sending verification email: {e}")
        return False