import sqlite3
import hashlib
import os
import csv

DB_PATH = os.path.join(os.path.dirname(__file__), "app.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    ''')
    # History table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            session_name TEXT DEFAULT 'Session 1',
            n_stages INTEGER,
            xor_level INTEGER,
            noise REAL,
            num_samples INTEGER,
            model_type TEXT,
            accuracy REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    try:
        cursor.execute('ALTER TABLE history ADD COLUMN session_name TEXT DEFAULT "Session 1"')
    except sqlite3.OperationalError:
        pass # column already exists
    conn.commit()
    conn.close()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def register_user(username, password):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        pass_hash = hash_password(password)
        cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", 
                       (username, pass_hash))
        conn.commit()
        
        # Also save to an Excel-compatible CSV file for easy viewing
        csv_path = os.path.join(os.path.dirname(__file__), "registered_users.csv")
        file_exists = os.path.isfile(csv_path)
        with open(csv_path, 'a', newline='') as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(["Username", "Registration Password Hash"])
            writer.writerow([username, pass_hash])
            
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def authenticate_user(username, password):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash FROM users WHERE username=?", (username,))
    row = cursor.fetchone()
    conn.close()
    if row and row[0] == hash_password(password):
        return True
    return False

def save_history(username, exp_data, accuracy):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    session_name = exp_data.get('session_name', 'Session 1')
    cursor.execute("""
        INSERT INTO history (username, session_name, n_stages, xor_level, noise, num_samples, model_type, accuracy)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (username, session_name, exp_data.get('n_stages'), exp_data.get('xor_level'), exp_data.get('noise'), 
          exp_data.get('num_samples'), exp_data.get('model_type'), accuracy))
    conn.commit()
    conn.close()

def get_history(username):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM history WHERE username=? ORDER BY timestamp DESC", (username,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def rename_session(username: str, old_name: str, new_name: str) -> bool:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE history SET session_name = ? WHERE username = ? AND session_name = ?", (new_name, username, old_name))
        conn.commit()
        return True
    except sqlite3.Error:
        return False
    finally:
        conn.close()

def delete_session(username: str, session_name: str) -> bool:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM history WHERE username = ? AND session_name = ?", (username, session_name))
        conn.commit()
        return True
    except sqlite3.Error:
        return False
    finally:
        conn.close()
