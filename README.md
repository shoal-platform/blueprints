# blueprints

Mono repo of blueprints for the Shoal platform. A blueprint is a starting point — an architecture pattern or implementation (e.g. API backend, MCP server) — that a user can pick to bootstrap a graph.

Each top-level folder is one blueprint and contains its code. Example projects/code that _use_ a blueprint do not live here.

## Adding a blueprint

1. Create a new top-level directory named after the blueprint (kebab-case, e.g. `mcp-server-go`).
2. Add the blueprint's code to that directory.
3. Add a row to the table below mapping the directory to the blueprint name and a short description.

## Blueprints

| -------------------- | --------------------- | ------------------------------------------------------------------------------------ | ---------- |
| go-mcp-weather       | MCP Server Goland     | A working weather MCP server with client to test                                     | - |
| vite-go-hello-world  | Hello World with Vite | A basic vite & golang stack                                                          | - |
| vite-frontend-static | Vite Hello World      | A static vite frontend                                                               | - |
| pastebin             | Pastebin              | TypeScript + Postgres backend with a React frontend; create, read, and browse pastes | - |
| canvas-stack         | Live canvas           | A live pixel canvas                                                                  | - |
| basic-nextjs-app         | Nextjs Horse Website           | A small site about horses showcasing nextjs' multi-page support        | - |
| scheduler         | backend with a scheduler and api  | Updates costings of bitcoin and stores the data with and api        | - |
| full-stack-app         | Simple forums app  | Updates costings of bitcoin and stores the data with and api and UI        | - |
| microservices         | Sports App  | Multiple microservices with a database       | - |
| uptime-app | Uptime application | Scheduler fires every minute, a Function pings a list of URLs, status + latency logged to Neon, with a tiny status page.   | - |
| strawpoll | StrawPoll | Simple starwpoll app, with expiry and times with output, UI + container and database | - |
| DiscordBot | Discordbot | - | - |
| WeatherApp | WeatherLLM | Uses an MCP server + LLM to compare the weather and some info on the cities | - |
