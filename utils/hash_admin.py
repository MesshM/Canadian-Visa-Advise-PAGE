from werkzeug.security import generate_password_hash
from config.database import create_connection

def hash_admins_passwords():
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT id_administrador, password FROM tbl_administrador")
        admins = cursor.fetchall()
        for admin in admins:
            pwd = admin['password']
            # Solo hashear si la contraseña no parece ya hasheada
            if pwd and not pwd.startswith('pbkdf2:') and not pwd.startswith('scrypt:'):
                hashed = generate_password_hash(pwd)
                cursor.execute(
                    "UPDATE tbl_administrador SET password = %s WHERE id_administrador = %s",
                    (hashed, admin['id_administrador'])
                )
        connection.commit()
        cursor.close()
        connection.close()
        print("Contraseñas de administradores hasheadas correctamente.")

if __name__ == "__main__":
    hash_admins_passwords()