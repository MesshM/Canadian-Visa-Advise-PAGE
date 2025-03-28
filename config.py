# config.py

import os
from dotenv import load_dotenv
from datetime import timedelta

# Cargar variables de entorno desde .env
load_dotenv()

# Configuración de Flask
SECRET_KEY = os.urandom(24)
PERMANENT_SESSION_LIFETIME = timedelta(days=30)

# Configuración para subida de archivos
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB max

# Configuración de Zoho Mail
ZOHO_EMAIL = os.getenv('ZOHO_EMAIL')  # Tu correo de Zoho
ZOHO_PASSWORD = os.getenv('ZOHO_PASSWORD')  # Contraseña de aplicación de Zoho

# Configuración de Stripe
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
STRIPE_PUBLIC_KEY = os.getenv('STRIPE_PUBLIC_KEY')

# Precios por tipo de visa
PRECIOS_VISA = {
    'Visa de Trabajo': 150.00,
    'Visa de Estudio': 100.00,
    'Residencia Permanente': 200.00,
    'Ciudadanía': 250.00,
    'Otro': 150.00,
}