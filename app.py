from flask import Flask, redirect, url_for, render_template, session
from config.stripe_config import inject_stripe_key
from routes.user import user_bp
from routes.auth import auth_bp
from routes.asesorias import asesorias_bp
from routes.pagos import pagos_bp
from routes.perfil import perfil_bp
from routes.formularios import formulario_bp

# Importa todos los blueprints de asesor
from routes.routes_asesor.panel_asesor import panel_asesor_bp
from routes.routes_asesor.clientes import clientes_asesor_bp
from routes.routes_asesor.citas import citas_asesor_bp
from routes.routes_asesor.mensajeria import mensajeria_asesor_bp
from routes.routes_asesor.recursos import recursos_asesor_bp
from routes.routes_asesor.perfil_asesor import perfil_asesor_bp

# Importa otros blueprints de administrador si los tienes
from routes.routes_admin.usuarios_admin import usuarios_admin_bp
from routes.routes_admin.asesores_admin import asesores_admin_bp
from routes.routes_admin.asesorias_admin import asesorias_admin_bp
from routes.routes_admin.documentos_admin import documentos_admin_bp
from routes.routes_admin.pagos_admin import pagos_admin_bp
from routes.routes_admin.reportes_admin import reportes_admin_bp
from routes.routes_admin.configuracion_admin import configuracion_admin_bp


import os
from datetime import datetime, timedelta
import secrets

app = Flask(__name__)
app.secret_key = os.urandom(24)
app.permanent_session_lifetime = timedelta(days=30)

# Asegúrate de que esta función se ejecute antes de renderizar la plantilla base
app.context_processor(inject_stripe_key)

@app.context_processor
def inject_usuario_logeado():
    return dict(usuario_logeado=('user_id' in session))

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

# Registrar los blueprints de asesor
app.register_blueprint(panel_asesor_bp)
app.register_blueprint(clientes_asesor_bp)
app.register_blueprint(citas_asesor_bp)
app.register_blueprint(mensajeria_asesor_bp)
app.register_blueprint(recursos_asesor_bp)
app.register_blueprint(perfil_asesor_bp)

# Registrar los blueprints de administrador
app.register_blueprint(usuarios_admin_bp)
app.register_blueprint(asesores_admin_bp)
app.register_blueprint(asesorias_admin_bp)
app.register_blueprint(documentos_admin_bp)
app.register_blueprint(pagos_admin_bp)
app.register_blueprint(reportes_admin_bp)
app.register_blueprint(configuracion_admin_bp)

# Rutas de redirección para mantener compatibilidad con URLs antiguas

@app.route('/noticias')
def noticias():
    return render_template('noticias.html')

@app.route('/formularios')
def formularios_redirect():
    return redirect(url_for('formularios.formularios'))

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

@app.route('/asesor/reportes')
def asesor_reportes_redirect():
    return redirect(url_for('panel_asesor.reportes_asesor'))

@app.route('/asesor/perfil')
def asesor_perfil_redirect():
    return redirect(url_for('perfil_asesor.perfil_asesor'))

# Rutas de redirección para admin
@app.route('/admin/usuarios')
def usuarios_admin_redirect():
    return redirect(url_for('usuarios_admin.listar_usuarios'))

@app.route('/admin/usuarios/crear')
def usuarios_crear_redirect():
    return redirect(url_for('usuarios_admin.crear_usuario'))

@app.route('/admin/asesores')
def asesores_admin_redirect():
    return redirect(url_for('asesores_admin.listar_asesores'))

@app.route('/admin/asesores/crear')
def asesores_crear_redirect():
    return redirect(url_for('asesores_admin.crear_asesor'))

@app.route('/admin/asesorias')
def asesorias_admin_redirect():
    return redirect(url_for('asesorias_admin.listar_asesorias'))

@app.route('/admin/asesorias/ver')
def asesorias_ver_redirect():
    return redirect(url_for('asesorias_admin.ver_asesoria'))

@app.route('/admin/documentos')
def documentos_admin_redirect():
    return redirect(url_for('documentos_admin.listar_documentos'))

@app.route('/admin/documentos/subir')
def documentos_subir_redirect():
    return redirect(url_for('documentos_admin.subir_documento'))

@app.route('/admin/pagos')
def pagos_admin_redirect():
    return redirect(url_for('pagos_admin.listar_pagos'))

@app.route('/admin/pagos/procesar')
def pagos_procesar_redirect():
    return redirect(url_for('pagos_admin.procesar_pago'))

@app.route('/admin/reportes')
def reportes_admin_redirect():
    return redirect(url_for('reportes_admin.panel_reportes'))

@app.route('/admin/reportes/generar')
def reportes_generar_redirect():
    return redirect(url_for('reportes_admin.generar_reporte'))

@app.route('/admin/configuracion')
def configuracion_admin_redirect():
    return redirect(url_for('configuracion_admin.configuracion_general'))

@app.route('/admin/configuracion/actualizar')
def configuracion_actualizar_redirect():
    return redirect(url_for('configuracion_admin.actualizar_configuracion'))

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
        'url_for_formularios': lambda: url_for('formularios.formularios'),
        'url_for_asesorias': lambda: url_for('asesorias.asesorias'),
        'url_for_pagos': lambda: url_for('user.pagos'),
        'url_for_chat': lambda: url_for('user.chat'),
        'url_for_perfil': lambda: url_for('perfil.perfil'),

        # Rutas de asesor (antes admin)
        'url_for_asesor_clientes': lambda: url_for('clientes_asesor.clientes_asesor'),
        'url_for_asesor_documentos': lambda: url_for('clientes_asesor.documentos_asesor'),
        'url_for_asesor_asesorias': lambda: url_for('citas_asesor.asesorias_asesor'),
        'url_for_asesor_pagos': lambda: url_for('recursos_asesor.pagos_asesor'),
        'url_for_asesor_reportes': lambda: url_for('panel_asesor.reportes_asesor'),
        'url_for_asesor_dashboard': lambda: url_for('panel_asesor.dashboard_asesor'),
        'url_for_asesor_perfil': lambda: url_for('perfil_asesor.perfil_asesor'),

        # Rutas de admin
        'url_for_admin_usuarios': lambda: url_for('usuarios_admin.listar_usuarios'),
        'url_for_admin_usuarios_crear': lambda: url_for('usuarios_admin.crear_usuario'),
        'url_for_admin_usuarios_editar': lambda id: url_for('usuarios_admin.editar_usuario', id=id),
        'url_for_admin_usuarios_eliminar': lambda id: url_for('usuarios_admin.eliminar_usuario', id=id),
        
        'url_for_admin_asesores': lambda: url_for('asesores_admin.listar_asesores'),
        'url_for_admin_asesores_crear': lambda: url_for('asesores_admin.crear_asesor'),
        'url_for_admin_asesores_editar': lambda id: url_for('asesores_admin.editar_asesor', id=id),
        
        'url_for_admin_asesorias': lambda: url_for('asesorias_admin.listar_asesorias'),
        'url_for_admin_asesorias_ver': lambda id: url_for('asesorias_admin.ver_asesoria', id=id),
        
        'url_for_admin_documentos': lambda: url_for('documentos_admin.listar_documentos'),
        'url_for_admin_documentos_subir': lambda: url_for('documentos_admin.subir_documento'),
        
        'url_for_admin_pagos': lambda: url_for('pagos_admin.listar_pagos'),
        'url_for_admin_pagos_procesar': lambda id: url_for('pagos_admin.procesar_pago', id=id),
        
        'url_for_admin_reportes': lambda: url_for('reportes_admin.panel_reportes'),
        'url_for_admin_reportes_generar': lambda: url_for('reportes_admin.generar_reporte'),
        
        'url_for_admin_configuracion': lambda: url_for('configuracion_admin.configuracion_general'),
        'url_for_admin_configuracion_actualizar': lambda: url_for('configuracion_admin.actualizar_configuracion'),

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

        elif session.get('user_role') == 'Administrador':
              return redirect(url_for('panel_admin.index_admin'))
        else:
            return render_template('index.html')  # Usuario normal
    return render_template('index.html')  # Visitante no autenticado

if __name__ == '__main__':
    if not os.path.exists('static/uploads'):
        os.makedirs('static/uploads')
    app.run(debug=True, host="0.0.0.0", port=os.getenv('PORT', default=5000))

