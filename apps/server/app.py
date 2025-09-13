from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from src.config import settings
from src.extensions import db, migrate

load_dotenv()

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Config
    app.config["SECRET_KEY"] = settings.SECRET_KEY
    app.config["SQLALCHEMY_DATABASE_URI"] = settings.SQLALCHEMY_DATABASE_URI
    app.config["SQLALCHEMY_TRACKMODIFICATIONS"] = False

    # Init extensions
    db.init_app(app)
    migrate.init_app(app, db)

    # Import models so Alembic sees them
    from src.models import user  # noqa: F401

    # Blueprints
    from src.routes.hello import hello_bp
    app.register_blueprint(hello_bp, url_prefix="/api")

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)