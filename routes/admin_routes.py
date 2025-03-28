# routes/admin_routes.py

from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from database import create_connection
from datetime import datetime

# Crear Blueprint
admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

@admin_bp.route('/clientes')
def clientes_admin():
    """Muestra la lista de clientes administrables."""
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('login'))

    connection = create_connection()
    if connection:
        try:
            with connection.cursor(dictionary=True) as cursor:
                cursor.execute("""
                    SELECT s.id_solicitante, u.nombres, u.apellidos, u.correo, u.fecha_nacimiento 
                    FROM tbl_solicitante s
                    JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                    ORDER BY s.id_solicitante DESC
                """)
                clientes = cursor.fetchall()
            return render_template('Administrador/clientes.html', clientes=clientes)
        except Exception as e:
            flash(f'Error al cargar los clientes: {str(e)}', 'error')
        finally:
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('index_asesor'))

@admin_bp.route('/pagos_admin')
def pagos_admin():
    """Muestra la lista de pagos administrables con estadísticas."""
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('login'))

    connection = create_connection()
    if connection:
        try:
            with connection.cursor(dictionary=True) as cursor:
                # Obtener estadísticas de pagos
                cursor.execute("""
                    SELECT 
                        COALESCE(SUM(pa.monto), 0) as total_recibido,
                        COUNT(CASE WHEN pa.estado_pago = 'Completado' THEN 1 END) as pagos_completados,
                        COUNT(CASE WHEN pa.estado_pago = 'Pendiente' THEN 1 END) as pagos_pendientes,
                        COUNT(CASE WHEN pa.estado_pago = 'Rechazado' THEN 1 END) as pagos_rechazados
                    FROM tbl_pago_asesoria pa
                """)
                stats = cursor.fetchone()

                # Obtener todos los pagos con información del cliente
                cursor.execute("""
                    SELECT pa.id_pago, pa.codigo_asesoria, pa.monto, pa.metodo_pago, pa.estado_pago, 
                           pa.fecha_pago, a.tipo_asesoria,
                           CONCAT(u.nombres, ' ', u.apellidos) as cliente_nombre,
                           u.correo as cliente_email
                    FROM tbl_pago_asesoria pa
                    JOIN tbl_asesoria a ON pa.codigo_asesoria = a.codigo_asesoria
                    JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
                    JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                    ORDER BY pa.fecha_pago DESC
                """)
                pagos = cursor.fetchall()

                # Procesar pagos para mostrar
                for pago in pagos:
                    nombres = pago['cliente_nombre'].split()
                    initials = ''.join([n[0] for n in nombres if n])[:2].upper()
                    pago['initials'] = initials
                    pago['fecha_formateada'] = pago['fecha_pago'].strftime("%d %b, %Y") if pago['fecha_pago'] else "N/A"
                    pago['id_formateado'] = f"PAG-{pago['id_pago']:04d}"

            return render_template('Administrador/pagos_admin.html', stats=stats, pagos=pagos)
        except Exception as e:
            flash(f'Error al cargar los pagos: {str(e)}', 'error')
        finally:
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('index_asesor'))

@admin_bp.route('/documentos_asesor')
def documentos_asesor():
    """Muestra la página de documentos del asesor."""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('Administrador/documentos_asesor.html')

@admin_bp.route('/documentos/<int:id_solicitante>')
def documentos_cliente(id_solicitante):
    """Muestra los documentos asociados a un cliente específico."""
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('login'))

    connection = create_connection()
    if connection:
        try:
            with connection.cursor(dictionary=True) as cursor:
                cursor.execute("""
                    SELECT 
                        s.id_solicitante, 
                        s.codigo_expediente,
                        s.estado, 
                        s.pais,
                        s.tipo_visa,
                        CONCAT(u.nombres, ' ', u.apellidos) as nombre_completo,
                        u.correo
                    FROM tbl_solicitante s
                    JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                    WHERE s.id_solicitante = %s
                """, (id_solicitante,))
                cliente = cursor.fetchone()
                if not cliente:
                    flash('Cliente no encontrado', 'error')
                    return redirect(url_for('clientes_admin'))

                cursor.execute("""
                    SELECT 
                        d.id_documento,
                        d.nombre_documento,
                        d.nombre_archivo,
                        d.tipo_archivo,
                        d.fecha_carga,
                        d.estado_documento,
                        d.observaciones,
                        d.ruta_archivo
                    FROM tbl_documento d
                    WHERE d.id_solicitante = %s
                    ORDER BY d.fecha_carga DESC
                """, (id_solicitante,))
                documentos = cursor.fetchall()

                for doc in documentos:
                    doc['fecha_formateada'] = doc['fecha_carga'].strftime("%d/%m/%Y") if doc['fecha_carga'] else "N/A"

            return render_template('Administrador/documentos_asesor.html', cliente=cliente, documentos=documentos)
        except Exception as e:
            flash(f'Error al cargar los documentos: {str(e)}', 'error')
        finally:
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('clientes_admin'))

@admin_bp.route('/reportes')
def reportes_admin():
    """Muestra la página de reportes administrativos."""
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('login'))
    return render_template('Administrador/reportes.html')

@admin_bp.route('/cambiar_estado_cliente', methods=['POST'])
def cambiar_estado_cliente():
    """Cambia el estado de un cliente."""
    if 'user_id' not in session or not session.get('is_admin', False):
        return jsonify({'error': 'No autorizado'}), 403

    id_solicitante = request.form.get('id_solicitante')
    nuevo_estado = request.form.get('estado')

    if not all([id_solicitante, nuevo_estado]):
        flash('El ID del cliente y el estado son obligatorios', 'error')
        return redirect(url_for('clientes_admin'))

    connection = create_connection()
    if connection:
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE tbl_solicitante 
                    SET estado = %s
                    WHERE id_solicitante = %s
                """, (nuevo_estado, id_solicitante))
                connection.commit()
                flash('Estado del cliente actualizado correctamente', 'success')
        except Exception as e:
            connection.rollback()
            flash(f'Error al actualizar el estado del cliente: {str(e)}', 'error')
        finally:
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('clientes_admin'))

@admin_bp.route('/solicitantes')
def solicitantes():
    """
    Route to view list of applicants (solicitantes).
    Requires admin authentication.
    """
    # Check if user is logged in and is an admin
    if 'user_id' not in session:
        flash('Debe iniciar sesión', 'error')
        return redirect(url_for('auth.login'))
    
    if not session.get('is_admin', False):
        flash('No tiene permisos de administrador', 'error')
        return redirect(url_for('index'))
    
    # Add logic to fetch solicitantes from database
    try:
        connection = create_connection()
        if connection:
            with connection.cursor(dictionary=True) as cursor:
                cursor.execute("""
                    SELECT s.id_solicitante, u.nombres, u.apellidos, u.correo, 
                           s.estado_solicitud, s.fecha_registro
                    FROM tbl_solicitante s
                    JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                    ORDER BY s.fecha_registro DESC
                """)
                solicitantes = cursor.fetchall()
            
            return render_template('admin/solicitantes.html', solicitantes=solicitantes)
    
    except Exception as e:
        flash(f'Error al cargar solicitantes: {str(e)}', 'error')
    
    finally:
        if connection:
            connection.close()
    
    return redirect(url_for('index'))