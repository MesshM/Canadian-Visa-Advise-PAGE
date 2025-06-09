from flask import Blueprint, render_template, redirect, url_for, session, flash, request
from config.database import create_connection

perfil_asesor_bp = Blueprint('perfil_asesor', __name__, url_prefix='/asesor')

@perfil_asesor_bp.route('/perfil')
def perfil_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))
    # ...código para mostrar el perfil del asesor...
    return render_template('asesor/perfil_asesor.html')