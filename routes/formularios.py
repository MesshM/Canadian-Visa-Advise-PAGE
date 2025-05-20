from flask import Blueprint, request, redirect, url_for, flash, render_template, session, jsonify
from config.database import create_connection
from utils.auth_helpers import login_required
from datetime import datetime
import os
import uuid
import traceback
import threading
import time
from utils.notification import notify_form_submitted, notify_form_incomplete, check_incomplete_forms

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
        
        # Imprimir datos para depuración
        print("Datos del formulario recibidos:")
        for key, value in form_data.items():
            print(f"{key}: {value}")
        
        print("Archivos recibidos:")
        for key in files:
            if files[key].filename:
                print(f"{key}: {files[key].filename}")
        
        # Validar datos básicos
        required_fields = ['proposito', 'tiempo_estadia', 'pais_residencia', 'fecha_nacimiento', 
                          'estado_civil', 'provincia_destino', 'proposito_principal']
        
        for field in required_fields:
            if field not in form_data or not form_data[field]:
                flash(f'El campo {field} es obligatorio', 'error')
                # Notificar que el formulario está incompleto
                notify_form_incomplete(session['user_id'])
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
                
                # Insertar datos en la tabla tbl_form_eligibilidadCVA
                try:
                    cursor.execute("""
                        INSERT INTO tbl_form_eligibilidadCVA (
                            motivo_viaje, pais_residencia, familiares_canada,
                            relacion_familiares_can, estado_civil, provincia_destino, 
                            trabajo_actual, negocios_actuales, co_deudor, 
                            viajes_recientes, acompanante_canada, antecedente_judiciales, 
                            examenes_medicos, aplicacion_familiares, acceso_aplicacion, 
                            biometricos_canada, pago_tasas, metodo_pago, id_solicitante
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                    """, (
                        form_data.get('proposito'), 
                        form_data.get('pais_residencia'),
                        form_data.get('familiar_canada', 'No'), 
                        form_data.get('relacion_familiar', 'N/A'),
                        form_data.get('estado_civil'),
                        form_data.get('provincia_destino'),
                        form_data.get('empleo_origen', 'No'),
                        form_data.get('negocios_actuales', 'No'),
                        form_data.get('dependencia_economica', 'No'),
                        form_data.get('viajes_previos', 'No'),
                        form_data.get('acompana_familiar', 'No'),
                        form_data.get('antecedentes_penales', 'No'),
                        form_data.get('examenes_medicos', 'No'),
                        form_data.get('aplicacion_familiares', 'No'),
                        form_data.get('acceso_aplicacion', 'Sí'),
                        form_data.get('biometricos_canada', 'No'),
                        form_data.get('pago_online', 'Sí'),
                        form_data.get('metodo_pago', 'Tarjeta de crédito'),
                        id_solicitante
                    ))
                except Exception as e:
                    print(f"Error al insertar en tbl_form_eligibilidadCVA: {str(e)}")
                    print(traceback.format_exc())
                    raise
                
                # Obtener el ID del formulario de elegibilidad recién creado
                cursor.execute("SELECT LAST_INSERT_ID() as id_formElegibilidad")
                form_elegibilidad = cursor.fetchone()
                id_formElegibilidad = form_elegibilidad['id_formElegibilidad']
                
                # Procesar archivos adjuntos
                upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'uploads', 'documentos')
                os.makedirs(upload_dir, exist_ok=True)
                
                # Mapeo de campos de archivos a campos en la tabla tbl_documentos_adjuntos
                file_field_mapping = {
                    'doc_historial_viajes': 'historial_viajes',
                    'doc_recursos_financieros': 'comprobante_recursos_financieros',
                    'doc_relaciones_familiares': 'informacion_familiar',
                    'doc_hoja_vida': 'aplicacion_IMM5257'
                }
                
                # Inicializar diccionario para almacenar rutas de archivos
                document_paths = {
                    'historial_viajes': None,
                    'pasaporte': None,
                    'comprobante_recursos_financieros': None,
                    'comprobante_mediosApoyo': None,
                    'foto_digital': None,
                    'proposito_viaje': None,
                    'prueba_estadoCivil': None,
                    'informacion_familiar': None,
                    'aplicacion_IMM5257': None,
                    'informacion_cliente': None
                }
                
                # Procesar cada archivo
                for field_name, db_field in file_field_mapping.items():
                    if field_name in files and files[field_name].filename:
                        file = files[field_name]
                        # Generar un nombre de archivo único
                        filename = f"{uuid.uuid4().hex}_{file.filename}"
                        file_path = os.path.join(upload_dir, filename)
                        
                        # Guardar el archivo
                        file.save(file_path)
                        
                        # Almacenar la ruta del archivo
                        document_paths[db_field] = filename
                
                # Insertar en la tabla tbl_documentos_adjuntos
                try:
                    cursor.execute("""
                        INSERT INTO tbl_documentos_adjuntos (
                            historial_viajes, pasaporte, comprobante_recursos_financieros,
                            comprobante_mediosApoyo, foto_digital, proposito_viaje,
                            prueba_estadoCivil, informacion_familiar, aplicacion_IMM5257,
                            informacion_cliente, id_formElegibilidad
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                    """, (
                        document_paths['historial_viajes'],
                        document_paths['pasaporte'],
                        document_paths['comprobante_recursos_financieros'],
                        document_paths['comprobante_mediosApoyo'],
                        document_paths['foto_digital'],
                        document_paths['proposito_viaje'],
                        document_paths['prueba_estadoCivil'],
                        document_paths['informacion_familiar'],
                        document_paths['aplicacion_IMM5257'],
                        document_paths['informacion_cliente'],
                        id_formElegibilidad
                    ))
                except Exception as e:
                    print(f"Error al insertar en tbl_documentos_adjuntos: {str(e)}")
                    print(traceback.format_exc())
                    raise
                
                connection.commit()
                
                # Notificar que el formulario ha sido enviado correctamente
                notify_form_submitted(session['user_id'], id_formElegibilidad)
                
                flash('Formulario enviado correctamente. Nuestros asesores revisarán su caso y le brindarán asistencia pronto.', 'success')
                success_url = url_for('formularios.solicitud_exitosa', form_id=id_formElegibilidad)
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return jsonify({
                        'success': True,
                        'message': 'Formulario enviado correctamente. Nuestros asesores revisarán su caso y le brindarán asistencia pronto.',
                        'redirect': success_url
                    })
                return redirect(success_url)
                
            except Exception as e:
                connection.rollback()
                error_details = traceback.format_exc()
                print(f"Error al procesar la solicitud: {str(e)}")
                print(f"Detalles del error: {error_details}")
                
                # Notificar que el formulario está incompleto debido a un error
                notify_form_incomplete(session['user_id'])
                
                flash(f'Error al procesar la solicitud: {str(e)}', 'error')
                return redirect(url_for('formularios.solicitud'))
            finally:
                cursor.close()
                connection.close()
        else:
            flash('Error de conexión a la base de datos', 'error')
            return redirect(url_for('formularios.solicitud'))
    
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"Error general: {str(e)}")
        print(f"Detalles del error: {error_details}")
        
        # Notificar que el formulario está incompleto debido a un error general
        notify_form_incomplete(session['user_id'])
        
        flash(f'Error al procesar la solicitud: {str(e)}', 'error')
        return redirect(url_for('formularios.solicitud'))
@formulario_bp.route('/solicitud_exitosa/<int:form_id>')
@login_required
def solicitud_exitosa(form_id):
    """
    Muestra la página de éxito después de enviar el formulario.
    """
    return render_template('solicitud_exitosa.html', form_id=form_id)

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

def check_all_users_incomplete_forms():
    """
    Verifica formularios incompletos para todos los usuarios y crea notificaciones.
    """
    while True:
        try:
            connection = create_connection()
            if connection:
                cursor = connection.cursor(dictionary=True)
                
                # Obtener todos los usuarios
                cursor.execute("SELECT id_usuario FROM tbl_usuario")
                users = cursor.fetchall()
                
                for user in users:
                    # Verificar formularios incompletos para cada usuario
                    check_incomplete_forms(user['id_usuario'])
                
                cursor.close()
                connection.close()
        except Exception as e:
            print(f"Error al verificar formularios incompletos: {str(e)}")
        
        # Esperar 24 horas antes de la próxima verificación
        time.sleep(24 * 60 * 60)

# Iniciar el hilo para verificar formularios incompletos
verificacion_thread = threading.Thread(target=check_all_users_incomplete_forms, daemon=True)
verificacion_thread.start()