import { initDb } from "./db.js";
import { createServer } from "./server.js";
import { config } from "./config.js";

async function main() {
  await initDb();
  const app = createServer();
  app.listen(config.port, () => {
    console.log(`orders service listening on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error("failed to start:", err);
  process.exit(1);
});
