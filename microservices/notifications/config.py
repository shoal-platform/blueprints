"""Configuration loaded from environment variables (Cloud Run style)."""

import os


def _require(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        raise RuntimeError(f"{key} is required")
    return value


class Config:
    # Postgres connection string shared by all three services (required).
    database_url: str = _require("DATABASE_URL")

    # Port the HTTP server listens on. Cloud Run injects PORT.
    port: int = int(os.environ.get("PORT", "8080"))


config = Config()
