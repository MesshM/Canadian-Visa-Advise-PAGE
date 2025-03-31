from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify, send_file
from database import create_connection
from config import Config
from utils.file_utils import allowed_file
from werkzeug.utils import secure_filename
import os
import time
from datetime import datetime

document_bp = Blueprint('document', __name__)

@document_bp.route('/solicitantes')
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
                'solicitudes.html', 
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
    
    return redirect(url_for('auth.index'))

@document_bp.route('/agregar_solicitante', methods=['POST'])
def agregar_solicitante():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    # Obtener el ID del usuario seleccionado
    id_usuario = request.form.get('id_usuario')
    
    if not id_usuario:
        flash('Debes seleccionar un usuario', 'error')
        return redirect(url_for('document.solicitantes'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            # Verificar si el usuario ya es un solicitante
            cursor.execute("SELECT * FROM tbl_solicitante WHERE id_usuario = %s", (id_usuario,))
            existing_solicitante = cursor.fetchone()
            
            if existing_solicitante:
                flash('Este usuario ya es un solicitante', 'error')
                return redirect(url_for('document.solicitantes'))
            
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
    
    return redirect(url_for('document.solicitantes'))

@document_bp.route('/formularios')
def formularios():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("""
                SELECT fe.id_formElegibilidad, CONCAT(u.nombres, ' ', u.apellidos) as solicitante, 
                    fe.motivo_viaje, fe.codigo_pasaporte, fe.pais_residencia  as solicitante, 
                    fe.motivo_viaje, fe.codigo_pasaporte, fe.pais_residencia, fe.provincia_destino
                FROM tbl_form_eligibilidadCVA 
                           fe
                JOIN tbl_solicitante s ON fe.id_solicitante = s.id_solicitante
                JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
            """)
            formularios = cursor.fetchall()
            return render_template('formularios.html', formularios=formularios)
        except Exception as e:
            print(f"Error en la consulta: {e}")
            flash('Error al cargar los formularios', 'error')
            return redirect(url_for('auth.index'))
        finally:
            cursor.close()
            connection.close()
    else:
        flash('Error de conexión a la base de datos', 'error')
        return redirect(url_for('auth.index'))