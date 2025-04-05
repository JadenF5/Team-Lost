from flask import Flask
from flask_cors import CORS
from login import login_bp
from signup import signup_bp
from event import event_bp
from preferences import preferences_bp


app = Flask(__name__)
CORS(app)

# Register blueprints
app.register_blueprint(login_bp)
app.register_blueprint(signup_bp)
app.register_blueprint(event_bp)
app.register_blueprint(preferences_bp)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
