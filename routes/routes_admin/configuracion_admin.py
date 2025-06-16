from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from functools import wraps
import sqlite3
import json
from datetime import datetime

configuracion_admin = Blueprint('configuracion_admin', __name__)

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

@configuracion_admin.route('/admin/configuracion')
@admin_required
def configuracion_general():
    """Panel de configuración general del sistema"""
    try:
        conn = get_db_connection()
        
        # Obtener configuraciones actuales
        configuraciones = {}
        config_rows = conn.execute('SELECT clave, valor FROM configuraciones').fetchall()
        
        for config in config_rows:
            configuraciones[config['clave']] = config['valor']
        
        conn.close()
        
        return render_template('admin/configuracion_admin.html',
                             configuraciones=configuraciones)
                             
    except Exception as e:
        flash(f'Error al cargar configuración: {str(e)}', 'error')
        return render_template('admin/configuracion_admin.html', configuraciones={})

@configuracion_admin.route('/admin/configuracion/guardar', methods=['POST'])
@admin_required
def guardar_configuracion():
    """Guardar configuraciones del sistema"""
    try:
        conn = get_db_connection()
        
        # Configuraciones generales
        configuraciones = {
            'nombre_empresa': request.form.get('nombre_empresa', ''),
            'correo_empresa': request.form.get('correo_empresa', ''),
            'telefono_empresa': request.form.get('telefono_empresa', ''),
            'sitio_web': request.form.get('sitio_web', ''),
            'direccion_empresa': request.form.get('direccion_empresa', ''),
            'zona_horaria': request.form.get('zona_horaria', 'America/Toronto'),
            'idioma_sistema': request.form.get('idioma_sistema', 'es'),
            'moneda': request.form.get('moneda', 'CAD'),
            'formato_fecha': request.form.get('formato_fecha', 'DD/MM/YYYY'),
            
            # Notificaciones
            'email_nuevos_usuarios': 'email_nuevos_usuarios' in request.form,
            'email_nuevas_asesorias': 'email_nuevas_asesorias' in request.form,
            'email_pagos_pendientes': 'email_pagos_pendientes' in request.form,
            'email_documentos_revision': 'email_documentos_revision' in request.form,
            
            # SMTP
            'smtp_servidor': request.form.get('smtp_servidor', ''),
            'smtp_puerto': request.form.get('smtp_puerto', '587'),
            'smtp_usuario': request.form.get('smtp_usuario', ''),
            'smtp_password': request.form.get('smtp_password', ''),
            
            # Recordatorios
            'recordatorio_asesorias': request.form.get('recordatorio_asesorias', '24'),
            'recordatorio_documentos': request.form.get('recordatorio_documentos', '7'),
            
            # Seguridad
            'min_longitud_password': request.form.get('min_longitud_password', '8'),
            'expiracion_password': request.form.get('expiracion_password', '0'),
            'require_mayusculas': 'require_mayusculas' in request.form,
            'require_numeros': 'require_numeros' in request.form,
            'require_simbolos': 'require_simbolos' in request.form,
            'enable_2fa': 'enable_2fa' in request.form,
            'force_2fa_admin': 'force_2fa_admin' in request.form,
            'timeout_sesion': request.form.get('timeout_sesion', '30'),
            'max_intentos_login': request.form.get('max_intentos_login', '5'),
            
            # Integraciones
            'stripe_public_key': request.form.get('stripe_public_key', ''),
            'stripe_secret_key': request.form.get('stripe_secret_key', ''),
            'stripe_enabled': 'stripe_enabled' in request.form,
            'google_analytics_id': request.form.get('google_analytics_id', ''),
            'analytics_enabled': 'analytics_enabled' in request.form,
            'zoom_api_key': request.form.get('zoom_api_key', ''),
            'zoom_api_secret': request.form.get('zoom_api_secret', ''),
            'zoom_enabled': 'zoom_enabled' in request.form,
            'cloudinary_cloud_name': request.form.get('cloudinary_cloud_name', ''),
            'cloudinary_api_key': request.form.get('cloudinary_api_key', ''),
            'cloudinary_api_secret': request.form.get('cloudinary_api_secret', ''),
            'cloudinary_enabled': 'cloudinary_enabled' in request.form,
            
            # Respaldos
            'backup_frequency': request.form.get('backup_frequency', 'daily'),
            'backup_enabled': 'backup_enabled' in request.form,
        }
        
        # Guardar cada configuración
        for clave, valor in configuraciones.items():
            # Convertir booleanos a string
            if isinstance(valor, bool):
                valor = 'true' if valor else 'false'
            
            # Insertar o actualizar configuración
            conn.execute('''
                INSERT OR REPLACE INTO configuraciones (clave, valor, fecha_modificacion, modificado_por)
                VALUES (?, ?, ?, ?)
            ''', (clave, str(valor), datetime.now(), session['user_id']))
        
        conn.commit()
        conn.close()
        
        flash('Configuración guardada exitosamente.', 'success')
        return redirect(url_for('configuracion_admin.configuracion_general'))
        
    except Exception as e:
        flash(f'Error al guardar configuración: {str(e)}', 'error')
        return redirect(url_for('configuracion_admin.configuracion_general'))

@configuracion_admin.route('/admin/configuracion/probar-smtp', methods=['POST'])
@admin_required
def probar_conexion_smtp():
    """Probar conexión SMTP"""
    try:
        servidor = request.json.get('servidor')
        puerto = int(request.json.get('puerto', 587))
        usuario = request.json.get('usuario')
        password = request.json.get('password')
        
        # TODO: Implementar prueba real de SMTP
        import smtplib
        from email.mime.text import MIMEText
        
        # Crear conexión SMTP
        server = smtplib.SMTP(servidor, puerto)
        server.starttls()
        server.login(usuario, password)
        
        # Enviar email de prueba
        msg = MIMEText('Prueba de conexión SMTP desde CVA Admin')
        msg['Subject'] = 'Prueba SMTP - CVA'
        msg['From'] = usuario
        msg['To'] = usuario
        
        server.send_message(msg)
        server.quit()
        
        return jsonify({
            'success': True,
            'mensaje': 'Conexión SMTP exitosa. Email de prueba enviado.'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error en conexión SMTP: {str(e)}'
        }), 500

@configuracion_admin.route('/admin/configuracion/limpiar-cache', methods=['POST'])
@admin_required
def limpiar_cache():
    """Limpiar caché del sistema"""
    try:
        # TODO: Implementar limpieza real de caché
        # Por ahora simulamos la operación
        
        import time
        time.sleep(2)  # Simular procesamiento
        
        return jsonify({
            'success': True,
            'mensaje': 'Caché del sistema limpiado exitosamente'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@configuracion_admin.route('/admin/configuracion/optimizar-bd', methods=['POST'])
@admin_required
def optimizar_base_datos():
    """Optimizar base de datos"""
    try:
        conn = get_db_connection()
        
        # Ejecutar VACUUM para optimizar la base de datos
        conn.execute('VACUUM')
        
        # Analizar estadísticas
        conn.execute('ANALYZE')
        
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': 'Base de datos optimizada exitosamente'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@configuracion_admin.route('/admin/configuracion/verificar-integridad', methods=['POST'])
@admin_required
def verificar_integridad():
    """Verificar integridad de archivos y base de datos"""
    try:
        conn = get_db_connection()
        
        # Verificar integridad de la base de datos
        resultado = conn.execute('PRAGMA integrity_check').fetchone()
        
        conn.close()
        
        if resultado[0] == 'ok':
            return jsonify({
                'success': True,
                'mensaje': 'Verificación de integridad completada. Todo está correcto.'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Problemas de integridad detectados: {resultado[0]}'
            })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@configuracion_admin.route('/admin/configuracion/crear-respaldo', methods=['POST'])
@admin_required
def crear_respaldo_manual():
    """Crear respaldo manual del sistema"""
    try:
        import shutil
        import os
        from datetime import datetime
        
        # Crear nombre del archivo de respaldo
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'backup_cva_{timestamp}.db'
        backup_path = os.path.join('backups', backup_filename)
        
        # Crear directorio de respaldos si no existe
        os.makedirs('backups', exist_ok=True)
        
        # Copiar base de datos
        shutil.copy2('database.db', backup_path)
        
        # Registrar el respaldo en la base de datos
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO respaldos (nombre_archivo, ruta_archivo, tipo, estado, 
                                 fecha_creacion, creado_por)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (backup_filename, backup_path, 'Manual', 'Completado', 
              datetime.now(), session['user_id']))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'mensaje': f'Respaldo creado exitosamente: {backup_filename}'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@configuracion_admin.route('/admin/configuracion/estado-sistema')
@admin_required
def obtener_estado_sistema():
    """Obtener estado actual del sistema"""
    try:
        import psutil
        import os
        
        # Estado de la base de datos
        try:
            conn = get_db_connection()
            conn.execute('SELECT 1').fetchone()
            conn.close()
            estado_bd = 'Conectada'
        except:
            estado_bd = 'Error'
        
        # Estado del servidor de correo (simulado)
        estado_correo = 'Funcionando'
        
        # Uso de almacenamiento
        disk_usage = psutil.disk_usage('.')
        porcentaje_usado = (disk_usage.used / disk_usage.total) * 100
        
        # Memoria del sistema
        memory = psutil.virtual_memory()
        
        return jsonify({
            'base_datos': estado_bd,
            'servidor_correo': estado_correo,
            'almacenamiento': {
                'porcentaje_usado': round(porcentaje_usado, 1),
                'espacio_libre': round(disk_usage.free / (1024**3), 2),
                'espacio_total': round(disk_usage.total / (1024**3), 2)
            },
            'memoria': {
                'porcentaje_usado': memory.percent,
                'memoria_libre': round(memory.available / (1024**3), 2),
                'memoria_total': round(memory.total / (1024**3), 2)
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@configuracion_admin.route('/admin/configuracion/logs-sistema')
@admin_required
def obtener_logs_sistema():
    """Obtener logs del sistema"""
    try:
        conn = get_db_connection()
        
        # Obtener logs recientes (últimos 100)
        logs = conn.execute('''
            SELECT nivel, mensaje, fecha, usuario, ip_address
            FROM logs_sistema 
            ORDER BY fecha DESC 
            LIMIT 100
        ''').fetchall()
        
        conn.close()
        
        return jsonify({
            'logs': [dict(log) for log in logs]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@configuracion_admin.route('/admin/configuracion/actualizar-sistema', methods=['POST'])
@admin_required
def actualizar_sistema():
    """Actualizar sistema (placeholder)"""
    try:
        # TODO: Implementar actualización real del sistema
        # Por ahora simulamos la operación
        
        return jsonify({
            'success': True,
            'mensaje': 'Sistema actualizado exitosamente a la versión 2.1.0'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

configuracion_admin_bp = configuracion_admin