# Season Bite – Restaurant Table Reservation & Ordering System

Season Bite is a web-based application built using Flask and MySQL.  
It allows customers to view available tables, reserve a table, browse menu items, place orders, and complete payments.  
This project was developed as part of the DBMS Mini Project.

---

## Project Features

### Customer Features
- User registration and login
- View table availability
- Table reservation and cancellation
- Menu browsing
- Order placement linked to reservations
- Automated bill calculation (via stored function)
- Payment processing

### Database Features
- Normalized relational schema
- Stored procedures
- Triggers for table and order status updates
- Functions for calculation
- Join, nested, and aggregate SQL queries
- Complete database schema included

## Project Structure

```

backend/
│ ├── app.py
│ ├── db_config.py
│ └── requirements.txt
│
db/
│ └── schema.sql
│
frontend/
├── index.html
├── app.js
├── style.css
├── image1.png
├── image2.png
└── pexels-pixabay-262047.jpg

```


## Technologies Used

- Python Flask  
- MySQL  
- HTML  
- CSS  
- JavaScript  

---

## How to Run the Project

1. Install backend dependencies:
pip install -r backend/requirements.txt

2. Import the database:
- Open MySQL Workbench or phpMyAdmin
- Run the file located at:
```
db/schema.sql
```

3. Configure the database connection inside:
```
backend/db_config.py
```
5. Run the Flask application:
```
python backend/app.py
```
## SQL File
Full schema, triggers, procedures, functions included in:
```
db/schema.sql
```
---

## Acknowledgment

Project completed as part of the DBMS Mini Project under the guidance of **Prof. Shruthi B**.
