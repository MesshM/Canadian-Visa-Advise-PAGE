from flask import Blueprint, render_template, redirect, url_for, session, flash
from config.database import create_connection

recursos_asesor_bp = Blueprint('recursos_asesor', __name__, url_prefix='/asesor')

@recursos_asesor_bp.route('/pagos')
def pagos_asesor():
    # ...mueve aquí la función pagos_asesor completa...
    pass

# Aquí puedes agregar más rutas de recursos si lo necesitas