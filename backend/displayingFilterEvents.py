from flask import Blueprint, jsonify, request
from db import filtered_events_container
import os

display_bp = Blueprint("display", __name__)

@display_bp.route("/api/filtered-events", methods=["GET"])
def get_filtered_events():
    user_id = request.args.get("user_id")
    limit = 10  

    try:
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400

        query = f"SELECT * FROM c WHERE c.user_id = '{user_id}'"
        items = list(filtered_events_container.query_items(
            query=query,
            enable_cross_partition_query=True
        ))

        sorted_items = sorted(items, key=lambda x: (x['score'] * 0.7 + x['popularity'] * 0.3), reverse=True)

        return jsonify(sorted_items[:limit])

    except Exception as e:
        return jsonify({"error": str(e)}), 500
