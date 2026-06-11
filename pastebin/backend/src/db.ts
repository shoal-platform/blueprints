import pg from "pg";
import { config } from "./config.js";

const { Pool, Client } = pg;

export let pool: pg.Pool;

function resolveConnections(): {
  appConfig: pg.PoolConfig;
  adminConfig: pg.ClientConfig;
  databaseName: string;
} {
  if (config.databaseUrl) {
    const url = new URL(config.databaseUrl);
    const databaseName =
      decodeURIComponent(url.pathname.replace(/^\//, "")) || "pastebin";
    const adminUrl = new URL(config.databaseUrl);
    adminUrl.pathname = "/postgres";
    return {
      appConfig: { connectionString: config.databaseUrl },
      adminConfig: { connectionString: adminUrl.toString() },
      databaseName,
    };
  }
  return {
    appConfig: config.db,
    adminConfig: { ...config.db, database: "postgres" },
    databaseName: config.db.database,
  };
}

async function ensureDatabase(
  adminConfig: pg.ClientConfig,
  databaseName: string,
): Promise<void> {
  const admin = new Client(adminConfig);
  await admin.connect();
  try {
    const exists = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName],
    );
    if (exists.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${databaseName}"`);
      console.log(`Created database "${databaseName}"`);
    }
  } finally {
    await admin.end();
  }
}

async function ensureSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pastes (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL DEFAULT '',
      content    TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export async function initDb(): Promise<void> {
  const { appConfig, adminConfig, databaseName } = resolveConnections();
  await ensureDatabase(adminConfig, databaseName);
  pool = new Pool(appConfig);
  await ensureSchema();
}
