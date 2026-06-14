import pg from "pg";
import { config } from "./config.js";

const { Pool, Client } = pg;

export let pool: pg.Pool;

async function ensureDatabase(): Promise<void> {
  const url = new URL(config.databaseUrl);
  const databaseName =
    decodeURIComponent(url.pathname.replace(/^\//, "")) || "dropship";
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

// The orders service is the schema owner: it alone runs DDL. The inventory and
// notifications services wait on startup until these tables exist.
async function ensureSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id          BIGSERIAL PRIMARY KEY,
      sku         TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      supplier    TEXT NOT NULL,
      price_cents INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS inventory (
      product_id  BIGINT PRIMARY KEY REFERENCES products(id),
      stock       INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      id             BIGSERIAL PRIMARY KEY,
      customer_name  TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'confirmed', 'backordered', 'shipped')),
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id         BIGSERIAL PRIMARY KEY,
      order_id   BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id BIGINT NOT NULL REFERENCES products(id),
      qty        INTEGER NOT NULL CHECK (qty > 0)
    );
    CREATE TABLE IF NOT EXISTS order_events (
      id         BIGSERIAL PRIMARY KEY,
      order_id   BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      status     TEXT NOT NULL,
      processed  BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id         BIGSERIAL PRIMARY KEY,
      order_id   BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      channel    TEXT NOT NULL DEFAULT 'email',
      message    TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
    CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);
    CREATE INDEX IF NOT EXISTS order_events_unprocessed_idx
      ON order_events (id) WHERE NOT processed;
  `);
}

const SEED_PRODUCTS: Array<[string, string, string, number, number]> = [
  // sku, name, supplier, price_cents, starting stock
  ["MUG-001", "Galaxy Glaze Mug", "Hangzhou Homewares Co", 1499, 40],
  ["LED-014", "Sunset Projection Lamp", "Shenzhen BrightTech", 2899, 25],
  ["BAG-203", "Canvas Tote XL", "Mumbai Textile Traders", 1999, 60],
  ["FIT-077", "Resistance Band Set", "Guangzhou FitSupply", 1299, 35],
  ["PET-310", "Self-Groom Cat Arch", "PetGoods Direct", 2399, 20],
  ["KIT-150", "Silicone Utensil Set", "Hangzhou Homewares Co", 1799, 50],
  ["TEC-442", "Magnetic Phone Mount", "Shenzhen BrightTech", 999, 80],
  ["GRD-021", "Herb Garden Starter Kit", "GreenSprout Wholesale", 2599, 15],
];

async function seedProducts(): Promise<void> {
  for (const [sku, name, supplier, priceCents, stock] of SEED_PRODUCTS) {
    const { rows } = await pool.query(
      `INSERT INTO products (sku, name, supplier, price_cents)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (sku) DO NOTHING
       RETURNING id`,
      [sku, name, supplier, priceCents],
    );
    if (rows.length > 0) {
      await pool.query(
        `INSERT INTO inventory (product_id, stock)
         VALUES ($1, $2)
         ON CONFLICT (product_id) DO NOTHING`,
        [rows[0].id, stock],
      );
    }
  }
}

export async function initDb(): Promise<void> {
  await ensureDatabase();
  pool = new Pool({ connectionString: config.databaseUrl });
  await ensureSchema();
  await seedProducts();
}
