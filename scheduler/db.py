"""Postgres access. Creates the database and table on startup if missing."""

from datetime import datetime
from urllib.parse import urlparse, urlunparse

import psycopg
from psycopg.rows import dict_row

from config import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS prices (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    coin        TEXT NOT NULL,
    currency    TEXT NOT NULL,
    price       NUMERIC NOT NULL,
    fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prices_coin_fetched_at_idx
    ON prices (coin, fetched_at);
"""

# Buckets accepted by the date-range endpoint, mapped to date_trunc units.
BUCKETS = {"minute": "minute", "hour": "hour", "day": "day"}


def _ensure_database() -> None:
    """Connect to the admin "postgres" database and create ours if absent."""
    parsed = urlparse(config.database_url)
    db_name = parsed.path.lstrip("/") or "bitcoin"
    admin_url = urlunparse(parsed._replace(path="/postgres"))
    with psycopg.connect(admin_url, autocommit=True) as conn:
        exists = conn.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s", (db_name,)
        ).fetchone()
        if not exists:
            conn.execute(f'CREATE DATABASE "{db_name}"')


def init_db() -> None:
    _ensure_database()
    with psycopg.connect(config.database_url) as conn:
        conn.execute(SCHEMA)
        conn.commit()


def insert_price(coin: str, currency: str, price: float) -> dict:
    with psycopg.connect(config.database_url, row_factory=dict_row) as conn:
        row = conn.execute(
            """
            INSERT INTO prices (coin, currency, price)
            VALUES (%s, %s, %s)
            RETURNING coin, currency, price::float8 AS price, fetched_at
            """,
            (coin, currency, price),
        ).fetchone()
        conn.commit()
        return row


def query_prices(
    coin: str,
    start: datetime,
    end: datetime,
    bucket: str | None,
) -> list[dict]:
    """Price points in [start, end]. Optional bucket averages points per
    minute/hour/day so the UI can render long ranges without thousands of
    raw rows."""
    with psycopg.connect(config.database_url, row_factory=dict_row) as conn:
        if bucket:
            return conn.execute(
                f"""
                SELECT date_trunc('{BUCKETS[bucket]}', fetched_at) AS time,
                       avg(price)::float8 AS price,
                       min(price)::float8 AS low,
                       max(price)::float8 AS high,
                       count(*)           AS samples
                FROM prices
                WHERE coin = %s AND fetched_at BETWEEN %s AND %s
                GROUP BY 1
                ORDER BY 1
                """,
                (coin, start, end),
            ).fetchall()
        return conn.execute(
            """
            SELECT fetched_at AS time, price::float8 AS price
            FROM prices
            WHERE coin = %s AND fetched_at BETWEEN %s AND %s
            ORDER BY fetched_at
            """,
            (coin, start, end),
        ).fetchall()


def latest_price(coin: str) -> dict | None:
    with psycopg.connect(config.database_url, row_factory=dict_row) as conn:
        return conn.execute(
            """
            SELECT coin, currency, price::float8 AS price, fetched_at
            FROM prices
            WHERE coin = %s
            ORDER BY fetched_at DESC
            LIMIT 1
            """,
            (coin,),
        ).fetchone()
