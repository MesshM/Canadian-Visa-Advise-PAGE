import string
import random
import secrets
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from pytz import timezone

# Generar un texto aleatorio para el captcha
def generate_captcha_text(length=6):
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for i in range(length))

# Generar token para restablecimiento de contraseña
def generate_reset_token():
    return secrets.token_urlsafe(32)

# Generar fecha de expiración para token
def generate_token_expiration():
    colombia_tz = timezone('America/Bogota')
    return datetime.now(colombia_tz) + timedelta(hours=1)

# Verificar contraseña
def verify_password(hashed_password, password):
    return check_password_hash(hashed_password, password)

# Generar hash de contraseña
def hash_password(password):
    return generate_password_hash(password)

