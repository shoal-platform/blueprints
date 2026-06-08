# weather-check

A tiny MCP server with **one tool** — `get_weather(city)` — backed by the free,
keyless Open-Meteo API. Served over Streamable HTTP so it runs as a container.
Deploy target: **Google Cloud Run** (gives you an HTTPS URL for free).

Files: `server.py`, `requirements.txt`, `Dockerfile`.

---

## Deploy to Cloud Run (one command)

You need the `gcloud` CLI installed and authenticated (`gcloud auth login`),
with a project selected (`gcloud config set project YOUR_PROJECT`).

From inside this folder:

```bash
gcloud run deploy weather-check \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated
```

That's it. Cloud Run builds the Dockerfile, deploys it, and prints a **Service
URL** like `https://weather-check-xxxxxxxx-ew.a.run.app`. HTTPS is handled for
you. (`--allow-unauthenticated` keeps it simple — anyone with the URL can reach
it. Fine for a test; add auth before anything real.)

Your MCP endpoint is that URL **+ `/mcp`**:

```
https://weather-check-xxxxxxxx-ew.a.run.app/mcp
```

> Custom domain: if you've mapped `joesmcp.com` to this service, the endpoint is
> `https://joesmcp.com/mcp`.

---

## Check it's all good

**1. Is the service up?** Hit the root path in a browser or curl:

```bash
curl https://weather-check-xxxxxxxx-ew.a.run.app/
# -> weather-check ok — MCP endpoint at /mcp
```

**2. Does the MCP endpoint list the tool?** Easiest is the official inspector:

```bash
npx @modelcontextprotocol/inspector
# then point it at https://.../mcp (Transport: Streamable HTTP)
```

You should see one tool, `get_weather`.

**3. Add it as a connector** (paste the `/mcp` URL):
- **Claude**: Settings → Connectors → + Add custom connector.
- **ChatGPT** (paid plan): Settings → Apps → enable Developer mode → Create app.

Then ask: “What’s the weather in Lisbon?”

---

## Run it locally first (optional)

```bash
pip install -r requirements.txt
python server.py
# in another terminal:
curl http://localhost:8080/
```

## Notes

- The container listens on `$PORT` (Cloud Run sets it; defaults to 8080 locally).
- The `Dockerfile` runs `pip install -r requirements.txt` during the build, so
  the image always resolves the MCP SDK and other deps from `requirements.txt`.
- Open-Meteo is free for non-commercial use, no key. https://open-meteo.com/en/terms
