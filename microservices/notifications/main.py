"""Notifications service: turns order_events into notifications and exposes
them over HTTP for the dashboard. The event fan-out runs as an endpoint
(triggered by a scheduler), not a background loop."""

import logging

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import db
from config import config
from consumer import consume_once

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

app = FastAPI(title="notifications service")

# The webapp calls this service directly from the browser; demo only, so CORS
# is wide open.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"])


@app.get("/notifications-service/healthz")
async def healthz():
    return {"ok": True}


@app.get("/notifications-service/api/notifications")
async def notifications(order_id: int | None = None):
    if order_id is not None and order_id < 1:
        raise HTTPException(status_code=400, detail="invalid order_id")
    return await db.list_notifications(order_id)


@app.post("/notifications-service/api/consume")
async def consume():
    """Process unprocessed order events into notifications. Trigger from a
    scheduler."""
    processed = await consume_once()
    return {"processed": processed}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=config.port)
