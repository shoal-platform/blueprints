"""Database access. The orders service owns the schema; this service only
waits for the tables to exist and then reads/writes its own rows."""

import asyncio

import psycopg
from psycopg.rows import dict_row

from config import config


async def connect() -> psycopg.AsyncConnection:
    return await psycopg.AsyncConnection.connect(config.database_url, autocommit=True)


async def wait_for_schema(timeout_seconds: float = 60) -> None:
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout_seconds
    last_error: Exception | None = None
    while loop.time() < deadline:
        try:
            async with await connect() as conn:
                cur = await conn.execute(
                    """SELECT to_regclass('public.order_events') IS NOT NULL
                          AND to_regclass('public.notifications') IS NOT NULL"""
                )
                row = await cur.fetchone()
                if row and row[0]:
                    return
        except psycopg.Error as err:
            last_error = err
        await asyncio.sleep(2)
    raise RuntimeError(f"schema never appeared (last error: {last_error})")


async def fetch_unprocessed_events(conn: psycopg.AsyncConnection, limit: int = 50):
    cur = await conn.execute(
        """SELECT e.id, e.order_id, e.status,
                  o.customer_name, o.customer_email
           FROM order_events e
           JOIN orders o ON o.id = e.order_id
           WHERE NOT e.processed
           ORDER BY e.id
           LIMIT %s""",
        (limit,),
    )
    return await cur.fetchall()


async def record_notification(
    conn: psycopg.AsyncConnection, event_id: int, order_id: int, message: str
) -> None:
    # One transaction per event: the notification appears and the event is
    # marked processed atomically, so a crash never drops or duplicates one.
    async with conn.transaction():
        await conn.execute(
            "INSERT INTO notifications (order_id, message) VALUES (%s, %s)",
            (order_id, message),
        )
        await conn.execute(
            "UPDATE order_events SET processed = TRUE WHERE id = %s", (event_id,)
        )


async def list_notifications(order_id: int | None = None, limit: int = 100):
    async with await connect() as conn:
        conn.row_factory = dict_row
        if order_id is not None:
            cur = await conn.execute(
                """SELECT id::int, order_id::int, channel, message, created_at
                   FROM notifications WHERE order_id = %s
                   ORDER BY id DESC LIMIT %s""",
                (order_id, limit),
            )
        else:
            cur = await conn.execute(
                """SELECT id::int, order_id::int, channel, message, created_at
                   FROM notifications ORDER BY id DESC LIMIT %s""",
                (limit,),
            )
        return await cur.fetchall()
