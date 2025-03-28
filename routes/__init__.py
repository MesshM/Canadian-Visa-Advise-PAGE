from flask import Blueprint

# Absolute imports from the routes package
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
from routes.admin_routes import admin_bp
from routes.asesor_routes import asesor_bp
from routes.payment_routes import payment_bp
from routes.document_routes import document_bp

def register_blueprints(app):
    """
    Registers all Blueprints in the Flask application.
    
    Args:
        app (Flask): The Flask application instance.
    """
    blueprints = [
        auth_bp,
        user_bp,
        admin_bp,
        asesor_bp,
        payment_bp,
        document_bp
    ]
    
    for blueprint in blueprints:
        app.register_blueprint(blueprint)