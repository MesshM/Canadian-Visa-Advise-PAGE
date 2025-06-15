from werkzeug.security import generate_password_hash
from config.database import create_connection

def hash_asesores_passwords():
    connection = create_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT id_asesor, password FROM tbl_asesor")
        asesores = cursor.fetchall()
        for asesor in asesores:
            pwd = asesor['password']
            # Solo hashear si la contraseña no parece ya hasheada
            if pwd and not pwd.startswith('pbkdf2:') and not pwd.startswith('scrypt:'):
                hashed = generate_password_hash(pwd)
                cursor.execute(
                    "UPDATE tbl_asesor SET password = %s WHERE id_asesor = %s",
                    (hashed, asesor['id_asesor'])
                )
        connection.commit()
        cursor.close()
        connection.close()
        print("Contraseñas de asesores hasheadas correctamente.")

if __name__ == "__main__":
    hash_asesores_passwords()