from flask import Blueprint, request, redirect, url_for, flash, render_template, session, jsonify
from config.database import create_connection
from utils.auth_helpers import login_required
from datetime import datetime
import os
import uuid

formulario_bp = Blueprint('formularios', __name__)

@formulario_bp.route('/solicitud')
@login_required
def solicitud():
    """
    Renderiza el formulario de solicitud de visa.
    """
    return render_template('formulario_solicitud.html')

@formulario_bp.route('/procesar_formulario', methods=['POST'])
@login_required
def procesar_formulario():
    """
    Procesa el formulario de solicitud enviado por el usuario.
    """
    if 'user_id' not in session:
        flash('Debe iniciar sesión para enviar una solicitud', 'error')
        return redirect(url_for('auth.login'))
    
    try:
        # Obtener datos del formulario
        form_data = request.form
        files = request.files
        
        # Validar datos básicos
        required_fields = ['proposito', 'tiempo_estadia', 'pais_residencia', 'fecha_nacimiento', 
                          'estado_civil', 'provincia_destino', 'proposito_principal']
        
        for field in required_fields:
            if field not in form_data or not form_data[field]:
                flash(f'El campo {field} es obligatorio', 'error')
                return redirect(url_for('formularios.solicitud'))
        
        # Crear conexión a la base de datos
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            try:
                # Verificar si el usuario ya tiene un registro de solicitante
                cursor.execute("SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s", (session['user_id'],))
                solicitante = cursor.fetchone()
                
                # Si no existe, crear un nuevo registro de solicitante
                if not solicitante:
                    cursor.execute("""
                        INSERT INTO tbl_solicitante (id_usuario, fecha_creacion)
                        VALUES (%s, NOW())
                    """, (session['user_id'],))
                    connection.commit()
                    
                    # Obtener el ID del solicitante recién creado
                    cursor.execute("SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s", (session['user_id'],))
                    solicitante = cursor.fetchone()
                
                id_solicitante = solicitante['id_solicitante']
                
                # Generar un código único para la solicitud
                codigo_solicitud = f"SOL-{uuid.uuid4().hex[:8].upper()}"
                
                # Insertar la solicitud en la base de datos
                cursor.execute("""
                    INSERT INTO tbl_solicitud (
                        id_solicitante, codigo_solicitud, proposito, tiempo_estadia, 
                        pais_residencia, fecha_nacimiento, familiar_canada, relacion_familiar,
                        residente_permanente, estado_civil, provincia_destino, proposito_principal,
                        empleo_origen, dependencia_economica, viajes_previos, acompana_familiar,
                        antecedentes_penales, examenes_medicos, pago_online, metodo_pago,
                        fecha_creacion, estado
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), 'pendiente'
                    )
                """, (
                    id_solicitante, codigo_solicitud, form_data.get('proposito'), form_data.get('tiempo_estadia'),
                    form_data.get('pais_residencia'), form_data.get('fecha_nacimiento'), 
                    form_data.get('familiar_canada'), form_data.get('relacion_familiar', None),
                    form_data.get('residente_permanente'), form_data.get('estado_civil'),
                    form_data.get('provincia_destino'), form_data.get('proposito_principal'),
                    form_data.get('empleo_origen'), form_data.get('dependencia_economica'),
                    form_data.get('viajes_previos'), form_data.get('acompana_familiar'),
                    form_data.get('antecedentes_penales'), form_data.get('examenes_medicos'),
                    form_data.get('pago_online'), form_data.get('metodo_pago', None)
                ))
                
                # Obtener el ID de la solicitud recién creada
                cursor.execute("SELECT id_solicitud FROM tbl_solicitud WHERE codigo_solicitud = %s", (codigo_solicitud,))
                solicitud = cursor.fetchone()
                id_solicitud = solicitud['id_solicitud']
                
                # Procesar archivos adjuntos
                upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'uploads', 'documentos')
                os.makedirs(upload_dir, exist_ok=True)
                
                # Lista de archivos a procesar
                file_fields = ['doc_historial_viajes', 'doc_recursos_financieros', 'doc_relaciones_familiares', 'doc_hoja_vida']
                
                for field in file_fields:
                    if field in files and files[field].filename:
                        file = files[field]
                        # Generar un nombre de archivo único
                        filename = f"{uuid.uuid4().hex}_{file.filename}"
                        file_path = os.path.join(upload_dir, filename)
                        
                        # Guardar el archivo
                        file.save(file_path)
                        
                        # Registrar el archivo en la base de datos
                        cursor.execute("""
                            INSERT INTO tbl_documentos (id_solicitud, tipo_documento, nombre_archivo, ruta_archivo, fecha_carga)
                            VALUES (%s, %s, %s, %s, NOW())
                        """, (id_solicitud, field, file.filename, filename))
                
                connection.commit()
                flash('Solicitud enviada correctamente. Nos pondremos en contacto contigo pronto.', 'success')
                return redirect(url_for('user.dashboard'))
                
            except Exception as e:
                connection.rollback()
                flash(f'Error al procesar la solicitud: {str(e)}', 'error')
                return redirect(url_for('formularios.solicitud'))
            finally:
                cursor.close()
                connection.close()
        else:
            flash('Error de conexión a la base de datos', 'error')
            return redirect(url_for('formularios.solicitud'))
    
    except Exception as e:
        flash(f'Error al procesar la solicitud: {str(e)}', 'error')
        return redirect(url_for('formularios.solicitud'))

@formulario_bp.route('/generar_reporte_pdf')
@login_required
def generar_reporte_pdf():
    """
    Genera un reporte PDF con los datos de la solicitud.
    """
    # Aquí iría la lógica para generar el PDF
    # Por ahora, simplemente redirigimos a la página de solicitud
    flash('Funcionalidad de generación de PDF en desarrollo', 'info')
    return redirect(url_for('formularios.solicitud'))

@formulario_bp.route('/vista_previa_reporte')
@login_required
def vista_previa_reporte():
    """
    Muestra una vista previa del reporte de solicitud.
    """
    # Aquí iría la lógica para mostrar la vista previa
    # Por ahora, simplemente redirigimos a la página de solicitud
    flash('Funcionalidad de vista previa en desarrollo', 'info')
    return redirect(url_for('formularios.solicitud'))
