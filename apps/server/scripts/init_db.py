# scripts/init_db.py
import os
import sys

# Add project root (folder containing app.py) to PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app import create_app
from src.extensions import db

# Import models so metadata is populated
from src.models import Users  # noqa: F401

app = create_app()

with app.app_context():
    db.create_all()
    print("Tables created.")