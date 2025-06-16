from flask import Blueprint, request, redirect, url_for, flash, render_template, session, jsonify
from config.database import create_connection
from mysql.connector import Error
from utils.auth_helpers import role_required

user_bp = Blueprint('user', __name__)

@user_bp.route('/agregar_solicitante', methods=['POST'])
@role_required('Usuario')
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

@user_bp.route('/obtener_id_solicitante', methods=['GET'])
@role_required('Usuario')
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
