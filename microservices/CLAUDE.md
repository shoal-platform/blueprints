# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Shoal **blueprint** (starter template), not a running product: a dropshipping
order pipeline built as three polyglot microservices sharing one Postgres,
plus a Next.js dashboard. Everything is simulated — no real suppliers,
payments, or emails. **Demo only, no auth, CORS wide open.** The parent repo
(`blueprints/`) is a monorepo of unrelated blueprints; this directory is one of
them.

See `README.md` for the pipeline walkthrough and the endpoint table.

## Services

| Dir | Stack | Default port | Role |
| --- | --- | --- | --- |
| `orders/` | TypeScript, Express 5, `pg` | 8081 | Request/response API. Accepts orders, seeds/simulates. |
| `inventory/` | Go, `pgx` | 8082 | Background worker. Reserves stock, restocks, ships. |
| `notifications/` | Python, FastAPI, `psycopg` | 8083 | Async consumer. Turns events into notification rows. |
| `webapp/` | Next.js 16, React 19, Tailwind 4 | 3000 | Dashboard, calls all three services from the browser. |

## The architecture that spans files

**Shared database, single schema owner.** All services read/write one Postgres
database (default `dropship`). The contract between them is *the table schema
plus a few HTTP endpoints* — nothing else. Changing a table means coordinating
every service.

- **`orders` alone owns all DDL.** `orders/src/db.ts` (`ensureSchema`) creates
  every table and seeds products on startup, and even `CREATE DATABASE`s if
  missing. The other two services never run DDL — they call a
  `WaitForSchema` / `wait_for_schema` guard on boot (`inventory/store.go`,
  `notifications/db.py`) that polls `to_regclass(...)` until the tables exist,
  then proceed. If you add a column/table, add it here, in `orders`.

**The pipeline is a status machine driven through `order_events`:**
`pending → confirmed | backordered → shipped`. Services communicate by polling,
not by calling each other:

1. `orders` inserts an order (`pending`) + an `order_events` row.
2. `inventory` (`worker.go`) runs three infinite loops: a reserve loop claims
   `pending`/`backordered` orders, a restock loop simulates supplier delivery
   then retries backorders, a ship loop marks aged `confirmed` orders
   `shipped`. Every status change writes an `order_events` row.
3. `notifications` (`consumer.py`) polls unprocessed `order_events`, writes a
   notification row, and marks the event processed — one transaction per event
   so a crash never drops or duplicates one.

**Concurrency correctness lives in SQL, not app locks.** `inventory` is meant to
scale to N replicas: `Store.TryReserve` claims each order with
`SELECT ... FOR UPDATE SKIP LOCKED` and locks stock rows with `FOR UPDATE OF inv`
inside one transaction, so two replicas never reserve the same order or
oversell. Preserve this pattern when touching `inventory/store.go`.

**The webapp calls the three services directly from the browser** (see
`webapp/src/lib/api.ts`), so each Go/Python/TS service sets permissive CORS.
There is no API gateway.

## Running locally

Every service needs `DATABASE_URL` (default
`postgres://postgres:postgres@localhost:5432/dropship`) — point them at the same
Postgres. There is **no docker-compose** despite README diagrams; run each in
its own terminal. Start `orders` first so it creates the schema.

```bash
# orders (8081)
cd orders && npm install && npm run dev      # tsx watch; build: npm run build → npm start

# inventory (8082)
cd inventory && go run .                      # build: go build

# notifications (8083)
cd notifications && python -m venv .venv && . .venv/bin/activate \
  && pip install -r requirements.txt && python main.py

# webapp (3000)
cd webapp && npm install && npm run dev
```

The webapp reads `NEXT_PUBLIC_ORDERS_API_URL` / `_INVENTORY_API_URL` /
`_NOTIFICATIONS_API_URL` (defaults to `localhost:8081/8082/8083`). Each service
also has a `.env.example`.

Lint (webapp only): `cd webapp && npm run lint`. There is no test suite.

## Conventions

- Config is env-var-first with in-code defaults (`orders/src/config.ts`,
  `inventory/main.go` `loadConfig`, `notifications/config.py`) — Cloud Run
  style, `PORT` injected. Don't hardcode.
- Money is integer `price_cents` everywhere; format only at the UI edge
  (`formatPrice`).
- Order status is a fixed set (`pending|confirmed|backordered|shipped`) enforced
  by a Postgres `CHECK` constraint. Adding a status means updating the constraint
  in `orders/src/db.ts` **and** the `OrderStatus` union in `webapp/src/lib/api.ts`.
