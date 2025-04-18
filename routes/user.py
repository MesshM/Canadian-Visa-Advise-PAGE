from flask import Blueprint, request, redirect, url_for, flash, render_template, session, jsonify
from config.database import create_connection
from mysql.connector import Error

user_bp = Blueprint('user', __name__)

@user_bp.route('/solicitantes')
def solicitantes():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    # Obtener parámetros de paginación
    page = request.args.get('page', 1, type=int)
    per_page = 10  # Número de solicitantes por página
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            # Contar el total de solicitantes para la paginación
            cursor.execute("SELECT COUNT(*) as total FROM tbl_solicitante")
            total = cursor.fetchone()['total']
            
            # Calcular el offset para la paginación
            offset = (page - 1) * per_page
            
            # Obtener los solicitantes para la página actual
            cursor.execute("""
                SELECT s.id_solicitante, u.id_usuario, u.nombres, u.apellidos, u.correo, u.fecha_nacimiento 
                FROM tbl_solicitante s
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
                ORDER BY s.id_solicitante DESC
                LIMIT %s OFFSET %s
            """, (per_page, offset))
            
            solicitantes = cursor.fetchall()
            
            # Obtener usuarios que no son solicitantes para el formulario de agregar
            cursor.execute("""
                SELECT id_usuario, CONCAT(nombres, ' ', apellidos) as nombre_completo, correo
                FROM tbl_usuario
                WHERE id_usuario NOT IN (SELECT id_usuario FROM tbl_solicitante)
                ORDER BY nombres
            """)
            
            usuarios_disponibles = cursor.fetchall()
            
            # Calcular el número total de páginas
            total_pages = (total + per_page - 1) // per_page
            
            return render_template(
                'solicitantes.html', 
                solicitantes=solicitantes,
                usuarios_disponibles=usuarios_disponibles,
                page=page,
                total_pages=total_pages,
                total=total
            )
        except Error as e:
            flash(f'Error al cargar los solicitantes: {e}', 'error')
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
    
    return redirect(url_for('index'))

@user_bp.route('/agregar_solicitante', methods=['POST'])
def agregar_solicitante():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    # Obtener el ID del usuario seleccionado
    id_usuario = request.form.get('id_usuario')
    
    if not id_usuario:
        flash('Debes seleccionar un usuario', 'error')
        return redirect(url_for('user.solicitantes'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            # Verificar si el usuario ya es un solicitante
            cursor.execute("SELECT * FROM tbl_solicitante WHERE id_usuario = %s", (id_usuario,))
            existing_solicitante = cursor.fetchone()
            
            if existing_solicitante:
                flash('Este usuario ya es un solicitante', 'error')
                return redirect(url_for('user.solicitantes'))
            
            # Insertar nuevo solicitante
            cursor.execute("INSERT INTO tbl_solicitante (id_usuario) VALUES (%s)", (id_usuario,))
            
            connection.commit()
            flash('Usuario agregado como solicitante con éxito', 'success')
        except Error as e:
            connection.rollback()
            flash(f'Error al agregar solicitante: {e}', 'error')
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
    
    return redirect(url_for('user.solicitantes'))

@user_bp.route('/formulario_solicitud')
def formulario_solicitud():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    return render_template('formulario_solicitud.html')

@user_bp.route('/procesar_formulario', methods=['POST'])
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
            return redirect(url_for('user.dashboard'))
            
        except Error as e:
            connection.rollback()
            flash(f'Error al procesar la solicitud: {str(e)}', 'error')
            return redirect(url_for('user.formulario_solicitud'))
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('user.formulario_solicitud'))

@user_bp.route('/obtener_id_solicitante', methods=['GET'])
def obtener_id_solicitante():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401
    
    try:
        connection = create_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            # Obtener el id_solicitante del usuario actual
            cursor.execute("""
                SELECT id_solicitante FROM tbl_solicitante WHERE id_usuario = %s
            """, (session['user_id'],))
            
            result = cursor.fetchone()
            cursor.close()
            connection.close()
            
            if result:
                return jsonify({'id_solicitante': result['id_solicitante']})
            else:
                # Si el usuario no tiene un registro en tbl_solicitante, crearlo
                connection = create_connection()
                if connection:
                    cursor = connection.cursor()
                    try:
                        cursor.execute("""
                            INSERT INTO tbl_solicitante (id_usuario) VALUES (%s)
                        """, (session['user_id'],))
                        
                        id_solicitante = cursor.lastrowid
                        connection.commit()
                        cursor.close()
                        connection.close()
                        
                        return jsonify({'id_solicitante': id_solicitante})
                    except Exception as e:
                        connection.rollback()
                        cursor.close()
                        connection.close()
                        return jsonify({'error': f'Error al crear solicitante: {str(e)}'}), 500
                else:
                    return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        else:
            return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

