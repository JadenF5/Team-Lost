from flask import Blueprint, request, jsonify
from flask_cors import CORS
from db import container

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

    container.upsert_item(user)  # ⬅️ This writes back to CosmosDB

    return jsonify({"success": True, "message": "Preferences saved"})
