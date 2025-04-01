from flask import Flask, request, jsonify
from flask_cors import CORS
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

app = Flask(__name__)
CORS(app)  

# Google OAuth 2.0 Client ID (from my email)
GOOGLE_CLIENT_ID = "211582785515-pfp4ois371cp6hd16abtedvfnb83kuat.apps.googleusercontent.com"

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    token = data.get("token")

    try:
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)

        # Extract user info
        email = idinfo.get("email")
        name = idinfo.get("name")

        # Check for stevens.edu domain
        if not email.endswith("@stevens.edu"):
            return jsonify({"success": False, "error": "You must use a stevens.edu email."}), 403

        return jsonify({
            "success": True,
            "message": "Login successful",
            "email": email,
            "name": name
        })

    except Exception as e:
        return jsonify({"success": False, "error": "Invalid token", "details": str(e)}), 400

if __name__ == "__main__":
    app.run(debug=True)
