import type { AppNotification } from "@/lib/api";

export default function NotificationsFeed({
  notifications,
}: {
  notifications: AppNotification[];
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
        Notifications{" "}
        <span className="font-normal normal-case">
          · from notifications service
        </span>
      </h2>
      {notifications.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">Nothing sent yet.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {notifications.slice(0, 15).map((notification) => (
            <li key={notification.id} className="flex gap-2">
              <span aria-hidden>✉️</span>
              <span className="min-w-0">
                <span className="block">{notification.message}</span>
                <span className="block text-xs text-stone-400">
                  {new Date(notification.created_at).toLocaleTimeString()}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
