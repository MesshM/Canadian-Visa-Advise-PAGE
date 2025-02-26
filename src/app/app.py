from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html') 

if __name__ == "__main__":
    app.run(debug=True, port=5050)

import mysql.connector

conexion = mysql.connector.connect(user='root', password='root', 
                                    host='localhost', 
                                    database='cva',
                                    port='3306')