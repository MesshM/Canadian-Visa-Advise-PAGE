<<<<<<< HEAD
from flask import Flask, redirect, url_for, render_template
from flask_cors import CORS
=======
from flask import Flask, redirect, url_for, render_template, session
>>>>>>> 9640e1e49e2215a464c9e5a42f112539c54e5812
from config.stripe_config import inject_stripe_key
from routes.user import user_bp
from routes.auth import auth_bp
from routes.asesorias import asesorias_bp
from routes.pagos import pagos_bp
from routes.perfil import perfil_bp
<<<<<<< HEAD
from routes.admin import admin_bp  # Changed from asesor_admin to admin
=======
>>>>>>> 9640e1e49e2215a464c9e5a42f112539c54e5812
from routes.formularios import formulario_bp

# Importa todos los blueprints de asesor
from routes.routes_asesor.panel_asesor import panel_asesor_bp
from routes.routes_asesor.clientes import clientes_asesor_bp
from routes.routes_asesor.citas import citas_asesor_bp
from routes.routes_asesor.mensajeria import mensajeria_asesor_bp
from routes.routes_asesor.recursos import recursos_asesor_bp
from routes.routes_asesor.perfil_asesor import perfil_asesor_bp

import os
from datetime import datetime, timedelta
import secrets

app = Flask(__name__)
app.secret_key = os.urandom(24)
app.permanent_session_lifetime = timedelta(days=30)
CORS(app)  # Added CORS support

# Asegúrate de que esta función se ejecute antes de renderizar la plantilla base
app.context_processor(inject_stripe_key)

# Registrar filtro personalizado para split
@app.template_filter('split')
def split_filter(value, delimiter=' '):
    return value.split(delimiter)

# Registrar los blueprints principales
app.register_blueprint(user_bp, url_prefix='/user')
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(asesorias_bp, url_prefix='/asesorias')
app.register_blueprint(pagos_bp, url_prefix='/pagos')
app.register_blueprint(perfil_bp, url_prefix='/perfil')
app.register_blueprint(formulario_bp, url_prefix='/formularios')
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(admin_bp, url_prefix='/admin')
app.register_blueprint(asesor_bp, url_prefix='/asesor')

# Registrar los blueprints de asesor
app.register_blueprint(panel_asesor_bp)
app.register_blueprint(clientes_asesor_bp)
app.register_blueprint(citas_asesor_bp)
app.register_blueprint(mensajeria_asesor_bp)
app.register_blueprint(recursos_asesor_bp)
app.register_blueprint(perfil_asesor_bp)

# Rutas de redirección para mantener compatibilidad con URLs antiguas
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
@app.route('/asesor/clientes')
def asesor_clientes_redirect():
    return redirect(url_for('clientes_asesor.clientes_asesor'))

@app.route('/asesor/documentos_asesor')
def asesor_documentos_redirect():
    return redirect(url_for('clientes_asesor.documentos_asesor'))

@app.route('/asesor/asesorias')
def asesor_asesorias_redirect():
    return redirect(url_for('citas_asesor.asesorias_asesor'))

@app.route('/asesor/pagos')
def asesor_pagos_redirect():
    return redirect(url_for('recursos_asesor.pagos_asesor'))

<<<<<<< HEAD
@app.route('/admin/asesorias')
def admin_asesorias_redirect():
    return redirect(url_for('admin.asesorias_admin'))  # Updated to match new route name

@app.route('/admin/pagos')
def admin_pagos_redirect():
    return redirect(url_for('admin.pagos_admin'))  # Updated to match new route name

@app.route('/admin/reportes')
def admin_reportes_redirect():
    return redirect(url_for('admin.reportes'))
=======
@app.route('/asesor/reportes')
def asesor_reportes_redirect():
    return redirect(url_for('panel_asesor.reportes_asesor'))

@app.route('/asesor/perfil')
def asesor_perfil_redirect():
    return redirect(url_for('perfil_asesor.perfil_asesor'))
>>>>>>> 9640e1e49e2215a464c9e5a42f112539c54e5812

# Nuevas redirecciones para las funcionalidades de administrador
@app.route('/admin/dashboard')
def admin_dashboard_redirect():
    return redirect(url_for('admin.index'))

@app.route('/admin/usuarios')
def admin_usuarios_redirect():
    return redirect(url_for('admin.usuarios'))

@app.route('/admin/asignacion_clientes')
def admin_asignacion_redirect():
    return redirect(url_for('admin.asignacion_clientes'))

@app.route('/admin/asesores')
def admin_asesores_redirect():
    return redirect(url_for('admin.asesores'))

@app.route('/admin/documentos')
def admin_docs_redirect():
    return redirect(url_for('admin.documentos'))

@app.route('/admin/configuracion')
def admin_config_redirect():
    return redirect(url_for('admin.configuracion'))

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
        'url_for_pagos': lambda: url_for('pagos.pagos'),
        'url_for_chat': lambda: url_for('user.chat'),
        'url_for_perfil': lambda: url_for('perfil.perfil'),
<<<<<<< HEAD
        
        # Rutas de administrador
        'url_for_admin_clientes': lambda: url_for('admin.clientes'),
        'url_for_admin_documentos': lambda: url_for('admin.documentos'),
        'url_for_admin_asesorias': lambda: url_for('admin.asesorias_admin'),
        'url_for_admin_pagos': lambda: url_for('admin.pagos_admin'),
        'url_for_admin_reportes': lambda: url_for('admin.reportes'),
        'url_for_admin_dashboard': lambda: url_for('admin.index'),
        'url_for_admin_usuarios': lambda: url_for('admin.usuarios'),
        'url_for_admin_asesores': lambda: url_for('admin.asesores'),
        'url_for_admin_asignacion': lambda: url_for('admin.asignacion_clientes'),
        'url_for_admin_configuracion': lambda: url_for('admin.configuracion'),
        
        # Ruta para el formulario de solicitud
=======
>>>>>>> 9640e1e49e2215a464c9e5a42f112539c54e5812
        'url_for_formulario_solicitud': lambda: url_for('formularios.solicitud'),

        # Rutas de asesor (antes admin)
        'url_for_asesor_clientes': lambda: url_for('clientes_asesor.clientes_asesor'),
        'url_for_asesor_documentos': lambda: url_for('clientes_asesor.documentos_asesor'),
        'url_for_asesor_asesorias': lambda: url_for('citas_asesor.asesorias_asesor'),
        'url_for_asesor_pagos': lambda: url_for('recursos_asesor.pagos_asesor'),
        'url_for_asesor_reportes': lambda: url_for('panel_asesor.reportes_asesor'),
        'url_for_asesor_dashboard': lambda: url_for('panel_asesor.dashboard_asesor'),
        'url_for_asesor_perfil': lambda: url_for('perfil_asesor.perfil_asesor'),

        'now': lambda: datetime.now()
    }

# Ruta principal
@app.route('/')
def index():
    # Redirigir según el rol en sesión
    if 'user_id' in session:
        if session.get('user_role') == 'Asesor':
            return redirect(url_for('panel_asesor.index_asesor'))
        # Puedes agregar más roles aquí si lo necesitas
        # elif session.get('user_role') == 'OtroRol':
        #     return redirect(url_for('otro_blueprint.dashboard'))
        else:
            return render_template('index.html')  # Usuario normal
    return render_template('index.html')  # Visitante no autenticado


    if session.get('user_role') == 'Administrador':
        return redirect(url_for('admin.index'))
    elif session.get('user_role') == 'Asesor':
        return redirect(url_for('asesor.index'))
    else:
        # Para usuarios regulares, mostrar página principal
        return render_template('index.html')   

if __name__ == '__main__':
    if not os.path.exists('static/uploads'):
        os.makedirs('static/uploads')
    app.run(debug=True, host="0.0.0.0", port=os.getenv('PORT', default=5000))

