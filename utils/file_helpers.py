import os
from werkzeug.utils import secure_filename
import time
from flask import current_app

# Función para verificar si un archivo tiene una extensión permitida
def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_profile_photo(file, user_id):
    if file and allowed_file(file.filename):
        # Crear un nombre de archivo seguro
        filename = secure_filename(f"profile_{user_id}_{int(time.time())}.{file.filename.rsplit('.', 1)[1].lower()}")
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        
        # Guardar el archivo
        file.save(filepath)
        
        return f"/static/uploads/{filename}"
    
    return None

