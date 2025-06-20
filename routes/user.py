from flask import Blueprint, request, redirect, url_for, flash, render_template, session, jsonify
from config.database import create_connection
from mysql.connector import Error
from utils.auth_helpers import role_required
import cloudinary
import cloudinary.uploader
import cloudinary.api
from config.cloudinary_config import configure_cloudinary
user_bp = Blueprint('user', __name__)

# Configura Cloudinary una vez al inicio de la aplicación
configure_cloudinary()

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

@user_bp.route('/api/news', methods=['GET'])
def get_news():
    category = request.args.get('category', 'visa-news') # Por defecto, carga noticias de visa

    # Datos de noticias de ejemplo. En una aplicación real, esto vendría de una base de datos.
    # Para 'visa-news', usamos el contenido que ya tenías.
    # Para 'canada-news' y 'platform-news', generamos contenido genérico.
    all_news_data = {
        'visa-news': [
            {
                'title': 'Nuevos requisitos para la visa de estudios en 2024',
                'date': '15/05/2024',
                'description': 'Descubre los cambios más recientes en los requisitos para aplicar a la visa de estudios en Canadá y cómo prepararte.',
                'image_prefix': '1_notice_visa' 
            },
            {
                'title': 'Consejos para una entrevista de visa exitosa',
                'date': '10/05/2024',
                'description': 'Prepara tu entrevista con estos consejos clave de nuestros expertos para aumentar tus posibilidades de aprobación.',
                'image_prefix': '2_notice_visa'
            },
            {
                'title': 'Guía completa para la reunificación familiar en Canadá',
                'date': '01/05/2024',
                'description': 'Todo lo que necesitas saber para traer a tus seres queridos a Canadá a través de los programas de reunificación familiar.',
                'image_prefix': '3_notice_visa'
            }
        ],
        'canada-news': [
            {
                'title': 'Canadá anuncia nuevas oportunidades laborales para inmigrantes',
                'date': '20/05/2024',
                'description': 'El gobierno canadiense ha revelado iniciativas para atraer talento extranjero en sectores clave.',
                'image_prefix': '1_notice_canada'
            },
            {
                'title': 'Las mejores ciudades de Canadá para vivir y trabajar',
                'date': '18/05/2024',
                'description': 'Un análisis de las ciudades canadienses con mejor calidad de vida y oportunidades para inmigrantes.',
                'image_prefix': '2_notice_canada'
            },
            {
                'title': 'Impacto de la economía canadiense en la inmigración',
                'date': '05/05/2024',
                'description': 'Cómo las tendencias económicas actuales de Canadá influyen en las políticas migratorias y oportunidades.',
                'image_prefix': '3_notice_canada'
            }
        ],
        'platform-news': [
            {
                'title': 'Nueva función: Seguimiento de tu caso en tiempo real',
                'date': '25/05/2024',
                'description': 'Hemos lanzado una nueva herramienta para que puedas monitorear el estado de tu aplicación migratoria directamente desde tu perfil.',
                'image_prefix': '1_notice_platform'
            },
            {
                'title': 'Mejoras en la interfaz de usuario para una experiencia más fluida',
                'date': '12/05/2024',
                'description': 'Hemos actualizado el diseño de nuestra plataforma para que sea más intuitiva y fácil de usar.',
                'image_prefix': '2_notice_platform'
            },
            {
                'title': 'Webinar gratuito: Preguntas y respuestas con nuestros asesores',
                'date': '08/05/2024',
                'description': 'Únete a nuestro próximo webinar en vivo para resolver todas tus dudas sobre el proceso migratorio a Canadá.',
                'image_prefix': '3_notice_platform'
            }
        ]
    }

    if category not in all_news_data:
        return jsonify({'error': 'Categoría de noticias no válida'}), 400

    # Mapeo de categorías a carpetas de Cloudinary
    folder_map = {
        'visa-news': 'notice_user/notice_visa', # Asumiendo que tienes una carpeta 'notice_visa'
        'canada-news': 'notice_user/notice_canada',
        'platform-news': 'notice_user/notice_platform'
    }
    
    target_folder = folder_map.get(category)
    if not target_folder:
        return jsonify({'error': 'Carpeta de Cloudinary no definida para esta categoría'}), 500

    try:
        # Obtener recursos de Cloudinary
        result = cloudinary.api.resources(
            type="upload",
            prefix=target_folder,
            max_results=3 # Puedes ajustar este número según la cantidad de imágenes
        )
        
        images = []
        for resource in result.get('resources', []):
            # Extraer el número del public_id para ordenar
            # Ejemplo public_id: 'notice_user/notice_canada/1_notice_canada'
            filename = resource['public_id'].split('/')[-1]
            try:
                # Asumiendo el formato 'NUMERO_resto_del_nombre'
                order_num = int(filename.split('_')[0])
            except (ValueError, IndexError):
                order_num = 9999 # Si falla el parseo, lo pone al final

            images.append({
                'url': resource['secure_url'],
                'order': order_num
            })
        
        # Ordenar imágenes por el número extraído
        images.sort(key=lambda x: x['order'])

        # Combinar los datos de noticias con las URLs de las imágenes usando prefijo
        news_items_with_images = []
        for news_item in all_news_data[category]:
            prefix = news_item.get('image_prefix')
            # Busca la primera imagen cuyo nombre empieza con el prefijo
            image = next(
                (img for img in images if img['url'].split('/')[-1].startswith(prefix)),
                None
            )
            if image:
                news_item['imageUrl'] = image['url']
            else:
                news_item['imageUrl'] = 'https://placehold.co/300x200?text=Sin+Imagen'
            news_items_with_images.append(news_item)

        return jsonify(news_items_with_images)

    except Exception as e:
        print(f"Error al obtener recursos de Cloudinary: {e}")
        return jsonify({'error': f'Error al cargar noticias: {str(e)}'}), 500
