from datetime import datetime
from sqlalchemy import func, Index, text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from src.extensions import db


# Postgres enum type: message_role ('user', 'assistant', 'summary')
MessageRoleEnum = db.Enum(
    "user",
    "assistant",
    "summary",
    name="message_role",
    native_enum=True,
    create_type=True,   # set False if the type already exists in your DB
)


class Messages(db.Model):
    __tablename__ = "messages"

    message_id = db.Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        nullable=False,
    )
    user_id = db.Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )

    # NOTE: You said this is a conversation session id (not the refresh-token session),
    # so we leave it as a plain UUID without FK constraints.
    session_id = db.Column(UUID(as_uuid=True), nullable=False)

    role = db.Column(MessageRoleEnum, nullable=False)

    content = db.Column(db.Text, nullable=False)
    mood_label = db.Column(db.Text, nullable=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationship
    user = db.relationship("Users", back_populates="messages")

    __table_args__ = (
        # Composite index with DESC on created_at (matches your SQL)
        Index(
            "idx_messages_user_session",
            "user_id",
            "session_id",
            db.text("created_at DESC"),
        ),
    )

    def __repr__(self) -> str:
        return f"<Messages message_id={self.message_id} user_id={self.user_id} role={self.role}>"