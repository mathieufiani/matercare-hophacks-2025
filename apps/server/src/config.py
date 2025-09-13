# src/config.py
import os
from dataclasses import dataclass

@dataclass
class Settings:
    SECRET_KEY: str
    SQLALCHEMY_DATABASE_URI: str

def _default_db_uri() -> str:
    # Prefer DATABASE_URL if set. Fallback to local Postgres, then SQLite.
    env = os.getenv("DATABASE_URL")
    if env:
        return env
    # Default to local Postgres dev DB
    return "postgresql+psycopg2://postgres:postgres@localhost:5432/matercare_dev"
    # If you don't have Postgres yet, you can temporarily use:
    # return "sqlite:///dev.db"

settings = Settings(
    SECRET_KEY=os.getenv("SECRET_KEY", "dev-secret-key-change-me"),
    SQLALCHEMY_DATABASE_URI=_default_db_uri(),
)