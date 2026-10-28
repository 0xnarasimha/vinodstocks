-- ============================================================================
-- Project 11: Inventory and Stock Analysis System
-- Database Schema (Compatible with MySQL 8.0+ and SQLite 3)
-- ============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_name VARCHAR(120) NOT NULL UNIQUE,
    contact_email VARCHAR(150) DEFAULT '',
    lead_time_days INTEGER NOT NULL DEFAULT 5
);

CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku VARCHAR(40) NOT NULL UNIQUE,
    product_name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL,
    opening_balance INTEGER NOT NULL DEFAULT 0 CHECK (opening_balance >= 0),
    reorder_level INTEGER NOT NULL DEFAULT 10 CHECK (reorder_level >= 0),
    unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0)
);

CREATE TABLE IF NOT EXISTS stock_transactions (
    transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    transaction_date VARCHAR(30) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT')),
    quantity INTEGER NOT NULL,
    supplier_id INTEGER NULL,
    notes VARCHAR(255) DEFAULT '',
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE SET NULL
);
