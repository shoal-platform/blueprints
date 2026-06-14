import pg from "pg";
import { config } from "./config.js";

const { Pool, Client } = pg;

export let pool: pg.Pool;

async function ensureDatabase(): Promise<void> {
  const url = new URL(config.databaseUrl);
  const databaseName =
    decodeURIComponent(url.pathname.replace(/^\//, "")) || "forum";
  const adminUrl = new URL(config.databaseUrl);
  adminUrl.pathname = "/postgres";
  const admin = new Client({ connectionString: adminUrl.toString() });
  try {
    await admin.connect();
    const exists = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName],
    );
    if (exists.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${databaseName}"`);
      console.log(`Created database "${databaseName}"`);
    }
  } catch (err) {
    // Managed Postgres (e.g. Neon) often disallows connecting to "postgres"
    // or CREATE DATABASE. Assume the database already exists; startup still
    // fails clearly below if it doesn't.
    console.warn(
      `Could not ensure database exists (${(err as Error).message}); assuming it does`,
    );
  } finally {
    await admin.end().catch(() => {});
  }
}

async function ensureSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS topics (
      id          BIGSERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL DEFAULT '',
      author_name TEXT NOT NULL,
      session_id  TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS replies (
      id          BIGSERIAL PRIMARY KEY,
      topic_id    BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      body        TEXT NOT NULL,
      author_name TEXT NOT NULL,
      session_id  TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS votes (
      id          BIGSERIAL PRIMARY KEY,
      target_type TEXT NOT NULL CHECK (target_type IN ('topic', 'reply')),
      target_id   BIGINT NOT NULL,
      session_id  TEXT NOT NULL,
      value       SMALLINT NOT NULL CHECK (value IN (-1, 1)),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (target_type, target_id, session_id)
    );
    CREATE INDEX IF NOT EXISTS votes_target_idx ON votes (target_type, target_id);
    CREATE INDEX IF NOT EXISTS replies_topic_idx ON replies (topic_id);
  `);
}

export async function initDb(): Promise<void> {
  await ensureDatabase();
  pool = new Pool({ connectionString: config.databaseUrl });
  await ensureSchema();
}
