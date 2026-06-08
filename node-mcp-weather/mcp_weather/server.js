// weather-check is a minimal MCP server with a single weather tool,
// served over Streamable HTTP so it can run as a container on Cloud Run.

import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

function buildServer() {
  const server = new McpServer({ name: "weather-check", version: "0.1.0" });

  server.registerTool(
    "get_weather",
    {
      description: "Get the current weather for a city by name, e.g. 'London'.",
      inputSchema: { city: z.string().describe("City name to look up, e.g. 'London'") },
    },
    getWeather,
  );

  return server;
}

async function getWeather({ city }) {
  if (!city) {
    return text("Please provide a city.");
  }

  // 1. City name -> coordinates (Open-Meteo geocoding, no API key).
  let geo;
  try {
    geo = await getJSON(
      "https://geocoding-api.open-meteo.com/v1/search?" +
        new URLSearchParams({ name: city, count: "1", format: "json" }),
    );
  } catch (err) {
    return text("Lookup failed: " + err.message);
  }
  const results = geo.results ?? [];
  if (results.length === 0) {
    return text(`Couldn't find "${city}".`);
  }
  const loc = results[0];

  // 2. Coordinates -> current weather.
  let wx;
  try {
    wx = await getJSON(
      "https://api.open-meteo.com/v1/forecast?" +
        new URLSearchParams({
          latitude: String(loc.latitude),
          longitude: String(loc.longitude),
          current: "temperature_2m,wind_speed_10m,weather_code",
        }),
    );
  } catch (err) {
    return text("Weather fetch failed: " + err.message);
  }

  // Default missing/null fields to 0, matching Go's zero-value struct behavior,
  // so a partial response still renders instead of throwing on .toFixed.
  const cur = wx.current ?? {};
  const code = cur.weather_code ?? 0;
  const temperature = cur.temperature_2m ?? 0;
  const wind = cur.wind_speed_10m ?? 0;
  const out = `${loc.name}, ${loc.country}: ${condition(code)}, ` +
    `${temperature.toFixed(1)}°C, wind ${wind.toFixed(1)} km/h`;
  return text(out);
}

async function getJSON(endpoint) {
  const resp = await fetch(endpoint, { signal: AbortSignal.timeout(10_000) });
  if (!resp.ok) {
    throw new Error(`status ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

function condition(code) {
  if (code === 0) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code <= 48) return "Fog";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}

function text(s) {
  return { content: [{ type: "text", text: s }] };
}

// Cloud Run provides the port to listen on via $PORT (default 8080).
const port = process.env.PORT || "8080";

const httpServer = createServer(async (req, res) => {
  // MCP over Streamable HTTP, mounted at /mcp. Stateless: a fresh server and
  // transport per request, per the SDK's recommended stateless-mode pattern.
  if (req.url === "/mcp") {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error("error handling MCP request:", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        }));
      }
    }
    return;
  }
  // Plain health check so you can curl the service and confirm it's up.
  // Catch-all for any other path, mirroring Go's `mux.HandleFunc("/", ...)`.
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("weather-check ok — MCP endpoint at /mcp\n");
});

httpServer.listen(Number(port), () => {
  console.log(`listening on :${port} (MCP at /mcp)`);
});
