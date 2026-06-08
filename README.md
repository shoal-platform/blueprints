# blueprints

Mono repo of blueprints for the Shoal platform. A blueprint is a starting point — an architecture pattern or implementation (e.g. API backend, MCP server) — that a user can pick to bootstrap a graph.

Each top-level folder is one blueprint and contains its code. Example projects/code that _use_ a blueprint do not live here.

## Adding a blueprint

1. Create a new top-level directory named after the blueprint (kebab-case, e.g. `mcp-server-go`).
2. Add the blueprint's code to that directory.
3. Add a row to the table below mapping the directory to the blueprint name and a short description.

## Blueprints

| Directory            | Blueprint Name        | Description                                                                          |
| -------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| go-mcp-weather       | MCP Server Goland     | A working weather MCP server with client to test                                     |
| vite-go-hello-world  | Hello World with Vite | A basic vite & golang stack                                                          |
| vite-frontend-static | Vite Hello World      | A static vite frontend                                                               |
| pastebin             | Pastebin              | TypeScript + Postgres backend with a React frontend; create, read, and browse pastes |
| canvas-stack         | Live canvas           | A live pixel canvas                                                                  |
