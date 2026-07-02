"""Turns order_events rows into notifications.

No real emails are sent — each event becomes a notifications row and a log
line, which is enough to demonstrate the async fan-out pattern. Triggered by
an external scheduler instead of a background loop."""

import logging

import db

logger = logging.getLogger("notifications")

MESSAGES = {
    "pending": "Order #{id} received — confirmation email sent to {email}",
    "confirmed": "Order #{id} confirmed, stock reserved — email sent to {email}",
    "backordered": "Order #{id} is backordered — apology email sent to {email}",
    "shipped": "Order #{id} shipped — tracking email sent to {email}",
}


async def consume_once() -> int:
    """Process all currently-unprocessed order_events into notifications.

    Returns the number of events processed."""
    conn = await db.connect()
    try:
        events = await db.fetch_unprocessed_events(conn)
        for event_id, order_id, status, _name, email in events:
            template = MESSAGES.get(
                status, "Order #{id} update ({status}) — email sent to {email}"
            )
            message = template.format(id=order_id, status=status, email=email)
            await db.record_notification(conn, event_id, order_id, message)
            logger.info(message)
        return len(events)
    finally:
        await conn.close()
