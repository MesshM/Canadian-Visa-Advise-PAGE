from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from werkzeug.security import generate_password_hash
from functools import wraps
import mysql.connector
from mysql.connector import Error
import re
from datetime import datetime
from config.database import create_connection

asesores_admin_bp = Blueprint('asesores_admin', __name__, url_prefix='/admin/asesores')

def admin_required(f):
    """Decorador para verificar que el usuario sea administrador"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or session.get('user_role') != 'Administrador':
            flash('Acceso denegado. Se requieren permisos de administrador.', 'error')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

def validar_email(email):
    """Validar formato de email"""
    patron = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(patron, email) is not None

def get_db_connection():
    """Obtener conexión a la base de datos"""
    return create_connection()

@asesores_admin_bp.route('/')
@admin_required
def listar_asesores():
    """Listar todos los asesores del sistema - Solo datos de tbl_asesor"""
    try:
        conn = get_db_connection()
        if not conn:
            flash('Error de conexión a la base de datos', 'error')
            return render_template('admin/asesores_admin.html', asesores=[], total_paginas=1, pagina_actual=1, buscar='', total_asesores=0, asesores_activos=0)
        
        cursor = conn.cursor(dictionary=True)
        
        buscar = request.args.get('buscar', '').strip()
        pagina = int(request.args.get('pagina', 1))
        por_pagina = 20

        # Solo columnas existentes: id_asesor, nombre, apellidos, correo
        query = '''
            SELECT a.id_asesor, a.nombre, a.apellidos, a.correo,
                   CASE WHEN u.correo_verificado = 1 THEN 'Activo' ELSE 'Inactivo' END as estado
            FROM tbl_asesor a
            LEFT JOIN tbl_usuario u ON a.id_usuario = u.id_usuario
            WHERE 1=1
        '''
        params = []
        if buscar:
            query += ''' AND (a.nombre LIKE %s OR a.apellidos LIKE %s OR a.correo LIKE %s 
                        OR CONCAT(a.nombre, " ", a.apellidos) LIKE %s)'''
            search_param = f'%{buscar}%'
            params.extend([search_param, search_param, search_param, search_param])

        count_query = f"SELECT COUNT(*) as total FROM tbl_asesor a LEFT JOIN tbl_usuario u ON a.id_usuario = u.id_usuario WHERE 1=1"
        count_params = []
        if buscar:
            count_query += ''' AND (a.nombre LIKE %s OR a.apellidos LIKE %s OR a.correo LIKE %s 
                              OR CONCAT(a.nombre, " ", a.apellidos) LIKE %s)'''
            count_params.extend([search_param, search_param, search_param, search_param])

        cursor.execute(count_query, count_params)
        total_asesores_row = cursor.fetchone()
        total_asesores = total_asesores_row['total'] if total_asesores_row and 'total' in total_asesores_row else 0

        query += ' ORDER BY a.id_asesor DESC LIMIT %s OFFSET %s'
        params.extend([por_pagina, (pagina - 1) * por_pagina])
        cursor.execute(query, params)
        asesores = cursor.fetchall()

        cursor.execute('SELECT COUNT(*) as total FROM tbl_asesor')
        total_asesores_stat_row = cursor.fetchone()
        total_asesores_stat = total_asesores_stat_row['total'] if total_asesores_stat_row and 'total' in total_asesores_stat_row else 0

        cursor.execute('''
            SELECT COUNT(*) as total FROM tbl_asesor a 
            JOIN tbl_usuario u ON a.id_usuario = u.id_usuario 
            WHERE u.correo_verificado = 1
        ''')
        asesores_activos_row = cursor.fetchone()
        asesores_activos = asesores_activos_row['total'] if asesores_activos_row and 'total' in asesores_activos_row else 0

        cursor.close()
        conn.close()

        total_paginas = (total_asesores + por_pagina - 1) // por_pagina if total_asesores > 0 else 1

        return render_template('admin/asesores_admin.html',
                             asesores=asesores,
                             total_asesores=total_asesores_stat,
                             asesores_activos=asesores_activos,
                             pagina_actual=pagina,
                             total_paginas=total_paginas,
                             buscar=buscar)
                             
    except Error as e:
        print(f"Error en listar_asesores: {str(e)}")
        flash(f'Error al cargar asesores: {str(e)}', 'error')
        return render_template('admin/asesores_admin.html', asesores=[], total_paginas=1, pagina_actual=1, buscar='', total_asesores=0, asesores_activos=0)

@asesores_admin_bp.route('/<int:id>/datos', methods=['GET'])
@admin_required
def obtener_datos_asesor(id):
    """Obtener datos de un asesor para edición"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT a.id_asesor, a.nombre, a.apellidos, a.correo
            FROM tbl_asesor a
            WHERE a.id_asesor = %s
        ''', (id,))
        asesor = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not asesor:
            return jsonify({'success': False, 'error': 'Asesor no encontrado'}), 404
        
        return jsonify({
            'success': True,
            'asesor': asesor
        })
        
    except Error as e:
        print(f"Error en obtener_datos_asesor: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@asesores_admin_bp.route('/<int:id>/editar', methods=['POST'])
@admin_required
def editar_asesor(id):
    """Editar un asesor existente"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form.to_dict()
        nombre = data.get('nombre', '').strip()
        apellidos = data.get('apellidos', '').strip()
        correo = data.get('correo', '').strip().lower()
        # especialidad y telefono eliminados
        # Validaciones
        if not nombre or not apellidos or not correo:
            return jsonify({'success': False, 'error': 'Los campos nombre, apellidos y correo son obligatorios'})
        if not validar_email(correo):
            return jsonify({'success': False, 'error': 'El formato del correo electrónico no es válido'})
        cursor.execute(
            'SELECT id_asesor FROM tbl_asesor WHERE correo = %s AND id_asesor != %s', 
            (correo, id)
        )
        asesor_existente = cursor.fetchone()
        if asesor_existente:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'error': 'Ya existe otro asesor con este correo electrónico'})
        cursor.execute('''
            UPDATE tbl_asesor 
            SET nombre = %s, apellidos = %s, correo = %s
            WHERE id_asesor = %s
        ''', (nombre, apellidos, correo, id))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({
            'success': True,
            'mensaje': 'Asesor actualizado exitosamente'
        })
    except Error as e:
        print(f"Error en editar_asesor: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@asesores_admin_bp.route('/<int:id>/eliminar', methods=['POST'])
@admin_required
def eliminar_asesor(id):
    """Eliminar un asesor del sistema"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verificar si el asesor existe
        cursor.execute('SELECT nombre, apellidos, id_usuario FROM tbl_asesor WHERE id_asesor = %s', (id,))
        asesor = cursor.fetchone()
        
        if not asesor:
            return jsonify({'success': False, 'error': 'Asesor no encontrado'}), 404
        
        # Verificar si tiene asesorías asociadas
        cursor.execute('SELECT COUNT(*) as count FROM tbl_asesoria WHERE id_asesor = %s', (id,))
        asesorias_count = cursor.fetchone()['count']
        
        if asesorias_count > 0:
            return jsonify({
                'success': False, 
                'error': f'No se puede eliminar el asesor porque tiene {asesorias_count} asesorías asociadas'
            })
        
        # Eliminar asesor
        cursor.execute('DELETE FROM tbl_asesor WHERE id_asesor = %s', (id,))
        
        # Si tiene usuario asociado, también eliminarlo
        if asesor['id_usuario']:
            cursor.execute('DELETE FROM tbl_usuario WHERE id_usuario = %s', (asesor['id_usuario'],))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': f'Asesor {asesor["nombre"]} {asesor["apellidos"]} eliminado exitosamente'
        })
        
    except Error as e:
        print(f"Error en eliminar_asesor: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@asesores_admin_bp.route('/<int:id>/toggle-status', methods=['POST'])
@admin_required
def toggle_asesor_status(id):
    """Cambiar estado de un asesor"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute('''
            SELECT u.correo_verificado, a.id_usuario, a.nombre, a.apellidos 
            FROM tbl_asesor a 
            LEFT JOIN tbl_usuario u ON a.id_usuario = u.id_usuario 
            WHERE a.id_asesor = %s
        ''', (id,))
        asesor = cursor.fetchone()
        
        if not asesor:
            return jsonify({'success': False, 'error': 'Asesor no encontrado'}), 404
        
        if not asesor['id_usuario']:
            return jsonify({'success': False, 'error': 'Asesor no tiene usuario asociado'}), 400
        
        nuevo_estado = 0 if asesor['correo_verificado'] == 1 else 1
        
        # Actualizar estado en usuarios
        cursor.execute(
            'UPDATE tbl_usuario SET correo_verificado = %s WHERE id_usuario = %s',
            (nuevo_estado, asesor['id_usuario'])
        )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        estado_texto = 'activado' if nuevo_estado == 1 else 'desactivado'
        
        return jsonify({
            'success': True,
            'nuevo_estado': 'Activo' if nuevo_estado == 1 else 'Inactivo',
            'mensaje': f'Asesor {asesor["nombre"]} {asesor["apellidos"]} {estado_texto} exitosamente'
        })
        
    except Error as e:
        print(f"Error en toggle_asesor_status: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@asesores_admin_bp.route('/crear', methods=['GET', 'POST'])
@admin_required
def crear_asesor():
    """Crear un nuevo asesor"""
    if request.method == 'POST':
        try:
            # Obtener datos del formulario
            nombre = request.form.get('nombre', '').strip()
            apellidos = request.form.get('apellidos', '').strip()
            correo = request.form.get('correo', '').strip().lower()
            password = request.form.get('password', '')
            confirm_password = request.form.get('confirm_password', '')
            
            # Validaciones
            if not nombre or not apellidos or not correo or not password:
                flash('Todos los campos obligatorios deben ser completados.', 'error')
                return render_template('admin/crear_asesor.html')
            
            if not validar_email(correo):
                flash('El formato del correo electrónico no es válido.', 'error')
                return render_template('admin/crear_asesor.html')
            
            if len(password) < 8:
                flash('La contraseña debe tener al menos 8 caracteres.', 'error')
                return render_template('admin/crear_asesor.html')
            
            if password != confirm_password:
                flash('Las contraseñas no coinciden.', 'error')
                return render_template('admin/crear_asesor.html')
            
            conn = get_db_connection()
            if not conn:
                flash('Error de conexión a la base de datos', 'error')
                return render_template('admin/crear_asesor.html')
            
            cursor = conn.cursor()
            
            # Verificar si el correo ya existe
            cursor.execute('SELECT id_asesor FROM tbl_asesor WHERE correo = %s', (correo,))
            asesor_existente = cursor.fetchone()
            
            if asesor_existente:
                flash('Ya existe un asesor con este correo electrónico.', 'error')
                cursor.close()
                conn.close()
                return render_template('admin/crear_asesor.html')
            
            # Crear el usuario primero
            password_hash = generate_password_hash(password)
            
            cursor.execute('''
                INSERT INTO tbl_usuario (nombres, apellidos, correo, contrasena, correo_verificado)
                VALUES (%s, %s, %s, %s, %s)
            ''', (nombre, apellidos, correo, password_hash, 1))
            
            usuario_id = cursor.lastrowid
            
            # Crear el asesor
            cursor.execute('''
                INSERT INTO tbl_asesor (id_usuario, nombre, apellidos, correo)
                VALUES (%s, %s, %s, %s)
            ''', (usuario_id, nombre, apellidos, correo))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            flash(f'Asesor {nombre} {apellidos} creado exitosamente.', 'success')
            return redirect(url_for('asesores_admin.listar_asesores'))
            
        except Error as e:
            print(f"Error en crear_asesor: {str(e)}")
            flash(f'Error al crear asesor: {str(e)}', 'error')
            return render_template('admin/crear_asesor.html')
    
    return render_template('admin/crear_asesor.html')
