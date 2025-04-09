from flask import Blueprint, request, redirect, url_for, flash, render_template, session, jsonify, send_file, make_response
from config.database import create_connection
from mysql.connector import Error
from werkzeug.utils import secure_filename
from datetime import datetime
import random
import string
import os
from utils.file_utils import allowed_file, save_file
from utils.pdf_utils import generate_visa_report

formularios_bp = Blueprint('formularios', __name__)

@formularios_bp.route('/lista')
def lista():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("""
                SELECT fe.id_formElegibilidad, CONCAT(u.nombres, ' ', u.apellidos) as solicitante, 
                    fe.motivo_viaje, fe.codigo_pasaporte, fe.pais_residencia, fe.provincia_destino
                FROM tbl_form_eligibilidadCVA fe
                JOIN tbl_solicitante s ON fe.id_solicitante = s.id_solicitante
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            """)
            formularios = cursor.fetchall()
            return render_template('formularios/lista.html', formularios=formularios)
        except Exception as e:
            print(f"Error en la consulta: {e}")
            flash('Error al cargar los formularios', 'error')
            return redirect(url_for('index'))
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('index'))

@formularios_bp.route('/solicitud')
def solicitud():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    return render_template('formulario_solicitud.html')

@formularios_bp.route('/procesar_formulario', methods=['POST'])
def procesar_formulario():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    # Obtener datos del formulario
    proposito = request.form.get('proposito')
    tiempo_estadia = request.form.get('tiempo_estadia')
    pais_residencia = request.form.get('pais_residencia')
    fecha_nacimiento = request.form.get('fecha_nacimiento')
    familiar_canada = request.form.get('familiar_canada')
    relacion_familiar = request.form.get('relacion_familiar')
    residente_permanente = request.form.get('residente_permanente')
    estado_civil = request.form.get('estado_civil')
    provincia_destino = request.form.get('provincia_destino')
    
    proposito_principal = request.form.get('proposito_principal')
    empleo_origen = request.form.get('empleo_origen')
    dependencia_economica = request.form.get('dependencia_economica')
    viajes_previos = request.form.get('viajes_previos')
    acompana_familiar = request.form.get('acompana_familiar')
    antecedentes_penales = request.form.get('antecedentes_penales')
    examenes_medicos = request.form.get('examenes_medicos')
    pago_online = request.form.get('pago_online')
    metodo_pago = request.form.get('metodo_pago')
    
    # Procesar archivos
    archivos = {}
    for campo in ['doc_historial_viajes', 'doc_recursos_financieros', 'doc_relaciones_familiares', 'doc_hoja_vida']:
        if campo in request.files and request.files[campo].filename:
            archivo = request.files[campo]
            if allowed_file(archivo.filename, ['pdf', 'jpg', 'jpeg', 'png']):
                filename = save_file(archivo, secure_filename(f"{campo}_{session['user_id']}_{int(datetime.now().timestamp())}.{archivo.filename.rsplit('.', 1)[1].lower()}"), 'documentos_solicitud')
                archivos[campo] = filename
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        try:
            # Iniciar transacción
            connection.start_transaction()
            
            # Obtener id_solicitante
            cursor.execute("SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s", (session['user_id'],))
            solicitante = cursor.fetchone()
            
            if not solicitante:
                # Crear registro de solicitante si no existe
                cursor.execute("""
                    INSERT INTO tbl_solicitante (id_usuario, pais_residencia, fecha_nacimiento)
                    VALUES (%s, %s, %s)
                """, (session['user_id'], pais_residencia, fecha_nacimiento))
                
                connection.commit()
                
                # Obtener el id_solicitante recién creado
                cursor.execute("SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s", (session['user_id'],))
                solicitante = cursor.fetchone()
            else:
                # Actualizar datos del solicitante
                cursor.execute("""
                    UPDATE tbl_solicitante
                    SET pais_residencia = %s, fecha_nacimiento = %s
                    WHERE id_solicitante = %s
                """, (pais_residencia, fecha_nacimiento, solicitante['id_solicitante']))
            
            # Generar código único para la solicitud
            codigo_solicitud = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            
            # Guardar la solicitud
            cursor.execute("""
                INSERT INTO tbl_solicitud_visa (
                    codigo_solicitud, id_solicitante, proposito, tiempo_estadia, 
                    familiar_canada, relacion_familiar, residente_permanente, 
                    estado_civil, provincia_destino, proposito_principal, 
                    empleo_origen, dependencia_economica, viajes_previos, 
                    acompana_familiar, antecedentes_penales, examenes_medicos, 
                    pago_online, metodo_pago, estado, fecha_creacion
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Pendiente', NOW()
                )
            """, (
                codigo_solicitud, solicitante['id_solicitante'], proposito, tiempo_estadia,
                familiar_canada, relacion_familiar, residente_permanente,
                estado_civil, provincia_destino, proposito_principal,
                empleo_origen, dependencia_economica, viajes_previos,
                acompana_familiar, antecedentes_penales, examenes_medicos,
                pago_online, metodo_pago
            ))
            
            # Guardar documentos
            for campo, filename in archivos.items():
                tipo_documento = campo.replace('doc_', '')
                cursor.execute("""
                    INSERT INTO tbl_documento_solicitud (
                        codigo_solicitud, tipo_documento, ruta_archivo, fecha_subida
                    ) VALUES (%s, %s, %s, NOW())
                """, (codigo_solicitud, tipo_documento, filename))
            
            # Crear notificación para el usuario
            cursor.execute("""
                INSERT INTO tbl_notificacion (id_usuario, tipo, mensaje, leida, fecha_creacion)
                VALUES (%s, 'solicitud', %s, 0, NOW())
            """, (session['user_id'], f"Tu solicitud de visa ha sido recibida. Código: {codigo_solicitud}"))
            
            # Crear notificación para administradores
            cursor.execute("""
                INSERT INTO tbl_notificacion (id_usuario, tipo, mensaje, leida, fecha_creacion)
                SELECT id_usuario, 'admin', %s, 0, NOW()
                FROM tbl_usuario
                WHERE rol = 'admin'
            """, (f"Nueva solicitud de visa recibida. Código: {codigo_solicitud}",))
            
            # Confirmar transacción
            connection.commit()
            
            flash('Solicitud enviada exitosamente. Pronto nos pondremos en contacto contigo.', 'success')
            return redirect(url_for('formularios.solicitud'))
            
        except Error as e:
            connection.rollback()
            flash(f'Error al procesar la solicitud: {str(e)}', 'error')
            return redirect(url_for('formularios.solicitud'))
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('formularios.solicitud'))

@formularios_bp.route('/generar_reporte_pdf')
def generar_reporte_pdf():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    # Obtener datos del formulario desde los parámetros de la URL
    form_data = request.args.to_dict()
    
    # Obtener nombres de archivos si existen
    for field in ['doc_historial_viajes', 'doc_recursos_financieros', 'doc_relaciones_familiares', 'doc_hoja_vida']:
        if field in request.files and request.files[field].filename:
            form_data[f'{field}_filename'] = request.files[field].filename
    
    # Generar el PDF
    pdf_buffer = generate_visa_report(form_data)
    
    # Enviar el archivo al cliente
    return send_file(
        pdf_buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'reporte_visa_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf'
    )

@formularios_bp.route('/vista_previa_reporte')
def vista_previa_reporte():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    # Obtener datos del formulario desde los parámetros de la URL
    form_data = request.args.to_dict()
    
    # Generar el PDF
    pdf_buffer = generate_visa_report(form_data)
    
    # Crear respuesta con el PDF incrustado
    response = make_response(pdf_buffer.getvalue())
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = 'inline; filename=vista_previa_reporte.pdf'
    
    return response

