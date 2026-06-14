"use client";

import { useState } from "react";
import { createOrder, type OrderItemInput, type Product } from "@/lib/api";

interface Props {
  products: Product[];
  onCreated: () => void;
}

export default function NewOrderForm({ products, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [items, setItems] = useState<OrderItemInput[]>([
    { product_id: 0, qty: 1 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function setItem(index: number, patch: Partial<OrderItemInput>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const chosen = items.filter((item) => item.product_id > 0);
    if (chosen.length === 0) {
      setError("Pick at least one product");
      return;
    }
    setBusy(true);
    try {
      await createOrder(name, email, chosen);
      setOpen(false);
      setName("");
      setEmail("");
      setItems([{ product_id: 0, qty: 1 }]);
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
      >
        + New order
      </button>
    );
  }

  const inputClass =
    "rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800";

  return (
    <form
      onSubmit={submit}
      className="w-full space-y-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900"
    >
      <div className="flex flex-wrap gap-3">
        <input
          className={`${inputClass} flex-1`}
          placeholder="Customer name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className={`${inputClass} flex-1`}
          type="email"
          placeholder="Customer email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      {items.map((item, index) => (
        <div key={index} className="flex gap-3">
          <select
            className={`${inputClass} flex-1`}
            value={item.product_id}
            onChange={(e) => setItem(index, { product_id: Number(e.target.value) })}
          >
            <option value={0}>Pick a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
          <input
            className={`${inputClass} w-20`}
            type="number"
            min={1}
            max={10000}
            value={item.qty}
            onChange={(e) => setItem(index, { qty: Number(e.target.value) })}
          />
        </div>
      ))}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
        >
          {busy ? "Placing…" : "Place order"}
        </button>
        <button
          type="button"
          onClick={() =>
            setItems((prev) => [...prev, { product_id: 0, qty: 1 }])
          }
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800"
        >
          + Add item
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-sm text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
