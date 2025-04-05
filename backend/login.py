from flask import Blueprint, request, jsonify
from flask_cors import CORS
from db import container
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

login_bp = Blueprint("login", __name__)
CORS(login_bp)

GOOGLE_CLIENT_ID = "211582785515-pfp4ois371cp6hd16abtedvfnb83kuat.apps.googleusercontent.com"

@login_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email_or_username = data.get("email_or_username")
    password = data.get("password")

    if not email_or_username or not password:
        return jsonify({"success": False, "error": "Missing fields"}), 400

    query = f"SELECT * FROM c WHERE c.email='{email_or_username}' OR c.username='{email_or_username}'"
    users = list(container.query_items(query=query, enable_cross_partition_query=True))

    if not users:
        return jsonify({"success": False, "error": "User not found"}), 404

    user = users[0]

    if user.get("password") != password:
        return jsonify({"success": False, "error": "Incorrect password"}), 403

    return jsonify({"success": True, "message": "Login successful", "user": user})


@login_bp.route("/login/google", methods=["POST"])
def login_google():
    data = request.get_json()
    token = data.get("token")

    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        email = idinfo.get("email")

        query = f"SELECT * FROM c WHERE c.email='{email}'"
        users = list(container.query_items(query=query, enable_cross_partition_query=True))

        if not users:
            return jsonify({"success": False, "error": "Google account not registered"}), 404

        return jsonify({"success": True, "message": "Logged in with Google", "user": users[0]})

    except Exception as e:
        return jsonify({"success": False, "error": "Invalid token", "details": str(e)}), 400
