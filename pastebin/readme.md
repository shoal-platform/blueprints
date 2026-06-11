# Pastebin

A minimal pastebin clone: create text pastes, share them by short id, browse them all on a board.

- **backend/** — TypeScript + Express + Postgres. Auto-creates the database and table on first boot.
- **frontend/** — Vite + React + TypeScript. Three pages: board, create, read.

## Architecture

```
frontend (Vite/React)  ──/api──▶  backend (Express)  ──▶  Postgres
```

Pastes get a short URL-safe id (11-char base64url, e.g. `Xk9d2Qp7m4A`).

| Page   | Route     | What it does                          |
|--------|-----------|---------------------------------------|
| Board  | `/`       | Lists every paste, newest first       |
| Create | `/new`    | Write a paste, redirect to its page   |
| Read   | `/p/:id`  | Show one paste by id                  |

### API

| Method | Path              | Body                  | Returns              |
|--------|-------------------|-----------------------|----------------------|
| GET    | `/api/pastes`     | —                     | paste summaries      |
| GET    | `/api/pastes/:id` | —                     | full paste / 404     |
| POST   | `/api/pastes`     | `{ title?, content }` | created paste        |

## Run it

Prerequisites: Node 20+, a running Postgres.

**1. Backend**

```bash
cd backend
cp .env.example .env   # edit PG* credentials if needed
npm install
npm run dev            # http://localhost:8080
```

Connection comes from `DATABASE_URL` (e.g. `postgres://user:pass@host:5432/pastebin`)
if set, otherwise the individual `PG*` vars. On startup the server creates the
target database if missing, then ensures the `pastes` table exists — no manual migrations.

**2. Frontend**

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173, proxies /api -> :8080
```

Open http://localhost:5173.

## Layout

```
backend/
  src/
    config.ts    env config
    db.ts        pool + database/schema bootstrap
    id.ts        short id generator
    pastes.ts    data access (create / get / list)
    server.ts    express app + routes
    index.ts     entrypoint
frontend/
  src/
    api.ts       backend client
    App.tsx      shell + nav
    main.tsx     router
    pages/       PasteBoard / CreatePaste / ReadPaste
```
