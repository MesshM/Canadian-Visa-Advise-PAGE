import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
import os

# Cargar variables desde el archivo .env
load_dotenv()

def create_connection():
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST'),
            database=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD')
        )
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"Error al conectar a MySQL: {e}")
        return None

