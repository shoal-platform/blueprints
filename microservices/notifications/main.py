"""Notifications service: consumes order_events and exposes the resulting
notifications over HTTP for the dashboard."""

import asyncio
import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import db
from config import config
from consumer import run_consumer

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await db.wait_for_schema()
    logging.getLogger("notifications").info("schema ready")
    task = asyncio.create_task(run_consumer())
    yield
    task.cancel()


app = FastAPI(title="notifications service", lifespan=lifespan)

# The webapp calls this service directly from the browser; demo only, so CORS
# is wide open.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"])


@app.get("/healthz")
async def healthz():
    return {"ok": True}


@app.get("/api/notifications")
async def notifications(order_id: int | None = None):
    if order_id is not None and order_id < 1:
        raise HTTPException(status_code=400, detail="invalid order_id")
    return await db.list_notifications(order_id)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=config.port)
