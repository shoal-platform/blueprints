"use client";

import { useState } from "react";
import { createTopic, type Topic } from "@/lib/api";
import { getName } from "@/lib/session";
import NamePrompt from "./NamePrompt";

export default function NewTopicForm({
  onCreated,
}: {
  onCreated: (topic: Topic) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [needName, setNeedName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(name: string) {
    setBusy(true);
    setError(null);
    try {
      const topic = await createTopic(title.trim(), body.trim(), name);
      setTitle("");
      setBody("");
      setOpen(false);
      onCreated(topic);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const name = getName();
    if (!name) {
      setNeedName(true);
      return;
    }
    submit(name);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-stone-300 px-4 py-3 text-left text-sm text-stone-500 transition-colors hover:border-emerald-500 hover:text-emerald-600 dark:border-stone-700"
      >
        + Start a new topic…
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900"
    >
      {needName && (
        <NamePrompt
          onDone={(name) => {
            setNeedName(false);
            submit(name);
          }}
          onCancel={() => setNeedName(false)}
        />
      )}
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        placeholder="Topic title"
        className="w-full rounded-lg border border-stone-300 bg-transparent px-3 py-2 text-sm font-medium outline-none focus:border-emerald-500 dark:border-stone-600"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Say more (optional)"
        className="mt-2 w-full rounded-lg border border-stone-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-stone-600"
      />
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "Posting…" : "Post topic"}
        </button>
      </div>
    </form>
  );
}
