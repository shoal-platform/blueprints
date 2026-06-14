import cors from "cors";
import express from "express";
import {
  createOrder,
  getOrder,
  listOrders,
  listProducts,
  productsExist,
  simulateOrders,
  type OrderItemInput,
} from "./orders.js";

const STATUSES = ["pending", "confirmed", "backordered", "shipped"];

function asText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  return trimmed;
}

function asItems(value: unknown): OrderItemInput[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) {
    return null;
  }
  const items: OrderItemInput[] = [];
  for (const entry of value) {
    const productId = Number((entry as OrderItemInput)?.product_id);
    const qty = Number((entry as OrderItemInput)?.qty);
    if (!Number.isInteger(productId) || productId < 1) return null;
    if (!Number.isInteger(qty) || qty < 1 || qty > 10_000) return null;
    items.push({ product_id: productId, qty });
  }
  return items;
}

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/products", async (_req, res) => {
    res.json(await listProducts());
  });

  app.get("/api/orders", async (req, res) => {
    const status = req.query.status;
    if (status !== undefined) {
      if (typeof status !== "string" || !STATUSES.includes(status)) {
        res.status(400).json({ error: `status must be one of: ${STATUSES.join(", ")}` });
        return;
      }
      res.json(await listOrders(status));
      return;
    }
    res.json(await listOrders());
  });

  app.get("/api/orders/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: "invalid order id" });
      return;
    }
    const order = await getOrder(id);
    if (!order) {
      res.status(404).json({ error: "order not found" });
      return;
    }
    res.json(order);
  });

  app.post("/api/orders", async (req, res) => {
    const customerName = asText(req.body?.customer_name, 100);
    const customerEmail = asText(req.body?.customer_email, 200);
    const items = asItems(req.body?.items);
    if (!customerName) {
      res.status(400).json({ error: "customer_name is required (max 100 chars)" });
      return;
    }
    if (!customerEmail) {
      res.status(400).json({ error: "customer_email is required (max 200 chars)" });
      return;
    }
    if (!items) {
      res.status(400).json({
        error: "items must be a non-empty array of {product_id, qty} (qty 1-10000)",
      });
      return;
    }
    if (!(await productsExist(items.map((i) => i.product_id)))) {
      res.status(400).json({ error: "one or more product_ids do not exist" });
      return;
    }
    res.status(201).json(await createOrder(customerName, customerEmail, items));
  });

  app.post("/api/simulate", async (req, res) => {
    const count = Number(req.body?.count ?? 1);
    if (!Number.isInteger(count) || count < 1 || count > 50) {
      res.status(400).json({ error: "count must be an integer between 1 and 50" });
      return;
    }
    res.status(201).json(await simulateOrders(count));
  });

  return app;
}
