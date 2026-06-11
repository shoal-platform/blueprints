"""Configuration loaded from environment variables (Cloud Run style)."""

import os


class Config:
    # Postgres connection string, e.g. postgres://user:pass@host:5432/bitcoin
    database_url: str = os.environ.get(
        "DATABASE_URL", "postgres://postgres:postgres@localhost:5432/bitcoin"
    )

    # Port the HTTP server listens on. Cloud Run injects PORT.
    port: int = int(os.environ.get("PORT", "8080"))

    # Free price API (CoinGecko, no key required).
    price_api_url: str = os.environ.get(
        "PRICE_API_URL", "https://api.coingecko.com/api/v3/simple/price"
    )

    # Coin and fiat currency to track.
    coin_id: str = os.environ.get("COIN_ID", "bitcoin")
    vs_currency: str = os.environ.get("VS_CURRENCY", "usd")

    # Optional shared secret. If set, the Cloud Scheduler ingest endpoint
    # requires header "X-Scheduler-Token: <value>". Leave unset when using
    # Cloud Run IAM / OIDC auth instead.
    scheduler_token: str | None = os.environ.get("SCHEDULER_TOKEN")


config = Config()
