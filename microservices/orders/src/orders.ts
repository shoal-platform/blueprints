import { pool } from "./db.js";

export interface OrderItemInput {
  product_id: number;
  qty: number;
}

const ORDER_FIELDS = `
  o.id::int, o.customer_name, o.customer_email, o.status, o.created_at, o.updated_at,
  (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id)::int AS item_count,
  (SELECT COALESCE(SUM(i.qty * p.price_cents), 0)
   FROM order_items i JOIN products p ON p.id = i.product_id
   WHERE i.order_id = o.id)::int AS total_cents
`;

export async function listProducts() {
  const { rows } = await pool.query(
    `SELECT p.id::int, p.sku, p.name, p.supplier, p.price_cents,
            COALESCE(inv.stock, 0)::int AS stock
     FROM products p
     LEFT JOIN inventory inv ON inv.product_id = p.id
     ORDER BY p.id`,
  );
  return rows;
}

export async function listOrders(status?: string) {
  const where = status ? "WHERE o.status = $1" : "";
  const { rows } = await pool.query(
    `SELECT ${ORDER_FIELDS} FROM orders o ${where} ORDER BY o.created_at DESC`,
    status ? [status] : [],
  );
  return rows;
}

export async function getOrder(id: number) {
  const { rows } = await pool.query(
    `SELECT ${ORDER_FIELDS} FROM orders o WHERE o.id = $1`,
    [id],
  );
  const order = rows[0];
  if (!order) return null;
  const [items, events, notifications] = await Promise.all([
    pool.query(
      `SELECT i.id::int, i.product_id::int, i.qty, p.sku, p.name, p.price_cents
       FROM order_items i JOIN products p ON p.id = i.product_id
       WHERE i.order_id = $1 ORDER BY i.id`,
      [id],
    ),
    pool.query(
      `SELECT id::int, status, processed, created_at
       FROM order_events WHERE order_id = $1 ORDER BY id`,
      [id],
    ),
    pool.query(
      `SELECT id::int, channel, message, created_at
       FROM notifications WHERE order_id = $1 ORDER BY id`,
      [id],
    ),
  ]);
  return {
    ...order,
    items: items.rows,
    events: events.rows,
    notifications: notifications.rows,
  };
}

export async function productsExist(ids: number[]): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT COUNT(DISTINCT id)::int AS n FROM products WHERE id = ANY($1)`,
    [ids],
  );
  return rows[0].n === new Set(ids).size;
}

// Order, items, and the 'pending' event are written in one transaction so the
// inventory and notifications services never observe a half-created order.
export async function createOrder(
  customerName: string,
  customerEmail: string,
  items: OrderItemInput[],
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO orders (customer_name, customer_email)
       VALUES ($1, $2) RETURNING id`,
      [customerName, customerEmail],
    );
    const orderId = rows[0].id;
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, qty) VALUES ($1, $2, $3)`,
        [orderId, item.product_id, item.qty],
      );
    }
    await client.query(
      `INSERT INTO order_events (order_id, status) VALUES ($1, 'pending')`,
      [orderId],
    );
    await client.query("COMMIT");
    return getOrder(Number(orderId));
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

const FAKE_CUSTOMERS = [
  ["Ada Lovelace", "ada@example.com"],
  ["Grace Hopper", "grace@example.com"],
  ["Alan Turing", "alan@example.com"],
  ["Katherine Johnson", "katherine@example.com"],
  ["Linus Torvalds", "linus@example.com"],
  ["Margaret Hamilton", "margaret@example.com"],
  ["Dennis Ritchie", "dennis@example.com"],
  ["Radia Perlman", "radia@example.com"],
];

export async function simulateOrders(count: number) {
  const { rows: products } = await pool.query(`SELECT id::int FROM products`);
  const created = [];
  for (let i = 0; i < count; i++) {
    const [name, email] =
      FAKE_CUSTOMERS[Math.floor(Math.random() * FAKE_CUSTOMERS.length)];
    const itemCount = 1 + Math.floor(Math.random() * 3);
    const picked = [...products]
      .sort(() => Math.random() - 0.5)
      .slice(0, itemCount);
    const items = picked.map((p) => ({
      product_id: p.id,
      qty: 1 + Math.floor(Math.random() * 4),
    }));
    created.push(await createOrder(name, email, items));
  }
  return created;
}
