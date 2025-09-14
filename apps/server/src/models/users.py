from datetime import datetime
from sqlalchemy import func, Index, text
from sqlalchemy.dialects.postgresql import UUID
from src.extensions import db


class Users(db.Model):
    __tablename__ = "users"

    user_id = db.Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        nullable=False,
    )
    email = db.Column(db.Text, unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    active_sessions = db.relationship(
        "ActiveSessions",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    messages = db.relationship(
        "Messages",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        Index("idx_users_email", "email"),
    )

    def __repr__(self) -> str:
        return f"<Users user_id={self.user_id} email={self.email}>"