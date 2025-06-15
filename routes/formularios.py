from flask import Blueprint, request, redirect, url_for, flash, render_template, session, jsonify
from config.database import create_connection
from utils.auth_helpers import login_required
from utils.notification import notify_form_submitted
from datetime import datetime
from utils.auth_helpers import role_required

# Crear el blueprint
formulario_bp = Blueprint('formularios', __name__)

@formulario_bp.route('/formularios')
@role_required('Usuario')
def formularios():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    return render_template('formulario_solicitud.html')  # Usa la plantilla que corresponda

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
        
        # Consulta para obtener asesorías pagadas con información del solicitante
        user_id = session.get('user_id')
        query = """
        SELECT 
            a.codigo_asesoria,
            a.fecha_asesoria,
            a.tipo_asesoria,
            a.descripcion,
            a.lugar,
            a.estado,
            a.nombre_asesor,
            a.especialidad,
            a.id_formElegibilidad,
            u.nombres,
            u.apellidos,
            u.correo,
            s.id_solicitante,
            COALESCE(MAX(fe.completado), 0) as completado
        FROM tbl_asesoria a
        INNER JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
        INNER JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        LEFT JOIN tbl_form_eligibilidadCVA fe ON a.codigo_asesoria = fe.codigo_asesoria
        WHERE a.estado = 'Pagada' AND u.id_usuario = %s
        GROUP BY a.codigo_asesoria, a.fecha_asesoria, a.tipo_asesoria, a.descripcion, a.lugar, 
                 a.estado, a.nombre_asesor, a.especialidad, a.id_formElegibilidad, 
                 u.nombres, u.apellidos, u.correo, s.id_solicitante
        ORDER BY a.fecha_asesoria DESC
        """
        
        cursor.execute(query, (user_id,))
        asesorias = cursor.fetchall()
        
        # Convertir datetime a string para JSON
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

@formulario_bp.route('/procesar_elegibilidad', methods=['POST'])
@role_required('Usuario')
@login_required
def procesar_formulario_elegibilidad():
    """Procesar y guardar el formulario de elegibilidad CVA"""
    try:
        # Obtener datos del formulario
        datos = request.get_json()
        
        if not datos:
            return jsonify({
                'success': False,
                'message': 'No se recibieron datos del formulario'
            }), 400
        
        # Validar que se recibió el código de asesoría
        codigo_asesoria = datos.get('codigo_asesoria')
        if not codigo_asesoria:
            return jsonify({
                'success': False,
                'message': 'Código de asesoría requerido'
            }), 400
        
        connection = create_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Error de conexión a la base de datos'
            }), 500

        cursor = connection.cursor()
        
        # Verificar que la asesoría existe y está pagada
        cursor.execute("""
            SELECT id_solicitante, id_formElegibilidad
            FROM tbl_asesoria 
            WHERE codigo_asesoria = %s AND estado = 'Pagada'
        """, (codigo_asesoria,))
        
        asesoria = cursor.fetchone()
        if not asesoria:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Asesoría no encontrada o no está pagada'
            }), 404

        # Verificar si ya existe un formulario completado para esta asesoría
        cursor.execute("""
            SELECT COUNT(*) as count, MAX(completado) as completado
            FROM tbl_form_eligibilidadCVA 
            WHERE codigo_asesoria = %s AND completado = 1
        """, (codigo_asesoria,))
        
        formulario_existente = cursor.fetchone()
        if formulario_existente and formulario_existente[0] > 0:  # count > 0
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Ya existe un formulario completado para esta asesoría'
            }), 400
        
        id_solicitante = asesoria[0]
        
        # Preparar datos para inserción (solo campos que existen en la tabla)
        campos_formulario = {
            'motivo_viaje': datos.get('motivo_viaje'),
            'numero_documento': datos.get('numero_documento'),
            'tipo_documento': datos.get('tipo_documento'),
            'nombre_completo': datos.get('nombre_completo'),  # <--- Agrega esto
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
            'completado': 1,  # Marcar como completado al enviar
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
            # Ejemplo para turismo:
            'doc_itinerario_viaje': datos.get('doc_itinerario_viaje'),
            'doc_carta_motivacion': datos.get('doc_carta_motivacion'),
            'doc_carta_laboral': datos.get('doc_carta_laboral'),
            'doc_certificados_propiedad': datos.get('doc_certificados_propiedad'),
            'doc_extractos_bancarios': datos.get('doc_extractos_bancarios'),
            'doc_carta_invitacion': datos.get('doc_carta_invitacion'),

            # Documentos Visa de Trabajo
            'doc_oferta_laboral': datos.get('doc_oferta_laboral'),
            'doc_lmia': datos.get('doc_lmia'),
            'doc_contrato_laboral': datos.get('doc_contrato_laboral'),
            'doc_certificados_experiencia': datos.get('doc_certificados_experiencia'),
            'doc_hoja_vida': datos.get('doc_hoja_vida'),
            'doc_diplomas': datos.get('doc_diplomas'),
            'doc_examen_medico': datos.get('doc_examen_medico'),
            'doc_carta_motivacion_trabajo': datos.get('doc_carta_motivacion_trabajo'),

            # Documentos Visa de Estudio
            'doc_carta_aceptacion': datos.get('doc_carta_aceptacion'),
            'doc_pago_matricula': datos.get('doc_pago_matricula'),
            'doc_pruebas_fondos': datos.get('doc_pruebas_fondos'),
            'doc_carta_motivacion_estudio': datos.get('doc_carta_motivacion_estudio'),
            'doc_historial_academico': datos.get('doc_historial_academico'),
            'doc_examen_medico_estudio': datos.get('doc_examen_medico_estudio'),
            'doc_formulario_custodia': datos.get('doc_formulario_custodia'),

            # Documentos Visa de Negocios
            'doc_carta_invitacion_negocios': datos.get('doc_carta_invitacion_negocios'),
            'doc_registro_camara': datos.get('doc_registro_camara'),
            'doc_certificados_bancarios_empresa': datos.get('doc_certificados_bancarios_empresa'),
            'doc_itinerario_negocios': datos.get('doc_itinerario_negocios'),
            'doc_carta_empleador': datos.get('doc_carta_empleador'),
            'doc_contratos_comerciales': datos.get('doc_contratos_comerciales'),
            'doc_vinculo_comercial': datos.get('doc_vinculo_comercial'),

            # Documentos Visa de Visita Familiar
            'doc_carta_invitacion_familiar': datos.get('doc_carta_invitacion_familiar'),
            'doc_prueba_parentesco': datos.get('doc_prueba_parentesco'),
            'doc_finanzas_familiar': datos.get('doc_finanzas_familiar'),
            'doc_contrato_laboral_familiar': datos.get('doc_contrato_laboral_familiar'),
            'doc_certificados_estudio_familiar': datos.get('doc_certificados_estudio_familiar'),
            'doc_propiedades_nombre': datos.get('doc_propiedades_nombre'),
            'doc_carta_motivacion_familiar': datos.get('doc_carta_motivacion_familiar'),
            # ...y así para cada tipo de visa y documento...
        }
        
        # Imprimir los datos para depuración
        print("Datos a insertar:", campos_formulario)
        
        # Construir query de inserción
        campos = list(campos_formulario.keys())
        valores = list(campos_formulario.values())
        placeholders = ', '.join(['%s'] * len(campos))
        campos_str = ', '.join(campos)
        
        query_insercion = f"""
        INSERT INTO tbl_form_eligibilidadCVA ({campos_str})
        VALUES ({placeholders})
        """
        
        # Ejecutar inserción
        try:
            cursor.execute(query_insercion, valores)
            id_form_elegibilidad = cursor.lastrowid
            
            # Actualizar la asesoría con el ID del formulario de elegibilidad
            cursor.execute("""
                UPDATE tbl_asesoria 
                SET id_formElegibilidad = %s 
                WHERE codigo_asesoria = %s
            """, (id_form_elegibilidad, codigo_asesoria))
            
            # Actualizar el estado_proceso de la asesoría a "Proceso activo"
            cursor.execute("""
                UPDATE tbl_asesoria
                SET estado_proceso = %s
                WHERE codigo_asesoria = %s
            """, ("Proceso activo", codigo_asesoria))
            
            # Confirmar transacción
            connection.commit()
            
            # Notificar sobre el formulario enviado
            try:
                notify_form_submitted(session['user_id'], id_form_elegibilidad)
            except Exception as notify_error:
                print(f"Error en notificación: {str(notify_error)}")
                # Continuar aunque falle la notificación
            
            return jsonify({
                'success': True,
                'message': 'Formulario de elegibilidad guardado exitosamente',
                'id_formulario': id_form_elegibilidad
            })
            
        except Exception as db_error:
            print(f"Error en la base de datos: {str(db_error)}")
            connection.rollback()
            return jsonify({
                'success': False,
                'message': f'Error en la base de datos: {str(db_error)}'
            }), 500
            
    except Exception as e:
        print(f"Error al procesar formulario de elegibilidad: {str(e)}")
        if 'connection' in locals() and connection:
            connection.rollback()
            if 'cursor' in locals() and cursor:
                cursor.close()
            connection.close()
        
        return jsonify({
            'success': False,
            'message': f'Error interno del servidor al procesar el formulario: {str(e)}'
        }), 500
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'connection' in locals() and connection:
            connection.close()

@formulario_bp.route('/formulario/<int:id_formulario>')
@role_required('Usuario')
@login_required
def ver_formulario_elegibilidad(id_formulario):
    """Ver un formulario de elegibilidad específico"""
    try:
        connection = create_connection()
        if not connection:
            flash('Error de conexión a la base de datos', 'error')
            return redirect(url_for('formularios.formularios'))

        cursor = connection.cursor(dictionary=True)
        
        # Obtener datos del formulario con información del solicitante
        query = """
        SELECT 
            fe.*,
            u.nombres,
            u.apellidos,
            u.correo,
            a.codigo_asesoria,
            a.tipo_asesoria,
            a.fecha_asesoria
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
    """Listar todos los formularios de elegibilidad"""
    try:
        connection = create_connection()
        if not connection:
            flash('Error de conexión a la base de datos', 'error')
            return redirect(url_for('formularios.formularios'))

        cursor = connection.cursor(dictionary=True)
        
        # Obtener todos los formularios con información del solicitante
        query = """
        SELECT 
            fe.id_formElegibilidad,
            fe.motivo_viaje,
            fe.numero_documento,
            fe.pais_residencia,
            fe.provincia_destino,
            u.nombres,
            u.apellidos,
            u.correo,
            a.codigo_asesoria,
            a.tipo_asesoria,
            a.fecha_asesoria
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

# Función auxiliar para validar datos del formulario
def validar_datos_formulario(datos):
    """Validar que los datos del formulario sean correctos"""
    campos_requeridos = [
        'motivo_viaje', 'numero_documento', 'tipo_documento','nombre_completo', 'pais_residencia', 
        'provincia_destino', 'estado_civil', 'familiares_canada','viaja_conocido', 'co_deudor', 
        'viajes_recientes', 'antecedente_judiciales', 
        'examenes_medicos', 'aplicacion_familiares', 'biometricos_canada', 'pago_tasas', 'fecha_nacimiento', 'proposito_principal',
        'empleo_origen', 'dependencia_economica', 'terminos', 'privacidad',
        'tiene_pasaporte','posee_ahorros','estudios_en_curso','rechazado_canada','habla_idioma_oficial','aplicado_programa_migratorio','intencion_extender_estadia',
        # Quita los campos dependientes de aquí
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
