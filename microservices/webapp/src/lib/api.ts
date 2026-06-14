const ORDERS_API =
  process.env.NEXT_PUBLIC_ORDERS_API_URL ?? "http://localhost:8081";
const INVENTORY_API =
  process.env.NEXT_PUBLIC_INVENTORY_API_URL ?? "http://localhost:8082";
const NOTIFICATIONS_API =
  process.env.NEXT_PUBLIC_NOTIFICATIONS_API_URL ?? "http://localhost:8083";

export type OrderStatus = "pending" | "confirmed" | "backordered" | "shipped";

export interface Product {
  id: number;
  sku: string;
  name: string;
  supplier: string;
  price_cents: number;
  stock: number;
}

export interface Order {
  id: number;
  customer_name: string;
  customer_email: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  item_count: number;
  total_cents: number;
}

export interface OrderDetail extends Order {
  items: {
    id: number;
    product_id: number;
    qty: number;
    sku: string;
    name: string;
    price_cents: number;
  }[];
  events: { id: number; status: string; processed: boolean; created_at: string }[];
  notifications: AppNotification[];
}

export interface InventoryLevel {
  product_id: number;
  sku: string;
  name: string;
  supplier: string;
  price_cents: number;
  stock: number;
}

export interface AppNotification {
  id: number;
  order_id: number;
  channel: string;
  message: string;
  created_at: string;
}

export interface OrderItemInput {
  product_id: number;
  qty: number;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request failed (${res.status})`,
    );
  }
  return res.json() as Promise<T>;
}

export function listOrders(): Promise<Order[]> {
  return fetch(`${ORDERS_API}/api/orders`).then(json<Order[]>);
}

export function getOrder(id: number): Promise<OrderDetail> {
  return fetch(`${ORDERS_API}/api/orders/${id}`).then(json<OrderDetail>);
}

export function listProducts(): Promise<Product[]> {
  return fetch(`${ORDERS_API}/api/products`).then(json<Product[]>);
}

export function createOrder(
  customerName: string,
  customerEmail: string,
  items: OrderItemInput[],
): Promise<OrderDetail> {
  return fetch(`${ORDERS_API}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      customer_name: customerName,
      customer_email: customerEmail,
      items,
    }),
  }).then(json<OrderDetail>);
}

export function simulateOrders(count: number): Promise<OrderDetail[]> {
  return fetch(`${ORDERS_API}/api/simulate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ count }),
  }).then(json<OrderDetail[]>);
}

export function listInventory(): Promise<InventoryLevel[]> {
  return fetch(`${INVENTORY_API}/api/inventory`).then(json<InventoryLevel[]>);
}

export function listNotifications(): Promise<AppNotification[]> {
  return fetch(`${NOTIFICATIONS_API}/api/notifications`).then(
    json<AppNotification[]>,
  );
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
