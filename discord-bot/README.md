# Discord Joke Bot

A tiny Discord bot that:

1. Posts a random joke to a channel **on a schedule** (triggered externally).
2. Answers a **`/joke`** slash command on demand.

It uses **HTTP Interactions only — no Gateway/WebSocket** — so it's one stateless
HTTP service that can run in a container and scale to zero. Discord POSTs slash
commands to `/interactions`; an external scheduler POSTs to `/cron` to trigger a
scheduled post.

## Endpoints

| Route | Method | Purpose |
| --- | --- | --- |
| `/` | GET | Health check — returns `ok`. |
| `/interactions` | POST | Discord interactions (PING + `/joke`). Verifies the Ed25519 signature. |
| `/cron` | POST | Scheduler trigger. Requires `Authorization: Bearer <CRON_SECRET>` (or `?key=`). Posts a joke to `DISCORD_CHANNEL_ID`. |

## Setup

### 1. Create the Discord app

Developer Portal → **New Application**.
- **General Information**: copy the **Application ID** and **Public Key**.
- **Bot** section: reset/copy the **Token**.

### 2. Make a test server + channel

In the Discord client:
- Create a server (**Create My Own**), add a `#bot-testing` channel.
- Enable **Developer Mode** (Settings → Advanced), then right-click to **Copy ID**
  for both the server (guild) and the channel.

### 3. Invite the bot

OAuth2 → **URL Generator** → scopes `bot` + `applications.commands` → permission
**Send Messages** → open the generated URL → add the bot to your test server.

### 4. Fill `.env`

```bash
cp .env.example .env
# then fill in every value
```

### 5. Run locally

```bash
npm install && npm start
```

You should see `discord-joke-bot listening on :3000`.

### 6. Expose locally for interactions

Discord needs a public HTTPS URL to deliver interactions.

```bash
ngrok http 3000
```

Copy the HTTPS URL, then in the Developer Portal set **Interactions Endpoint URL**
to `<ngrok-url>/interactions`. The server must be running so Discord's validation
**PING** succeeds when you save.

### 7. Register the slash command

```bash
npm run register     # or: node src/register.js
```

This registers `/joke` to your test guild — guild-scoped commands appear
instantly (global ones can take up to an hour).

## Test

- In Discord, type **`/joke`** → expect a joke reply.
- Trigger a scheduled post manually:

  ```bash
  curl -X POST localhost:3000/cron -H "Authorization: Bearer $CRON_SECRET"
  ```

  → expect a joke to appear in `#bot-testing`.
- A request to `/cron` **without** the secret returns `401`.
- An unsigned/badly-signed request to `/interactions` returns `401`.

## Schedule it

The schedule lives **outside** the bot. Examples:

- Local cron, hourly:

  ```cron
  0 * * * * curl -X POST https://<host>/cron -H "Authorization: Bearer <secret>"
  ```

- For production this becomes a **Cloud Scheduler** job with **OIDC** auth hitting
  the Cloud Run URL (see "Out of scope" below).

## Out of scope (future blueprint work)

- Database for jokes / per-guild config (see the `TODO` in `src/jokes.js`).
- Cloud Run + Secret Manager + HTTPS load balancer deployment.
- Cloud Scheduler with OIDC instead of the shared `CRON_SECRET`.
- Deferred responses for slow commands.
