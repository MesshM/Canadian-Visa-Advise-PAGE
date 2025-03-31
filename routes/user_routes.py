from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify, current_app
from database import create_connection
from mysql.connector import Error
import os
import json
import uuid
from datetime import datetime, timedelta
import random
import string
from werkzeug.utils import secure_filename
from utils.email_utils import send_email_via_zoho
from utils.file_utils import allowed_file, save_file
from utils.appointment_utils import get_available_slots, reserve_appointment_slot

user_bp = Blueprint('user', __name__)

@user_bp.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Get user information
        cursor.execute("""
            SELECT u.*, s.id_solicitante, s.pais_residencia, s.telefono, s.fecha_nacimiento
            FROM tbl_usuario u
            LEFT JOIN tbl_solicitante s ON u.id_usuario = s.id_usuario
            WHERE u.id_usuario = %s
        """, (session['user_id'],))
        
        user_info = cursor.fetchone()
        
        # Get user's asesorias
        if user_info and user_info['id_solicitante']:
            cursor.execute("""
                SELECT a.*, 
                       CONCAT(asesor.nombres, ' ', asesor.apellidos) as nombre_asesor,
                       asesor.foto_perfil as foto_asesor,
                       (SELECT COUNT(*) FROM tbl_documento_solicitante ds WHERE ds.id_solicitante = a.id_solicitante) as total_documentos,
                       (SELECT COUNT(*) FROM tbl_pago_asesoria pa WHERE pa.codigo_asesoria = a.codigo_asesoria AND pa.estado_pago = 'Completado') as pago_completado
                FROM tbl_asesoria a
                LEFT JOIN tbl_asesor asesor ON a.id_asesor = asesor.id_asesor
                WHERE a.id_solicitante = %s
                ORDER BY a.fecha_creacion DESC
                LIMIT 5
            """, (user_info['id_solicitante'],))
            
            asesorias = cursor.fetchall()
            
            # Format dates for display
            for asesoria in asesorias:
                if asesoria['fecha_asesoria']:
                    asesoria['fecha_formateada'] = asesoria['fecha_asesoria'].strftime("%d/%m/%Y %H:%M")
                else:
                    asesoria['fecha_formateada'] = "No programada"
                
                if asesoria['fecha_creacion']:
                    asesoria['creacion_formateada'] = asesoria['fecha_creacion'].strftime("%d/%m/%Y")
                else:
                    asesoria['creacion_formateada'] = "Desconocida"
        else:
            asesorias = []
        
        # Get user's documents
        if user_info and user_info['id_solicitante']:
            cursor.execute("""
                SELECT ds.*, dt.nombre as tipo_documento
                FROM tbl_documento_solicitante ds
                JOIN tbl_documento_tipo dt ON ds.id_documento_tipo = dt.id_documento_tipo
                WHERE ds.id_solicitante = %s
                ORDER BY ds.fecha_subida DESC
                LIMIT 10
            """, (user_info['id_solicitante'],))
            
            documentos = cursor.fetchall()
            
            # Format dates for display
            for documento in documentos:
                if documento['fecha_subida']:
                    documento['fecha_formateada'] = documento['fecha_subida'].strftime("%d/%m/%Y %H:%M")
                else:
                    documento['fecha_formateada'] = "Desconocida"
        else:
            documentos = []
        
        # Get notifications
        cursor.execute("""
            SELECT * FROM tbl_notificacion
            WHERE id_usuario = %s AND leida = 0
            ORDER BY fecha_creacion DESC
            LIMIT 5
        """, (session['user_id'],))
        
        notificaciones = cursor.fetchall()
        
        # Format dates for notifications
        for notificacion in notificaciones:
            if notificacion['fecha_creacion']:
                notificacion['fecha_formateada'] = notificacion['fecha_creacion'].strftime("%d/%m/%Y %H:%M")
            else:
                notificacion['fecha_formateada'] = "Desconocida"
        
        # Get upcoming appointments
        if user_info and user_info['id_solicitante']:
            cursor.execute("""
                SELECT a.*, 
                       CONCAT(asesor.nombres, ' ', asesor.apellidos) as nombre_asesor,
                       asesor.foto_perfil as foto_asesor
                FROM tbl_asesoria a
                LEFT JOIN tbl_asesor asesor ON a.id_asesor = asesor.id_asesor
                WHERE a.id_solicitante = %s AND a.fecha_asesoria > NOW() AND a.estado = 'Pagada'
                ORDER BY a.fecha_asesoria ASC
                LIMIT 3
            """, (user_info['id_solicitante'],))
            
            proximas_citas = cursor.fetchall()
            
            # Format dates for display
            for cita in proximas_citas:
                if cita['fecha_asesoria']:
                    cita['fecha_formateada'] = cita['fecha_asesoria'].strftime("%d/%m/%Y %H:%M")
                else:
                    cita['fecha_formateada'] = "No programada"
        else:
            proximas_citas = []
        
        cursor.close()
        connection.close()
        
        return render_template('dashboard.html', 
                               user=user_info, 
                               asesorias=asesorias, 
                               documentos=documentos, 
                               notificaciones=notificaciones,
                               proximas_citas=proximas_citas)
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('auth.index'))

@user_bp.route('/perfil')
def perfil():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Get user information
        cursor.execute("""
            SELECT u.*, s.id_solicitante, s.pais_residencia, s.telefono, s.fecha_nacimiento,
                   s.direccion, s.ciudad, s.estado_provincia, s.codigo_postal
            FROM tbl_usuario u
            LEFT JOIN tbl_solicitante s ON u.id_usuario = s.id_usuario
            WHERE u.id_usuario = %s
        """, (session['user_id'],))
        
        user_info = cursor.fetchone()
        
        # Get countries list for the form
        cursor.execute("SELECT * FROM tbl_pais ORDER BY nombre")
        paises = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return render_template('perfil.html', user=user_info, paises=paises)
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('auth.dashboard'))

@user_bp.route('/actualizar_perfil', methods=['POST'])
def actualizar_perfil():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    # Get form data
    nombres = request.form.get('nombres')
    apellidos = request.form.get('apellidos')
    telefono = request.form.get('telefono')
    pais_residencia = request.form.get('pais_residencia')
    fecha_nacimiento = request.form.get('fecha_nacimiento')
    direccion = request.form.get('direccion')
    ciudad = request.form.get('ciudad')
    estado_provincia = request.form.get('estado_provincia')
    codigo_postal = request.form.get('codigo_postal')
    
    # Validate required fields
    if not nombres or not apellidos:
        flash('Los campos de nombres y apellidos son obligatorios', 'error')
        return redirect(url_for('user.perfil'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        try:
            # Start transaction
            connection.start_transaction()
            
            # Update user information
            cursor.execute("""
                UPDATE tbl_usuario
                SET nombres = %s, apellidos = %s
                WHERE id_usuario = %s
            """, (nombres, apellidos, session['user_id']))
            
            # Check if solicitante record exists
            cursor.execute("SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s", (session['user_id'],))
            solicitante = cursor.fetchone()
            
            if solicitante:
                # Update existing solicitante record
                cursor.execute("""
                    UPDATE tbl_solicitante
                    SET telefono = %s, pais_residencia = %s, fecha_nacimiento = %s,
                        direccion = %s, ciudad = %s, estado_provincia = %s, codigo_postal = %s
                    WHERE id_usuario = %s
                """, (telefono, pais_residencia, fecha_nacimiento, direccion, ciudad, estado_provincia, codigo_postal, session['user_id']))
            else:
                # Create new solicitante record
                cursor.execute("""
                    INSERT INTO tbl_solicitante (id_usuario, telefono, pais_residencia, fecha_nacimiento,
                                                direccion, ciudad, estado_provincia, codigo_postal)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (session['user_id'], telefono, pais_residencia, fecha_nacimiento, direccion, ciudad, estado_provincia, codigo_postal))
            
            # Handle profile picture upload
            if 'foto_perfil' in request.files:
                foto = request.files['foto_perfil']
                if foto and foto.filename != '' and allowed_file(foto.filename, ['jpg', 'jpeg', 'png']):
                    filename = secure_filename(f"user_{session['user_id']}_{int(datetime.now().timestamp())}.{foto.filename.rsplit('.', 1)[1].lower()}")
                    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], 'profile_pics', filename)
                    
                    # Ensure directory exists
                    os.makedirs(os.path.dirname(filepath), exist_ok=True)
                    
                    # Save file
                    foto.save(filepath)
                    
                    # Update database with new profile picture
                    cursor.execute("""
                        UPDATE tbl_usuario
                        SET foto_perfil = %s
                        WHERE id_usuario = %s
                    """, (filename, session['user_id']))
            
            # Commit the transaction
            connection.commit()
            flash('Perfil actualizado exitosamente', 'success')
        except Error as e:
            connection.rollback()
            flash(f'Error al actualizar el perfil: {str(e)}', 'error')
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
    
    return redirect(url_for('user.perfil'))

@user_bp.route('/cambiar_contrasena', methods=['POST'])
def cambiar_contrasena():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    # Get form data
    contrasena_actual = request.form.get('contrasena_actual')
    nueva_contrasena = request.form.get('nueva_contrasena')
    confirmar_contrasena = request.form.get('confirmar_contrasena')
    
    # Validate input
    if not contrasena_actual or not nueva_contrasena or not confirmar_contrasena:
        flash('Todos los campos son obligatorios', 'error')
        return redirect(url_for('user.perfil'))
    
    if nueva_contrasena != confirmar_contrasena:
        flash('Las contraseñas nuevas no coinciden', 'error')
        return redirect(url_for('user.perfil'))
    
    if len(nueva_contrasena) < 8:
        flash('La contraseña debe tener al menos 8 caracteres', 'error')
        return redirect(url_for('user.perfil'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Verify current password
        cursor.execute("SELECT contrasena FROM tbl_usuario WHERE id_usuario = %s", (session['user_id'],))
        user = cursor.fetchone()
        
        if not user or user['contrasena'] != contrasena_actual:  # In a real app, use password hashing
            cursor.close()
            connection.close()
            flash('La contraseña actual es incorrecta', 'error')
            return redirect(url_for('user.perfil'))
        
        # Update password
        cursor.execute("""
            UPDATE tbl_usuario
            SET contrasena = %s
            WHERE id_usuario = %s
        """, (nueva_contrasena, session['user_id']))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        flash('Contraseña actualizada exitosamente', 'success')
        return redirect(url_for('user.perfil'))
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('user.perfil'))

@user_bp.route('/asesorias')
def asesorias():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Get solicitante ID
        cursor.execute("SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s", (session['user_id'],))
        solicitante = cursor.fetchone()
        
        if not solicitante:
            cursor.close()
            connection.close()
            flash('No se encontró información de solicitante para este usuario', 'error')
            return redirect(url_for('user.dashboard'))
        
        # Get all asesorias for this solicitante
        cursor.execute("""
            SELECT a.*, 
                   CONCAT(asesor.nombres, ' ', asesor.apellidos) as nombre_asesor,
                   asesor.foto_perfil as foto_asesor,
                   (SELECT COUNT(*) FROM tbl_documento_solicitante ds WHERE ds.id_solicitante = a.id_solicitante) as total_documentos,
                   (SELECT COUNT(*) FROM tbl_pago_asesoria pa WHERE pa.codigo_asesoria = a.codigo_asesoria AND pa.estado_pago = 'Completado') as pago_completado
            FROM tbl_asesoria a
            LEFT JOIN tbl_asesor asesor ON a.id_asesor = asesor.id_asesor
            WHERE a.id_solicitante = %s
            ORDER BY 
                CASE 
                    WHEN a.estado = 'Pendiente' THEN 1
                    WHEN a.estado = 'Programada' THEN 2
                    WHEN a.estado = 'Pagada' THEN 3
                    WHEN a.estado = 'Completada' THEN 4
                    WHEN a.estado = 'Cancelada' THEN 5
                    ELSE 6
                END,
                a.fecha_creacion DESC
        """, (solicitante['id_solicitante'],))
        
        asesorias = cursor.fetchall()
        
        # Format dates for display
        for asesoria in asesorias:
            if asesoria['fecha_asesoria']:
                asesoria['fecha_formateada'] = asesoria['fecha_asesoria'].strftime("%d/%m/%Y %H:%M")
            else:
                asesoria['fecha_formateada'] = "No programada"
            
            if asesoria['fecha_creacion']:
                asesoria['creacion_formateada'] = asesoria['fecha_creacion'].strftime("%d/%m/%Y")
            else:
                asesoria['creacion_formateada'] = "Desconocida"
        
        # Get available asesores for new asesorias
        cursor.execute("""
            SELECT a.id_asesor, CONCAT(a.nombres, ' ', a.apellidos) as nombre, a.foto_perfil,
                   a.especialidad, a.calificacion, a.descripcion
            FROM tbl_asesor a
            WHERE a.activo = 1
            ORDER BY a.calificacion DESC
        """)
        
        asesores = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return render_template('asesorias.html', 
                               asesorias=asesorias, 
                               asesores=asesores, 
                               id_solicitante=solicitante['id_solicitante'])
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('user.dashboard'))

@user_bp.route('/solicitar_asesoria', methods=['POST'])
def solicitar_asesoria():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    # Get form data
    tipo_asesoria = request.form.get('tipo_asesoria')
    id_asesor = request.form.get('id_asesor')
    descripcion = request.form.get('descripcion')
    
    # Validate required fields
    if not tipo_asesoria:
        flash('El tipo de asesoría es obligatorio', 'error')
        return redirect(url_for('user.asesorias'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Get solicitante ID
        cursor.execute("SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s", (session['user_id'],))
        solicitante = cursor.fetchone()
        
        if not solicitante:
            # Create solicitante record if it doesn't exist
            cursor.execute("""
                INSERT INTO tbl_solicitante (id_usuario)
                VALUES (%s)
            """, (session['user_id'],))
            
            connection.commit()
            
            # Get the newly created solicitante ID
            cursor.execute("SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s", (session['user_id'],))
            solicitante = cursor.fetchone()
        
        # Generate a unique code for the asesoria
        codigo_asesoria = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        
        # Create the asesoria
        cursor.execute("""
            INSERT INTO tbl_asesoria (codigo_asesoria, id_solicitante, tipo_asesoria, id_asesor, descripcion, estado, fecha_creacion)
            VALUES (%s, %s, %s, %s, %s, 'Pendiente', NOW())
        """, (codigo_asesoria, solicitante['id_solicitante'], tipo_asesoria, id_asesor if id_asesor else None, descripcion))
        
        connection.commit()
        
        # Create notification for the user
        cursor.execute("""
            INSERT INTO tbl_notificacion (id_usuario, tipo, mensaje, leida, fecha_creacion)
            VALUES (%s, 'asesoria', %s, 0, NOW())
        """, (session['user_id'], f"Has solicitado una asesoría de {tipo_asesoria}. Código: {codigo_asesoria}"))
        
        connection.commit()
        
        # If an asesor was selected, create notification for them
        if id_asesor:
            cursor.execute("SELECT id_usuario FROM tbl_asesor WHERE id_asesor = %s", (id_asesor,))
            asesor_user = cursor.fetchone()
            
            if asesor_user:
                cursor.execute("""
                    INSERT INTO tbl_notificacion (id_usuario, tipo, mensaje, leida, fecha_creacion)
                    VALUES (%s, 'asesoria', %s, 0, NOW())
                """, (asesor_user['id_usuario'], f"Nueva solicitud de asesoría de {tipo_asesoria}. Código: {codigo_asesoria}"))
                
                connection.commit()
        
        cursor.close()
        connection.close()
        
        flash('Solicitud de asesoría creada exitosamente', 'success')
        return redirect(url_for('user.asesorias'))
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('user.asesorias'))

@user_bp.route('/cancelar_asesoria/<codigo_asesoria>', methods=['POST'])
def cancelar_asesoria(codigo_asesoria):
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Verify that the asesoria belongs to the current user
        cursor.execute("""
            SELECT a.codigo_asesoria, a.estado, a.id_asesor, a.fecha_asesoria
            FROM tbl_asesoria a
            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            WHERE a.codigo_asesoria = %s AND s.id_usuario = %s
        """, (codigo_asesoria, session['user_id']))
        
        asesoria = cursor.fetchone()
        
        if not asesoria:
            cursor.close()
            connection.close()
            flash('Asesoría no encontrada o no autorizada', 'error')
            return redirect(url_for('user.asesorias'))
        
        # Check if the asesoria can be cancelled
        if asesoria['estado'] in ['Completada', 'Cancelada']:
            cursor.close()
            connection.close()
            flash('No se puede cancelar una asesoría que ya está completada o cancelada', 'error')
            return redirect(url_for('user.asesorias'))
        
        # Start transaction
        connection.start_transaction()
        
        try:
            # Update asesoria status
            cursor.execute("""
                UPDATE tbl_asesoria
                SET estado = 'Cancelada'
                WHERE codigo_asesoria = %s
            """, (codigo_asesoria,))
            
            # If the asesoria was scheduled, free up the slot
            if asesoria['id_asesor'] and asesoria['fecha_asesoria']:
                # Remove from calendar
                cursor.execute("""
                    DELETE FROM tbl_calendario_asesorias
                    WHERE id_asesor = %s AND fecha = %s
                """, (asesoria['id_asesor'], asesoria['fecha_asesoria']))
                
                # Update availability in horarios_asesores
                dia_semana = asesoria['fecha_asesoria'].weekday() + 1  # +1 because in DB 1 is Monday
                hora = asesoria['fecha_asesoria'].time()
                
                cursor.execute("""
                    UPDATE tbl_horarios_asesores
                    SET disponible = 1, reserva_temporal = NULL
                    WHERE id_asesor = %s AND dia_semana = %s AND hora_inicio = %s
                """, (asesoria['id_asesor'], dia_semana, hora))
            
            # Create notification for the user
            cursor.execute("""
                INSERT INTO tbl_notificacion (id_usuario, tipo, mensaje, leida, fecha_creacion)
                VALUES (%s, 'asesoria', %s, 0, NOW())
            """, (session['user_id'], f"Has cancelado la asesoría con código {codigo_asesoria}."))
            
            # If an asesor was assigned, create notification for them
            if asesoria['id_asesor']:
                cursor.execute("SELECT id_usuario FROM tbl_asesor WHERE id_asesor = %s", (asesoria['id_asesor'],))
                asesor_user = cursor.fetchone()
                
                if asesor_user:
                    cursor.execute("""
                        INSERT INTO tbl_notificacion (id_usuario, tipo, mensaje, leida, fecha_creacion)
                        VALUES (%s, 'asesoria', %s, 0, NOW())
                    """, (asesor_user['id_usuario'], f"La asesoría con código {codigo_asesoria} ha sido cancelada por el solicitante."))
            
            # Commit the transaction
            connection.commit()
            flash('Asesoría cancelada exitosamente', 'success')
        except Error as e:
            connection.rollback()
            flash(f'Error al cancelar la asesoría: {str(e)}', 'error')
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
    
    return redirect(url_for('user.asesorias'))

@user_bp.route('/detalle_asesoria/<codigo_asesoria>')
def detalle_asesoria(codigo_asesoria):
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Verify that the asesoria belongs to the current user
        cursor.execute("""
            SELECT a.*, 
                   CONCAT(asesor.nombres, ' ', asesor.apellidos) as nombre_asesor,
                   asesor.foto_perfil as foto_asesor,
                   asesor.especialidad as especialidad_asesor,
                   asesor.calificacion as calificacion_asesor,
                   s.id_solicitante,
                   (SELECT COUNT(*) FROM tbl_pago_asesoria pa WHERE pa.codigo_asesoria = a.codigo_asesoria AND pa.estado_pago = 'Completado') as pago_completado
            FROM tbl_asesoria a
            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            LEFT JOIN tbl_asesor asesor ON a.id_asesor = asesor.id_asesor
            WHERE a.codigo_asesoria = %s AND s.id_usuario = %s
        """, (codigo_asesoria, session['user_id']))
        
        asesoria = cursor.fetchone()
        
        if not asesoria:
            cursor.close()
            connection.close()
            flash('Asesoría no encontrada o no autorizada', 'error')
            return redirect(url_for('user.asesorias'))
        
        # Format dates for display
        if asesoria['fecha_asesoria']:
            asesoria['fecha_formateada'] = asesoria['fecha_asesoria'].strftime("%d/%m/%Y %H:%M")
        else:
            asesoria['fecha_formateada'] = "No programada"
        
        if asesoria['fecha_creacion']:
            asesoria['creacion_formateada'] = asesoria['fecha_creacion'].strftime("%d/%m/%Y %H:%M")
        else:
            asesoria['creacion_formateada'] = "Desconocida"
        
        # Get payment information
        cursor.execute("""
            SELECT * FROM tbl_pago_asesoria
            WHERE codigo_asesoria = %s
            ORDER BY fecha_pago DESC
        """, (codigo_asesoria,))
        
        pagos = cursor.fetchall()
        
        # Format payment dates
        for pago in pagos:
            if pago['fecha_pago']:
                pago['fecha_formateada'] = pago['fecha_pago'].strftime("%d/%m/%Y %H:%M")
            else:
                pago['fecha_formateada'] = "Desconocida"
        
        # Get documents related to this asesoria
        cursor.execute("""
            SELECT ds.*, dt.nombre as tipo_documento
            FROM tbl_documento_solicitante ds
            JOIN tbl_documento_tipo dt ON ds.id_documento_tipo = dt.id_documento_tipo
            WHERE ds.id_solicitante = %s AND ds.codigo_asesoria = %s
            ORDER BY ds.fecha_subida DESC
        """, (asesoria['id_solicitante'], codigo_asesoria))
        
        documentos = cursor.fetchall()
        
        # Format document dates
        for documento in documentos:
            if documento['fecha_subida']:
                documento['fecha_formateada'] = documento['fecha_subida'].strftime("%d/%m/%Y %H:%M")
            else:
                documento['fecha_formateada'] = "Desconocida"
        
        # Get document types for upload form
        cursor.execute("SELECT * FROM tbl_documento_tipo ORDER BY nombre")
        tipos_documento = cursor.fetchall()
        
        # Get available asesores for reassignment
        cursor.execute("""
            SELECT a.id_asesor, CONCAT(a.nombres, ' ', a.apellidos) as nombre, a.foto_perfil,
                   a.especialidad, a.calificacion
            FROM tbl_asesor a
            WHERE a.activo = 1
            ORDER BY a.calificacion DESC
        """)
        
        asesores = cursor.fetchall()
        
        # Get messages related to this asesoria
        cursor.execute("""
            SELECT m.*, 
                   CASE 
                       WHEN m.id_usuario = %s THEN 'Tú'
                       WHEN a.id_usuario IS NOT NULL THEN CONCAT(a.nombres, ' ', a.apellidos)
                       ELSE 'Administrador'
                   END as nombre_remitente
            FROM tbl_mensaje m
            LEFT JOIN tbl_asesor a ON m.id_usuario = a.id_usuario
            WHERE m.codigo_asesoria = %s
            ORDER BY m.fecha_envio ASC
        """, (session['user_id'], codigo_asesoria))
        
        mensajes = cursor.fetchall()
        
        # Format message dates
        for mensaje in mensajes:
            if mensaje['fecha_envio']:
                mensaje['fecha_formateada'] = mensaje['fecha_envio'].strftime("%d/%m/%Y %H:%M")
            else:
                mensaje['fecha_formateada'] = "Desconocida"
        
        cursor.close()
        connection.close()
        
        return render_template('detalle_asesoria.html', 
                               asesoria=asesoria, 
                               pagos=pagos, 
                               documentos=documentos, 
                               tipos_documento=tipos_documento,
                               asesores=asesores,
                               mensajes=mensajes)
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('user.asesorias'))

@user_bp.route('/enviar_mensaje', methods=['POST'])
def enviar_mensaje():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    codigo_asesoria = request.form.get('codigo_asesoria')
    contenido = request.form.get('contenido')
    
    if not codigo_asesoria or not contenido:
        flash('El contenido del mensaje es obligatorio', 'error')
        return redirect(url_for('user.detalle_asesoria', codigo_asesoria=codigo_asesoria))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Verify that the asesoria belongs to the current user
        cursor.execute("""
            SELECT a.codigo_asesoria, a.id_asesor
            FROM tbl_asesoria a
            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            WHERE a.codigo_asesoria = %s AND s.id_usuario = %s
        """, (codigo_asesoria, session['user_id']))
        
        asesoria = cursor.fetchone()
        
        if not asesoria:
            cursor.close()
            connection.close()
            flash('Asesoría no encontrada o no autorizada', 'error')
            return redirect(url_for('user.asesorias'))
        
        # Save the message
        cursor.execute("""
            INSERT INTO tbl_mensaje (codigo_asesoria, id_usuario, contenido, fecha_envio)
            VALUES (%s, %s, %s, NOW())
        """, (codigo_asesoria, session['user_id'], contenido))
        
        connection.commit()
        
        # Create notification for the asesor if assigned
        if asesoria['id_asesor']:
            cursor.execute("SELECT id_usuario FROM tbl_asesor WHERE id_asesor = %s", (asesoria['id_asesor'],))
            asesor_user = cursor.fetchone()
            
            if asesor_user:
                cursor.execute("""
                    INSERT INTO tbl_notificacion (id_usuario, tipo, mensaje, leida, fecha_creacion)
                    VALUES (%s, 'mensaje', %s, 0, NOW())
                """, (asesor_user['id_usuario'], f"Nuevo mensaje en la asesoría {codigo_asesoria}"))
                
                connection.commit()
        
        cursor.close()
        connection.close()
        
        flash('Mensaje enviado exitosamente', 'success')
        return redirect(url_for('user.detalle_asesoria', codigo_asesoria=codigo_asesoria))
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('user.detalle_asesoria', codigo_asesoria=codigo_asesoria))

@user_bp.route('/subir_documento', methods=['POST'])
def subir_documento():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    codigo_asesoria = request.form.get('codigo_asesoria')
    id_documento_tipo = request.form.get('id_documento_tipo')
    descripcion = request.form.get('descripcion')
    
    if not codigo_asesoria or not id_documento_tipo or 'archivo' not in request.files:
        flash('Todos los campos son obligatorios', 'error')
        return redirect(url_for('user.detalle_asesoria', codigo_asesoria=codigo_asesoria))
    
    archivo = request.files['archivo']
    
    if archivo.filename == '':
        flash('No se seleccionó ningún archivo', 'error')
        return redirect(url_for('user.detalle_asesoria', codigo_asesoria=codigo_asesoria))
    
    if not allowed_file(archivo.filename, ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']):
        flash('Tipo de archivo no permitido. Se permiten: PDF, JPG, JPEG, PNG, DOC, DOCX', 'error')
        return redirect(url_for('user.detalle_asesoria', codigo_asesoria=codigo_asesoria))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Verify that the asesoria belongs to the current user
        cursor.execute("""
            SELECT a.codigo_asesoria, a.id_solicitante, a.id_asesor
            FROM tbl_asesoria a
            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            WHERE a.codigo_asesoria = %s AND s.id_usuario = %s
        """, (codigo_asesoria, session['user_id']))
        
        asesoria = cursor.fetchone()
        
        if not asesoria:
            cursor.close()
            connection.close()
            flash('Asesoría no encontrada o no autorizada', 'error')
            return redirect(url_for('user.asesorias'))
        
        # Generate a unique filename
        filename = secure_filename(f"{codigo_asesoria}_{uuid.uuid4().hex}.{archivo.filename.rsplit('.', 1)[1].lower()}")
        
        # Save the file
        filepath = save_file(archivo, filename, 'documentos')
        
        if not filepath:
            cursor.close()
            connection.close()
            flash('Error al guardar el archivo', 'error')
            return redirect(url_for('user.detalle_asesoria', codigo_asesoria=codigo_asesoria))
        
        # Save document information in the database
        cursor.execute("""
            INSERT INTO tbl_documento_solicitante (id_solicitante, id_documento_tipo, codigo_asesoria, nombre_archivo, ruta_archivo, descripcion, fecha_subida)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """, (asesoria['id_solicitante'], id_documento_tipo, codigo_asesoria, archivo.filename, filename, descripcion))
        
        connection.commit()
        
        # Create notification for the asesor if assigned
        if asesoria['id_asesor']:
            cursor.execute("SELECT id_usuario FROM tbl_asesor WHERE id_asesor = %s", (asesoria['id_asesor'],))
            asesor_user = cursor.fetchone()
            
            if asesor_user:
                cursor.execute("""
                    INSERT INTO tbl_notificacion (id_usuario, tipo, mensaje, leida, fecha_creacion)
                    VALUES (%s, 'documento', %s, 0, NOW())
                """, (asesor_user['id_usuario'], f"Nuevo documento subido en la asesoría {codigo_asesoria}"))
                
                connection.commit()
        
        cursor.close()
        connection.close()
        
        flash('Documento subido exitosamente', 'success')
        return redirect(url_for('user.detalle_asesoria', codigo_asesoria=codigo_asesoria))
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('user.detalle_asesoria', codigo_asesoria=codigo_asesoria))

@user_bp.route('/eliminar_documento/<int:id_documento>', methods=['POST'])
def eliminar_documento(id_documento):
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Verify that the document belongs to the current user
        cursor.execute("""
            SELECT ds.*, a.codigo_asesoria
            FROM tbl_documento_solicitante ds
            JOIN tbl_solicitante s ON ds.id_solicitante = s.id_solicitante
            JOIN tbl_asesoria a ON ds.codigo_asesoria = a.codigo_asesoria
            WHERE ds.id_documento = %s AND s.id_usuario = %s
        """, (id_documento, session['user_id']))
        
        documento = cursor.fetchone()
        
        if not documento:
            cursor.close()
            connection.close()
            flash('Documento no encontrado o no autorizado', 'error')
            return redirect(url_for('user.asesorias'))
        
        # Delete the document from the database
        cursor.execute("DELETE FROM tbl_documento_solicitante WHERE id_documento = %s", (id_documento,))
        connection.commit()
        
        # Delete the file from the server
        if documento['ruta_archivo']:
            try:
                file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'documentos', documento['ruta_archivo'])
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Error al eliminar archivo: {str(e)}")
        
        cursor.close()
        connection.close()
        
        flash('Documento eliminado exitosamente', 'success')
        return redirect(url_for('user.detalle_asesoria', codigo_asesoria=documento['codigo_asesoria']))
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('user.asesorias'))

@user_bp.route('/agendar_asesoria/<codigo_asesoria>')
def agendar_asesoria(codigo_asesoria):
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Verify that the asesoria belongs to the current user
        cursor.execute("""
            SELECT a.*, CONCAT(asesor.nombres, ' ', asesor.apellidos) as nombre_asesor
            FROM tbl_asesoria a
            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            LEFT JOIN tbl_asesor asesor ON a.id_asesor = asesor.id_asesor
            WHERE a.codigo_asesoria = %s AND s.id_usuario = %s
        """, (codigo_asesoria, session['user_id']))
        
        asesoria = cursor.fetchone()
        
        if not asesoria:
            cursor.close()
            connection.close()
            flash('Asesoría no encontrada o no autorizada', 'error')
            return redirect(url_for('user.asesorias'))
        
        # Check if the asesoria already has an asesor assigned
        if not asesoria['id_asesor']:
            # Get available asesores
            cursor.execute("""
                SELECT a.id_asesor, CONCAT(a.nombres, ' ', a.apellidos) as nombre, a.foto_perfil,
                       a.especialidad, a.calificacion, a.descripcion
                FROM tbl_asesor a
                WHERE a.activo = 1
                ORDER BY a.calificacion DESC
            """)
            
            asesores = cursor.fetchall()
            
            cursor.close()
            connection.close()
            
            return render_template('seleccionar_asesor.html', asesoria=asesoria, asesores=asesores)
        
        # Get available slots for the assigned asesor
        available_slots = get_available_slots(asesoria['id_asesor'])
        
        cursor.close()
        connection.close()
        
        return render_template('agendar_asesoria.html', asesoria=asesoria, available_slots=available_slots)
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('user.asesorias'))

@user_bp.route('/seleccionar_asesor', methods=['POST'])
def seleccionar_asesor():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    codigo_asesoria = request.form.get('codigo_asesoria')
    id_asesor = request.form.get('id_asesor')
    
    if not codigo_asesoria or not id_asesor:
        flash('Todos los campos son obligatorios', 'error')
        return redirect(url_for('user.asesorias'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Verify that the asesoria belongs to the current user
        cursor.execute("""
            SELECT a.codigo_asesoria
            FROM tbl_asesoria a
            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            WHERE a.codigo_asesoria = %s AND s.id_usuario = %s
        """, (codigo_asesoria, session['user_id']))
        
        asesoria = cursor.fetchone()
        
        if not asesoria:
            cursor.close()
            connection.close()
            flash('Asesoría no encontrada o no autorizada', 'error')
            return redirect(url_for('user.asesorias'))
        
        # Update the asesoria with the selected asesor
        cursor.execute("""
            UPDATE tbl_asesoria
            SET id_asesor = %s
            WHERE codigo_asesoria = %s
        """, (id_asesor, codigo_asesoria))
        
        connection.commit()
        
        # Create notification for the asesor
        cursor.execute("SELECT id_usuario FROM tbl_asesor WHERE id_asesor = %s", (id_asesor,))
        asesor_user = cursor.fetchone()
        
        if asesor_user:
            cursor.execute("""
                INSERT INTO tbl_notificacion (id_usuario, tipo, mensaje, leida, fecha_creacion)
                VALUES (%s, 'asesoria', %s, 0, NOW())
            """, (asesor_user['id_usuario'], f"Has sido asignado a la asesoría {codigo_asesoria}"))
            
            connection.commit()
        
        cursor.close()
        connection.close()
        
        flash('Asesor seleccionado exitosamente', 'success')
        return redirect(url_for('user.agendar_asesoria', codigo_asesoria=codigo_asesoria))
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('user.asesorias'))

@user_bp.route('/confirmar_horario', methods=['POST'])
def confirmar_horario():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    codigo_asesoria = request.form.get('codigo_asesoria')
    fecha_asesoria = request.form.get('fecha_asesoria')
    
    if not codigo_asesoria or not fecha_asesoria:
        flash('Todos los campos son obligatorios', 'error')
        return redirect(url_for('user.asesorias'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Verify that the asesoria belongs to the current user
        cursor.execute("""
            SELECT a.codigo_asesoria, a.id_asesor
            FROM tbl_asesoria a
            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            WHERE a.codigo_asesoria = %s AND s.id_usuario = %s
        """, (codigo_asesoria, session['user_id']))
        
        asesoria = cursor.fetchone()
        
        if not asesoria:
            cursor.close()
            connection.close()
            flash('Asesoría no encontrada o no autorizada', 'error')
            return redirect(url_for('user.asesorias'))
        
        # Convert fecha_asesoria to datetime
        try:
            fecha_dt = datetime.strptime(fecha_asesoria, '%Y-%m-%dT%H:%M')
        except ValueError:
            cursor.close()
            connection.close()
            flash('Formato de fecha inválido', 'error')
            return redirect(url_for('user.agendar_asesoria', codigo_asesoria=codigo_asesoria))
        
        # Try to reserve the slot
        success = reserve_appointment_slot(asesoria['id_asesor'], fecha_dt, codigo_asesoria)
        
        if success:
            # Update the asesoria with the selected date
            cursor.execute("""
                UPDATE tbl_asesoria
                SET fecha_asesoria = %s, estado = 'Programada'
                WHERE codigo_asesoria = %s
            """, (fecha_dt, codigo_asesoria))
            
            connection.commit()
            
            # Create notification for the asesor
            cursor.execute("SELECT id_usuario FROM tbl_asesor WHERE id_asesor = %s", (asesoria['id_asesor'],))
            asesor_user = cursor.fetchone()
            
            if asesor_user:
                cursor.execute("""
                    INSERT INTO tbl_notificacion (id_usuario, tipo, mensaje, leida, fecha_creacion)
                    VALUES (%s, 'asesoria', %s, 0, NOW())
                """, (asesor_user['id_usuario'], f"La asesoría {codigo_asesoria} ha sido programada para {fecha_dt.strftime('%d/%m/%Y %H:%M')}"))
                
                connection.commit()
            
            cursor.close()
            connection.close()
            
            flash('Horario confirmado exitosamente', 'success')
            return redirect(url_for('payment.pagos', codigo_asesoria=codigo_asesoria))
        else:
            cursor.close()
            connection.close()
            flash('El horario seleccionado ya no está disponible. Por favor, seleccione otro.', 'error')
            return redirect(url_for('user.agendar_asesoria', codigo_asesoria=codigo_asesoria))
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('user.asesorias'))

@user_bp.route('/documentos')
def documentos():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Get solicitante ID
        cursor.execute("SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s", (session['user_id'],))
        solicitante = cursor.fetchone()
        
        if not solicitante:
            cursor.close()
            connection.close()
            flash('No se encontró información de solicitante para este usuario', 'error')
            return redirect(url_for('user.dashboard'))
        
        # Get all documents for this solicitante
        cursor.execute("""
            SELECT ds.*, dt.nombre as tipo_documento, a.tipo_asesoria
            FROM tbl_documento_solicitante ds
            JOIN tbl_documento_tipo dt ON ds.id_documento_tipo = dt.id_documento_tipo
            LEFT JOIN tbl_asesoria a ON ds.codigo_asesoria = a.codigo_asesoria
            WHERE ds.id_solicitante = %s
            ORDER BY ds.fecha_subida DESC
        """, (solicitante['id_solicitante'],))
        
        documentos = cursor.fetchall()
        
        # Format dates for display
        for documento in documentos:
            if documento['fecha_subida']:
                documento['fecha_formateada'] = documento['fecha_subida'].strftime("%d/%m/%Y %H:%M")
            else:
                documento['fecha_formateada'] = "Desconocida"
        
        # Get document types for upload form
        cursor.execute("SELECT * FROM tbl_documento_tipo ORDER BY nombre")
        tipos_documento = cursor.fetchall()
        
        # Get asesorias for the document upload form
        cursor.execute("""
            SELECT codigo_asesoria, tipo_asesoria
            FROM tbl_asesoria
            WHERE id_solicitante = %s AND estado != 'Cancelada'
            ORDER BY fecha_creacion DESC
        """, (solicitante['id_solicitante'],))
        
        asesorias = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return render_template('documentos.html', 
                               documentos=documentos, 
                               tipos_documento=tipos_documento,
                               asesorias=asesorias,
                               id_solicitante=solicitante['id_solicitante'])
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('user.dashboard'))

@user_bp.route('/subir_documento_general', methods=['POST'])
def subir_documento_general():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    id_documento_tipo = request.form.get('id_documento_tipo')
    codigo_asesoria = request.form.get('codigo_asesoria')
    descripcion = request.form.get('descripcion')
    
    if not id_documento_tipo or 'archivo' not in request.files:
        flash('El tipo de documento y el archivo son obligatorios', 'error')
        return redirect(url_for('user.documentos'))
    
    archivo = request.files['archivo']
    
    if archivo.filename == '':
        flash('No se seleccionó ningún archivo', 'error')
        return redirect(url_for('user.documentos'))
    
    if not allowed_file(archivo.filename, ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']):
        flash('Tipo de archivo no permitido. Se permiten: PDF, JPG, JPEG, PNG, DOC, DOCX', 'error')
        return redirect(url_for('user.documentos'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Get solicitante ID
        cursor.execute("SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s", (session['user_id'],))
        solicitante = cursor.fetchone()
        
        if not solicitante:
            # Create solicitante record if it doesn't exist
            cursor.execute("""
                INSERT INTO tbl_solicitante (id_usuario)
                VALUES (%s)
            """, (session['user_id'],))
            
            connection.commit()
            
            # Get the newly created solicitante ID
            cursor.execute("SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s", (session['user_id'],))
            solicitante = cursor.fetchone()
        
        # If codigo_asesoria is provided, verify that it belongs to the current user
        if codigo_asesoria:
            cursor.execute("""
                SELECT codigo_asesoria
                FROM tbl_asesoria
                WHERE codigo_asesoria = %s AND id_solicitante = %s
            """, (codigo_asesoria, solicitante['id_solicitante']))
            
            if not cursor.fetchone():
                cursor.close()
                connection.close()
                flash('Asesoría no encontrada o no autorizada', 'error')
                return redirect(url_for('user.documentos'))
        
        # Generate a unique filename
        doc_prefix = codigo_asesoria if codigo_asesoria else f"general_{solicitante['id_solicitante']}"
        filename = secure_filename(f"{doc_prefix}_{uuid.uuid4().hex}.{archivo.filename.rsplit('.', 1)[1].lower()}")
        
        # Save the file
        filepath = save_file(archivo, filename, 'documentos')
        
        if not filepath:
            cursor.close()
            connection.close()
            flash('Error al guardar el archivo', 'error')
            return redirect(url_for('user.documentos'))
        
        # Save document information in the database
        cursor.execute("""
            INSERT INTO tbl_documento_solicitante (id_solicitante, id_documento_tipo, codigo_asesoria, nombre_archivo, ruta_archivo, descripcion, fecha_subida)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """, (solicitante['id_solicitante'], id_documento_tipo, codigo_asesoria, archivo.filename, filename, descripcion))
        
        connection.commit()
        
        cursor.close()
        connection.close()
        
        flash('Documento subido exitosamente', 'success')
        return redirect(url_for('user.documentos'))
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('user.documentos'))

@user_bp.route('/notificaciones')
def notificaciones():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Get all notifications for this user
        cursor.execute("""
            SELECT *
            FROM tbl_notificacion
            WHERE id_usuario = %s
            ORDER BY fecha_creacion DESC
        """, (session['user_id'],))
        
        notificaciones = cursor.fetchall()
        
        # Format dates for display
        for notificacion in notificaciones:
            if notificacion['fecha_creacion']:
                notificacion['fecha_formateada'] = notificacion['fecha_creacion'].strftime("%d/%m/%Y %H:%M")
            else:
                notificacion['fecha_formateada'] = "Desconocida"
        
        # Mark all notifications as read
        cursor.execute("""
            UPDATE tbl_notificacion
            SET leida = 1
            WHERE id_usuario = %s AND leida = 0
        """, (session['user_id'],))
        
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return render_template('notificaciones.html', notificaciones=notificaciones)
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('user.dashboard'))

@user_bp.route('/eliminar_notificacion/<int:id_notificacion>', methods=['POST'])
def eliminar_notificacion(id_notificacion):
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor()
        
        # Delete the notification if it belongs to the current user
        cursor.execute("""
            DELETE FROM tbl_notificacion
            WHERE id_notificacion = %s AND id_usuario = %s
        """, (id_notificacion, session['user_id']))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        flash('Notificación eliminada exitosamente', 'success')
        return redirect(url_for('user.notificaciones'))
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('user.notificaciones'))

@user_bp.route('/citas')
def citas():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Get solicitante ID
        cursor.execute("SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s", (session['user_id'],))
        solicitante = cursor.fetchone()
        
        if not solicitante:
            cursor.close()
            connection.close()
            flash('No se encontró información de solicitante para este usuario', 'error')
            return redirect(url_for('user.dashboard'))
        
        # Get upcoming appointments
        cursor.execute("""
            SELECT a.*, 
                   CONCAT(asesor.nombres, ' ', asesor.apellidos) as nombre_asesor,
                   asesor.foto_perfil as foto_asesor,
                   asesor.especialidad as especialidad_asesor
            FROM tbl_asesoria a
            LEFT JOIN tbl_asesor asesor ON a.id_asesor = asesor.id_asesor
            WHERE a.id_solicitante = %s AND a.fecha_asesoria > NOW() AND a.estado = 'Pagada'
            ORDER BY a.fecha_asesoria ASC
        """, (solicitante['id_solicitante'],))
        
        proximas_citas = cursor.fetchall()
        
        # Format dates for display
        for cita in proximas_citas:
            if cita['fecha_asesoria']:
                cita['fecha_formateada'] = cita['fecha_asesoria'].strftime("%d/%m/%Y %H:%M")
            else:
                cita['fecha_formateada'] = "No programada"
        
        # Get past appointments
        cursor.execute("""
            SELECT a.*, 
                   CONCAT(asesor.nombres, ' ', asesor.apellidos) as nombre_asesor,
                   asesor.foto_perfil as foto_asesor,
                   asesor.especialidad as especialidad_asesor
            FROM tbl_asesoria a
            LEFT JOIN tbl_asesor asesor ON a.id_asesor = asesor.id_asesor
            WHERE a.id_solicitante = %s AND 
                  ((a.fecha_asesoria < NOW() AND a.estado = 'Pagada') OR a.estado = 'Completada')
            ORDER BY a.fecha_asesoria DESC
        """, (solicitante['id_solicitante'],))
        
        citas_pasadas = cursor.fetchall()
        
        # Format dates for display
        for cita in citas_pasadas:
            if cita['fecha_asesoria']:
                cita['fecha_formateada'] = cita['fecha_asesoria'].strftime("%d/%m/%Y %H:%M")
            else:
                cita['fecha_formateada'] = "No programada"
        
        cursor.close()
        connection.close()
        
        return render_template('citas.html', 
                               proximas_citas=proximas_citas, 
                               citas_pasadas=citas_pasadas)
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('user.dashboard'))

@user_bp.route('/unirse_videollamada/<codigo_asesoria>')
def unirse_videollamada(codigo_asesoria):
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Verify that the asesoria belongs to the current user
        cursor.execute("""
            SELECT a.*, 
                   CONCAT(asesor.nombres, ' ', asesor.apellidos) as nombre_asesor,
                   asesor.foto_perfil as foto_asesor
            FROM tbl_asesoria a
            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            LEFT JOIN tbl_asesor asesor ON a.id_asesor = asesor.id_asesor
            WHERE a.codigo_asesoria = %s AND s.id_usuario = %s
        """, (codigo_asesoria, session['user_id']))
        
        asesoria = cursor.fetchone()
        
        if not asesoria:
            cursor.close()
            connection.close()
            flash('Asesoría no encontrada o no autorizada', 'error')
            return redirect(url_for('user.citas'))
        
        # Check if the asesoria is paid and scheduled
        if asesoria['estado'] != 'Pagada' or not asesoria['fecha_asesoria']:
            cursor.close()
            connection.close()
            flash('Esta asesoría no está lista para videollamada', 'error')
            return redirect(url_for('user.citas'))
        
        # Check if it's time for the appointment (within 10 minutes before or after)
        now = datetime.now()
        appointment_time = asesoria['fecha_asesoria']
        time_diff = abs((now - appointment_time).total_seconds() / 60)
        
        if time_diff > 10:
            cursor.close()
            connection.close()
            flash('Solo puedes unirte a la videollamada 10 minutos antes o después de la hora programada', 'error')
            return redirect(url_for('user.citas'))
        
        # Get or create video call link
        if not asesoria['enlace_videollamada']:
            # Generate a unique video call link
            video_link = f"https://meet.jit.si/{codigo_asesoria}-{uuid.uuid4().hex[:8]}"
            
            # Update the asesoria with the video link
            cursor.execute("""
                UPDATE tbl_asesoria
                SET enlace_videollamada = %s
                WHERE codigo_asesoria = %s
            """, (video_link, codigo_asesoria))
            
            connection.commit()
        else:
            video_link = asesoria['enlace_videollamada']
        
        cursor.close()
        connection.close()
        
        return render_template('videollamada.html', asesoria=asesoria, video_link=video_link)
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('user.citas'))

@user_bp.route('/calificar_asesoria', methods=['POST'])
def calificar_asesoria():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    codigo_asesoria = request.form.get('codigo_asesoria')
    calificacion = request.form.get('calificacion')
    comentario = request.form.get('comentario')
    
    if not codigo_asesoria or not calificacion:
        flash('La calificación es obligatoria', 'error')
        return redirect(url_for('user.citas'))
    
    try:
        calificacion = int(calificacion)
        if calificacion < 1 or calificacion > 5:
            raise ValueError("Calificación fuera de rango")
    except ValueError:
        flash('La calificación debe ser un número entre 1 y 5', 'error')
        return redirect(url_for('user.citas'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Verify that the asesoria belongs to the current user
        cursor.execute("""
            SELECT a.codigo_asesoria, a.id_asesor, a.estado
            FROM tbl_asesoria a
            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            WHERE a.codigo_asesoria = %s AND s.id_usuario = %s
        """, (codigo_asesoria, session['user_id']))
        
        asesoria = cursor.fetchone()
        
        if not asesoria:
            cursor.close()
            connection.close()
            flash('Asesoría no encontrada o no autorizada', 'error')
            return redirect(url_for('user.citas'))
        
        # Check if the asesoria is completed or paid
        if asesoria['estado'] not in ['Completada', 'Pagada']:
            cursor.close()
            connection.close()
            flash('Solo puedes calificar asesorías completadas o pagadas', 'error')
            return redirect(url_for('user.citas'))
        
        # Check if the asesoria has already been rated
        cursor.execute("""
            SELECT id_calificacion
            FROM tbl_calificacion_asesoria
            WHERE codigo_asesoria = %s
        """, (codigo_asesoria,))
        
        if cursor.fetchone():
            cursor.close()
            connection.close()
            flash('Esta asesoría ya ha sido calificada', 'error')
            return redirect(url_for('user.citas'))
        
        # Start transaction
        connection.start_transaction()
        
        try:
            # Register the rating
            cursor.execute("""
                INSERT INTO tbl_calificacion_asesoria (codigo_asesoria, calificacion, comentario, fecha_calificacion)
                VALUES (%s, %s, %s, NOW())
            """, (codigo_asesoria, calificacion, comentario))
            
            # Update the asesoria status to "Completada" if it's not already
            if asesoria['estado'] != 'Completada':
                cursor.execute("""
                    UPDATE tbl_asesoria
                    SET estado = 'Completada'
                    WHERE codigo_asesoria = %s
                """, (codigo_asesoria,))
            
            # Update the asesor's average rating
            if asesoria['id_asesor']:
                cursor.execute("""
                    UPDATE tbl_asesor
                    SET calificacion = (
                        SELECT AVG(ca.calificacion)
                        FROM tbl_calificacion_asesoria ca
                        JOIN tbl_asesoria a ON ca.codigo_asesoria = a.codigo_asesoria
                        WHERE a.id_asesor = %s
                    )
                    WHERE id_asesor = %s
                """, (asesoria['id_asesor'], asesoria['id_asesor']))
            
            # Commit the transaction
            connection.commit()
            flash('Asesoría calificada exitosamente', 'success')
        except Error as e:
            connection.rollback()
            flash(f'Error al calificar la asesoría: {str(e)}', 'error')
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
    
    return redirect(url_for('user.citas'))

@user_bp.route('/get_notificaciones_count')
def get_notificaciones_count():
    if 'user_id' not in session:
        return jsonify({'count': 0})
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Get count of unread notifications
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM tbl_notificacion
            WHERE id_usuario = %s AND leida = 0
        """, (session['user_id'],))
        
        result = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        return jsonify({'count': result['count'] if result else 0})
    else:
        return jsonify({'count': 0})

@user_bp.route('/get_available_slots/<int:id_asesor>')
def get_available_slots_route(id_asesor):
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    available_slots = get_available_slots(id_asesor)
    
    return jsonify(available_slots)

@user_bp.route('/reserve_slot', methods=['POST'])
def reserve_slot():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    data = request.get_json()
    id_asesor = data.get('id_asesor')
    fecha = data.get('fecha')
    codigo_asesoria = data.get('codigo_asesoria')
    
    if not id_asesor or not fecha or not codigo_asesoria:
        return jsonify({'error': 'Faltan parámetros requeridos'}), 400
    
    try:
        fecha_dt = datetime.strptime(fecha, '%Y-%m-%dT%H:%M')
    except ValueError:
        return jsonify({'error': 'Formato de fecha inválido'}), 400
    
    # Verify that the asesoria belongs to the current user
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT a.codigo_asesoria
            FROM tbl_asesoria a
            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            WHERE a.codigo_asesoria = %s AND s.id_usuario = %s
        """, (codigo_asesoria, session['user_id']))
        
        asesoria = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        if not asesoria:
            return jsonify({'error': 'Asesoría no encontrada o no autorizada'}), 404
    else:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    
    success = reserve_appointment_slot(id_asesor, fecha_dt, codigo_asesoria)
    
    if success:
        return jsonify({'success': True})
    else:
        return jsonify({'error': 'El horario seleccionado ya no está disponible'}), 409

@user_bp.route('/buscar_asesorias', methods=['GET'])
def buscar_asesorias():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    query = request.args.get('q', '')
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Get solicitante ID
        cursor.execute("SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s", (session['user_id'],))
        solicitante = cursor.fetchone()
        
        if not solicitante:
            cursor.close()
            connection.close()
            flash('No se encontró información de solicitante para este usuario', 'error')
            return redirect(url_for('user.dashboard'))
        
        # Search asesorias
        cursor.execute("""
            SELECT a.*, 
                   CONCAT(asesor.nombres, ' ', asesor.apellidos) as nombre_asesor,
                   asesor.foto_perfil as foto_asesor,
                   (SELECT COUNT(*) FROM tbl_documento_solicitante ds WHERE ds.id_solicitante = a.id_solicitante) as total_documentos,
                   (SELECT COUNT(*) FROM tbl_pago_asesoria pa WHERE pa.codigo_asesoria = a.codigo_asesoria AND pa.estado_pago = 'Completado') as pago_completado
            FROM tbl_asesoria a
            LEFT JOIN tbl_asesor asesor ON a.id_asesor = asesor.id_asesor
            WHERE a.id_solicitante = %s AND 
                  (a.codigo_asesoria LIKE %s OR 
                   a.tipo_asesoria LIKE %s OR 
                   a.descripcion LIKE %s OR 
                   CONCAT(asesor.nombres, ' ', asesor.apellidos) LIKE %s)
            ORDER BY a.fecha_creacion DESC
        """, (
            solicitante['id_solicitante'], 
            f'%{query}%', 
            f'%{query}%', 
            f'%{query}%', 
            f'%{query}%'
        ))
        
        asesorias = cursor.fetchall()
        
        # Format dates for display
        for asesoria in asesorias:
            if asesoria['fecha_asesoria']:
                asesoria['fecha_formateada'] = asesoria['fecha_asesoria'].strftime("%d/%m/%Y %H:%M")
            else:
                asesoria['fecha_formateada'] = "No programada"
            
            if asesoria['fecha_creacion']:
                asesoria['creacion_formateada'] = asesoria['fecha_creacion'].strftime("%d/%m/%Y")
            else:
                asesoria['creacion_formateada'] = "Desconocida"
        
        cursor.close()
        connection.close()
        
        return render_template('resultados_busqueda.html', asesorias=asesorias, query=query)
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('user.dashboard'))

@user_bp.route('/exportar_documentos/<codigo_asesoria>')
def exportar_documentos(codigo_asesoria):
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Verify that the asesoria belongs to the current user
        cursor.execute("""
            SELECT a.codigo_asesoria, a.id_solicitante
            FROM tbl_asesoria a
            JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            WHERE a.codigo_asesoria = %s AND s.id_usuario = %s
        """, (codigo_asesoria, session['user_id']))
        
        asesoria = cursor.fetchone()
        
        if not asesoria:
            cursor.close()
            connection.close()
            flash('Asesoría no encontrada o no autorizada', 'error')
            return redirect(url_for('user.asesorias'))
        
        # Get documents for this asesoria
        cursor.execute("""
            SELECT ds.*, dt.nombre as tipo_documento
            FROM tbl_documento_solicitante ds
            JOIN tbl_documento_tipo dt ON ds.id_documento_tipo = dt.id_documento_tipo
            WHERE ds.id_solicitante = %s AND ds.codigo_asesoria = %s
            ORDER BY ds.fecha_subida DESC
        """, (asesoria['id_solicitante'], codigo_asesoria))
        
        documentos = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        # Generate a ZIP file with all documents
        import zipfile
        from io import BytesIO
        from flask import send_file
        
        memory_file = BytesIO()
        with zipfile.ZipFile(memory_file, 'w') as zf:
            for documento in documentos:
                try:
                    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'documentos', documento['ruta_archivo'])
                    if os.path.exists(file_path):
                        # Use original filename with document type prefix
                        safe_filename = secure_filename(f"{documento['tipo_documento']}_{documento['nombre_archivo']}")
                        zf.write(file_path, safe_filename)
                except Exception as e:
                    print(f"Error al agregar archivo al ZIP: {str(e)}")
        
        memory_file.seek(0)
        
        return send_file(
            memory_file,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f'documentos_asesoria_{codigo_asesoria}.zip'
        )
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('user.asesorias'))

# Este return debe estar al final del archivo, fuera de cualquier función
# y sin indentación para devolver el blueprint después de definir todas las rutas
