from flask import Flask
from config import Config
from database import create_connection
import os

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Register blueprints
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
from routes.admin_routes import admin_bp
from routes.asesor_routes import asesor_bp
from routes.payment_routes import payment_bp
from routes.document_routes import document_bp

app.register_blueprint(auth_bp)
app.register_blueprint(user_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(asesor_bp)
app.register_blueprint(payment_bp)
app.register_blueprint(document_bp)

# Import utility functions
from utils.email_utils import send_email_via_zoho
from utils.captcha_utils import generate_captcha_text
from utils.file_utils import allowed_file

# Start background thread for cleaning expired appointments
from utils.appointment_utils import start_cleanup_thread
start_cleanup_thread()

# Custom template filters
@app.template_filter('split')
def split_filter(s, delimiter=None):
    return s.split(delimiter)

# Context processors
@app.context_processor
def utility_processor():
    from datetime import datetime
    def now():
        return datetime.now()
    return dict(now=now)

if __name__ == '__main__':
    app.run(debug=True)