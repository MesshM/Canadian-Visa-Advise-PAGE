import string
import random
import secrets
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from pytz import timezone
from functools import wraps
from flask import session, redirect, url_for, flash

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

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash("Debes iniciar sesión para acceder a esta página.", "warning")
            return redirect(url_for('auth.login'))  # Cambia 'auth.login' si tu login tiene otro endpoint
        return f(*args, **kwargs)
    return decorated_function

def role_required(roles):
    if isinstance(roles, str):
        roles = [roles]
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_role = session.get('user_role')
            if user_role not in roles:
                flash('No tienes permiso para acceder a esta página.', 'error')
                # Redirección personalizada por rol
                if user_role == 'Asesor':
                    return redirect(url_for('panel_asesor.index_asesor'))
                # elif user_role == 'Admin':
                    #return redirect(url_for('admin.dashboard'))  # Cambia según tu panel de admin
                else:
                    return redirect(url_for('auth.login'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator