from flask import Flask, request, jsonify
from flask_mysqldb import MySQL

def init_db(app):
    app.config['MYSQL_HOST'] = 'localhost'
    app.config['MYSQL_USER'] = 'root'
    app.config['MYSQL_PASSWORD'] = 'root7680'
    app.config['MYSQL_DB'] = 'restaurant_db'
    app.config['MYSQL_CURSORCLASS'] = 'DictCursor'
    mysql = MySQL(app)
    return mysql

app = Flask(__name__)
mysql = init_db(app)

@app.route('/')
def home():
    return "Restaurant Reservation API is running!"

@app.route('/make_reservation', methods=['POST'])
def make_reservation():
    # Get form data from POST request
    table_id = request.form['table_id']
    customer_id = request.form['customer_id']
    dt = request.form['date_time']  # Format: 'YYYY-MM-DD HH:MM:SS'
    cur = mysql.connection.cursor()
    cur.callproc('MakeReservation', [table_id, customer_id, dt])
    mysql.connection.commit()
    cur.close()
    return jsonify({'message': 'Reservation made successfully.'})

@app.route('/reservations', methods=['GET'])
def reservations():
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM RESERVATION")
    data = cur.fetchall()
    cur.close()
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True)
