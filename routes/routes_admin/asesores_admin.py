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
    """Listar todos los asesores del sistema"""
    try:
        conn = get_db_connection()
        if not conn:
            flash('Error de conexión a la base de datos', 'error')
            return render_template('admin/asesores_admin.html', asesores=[])
        
        cursor = conn.cursor(dictionary=True)
        
        # Obtener parámetros de filtro
        buscar = request.args.get('buscar', '').strip()
        estado_filtro = request.args.get('estado', '')
        pagina = int(request.args.get('pagina', 1))
        por_pagina = 20
        
        # Construir consulta con filtros
        query = '''
            SELECT a.id_asesor, a.nombre, a.apellidos, a.correo, a.especialidad,
                   u.correo_verificado,
                   COUNT(DISTINCT ase.codigo_asesoria) as total_asesorias,
                   COUNT(DISTINCT CASE WHEN ase.estado = 'Completada' THEN ase.codigo_asesoria END) as asesorias_completadas,
                   CASE WHEN u.correo_verificado = 1 THEN 'Activo' ELSE 'Inactivo' END as estado,
                   4.5 as calificacion
            FROM tbl_asesor a
            LEFT JOIN tbl_usuario u ON a.id_usuario = u.id_usuario
            LEFT JOIN tbl_asesoria ase ON a.id_asesor = ase.id_asesor
            WHERE 1=1
        '''
        params = []
        
        # Filtro de búsqueda por nombre
        if buscar:
            query += ' AND (a.nombre LIKE %s OR a.apellidos LIKE %s OR a.correo LIKE %s OR CONCAT(a.nombre, " ", a.apellidos) LIKE %s)'
            search_param = f'%{buscar}%'
            params.extend([search_param, search_param, search_param, search_param])
        
        # Filtro de estado
        if estado_filtro:
            if estado_filtro == 'Activo':
                query += ' AND u.correo_verificado = 1'
            else:
                query += ' AND u.correo_verificado = 0'
        
        # Contar total de asesores
        count_query = f"SELECT COUNT(DISTINCT a.id_asesor) as total FROM tbl_asesor a LEFT JOIN tbl_usuario u ON a.id_usuario = u.id_usuario WHERE 1=1"
        count_params = []
        
        if buscar:
            count_query += ' AND (a.nombre LIKE %s OR a.apellidos LIKE %s OR a.correo LIKE %s OR CONCAT(a.nombre, " ", a.apellidos) LIKE %s)'
            count_params.extend([search_param, search_param, search_param, search_param])
        
        if estado_filtro:
            if estado_filtro == 'Activo':
                count_query += ' AND u.correo_verificado = 1'
            else:
                count_query += ' AND u.correo_verificado = 0'
        
        cursor.execute(count_query, count_params)
        total_asesores = cursor.fetchone()['total']
        
        # Agregar agrupación y paginación
        query += ' GROUP BY a.id_asesor ORDER BY a.id_asesor DESC LIMIT %s OFFSET %s'
        params.extend([por_pagina, (pagina - 1) * por_pagina])
        
        cursor.execute(query, params)
        asesores = cursor.fetchall()
        
        # Obtener estadísticas generales
        cursor.execute('SELECT COUNT(*) as total FROM tbl_asesor')
        total_asesores_stat = cursor.fetchone()['total']
        
        cursor.execute('''
            SELECT COUNT(*) as total FROM tbl_asesor a 
            JOIN tbl_usuario u ON a.id_usuario = u.id_usuario 
            WHERE u.correo_verificado = 1
        ''')
        asesores_activos = cursor.fetchone()['total']
        
        # Asesorías del mes actual
        cursor.execute('''
            SELECT COUNT(*) as count FROM tbl_asesoria 
            WHERE MONTH(fecha_asesoria) = MONTH(CURDATE()) 
            AND YEAR(fecha_asesoria) = YEAR(CURDATE())
        ''')
        asesorias_mes = cursor.fetchone()['count']
        
        cursor.close()
        conn.close()
        
        total_paginas = (total_asesores + por_pagina - 1) // por_pagina if total_asesores > 0 else 1
        
        return render_template('admin/asesores_admin.html',
                             asesores=asesores,
                             total_asesores=total_asesores_stat,
                             asesores_activos=asesores_activos,
                             asesorias_mes=asesorias_mes,
                             promedio_calificacion="4.8",
                             pagina_actual=pagina,
                             total_paginas=total_paginas)
                             
    except Error as e:
        print(f"Error en listar_asesores: {str(e)}")
        flash(f'Error al cargar asesores: {str(e)}', 'error')
        return render_template('admin/asesores_admin.html', asesores=[])

@asesores_admin_bp.route('/<int:id>/datos', methods=['GET'])
@admin_required
def obtener_datos_asesor(id):
    """Obtener datos de un asesor para edición"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Obtener datos del asesor
        cursor.execute('''
            SELECT a.id_asesor, a.nombre, a.apellidos, a.correo, a.especialidad,
                   a.telefono
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
        
        # Obtener datos JSON del request
        if request.is_json:
            data = request.get_json()
            nombre = data.get('nombre', '').strip()
            apellidos = data.get('apellidos', '').strip()
            correo = data.get('correo', '').strip().lower()
            especialidad = data.get('especialidad', '').strip()
            telefono = data.get('telefono', '').strip()
        else:
            # Fallback para form data
            nombre = request.form.get('nombre', '').strip()
            apellidos = request.form.get('apellidos', '').strip()
            correo = request.form.get('correo', '').strip().lower()
            especialidad = request.form.get('especialidad', '').strip()
            telefono = request.form.get('telefono', '').strip()
        
        # Validaciones
        if not nombre or not apellidos or not correo:
            return jsonify({'success': False, 'error': 'Los campos nombre, apellidos y correo son obligatorios'})
        
        if not validar_email(correo):
            return jsonify({'success': False, 'error': 'El formato del correo electrónico no es válido'})
        
        # Verificar si el correo ya existe (excluyendo el asesor actual)
        cursor.execute(
            'SELECT id_asesor FROM tbl_asesor WHERE correo = %s AND id_asesor != %s', 
            (correo, id)
        )
        asesor_existente = cursor.fetchone()
        
        if asesor_existente:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'error': 'Ya existe otro asesor con este correo electrónico'})
        
        # Actualizar asesor
        cursor.execute('''
            UPDATE tbl_asesor 
            SET nombre = %s, apellidos = %s, correo = %s, especialidad = %s, 
                telefono = %s
            WHERE id_asesor = %s
        ''', (nombre, apellidos, correo, especialidad, telefono, id))
        
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

@asesores_admin_bp.route('/<int:id>/toggle-status', methods=['POST'])
@admin_required
def toggle_asesor_status(id):
    """Cambiar estado de un asesor"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute('''
            SELECT u.correo_verificado, a.id_usuario, a.nombre, a.apellidos 
            FROM tbl_asesor a 
            JOIN tbl_usuario u ON a.id_usuario = u.id_usuario 
            WHERE a.id_asesor = %s
        ''', (id,))
        asesor = cursor.fetchone()
        
        if not asesor:
            return jsonify({'success': False, 'error': 'Asesor no encontrado'}), 404
        
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

@asesores_admin_bp.route('/<int:id>/detalles')
@admin_required
def ver_detalles_asesor(id):
    """Ver detalles completos de un asesor"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'error': 'Error de conexión a la base de datos'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Obtener información del asesor
        cursor.execute('''
            SELECT a.*, u.correo_verificado, u.fecha_nacimiento,
                   CASE WHEN u.correo_verificado = 1 THEN 'Activo' ELSE 'Inactivo' END as estado
            FROM tbl_asesor a
            JOIN tbl_usuario u ON a.id_usuario = u.id_usuario
            WHERE a.id_asesor = %s
        ''', (id,))
        asesor = cursor.fetchone()
        
        if not asesor:
            return jsonify({'success': False, 'error': 'Asesor no encontrado'}), 404
        
        # Obtener asesorías recientes
        cursor.execute('''
            SELECT codigo_asesoria, tipo_asesoria, fecha_asesoria, estado,
                   (SELECT CONCAT(u.nombres, ' ', u.apellidos) 
                    FROM tbl_usuario u 
                    JOIN tbl_solicitante s ON u.id_usuario = s.id_usuario 
                    WHERE s.id_solicitante = ase.id_solicitante) as cliente
            FROM tbl_asesoria ase
            WHERE ase.id_asesor = %s
            ORDER BY fecha_asesoria DESC
            LIMIT 10
        ''', (id,))
        asesorias = cursor.fetchall()
        
        # Obtener estadísticas
        cursor.execute('''
            SELECT 
                COUNT(*) as total_asesorias,
                COUNT(CASE WHEN estado = 'Completada' THEN 1 END) as asesorias_completadas,
                COUNT(CASE WHEN estado = 'Pendiente' THEN 1 END) as asesorias_pendientes
            FROM tbl_asesoria WHERE id_asesor = %s
        ''', (id,))
        stats_result = cursor.fetchone()
        
        stats = {
            'total_asesorias': stats_result['total_asesorias'],
            'asesorias_completadas': stats_result['asesorias_completadas'],
            'asesorias_pendientes': stats_result['asesorias_pendientes'],
            'calificacion_promedio': 4.5  # Placeholder
        }
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'asesor': dict(asesor),
            'asesorias': [dict(a) for a in asesorias],
            'estadisticas': stats
        })
        
    except Error as e:
        print(f"Error en ver_detalles_asesor: {str(e)}")
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
            especialidad = request.form.get('especialidad', '').strip()
            telefono = request.form.get('telefono', '').strip()
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
                INSERT INTO tbl_asesor (id_usuario, nombre, apellidos, correo, especialidad, telefono, password)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            ''', (usuario_id, nombre, apellidos, correo, especialidad, telefono, password_hash))
            
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

@asesores_admin_bp.route('/buscar')
@admin_required
def buscar_asesores():
    """Buscar asesores para autocompletado"""
    try:
        termino = request.args.get('q', '').strip()
        
        if len(termino) < 2:
            return jsonify([])
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Error de conexión'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute('''
            SELECT a.id_asesor, a.nombre, a.apellidos, a.correo, a.especialidad
            FROM tbl_asesor a
            JOIN tbl_usuario u ON a.id_usuario = u.id_usuario
            WHERE (a.nombre LIKE %s OR a.apellidos LIKE %s OR a.correo LIKE %s OR CONCAT(a.nombre, " ", a.apellidos) LIKE %s)
            AND u.correo_verificado = 1
            LIMIT 10
        ''', (f'%{termino}%', f'%{termino}%', f'%{termino}%', f'%{termino}%'))
        
        asesores = cursor.fetchall()
        cursor.close()
        conn.close()
        
        resultados = []
        for asesor in asesores:
            resultados.append({
                'id': asesor['id_asesor'],
                'nombre': f"{asesor['nombre']} {asesor['apellidos']}",
                'correo': asesor['correo'],
                'especialidad': asesor['especialidad']
            })
        
        return jsonify(resultados)
        
    except Error as e:
        print(f"Error en buscar_asesores: {str(e)}")
        return jsonify({'error': str(e)}), 500
