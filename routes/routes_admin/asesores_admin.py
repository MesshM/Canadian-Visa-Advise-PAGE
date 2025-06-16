from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from werkzeug.security import generate_password_hash
from functools import wraps
import sqlite3
from datetime import datetime

asesores_admin_bp = Blueprint('asesores_admin', __name__)

def admin_required(f):
    """Decorador para verificar que el usuario sea administrador"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or session.get('user_role') != 'Administrador':
            flash('Acceso denegado. Se requieren permisos de administrador.', 'error')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

def get_db_connection():
    """Obtener conexión a la base de datos"""
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

@asesores_admin_bp.route('/admin/asesores')
@admin_required
def listar_asesores():
    """Listar todos los asesores del sistema"""
    try:
        conn = get_db_connection()
        
        # Obtener parámetros de filtro
        buscar = request.args.get('buscar', '')
        estado_filtro = request.args.get('estado', '')
        especialidad_filtro = request.args.get('especialidad', '')
        
        # Construir consulta con filtros
        query = '''
            SELECT a.id_asesor, a.nombre, a.apellidos, a.correo, a.especialidad,
                   a.estado, a.calificacion, a.fecha_registro,
                   COUNT(DISTINCT ac.id_usuario) as clientes_asignados,
                   COUNT(DISTINCT ase.codigo_asesoria) as total_asesorias
            FROM asesores a
            LEFT JOIN asignaciones_clientes ac ON a.id_asesor = ac.id_asesor
            LEFT JOIN asesorias ase ON a.id_asesor = ase.asesor_asignado
            WHERE 1=1
        '''
        params = []
        
        if buscar:
            query += ' AND (a.nombre LIKE ? OR a.apellidos LIKE ? OR a.correo LIKE ?)'
            params.extend([f'%{buscar}%', f'%{buscar}%', f'%{buscar}%'])
        
        if estado_filtro:
            query += ' AND a.estado = ?'
            params.append(estado_filtro)
        
        if especialidad_filtro:
            query += ' AND a.especialidad = ?'
            params.append(especialidad_filtro)
        
        query += ' GROUP BY a.id_asesor ORDER BY a.fecha_registro DESC'
        
        asesores = conn.execute(query, params).fetchall()
        
        # Obtener estadísticas
        total_asesores = len(asesores)
        asesores_activos = len([a for a in asesores if a['estado'] == 'Activo'])
        
        # Asesorías del mes actual
        inicio_mes = datetime.now().replace(day=1)
        asesorias_mes = conn.execute(
            'SELECT COUNT(*) as count FROM asesorias WHERE fecha_asesoria >= ?',
            (inicio_mes,)
        ).fetchone()['count']
        
        # Promedio de calificación
        promedio_calificacion = conn.execute(
            'SELECT AVG(calificacion) as promedio FROM asesores WHERE calificacion IS NOT NULL'
        ).fetchone()['promedio']
        
        conn.close()
        
        return render_template('admin/asesores_admin.html',
                             asesores=asesores,
                             total_asesores=total_asesores,
                             asesores_activos=asesores_activos,
                             asesorias_mes=asesorias_mes,
                             promedio_calificacion=f"{promedio_calificacion:.1f}" if promedio_calificacion else "N/A")
                             
    except Exception as e:
        flash(f'Error al cargar asesores: {str(e)}', 'error')
        return render_template('admin/asesores_admin.html', asesores=[])

@asesores_admin_bp.route('/admin/asesores/crear', methods=['GET', 'POST'])
@admin_required
def crear_asesor():
    """Crear un nuevo asesor"""
    if request.method == 'POST':
        try:
            # Obtener datos del formulario
            nombre = request.form.get('nombre', '').strip()
            apellidos = request.form.get('apellidos', '').strip()
            correo = request.form.get('correo', '').strip().lower()
            telefono = request.form.get('telefono', '').strip()
            especialidad = request.form.get('especialidad', '')
            experiencia = request.form.get('experiencia', 0)
            licencia = request.form.get('licencia', '').strip()
            idiomas = request.form.get('idiomas', '').strip()
            password = request.form.get('password', '')
            confirm_password = request.form.get('confirm_password', '')
            hora_inicio = request.form.get('hora_inicio', '08:00')
            hora_fin = request.form.get('hora_fin', '17:00')
            biografia = request.form.get('biografia', '').strip()
            activo = 'activo' in request.form
            notificaciones = 'notificaciones' in request.form
            enviar_credenciales = 'enviar_credenciales' in request.form
            
            # Validaciones
            if not nombre or not apellidos or not correo or not especialidad or not password:
                flash('Todos los campos obligatorios deben ser completados.', 'error')
                return render_template('admin/crear_asesor.html')
            
            if len(password) < 8:
                flash('La contraseña debe tener al menos 8 caracteres.', 'error')
                return render_template('admin/crear_asesor.html')
            
            if password != confirm_password:
                flash('Las contraseñas no coinciden.', 'error')
                return render_template('admin/crear_asesor.html')
            
            conn = get_db_connection()
            
            # Verificar si el correo ya existe
            usuario_existente = conn.execute(
                'SELECT id_usuario FROM usuarios WHERE correo = ?', (correo,)
            ).fetchone()
            
            if usuario_existente:
                flash('Ya existe un usuario con este correo electrónico.', 'error')
                conn.close()
                return render_template('admin/crear_asesor.html')
            
            # Crear usuario primero
            password_hash = generate_password_hash(password)
            fecha_registro = datetime.now()
            
            cursor = conn.execute('''
                INSERT INTO usuarios (nombres, apellidos, correo, celular, rol, 
                                    password_hash, estado, fecha_registro, correo_verificado)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (nombre, apellidos, correo, telefono, 'Asesor', 
                  password_hash, 'Activo' if activo else 'Inactivo', fecha_registro, True))
            
            usuario_id = cursor.lastrowid
            
            # Crear registro de asesor
            conn.execute('''
                INSERT INTO asesores (id_usuario, nombre, apellidos, correo, telefono,
                                    especialidad, experiencia, licencia, idiomas,
                                    hora_inicio, hora_fin, biografia, estado, 
                                    notificaciones_email, fecha_registro)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (usuario_id, nombre, apellidos, correo, telefono, especialidad,
                  experiencia, licencia, idiomas, hora_inicio, hora_fin, biografia,
                  'Activo' if activo else 'Inactivo', notificaciones, fecha_registro))
            
            conn.commit()
            conn.close()
            
            # TODO: Enviar credenciales por correo si está marcado
            if enviar_credenciales:
                # Implementar envío de correo
                pass
            
            flash(f'Asesor {nombre} {apellidos} creado exitosamente.', 'success')
            return redirect(url_for('asesores_admin.listar_asesores'))
            
        except Exception as e:
            flash(f'Error al crear asesor: {str(e)}', 'error')
            return render_template('admin/crear_asesor.html')
    
    return render_template('admin/crear_asesor.html')

@asesores_admin_bp.route('/admin/asesores/<int:id>/editar', methods=['GET', 'POST'])
@admin_required
def editar_asesor(id):
    """Editar un asesor existente"""
    try:
        conn = get_db_connection()
        
        if request.method == 'POST':
            # Obtener datos del formulario
            nombre = request.form.get('nombre', '').strip()
            apellidos = request.form.get('apellidos', '').strip()
            correo = request.form.get('correo', '').strip().lower()
            telefono = request.form.get('telefono', '').strip()
            especialidad = request.form.get('especialidad', '')
            experiencia = request.form.get('experiencia', 0)
            licencia = request.form.get('licencia', '').strip()
            idiomas = request.form.get('idiomas', '').strip()
            hora_inicio = request.form.get('hora_inicio', '08:00')
            hora_fin = request.form.get('hora_fin', '17:00')
            biografia = request.form.get('biografia', '').strip()
            estado = request.form.get('estado', 'Activo')
            notificaciones = 'notificaciones' in request.form
            
            # Actualizar asesor
            conn.execute('''
                UPDATE asesores 
                SET nombre = ?, apellidos = ?, correo = ?, telefono = ?,
                    especialidad = ?, experiencia = ?, licencia = ?, idiomas = ?,
                    hora_inicio = ?, hora_fin = ?, biografia = ?, estado = ?,
                    notificaciones_email = ?
                WHERE id_asesor = ?
            ''', (nombre, apellidos, correo, telefono, especialidad, experiencia,
                  licencia, idiomas, hora_inicio, hora_fin, biografia, estado,
                  notificaciones, id))
            
            # Actualizar también en tabla usuarios
            asesor = conn.execute(
                'SELECT id_usuario FROM asesores WHERE id_asesor = ?', (id,)
            ).fetchone()
            
            if asesor:
                conn.execute('''
                    UPDATE usuarios 
                    SET nombres = ?, apellidos = ?, correo = ?, celular = ?, estado = ?
                    WHERE id_usuario = ?
                ''', (nombre, apellidos, correo, telefono, estado, asesor['id_usuario']))
            
            conn.commit()
            conn.close()
            
            flash('Asesor actualizado exitosamente.', 'success')
            return redirect(url_for('asesores_admin.listar_asesores'))
        
        # GET - Mostrar formulario de edición
        asesor = conn.execute(
            'SELECT * FROM asesores WHERE id_asesor = ?', (id,)
        ).fetchone()
        
        conn.close()
        
        if not asesor:
            flash('Asesor no encontrado.', 'error')
            return redirect(url_for('asesores_admin.listar_asesores'))
        
        return render_template('admin/editar_asesor.html', asesor=asesor)
        
    except Exception as e:
        flash(f'Error al editar asesor: {str(e)}', 'error')
        return redirect(url_for('asesores_admin.listar_asesores'))

@asesores_admin_bp.route('/admin/asesores/<int:id>/toggle-status', methods=['POST'])
@admin_required
def toggle_asesor_status(id):
    """Cambiar estado de un asesor"""
    try:
        conn = get_db_connection()
        
        asesor = conn.execute(
            'SELECT estado, id_usuario FROM asesores WHERE id_asesor = ?', (id,)
        ).fetchone()
        
        if not asesor:
            return jsonify({'error': 'Asesor no encontrado'}), 404
        
        nuevo_estado = 'Inactivo' if asesor['estado'] == 'Activo' else 'Activo'
        
        # Actualizar estado en asesores
        conn.execute(
            'UPDATE asesores SET estado = ? WHERE id_asesor = ?',
            (nuevo_estado, id)
        )
        
        # Actualizar estado en usuarios
        conn.execute(
            'UPDATE usuarios SET estado = ? WHERE id_usuario = ?',
            (nuevo_estado, asesor['id_usuario'])
        )
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'nuevo_estado': nuevo_estado,
            'mensaje': f'Asesor {nuevo_estado.lower()} exitosamente'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@asesores_admin_bp.route('/admin/asesores/<int:id>/detalles')
@admin_required
def ver_detalles_asesor(id):
    """Ver detalles completos de un asesor"""
    try:
        conn = get_db_connection()
        
        # Obtener información del asesor
        asesor = conn.execute('''
            SELECT a.*, u.fecha_registro, u.ultimo_acceso
            FROM asesores a
            JOIN usuarios u ON a.id_usuario = u.id_usuario
            WHERE a.id_asesor = ?
        ''', (id,)).fetchone()
        
        if not asesor:
            flash('Asesor no encontrado.', 'error')
            return redirect(url_for('asesores_admin.listar_asesores'))
        
        # Obtener clientes asignados
        clientes = conn.execute('''
            SELECT u.id_usuario, u.nombres, u.apellidos, u.correo, ac.fecha_asignacion
            FROM asignaciones_clientes ac
            JOIN usuarios u ON ac.id_usuario = u.id_usuario
            WHERE ac.id_asesor = ?
            ORDER BY ac.fecha_asignacion DESC
        ''', (id,)).fetchall()
        
        # Obtener asesorías
        asesorias = conn.execute('''
            SELECT codigo_asesoria, tipo_asesoria, fecha_asesoria, estado,
                   (SELECT nombres || ' ' || apellidos FROM usuarios WHERE id_usuario = asesorias.id_usuario) as cliente
            FROM asesorias
            WHERE asesor_asignado = ?
            ORDER BY fecha_asesoria DESC
            LIMIT 10
        ''', (id,)).fetchall()
        
        # Obtener estadísticas
        stats = {
            'total_clientes': len(clientes),
            'total_asesorias': conn.execute('SELECT COUNT(*) as count FROM asesorias WHERE asesor_asignado = ?', (id,)).fetchone()['count'],
            'asesorias_completadas': conn.execute('SELECT COUNT(*) as count FROM asesorias WHERE asesor_asignado = ? AND estado = "Completada"', (id,)).fetchone()['count'],
            'calificacion_promedio': asesor['calificacion'] or 0
        }
        
        conn.close()
        
        return jsonify({
            'asesor': dict(asesor),
            'clientes': [dict(c) for c in clientes],
            'asesorias': [dict(a) for a in asesorias],
            'estadisticas': stats
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@asesores_admin_bp.route('/admin/asesores/disponibles')
@admin_required
def obtener_asesores_disponibles():
    """Obtener lista de asesores disponibles para asignaciones"""
    try:
        especialidad = request.args.get('especialidad', '')
        
        conn = get_db_connection()
        
        query = '''
            SELECT id_asesor, nombre, apellidos, especialidad, 
                   COUNT(ac.id_usuario) as clientes_asignados
            FROM asesores a
            LEFT JOIN asignaciones_clientes ac ON a.id_asesor = ac.id_asesor
            WHERE a.estado = 'Activo'
        '''
        params = []
        
        if especialidad:
            query += ' AND a.especialidad = ?'
            params.append(especialidad)
        
        query += ' GROUP BY a.id_asesor ORDER BY clientes_asignados ASC, a.nombre ASC'
        
        asesores = conn.execute(query, params).fetchall()
        conn.close()
        
        return jsonify([{
            'id': a['id_asesor'],
            'nombre': f"{a['nombre']} {a['apellidos']}",
            'especialidad': a['especialidad'],
            'clientes_asignados': a['clientes_asignados']
        } for a in asesores])
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
