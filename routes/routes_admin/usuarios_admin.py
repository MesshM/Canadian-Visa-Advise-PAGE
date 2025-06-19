from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from werkzeug.security import generate_password_hash
from functools import wraps
import mysql.connector
from mysql.connector import Error
import re
from datetime import datetime
from config.database import create_connection

usuarios_admin_bp = Blueprint('usuarios_admin', __name__, url_prefix='/admin/usuarios')

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

def actualizar_ultimo_acceso(user_id):
    """Actualizar la fecha de último acceso de un usuario"""
    try:
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            cursor.execute(
                'UPDATE tbl_usuario SET ultimo_acceso = NOW() WHERE id_usuario = %s',
                (user_id,)
            )
            conn.commit()
            cursor.close()
            conn.close()
            return True
    except Error as e:
        print(f"Error al actualizar último acceso: {str(e)}")
    return False

@usuarios_admin_bp.route('/')
@admin_required
def listar_usuarios():
    """Listar todos los usuarios del sistema"""
    try:
        conn = get_db_connection()
        if not conn:
            flash('Error de conexión a la base de datos', 'error')
            return render_template('admin/usuarios_admin.html', usuarios=[])
        
        cursor = conn.cursor(dictionary=True)
        
        # Obtener parámetros de filtro
        buscar = request.args.get('buscar', '').strip()
        pagina = int(request.args.get('pagina', 1))
        por_pagina = 20
        
        # Construir consulta con filtros
        query = '''
            SELECT u.id_usuario, u.nombres, u.apellidos, u.correo, u.celular,
                   u.fecha_nacimiento, u.correo_verificado,
                   u.fecha_nacimiento as fecha_registro, u.ultimo_acceso
            FROM tbl_usuario u
            WHERE 1=1
        '''
        params = []
        
        # Filtro de búsqueda por nombre
        if buscar:
            query += ' AND (u.nombres LIKE %s OR u.apellidos LIKE %s OR u.correo LIKE %s OR CONCAT(u.nombres, " ", u.apellidos) LIKE %s)'
            search_param = f'%{buscar}%'
            params.extend([search_param, search_param, search_param, search_param])
        
        # Contar total de usuarios
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as subquery"
        cursor.execute(count_query, params)
        total_usuarios = cursor.fetchone()['total']
        
        # Agregar paginación
        query += ' ORDER BY u.id_usuario DESC LIMIT %s OFFSET %s'
        params.extend([por_pagina, (pagina - 1) * por_pagina])
        
        cursor.execute(query, params)
        usuarios = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        total_paginas = (total_usuarios + por_pagina - 1) // por_pagina if total_usuarios > 0 else 1
        
        return render_template('admin/usuarios_admin.html',
                             usuarios=usuarios,
                             total_usuarios=total_usuarios,
                             pagina_actual=pagina,
                             total_paginas=total_paginas)
                             
    except Error as e:
        print(f"Error en listar_usuarios: {str(e)}")
        flash(f'Error al cargar usuarios: {str(e)}', 'error')
        return render_template('admin/usuarios_admin.html', usuarios=[])

@usuarios_admin_bp.route('/crear', methods=['GET', 'POST'])
@admin_required
def crear_usuario():
    """Crear un nuevo usuario"""
    if request.method == 'POST':
        try:
            # Obtener datos del formulario
            nombres = request.form.get('nombres', '').strip()
            apellidos = request.form.get('apellidos', '').strip()
            correo = request.form.get('correo', '').strip().lower()
            celular = request.form.get('celular', '').strip()
            fecha_nacimiento = request.form.get('fecha_nacimiento')
            rol = request.form.get('rol', 'Cliente')
            password = request.form.get('password', '')
            confirm_password = request.form.get('confirm_password', '')
            correo_verificado = 'correo_verificado' in request.form
            
            # Validaciones
            if not nombres or not apellidos or not correo or not password:
                flash('Todos los campos obligatorios deben ser completados.', 'error')
                return render_template('admin/crear_usuario.html')
            
            if not validar_email(correo):
                flash('El formato del correo electrónico no es válido.', 'error')
                return render_template('admin/crear_usuario.html')
            
            if len(password) < 8:
                flash('La contraseña debe tener al menos 8 caracteres.', 'error')
                return render_template('admin/crear_usuario.html')
            
            if password != confirm_password:
                flash('Las contraseñas no coinciden.', 'error')
                return render_template('admin/crear_usuario.html')
            
            conn = get_db_connection()
            if not conn:
                flash('Error de conexión a la base de datos', 'error')
                return render_template('admin/crear_usuario.html')
            
            cursor = conn.cursor()
            
            # Verificar si el correo ya existe
            cursor.execute('SELECT id_usuario FROM tbl_usuario WHERE correo = %s', (correo,))
            usuario_existente = cursor.fetchone()
            
            if usuario_existente:
                flash('Ya existe un usuario con este correo electrónico.', 'error')
                cursor.close()
                conn.close()
                return render_template('admin/crear_usuario.html')
            
            # Crear el usuario
            password_hash = generate_password_hash(password)
            
            cursor.execute('''
                INSERT INTO tbl_usuario (nombres, apellidos, correo, celular, fecha_nacimiento, 
                                       contrasena, correo_verificado)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            ''', (nombres, apellidos, correo, celular, fecha_nacimiento, 
                  password_hash, correo_verificado))
            
            usuario_id = cursor.lastrowid
            
            # Crear registro específico según el rol
            if rol == 'Asesor':
                cursor.execute('''
                    INSERT INTO tbl_asesor (id_usuario, nombre, apellidos, correo, password)
                    VALUES (%s, %s, %s, %s, %s)
                ''', (usuario_id, nombres, apellidos, correo, password_hash))
            elif rol == 'Administrador':
                cursor.execute('''
                    INSERT INTO tbl_administrador (id_usuario, nombre, apellidos, correo, password)
                    VALUES (%s, %s, %s, %s, %s)
                ''', (usuario_id, nombres, apellidos, correo, password_hash))
            else:  # Cliente
                cursor.execute('''
                    INSERT INTO tbl_solicitante (id_usuario)
                    VALUES (%s)
                ''', (usuario_id,))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            flash(f'Usuario {nombres} {apellidos} creado exitosamente.', 'success')
            return redirect(url_for('usuarios_admin.listar_usuarios'))
            
        except Error as e:
            print(f"Error en crear_usuario: {str(e)}")
            flash(f'Error al crear usuario: {str(e)}', 'error')
            return render_template('admin/crear_usuario.html')
    
    return render_template('admin/crear_usuario.html')

@usuarios_admin_bp.route('/<int:id>/datos', methods=['GET'])
@admin_required
def obtener_datos_usuario(id):
    """Obtener datos de un usuario para edición"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Obtener datos del usuario
        cursor.execute('''
            SELECT u.id_usuario, u.nombres, u.apellidos, u.correo, u.celular,
                   u.fecha_nacimiento
            FROM tbl_usuario u
            WHERE u.id_usuario = %s
        ''', (id,))
        
        usuario = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not usuario:
            return jsonify({'success': False, 'error': 'Usuario no encontrado'}), 404
        
        return jsonify({
            'success': True,
            'usuario': usuario
        })
        
    except Error as e:
        print(f"Error en obtener_datos_usuario: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@usuarios_admin_bp.route('/<int:id>/editar', methods=['POST'])
@admin_required
def editar_usuario(id):
    """Editar un usuario existente"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Obtener datos JSON del request
        if request.is_json:
            data = request.get_json()
            nombres = data.get('nombres', '').strip()
            apellidos = data.get('apellidos', '').strip()
            correo = data.get('correo', '').strip().lower()
            celular = data.get('celular', '').strip()
            fecha_nacimiento = data.get('fecha_nacimiento')
        else:
            # Fallback para form data
            nombres = request.form.get('nombres', '').strip()
            apellidos = request.form.get('apellidos', '').strip()
            correo = request.form.get('correo', '').strip().lower()
            celular = request.form.get('celular', '').strip()
            fecha_nacimiento = request.form.get('fecha_nacimiento')
        
        # Validaciones
        if not nombres or not apellidos or not correo:
            return jsonify({'success': False, 'error': 'Los campos nombres, apellidos y correo son obligatorios'})
        
        if not validar_email(correo):
            return jsonify({'success': False, 'error': 'El formato del correo electrónico no es válido'})
        
        # Verificar si el correo ya existe (excluyendo el usuario actual)
        cursor.execute(
            'SELECT id_usuario FROM tbl_usuario WHERE correo = %s AND id_usuario != %s', 
            (correo, id)
        )
        usuario_existente = cursor.fetchone()
        
        if usuario_existente:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'error': 'Ya existe otro usuario con este correo electrónico'})
        
        # Actualizar usuario
        cursor.execute('''
            UPDATE tbl_usuario 
            SET nombres = %s, apellidos = %s, correo = %s, celular = %s, 
                fecha_nacimiento = %s
            WHERE id_usuario = %s
        ''', (nombres, apellidos, correo, celular, fecha_nacimiento, id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': 'Usuario actualizado exitosamente'
        })
        
    except Error as e:
        print(f"Error en editar_usuario: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@usuarios_admin_bp.route('/<int:id>/eliminar', methods=['DELETE'])
@admin_required
def eliminar_usuario(id):
    """Eliminar un usuario permanentemente de la base de datos"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verificar que el usuario existe
        cursor.execute(
            'SELECT nombres, apellidos FROM tbl_usuario WHERE id_usuario = %s', (id,)
        )
        usuario = cursor.fetchone()
        
        if not usuario:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'error': 'Usuario no encontrado'}), 404
        
        # Eliminar de las tablas de roles primero (por las foreign keys)
        cursor.execute('DELETE FROM tbl_administrador WHERE id_usuario = %s', (id,))
        cursor.execute('DELETE FROM tbl_asesor WHERE id_usuario = %s', (id,))
        cursor.execute('DELETE FROM tbl_solicitante WHERE id_usuario = %s', (id,))
        
        # Eliminar el usuario principal
        cursor.execute('DELETE FROM tbl_usuario WHERE id_usuario = %s', (id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': f'Usuario {usuario["nombres"]} {usuario["apellidos"]} eliminado permanentemente'
        })
        
    except Error as e:
        print(f"Error en eliminar_usuario: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@usuarios_admin_bp.route('/buscar')
@admin_required
def buscar_usuarios():
    """Buscar usuarios para autocompletado"""
    try:
        termino = request.args.get('q', '').strip()
        
        if len(termino) < 2:
            return jsonify([])
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute('''
            SELECT u.id_usuario, u.nombres, u.apellidos, u.correo
            FROM tbl_usuario u
            WHERE (u.nombres LIKE %s OR u.apellidos LIKE %s OR u.correo LIKE %s OR CONCAT(u.nombres, " ", u.apellidos) LIKE %s)
            AND u.correo_verificado = 1
            LIMIT 10
        ''', (f'%{termino}%', f'%{termino}%', f'%{termino}%', f'%{termino}%'))
        
        usuarios = cursor.fetchall()
        cursor.close()
        conn.close()
        
        resultados = []
        for usuario in usuarios:
            resultados.append({
                'id': usuario['id_usuario'],
                'nombre': f"{usuario['nombres']} {usuario['apellidos']}",
                'correo': usuario['correo']
            })
        
        return jsonify(resultados)
        
    except Error as e:
        print(f"Error en buscar_usuarios: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Función para registrar el inicio de sesión de un usuario
def registrar_inicio_sesion(user_id):
    """Registra la fecha y hora del inicio de sesión de un usuario"""
    try:
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            cursor.execute(
                'UPDATE tbl_usuario SET ultimo_acceso = NOW() WHERE id_usuario = %s',
                (user_id,)
            )
            conn.commit()
            cursor.close()
            conn.close()
            return True
    except Error as e:
        print(f"Error al registrar inicio de sesión: {str(e)}")
    return False
