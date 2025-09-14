from datetime import datetime
from sqlalchemy import func, Index, text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from src.extensions import db


class ActiveSessions(db.Model):
    __tablename__ = "active_sessions"

    session_id = db.Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        nullable=False,
    )
    user_id = db.Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=False,
    )
    refresh_token_hash = db.Column(db.Text, nullable=False, unique=True)
    user_agent = db.Column(db.Text, nullable=True)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationship
    user = db.relationship("Users", back_populates="active_sessions")

    __table_args__ = (
        Index("idx_active_sessions_user_id", "user_id"),
    )

    def __repr__(self) -> str:
        return f"<ActiveSessions session_id={self.session_id} user_id={self.user_id}>"