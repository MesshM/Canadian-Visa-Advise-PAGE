from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from werkzeug.security import generate_password_hash
from functools import wraps
import sqlite3
import re
from datetime import datetime

usuarios_admin_bp = Blueprint('usuarios_admin', __name__)

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

def validar_email(email):
    """Validar formato de email"""
    patron = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(patron, email) is not None

@usuarios_admin_bp.route('/admin/usuarios')
@admin_required
def listar_usuarios():
    """Listar todos los usuarios del sistema"""
    try:
        conn = get_db_connection()
        
        # Obtener parámetros de filtro
        buscar = request.args.get('buscar', '')
        rol_filtro = request.args.get('rol', '')
        estado_filtro = request.args.get('estado', '')
        pagina = int(request.args.get('pagina', 1))
        por_pagina = 20
        
        # Construir consulta con filtros
        query = '''
            SELECT id_usuario, nombres, apellidos, correo, rol, estado, 
                   fecha_registro, ultimo_acceso
            FROM usuarios 
            WHERE 1=1
        '''
        params = []
        
        if buscar:
            query += ' AND (nombres LIKE ? OR apellidos LIKE ? OR correo LIKE ?)'
            params.extend([f'%{buscar}%', f'%{buscar}%', f'%{buscar}%'])
        
        if rol_filtro:
            query += ' AND rol = ?'
            params.append(rol_filtro)
        
        if estado_filtro:
            query += ' AND estado = ?'
            params.append(estado_filtro)
        
        # Contar total de usuarios
        count_query = query.replace('SELECT id_usuario, nombres, apellidos, correo, rol, estado, fecha_registro, ultimo_acceso', 'SELECT COUNT(*)')
        total_usuarios = conn.execute(count_query, params).fetchone()[0]
        
        # Agregar paginación
        query += ' ORDER BY fecha_registro DESC LIMIT ? OFFSET ?'
        params.extend([por_pagina, (pagina - 1) * por_pagina])
        
        usuarios = conn.execute(query, params).fetchall()
        
        conn.close()
        
        return render_template('admin/usuarios_admin.html',
                             usuarios=usuarios,
                             total_usuarios=total_usuarios,
                             pagina_actual=pagina,
                             total_paginas=(total_usuarios + por_pagina - 1) // por_pagina)
                             
    except Exception as e:
        flash(f'Error al cargar usuarios: {str(e)}', 'error')
        return render_template('admin/usuarios_admin.html', usuarios=[])

@usuarios_admin_bp.route('/admin/usuarios/crear', methods=['GET', 'POST'])
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
            enviar_credenciales = 'enviar_credenciales' in request.form
            
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
            
            # Verificar si el correo ya existe
            usuario_existente = conn.execute(
                'SELECT id_usuario FROM usuarios WHERE correo = ?', (correo,)
            ).fetchone()
            
            if usuario_existente:
                flash('Ya existe un usuario con este correo electrónico.', 'error')
                conn.close()
                return render_template('admin/crear_usuario.html')
            
            # Crear el usuario
            password_hash = generate_password_hash(password)
            fecha_registro = datetime.now()
            
            cursor = conn.execute('''
                INSERT INTO usuarios (nombres, apellidos, correo, celular, fecha_nacimiento, 
                                    rol, password_hash, estado, fecha_registro, correo_verificado)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (nombres, apellidos, correo, celular, fecha_nacimiento, rol, 
                  password_hash, 'Activo', fecha_registro, correo_verificado))
            
            usuario_id = cursor.lastrowid
            
            # Si es un asesor, crear registro en tabla asesores
            if rol == 'Asesor':
                conn.execute('''
                    INSERT INTO asesores (id_usuario, nombre, apellidos, correo, estado, fecha_registro)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (usuario_id, nombres, apellidos, correo, 'Activo', fecha_registro))
            
            conn.commit()
            conn.close()
            
            # TODO: Enviar credenciales por correo si está marcado
            if enviar_credenciales:
                # Implementar envío de correo
                pass
            
            flash(f'Usuario {nombres} {apellidos} creado exitosamente.', 'success')
            return redirect(url_for('usuarios_admin.listar_usuarios'))
            
        except Exception as e:
            flash(f'Error al crear usuario: {str(e)}', 'error')
            return render_template('admin/crear_usuario.html')
    
    return render_template('admin/crear_usuario.html')

@usuarios_admin_bp.route('/admin/usuarios/<int:id>/editar', methods=['GET', 'POST'])
@admin_required
def editar_usuario(id):
    """Editar un usuario existente"""
    try:
        conn = get_db_connection()
        
        if request.method == 'POST':
            # Obtener datos del formulario
            nombres = request.form.get('nombres', '').strip()
            apellidos = request.form.get('apellidos', '').strip()
            correo = request.form.get('correo', '').strip().lower()
            celular = request.form.get('celular', '').strip()
            fecha_nacimiento = request.form.get('fecha_nacimiento')
            rol = request.form.get('rol')
            estado = request.form.get('estado')
            
            # Validaciones
            if not nombres or not apellidos or not correo:
                flash('Los campos nombres, apellidos y correo son obligatorios.', 'error')
                return redirect(url_for('usuarios_admin.editar_usuario', id=id))
            
            if not validar_email(correo):
                flash('El formato del correo electrónico no es válido.', 'error')
                return redirect(url_for('usuarios_admin.editar_usuario', id=id))
            
            # Verificar si el correo ya existe (excluyendo el usuario actual)
            usuario_existente = conn.execute(
                'SELECT id_usuario FROM usuarios WHERE correo = ? AND id_usuario != ?', 
                (correo, id)
            ).fetchone()
            
            if usuario_existente:
                flash('Ya existe otro usuario con este correo electrónico.', 'error')
                return redirect(url_for('usuarios_admin.editar_usuario', id=id))
            
            # Actualizar usuario
            conn.execute('''
                UPDATE usuarios 
                SET nombres = ?, apellidos = ?, correo = ?, celular = ?, 
                    fecha_nacimiento = ?, rol = ?, estado = ?
                WHERE id_usuario = ?
            ''', (nombres, apellidos, correo, celular, fecha_nacimiento, 
                  rol, estado, id))
            
            conn.commit()
            conn.close()
            
            flash('Usuario actualizado exitosamente.', 'success')
            return redirect(url_for('usuarios_admin.listar_usuarios'))
        
        # GET - Mostrar formulario de edición
        usuario = conn.execute(
            'SELECT * FROM usuarios WHERE id_usuario = ?', (id,)
        ).fetchone()
        
        conn.close()
        
        if not usuario:
            flash('Usuario no encontrado.', 'error')
            return redirect(url_for('usuarios_admin.listar_usuarios'))
        
        return render_template('admin/editar_usuario.html', usuario=usuario)
        
    except Exception as e:
        flash(f'Error al editar usuario: {str(e)}', 'error')
        return redirect(url_for('usuarios_admin.listar_usuarios'))

@usuarios_admin_bp.route('/admin/usuarios/<int:id>/toggle-status', methods=['POST'])
@admin_required
def toggle_usuario_status(id):
    """Cambiar estado de un usuario (Activo/Inactivo)"""
    try:
        conn = get_db_connection()
        
        usuario = conn.execute(
            'SELECT estado FROM usuarios WHERE id_usuario = ?', (id,)
        ).fetchone()
        
        if not usuario:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        nuevo_estado = 'Inactivo' if usuario['estado'] == 'Activo' else 'Activo'
        
        conn.execute(
            'UPDATE usuarios SET estado = ? WHERE id_usuario = ?',
            (nuevo_estado, id)
        )
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'nuevo_estado': nuevo_estado,
            'mensaje': f'Usuario {nuevo_estado.lower()} exitosamente'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@usuarios_admin_bp.route('/admin/usuarios/<int:id>/eliminar', methods=['POST'])
@admin_required
def eliminar_usuario(id):
    """Eliminar un usuario (soft delete)"""
    try:
        conn = get_db_connection()
        
        # Verificar que el usuario existe
        usuario = conn.execute(
            'SELECT nombres, apellidos FROM usuarios WHERE id_usuario = ?', (id,)
        ).fetchone()
        
        if not usuario:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # Soft delete - cambiar estado a "Eliminado"
        conn.execute(
            'UPDATE usuarios SET estado = ?, fecha_eliminacion = ? WHERE id_usuario = ?',
            ('Eliminado', datetime.now(), id)
        )
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': f'Usuario {usuario["nombres"]} {usuario["apellidos"]} eliminado exitosamente'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@usuarios_admin_bp.route('/admin/usuarios/buscar')
@admin_required
def buscar_usuarios():
    """Buscar usuarios para autocompletado"""
    try:
        termino = request.args.get('q', '').strip()
        
        if len(termino) < 2:
            return jsonify([])
        
        conn = get_db_connection()
        
        usuarios = conn.execute('''
            SELECT id_usuario, nombres, apellidos, correo, rol
            FROM usuarios 
            WHERE (nombres LIKE ? OR apellidos LIKE ? OR correo LIKE ?)
            AND estado = 'Activo'
            LIMIT 10
        ''', (f'%{termino}%', f'%{termino}%', f'%{termino}%')).fetchall()
        
        conn.close()
        
        resultados = []
        for usuario in usuarios:
            resultados.append({
                'id': usuario['id_usuario'],
                'nombre': f"{usuario['nombres']} {usuario['apellidos']}",
                'correo': usuario['correo'],
                'rol': usuario['rol']
            })
        
        return jsonify(resultados)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
