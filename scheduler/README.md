# scheduler

Backend with a scheduler and API. A Cloud Scheduler job hits an ingest
endpoint on a schedule; the service fetches the latest bitcoin price from a
free API (CoinGecko, no key required) and stores it in Postgres. A second
endpoint serves prices over a date range so a UI can render a graph.

## Endpoints

| Method | Path                 | Purpose                                            |
| ------ | -------------------- | -------------------------------------------------- |
| POST   | `/tasks/fetch-price` | Cloud Scheduler target: fetch + store latest price |
| GET    | `/api/prices`        | Prices over a date range (for graphing)            |
| GET    | `/api/prices/latest` | Most recent stored price                           |
| GET    | `/healthz`           | Health check                                       |

### `GET /api/prices`

Query params (all optional):

- `start` / `end` — ISO 8601 timestamps. Default: last 24 hours.
- `bucket` — `minute`, `hour`, or `day`. Aggregates points (avg/low/high per
  bucket) so long ranges stay small enough to graph. Omit for raw points.

```bash
curl "http://localhost:8080/api/prices?start=2026-06-01T00:00:00Z&end=2026-06-11T00:00:00Z&bucket=hour"
```

Response shape:

```json
{
  "coin": "bitcoin",
  "currency": "usd",
  "bucket": "hour",
  "points": [
    { "time": "2026-06-01T00:00:00Z", "price": 101234.5, "low": 101000.1, "high": 101500.9, "samples": 60 }
  ]
}
```

Without `bucket`, points are `{ "time": ..., "price": ... }`.

## Configuration (env vars)

See `.env.example`. Key ones:

- `DATABASE_URL` — Postgres connection string. The server creates the
  database and `prices` table on startup if missing.
- `PORT` — listen port (Cloud Run injects this).
- `SCHEDULER_TOKEN` — optional shared secret; if set, the ingest endpoint
  requires header `X-Scheduler-Token`. Prefer Cloud Run IAM/OIDC instead.
- `COIN_ID` / `VS_CURRENCY` — what to track (default `bitcoin` / `usd`).

