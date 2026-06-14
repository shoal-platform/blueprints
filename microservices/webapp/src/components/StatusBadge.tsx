import type { OrderStatus } from "@/lib/api";

const STYLES: Record<OrderStatus, string> = {
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  confirmed: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  backordered:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  shipped:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status] ?? "bg-stone-100 text-stone-700"}`}
    >
      {status}
    </span>
  );
}
