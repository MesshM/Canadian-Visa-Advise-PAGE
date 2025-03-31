import mysql.connector
from mysql.connector import Error

def create_connection():
    try:
        connection = mysql.connector.connect(
            host='cva.ch86isccq37m.us-east-2.rds.amazonaws.com',
            database='CVA',
            user='admin',
            password='root.2025'
        )
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"Error al conectar a MySQL: {e}")
        return None