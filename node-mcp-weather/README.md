# node-mcp-weather

Two folders. Server + tester.

## mcp_weather

Node MCP server, one tool: `get_weather(city)`. Backed by free Open-Meteo API (no key needed). Serve over Streamable HTTP at `/mcp`, run as container, deploy to Cloud Run. See `mcp_weather/README.md` for run/deploy steps.

## cli_tester

Node chat client (`client.js`). Connect to weather-check MCP server, let OpenAI call its tools. Ask "what's the weather in Lisbon?" — it invokes `get_weather` on MCP server.

### Setup

Install:
```bash
cd cli_tester
npm install
```

Need OpenAI API key. Get one at https://platform.openai.com/api-keys, then set as env var:
```bash
export OPENAI_API_KEY=sk-...
```

Other env vars (optional):
- `USE_LOCAL` — `true` (default) = hit `localhost:8080`, `false` = hit remote URL (edit `REMOTE_URL` in `client.js`)
- `OPENAI_MODEL` — default `gpt-4o-mini`

Run:
```bash
node client.js
```
