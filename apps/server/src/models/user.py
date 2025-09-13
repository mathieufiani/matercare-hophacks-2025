from src.extensions import db
from src.models.mixins import UUIDPK, Timestamped
from werkzeug.security import generate_password_hash, check_password_hash

class User(UUIDPK, Timestamped, db.Model):
    __tablename__ = "users"

    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, index=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    user_queries = db.relationship("UserQuery", back_populates="user", cascade="all, delete-orphan")
    summaries = db.relationship("Summary", back_populates="user", cascade="all, delete-orphan")

    def set_password(self, raw: str) -> None:
        self.password_hash = generate_password_hash(raw)

    def check_password(self, raw: str) -> bool:
        return check_password_hash(self.password_hash, raw)