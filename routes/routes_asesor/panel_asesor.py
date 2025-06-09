from flask import Blueprint, render_template, redirect, url_for, session, flash
import datetime
from config.database import create_connection

panel_asesor_bp = Blueprint('panel_asesor', __name__, url_prefix='/asesor')

@panel_asesor_bp.route('/dashboard')
def dashboard_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))
    try:
        return render_template('asesor/index_asesor.html')
    except Exception as e:
        print(f"Error al renderizar la plantilla: {str(e)}")
        return redirect(url_for('panel_asesor.asesorias_asesor'))

@panel_asesor_bp.route('/')
def index_asesor():
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return redirect(url_for('auth.login'))
    return render_template('asesor/index_asesor.html')

@panel_asesor_bp.route('/reportes')
def reportes_asesor():
    # ...mueve aquí la función reportes_asesor completa...
    pass