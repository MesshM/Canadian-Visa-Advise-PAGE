from flask import Flask, redirect, url_for, render_template, session
from config.stripe_config import inject_stripe_key
from routes.user import user_bp
from routes.auth import auth_bp
from routes.asesorias import asesorias_bp
from routes.pagos import pagos_bp
from routes.perfil import perfil_bp
from routes.asesor import asesor_bp  # Cambia admin_bp por asesor_bp
from routes.formularios import formulario_bp
import os
from datetime import datetime, timedelta
import secrets

app = Flask(__name__)
app.secret_key = os.urandom(24)
app.permanent_session_lifetime = timedelta(days=30)

# Asegúrate de que esta función se ejecute antes de renderizar la plantilla base
app.context_processor(inject_stripe_key)
# Registrar filtro personalizado para split
@app.template_filter('split')
def split_filter(value, delimiter=' '):
    return value.split(delimiter)


# Registrar los blueprints
app.register_blueprint(user_bp, url_prefix='/user')
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(asesorias_bp, url_prefix='/asesorias')
app.register_blueprint(pagos_bp, url_prefix='/pagos')
app.register_blueprint(perfil_bp, url_prefix='/perfil')
app.register_blueprint(asesor_bp, url_prefix='/asesor')  # Cambia admin_bp por asesor_bp
app.register_blueprint(formulario_bp, url_prefix='/formularios')


# Rutas de redirección para mantener compatibilidad con URLs antiguas

# Añadir esta redirección para mantener compatibilidad
@app.route('/formulario_solicitud')
def formulario_solicitud_redirect():
    return redirect(url_for('formularios.solicitud'))

@app.route('/formularios')
def formularios_redirect():
    return redirect(url_for('user.formularios'))

@app.route('/asesorias')
def asesorias_redirect():
    return redirect(url_for('asesorias.asesorias'))

@app.route('/pagos')
def pagos_redirect():
    return redirect(url_for('pagos.pagos'))

@app.route('/chat')
def chat_redirect():
    return redirect(url_for('user.chat'))

@app.route('/registro')
def registro_redirect():
    return redirect(url_for('auth.registro'))

@app.route('/login')
def login_redirect():
    return redirect(url_for('auth.login'))

@app.route('/forgot_password')
def forgot_password_redirect():
    return redirect(url_for('auth.forgot_password'))

@app.route('/reset_password')
def reset_password_page_redirect():
    return redirect(url_for('auth.reset_password'))

@app.route('/reset_password/<token>')
def reset_password_redirect(token):
    return redirect(url_for('auth.reset_password', token=token))

@app.route('/logout')
def logout_redirect():
    return redirect(url_for('auth.logout'))

@app.route('/perfil')
def perfil_redirect():
    return redirect(url_for('perfil.perfil'))

# Rutas para la sección de asesor (antes admin)

@app.route('/asesor/solicitantes')
def solicitantes_redirect():
    return redirect(url_for('user.solicitantes'))

@app.route('/asesor/clientes')
def asesor_clientes_redirect():
    return redirect(url_for('asesor.clientes'))

@app.route('/asesor/documentos_asesor')
def asesor_documentos_redirect():
    return redirect(url_for('asesor.documentos'))

@app.route('/asesor/asesorias')
def asesor_asesorias_redirect():
    return redirect(url_for('asesor.asesorias_admin'))

@app.route('/asesor/pagos')
def asesor_pagos_redirect():
    return redirect(url_for('asesor.pagos_admin'))

@app.route('/asesor/reportes')
def asesor_reportes_redirect():
    return redirect(url_for('asesor.reportes'))

# Actualizar la función inject_urls para incluir las nuevas rutas
@app.context_processor
def inject_urls():
    from datetime import datetime
    return {
        # Rutas de autenticación
        'url_for_login': lambda: url_for('auth.login'),
        'url_for_registro': lambda: url_for('auth.registro'),
        'url_for_forgot_password': lambda: url_for('auth.forgot_password'),
        
        # Rutas de usuario
        'url_for_solicitantes': lambda: url_for('user.solicitantes'),
        'url_for_formularios': lambda: url_for('user.formularios'),
        'url_for_asesorias': lambda: url_for('asesorias.asesorias'),
        'url_for_pagos': lambda: url_for('user.pagos'),
        'url_for_chat': lambda: url_for('user.chat'),
        'url_for_perfil': lambda: url_for('perfil.perfil'),
        
        # Rutas de asesor (antes admin)
        'url_for_asesor_clientes': lambda: url_for('asesor.clientes'),
        'url_for_asesor_documentos': lambda: url_for('asesor.documentos'),
        'url_for_asesor_asesorias': lambda: url_for('asesor.asesorias_admin'),
        'url_for_asesor_pagos': lambda: url_for('asesor.pagos_admin'),
        'url_for_asesor_reportes': lambda: url_for('asesor.reportes'),
        'url_for_asesor_dashboard': lambda: url_for('asesor.dashboard_asesor'),
        
        # Ruta para el formulario de solicitud
        'url_for_formulario_solicitud': lambda: url_for('formularios.solicitud'),
        
        'now': lambda: datetime.now()
    }

# Ruta principal
@app.route('/')
def index():
    # Redirigir según el rol en sesión
    if 'user_id' in session:
        if session.get('user_role') == 'Asesor':
            return redirect(url_for('asesor.index_asesor'))
        # Puedes agregar más roles aquí si lo necesitas
        # elif session.get('user_role') == 'OtroRol':
        #     return redirect(url_for('otro_blueprint.dashboard'))
        else:
            return render_template('index.html')  # Usuario normal
    return render_template('index.html')  # Visitante no autenticado

if __name__ == '__main__':
    if not os.path.exists('static/uploads'):
        os.makedirs('static/uploads')
    app.run(debug=True, host="0.0.0.0", port=os.getenv('PORT', default=5000))


