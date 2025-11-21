-- ========================
-- DATABASE SETUP
-- ========================
CREATE DATABASE restaurant_db;
USE restaurant_db;

-- ========================
-- TABLES CREATION
-- ========================
CREATE TABLE CUSTOMER (
    CUSTOMER_ID INT AUTO_INCREMENT PRIMARY KEY,
    NAME VARCHAR(50),
    PHONE_NUMBER VARCHAR(15),
    PASSWORD VARCHAR(60)
);

CREATE TABLE TABLES (
    TABLE_ID INT AUTO_INCREMENT PRIMARY KEY,
    CAPACITY INT,
    STATUS VARCHAR(10) DEFAULT 'available'
);

CREATE TABLE RESERVATION (
    RESERVATION_ID INT AUTO_INCREMENT PRIMARY KEY,
    TABLE_ID INT,
    CUSTOMER_ID INT,
    DATE_TIME DATETIME,
    STATUS VARCHAR(15) DEFAULT 'active',
    FOREIGN KEY (TABLE_ID) REFERENCES TABLES(TABLE_ID),
    FOREIGN KEY (CUSTOMER_ID) REFERENCES CUSTOMER(CUSTOMER_ID)
);

CREATE TABLE MENU_ITEMS (
    MENU_ITEM_ID INT AUTO_INCREMENT PRIMARY KEY,
    DISH_NAME VARCHAR(50),
    PRICE DECIMAL(10, 2)
);

CREATE TABLE ORDERS (
    ORDER_ID INT AUTO_INCREMENT PRIMARY KEY,
    CUSTOMER_ID INT,
    TABLE_ID INT,
    ORDER_DATE DATETIME,
    STATUS VARCHAR(15) DEFAULT 'pending',
    FOREIGN KEY (CUSTOMER_ID) REFERENCES CUSTOMER(CUSTOMER_ID),
    FOREIGN KEY (TABLE_ID) REFERENCES TABLES(TABLE_ID)
);

CREATE TABLE ORDER_DETAILS (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    ORDER_ID INT,
    MENU_ITEM_ID INT,
    QUANTITY INT,
    FOREIGN KEY (ORDER_ID) REFERENCES ORDERS(ORDER_ID),
    FOREIGN KEY (MENU_ITEM_ID) REFERENCES MENU_ITEMS(MENU_ITEM_ID)
);

CREATE TABLE PAYMENT (
    PAYMENT_ID INT AUTO_INCREMENT PRIMARY KEY,
    ORDER_ID INT,
    PAYMENT_DATE DATETIME,
    AMOUNT DECIMAL(10,2),
    PAYMENT_METHOD VARCHAR(15),
    TRANSACTION_ID VARCHAR(50),
    PAYMENT_STATUS VARCHAR(10),
    FOREIGN KEY (ORDER_ID) REFERENCES ORDERS(ORDER_ID)
);

-- ========================
-- SAMPLE DATA
-- ========================
INSERT INTO TABLES (CAPACITY, STATUS) VALUES 
(2, 'available'),
(4, 'available'),
(6, 'available');

INSERT INTO MENU_ITEMS (DISH_NAME, PRICE) VALUES 
('Paneer Tikka', 250.00), 
('Butter Naan', 70.00), 
('Chicken Biryani', 350.00);

-- ========================
-- STORED PROCEDURES & FUNCTIONS
-- ========================
DELIMITER //

-- PROCEDURE: Make Reservation
CREATE PROCEDURE MakeReservation(
    IN in_table_id INT,
    IN in_customer_id INT,
    IN in_dt DATETIME
)
BEGIN
    DECLARE table_status VARCHAR(10);
    
    -- Check if table is available
    SELECT STATUS INTO table_status FROM TABLES WHERE TABLE_ID = in_table_id FOR UPDATE;

    IF table_status = 'available' THEN
        INSERT INTO RESERVATION (TABLE_ID, CUSTOMER_ID, DATE_TIME, STATUS)
        VALUES (in_table_id, in_customer_id, in_dt, 'active');
        -- TABLES STATUS will automatically update via trigger
    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Table is not available for reservation';
    END IF;
END //

-- PROCEDURE: Cancel Reservation
CREATE PROCEDURE CancelReservation(
    IN in_reservation_id INT
)
BEGIN
    DECLARE t_id INT;

    SELECT TABLE_ID INTO t_id 
    FROM RESERVATION 
    WHERE RESERVATION_ID = in_reservation_id;

    UPDATE RESERVATION 
    SET STATUS = 'cancelled' 
    WHERE RESERVATION_ID = in_reservation_id;

    -- TABLES STATUS will automatically update via trigger
END //

-- FUNCTION: Calculate Total Order Amount
CREATE FUNCTION CalculateTotal(orderId INT)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE total DECIMAL(10,2);
    SELECT SUM(MI.PRICE * OD.QUANTITY) INTO total
    FROM ORDER_DETAILS OD
    JOIN MENU_ITEMS MI ON MI.MENU_ITEM_ID = OD.MENU_ITEM_ID
    WHERE OD.ORDER_ID = orderId;
    RETURN IFNULL(total, 0);
END //

-- PROCEDURE: Make Payment
CREATE PROCEDURE MakePayment(
    IN in_order_id INT,
    IN in_method VARCHAR(15)
)
BEGIN
    DECLARE total_amount DECIMAL(10,2);
    SET total_amount = CalculateTotal(in_order_id);

    INSERT INTO PAYMENT (ORDER_ID, PAYMENT_DATE, AMOUNT, PAYMENT_METHOD, TRANSACTION_ID, PAYMENT_STATUS)
    VALUES (
        in_order_id,
        NOW(),
        total_amount,
        in_method,
        CONCAT('TXN', UNIX_TIMESTAMP(NOW())),
        'completed'
    );
END //

-- ========================
-- TRIGGERS
-- ========================

-- TRIGGER: After Reservation Insert (Mark table as reserved)
CREATE TRIGGER AfterInsertReservation
AFTER INSERT ON RESERVATION
FOR EACH ROW
BEGIN
    IF NEW.STATUS = 'active' THEN
        UPDATE TABLES 
        SET STATUS = 'reserved' 
        WHERE TABLE_ID = NEW.TABLE_ID;
    END IF;
END //

-- TRIGGER: After Reservation Cancel (Mark table as available)
CREATE TRIGGER AfterCancelReservation
AFTER UPDATE ON RESERVATION
FOR EACH ROW
BEGIN
    IF NEW.STATUS = 'cancelled' THEN
        UPDATE TABLES 
        SET STATUS = 'available' 
        WHERE TABLE_ID = NEW.TABLE_ID;
    END IF;
END //

-- TRIGGER: After Payment Insert (Mark order as paid)
CREATE TRIGGER AfterPaymentInsert
AFTER INSERT ON PAYMENT
FOR EACH ROW
BEGIN
    UPDATE ORDERS 
    SET STATUS = 'paid' 
    WHERE ORDER_ID = NEW.ORDER_ID;
END //

DELIMITER ;

-- ========================
-- USAGE EXAMPLES
-- ========================

-- ✅ 1. Make a reservation
-- CALL MakeReservation(2, 1, '2025-11-05 19:30:00');

-- ✅ 2. Cancel a reservation
-- CALL CancelReservation(1);

-- ✅ 3. Check table status
-- SELECT * FROM TABLES;

-- ✅ 4. Make payment
-- CALL MakePayment(1, 'UPI');
