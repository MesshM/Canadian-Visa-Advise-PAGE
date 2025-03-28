# utils/file_utils.py

import os
from werkzeug.utils import secure_filename

def save_uploaded_file(file, upload_folder):
    """
    Guarda un archivo cargado en el servidor.
    
    Args:
        file: Objeto de archivo desde Flask request.
        upload_folder (str): Ruta de la carpeta donde se guardará el archivo.
    
    Returns:
        str: Ruta completa del archivo guardado o None si falla.
    """
    if not file:
        return None

    # Asegurarse de que el directorio de subida exista
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)

    # Generar un nombre seguro para el archivo
    filename = secure_filename(file.filename)
    file_path = os.path.join(upload_folder, filename)

    # Guardar el archivo
    try:
        file.save(file_path)
        return file_path
    except Exception as e:
        print(f"Error al guardar el archivo: {e}")
        return None

def delete_file(file_path):
    """
    Elimina un archivo del servidor.
    
    Args:
        file_path (str): Ruta completa del archivo a eliminar.
    
    Returns:
        bool: True si el archivo fue eliminado, False si no existe o hubo un error.
    """
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            return True
        except Exception as e:
            print(f"Error al eliminar el archivo: {e}")
            return False
    return False

def validate_document(file):
    """
    Valida un documento cargado.
    
    Args:
        file: Objeto de archivo a validar.
    
    Returns:
        bool: True si el documento es válido, False en caso contrario.
    """
    if not file:
        return False

    # Verificar el tamaño del archivo (máximo 5MB)
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)  # Restaurar el puntero del archivo
    if file_size > 5 * 1024 * 1024:  # 5MB límite
        return False

    # Verificar la extensión del archivo
    allowed_extensions = {'.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'}
    filename = file.filename.lower()
    if not any(filename.endswith(ext) for ext in allowed_extensions):
        return False

    return True