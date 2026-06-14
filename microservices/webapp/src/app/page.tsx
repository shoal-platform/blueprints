"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listInventory,
  listNotifications,
  listOrders,
  listProducts,
  simulateOrders,
  type AppNotification,
  type InventoryLevel,
  type Order,
  type Product,
} from "@/lib/api";
import InventoryPanel from "@/components/InventoryPanel";
import NewOrderForm from "@/components/NewOrderForm";
import NotificationsFeed from "@/components/NotificationsFeed";
import OrderCard from "@/components/OrderCard";

const POLL_MS = 2000;

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [inventory, setInventory] = useState<InventoryLevel[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const refresh = useCallback(async () => {
    // Each panel comes from a different service; one being down should not
    // blank the others.
    const results = await Promise.allSettled([
      listOrders(),
      listInventory(),
      listNotifications(),
      listProducts(),
    ]);
    if (results[0].status === "fulfilled") setOrders(results[0].value);
    if (results[1].status === "fulfilled") setInventory(results[1].value);
    if (results[2].status === "fulfilled") setNotifications(results[2].value);
    if (results[3].status === "fulfilled") setProducts(results[3].value);
    const failed = results.filter((r) => r.status === "rejected");
    setError(
      failed.length > 0
        ? `${failed.length} service(s) unreachable — showing last known data`
        : null,
    );
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  async function simulate() {
    setSimulating(true);
    try {
      await simulateOrders(5);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSimulating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <NewOrderForm products={products} onCreated={refresh} />
        <button
          onClick={simulate}
          disabled={simulating}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 disabled:opacity-50 dark:border-stone-600 dark:hover:bg-stone-800"
        >
          {simulating ? "Simulating…" : "🎲 Simulate 5 orders"}
        </button>
        {error && <p className="py-1.5 text-sm text-amber-600">{error}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Orders{" "}
            <span className="font-normal normal-case">
              · from orders service
            </span>
          </h2>
          {orders === null ? (
            <p className="mt-3 text-sm text-stone-500">Loading…</p>
          ) : orders.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">
              No orders yet — place one or hit simulate.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <InventoryPanel levels={inventory} />
          <NotificationsFeed notifications={notifications} />
        </div>
      </div>
    </div>
  );
}
