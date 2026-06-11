"""Bitcoin price tracker.

Two jobs:
  * POST /tasks/fetch-price  — hit by Cloud Scheduler; fetches the latest
    bitcoin price from a free API (CoinGecko) and stores it in Postgres.
  * GET  /api/prices         — returns prices over a date range, optionally
    bucketed, ready for a UI to render a graph.
"""

import logging
from datetime import datetime, timedelta, timezone

import httpx
import uvicorn
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import db
from config import config

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("scheduler")

app = FastAPI(title="Bitcoin price scheduler")

# The graph UI is served elsewhere, so allow cross-origin reads.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    db.init_db()
    log.info("Database ready; tracking %s in %s", config.coin_id, config.vs_currency)


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok"}


@app.post("/tasks/fetch-price")
async def fetch_price(
    x_scheduler_token: str | None = Header(default=None),
) -> dict:
    """Cloud Scheduler target. Fetches the current price and stores it."""
    if config.scheduler_token and x_scheduler_token != config.scheduler_token:
        raise HTTPException(status_code=401, detail="Bad or missing scheduler token")

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            config.price_api_url,
            params={"ids": config.coin_id, "vs_currencies": config.vs_currency},
        )
    if resp.status_code != 200:
        log.error("Price API returned %s: %s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="Price API request failed")

    try:
        price = float(resp.json()[config.coin_id][config.vs_currency])
    except (KeyError, TypeError, ValueError):
        log.error("Unexpected price API payload: %s", resp.text)
        raise HTTPException(status_code=502, detail="Unexpected price API payload")

    row = db.insert_price(config.coin_id, config.vs_currency, price)
    log.info("Stored %s = %s %s", config.coin_id, price, config.vs_currency)
    return {"stored": row}


@app.get("/api/prices")
def get_prices(
    start: datetime | None = Query(default=None, description="ISO 8601, default 24h ago"),
    end: datetime | None = Query(default=None, description="ISO 8601, default now"),
    bucket: str | None = Query(
        default=None, description="Aggregate points: minute, hour, or day"
    ),
) -> dict:
    """Prices over a date range, for rendering a graph."""
    end = end or datetime.now(timezone.utc)
    start = start or end - timedelta(days=1)
    if start >= end:
        raise HTTPException(status_code=400, detail="start must be before end")
    if bucket is not None and bucket not in db.BUCKETS:
        raise HTTPException(
            status_code=400, detail=f"bucket must be one of {sorted(db.BUCKETS)}"
        )

    points = db.query_prices(config.coin_id, start, end, bucket)
    return {
        "coin": config.coin_id,
        "currency": config.vs_currency,
        "start": start,
        "end": end,
        "bucket": bucket,
        "points": points,
    }


@app.get("/api/prices/latest")
def get_latest() -> dict:
    row = db.latest_price(config.coin_id)
    if row is None:
        raise HTTPException(status_code=404, detail="No prices stored yet")
    return row


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=config.port)
