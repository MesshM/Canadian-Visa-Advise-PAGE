from flask import Blueprint, request, redirect, url_for, flash, render_template, session, jsonify
from config.database import create_connection
from utils.auth_helpers import login_required
from utils.notification import notify_form_submitted
from datetime import datetime
from utils.auth_helpers import role_required
import cloudinary
import cloudinary.uploader
from config.cloudinary_config import configure_cloudinary

# Crear el blueprint
formulario_bp = Blueprint('formularios', __name__)

@formulario_bp.route('/formularios')
@role_required('Usuario')
def formularios():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    cursor = connection.cursor(dictionary=True)
    user_id = session.get('user_id') # Este es el id_usuario que necesitamos
    
    cursor.execute("""
        SELECT s.id_solicitante
        FROM tbl_solicitante s
        INNER JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        WHERE u.id_usuario = %s
        ORDER BY s.id_solicitante DESC LIMIT 1
    """, (user_id,))
    row = cursor.fetchone()
    id_solicitante = row['id_solicitante'] if row else None
    
    cursor.close()
    connection.close()
    
    # Pasamos user_id (como id_usuario) a la plantilla
    return render_template('formulario_solicitud.html', id_solicitante=id_solicitante, id_usuario=user_id)

@formulario_bp.route('/asesorias_pagadas')
@role_required('Usuario')
@login_required
def obtener_asesorias_pagadas():
    """Obtener todas las asesorías con estado 'Pagada'"""
    try:
        connection = create_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Error de conexión a la base de datos'
            }), 500

        cursor = connection.cursor(dictionary=True)
        
        user_id = session.get('user_id')
        query = """
        SELECT 
            a.codigo_asesoria,
            a.fecha_asesoria,
            a.tipo_asesoria,
            a.nombre_asesor,
            a.especialidad,
            a.id_formElegibilidad,
            u.nombres,
            u.apellidos,
            u.correo,
            s.id_solicitante,
            COALESCE(fe.completado, 0) as completado,
            fe.motivo_viaje
        FROM tbl_asesoria a
        INNER JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
        INNER JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        LEFT JOIN tbl_form_eligibilidadCVA fe ON a.codigo_asesoria = fe.codigo_asesoria
        WHERE a.estado = 'Pagada' AND u.id_usuario = %s
        ORDER BY a.fecha_asesoria DESC
        """
        
        cursor.execute(query, (user_id,))
        asesorias = cursor.fetchall()
        
        for asesoria in asesorias:
            if asesoria['fecha_asesoria']:
                asesoria['fecha_asesoria'] = asesoria['fecha_asesoria'].isoformat()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'asesorias': asesorias
        })
        
    except Exception as e:
        print(f"Error al obtener asesorías pagadas: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error interno del servidor'
        }), 500

@formulario_bp.route('/verificar_documentos/<int:codigo_asesoria>')
@role_required('Usuario')
@login_required
def verificar_documentos_asesoria(codigo_asesoria):
    """Verificar el estado de los documentos de una asesoría específica"""
    try:
        connection = create_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Error de conexión a la base de datos'
            }), 500

        cursor = connection.cursor(dictionary=True)
        
        # Obtener información del formulario de elegibilidad
        query = """
        SELECT fe.*, a.tipo_asesoria
        FROM tbl_form_eligibilidadCVA fe
        INNER JOIN tbl_asesoria a ON fe.codigo_asesoria = a.codigo_asesoria
        INNER JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
        INNER JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        WHERE fe.codigo_asesoria = %s AND u.id_usuario = %s AND fe.completado = 1
        """
        
        user_id = session.get('user_id')
        cursor.execute(query, (codigo_asesoria, user_id))
        formulario = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        if not formulario:
            return jsonify({
                'success': False,
                'message': 'Formulario no encontrado'
            }), 404
        
        # Definir documentos requeridos por tipo de visa
        documentos_por_visa = {
            'Turismo': [
                {'name': 'doc_itinerario_viaje', 'label': 'Itinerario de viaje', 'required': True},
                {'name': 'doc_carta_motivacion', 'label': 'Carta de motivación o carta de intención', 'required': True},
                {'name': 'doc_carta_laboral', 'label': 'Carta laboral o de estudio', 'required': True},
                {'name': 'doc_certificados_propiedad', 'label': 'Certificados de propiedad', 'required': False},
                {'name': 'doc_extractos_bancarios', 'label': 'Declaraciones de renta o extractos bancarios', 'required': True},
                {'name': 'doc_carta_invitacion', 'label': 'Carta de invitación (si aplica)', 'required': False},
                {'name': 'doc_carta_invitacion_familiar', 'label': 'Carta de invitación del familiar en Canadá (si aplica)', 'required': False},
                {'name': 'doc_prueba_parentesco', 'label': 'Prueba de parentesco (si aplica)', 'required': False},
                {'name': 'doc_finanzas_familiar', 'label': 'Documentos financieros del familiar (si cubre gastos)', 'required': False},
            ],
            'Estudios': [
                {'name': 'doc_carta_aceptacion', 'label': 'Carta de aceptación de una institución educativa canadiense (DLI)', 'required': True},
                {'name': 'doc_pago_matricula', 'label': 'Comprobante de pago de matrícula', 'required': True},
                {'name': 'doc_pruebas_fondos', 'label': 'Pruebas de fondos para cubrir matrícula y manutención', 'required': True},
                {'name': 'doc_carta_motivacion_estudio', 'label': 'Carta de motivación para estudios', 'required': True},
                {'name': 'doc_historial_academico', 'label': 'Historial académico (diplomas, certificados, notas)', 'required': True},
                {'name': 'doc_examen_medico_estudio', 'label': 'Examen médico (si aplica)', 'required': False},
                {'name': 'doc_formulario_custodia', 'label': 'Formulario custodia (si es menor de edad)', 'required': False},
            ],
            'Trabajo Temporal': [
                {'name': 'doc_oferta_laboral', 'label': 'Oferta laboral firmada (Job Offer Letter)', 'required': True},
                {'name': 'doc_lmia', 'label': 'LMIA o documento de exención', 'required': True},
                {'name': 'doc_contrato_laboral', 'label': 'Contrato laboral', 'required': True},
                {'name': 'doc_certificados_experiencia', 'label': 'Certificados de experiencia laboral previa', 'required': True},
                {'name': 'doc_hoja_vida', 'label': 'Hoja de vida actualizada', 'required': True},
                {'name': 'doc_diplomas', 'label': 'Diplomas o certificados relacionados al cargo', 'required': True},
                {'name': 'doc_examen_medico', 'label': 'Examen médico (si aplica)', 'required': False},
                {'name': 'doc_carta_motivacion_trabajo', 'label': 'Carta de motivación (opcional)', 'required': False},
            ],
            'Negocios': [
                {'name': 'doc_carta_invitacion_negocios', 'label': 'Carta de invitación de la empresa canadiense', 'required': True},
                {'name': 'doc_registro_camara', 'label': 'Registro de Cámara de Comercio de la empresa solicitante', 'required': True},
                {'name': 'doc_certificados_bancarios_empresa', 'label': 'Certificados bancarios y financieros de la empresa', 'required': True},
                {'name': 'doc_itinerario_negocios', 'label': 'Itinerario de negocios', 'required': True},
                {'name': 'doc_carta_empleador', 'label': 'Carta del empleador (si aplica)', 'required': False},
                {'name': 'doc_contratos_comerciales', 'label': 'Contratos comerciales previos (si existen)', 'required': False},
                {'name': 'doc_vinculo_comercial', 'label': 'Documentación que demuestre vínculo comercial', 'required': True},
            ],
            'Residencia Permanente': [
                {'name': 'doc_idioma', 'label': 'Resultados del examen de idioma (IELTS/CELPIP)', 'required': True},
                {'name': 'doc_eca', 'label': 'Evaluación de credenciales académicas (ECA)', 'required': True},
                {'name': 'doc_pasaporte', 'label': 'Pasaporte vigente', 'required': True},
                {'name': 'doc_historial_laboral', 'label': 'Historial laboral (referencias, cartas laborales)', 'required': True},
                {'name': 'doc_carta_intencion_residencia', 'label': 'Carta de intención (por qué desea inmigrar)', 'required': True},
                {'name': 'doc_examen_medico_residencia', 'label': 'Resultados de exámenes médicos (cuando aplica)', 'required': False},
                {'name': 'doc_antecedentes', 'label': 'Certificado de antecedentes penales', 'required': True},
            ],
        }
        
        motivo_viaje = formulario.get('motivo_viaje')
        documentos_requeridos = documentos_por_visa.get(motivo_viaje, [])
        
        required_missing_documents = [] # Para la verificación de estado
        all_missing_documents = []      # Para la visualización en el modal (requeridos + opcionales faltantes)
        documentos_presentes = []
        
        for doc_config in documentos_requeridos:
            doc_value = formulario.get(doc_config['name'])
            doc_info = {
                'name': doc_config['name'],
                'label': doc_config['label'],
                'required': doc_config['required'],
                'present': bool(doc_value and doc_value.strip())
            }
            
            if doc_info['present']:
                documentos_presentes.append(doc_info)
            else:
                # El documento está faltando (sea requerido u opcional)
                all_missing_documents.append(doc_info)
                if doc_config['required']:
                    required_missing_documents.append(doc_info)
        
        # Determinar el estado del formulario basado SÓLO en los documentos requeridos faltantes
        tiene_documentos_faltantes = len(required_missing_documents) > 0
        estado_formulario = 'Pendiente' if tiene_documentos_faltantes else 'Completo'
        
        return jsonify({
            'success': True,
            'estado': estado_formulario,
            'documentos_faltantes': all_missing_documents, # Ahora envía TODOS los documentos faltantes
            'documentos_presentes': documentos_presentes,
            'motivo_viaje': motivo_viaje,
            'total_documentos': len(documentos_requeridos),
            'documentos_completados': len(documentos_presentes)
        })
        
    except Exception as e:
        print(f"Error al verificar documentos: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error interno del servidor'
        }), 500

@formulario_bp.route('/actualizar_documentos', methods=['POST'])
@role_required('Usuario')
@login_required
def actualizar_documentos():
    """Actualizar documentos faltantes de un formulario existente"""
    try:
        datos = request.get_json()
        
        if not datos:
            return jsonify({'success': False, 'message': 'No se recibieron datos'}), 400
        
        codigo_asesoria = datos.get('codigo_asesoria')
        if not codigo_asesoria:
            return jsonify({'success': False, 'message': 'Código de asesoría requerido'}), 400
        
        connection = create_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Error de conexión a la base de datos'}), 500

        cursor = connection.cursor()
        
        # Verificar que el formulario existe y pertenece al usuario
        user_id = session.get('user_id')
        cursor.execute("""
            SELECT fe.id_formElegibilidad 
            FROM tbl_form_eligibilidadCVA fe
            INNER JOIN tbl_asesoria a ON fe.codigo_asesoria = a.codigo_asesoria
            INNER JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
            INNER JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            WHERE fe.codigo_asesoria = %s AND u.id_usuario = %s AND fe.completado = 1
        """, (codigo_asesoria, user_id))
        
        formulario_existente = cursor.fetchone()
        if not formulario_existente:
            cursor.close()
            connection.close()
            return jsonify({'success': False, 'message': 'Formulario no encontrado'}), 404
        
        # Preparar campos para actualizar (solo documentos)
        campos_documentos = {}
        for key, value in datos.items():
            if key.startswith('doc_') and value and value.strip():
                campos_documentos[key] = value
        
        if not campos_documentos:
            cursor.close()
            connection.close()
            return jsonify({'success': False, 'message': 'No hay documentos para actualizar'}), 400
        
        # Construir query de actualización
        set_clauses = []
        valores = []
        for campo, valor in campos_documentos.items():
            set_clauses.append(f"{campo} = %s")
            valores.append(valor)
        
        valores.append(codigo_asesoria)
        
        query_update = f"""
            UPDATE tbl_form_eligibilidadCVA 
            SET {', '.join(set_clauses)}
            WHERE codigo_asesoria = %s
        """
        
        cursor.execute(query_update, valores)
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True, 
            'message': 'Documentos actualizados exitosamente',
            'documentos_actualizados': len(campos_documentos)
        })
        
    except Exception as e:
        print(f"Error al actualizar documentos: {str(e)}")
        if 'connection' in locals() and connection.is_connected():
            if 'cursor' in locals() and cursor:
                cursor.close()
            connection.close()
        return jsonify({'success': False, 'message': f'Error interno del servidor: {str(e)}'}), 500

@formulario_bp.route('/procesar_elegibilidad', methods=['POST'])
@role_required('Usuario')
@login_required
def procesar_formulario_elegibilidad():
    """Procesar y guardar el formulario de elegibilidad CVA"""
    try:
        datos = request.get_json()
        
        if not datos:
            return jsonify({'success': False, 'message': 'No se recibieron datos del formulario'}), 400
        
        codigo_asesoria = datos.get('codigo_asesoria')
        if not codigo_asesoria:
            return jsonify({'success': False, 'message': 'Código de asesoría requerido'}), 400
        
        connection = create_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Error de conexión a la base de datos'}), 500

        cursor = connection.cursor()
        
        cursor.execute("SELECT id_solicitante FROM tbl_asesoria WHERE codigo_asesoria = %s AND estado = 'Pagada'", (codigo_asesoria,))
        asesoria_db = cursor.fetchone()
        if not asesoria_db:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Asesoría no encontrada o no está pagada'}), 404

        cursor.execute("SELECT COUNT(*) FROM tbl_form_eligibilidadCVA WHERE codigo_asesoria = %s AND completado = 1", (codigo_asesoria,))
        if cursor.fetchone()[0] > 0:
            cursor.close(); connection.close()
            return jsonify({'success': False, 'message': 'Ya existe un formulario completado para esta asesoría'}), 400
        
        id_solicitante = asesoria_db[0]
        
        campos_formulario = {
            'motivo_viaje': datos.get('motivo_viaje'),
            'numero_documento': datos.get('numero_documento'),
            'tipo_documento': datos.get('tipo_documento'),
            'nombre_completo': datos.get('nombre_completo'),
            'pais_residencia': datos.get('pais_residencia'),
            'familiares_canada': datos.get('familiares_canada'),
            'relacion_familiares_can': datos.get('relacion_familiares_can'),
            'estado_civil': datos.get('estado_civil'),
            'provincia_destino': datos.get('provincia_destino'),
            'trabajo_actual': datos.get('trabajo_actual'),
            'co_deudor': datos.get('co_deudor'),
            'viajes_recientes': datos.get('viajes_recientes'),
            'antecedente_judiciales': datos.get('antecedente_judiciales'),
            'examenes_medicos': datos.get('examenes_medicos'),
            'aplicacion_familiares': datos.get('aplicacion_familiares'),
            'biometricos_canada': datos.get('biometricos_canada'),
            'pago_tasas': datos.get('pago_tasas'),
            'tiempo_estadia': datos.get('tiempo_estadia'),
            'fecha_nacimiento': datos.get('fecha_nacimiento'),
            'proposito_principal': datos.get('proposito_principal'),
            'empleo_origen': datos.get('empleo_origen'),
            'dependencia_economica': datos.get('dependencia_economica'),
            'acompana_familiar': datos.get('acompana_familiar'),
            'terminos': 1 if datos.get('terminos') == 1 or datos.get('terminos') == 'on' or datos.get('terminos') == True else 0,
            'privacidad': 1 if datos.get('privacidad') == 1 or datos.get('privacidad') == 'on' or datos.get('privacidad') == True else 0,
            'id_solicitante': id_solicitante,
            'codigo_asesoria': codigo_asesoria,
            'completado': 1,
            'empleo_extranjero': datos.get('empleo_extranjero'),
            'trabajo_actual_extranjero': datos.get('trabajo_actual_extranjero'),
            'motivo_no_trabajo': datos.get('motivo_no_trabajo'),
            'tiene_pasaporte': datos.get('tiene_pasaporte'),
            'numero_pasaporte': datos.get('numero_pasaporte'),
            'tiene_negocios_actuales': datos.get('tiene_negocios_actuales'),
            'descripcion_negocios_actuales': datos.get('descripcion_negocios_actuales'),
            'ingresos_mensuales_moneda': datos.get('ingresos_mensuales_moneda'),
            'ingresos_mensuales': datos.get('ingresos_mensuales').replace('.', '') if datos.get('ingresos_mensuales') else None,
            'puede_comprobar_relacion': datos.get('puede_comprobar_relacion'),
            'relacion_acompana_familiar': datos.get('relacion_acompana_familiar'),
            'viaja_conocido': datos.get('viaja_conocido'),
            'posee_ahorros': datos.get('posee_ahorros'),
            'estudios_en_curso': datos.get('estudios_en_curso'),
            'rechazado_canada': datos.get('rechazado_canada'),
            'habla_idioma_oficial': datos.get('habla_idioma_oficial'),
            'aplicado_programa_migratorio': datos.get('aplicado_programa_migratorio'),
            'intencion_extender_estadia': datos.get('intencion_extender_estadia'),
            # Documentos (URLs de Cloudinary)
            'doc_itinerario_viaje': datos.get('doc_itinerario_viaje'),
            'doc_carta_motivacion': datos.get('doc_carta_motivacion'),
            'doc_carta_laboral': datos.get('doc_carta_laboral'),
            'doc_certificados_propiedad': datos.get('doc_certificados_propiedad'),
            'doc_extractos_bancarios': datos.get('doc_extractos_bancarios'),
            'doc_carta_invitacion': datos.get('doc_carta_invitacion'),
            'doc_oferta_laboral': datos.get('doc_oferta_laboral'),
            'doc_lmia': datos.get('doc_lmia'),
            'doc_contrato_laboral': datos.get('doc_contrato_laboral'),
            'doc_certificados_experiencia': datos.get('doc_certificados_experiencia'),
            'doc_hoja_vida': datos.get('doc_hoja_vida'),
            'doc_diplomas': datos.get('doc_diplomas'),
            'doc_examen_medico': datos.get('doc_examen_medico'),
            'doc_carta_motivacion_trabajo': datos.get('doc_carta_motivacion_trabajo'),
            'doc_carta_aceptacion': datos.get('doc_carta_aceptacion'),
            'doc_pago_matricula': datos.get('doc_pago_matricula'),
            'doc_pruebas_fondos': datos.get('doc_pruebas_fondos'),
            'doc_carta_motivacion_estudio': datos.get('doc_carta_motivacion_estudio'),
            'doc_historial_academico': datos.get('doc_historial_academico'),
            'doc_examen_medico_estudio': datos.get('doc_examen_medico_estudio'),
            'doc_formulario_custodia': datos.get('doc_formulario_custodia'),
            'doc_carta_invitacion_negocios': datos.get('doc_carta_invitacion_negocios'),
            'doc_registro_camara': datos.get('doc_registro_camara'),
            'doc_certificados_bancarios_empresa': datos.get('doc_certificados_bancarios_empresa'),
            'doc_itinerario_negocios': datos.get('doc_itinerario_negocios'),
            'doc_carta_empleador': datos.get('doc_carta_empleador'),
            'doc_contratos_comerciales': datos.get('doc_contratos_comerciales'),
            'doc_vinculo_comercial': datos.get('doc_vinculo_comercial'),
            'doc_carta_invitacion_familiar': datos.get('doc_carta_invitacion_familiar'),
            'doc_prueba_parentesco': datos.get('doc_prueba_parentesco'),
            'doc_finanzas_familiar': datos.get('doc_finanzas_familiar'),
            'doc_contrato_laboral_familiar': datos.get('doc_contrato_laboral_familiar'),
            'doc_certificados_estudio_familiar': datos.get('doc_certificados_estudio_familiar'),
            'doc_propiedades_nombre': datos.get('doc_propiedades_nombre'),
            'doc_carta_motivacion_familiar': datos.get('doc_carta_motivacion_familiar'),
            'doc_idioma': datos.get('doc_idioma'),
            'doc_eca': datos.get('doc_eca'),
            'doc_pasaporte': datos.get('doc_pasaporte'),
            'doc_historial_laboral': datos.get('doc_historial_laboral'),
            'doc_carta_intencion_residencia': datos.get('doc_carta_intencion_residencia'),
            'doc_examen_medico_residencia': datos.get('doc_examen_medico_residencia'),
            'doc_antecedentes': datos.get('doc_antecedentes'),
        }
        
        campos_db = [key for key, value in campos_formulario.items() if value is not None]
        valores_db = [campos_formulario[key] for key in campos_db]
        
        if not campos_db:
            return jsonify({'success': False, 'message': 'No hay datos válidos para guardar.'}), 400

        placeholders = ', '.join(['%s'] * len(campos_db))
        campos_str = ', '.join(campos_db)
        
        query_insercion = f"INSERT INTO tbl_form_eligibilidadCVA ({campos_str}) VALUES ({placeholders})"
        
        try:
            cursor.execute(query_insercion, valores_db)
            id_form_elegibilidad = cursor.lastrowid
            
            cursor.execute("UPDATE tbl_asesoria SET id_formElegibilidad = %s, estado_proceso = %s WHERE codigo_asesoria = %s",
                           (id_form_elegibilidad, "Proceso activo", codigo_asesoria))
            
            connection.commit()
            
            try:
                notify_form_submitted(session['user_id'], id_form_elegibilidad)
            except Exception as notify_error:
                print(f"Error en notificación: {str(notify_error)}")
            
            return jsonify({'success': True, 'message': 'Formulario guardado exitosamente', 'id_formulario': id_form_elegibilidad})
            
        except Exception as db_error:
            print(f"Error en la base de datos: {str(db_error)}")
            connection.rollback()
            return jsonify({'success': False, 'message': f'Error en la base de datos: {str(db_error)}'}), 500
            
    except Exception as e:
        print(f"Error al procesar formulario: {str(e)}")
        if 'connection' in locals() and connection.is_connected(): # type: ignore
            if 'cursor' in locals() and cursor:
                cursor.close()
            connection.close() # type: ignore
        return jsonify({'success': False, 'message': f'Error interno del servidor: {str(e)}'}), 500
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'connection' in locals() and connection.is_connected(): # type: ignore
            connection.close() # type: ignore


@formulario_bp.route('/formulario/<int:id_formulario>')
@role_required('Usuario')
@login_required
def ver_formulario_elegibilidad(id_formulario):
    try:
        connection = create_connection()
        if not connection:
            flash('Error de conexión a la base de datos', 'error')
            return redirect(url_for('formularios.formularios'))

        cursor = connection.cursor(dictionary=True)
        query = """
        SELECT fe.*, u.nombres, u.apellidos, u.correo, a.codigo_asesoria, a.tipo_asesoria, a.fecha_asesoria
        FROM tbl_form_eligibilidadCVA fe
        INNER JOIN tbl_solicitante s ON fe.id_solicitante = s.id_solicitante
        INNER JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        LEFT JOIN tbl_asesoria a ON fe.codigo_asesoria = a.codigo_asesoria
        WHERE fe.id_formElegibilidad = %s
        """
        cursor.execute(query, (id_formulario,))
        formulario = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if not formulario:
            flash('Formulario no encontrado', 'error')
            return redirect(url_for('formularios.formularios'))
        
        return render_template('ver_formulario_elegibilidad.html', formulario=formulario)
    except Exception as e:
        print(f"Error al obtener formulario: {str(e)}")
        flash('Error al cargar el formulario', 'error')
        return redirect(url_for('formularios.formularios'))

@formulario_bp.route('/lista_formularios')
@role_required('Usuario')
@login_required
def lista_formularios_elegibilidad():
    try:
        connection = create_connection()
        if not connection:
            flash('Error de conexión a la base de datos', 'error')
            return redirect(url_for('formularios.formularios'))

        cursor = connection.cursor(dictionary=True)
        query = """
        SELECT fe.id_formElegibilidad, fe.motivo_viaje, fe.numero_documento, fe.pais_residencia, fe.provincia_destino,
               u.nombres, u.apellidos, u.correo, a.codigo_asesoria, a.tipo_asesoria, a.fecha_asesoria
        FROM tbl_form_eligibilidadCVA fe
        INNER JOIN tbl_solicitante s ON fe.id_solicitante = s.id_solicitante
        INNER JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        LEFT JOIN tbl_asesoria a ON fe.codigo_asesoria = a.codigo_asesoria
        ORDER BY fe.id_formElegibilidad DESC
        """
        cursor.execute(query)
        formularios = cursor.fetchall()
        cursor.close()
        connection.close()
        return render_template('lista_formularios_elegibilidad.html', formularios=formularios)
    except Exception as e:
        print(f"Error al obtener lista de formularios: {str(e)}")
        flash('Error al cargar la lista de formularios', 'error')
        return redirect(url_for('formularios.formularios'))

def validar_datos_formulario(datos):
    campos_requeridos = [
        'motivo_viaje', 'numero_documento', 'tipo_documento','nombre_completo', 'pais_residencia', 
        'provincia_destino', 'estado_civil', 'familiares_canada','viaja_conocido', 'co_deudor', 
        'viajes_recientes', 'antecedente_judiciales', 
        'examenes_medicos', 'aplicacion_familiares', 'biometricos_canada', 'pago_tasas', 'fecha_nacimiento', 'proposito_principal',
        'empleo_origen', 'dependencia_economica', 'terminos', 'privacidad',
        'tiene_pasaporte','posee_ahorros','estudios_en_curso','rechazado_canada','habla_idioma_oficial','aplicado_programa_migratorio','intencion_extender_estadia',
    ]
    
    errores = []
    
    for campo in campos_requeridos:
        if not datos.get(campo) or str(datos.get(campo)).strip() == '':
            errores.append(f'El campo {campo.replace("_", " ")} es requerido')
    
    # Validar relación familiar si tiene familiares en Canadá
    if datos.get('familiares_canada') == 'Si':
        if not datos.get('relacion_familiares_can') or str(datos.get('relacion_familiares_can')).strip() == '':
            errores.append('Debe especificar la relación con familiares en Canadá')
        if not datos.get('puede_comprobar_relacion') or str(datos.get('puede_comprobar_relacion')).strip() == '':
            errores.append('Debe indicar si puede comprobar su relación con el familiar en Canadá')
    # Validar relación familiar si tiene acompañante
    if datos.get('acompana_familiar') == 'Si':
        if not datos.get('relacion_acompana_familiar') or str(datos.get('relacion_acompana_familiar')).strip() == '':
            errores.append('Debe especificar la relación con el familiar que lo acompaña')
    # Validar lógica de empleo y trabajo
    if datos.get('empleo_origen') == 'Si':
        if not datos.get('trabajo_actual') or str(datos.get('trabajo_actual')).strip() == '':
            errores.append('Debe especificar su trabajo actual en el país de origen')
    elif datos.get('empleo_origen') == 'No':
        if not datos.get('empleo_extranjero') or str(datos.get('empleo_extranjero')).strip() == '':
            errores.append('Debe indicar si tiene empleo en el extranjero')
        elif datos.get('empleo_extranjero') == 'Si':
            if not datos.get('trabajo_actual_extranjero') or str(datos.get('trabajo_actual_extranjero')).strip() == '':
                errores.append('Debe especificar su trabajo actual en el extranjero')
        elif datos.get('empleo_extranjero') == 'No':
            if not datos.get('motivo_no_trabajo') or str(datos.get('motivo_no_trabajo')).strip() == '':
                errores.append('Debe indicar el motivo por el que no tiene trabajo')

    # Validar opciones de sí/no
    
    opciones_si_no = ['familiares_canada','viaja_conocido', 'co_deudor', 'viajes_recientes',
                      'antecedente_judiciales', 'examenes_medicos', 'aplicacion_familiares', 
                      'biometricos_canada', 'pago_tasas', 'empleo_origen', 'dependencia_economica', 'acompana_familiar',
                      'posee_ahorros', 'estudios_en_curso', 'rechazado_canada', 'habla_idioma_oficial',
                      'aplicado_programa_migratorio', 'intencion_extender_estadia']

    for campo in opciones_si_no:
        valor = datos.get(campo)
        if valor and valor not in ['Si', 'No']:
            errores.append(f'El campo {campo.replace("_", " ")} debe ser "Si" o "No"')
    
    # Validar número de pasaporte si tiene pasaporte
    if datos.get('tiene_pasaporte') == 'Si':
        if not datos.get('numero_pasaporte') or str(datos.get('numero_pasaporte')).strip() == '':
            errores.append('Debe ingresar el número de pasaporte')
    
    # Validar negocios actuales
    if datos.get('tiene_negocios_actuales') == 'Si':
        if not datos.get('descripcion_negocios_actuales') or str(datos.get('descripcion_negocios_actuales')).strip() == '':
            errores.append('Debe describir sus negocios actuales')
    
    # Validar ingresos mensuales y moneda
    if not datos.get('ingresos_mensuales_moneda') or not datos.get('ingresos_mensuales'):
        errores.append('Debe ingresar sus ingresos mensuales y la moneda')
    
    return errores
