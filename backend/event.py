from flask import Blueprint, jsonify, request
from db import get_event_w_id

event_bp = Blueprint("event", __name__)

@event_bp.route("/api/event", methods=["GET"])
def fetch_event():
    event_id = request.args.get("id")

    if event_id:
        event = get_event_w_id(event_id)
    else:
        event = None

    if event:
        return jsonify(event)
    else:
        return ("Not found", 404)