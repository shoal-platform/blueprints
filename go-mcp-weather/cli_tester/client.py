"""
Chat client that connects to the weather-check MCP server and lets OpenAI
call its tools. Ask it "what's the weather in Lisbon?" and it will invoke the
get_weather tool on your MCP server.

Setup:
    pip install openai mcp
    export OPENAI_API_KEY=sk-...        # your OpenAI key
    export USE_LOCAL=true               # true = localhost:8080, false = remote
    python client.py

Toggle the target server with USE_LOCAL (and edit REMOTE_URL below).
"""

import asyncio
import json
import os

from openai import AsyncOpenAI
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

# ---- config -----------------------------------------------------------------

USE_LOCAL = os.getenv("USE_LOCAL", "true").lower() == "true"
LOCAL_URL = "http://localhost:8080/mcp"
REMOTE_URL = "https://fingerthorn-jawhazel-venomspeckle.eu1-dev.shoal.live/mcp"          # <-- your Cloud Run / domain URL
MCP_URL = LOCAL_URL if USE_LOCAL else REMOTE_URL

MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

openai = AsyncOpenAI()  # reads OPENAI_API_KEY from the environment


# ---- helpers ----------------------------------------------------------------

def to_openai_tools(mcp_tools):
    """Convert MCP tool definitions into OpenAI's tool/function format."""
    return [
        {
            "type": "function",
            "function": {
                "name": t.name,
                "description": t.description or "",
                "parameters": t.inputSchema,  # MCP inputSchema is already JSON Schema
            },
        }
        for t in mcp_tools
    ]


def result_to_text(result) -> str:
    """Flatten an MCP tool result's content blocks into plain text."""
    parts = []
    for block in result.content:
        parts.append(getattr(block, "text", str(block)))
    return "\n".join(parts)


async def chat_once(session: ClientSession, tools, user_text: str) -> str:
    """Run one user turn, resolving any tool calls against the MCP server."""
    messages = [
        {"role": "system", "content": "You are a helpful weather assistant. "
                                      "Use the get_weather tool when asked about weather."},
        {"role": "user", "content": user_text},
    ]

    while True:
        resp = await openai.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=tools,
        )
        msg = resp.choices[0].message

        # No tool calls -> we have the final answer.
        if not msg.tool_calls:
            return msg.content or ""

        # Record the assistant's tool-call request, then satisfy each call.
        messages.append(msg.model_dump(exclude_none=True))
        for call in msg.tool_calls:
            args = json.loads(call.function.arguments or "{}")
            print(f"  → calling MCP tool {call.function.name}({args})")
            result = await session.call_tool(call.function.name, args)
            messages.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": result_to_text(result),
            })


# ---- main loop --------------------------------------------------------------

async def main():
    print(f"Connecting to MCP server: {MCP_URL}")
    async with streamablehttp_client(MCP_URL) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            listed = await session.list_tools()
            tools = to_openai_tools(listed.tools)
            print("Available tools:", ", ".join(t.name for t in listed.tools))
            print("Ask about the weather (Ctrl-C to quit).\n")

            while True:
                try:
                    user_text = input("you> ").strip()
                except (EOFError, KeyboardInterrupt):
                    print("\nbye")
                    return
                if not user_text:
                    continue
                answer = await chat_once(session, tools, user_text)
                print(f"bot> {answer}\n")


if __name__ == "__main__":
    asyncio.run(main())
