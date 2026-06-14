"""Configuration loaded from environment variables (Cloud Run style)."""

import os


class Config:
    # Postgres connection string shared by all three services.
    database_url: str = os.environ.get(
        "DATABASE_URL", "postgres://postgres:postgres@localhost:5432/dropship"
    )

    # Port the HTTP server listens on. Cloud Run injects PORT.
    port: int = int(os.environ.get("PORT", "8083"))

    # How often the consumer polls order_events for unprocessed rows.
    poll_interval_seconds: float = float(os.environ.get("POLL_INTERVAL_SECONDS", "2"))


config = Config()
