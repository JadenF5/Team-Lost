from flask import Flask
from flask_cors import CORS
from login import login_bp
from signup import signup_bp
from event import event_bp
from preferences import preferences_bp
from aisearch import aisearch_bp
from displayingFilterEvents import display_bp

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",  # Be cautious with this in production
        "allow_headers": [
            "Content-Type", 
            "Authorization", 
            "Access-Control-Allow-Credentials"
        ],
        "supports_credentials": True
    }
})


# Register blueprints
app.register_blueprint(login_bp)
app.register_blueprint(signup_bp)
app.register_blueprint(event_bp)
app.register_blueprint(preferences_bp)
app.register_blueprint(aisearch_bp)
app.register_blueprint(display_bp)

if __name__ == "__main__":
    app.run(debug=True, port=5000)