# microservices

Order pipeline for a fictional dropshipping company: three microservices in
three languages sharing one Postgres database, plus a Next.js dashboard that
watches orders move through the pipeline live. Everything is simulated — no
real suppliers, payments, or emails. **Demo only, no auth.**

```
                       ┌──────────────────────┐
   browser ──────────► │  webapp (Next.js)    │ :3000
      │                └──────────────────────┘
      │ calls all three services directly
      ▼
┌──────────────┐   ┌──────────────────┐   ┌────────────────────────┐
│ orders       │   │ inventory        │   │ notifications          │
│ TypeScript   │   │ Go               │   │ Python / FastAPI       │
│ :8080        │   │ :8080            │   │ :8080                  │
└──────┬───────┘   └────────┬─────────┘   └───────────┬────────────┘
       │     writes orders  │  reserves stock,        │  consumes events,
       │     + events       │  restocks, ships        │  "sends" emails
       └────────────────────┴─────────────┬───────────┘
                                          ▼
                              ┌─────────────────────┐
                              │  Postgres (shared)  │
                              └─────────────────────┘
```

## The pipeline

1. `orders` accepts an order (`pending`) and records an `order_events` row.
2. `inventory` polls for pending orders, claims each with
   `FOR UPDATE SKIP LOCKED`, and reserves stock: enough stock → `confirmed`,
   not enough → `backordered`. A periodic simulated supplier sync tops stock
   back up and retries backorders. Confirmed orders ship after a short
   fulfillment delay (`shipped`).
3. `notifications` consumes unprocessed `order_events` and turns each into a
   notification row + log line ("Order #12 shipped — tracking email sent…").

Open the dashboard, hit **Simulate 5 orders**, and watch the status badges
march `pending → confirmed → shipped` while inventory drains and the
notifications feed fills up.

## Why three services?

Each piece has a genuinely different workload shape, which is the honest reason
to split a system:

- **orders** is a latency-sensitive request/response API — scale with traffic.
- **inventory** is a background worker — throughput matters, latency doesn't.
- **notifications** is async fan-out — it can lag or die without hurting the
  order path; queued events just drain when it comes back
  (try `docker compose stop notifications`, place orders, then `start` it).

They deploy independently, scale independently, and don't share a language or
runtime — the contract between them is just the database schema and a handful
of HTTP endpoints.

### The shared-database tradeoff

This blueprint uses the *shared database* pattern: all services read and write
one Postgres. It keeps the demo simple and transactional, but the schema is a
shared contract — changing a table means coordinating every service. The
`orders` service owns all DDL (it creates tables on startup); the other two
wait until the tables exist. In a larger system you would give each service its
own database and integrate via APIs or events; the service boundaries here are
drawn so that refactor stays straightforward.

## Services and endpoints

| Service | Stack | Port | Endpoints |
| --- | --- | --- | --- |
| `orders/` | TypeScript, Express 5 | 8081 | `POST /api/orders` `{customer_name, customer_email, items: [{product_id, qty}]}` · `POST /api/orders/simulate` `{count}` · `GET /api/orders?status=` · `GET /api/orders/:id` (items + events + notifications) · `GET /api/orders/products` · `GET /healthz` |
| `inventory/` | Go, pgx | 8082 | `GET /api/inventory` · `GET /healthz` |
| `notifications/` | Python, FastAPI | 8083 | `GET /api/notifications?order_id=` · `GET /healthz` |
| `webapp/` | Next.js | 3000 | the dashboard |


## Setup for the web app
  NEXT_PUBLIC_ORDERS_API_URL=http://localhost
  NEXT_PUBLIC_INVENTORY_API_URL=http://localhost
  NEXT_PUBLIC_NOTIFICATIONS_API_URL=http://localhost

## Setup for the backends
  DATBASE_URL=
