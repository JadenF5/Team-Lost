from flask import Blueprint, request, jsonify
from flask_cors import CORS
from db import container
from urllib.parse import unquote
from filterEvents import run_for_user  

preferences_bp = Blueprint("preferences", __name__)
CORS(preferences_bp)

@preferences_bp.route("/submit-preferences", methods=["POST"])
def submit_preferences():
    data = request.get_json()
    email = data.get("email")
    preferences = data.get("preferences")

    query = f"SELECT * FROM c WHERE c.email='{email}'"
    items = list(container.query_items(query=query, enable_cross_partition_query=True))

    if not items:
        return jsonify({"success": False, "error": "User not found"}), 404

    user = items[0]
    user["preferences"] = preferences
    user["first_time_user"] = False

    container.upsert_item(user)
    
    try:
        run_for_user(email)
    except Exception as e:
        print(f"[FILTER ERROR] Failed to run filter for {email}: {e}")
        return jsonify({"success": True, "message": "Preferences saved, but filtering failed"}), 500

    return jsonify({"success": True, "message": "Preferences saved and filtering complete!"})

# GET route for /user/<email>
@preferences_bp.route("/user/<path:email>", methods=["GET"])
def get_user(email):
    decoded_email = unquote(email)

    query = f"SELECT * FROM c WHERE c.email='{decoded_email}'"
    items = list(container.query_items(query=query, enable_cross_partition_query=True))

    if not items:
        return jsonify({"success": False, "error": "User not found"}), 404

    user = items[0]
    return jsonify(user)
