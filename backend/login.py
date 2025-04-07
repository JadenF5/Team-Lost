from flask import Blueprint, request, jsonify
from flask_cors import CORS
from db import container
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from filterEvents import run_for_user
from threading import Thread, Lock
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Dictionary to track users who are currently being filtered
# This prevents multiple filtering processes for the same user
filtering_users = {}
filter_lock = Lock()

login_bp = Blueprint("login", __name__)
CORS(login_bp)

GOOGLE_CLIENT_ID = "211582785515-pfp4ois371cp6hd16abtedvfnb83kuat.apps.googleusercontent.com"

def start_filtering_if_needed(user_id):
    """
    Start filtering for a user if not already in progress.
    Returns True if filtering was started, False if already in progress.
    """
    with filter_lock:
        # Check if filtering is already in progress for this user
        if user_id in filtering_users and filtering_users[user_id]:
            logger.info(f"Filtering already in progress for user {user_id}")
            return False
        
        # Mark this user as being filtered
        filtering_users[user_id] = True
    
    def run_and_mark_complete():
        """Inner function to run filtering and mark as complete when done"""
        try:
            logger.info(f"Starting filtering process for user {user_id}")
            run_for_user(user_id)
            logger.info(f"Filtering completed for user {user_id}")
        except Exception as e:
            logger.error(f"[AI FILTER ERROR] Error filtering for user {user_id}: {e}")
        finally:
            # Mark filtering as complete for this user
            with filter_lock:
                filtering_users[user_id] = False
    
    # Start the thread
    Thread(target=run_and_mark_complete).start()
    return True

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
        
    # Start filtering in a controlled way
    try:
        if start_filtering_if_needed(user["id"]):
            logger.info(f"Started filtering for user {user['id']}")
        else:
            logger.info(f"Filtering already in progress for user {user['id']}")
    except Exception as e:
        logger.error(f"[AI FILTER ERROR] Could not start filtering for user {user['id']}: {e}")

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

        # Start filtering in a controlled way
        try:
            if start_filtering_if_needed(users[0]["id"]):
                logger.info(f"Started filtering for user {users[0]['id']}")
            else:
                logger.info(f"Filtering already in progress for user {users[0]['id']}")
        except Exception as e:
            logger.error(f"[AI FILTER ERROR] Could not start filtering for user {users[0]['id']}: {e}")

        return jsonify({"success": True, "message": "Logged in with Google", "user": users[0]})

    except Exception as e:
        return jsonify({"success": False, "error": "Invalid token", "details": str(e)}), 400