"""weather-check is a minimal MCP server with a single weather tool,
served over Streamable HTTP so it can run as a container on Cloud Run."""

import os

import httpx
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from starlette.requests import Request
from starlette.responses import PlainTextResponse

# FastMCP's Streamable HTTP transport enables DNS-rebinding protection by
# default with a localhost-only Host allowlist. Behind a real domain that
# makes every request fail with HTTP 421 "Invalid Host header". Pass the
# deployed host(s) via MCP_ALLOWED_HOSTS (comma-separated, e.g.
# "mcp-python.eu1.shoal.live"); if unset, disable the check so the container
# works on any domain out of the box.
_allowed_hosts = [
    h.strip() for h in os.environ.get("MCP_ALLOWED_HOSTS", "").split(",") if h.strip()
]
if _allowed_hosts:
    _security = TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=_allowed_hosts,
        allowed_origins=_allowed_hosts,
    )
else:
    _security = TransportSecuritySettings(enable_dns_rebinding_protection=False)

mcp = FastMCP("weather-check", transport_security=_security)

_client = httpx.AsyncClient(timeout=10.0)


@mcp.tool()
async def get_weather(city: str) -> str:
    """Get the current weather for a city by name, e.g. 'London'."""
    if not city:
        return "Please provide a city."

    # 1. City name -> coordinates (Open-Meteo geocoding, no API key).
    try:
        geo = await get_json(
            "https://geocoding-api.open-meteo.com/v1/search",
            {"name": city, "count": 1, "format": "json"},
        )
    except Exception as err:
        return f"Lookup failed: {err}"

    results = geo.get("results") or []
    if not results:
        return f'Couldn\'t find "{city}".'
    loc = results[0]
    # Geocoding results don't always carry every field — e.g. Open-Meteo
    # returns "Hong Kong" and "Macau" with no "country" key at all. Default
    # missing string fields to "", matching Go's zero-value struct decoding.
    name = loc.get("name") or ""
    country = loc.get("country") or ""

    # 2. Coordinates -> current weather.
    try:
        wx = await get_json(
            "https://api.open-meteo.com/v1/forecast",
            {
                "latitude": loc.get("latitude"),
                "longitude": loc.get("longitude"),
                "current": "temperature_2m,wind_speed_10m,weather_code",
            },
        )
    except Exception as err:
        return f"Weather fetch failed: {err}"

    # Default missing/null fields to 0, so a partial response still renders.
    cur = wx.get("current") or {}
    temperature = cur.get("temperature_2m") or 0
    wind = cur.get("wind_speed_10m") or 0
    code = cur.get("weather_code") or 0

    return (
        f"{name}, {country}: {condition(code)}, "
        f"{temperature:.1f}°C, wind {wind:.1f} km/h"
    )


async def get_json(url: str, params: dict) -> dict:
    resp = await _client.get(url, params=params)
    resp.raise_for_status()
    return resp.json()


def condition(code: int) -> str:
    if code == 0:
        return "Clear"
    if code <= 3:
        return "Cloudy"
    if code <= 48:
        return "Fog"
    if code <= 67:
        return "Rain"
    if code <= 77:
        return "Snow"
    if code <= 82:
        return "Showers"
    if code <= 86:
        return "Snow showers"
    return "Thunderstorm"


# Plain health check so you can curl the service and confirm it's up.
# Catch-all for any path/method other than /mcp, mirroring Go's
# mux.HandleFunc("/", ...) which answers any request with the same 200.
@mcp.custom_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
async def health(_: Request) -> PlainTextResponse:
    return PlainTextResponse("weather-check ok — MCP endpoint at /mcp\n")


if __name__ == "__main__":
    # Cloud Run provides the port to listen on via $PORT (default 8080), and
    # expects the service to listen on all interfaces.
    mcp.settings.host = "0.0.0.0"
    mcp.settings.port = int(os.environ.get("PORT", "8080"))
    mcp.run(transport="streamable-http")
