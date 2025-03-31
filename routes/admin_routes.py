from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from database import create_connection
from mysql.connector import Error
from datetime import datetime

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/admin')
def admin_index():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('asesor.index_asesor'))
    
    try:
        # Renderizar la plantilla de administrador
        return render_template('index_administrador.html')
    except Exception as e:
        # Capturar y mostrar cualquier error
        print(f"Error al renderizar la plantilla: {str(e)}")
        # Mostrar el error al usuario
        return f"Error: {str(e)}", 500

@admin_bp.route('/clientes')
def clientes_admin():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("""
                SELECT s.id_solicitante, u.nombres, u.apellidos, u.correo, u.fecha_nacimiento 
                FROM tbl_solicitante s
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                ORDER BY s.id_solicitante DESC
            """)
            clientes = cursor.fetchall()
        connection.close()
        return render_template('Administrador/clientes.html', clientes=clientes)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('asesor.index_asesor'))

@admin_bp.route('/pagos_admin')
def pagos_admin():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            # Get payment statistics
            cursor.execute("""
                SELECT 
                    COALESCE(SUM(pa.monto), 0) as total_recibido,
                    COUNT(CASE WHEN pa.estado_pago = 'Completado' THEN 1 END) as pagos_completados,
                    COUNT(CASE WHEN pa.estado_pago = 'Pendiente' THEN 1 END) as pagos_pendientes,
                    COUNT(CASE WHEN pa.estado_pago = 'Rechazado' THEN 1 END) as pagos_rechazados
                FROM tbl_pago_asesoria pa
            """)
            stats = cursor.fetchone()
            
            # Get all payments with client information
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
            
            # Process payments for display
            for pago in pagos:
                # Generate initials for avatar
                nombres = pago['cliente_nombre'].split()
                initials = ''.join([n[0] for n in nombres if n])[:2].upper()
                pago['initials'] = initials
                
                # Format date
                if pago['fecha_pago']:
                    fecha = pago['fecha_pago']
                    pago['fecha_formateada'] = fecha.strftime("%d %b, %Y")
                else:
                    pago['fecha_formateada'] = "N/A"
                
                # Format payment ID
                pago['id_formateado'] = f"PAG-{pago['id_pago']:04d}"
                
                # Assign avatar background color based on initial
                colors = {
                    'A': 'bg-red-100 text-red-600',
                    'B': 'bg-blue-100 text-blue-600',
                    'C': 'bg-green-100 text-green-600',
                    'D': 'bg-yellow-100 text-yellow-600',
                    'E': 'bg-purple-100 text-purple-600',
                    'F': 'bg-pink-100 text-pink-600',
                    'G': 'bg-indigo-100 text-indigo-600',
                    'H': 'bg-gray-100 text-gray-600',
                    'I': 'bg-red-100 text-red-600',
                    'J': 'bg-blue-100 text-blue-600',
                    'K': 'bg-green-100 text-green-600',
                    'L': 'bg-yellow-100 text-yellow-600',
                    'M': 'bg-purple-100 text-purple-600',
                    'N': 'bg-pink-100 text-pink-600',
                    'O': 'bg-indigo-100 text-indigo-600',
                    'P': 'bg-gray-100 text-gray-600',
                    'Q': 'bg-red-100 text-red-600',
                    'R': 'bg-blue-100 text-blue-600',
                    'S': 'bg-green-100 text-green-600',
                    'T': 'bg-yellow-100 text-yellow-600',
                    'U': 'bg-purple-100 text-purple-600',
                    'V': 'bg-pink-100 text-pink-600',
                    'W': 'bg-indigo-100 text-indigo-600',
                    'X': 'bg-gray-100 text-gray-600',
                    'Y': 'bg-red-100 text-red-600',
                    'Z': 'bg-blue-100 text-blue-600',
                }
                first_letter = initials[0] if initials else 'A'
                pago['avatar_class'] = colors.get(first_letter, 'bg-gray-100 text-gray-600')
        
        connection.close()
        return render_template('Administrador/pagos_admin.html', pagos=pagos, stats=stats)
    
    flash('Error de conexión a la base de datos', 'error')
    return redirect(url_for('asesor.index_asesor'))

@admin_bp.route('/reportes')
def reportes_admin():
    if 'user_id' not in session or not session.get('is_admin', False):
        return redirect(url_for('auth.login'))
    
    return render_template('Administrador/reportes.html')

@admin_bp.route('/cambiar_estado_cliente', methods=['POST'])
def cambiar_estado_cliente():
    if 'user_id' not in session or not session.get('is_admin', False):
        return jsonify({'error': 'No autorizado'}), 403

    # Get form data
    id_solicitante = request.form.get('id_solicitante')
    nuevo_estado = request.form.get('estado')
    
    # Validate required fields
    if not all([id_solicitante, nuevo_estado]):
        flash('El ID del cliente y el estado son obligatorios', 'error')
        return redirect(url_for('admin.clientes_admin'))
    
    connection = create_connection()
    if connection:
        try:
            with connection.cursor() as cursor:
                # Update client status
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
    
    return redirect(url_for('admin.clientes_admin'))

@admin_bp.route('/obtener_cliente/<int:id_solicitante>')
def obtener_cliente(id_solicitante):
    if 'user_id' not in session or not session.get('is_admin', False):
        return jsonify({'error': 'No autorizado'}), 403

    connection = create_connection()
    if connection:
        with connection.cursor(dictionary=True) as cursor:
            # Get client details
            cursor.execute("""
                SELECT 
                    s.id_solicitante, 
                    s.fecha_registro, 
                    s.estado, 
                    s.pais,
                    s.tipo_visa,
                    s.telefono,
                    s.direccion,
                    s.fecha_nacimiento,
                    s.datos_adicionales,
                    u.id_usuario,
                    u.nombres,
                    u.apellidos,
                    u.correo
                FROM tbl_solicitante s
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                WHERE s.id_solicitante = %s
            """, (id_solicitante,))
            cliente = cursor.fetchone()
            
            if cliente:
                # Format client ID
                cliente['id_formateado'] = f"CL-{datetime.now().year}-{cliente['id_solicitante']:03d}"
                
                # Format dates
                if cliente['fecha_registro']:
                    cliente['fecha_registro_formateada'] = cliente['fecha_registro'].strftime("%d/%m/%Y")
                else:
                    cliente['fecha_registro_formateada'] = "N/A"
                    
                if cliente['fecha_nacimiento']:
                    cliente['fecha_nacimiento_formateada'] = cliente['fecha_nacimiento'].strftime("%d/%m/%Y")
                else:
                    cliente['fecha_nacimiento_formateada'] = "N/A"
                
                # Get client's asesorias
                cursor.execute("""
                    SELECT 
                        codigo_asesoria,
                        tipo_asesoria,
                        fecha_asesoria as fecha_inicio,
                        estado
                    FROM tbl_asesoria
                    WHERE id_solicitante = %s
                    ORDER BY fecha_asesoria DESC
                """, (id_solicitante,))
                asesorias = cursor.fetchall()
                
                # Format asesorias dates
                for asesoria in asesorias:
                    if asesoria['fecha_inicio']:
                        asesoria['fecha_inicio_formateada'] = asesoria['fecha_inicio'].strftime("%d/%m/%Y")
                    else:
                        asesoria['fecha_inicio_formateada'] = "N/A"
                
                cliente['asesorias'] = asesorias
            
        connection.close()
        
        if cliente:
            return jsonify(cliente)
        else:
            return jsonify({'error': 'Cliente no encontrado'}), 404

    return jsonify({'error': 'Error de conexión a la base de datos'}), 500

@admin_bp.route('/solicitantes')
def solicitantes():
    # Lógica para mostrar la lista de solicitantes
    return render_template('solicitantes.html')