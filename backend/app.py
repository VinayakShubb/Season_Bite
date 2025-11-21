from flask import Flask, request, jsonify
from flask_cors import CORS
from db_config import init_db
import datetime

app = Flask(__name__)
CORS(app)
mysql = init_db(app)

# =====================
# USER AUTH
# =====================
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    name = data['name']
    phone = data['phone']
    password = data['password']
    cur = mysql.connection.cursor()
    cur.execute("INSERT INTO CUSTOMER (NAME, PHONE_NUMBER, PASSWORD) VALUES (%s, %s, %s)", (name, phone, password))
    mysql.connection.commit()
    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    phone = data['phone']
    password = data['password']
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM CUSTOMER WHERE PHONE_NUMBER = %s AND PASSWORD = %s", (phone, password))
    user = cur.fetchone()
    if user:
        return jsonify({'success': True, 'user': user})
    else:
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

# =====================
# TABLES & MENU
# =====================
@app.route('/tables/available', methods=['GET'])
def available_tables():
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM TABLES WHERE STATUS='available'")
    tables = cur.fetchall()
    cur.close()
    return jsonify(tables)

@app.route('/menu', methods=['GET'])
def menu():
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM MENU_ITEMS")
    menu = cur.fetchall()
    cur.close()
    return jsonify(menu)

# =====================
# RESERVATION
# =====================
@app.route('/reserve', methods=['POST'])
def reserve():
    data = request.json
    cur = mysql.connection.cursor()
    cur.callproc('MakeReservation', [data['tableid'], data['customerid'], data['datetime']])
    mysql.connection.commit()
    # Hide booked table automatically
    cur.execute("UPDATE TABLES SET STATUS='reserved' WHERE TABLE_ID=%s", [data['tableid']])
    mysql.connection.commit()
    cur.close()
    return jsonify({'message': 'Table reserved successfully!'})

@app.route('/reservations/<int:customer_id>', methods=['GET'])
def get_reservations(customer_id):
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT R.RESERVATION_ID, R.DATE_TIME, T.CAPACITY, T.TABLE_ID, R.STATUS
        FROM RESERVATION R JOIN TABLES T ON R.TABLE_ID = T.TABLE_ID
        WHERE R.CUSTOMER_ID=%s ORDER BY R.DATE_TIME DESC
    """, [customer_id])
    reservations = cur.fetchall()
    cur.close()
    return jsonify(reservations)

# =====================
# ORDERS
# =====================
@app.route('/order', methods=['POST'])
def order():
    data = request.json
    cur = mysql.connection.cursor()
    now = datetime.datetime.now()
    cur.execute("INSERT INTO ORDERS (CUSTOMER_ID, TABLE_ID, ORDER_DATE, STATUS) VALUES (%s, %s, %s, %s)",
                (data['customer_id'], data['table_id'], now, 'ordered'))
    mysql.connection.commit()
    order_id = cur.lastrowid
    for item in data['items']:
        cur.execute("INSERT INTO ORDER_DETAILS (ORDER_ID, MENU_ITEM_ID, QUANTITY) VALUES (%s, %s, %s)",
                    (order_id, item['menu_item_id'], item['quantity']))
    mysql.connection.commit()
    cur.close()
    return jsonify({'order_id': order_id})

# =====================
# PAYMENT
# =====================
@app.route('/payment', methods=['POST'])
def payment():
    data = request.json
    cur = mysql.connection.cursor()
    now = datetime.datetime.now()
    cur.execute("INSERT INTO PAYMENT (ORDER_ID, PAYMENT_DATE, AMOUNT, PAYMENT_METHOD, TRANSACTION_ID, PAYMENT_STATUS) VALUES (%s, %s, %s, %s, %s, %s)",
                (data['order_id'], now, data['amount'], data['method'], 'TRX' + str(int(now.timestamp())), 'completed'))
    mysql.connection.commit()
    cur.close()
    return jsonify({'success': True})

@app.route('/receipt/<int:order_id>', methods=['GET'])
def get_receipt(order_id):
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT C.NAME, T.TABLE_ID, O.ORDER_DATE, M.DISH_NAME, OD.QUANTITY, M.PRICE
        FROM ORDERS O
        JOIN CUSTOMER C ON O.CUSTOMER_ID = C.CUSTOMER_ID
        JOIN TABLES T ON O.TABLE_ID = T.TABLE_ID
        JOIN ORDER_DETAILS OD ON O.ORDER_ID = OD.ORDER_ID
        JOIN MENU_ITEMS M ON OD.MENU_ITEM_ID = M.MENU_ITEM_ID
        WHERE O.ORDER_ID=%s
    """, [order_id])
    rows = cur.fetchall()
    total = sum(r['PRICE'] * r['QUANTITY'] for r in rows)
    cur.close()
    return jsonify({'details': rows, 'total': total})

# =====================
# USER PROFILE
# =====================
@app.route('/profile/<int:customer_id>', methods=['GET'])
def user_profile(customer_id):
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT O.ORDER_ID, T.TABLE_ID, O.ORDER_DATE, O.STATUS
        FROM ORDERS O JOIN TABLES T ON O.TABLE_ID=T.TABLE_ID
        WHERE O.CUSTOMER_ID=%s
        ORDER BY O.ORDER_DATE DESC
    """, [customer_id])
    profile = cur.fetchall()
    cur.close()
    return jsonify(profile)

if __name__ == '__main__':
    app.run(debug=True)
