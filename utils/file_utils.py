import os
from werkzeug.utils import secure_filename
from flask import current_app

def allowed_file(filename, allowed_extensions):
    """
    Check if a file has an allowed extension
    
    Args:
        filename (str): The name of the file to check
        allowed_extensions (list): List of allowed file extensions
        
    Returns:
        bool: True if the file extension is allowed, False otherwise
    """
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

def save_file(file, filename, subfolder=''):
    """
    Save an uploaded file to the server
    
    Args:
        file: The file object from request.files
        filename (str): The name to save the file as
        subfolder (str): Optional subfolder within UPLOAD_FOLDER to save the file
        
    Returns:
        str: The path to the saved file, or None if there was an error
    """
    try:
        # Create the full path including any subfolder
        upload_folder = current_app.config['UPLOAD_FOLDER']
        if subfolder:
            folder_path = os.path.join(upload_folder, subfolder)
        else:
            folder_path = upload_folder
            
        # Ensure the directory exists
        os.makedirs(folder_path, exist_ok=True)
        
        # Create the full file path
        filepath = os.path.join(folder_path, filename)
        
        # Save the file
        file.save(filepath)
        
        return filepath
    except Exception as e:
        print(f"Error saving file: {str(e)}")
        return None