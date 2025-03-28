import sys
import os
from flask import Flask, render_template, session, jsonify, send_file, redirect, url_for, flash
from datetime import datetime
import stripe
import io
import json

# Add project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Import configuration
from config import (
    SECRET_KEY,
    PERMANENT_SESSION_LIFETIME,
    UPLOAD_FOLDER,
    MAX_CONTENT_LENGTH,
    STRIPE_SECRET_KEY,
    STRIPE_PUBLIC_KEY,
)

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Import database and routes
from database import create_connection
from routes.blueprint_registration import register_blueprints

def create_app():
    """
    Create and configure the Flask application.
    
    Returns:
        Flask: Configured Flask application instance
    """
    # Initialize Flask app
    app = Flask(__name__)

    # Application configuration
    app.secret_key = SECRET_KEY
    app.config['PERMANENT_SESSION_LIFETIME'] = PERMANENT_SESSION_LIFETIME

    # File upload configuration
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Stripe configuration
    app.config['STRIPE_SECRET_KEY'] = STRIPE_SECRET_KEY
    app.config['STRIPE_PUBLIC_KEY'] = STRIPE_PUBLIC_KEY
    stripe.api_key = app.config['STRIPE_SECRET_KEY']

    # Define prices for different visa types
    app.config['PRECIOS_VISA'] = {
        'Visa de Trabajo': 150.00,
        'Visa de Estudio': 100.00,
        'Residencia Permanente': 200.00,
        'Ciudadanía': 250.00,
        'Otro': 150.00,
    }

    # Register blueprints
    register_blueprints(app)

    # Custom template filters and context processors
    @app.template_filter('split')
    def split_filter(s, delimiter=None):
        """
        Custom template filter to split strings.
        
        Args:
            s (str): String to split
            delimiter (str, optional): Delimiter to split the string
        
        Returns:
            list: List of string parts
        """
        return s.split(delimiter) if s else []

    @app.context_processor
    def utility_processor():
        """
        Context processor to provide utilities in templates.
        
        Returns:
            dict: Dictionary with functions available in templates
        """
        def now():
            return datetime.now()
        return dict(now=now)

    # Routes
    @app.route('/')
    def index():
        """
        Main route of the application.
        Shows home page or dashboard based on user authentication.
        
        Returns:
            Rendered template for index page
        """
        if 'user_id' not in session:
            return render_template('index.html', logged_in=False)
        else:
            return render_template('index.html', logged_in=True)

    @app.route('/descargar_datos_personales')
    def descargar_datos_personales():
        """
        Download user personal data in JSON format.
        
        Returns:
            JSON file with personal data or redirect to login/profile
        """
        if 'user_id' not in session:
            return redirect(url_for('auth.login'))

        try:
            connection = create_connection()
            if connection:
                with connection.cursor(dictionary=True) as cursor:
                    # Fetch user information
                    cursor.execute(
                        """
                        SELECT u.id_usuario, u.nombres, u.apellidos, u.correo, u.fecha_nacimiento,
                               s.id_solicitante
                        FROM tbl_usuario u
                        LEFT JOIN tbl_solicitante s ON u.id_usuario = s.id_usuario
                        WHERE u.id_usuario = %s
                        """,
                        (session['user_id'],),
                    )
                    user_data = cursor.fetchone()

                    if not user_data:
                        flash('Usuario no encontrado', 'error')
                        return redirect(url_for('perfil'))

                    # Convert to JSON
                    json_data = json.dumps(user_data, default=str, indent=4)

                    # Create in-memory file
                    mem_file = io.BytesIO()
                    mem_file.write(json_data.encode('utf-8'))
                    mem_file.seek(0)

                return send_file(
                    mem_file,
                    mimetype='application/json',
                    as_attachment=True,
                    download_name=f'datos_personales_{session["user_id"]}.json',
                )
        except Exception as e:
            flash(f'Error al descargar datos: {str(e)}', 'error')
            return redirect(url_for('perfil'))
        finally:
            if connection:
                connection.close()

    return app

def run_app():
    """
    Run the Flask application.
    """
    app = create_app()
    app.run(debug=True)

if __name__ == '__main__':
    run_app()