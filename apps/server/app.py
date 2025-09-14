from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from src.config import settings
from src.extensions import db, migrate

load_dotenv()

def create_app():
    app = Flask(__name__)

    allowed_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

    CORS(
        app,
        resources={r"/api/*": {"origins": allowed_origins}},
        supports_credentials=False,
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
        max_age=86400,
        always_send=True,  # make sure headers are added even on errors / not-found
    )

    # Config
    app.config["SECRET_KEY"] = settings.SECRET_KEY
    app.config["SQLALCHEMY_DATABASE_URI"] = settings.SQLALCHEMY_DATABASE_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Init extensions
    db.init_app(app)
    migrate.init_app(app, db)

    # Import models so Alembic / create_all can discover them
    with app.app_context():
        # Either import the classes directly…
        from src.models.users import Users 
        from src.models.messages import Messages 
        from src.models.active_sessions import ActiveSessions
        # …or, if you prefer to use the package exports:
        # from src.models import Users, UserQuery, Summary  # noqa: F401

    # Blueprints
    from src.routes.hello import hello_bp
    from src.routes.auth import auth_bp
    app.register_blueprint(hello_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)