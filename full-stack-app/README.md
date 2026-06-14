# full-stack-app

Demo forum: create topics, reply, and upvote/downvote both. No accounts and no
security — **demo only**. Identity is a display name you pick once plus a
generated session id, both kept in the browser's localStorage; the session id
deduplicates votes (one vote per item per session, vote again to toggle off).

Two sub-projects:

- `backend/` — Express 5 + TypeScript API, Postgres via Neon (or any Postgres).
- `frontend/` — Next.js (App Router) + Tailwind UI; talks to the backend with a
  single `NEXT_PUBLIC_API_URL` env var.

## API

| Method | Path                       | Body / params                                          | Returns                                  |
| ------ | -------------------------- | ------------------------------------------------------ | ---------------------------------------- |
| GET    | `/api/topics`              | `?sort=new\|top&session_id=`                           | topics with `score, reply_count, user_vote` |
| POST   | `/api/topics`              | `{title, body, author_name, session_id}`               | 201 created topic                        |
| GET    | `/api/topics/:id`          | `?session_id=`                                         | `{topic, replies[]}`                     |
| POST   | `/api/topics/:id/replies`  | `{body, author_name, session_id}`                      | 201 created reply                        |
| POST   | `/api/votes`               | `{target_type: "topic"\|"reply", target_id, session_id, value: 1\|-1}` | `{score, user_vote}`    |
| GET    | `/healthz`                 | —                                                      | `{ok: true}`                             |

Vote semantics: first vote inserts; the same vote again removes it
(`user_vote: null`); the opposite vote replaces it.

```bash
curl -X POST localhost:8080/api/topics -H 'content-type: application/json' \
  -d '{"title":"Hello","body":"first post","author_name":"joe","session_id":"s1"}'

curl -X POST localhost:8080/api/votes -H 'content-type: application/json' \
  -d '{"target_type":"topic","target_id":1,"session_id":"s2","value":1}'
```

## Configuration (env vars)

Backend (`backend/.env.example`):

- `DATABASE_URL` — Postgres connection string. Neon URLs with
  `?sslmode=require` work as-is. Schema is created on startup; database
  creation is attempted and skipped gracefully when the role isn't allowed to
  (typical on Neon — create the database in the Neon dashboard instead).
- `PORT` — listen port (default 8080).

Frontend (`frontend/.env.example`):

- `NEXT_PUBLIC_API_URL` — base URL of the backend. Inlined at build time.


