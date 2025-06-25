from flask import Blueprint, render_template, redirect, url_for, session, flash, request, jsonify, send_file
import datetime
import json
import io
import csv
import math
import random
import string
from config.database import create_connection
from config.cloudinary_config import configure_cloudinary
import cloudinary.api

# Importar reportlab para generación de PDFs
try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False
    print("Warning: reportlab no está instalado. Las funciones de PDF no estarán disponibles")

clientes_asesor_bp = Blueprint('clientes_asesor', __name__, url_prefix='/asesor')

# Configurar Cloudinary
configure_cloudinary()

# Ruta para la página de clientes del asesor
@clientes_asesor_bp.route('/clientes')
def clientes():
    """Página principal de gestión de clientes del asesor"""
    if 'user_role' not in session or session.get('user_role') != 'Asesor':
        flash('Debe iniciar sesión como asesor para acceder a esta página', 'error')
        return redirect(url_for('auth.login'))
    
    return render_template('asesor/clientes_asesor.html')

# API para obtener la lista de clientes del asesor with paginación - CORREGIDO: Excluir "Sin estado"
@clientes_asesor_bp.route('/api/clientes')
def api_clientes():
    """API para obtener todos los clientes asignados al asesor logueado con paginación"""
    if 'user_role' not in session or session.get('user_role') != 'Asesor':
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Obtener parámetros de paginación
        page = int(request.args.get('page', 1))
        per_page = 10  # 10 elementos por página
        offset = (page - 1) * per_page
        
        # Obtener el ID del asesor desde la sesión
        id_asesor = session.get('user_role')
        
        # Query para contar el total de registros y estadísticas - CORREGIDO: Excluir NULL/Sin estado
        count_and_stats_query = """
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN a.estado_proceso = 'Pendiente' THEN 1 ELSE 0 END) as pendientes,
            SUM(CASE WHEN a.estado_proceso = 'Proceso activo' THEN 1 ELSE 0 END) as proceso,
            SUM(CASE WHEN a.estado_proceso = 'Terminado' THEN 1 ELSE 0 END) as completos
        FROM tbl_asesoria a
        LEFT JOIN tbl_form_eligibilidadCVA f ON a.id_formElegibilidad = f.id_formElegibilidad
        WHERE a.id_asesor = %s AND a.estado_proceso IS NOT NULL
        """
        cursor.execute(count_and_stats_query, (id_asesor,))
        stats_result = cursor.fetchone()

        total_records = stats_result['total']
        total_pages = math.ceil(total_records / per_page)
        
        # Query principal para obtener clientes - CORREGIDO: Excluir NULL/Sin estado
        query = """
        SELECT 
            a.codigo_asesoria,
            a.fecha_asesoria,
            a.tipo_asesoria,
            a.descripcion,
            a.lugar,
            a.estado,
            a.estado_proceso,
            a.id_solicitante,
            a.id_formElegibilidad,
            f.nombre_completo,
            f.numero_documento,
            f.tipo_documento,
            f.fecha_nacimiento,
            f.pais_residencia,
            f.estado_civil,
            f.trabajo_actual,
            f.trabajo_actual_extranjero,
            f.motivo_no_trabajo,
            f.completado,
            u.correo,
            u.celular,
            u.nombres,
            u.apellidos,
            -- Determinar estado del formulario
            CASE 
                WHEN f.completado = 1 AND (
                    (f.doc_pasaporte IS NOT NULL AND f.doc_pasaporte != '') OR
                    (f.doc_historial_laboral IS NOT NULL AND f.doc_historial_laboral != '') OR
                    (f.doc_extractos_bancarios IS NOT NULL AND f.doc_extractos_bancarios != '') OR
                    (f.doc_carta_motivacion IS NOT NULL AND f.doc_carta_motivacion != '') OR
                    (f.doc_itinerario_viaje IS NOT NULL AND f.doc_itinerario_viaje != '')
                ) THEN 'Completo'
                WHEN f.completado = 1 THEN 'Pendiente (Documentos)'
                ELSE 'Pendiente (Formulario)'
            END as estado_formulario,
            -- Contar documentos adjuntos (solo los que tienen URL de Cloudinary)
            (
                (CASE WHEN f.doc_pasaporte IS NOT NULL AND f.doc_pasaporte != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_historial_laboral IS NOT NULL AND f.doc_historial_laboral != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_extractos_bancarios IS NOT NULL AND f.doc_extractos_bancarios != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_carta_motivacion IS NOT NULL AND f.doc_carta_motivacion != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_itinerario_viaje IS NOT NULL AND f.doc_itinerario_viaje != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_carta_laboral IS NOT NULL AND f.doc_carta_laboral != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_certificados_propiedad IS NOT NULL AND f.doc_certificados_propiedad != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_carta_invitacion IS NOT NULL AND f.doc_carta_invitacion != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_oferta_laboral IS NOT NULL AND f.doc_oferta_laboral != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_lmia IS NOT NULL AND f.doc_lmia != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_contrato_laboral IS NOT NULL AND f.doc_contrato_laboral != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_certificados_experiencia IS NOT NULL AND f.doc_certificados_experiencia != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_hoja_vida IS NOT NULL AND f.doc_hoja_vida != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_diplomas IS NOT NULL AND f.doc_diplomas != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_examen_medico IS NOT NULL AND f.doc_examen_medico != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_carta_motivacion_trabajo IS NOT NULL AND f.doc_carta_motivacion_trabajo != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_carta_aceptacion IS NOT NULL AND f.doc_carta_aceptacion != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_pago_matricula IS NOT NULL AND f.doc_pago_matricula != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_pruebas_fondos IS NOT NULL AND f.doc_pruebas_fondos != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_carta_motivacion_estudio IS NOT NULL AND f.doc_carta_motivacion_estudio != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_historial_academico IS NOT NULL AND f.doc_historial_academico != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_examen_medico_estudio IS NOT NULL AND f.doc_examen_medico_estudio != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_formulario_custodia IS NOT NULL AND f.doc_formulario_custodia != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_carta_invitacion_negocios IS NOT NULL AND f.doc_carta_invitacion_negocios != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_registro_camara IS NOT NULL AND f.doc_registro_camara != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_certificados_bancarios_empresa IS NOT NULL AND f.doc_certificados_bancarios_empresa != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_itinerario_negocios IS NOT NULL AND f.doc_itinerario_negocios != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_carta_empleador IS NOT NULL AND f.doc_carta_empleador != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_contratos_comerciales IS NOT NULL AND f.doc_contratos_comerciales != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_vinculo_comercial IS NOT NULL AND f.doc_vinculo_comercial != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_carta_invitacion_familiar IS NOT NULL AND f.doc_carta_invitacion_familiar != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_prueba_parentesco IS NOT NULL AND f.doc_prueba_parentesco != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_finanzas_familiar IS NOT NULL AND f.doc_finanzas_familiar != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_contrato_laboral_familiar IS NOT NULL AND f.doc_contrato_laboral_familiar != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_certificados_estudio_familiar IS NOT NULL AND f.doc_certificados_estudio_familiar != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_propiedades_nombre IS NOT NULL AND f.doc_propiedades_nombre != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_carta_motivacion_familiar IS NOT NULL AND f.doc_carta_motivacion_familiar != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_idioma IS NOT NULL AND f.doc_idioma != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_eca IS NOT NULL AND f.doc_eca != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_carta_intencion_residencia IS NOT NULL AND f.doc_carta_intencion_residencia != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_examen_medico_residencia IS NOT NULL AND f.doc_examen_medico_residencia != '' THEN 1 ELSE 0 END) +
                (CASE WHEN f.doc_antecedentes IS NOT NULL AND f.doc_antecedentes != '' THEN 1 ELSE 0 END)
            ) as total_documentos
        FROM tbl_asesoria a
        LEFT JOIN tbl_form_eligibilidadCVA f ON a.id_formElegibilidad = f.id_formElegibilidad
        LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
        LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        WHERE a.id_asesor = %s AND a.estado_proceso IS NOT NULL
        ORDER BY a.fecha_creacion DESC
        LIMIT %s OFFSET %s
        """
        
        cursor.execute(query, (id_asesor, per_page, offset))
        clientes = cursor.fetchall()
        
        # Procesar los datos para el frontend
        clientes_procesados = []
        for cliente in clientes:
            cliente_data = dict(cliente)
            
            # Formatear fechas
            if cliente_data['fecha_asesoria']:
                cliente_data['fecha_asesoria'] = cliente_data['fecha_asesoria'].isoformat()
            if cliente_data['fecha_nacimiento']:
                cliente_data['fecha_nacimiento'] = cliente_data['fecha_nacimiento'].isoformat()
            
            # Usar el nombre del formulario si está disponible, sino usar nombres y apellidos del usuario
            if cliente_data['nombre_completo']:
                cliente_data['nombre_completo'] = cliente_data['nombre_completo']
            elif cliente_data['nombres'] and cliente_data['apellidos']:
                cliente_data['nombre_completo'] = f"{cliente_data['nombres']} {cliente_data['apellidos']}"
            else:
                cliente_data['nombre_completo'] = 'Sin nombre'
            
            # Asegurar que los campos no sean None
            cliente_data['numero_documento'] = cliente_data['numero_documento'] or 'Sin documento'
            cliente_data['tipo_documento'] = cliente_data['tipo_documento'] or 'N/A'
            cliente_data['correo'] = cliente_data['correo'] or ''
            cliente_data['celular'] = cliente_data['celular'] or ''
            cliente_data['total_documentos'] = cliente_data['total_documentos'] or 0
            
            clientes_procesados.append(cliente_data)
        
        return jsonify({
            'success': True,
            'clientes': clientes_procesados,
            'pagination': {
                'current_page': page,
                'total_pages': total_pages,
                'total_records': total_records,
                'per_page': per_page,
                'has_next': page < total_pages,
                'has_prev': page > 1,
                'statistics': {
                    'total': stats_result['total'],
                    'pendientes': stats_result['pendientes'], 
                    'proceso': stats_result['proceso'],
                    'completos': stats_result['completos']
                }
            }
        })
        
    except Exception as e:
        print(f"Error en api_clientes: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    finally:
        if 'connection' in locals():
            connection.close()

# API para obtener detalle de un cliente específico - ACTUALIZADO para incluir campos de trabajo
@clientes_asesor_bp.route('/api/cliente/<int:codigo_asesoria>')
def api_detalle_cliente(codigo_asesoria):
    """API para obtener el detalle completo de un cliente"""
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        cursor = connection.cursor(dictionary=True)
        
        id_asesor = session.get('user_id')
        
        # Verificar que la asesoría pertenece al asesor logueado
        query_verificacion = """
        SELECT COUNT(*) as count FROM tbl_asesoria 
        WHERE codigo_asesoria = %s AND id_asesor = %s
        """
        cursor.execute(query_verificacion, (codigo_asesoria, id_asesor))
        if cursor.fetchone()['count'] == 0:
            return jsonify({'error': 'Cliente no encontrado o no autorizado'}), 404
        
        # Obtener información completa del cliente - ACTUALIZADO para incluir campos de trabajo
        query = """
        SELECT 
            a.*,
            f.*,
            u.correo,
            u.celular,
            u.nombres,
            u.apellidos,
            u.id_usuario,
            -- Estado del formulario
            CASE 
                WHEN f.completado = 1 AND (
                    (f.doc_pasaporte IS NOT NULL AND f.doc_pasaporte != '') OR
                    (f.doc_historial_laboral IS NOT NULL AND f.doc_historial_laboral != '') OR
                    (f.doc_extractos_bancarios IS NOT NULL AND f.doc_extractos_bancarios != '')
                ) THEN 'Completo'
                WHEN f.completado = 1 THEN 'Pendiente (Documentos)'
                ELSE 'Pendiente (Formulario)'
            END as estado_formulario
        FROM tbl_asesoria a
        LEFT JOIN tbl_form_eligibilidadCVA f ON a.id_formElegibilidad = f.id_formElegibilidad
        LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
        LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        WHERE a.codigo_asesoria = %s AND a.id_asesor = %s
        """
        
        cursor.execute(query, (codigo_asesoria, id_asesor))
        cliente = cursor.fetchone()
        
        if not cliente:
            return jsonify({'error': 'Cliente no encontrado'}), 404
        
        # Formatear fechas
        if cliente['fecha_asesoria']:
            cliente['fecha_asesoria'] = cliente['fecha_asesoria'].isoformat()
        if cliente['fecha_nacimiento']:
            cliente['fecha_nacimiento'] = cliente['fecha_nacimiento'].isoformat()
        
        # Usar el nombre del formulario si está disponible, sino usar nombres y apellidos del usuario
        if cliente['nombre_completo']:
            cliente['nombre_completo'] = cliente['nombre_completo']
        elif cliente['nombres'] and cliente['apellidos']:
            cliente['nombre_completo'] = f"{cliente['nombres']} {cliente['apellidos']}"
        else:
            cliente['nombre_completo'] = 'Sin nombre'
        
        return jsonify({
            'success': True,
            'cliente': cliente
        })
        
    except Exception as e:
        print(f"Error en api_detalle_cliente: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    finally:
        if 'connection' in locals():
            connection.close()

# API para obtener documentos de un cliente
@clientes_asesor_bp.route('/api/documentos/<int:id_form_elegibilidad>')
def api_documentos_cliente(id_form_elegibilidad):
    """API para obtener los documentos de un cliente"""
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Verificar que el formulario pertenece a una asesoría del asesor
        id_asesor = session.get('user_id')
        query_verificacion = """
        SELECT COUNT(*) as count FROM tbl_asesoria a
        WHERE a.id_formElegibilidad = %s AND a.id_asesor = %s
        """
        cursor.execute(query_verificacion, (id_form_elegibilidad, id_asesor))
        if cursor.fetchone()['count'] == 0:
            return jsonify({'error': 'No autorizado para ver estos documentos'}), 403
        
        # Obtener documentos del formulario
        query = """
        SELECT * FROM tbl_form_eligibilidadCVA 
        WHERE id_formElegibilidad = %s
        """
        cursor.execute(query, (id_form_elegibilidad,))
        formulario = cursor.fetchone()
        
        # Mapear documentos a formato más amigable
        documentos = []
        if formulario:
            campos_documentos = {
                'doc_pasaporte': 'Pasaporte',
                'doc_historial_laboral': 'Historial Laboral',
                'doc_extractos_bancarios': 'Extractos Bancarios',
                'doc_carta_motivacion': 'Carta de Motivación',
                'doc_itinerario_viaje': 'Itinerario de Viaje',
                'doc_carta_laboral': 'Carta Laboral',
                'doc_certificados_propiedad': 'Certificados de Propiedad',
                'doc_carta_invitacion': 'Carta de Invitación',
                'doc_oferta_laboral': 'Oferta Laboral',
                'doc_lmia': 'LMIA',
                'doc_contrato_laboral': 'Contrato Laboral',
                'doc_certificados_experiencia': 'Certificados de Experiencia',
                'doc_hoja_vida': 'Hoja de Vida',
                'doc_diplomas': 'Diplomas',
                'doc_examen_medico': 'Examen Médico',
                'doc_carta_motivacion_trabajo': 'Carta de Motivación (Trabajo)',
                'doc_carta_aceptacion': 'Carta de Aceptación',
                'doc_pago_matricula': 'Pago de Matrícula',
                'doc_pruebas_fondos': 'Pruebas de Fondos',
                'doc_carta_motivacion_estudio': 'Carta de Motivación (Estudio)',
                'doc_historial_academico': 'Historial Académico',
                'doc_examen_medico_estudio': 'Examen Médico (Estudio)',
                'doc_formulario_custodia': 'Formulario de Custodia',
                'doc_carta_invitacion_negocios': 'Carta de Invitación (Negocios)',
                'doc_registro_camara': 'Registro de Cámara',
                'doc_certificados_bancarios_empresa': 'Certificados Bancarios Empresa',
                'doc_itinerario_negocios': 'Itinerario de Negocios',
                'doc_carta_empleador': 'Carta del Empleador',
                'doc_contratos_comerciales': 'Contratos Comerciales',
                'doc_vinculo_comercial': 'Vínculo Comercial',
                'doc_carta_invitacion_familiar': 'Carta de Invitación (Familiar)',
                'doc_prueba_parentesco': 'Prueba de Parentesco',
                'doc_finanzas_familiar': 'Finanzas Familiar',
                'doc_contrato_laboral_familiar': 'Contrato Laboral Familiar',
                'doc_certificados_estudio_familiar': 'Certificados de Estudio Familiar',
                'doc_propiedades_nombre': 'Propiedades a Nombre',
                'doc_carta_motivacion_familiar': 'Carta de Motivación (Familiar)',
                'doc_idioma': 'Certificado de Idioma',
                'doc_eca': 'ECA',
                'doc_carta_intencion_residencia': 'Carta de Intención (Residencia)',
                'doc_examen_medico_residencia': 'Examen Médico (Residencia)',
                'doc_antecedentes': 'Antecedentes'
            }
            
            for campo, nombre in campos_documentos.items():
                url_cloudinary = formulario.get(campo)
                documentos.append({
                    'nombre': nombre,
                    'campo': campo,
                    'archivo': url_cloudinary,
                    'descripcion': f'Documento: {nombre}',
                    'tiene_archivo': bool(url_cloudinary and url_cloudinary.strip())
                })
        
        return jsonify({
            'success': True,
            'documentos': documentos
        })
        
    except Exception as e:
        print(f"Error en api_documentos_cliente: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    finally:
        if 'connection' in locals():
            connection.close()

# API para obtener notas de un cliente
@clientes_asesor_bp.route('/api/notas/<int:codigo_asesoria>')
def api_notas_cliente(codigo_asesoria):
    """API para obtener las notas privadas de un cliente"""
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        cursor = connection.cursor(dictionary=True)
        
        id_asesor = session.get('user_id')
        
        # Verificar autorización y obtener notas
        query = """
        SELECT n.*, a.codigo_asesoria
        FROM tbl_notas_asesor n
        INNER JOIN tbl_asesoria a ON n.codigo_asesoria = a.codigo_asesoria
        WHERE n.codigo_asesoria = %s AND a.id_asesor = %s
        ORDER BY n.fecha_creacion DESC
        """
        
        cursor.execute(query, (codigo_asesoria, id_asesor))
        notas = cursor.fetchall()
        
        # Formatear fechas
        for nota in notas:
            if nota['fecha_creacion']:
                nota['fecha_creacion'] = nota['fecha_creacion'].isoformat()
        
        return jsonify({
            'success': True,
            'notas': notas
        })
        
    except Exception as e:
        print(f"Error en api_notas_cliente: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    finally:
        if 'connection' in locals():
            connection.close()

# API para crear una nueva nota
@clientes_asesor_bp.route('/api/notas', methods=['POST'])
def api_crear_nota():
    """API para crear una nueva nota privada"""
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        codigo_asesoria = data.get('codigo_asesoria')
        contenido = data.get('contenido', '').strip()
        
        if not codigo_asesoria or not contenido:
            return jsonify({'error': 'Datos incompletos'}), 400
        
        connection = create_connection()
        cursor = connection.cursor()
        
        id_asesor = session.get('user_id')
        
        # Verificar que la asesoría pertenece al asesor
        query_verificacion = """
        SELECT COUNT(*) as count FROM tbl_asesoria 
        WHERE codigo_asesoria = %s AND id_asesor = %s
        """
        cursor.execute(query_verificacion, (codigo_asesoria, id_asesor))
        if cursor.fetchone()[0] == 0:
            return jsonify({'error': 'No autorizado'}), 403
        
        # Crear tabla de notas si no existe
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS tbl_notas_asesor (
            id INT AUTO_INCREMENT PRIMARY KEY,
            codigo_asesoria INT NOT NULL,
            id_asesor INT NOT NULL,
            contenido TEXT NOT NULL,
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (codigo_asesoria) REFERENCES tbl_asesoria(codigo_asesoria),
            FOREIGN KEY (id_asesor) REFERENCES tbl_asesor(id_asesor)
        )
        """)
        
        # Insertar la nota
        query_insert = """
        INSERT INTO tbl_notas_asesor (codigo_asesoria, id_asesor, contenido)
        VALUES (%s, %s, %s)
        """
        cursor.execute(query_insert, (codigo_asesoria, id_asesor, contenido))
        connection.commit()
        
        return jsonify({
            'success': True,
            'message': 'Nota creada exitosamente'
        })
        
    except Exception as e:
        print(f"Error en api_crear_nota: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    finally:
        if 'connection' in locals():
            connection.close()

# API para eliminar una nota
@clientes_asesor_bp.route('/api/notas/<int:id_nota>', methods=['DELETE'])
def api_eliminar_nota(id_nota):
    """API para eliminar una nota privada"""
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        cursor = connection.cursor()
        
        id_asesor = session.get('user_id')
        
        # Verificar que la nota pertenece al asesor
        query_verificacion = """
        SELECT COUNT(*) as count FROM tbl_notas_asesor 
        WHERE id = %s AND id_asesor = %s
        """
        cursor.execute(query_verificacion, (id_nota, id_asesor))
        if cursor.fetchone()[0] == 0:
            return jsonify({'error': 'Nota no encontrada o no autorizada'}), 404
        
        # Eliminar la nota
        query_delete = "DELETE FROM tbl_notas_asesor WHERE id = %s"
        cursor.execute(query_delete, (id_nota,))
        connection.commit()
        
        return jsonify({
            'success': True,
            'message': 'Nota eliminada exitosamente'
        })
        
    except Exception as e:
        print(f"Error en api_eliminar_nota: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    finally:
        if 'connection' in locals():
            connection.close()

# API para obtener historial de asesorías de un cliente
@clientes_asesor_bp.route('/api/historial/<int:id_solicitante>')
def api_historial_cliente(id_solicitante):
    """API para obtener el historial de asesorías de un cliente"""
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Obtener historial de asesorías del cliente
        query = """
        SELECT 
            a.codigo_asesoria,
            a.fecha_asesoria,
            a.tipo_asesoria,
            a.descripcion,
            a.lugar,
            a.estado,
            COALESCE(a.estado_proceso, 'Sin estado') as estado_proceso,
            a.id_formElegibilidad,
            asesor.nombre as nombre_asesor,
            asesor.apellidos as apellidos_asesor
        FROM tbl_asesoria a
        LEFT JOIN tbl_asesor asesor ON a.id_asesor = asesor.id_asesor
        WHERE a.id_solicitante = %s
        ORDER BY a.fecha_asesoria DESC
        """
        
        cursor.execute(query, (id_solicitante,))
        historial = cursor.fetchall()
        
        # Formatear fechas
        for asesoria in historial:
            if asesoria['fecha_asesoria']:
                asesoria['fecha_asesoria'] = asesoria['fecha_asesoria'].isoformat()
            
            # Agregar nombre completo del asesor
            if asesoria['nombre_asesor'] and asesoria['apellidos_asesor']:
                asesoria['asesor_completo'] = f"{asesoria['nombre_asesor']} {asesoria['apellidos_asesor']}"
            else:
                asesoria['asesor_completo'] = 'No asignado'
        
        return jsonify({
            'success': True,
            'historial': historial
        })
        
    except Exception as e:
        print(f"Error en api_historial_cliente: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    finally:
        if 'connection' in locals():
            connection.close()

# API para actualizar estado de un cliente
@clientes_asesor_bp.route('/api/actualizar-estado', methods=['POST'])
def api_actualizar_estado():
    """API para actualizar el estado del proceso de un cliente"""
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        data = request.get_json()
        codigo_asesoria = data.get('codigo_asesoria')
        estado_proceso = data.get('estado_proceso')
        observaciones = data.get('observaciones', '')
        
        if not codigo_asesoria or not estado_proceso:
            return jsonify({'error': 'Datos incompletos'}), 400
        
        if estado_proceso not in ['Pendiente', 'Proceso activo', 'Terminado']:
            return jsonify({'error': 'Estado no válido'}), 400
        
        connection = create_connection()
        cursor = connection.cursor()
        
        id_asesor = session.get('user_id')
        
        # Verificar que la asesoría pertenece al asesor
        query_verificacion = """
        SELECT COUNT(*) as count FROM tbl_asesoria 
        WHERE codigo_asesoria = %s AND id_asesor = %s
        """
        cursor.execute(query_verificacion, (codigo_asesoria, id_asesor))
        if cursor.fetchone()[0] == 0:
            return jsonify({'error': 'No autorizado'}), 403
        
        # Actualizar el estado
        query_update = """
        UPDATE tbl_asesoria 
        SET estado_proceso = %s 
        WHERE codigo_asesoria = %s
        """
        cursor.execute(query_update, (estado_proceso, codigo_asesoria))
        
        # Si hay observaciones, crear una nota automática
        if observaciones.strip():
            # Crear tabla de notas si no existe
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS tbl_notas_asesor (
                id INT AUTO_INCREMENT PRIMARY KEY,
                codigo_asesoria INT NOT NULL,
                id_asesor INT NOT NULL,
                contenido TEXT NOT NULL,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (codigo_asesoria) REFERENCES tbl_asesoria(codigo_asesoria),
                FOREIGN KEY (id_asesor) REFERENCES tbl_asesor(id_asesor)
            )
            """)
            
            nota_contenido = f"Estado actualizado a '{estado_proceso}'. Observaciones: {observaciones}"
            query_nota = """
            INSERT INTO tbl_notas_asesor (codigo_asesoria, id_asesor, contenido)
            VALUES (%s, %s, %s)
            """
            cursor.execute(query_nota, (codigo_asesoria, id_asesor, nota_contenido))
        
        connection.commit()
        
        return jsonify({
            'success': True,
            'message': 'Estado actualizado exitosamente'
        })
        
    except Exception as e:
        print(f"Error en api_actualizar_estado: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    finally:
        if 'connection' in locals():
            connection.close()

def generar_numero_serial():
    """Genera un número serial aleatorio de 6 dígitos"""
    return ''.join(random.choices(string.digits, k=6))

def generar_pdf_clientes(clientes_data, id_asesor):
    """Genera PDF con lista de clientes usando reportlab - ACTUALIZADO con nueva ruta de logo"""
    if not REPORTLAB_AVAILABLE:
        raise ImportError("reportlab no está disponible")
    
    # Crear buffer en memoria
    buffer = io.BytesIO()
    
    # Configurar documento
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    story = []
    
    # Estilos
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    # Agregar logo centrado - RUTA ACTUALIZADA
    try:
        logo_path = "static/img/logo-canadian-visa-advise.jpg"
        logo = Image(logo_path, width=2*inch, height=1*inch)
        logo.hAlign = 'CENTER'
        story.append(logo)
        story.append(Spacer(1, 20))
    except:
        # Si no se encuentra el logo, continuar sin él
        pass
    
    # Título
    fecha_actual = datetime.datetime.now().strftime('%d/%m/%Y %H:%M')
    numero_serial = generar_numero_serial()
    
    title = Paragraph(f"Lista de Clientes - Asesor {id_asesor}", title_style)
    story.append(title)
    story.append(Spacer(1, 12))
    
    # Información del reporte
    info_style = ParagraphStyle(
        'InfoStyle',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_CENTER
    )
    
    info_text = f"Reporte generado el {fecha_actual}<br/>Número de serie: {numero_serial}"
    story.append(Paragraph(info_text, info_style))
    story.append(Spacer(1, 20))
    
    # Crear tabla con datos
    data = [['Nombre', 'Documento', 'Tipo Visa', 'Estado Formulario', 'Estado Proceso', 'Fecha Asesoría']]
    
    for cliente in clientes_data:
        data.append([
            cliente.get('nombre_completo', ''),
            f"{cliente.get('tipo_documento', '')} {cliente.get('numero_documento', '')}",
            cliente.get('tipo_asesoria', ''),
            cliente.get('estado_formulario', ''),
            cliente.get('estado_proceso', 'Sin estado'),
            formatear_fecha_pdf(cliente.get('fecha_asesoria', ''))
        ])
    
    # Crear tabla
    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(table)
    
    # Construir PDF
    doc.build(story)
    buffer.seek(0)
    
    # Generar nombre de archivo
    fecha_reporte = datetime.datetime.now().strftime('%Y%m%d')
    filename = f"{id_asesor}_{numero_serial}_{fecha_reporte}.pdf"
    
    return buffer, filename

def formatear_fecha_pdf(fecha_str):
    """Formatea fecha para mostrar en PDF"""
    if not fecha_str:
        return "Sin fecha"
    try:
        fecha = datetime.datetime.fromisoformat(fecha_str.replace('Z', '+00:00'))
        return fecha.strftime('%d/%m/%Y')
    except:
        return fecha_str

# API para exportar clientes a PDF - CORREGIDO: Excluir "Sin estado"
@clientes_asesor_bp.route('/api/exportar-clientes')
def api_exportar_clientes():
    """API para exportar la lista de clientes a PDF usando reportlab"""
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return jsonify({'error': 'No autorizado'}), 401
    
    if not REPORTLAB_AVAILABLE:
        return jsonify({'error': 'reportlab no está disponible'}), 500
    
    try:
        connection = create_connection()
        cursor = connection.cursor(dictionary=True)
        
        id_asesor = session.get('user_id')
        
        # Obtener datos para exportar - CORREGIDO: Excluir NULL/Sin estado
        query = """
        SELECT 
            COALESCE(f.nombre_completo, CONCAT(u.nombres, ' ', u.apellidos)) as nombre_completo,
            f.numero_documento,
            f.tipo_documento,
            a.tipo_asesoria,
            a.fecha_asesoria,
            a.estado_proceso,
            f.pais_residencia,
            f.trabajo_actual,
            u.correo,
            u.celular,
            CASE 
                WHEN f.completado = 1 AND (
                    (f.doc_pasaporte IS NOT NULL AND f.doc_pasaporte != '') OR
                    (f.doc_historial_laboral IS NOT NULL AND f.doc_historial_laboral != '') OR
                    (f.doc_extractos_bancarios IS NOT NULL AND f.doc_extractos_bancarios != '')
                ) THEN 'Completo'
                WHEN f.completado = 1 THEN 'Pendiente (Documentos)'
                ELSE 'Pendiente (Formulario)'
            END as estado_formulario
        FROM tbl_asesoria a
        LEFT JOIN tbl_form_eligibilidadCVA f ON a.id_formElegibilidad = f.id_formElegibilidad
        LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
        LEFT JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        WHERE a.id_asesor = %s AND a.estado_proceso IS NOT NULL
        ORDER BY a.fecha_asesoria DESC
        """
        
        cursor.execute(query, (id_asesor,))
        clientes = cursor.fetchall()
        
        # Formatear fechas para el procesamiento
        for cliente in clientes:
            if cliente['fecha_asesoria']:
                cliente['fecha_asesoria'] = cliente['fecha_asesoria'].isoformat()
        
        # Generar PDF
        buffer, filename = generar_pdf_clientes(clientes, id_asesor)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"Error en api_exportar_clientes: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    finally:
        if 'connection' in locals():
            connection.close()

def generar_pdf_formulario(formulario_data):
    """Genera PDF estructurado con las respuestas del formulario - COMPLETAMENTE ACTUALIZADO"""
    if not REPORTLAB_AVAILABLE:
        raise ImportError("reportlab no está disponible")
    
    # Crear buffer en memoria
    buffer = io.BytesIO()
    
    # Configurar documento
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=50, rightMargin=50)
    story = []
    
    # Estilos
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=20,
        alignment=TA_CENTER
    )
    
    section_style = ParagraphStyle(
        'SectionStyle',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=12,
        textColor=colors.darkblue
    )
    
    normal_style = ParagraphStyle(
        'NormalStyle',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6
    )
    
    # Agregar logo centrado - RUTA ACTUALIZADA
    try:
        logo_path = "static/img/logo-canadian-visa-advise.jpg"
        logo = Image(logo_path, width=2*inch, height=1*inch)
        logo.hAlign = 'CENTER'
        story.append(logo)
        story.append(Spacer(1, 20))
    except:
        # Si no se encuentra el logo, continuar sin él
        pass
    
    # Título
    title = Paragraph("Formulario de Elegibilidad CVA", title_style)
    story.append(title)
    story.append(Spacer(1, 20))
    
    # Información del cliente
    story.append(Paragraph("INFORMACIÓN PERSONAL", section_style))
    
    campos_personales = [
        ('Nombre Completo', formulario_data.get('nombre_completo', 'No especificado')),
        ('Tipo de Documento', formulario_data.get('tipo_documento', 'No especificado')),
        ('Número de Documento', formulario_data.get('numero_documento', 'No especificado')),
        ('Fecha de Nacimiento', formulario_data.get('fecha_nacimiento', 'No especificada')),
        ('Estado Civil', formulario_data.get('estado_civil', 'No especificado')),
        ('País de Residencia', formulario_data.get('pais_residencia', 'No especificado')),
    ]
    
    for campo, valor in campos_personales:
        story.append(Paragraph(f"<b>{campo}:</b> {valor}", normal_style))
    
    story.append(Spacer(1, 15))
    
    # Información del viaje
    story.append(Paragraph("INFORMACIÓN DEL VIAJE", section_style))
    
    campos_viaje = [
        ('Motivo del Viaje', formulario_data.get('motivo_viaje', 'No especificado')),
        ('Propósito Principal', formulario_data.get('proposito_principal', 'No especificado')),
        ('Tiempo de Estadía', formulario_data.get('tiempo_estadia', 'No especificado')),
        ('Provincia de Destino', formulario_data.get('provincia_destino', 'No especificada')),
    ]
    
    for campo, valor in campos_viaje:
        story.append(Paragraph(f"<b>{campo}:</b> {valor}", normal_style))
    
    story.append(Spacer(1, 15))
    
    # Información laboral y económica - CORREGIDO
    story.append(Paragraph("INFORMACIÓN LABORAL Y ECONÓMICA", section_style))
    
    # Manejar trabajo_actual vs trabajo_actual_extranjero
    trabajo_info = "No especificado"
    if formulario_data.get('trabajo_actual'):
        trabajo_info = f"Trabajo Actual: {formulario_data.get('trabajo_actual')}"
    elif formulario_data.get('trabajo_actual_extranjero'):
        trabajo_info = f"Trabajo en Extranjero: {formulario_data.get('trabajo_actual_extranjero')}"
    elif formulario_data.get('motivo_no_trabajo'):
        trabajo_info = f"No trabaja: {formulario_data.get('motivo_no_trabajo')}"
    
    campos_laborales = [
        ('Empleo en País de Origen', formulario_data.get('empleo_origen', 'No especificado')),
        ('Empleo en Extranjero', formulario_data.get('empleo_extranjero', 'No especificado')),
        ('Situación Laboral', trabajo_info),
        ('Tiene Negocios Actuales', formulario_data.get('tiene_negocios_actuales', 'No especificado')),
        ('Descripción de Negocios', formulario_data.get('descripcion_negocios_actuales', 'No especificado')),
        ('Dependencia Económica', formulario_data.get('dependencia_economica', 'No especificado')),
        ('Ingresos Mensuales', f"{formulario_data.get('ingresos_mensuales_moneda', '')} {formulario_data.get('ingresos_mensuales', 'No especificado')}"),
    ]
    
    for campo, valor in campos_laborales:
        if valor and valor != 'No especificado':
            story.append(Paragraph(f"<b>{campo}:</b> {valor}", normal_style))
    
    story.append(Spacer(1, 15))
    
    # Información familiar
    story.append(Paragraph("INFORMACIÓN FAMILIAR", section_style))
    
    campos_familiares = [
        ('Familiares en Canadá', formulario_data.get('familiares_canada', 'No especificado')),
        ('Relación con Familiares en Canadá', formulario_data.get('relacion_familiares_can', 'No especificado')),
        ('Puede Comprobar Relación', formulario_data.get('puede_comprobar_relacion', 'No especificado')),
        ('Viaja Acompañado de Familiar', formulario_data.get('acompana_familiar', 'No especificado')),
        ('Relación con Acompañante', formulario_data.get('relacion_acompana_familiar', 'No especificado')),
        ('Viaja con Conocidos', formulario_data.get('viaja_conocido', 'No especificado')),
    ]
    
    for campo, valor in campos_familiares:
        if valor and valor != 'No especificado':
            story.append(Paragraph(f"<b>{campo}:</b> {valor}", normal_style))
    
    story.append(Spacer(1, 15))
    
    # Preguntas de elegibilidad - COMPLETAMENTE ACTUALIZADO
    story.append(Paragraph("PREGUNTAS DE ELEGIBILIDAD", section_style))
    
    preguntas_elegibilidad = [
        ('Tiene Pasaporte', formulario_data.get('tiene_pasaporte', 'No especificado')),
        ('Número de Pasaporte', formulario_data.get('numero_pasaporte', 'No especificado')),
        ('Respaldo Económico/Co-deudor', formulario_data.get('co_deudor', 'No especificado')),
        ('Posee Ahorros Suficientes', formulario_data.get('posee_ahorros', 'No especificado')),
        ('Estudios en Curso', formulario_data.get('estudios_en_curso', 'No especificado')),
        ('Rechazado por Canadá Anteriormente', formulario_data.get('rechazado_canada', 'No especificado')),
        ('Habla Idioma Oficial', formulario_data.get('habla_idioma_oficial', 'No especificado')),
        ('Aplicado a Programa Migratorio', formulario_data.get('aplicado_programa_migratorio', 'No especificado')),
        ('Intención de Extender Estadía', formulario_data.get('intencion_extender_estadia', 'No especificado')),
        ('Viajes Recientes', formulario_data.get('viajes_recientes', 'No especificado')),
        ('Antecedentes Judiciales', formulario_data.get('antecedente_judiciales', 'No especificado')),
        ('Exámenes Médicos', formulario_data.get('examenes_medicos', 'No especificado')),
        ('Aplicación de Familiares', formulario_data.get('aplicacion_familiares', 'No especificado')),
        ('Biométricos para Canadá', formulario_data.get('biometricos_canada', 'No especificado')),
        ('Dispuesto a Pagar Tasas', formulario_data.get('pago_tasas', 'No especificado')),
        ('Acepta Términos', 'Sí' if formulario_data.get('terminos') else 'No'),
        ('Acepta Política de Privacidad', 'Sí' if formulario_data.get('privacidad') else 'No'),
    ]
    
    for pregunta, respuesta in preguntas_elegibilidad:
        if respuesta and respuesta != 'No especificado':
            story.append(Paragraph(f"<b>{pregunta}:</b> {respuesta}", normal_style))
    
    story.append(Spacer(1, 20))
    
    # Pie de página con información del reporte
    fecha_generacion = datetime.datetime.now().strftime('%d/%m/%Y %H:%M')
    pie_style = ParagraphStyle(
        'PieStyle',
        parent=styles['Normal'],
        fontSize=8,
        alignment=TA_CENTER,
        textColor=colors.grey
    )
    
    story.append(Paragraph(f"Formulario generado el {fecha_generacion}", pie_style))
    
    # Construir PDF
    doc.build(story)
    buffer.seek(0)
    
    return buffer

# Ruta para descargar formulario completo en PDF
@clientes_asesor_bp.route('/api/descargar-formulario/<int:id_form_elegibilidad>')
def descargar_formulario(id_form_elegibilidad):
    """Descargar formulario completo en PDF estructurado"""
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return jsonify({'error': 'No autorizado'}), 401
    
    if not REPORTLAB_AVAILABLE:
        return jsonify({'error': 'reportlab no está disponible'}), 500
    
    try:
        connection = create_connection()
        cursor = connection.cursor(dictionary=True)
        
        id_asesor = session.get('user_id')
        
        # Verificar autorización
        query_verificacion = """
        SELECT COUNT(*) as count FROM tbl_asesoria a
        WHERE a.id_formElegibilidad = %s AND a.id_asesor = %s
        """
        cursor.execute(query_verificacion, (id_form_elegibilidad, id_asesor))
        if cursor.fetchone()['count'] == 0:
            return jsonify({'error': 'No autorizado'}), 403
        
        # Obtener datos del formulario - ACTUALIZADO para obtener más información
        query = """
        SELECT f.*, a.tipo_asesoria, a.fecha_asesoria, a.codigo_asesoria, a.id_solicitante,
               s.id_usuario
        FROM tbl_form_eligibilidadCVA f
        LEFT JOIN tbl_asesoria a ON f.id_formElegibilidad = a.id_formElegibilidad
        LEFT JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
        WHERE f.id_formElegibilidad = %s
        """
        cursor.execute(query, (id_form_elegibilidad,))
        formulario = cursor.fetchone()
        
        if not formulario:
            return jsonify({'error': 'Formulario no encontrado'}), 404
        
        # Generar PDF
        buffer = generar_pdf_formulario(formulario)
        
        # Generar nombre de archivo - NUEVO FORMATO
        numero_serial = generar_numero_serial()
        filename = f"{formulario['id_usuario']}_{formulario['codigo_asesoria']}_{id_form_elegibilidad}_{numero_serial}.pdf"
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"Error en descargar_formulario: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
    finally:
        if 'connection' in locals():
            connection.close()

# Ruta para descargar documento desde Cloudinary - ARREGLADO para descarga directa
@clientes_asesor_bp.route('/api/descargar-documento/<path:url_cloudinary>')
def descargar_documento(url_cloudinary):
    """Descargar un documento específico desde Cloudinary"""
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        # Redirigir directamente a la URL de Cloudinary para descarga
        return redirect(url_cloudinary)
        
    except Exception as e:
        print(f"Error en descargar_documento: {str(e)}")
        return jsonify({'error': 'Error al descargar el documento'}), 500

# Ruta para ver formulario en nueva ventana
@clientes_asesor_bp.route('/formulario/<int:id_form_elegibilidad>')
def ver_formulario(id_form_elegibilidad):
    """Ver formulario completo en una nueva ventana"""
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        flash('Debe iniciar sesión como asesor', 'error')
        return redirect(url_for('auth.login'))
    
    try:
        connection = create_connection()
        cursor = connection.cursor(dictionary=True)
        
        id_asesor = session.get('user_id')
        
        # Verificar autorización
        query_verificacion = """
        SELECT COUNT(*) as count FROM tbl_asesoria a
        WHERE a.id_formElegibilidad = %s AND a.id_asesor = %s
        """
        cursor.execute(query_verificacion, (id_form_elegibilidad, id_asesor))
        if cursor.fetchone()['count'] == 0:
            flash('No tiene autorización para ver este formulario', 'error')
            return redirect(url_for('clientes_asesor.clientes'))
        
        # Obtener datos del formulario
        query = """
        SELECT f.*, a.tipo_asesoria, a.fecha_asesoria
        FROM tbl_form_eligibilidadCVA f
        LEFT JOIN tbl_asesoria a ON f.id_formElegibilidad = a.id_formElegibilidad
        WHERE f.id_formElegibilidad = %s
        """
        cursor.execute(query, (id_form_elegibilidad,))
        formulario = cursor.fetchone()
        
        if not formulario:
            flash('Formulario no encontrado', 'error')
            return redirect(url_for('clientes_asesor.clientes'))
        
        return render_template('asesor/ver_formulario.html', formulario=formulario)
        
    except Exception as e:
        print(f"Error en ver_formulario: {str(e)}")
        flash('Error al cargar el formulario', 'error')
        return redirect(url_for('clientes_asesor.clientes'))
    finally:
        if 'connection' in locals():
            connection.close()

