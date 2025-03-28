def register_blueprints(app):
    from routes import (
        auth_bp, 
        user_bp, 
        admin_bp, 
        asesor_bp, 
        payment_bp, 
        document_bp
    )
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(asesor_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(document_bp)