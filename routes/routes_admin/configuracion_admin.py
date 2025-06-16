from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
import sqlite3
import json
from datetime import datetime
import os

# Crear el blueprint
configuracion_admin_bp = Blueprint('configuracion_admin', __name__, url_prefix='/admin/configuracion')

def verificar_admin():
    """Verificar si el usuario es administrador"""
    if 'user_id' not in session:
        return False
    if session.get('user_role') != 'Administrador':
        return False
    return True

def obtener_conexion():
    """Obtener conexión a la base de datos"""
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

@configuracion_admin_bp.route('/')
def configuracion_general():
    """Panel principal de configuración"""
    if not verificar_admin():
        flash('Acceso denegado. Se requieren permisos de administrador.', 'error')
        return redirect(url_for('auth.login'))
    
    try:
        conn = obtener_conexion()
        cursor = conn.cursor()
        
        # Obtener configuraciones actuales
        cursor.execute('''
            SELECT * FROM configuraciones 
            ORDER BY categoria, nombre
        ''')
        configuraciones = cursor.fetchall()
        
        # Organizar por categorías
        config_por_categoria = {}
        for config in configuraciones:
            categoria = config['categoria']
            if categoria not in config_por_categoria:
                config_por_categoria[categoria] = []
            config_por_categoria[categoria].append(config)
        
        conn.close()
        
        return render_template('admin/configuracion_admin.html', 
                             configuraciones=config_por_categoria)
    
    except Exception as e:
        flash(f'Error al cargar configuraciones: {str(e)}', 'error')
        return redirect(url_for('panel_admin.index_admin'))

@configuracion_admin_bp.route('/actualizar', methods=['POST'])
def actualizar_configuracion():
    """Actualizar configuraciones del sistema"""
    if not verificar_admin():
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403
    
    try:
        data = request.get_json()
        configuraciones = data.get('configuraciones', {})
        
        conn = obtener_conexion()
        cursor = conn.cursor()
        
        # Actualizar cada configuración
        for config_id, valor in configuraciones.items():
            cursor.execute('''
                UPDATE configuraciones 
                SET valor = ?, fecha_modificacion = ?
                WHERE id = ?
            ''', (valor, datetime.now().isoformat(), config_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'message': 'Configuraciones actualizadas correctamente'
        })
    
    except Exception as e:
        return jsonify({
            'success': False, 
            'message': f'Error al actualizar configuraciones: {str(e)}'
        }), 500

@configuracion_admin_bp.route('/crear', methods=['POST'])
def crear_configuracion():
    """Crear nueva configuración"""
    if not verificar_admin():
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403
    
    try:
        nombre = request.form.get('nombre')
        categoria = request.form.get('categoria')
        valor = request.form.get('valor')
        descripcion = request.form.get('descripcion', '')
        tipo = request.form.get('tipo', 'texto')
        
        if not all([nombre, categoria, valor]):
            return jsonify({
                'success': False, 
                'message': 'Todos los campos son obligatorios'
            }), 400
        
        conn = obtener_conexion()
        cursor = conn.cursor()
        
        # Verificar si ya existe
        cursor.execute('''
            SELECT id FROM configuraciones 
            WHERE nombre = ? AND categoria = ?
        ''', (nombre, categoria))
        
        if cursor.fetchone():
            return jsonify({
                'success': False, 
                'message': 'Ya existe una configuración con ese nombre en esa categoría'
            }), 400
        
        # Crear nueva configuración
        cursor.execute('''
            INSERT INTO configuraciones 
            (nombre, categoria, valor, descripcion, tipo, fecha_creacion, fecha_modificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (nombre, categoria, valor, descripcion, tipo, 
              datetime.now().isoformat(), datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'message': 'Configuración creada correctamente'
        })
    
    except Exception as e:
        return jsonify({
            'success': False, 
            'message': f'Error al crear configuración: {str(e)}'
        }), 500

@configuracion_admin_bp.route('/eliminar/<int:config_id>', methods=['DELETE'])
def eliminar_configuracion(config_id):
    """Eliminar configuración"""
    if not verificar_admin():
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403
    
    try:
        conn = obtener_conexion()
        cursor = conn.cursor()
        
        # Verificar que existe
        cursor.execute('SELECT id FROM configuraciones WHERE id = ?', (config_id,))
        if not cursor.fetchone():
            return jsonify({
                'success': False, 
                'message': 'Configuración no encontrada'
            }), 404
        
        # Eliminar configuración
        cursor.execute('DELETE FROM configuraciones WHERE id = ?', (config_id,))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'message': 'Configuración eliminada correctamente'
        })
    
    except Exception as e:
        return jsonify({
            'success': False, 
            'message': f'Error al eliminar configuración: {str(e)}'
        }), 500

@configuracion_admin_bp.route('/sistema')
def configuracion_sistema():
    """Configuraciones específicas del sistema"""
    if not verificar_admin():
        flash('Acceso denegado. Se requieren permisos de administrador.', 'error')
        return redirect(url_for('auth.login'))
    
    try:
        conn = obtener_conexion()
        cursor = conn.cursor()
        
        # Obtener información del sistema
        cursor.execute('SELECT COUNT(*) as total FROM usuarios')
        total_usuarios = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM asesorias')
        total_asesorias = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM pagos')
        total_pagos = cursor.fetchone()['total']
        
        # Obtener configuraciones del sistema
        cursor.execute('''
            SELECT * FROM configuraciones 
            WHERE categoria = 'sistema'
            ORDER BY nombre
        ''')
        config_sistema = cursor.fetchall()
        
        conn.close()
        
        estadisticas = {
            'usuarios': total_usuarios,
            'asesorias': total_asesorias,
            'pagos': total_pagos
        }
        
        return render_template('admin/configuracion_sistema.html', 
                             configuraciones=config_sistema,
                             estadisticas=estadisticas)
    
    except Exception as e:
        flash(f'Error al cargar configuración del sistema: {str(e)}', 'error')
        return redirect(url_for('configuracion_admin.configuracion_general'))

@configuracion_admin_bp.route('/backup')
def crear_backup():
    """Crear backup de la base de datos"""
    if not verificar_admin():
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403
    
    try:
        # Crear nombre del backup con timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'backup_database_{timestamp}.db'
        backup_path = os.path.join('static', 'uploads', 'backups', backup_filename)
        
        # Crear directorio si no existe
        os.makedirs(os.path.dirname(backup_path), exist_ok=True)
        
        # Copiar base de datos
        import shutil
        shutil.copy2('database.db', backup_path)
        
        return jsonify({
            'success': True, 
            'message': 'Backup creado correctamente',
            'filename': backup_filename,
            'path': backup_path
        })
    
    except Exception as e:
        return jsonify({
            'success': False, 
            'message': f'Error al crear backup: {str(e)}'
        }), 500

@configuracion_admin_bp.route('/logs')
def ver_logs():
    """Ver logs del sistema"""
    if not verificar_admin():
        flash('Acceso denegado. Se requieren permisos de administrador.', 'error')
        return redirect(url_for('auth.login'))
    
    try:
        # Leer logs si existen
        logs = []
        log_files = ['app.log', 'error.log', 'access.log']
        
        for log_file in log_files:
            if os.path.exists(log_file):
                with open(log_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    # Obtener las últimas 100 líneas
                    logs.extend([{
                        'file': log_file,
                        'line': line.strip(),
                        'timestamp': datetime.now().isoformat()
                    } for line in lines[-100:]])
        
        return render_template('admin/logs_sistema.html', logs=logs)
    
    except Exception as e:
        flash(f'Error al cargar logs: {str(e)}', 'error')
        return redirect(url_for('configuracion_admin.configuracion_general'))

@configuracion_admin_bp.route('/api/estadisticas')
def api_estadisticas():
    """API para obtener estadísticas del sistema"""
    if not verificar_admin():
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403
    
    try:
        conn = obtener_conexion()
        cursor = conn.cursor()
        
        # Estadísticas generales
        cursor.execute('SELECT COUNT(*) as total FROM usuarios')
        total_usuarios = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM usuarios WHERE activo = 1')
        usuarios_activos = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM asesorias')
        total_asesorias = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM asesorias WHERE estado = "Programada"')
        asesorias_pendientes = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM pagos')
        total_pagos = cursor.fetchone()['total']
        
        cursor.execute('SELECT SUM(monto) as total FROM pagos WHERE estado = "Completado"')
        ingresos_totales = cursor.fetchone()['total'] or 0
        
        conn.close()
        
        return jsonify({
            'success': True,
            'estadisticas': {
                'usuarios': {
                    'total': total_usuarios,
                    'activos': usuarios_activos
                },
                'asesorias': {
                    'total': total_asesorias,
                    'pendientes': asesorias_pendientes
                },
                'pagos': {
                    'total': total_pagos,
                    'ingresos': float(ingresos_totales)
                }
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False, 
            'message': f'Error al obtener estadísticas: {str(e)}'
        }), 500

@configuracion_admin_bp.route('/inicializar-configuraciones')
def inicializar_configuraciones():
    """Inicializar configuraciones por defecto"""
    if not verificar_admin():
        return jsonify({'success': False, 'message': 'Acceso denegado'}), 403
    
    try:
        conn = obtener_conexion()
        cursor = conn.cursor()
        
        # Crear tabla de configuraciones si no existe
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS configuraciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                categoria TEXT NOT NULL,
                valor TEXT NOT NULL,
                descripcion TEXT,
                tipo TEXT DEFAULT 'texto',
                fecha_creacion TEXT NOT NULL,
                fecha_modificacion TEXT NOT NULL,
                UNIQUE(nombre, categoria)
            )
        ''')
        
        # Configuraciones por defecto
        configuraciones_default = [
            ('nombre_sitio', 'general', 'Canadian Visa Advise', 'Nombre del sitio web', 'texto'),
            ('email_contacto', 'general', 'info@canadianvisaadvise.com', 'Email de contacto', 'email'),
            ('telefono_contacto', 'general', '+1-800-123-4567', 'Teléfono de contacto', 'texto'),
            ('direccion', 'general', 'Toronto, ON, Canada', 'Dirección de la empresa', 'texto'),
            ('moneda', 'pagos', 'CAD', 'Moneda por defecto', 'texto'),
            ('iva_porcentaje', 'pagos', '13', 'Porcentaje de IVA/HST', 'numero'),
            ('precio_asesoria', 'servicios', '150', 'Precio base de asesoría', 'numero'),
            ('duracion_asesoria', 'servicios', '60', 'Duración en minutos', 'numero'),
            ('max_archivos_usuario', 'sistema', '10', 'Máximo archivos por usuario', 'numero'),
            ('tamaño_max_archivo', 'sistema', '5', 'Tamaño máximo archivo (MB)', 'numero'),
        ]
        
        fecha_actual = datetime.now().isoformat()
        
        for nombre, categoria, valor, descripcion, tipo in configuraciones_default:
            cursor.execute('''
                INSERT OR IGNORE INTO configuraciones 
                (nombre, categoria, valor, descripcion, tipo, fecha_creacion, fecha_modificacion)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (nombre, categoria, valor, descripcion, tipo, fecha_actual, fecha_actual))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'message': 'Configuraciones inicializadas correctamente'
        })
    
    except Exception as e:
<<<<<<< HEAD
        return jsonify({'error': str(e)}), 500

configuracion_admin_bp = configuracion_admin
=======
        return jsonify({
            'success': False, 
            'message': f'Error al inicializar configuraciones: {str(e)}'
        }), 500
 
>>>>>>> f9254aa6870c4cc71663c6c3758ea97f835ede38
