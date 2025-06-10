from flask import Blueprint, request, redirect, url_for, flash, render_template, session, jsonify
from config.database import create_connection
from utils.auth_helpers import login_required
from utils.notification import notify_form_submitted
from datetime import datetime

# Crear el blueprint
formulario_bp = Blueprint('formularios', __name__)

@formulario_bp.route('/formularios')
def formularios():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    return render_template('formulario_solicitud.html')  # Usa la plantilla que corresponda

@formulario_bp.route('/asesorias_pagadas')
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
            COALESCE(fe.completado, 0) as completado
        FROM tbl_asesoria a
        INNER JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
        INNER JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        LEFT JOIN tbl_form_eligibilidadCVA fe ON a.id_formElegibilidad = fe.id_formElegibilidad
        WHERE a.estado = 'Pagada'
        ORDER BY a.fecha_asesoria DESC
        """
        
        cursor.execute(query)
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
            SELECT id_solicitante, id_formElegibilidad, 
                   COALESCE((SELECT completado FROM tbl_form_eligibilidadCVA WHERE codigo_asesoria = %s), 0) as completado
            FROM tbl_asesoria 
            WHERE codigo_asesoria = %s AND estado = 'Pagada'
        """, (codigo_asesoria, codigo_asesoria))
        
        asesoria = cursor.fetchone()
        if not asesoria:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Asesoría no encontrada o no está pagada'
            }), 404

        # Verificar si ya existe un formulario completado para esta asesoría
        if asesoria[2] == 1:  # completado
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
            'pais_residencia': datos.get('pais_residencia'),
            'familiares_canada': datos.get('familiares_canada'),
            'relacion_familiares_can': datos.get('relacion_familiares_can'),
            'estado_civil': datos.get('estado_civil'),
            'provincia_destino': datos.get('provincia_destino'),
            'trabajo_actual': datos.get('trabajo_actual'),
            'negocios_actuales': datos.get('negocios_actuales'),
            'co_deudor': datos.get('co_deudor'),
            'viajes_recientes': datos.get('viajes_recientes'),
            'acompanante_conocido': datos.get('acompanante_conocido'),
            'antecedente_judiciales': datos.get('antecedente_judiciales'),
            'examenes_medicos': datos.get('examenes_medicos'),
            'aplicacion_familiares': datos.get('aplicacion_familiares'),
            'acceso_aplicacion': datos.get('acceso_aplicacion'),
            'biometricos_canada': datos.get('biometricos_canada'),
            'pago_tasas': datos.get('pago_tasas'),
            'tiempo_estadia': datos.get('tiempo_estadia'),
            'fecha_nacimiento': datos.get('fecha_nacimiento'),
            'familiar_canada': datos.get('familiar_canada'),
            'relacion_familiar': datos.get('relacion_familiar'),
            'residente_permanente': datos.get('residente_permanente'),
            'proposito_principal': datos.get('proposito_principal'),
            'empleo_origen': datos.get('empleo_origen'),
            'dependencia_economica': datos.get('dependencia_economica'),
            'acompana_familiar': datos.get('acompana_familiar'),
            'doc_historial_viajes': datos.get('doc_historial_viajes'),
            'doc_recursos_financieros': datos.get('doc_recursos_financieros'),
            'doc_relaciones_familiares': datos.get('doc_relaciones_familiares'),
            'doc_hoja_vida': datos.get('doc_hoja_vida'),
            'terminos': 1 if datos.get('terminos') == 1 or datos.get('terminos') == 'on' or datos.get('terminos') == True else 0,
            'privacidad': 1 if datos.get('privacidad') == 1 or datos.get('privacidad') == 'on' or datos.get('privacidad') == True else 0,
            'id_solicitante': id_solicitante,
            'codigo_asesoria': codigo_asesoria,
            'completado': 1  # Marcar como completado al enviar
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
        'motivo_viaje', 'numero_documento', 'tipo_documento', 'pais_residencia', 
        'provincia_destino', 'estado_civil', 'familiares_canada', 'co_deudor', 
        'viajes_recientes', 'acompanante_conocido', 'antecedente_judiciales', 
        'examenes_medicos', 'aplicacion_familiares', 'acceso_aplicacion', 
        'biometricos_canada', 'pago_tasas', 'fecha_nacimiento', 'proposito_principal',
        'empleo_origen', 'dependencia_economica', 'terminos', 'privacidad'
    ]
    
    errores = []
    
    for campo in campos_requeridos:
        if not datos.get(campo) or str(datos.get(campo)).strip() == '':
            errores.append(f'El campo {campo.replace("_", " ")} es requerido')
    
    # Validar relación familiar si tiene familiares en Canadá
    if datos.get('familiares_canada') == 'Si':
        if not datos.get('relacion_familiares_can') or str(datos.get('relacion_familiares_can')).strip() == '':
            errores.append('Debe especificar la relación con familiares en Canadá')
    
    # Validar opciones de sí/no
    opciones_si_no = ['familiares_canada', 'co_deudor', 'viajes_recientes', 'acompanante_conocido', 
                      'antecedente_judiciales', 'examenes_medicos', 'aplicacion_familiares', 
                      'acceso_aplicacion', 'biometricos_canada', 'pago_tasas', 'familiar_canada',
                      'residente_permanente', 'empleo_origen', 'dependencia_economica', 'acompana_familiar']
    
    for campo in opciones_si_no:
        valor = datos.get(campo)
        if valor and valor not in ['Si', 'No']:
            errores.append(f'El campo {campo.replace("_", " ")} debe ser "Si" o "No"')
    
    return errores

