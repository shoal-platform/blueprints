import { formatPrice, type InventoryLevel } from "@/lib/api";

export default function InventoryPanel({
  levels,
}: {
  levels: InventoryLevel[];
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
        Inventory{" "}
        <span className="font-normal normal-case">· from inventory service</span>
      </h2>
      <ul className="mt-3 space-y-2 text-sm">
        {levels.map((level) => (
          <li key={level.product_id} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate">
              {level.name}{" "}
              <span className="font-mono text-xs text-stone-400">
                {level.sku}
              </span>
            </span>
            <span className="text-xs text-stone-500">
              {formatPrice(level.price_cents)}
            </span>
            <span
              className={`w-12 text-right font-mono text-sm ${
                level.stock === 0
                  ? "text-rose-600"
                  : level.stock < 10
                    ? "text-amber-600"
                    : "text-emerald-600"
              }`}
            >
              {level.stock}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
