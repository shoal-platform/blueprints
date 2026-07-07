# discord-joke-bot

A test Discord bot that posts a joke on a schedule and answers a `/joke` slash
command. It will later be hardened into a production blueprint — keep it simple,
readable, and easy to extend.

## Core design decision: HTTP Interactions only — no Gateway/WebSocket

- Slash commands arrive as HTTPS POSTs from Discord to `/interactions`.
- Scheduled posts are triggered by an external scheduler (Cloud Scheduler, cron,
  or a manual curl) hitting `/cron`, which calls Discord's REST API to post.

The bot only ever *sends* messages and *responds* to commands — it never needs
to *receive* arbitrary gateway events. So the whole thing is one stateless HTTP
service: ideal for a container behind a proxy / Cloud Run, and it can scale to
zero.

## Layout

- `src/server.js` — express app, routes, Ed25519 signature verification.
- `src/jokes.js` — joke array + `getRandomJoke()`.
- `src/discord.js` — REST helper: `postMessage(channelId, content)`.
- `src/register.js` — one-off script to register the `/joke` guild command.

## Gotchas

- `/interactions` must read the **raw body** before verifying the signature —
  do not JSON-parse first. We use `express.raw()` on that route only.
- A `PING` interaction (type 1) must be answered with `PONG` or Discord rejects
  the endpoint URL.
- Guild-scoped commands appear instantly; global commands take up to an hour.

## Out of scope (future blueprint work)

- Database for jokes / per-guild config (see the `TODO` in `jokes.js`).
- Cloud Run + Secret Manager + HTTPS load balancer deployment.
- Cloud Scheduler with OIDC instead of the shared `CRON_SECRET`.
- Deferred responses for slow commands.
