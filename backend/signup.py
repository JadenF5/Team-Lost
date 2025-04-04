# signup.py
from flask import Blueprint, request, jsonify
from flask_cors import CORS
import re
from db import container
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

signup_bp = Blueprint("signup", __name__)
CORS(signup_bp)

GOOGLE_CLIENT_ID = "211582785515-pfp4ois371cp6hd16abtedvfnb83kuat.apps.googleusercontent.com"

def valid_password(pw):
    return re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$', pw)

@signup_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    email = data.get("email").lower()
    username = data.get("username")
    password = data.get("password")
    confirm = data.get("confirm_password")

    if not all([email, username, password, confirm]):
        return jsonify({"success": False, "error": "All fields are required"}), 400

    if password != confirm:
        return jsonify({"success": False, "error": "Passwords do not match"}), 400

    if not valid_password(password):
        return jsonify({"success": False, "error": "Password is too weak"}), 400

    query = f"SELECT * FROM c WHERE c.email='{email}' OR c.username='{username}'"
    items = list(container.query_items(query=query, enable_cross_partition_query=True))

    if items:
        return jsonify({"success": False, "error": "Email or username already in use"}), 409

    user_data = {
        "id": email,
        "email": email,
        "username": username,
        "password": password
    }

    container.create_item(user_data)
    return jsonify({"success": True, "message": "User registered!"})

@signup_bp.route("/signup/google", methods=["POST"])
def signup_google():
    data = request.get_json()
    token = data.get("token")

    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        email = idinfo["email"].lower()
        name = idinfo.get("name")

        query = f"SELECT * FROM c WHERE c.email='{email}'"
        existing = list(container.query_items(query=query, enable_cross_partition_query=True))

        if existing:
            return jsonify({"success": False, "error": "Email already registered"}), 409

        container.create_item({
            "id": email,
            "email": email,
            "username": name,
            "password": None  # optional
        })

        return jsonify({"success": True, "message": "Signed up with Google!", "email": email, "username": name})

    except Exception as e:
        return jsonify({"success": False, "error": "Invalid Google token", "details": str(e)}), 400
