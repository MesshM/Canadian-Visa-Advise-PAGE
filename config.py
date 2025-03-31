import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    # Flask configuration
    SECRET_KEY = os.urandom(24)
    PERMANENT_SESSION_LIFETIME = timedelta(days=30)
    
    # Stripe configuration
    STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
    STRIPE_PUBLIC_KEY = os.getenv('STRIPE_PUBLIC_KEY')
    
    # File upload configuration
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/uploads')
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB max
    
    # Email configuration
    ZOHO_EMAIL = os.getenv('ZOHO_EMAIL')
    ZOHO_PASSWORD = os.getenv('ZOHO_PASSWORD')

# Create upload folder if it doesn't exist
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

# Visa pricing
PRECIOS_VISA = {
    'Visa de Trabajo': 150.00,
    'Visa de Estudio': 100.00,
    'Residencia Permanente': 200.00,
    'Ciudadanía': 250.00,
    'Otro': 150.00
}