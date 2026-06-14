"use client";

import { useState } from "react";
import { formatPrice, getOrder, type Order, type OrderDetail } from "@/lib/api";
import StatusBadge from "./StatusBadge";

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${Math.floor(seconds)}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function OrderCard({ order }: { order: Order }) {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      setDetail(await getOrder(order.id));
    }
  }

  return (
    <li className="rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <button
        onClick={toggle}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="font-mono text-sm text-stone-400">#{order.id}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {order.customer_name}
          </span>
          <span className="block text-xs text-stone-500">
            {order.item_count} {order.item_count === 1 ? "item" : "items"} ·{" "}
            {formatPrice(order.total_cents)} · {timeAgo(order.created_at)}
          </span>
        </span>
        <StatusBadge status={order.status} />
      </button>

      {expanded && (
        <div className="border-t border-stone-100 px-4 py-3 text-sm dark:border-stone-800">
          {!detail ? (
            <p className="text-stone-500">Loading…</p>
          ) : (
            <div className="space-y-3">
              <ul className="space-y-1">
                {detail.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>
                      {item.qty} × {item.name}{" "}
                      <span className="font-mono text-xs text-stone-400">
                        {item.sku}
                      </span>
                    </span>
                    <span className="text-stone-500">
                      {formatPrice(item.qty * item.price_cents)}
                    </span>
                  </li>
                ))}
              </ul>
              <ol className="flex flex-wrap gap-2 text-xs text-stone-500">
                {detail.events.map((event, i) => (
                  <li key={event.id} className="flex items-center gap-2">
                    {i > 0 && <span>→</span>}
                    <span>
                      {event.status}{" "}
                      {new Date(event.created_at).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
