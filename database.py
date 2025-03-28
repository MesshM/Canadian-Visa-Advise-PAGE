import os
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def create_connection():
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'cva.ch86isccq37m.us-east-2.rds.amazonaws.com'),
            database=os.getenv('DB_NAME', 'CVA'),
            user=os.getenv('DB_USER', 'admin'),
            password=os.getenv('DB_PASSWORD', 'root.2025')
        )
        if connection.is_connected():
            print("Successfully connected to the database")
            return connection
    except Error as e:
        print(f"Error connecting to MySQL Database: {e}")
        raise  # Re-raise the exception for caller to handle

def close_connection(connection):
    if connection and connection.is_connected():
        connection.close()
        print("MySQL connection is closed")