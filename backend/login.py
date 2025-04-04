from flask import Flask, request, jsonify
from flask_cors import CORS
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import sqlite3
import hashlib
import re

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Google OAuth 2.0 Client ID
GOOGLE_CLIENT_ID = "626271905484-u8v1r7b31ga34rhjbo118inos0hv5h3v.apps.googleusercontent.com"

# Database initialization
def init_db():
    try:
        conn = sqlite3.connect('users.db', check_same_thread=False)
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS users
                     (username TEXT UNIQUE, 
                      email TEXT UNIQUE, 
                      password TEXT,
                      is_google_account BOOLEAN)''')
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Database initialization error: {e}")

# Utility functions
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def is_valid_email(email):
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(email_regex, email) is not None

# Login route
@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        
        # Google Sign-In
        if "token" in data:
            try:
                idinfo = id_token.verify_oauth2_token(data['token'], google_requests.Request(), GOOGLE_CLIENT_ID)
                email = idinfo.get("email")
                name = idinfo.get("name")

                conn = sqlite3.connect('users.db', check_same_thread=False)
                c = conn.cursor()
                
                # Check if email already exists
                c.execute("SELECT * FROM users WHERE email = ?", (email,))
                existing_user = c.fetchone()
                
                if existing_user:
                    conn.close()
                    return jsonify({
                        "success": True,
                        "message": "Login successful",
                        "email": email,
                        "name": name
                    })
                
                # If no existing user, insert new user
                c.execute("INSERT INTO users (username, email, is_google_account) VALUES (?, ?, ?)", 
                          (name, email, True))
                conn.commit()
                conn.close()

                return jsonify({
                    "success": True,
                    "message": "Login successful",
                    "email": email,
                    "name": name
                })

            except Exception as e:
                return jsonify({"success": False, "error": f"Google login error: {str(e)}"}), 400
        
        # Username/Password Login
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return jsonify({"success": False, "error": "Username and password are required"}), 400

        conn = sqlite3.connect('users.db', check_same_thread=False)
        c = conn.cursor()
        hashed_password = hash_password(password)
        
        c.execute("SELECT * FROM users WHERE username = ? AND password = ? AND is_google_account = 0", 
                  (username, hashed_password))
        user = c.fetchone()
        conn.close()

        if user:
            return jsonify({
                "success": True,
                "message": "Login successful",
                "username": username
            })
        else:
            return jsonify({"success": False, "error": "Invalid username or password"}), 401

    except Exception as e:
        return jsonify({"success": False, "error": f"Login failed: {str(e)}"}), 500

# Signup route
@app.route("/signup", methods=["POST"])
def signup():
    try:
        data = request.get_json()
        
        # Google Sign-Up
        if "token" in data:
            try:
                idinfo = id_token.verify_oauth2_token(data['token'], google_requests.Request(), GOOGLE_CLIENT_ID)
                email = idinfo.get("email")
                name = idinfo.get("name")

                conn = sqlite3.connect('users.db', check_same_thread=False)
                c = conn.cursor()
                
                # Check if email already exists
                c.execute("SELECT * FROM users WHERE email = ?", (email,))
                existing_user = c.fetchone()
                
                if existing_user:
                    conn.close()
                    return jsonify({
                        "success": False,
                        "error": "Email already registered"
                    }), 400
                
                # If no existing user, insert new user
                c.execute("INSERT INTO users (username, email, is_google_account) VALUES (?, ?, ?)", 
                          (name, email, True))
                conn.commit()
                conn.close()

                return jsonify({
                    "success": True,
                    "message": "Sign up successful",
                    "email": email,
                    "name": name
                })

            except Exception as e:
                return jsonify({"success": False, "error": f"Google signup error: {str(e)}"}), 400
        
        # Username/Password Signup
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")

        # Validate input
        if not username or not email or not password:
            return jsonify({"success": False, "error": "All fields are required"}), 400

        if not is_valid_email(email):
            return jsonify({"success": False, "error": "Invalid email format"}), 400

        conn = sqlite3.connect('users.db', check_same_thread=False)
        c = conn.cursor()
        
        try:
            # Check if username already exists
            c.execute("SELECT * FROM users WHERE username = ?", (username,))
            existing_username = c.fetchone()
            if existing_username:
                conn.close()
                return jsonify({"success": False, "error": "Username already taken"}), 400

            # Check if email already exists
            c.execute("SELECT * FROM users WHERE email = ?", (email,))
            existing_email = c.fetchone()
            if existing_email:
                conn.close()
                return jsonify({"success": False, "error": "Email already registered"}), 400

            # If no existing username or email, insert new user
            c.execute("INSERT INTO users (username, email, password, is_google_account) VALUES (?, ?, ?, ?)", 
                      (username, email, hash_password(password), False))
            conn.commit()
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({"success": False, "error": "Username or email already exists"}), 409

        conn.close()

        return jsonify({
            "success": True,
            "message": "Sign up successful",
            "username": username,
            "email": email
        })

    except Exception as e:
        return jsonify({"success": False, "error": f"Signup failed: {str(e)}"}), 500

if __name__ == "__main__":
    init_db()
    app.run(host='127.0.0.1', port=5000, debug=True)