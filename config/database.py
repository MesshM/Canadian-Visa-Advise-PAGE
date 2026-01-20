import mysql.connector
from mysql.connector import Error

def create_connection():
    try:
        connection = mysql.connector.connect(
            host='',  # Endpoint de RDS
            database='CVA',  # Nombre de tu base de datos
            user='admin',  # Usuario de MySQL en RDS
            password=''  # Contraseña de MySQL en RDS
        )
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"Error al conectar a MySQL: {e}")
        return None

