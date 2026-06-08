// Chat client that connects to the weather-check MCP server and lets OpenAI
// call its tools. Ask it "what's the weather in Lisbon?" and it will invoke the
// get_weather tool on your MCP server.
//
// Setup:
//     npm install
//     export OPENAI_API_KEY=sk-...        # your OpenAI key
//     export USE_LOCAL=true               # true = localhost:8080, false = remote
//     node client.js
//
// Toggle the target server with USE_LOCAL (and edit REMOTE_URL below).

import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import OpenAI from "openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// ---- config -----------------------------------------------------------------

const USE_LOCAL = (process.env.USE_LOCAL ?? "true").toLowerCase() === "true";
const LOCAL_URL = "http://localhost:8080/mcp";
const REMOTE_URL = "https://mcp-weather.eu1-dev.shoal.live/mcp"; // <-- your Cloud Run / domain URL
const MCP_URL = USE_LOCAL ? LOCAL_URL : REMOTE_URL;

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const openai = new OpenAI(); // reads OPENAI_API_KEY from the environment

// ---- helpers ----------------------------------------------------------------

// Convert MCP tool definitions into OpenAI's tool/function format.
function toOpenAITools(mcpTools) {
  return mcpTools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description ?? "",
      parameters: t.inputSchema, // MCP inputSchema is already JSON Schema
    },
  }));
}

// Flatten an MCP tool result's content blocks into plain text.
function resultToText(result) {
  return result.content.map((block) => block.text ?? String(block)).join("\n");
}

// Run one user turn, resolving any tool calls against the MCP server.
async function chatOnce(client, tools, userText) {
  const messages = [
    {
      role: "system",
      content: "You are a helpful weather assistant. " +
        "Use the get_weather tool when asked about weather.",
    },
    { role: "user", content: userText },
  ];

  while (true) {
    const resp = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools,
    });
    const msg = resp.choices[0].message;

    // No tool calls -> we have the final answer.
    if (!msg.tool_calls) {
      return msg.content ?? "";
    }

    // Record the assistant's tool-call request, then satisfy each call.
    messages.push(msg);
    for (const call of msg.tool_calls) {
      const args = JSON.parse(call.function.arguments || "{}");
      console.log(`  → calling MCP tool ${call.function.name}(${JSON.stringify(args)})`);
      const result = await client.callTool({ name: call.function.name, arguments: args });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: resultToText(result),
      });
    }
  }
}

// ---- main loop --------------------------------------------------------------

async function main() {
  console.log(`Connecting to MCP server: ${MCP_URL}`);
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  const client = new Client({ name: "weather-cli-tester", version: "0.1.0" });
  await client.connect(transport);

  const listed = await client.listTools();
  const tools = toOpenAITools(listed.tools);
  console.log("Available tools:", listed.tools.map((t) => t.name).join(", "));
  console.log("Ask about the weather (Ctrl-C to quit).\n");

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    while (true) {
      let userText;
      try {
        userText = (await rl.question("you> ")).trim();
      } catch {
        console.log("\nbye");
        return;
      }
      if (!userText) continue;
      const answer = await chatOnce(client, tools, userText);
      console.log(`bot> ${answer}\n`);
    }
  } finally {
    rl.close();
    await client.close();
  }
}

main();
