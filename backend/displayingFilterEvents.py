from flask import Blueprint, jsonify, request
from db import filtered_events_container
import os
import traceback

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

        print(f"📦 Found {len(items)} items for user {user_id}")

        sorted_items = sorted(
            items,
            key=lambda x: (
                x.get('score', 0) * 0.7 +
                x.get('event', {}).get('popularity', x.get('popularity', 0)) * 0.3
            ),
            reverse=True
        )

        formatted = []
        for item in sorted_items[:limit]:
            event = item.get("event", {})
            raw_id = item.get("id", "")
            event_id = event.get("id") or (raw_id.split("_", 1)[1] if "_" in raw_id else raw_id)

            formatted.append({
                "id": event_id,
                "title": event.get("title") or item.get("title") or "Untitled Event",
                "description": event.get("description") or item.get("description") or "No description available",
                "image": event.get("image") or item.get("image"),
                "location": event.get("location") or item.get("location"),
                "date": event.get("date") or item.get("date"),
                "score": item.get("score", 0),
                "reason": item.get("reason", "")
            })

        return jsonify(formatted)

    except Exception as e:
        print("❌ Error in /api/filtered-events:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
