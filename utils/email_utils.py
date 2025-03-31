import smtplib
from email.mime.text import MIMEText
import os

def send_email_via_zoho(to_email, subject, body):
    ZOHO_EMAIL = os.getenv('ZOHO_EMAIL')
    ZOHO_PASSWORD = os.getenv('ZOHO_PASSWORD')
    
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = ZOHO_EMAIL
    msg['To'] = to_email

    try:
        server = smtplib.SMTP('smtp.zoho.com', 587)
        server.starttls()
        server.login(ZOHO_EMAIL, ZOHO_PASSWORD)
        server.sendmail(ZOHO_EMAIL, [to_email], msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print("Error al enviar correo:", e)
        return False