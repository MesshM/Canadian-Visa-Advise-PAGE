import mysql.connector
from mysql.connector import Error

def create_connection():
    try:
        connection = mysql.connector.connect(
            host='cva.ch86isccq37m.us-east-2.rds.amazonaws.com',  # Endpoint de RDS
            database='CVA',  # Nombre de tu base de datos
            user='admin',  # Usuario de MySQL en RDS
            password='root.2025'  # Contraseña de MySQL en RDS
        )
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"Error al conectar a MySQL: {e}")
        return None

