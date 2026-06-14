"use client";

import { useState } from "react";
import { createReply, type Reply } from "@/lib/api";
import { getName } from "@/lib/session";
import NamePrompt from "./NamePrompt";

export default function ReplyForm({
  topicId,
  onCreated,
}: {
  topicId: number;
  onCreated: (reply: Reply) => void;
}) {
  const [body, setBody] = useState("");
  const [needName, setNeedName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(name: string) {
    setBusy(true);
    setError(null);
    try {
      const reply = await createReply(topicId, body.trim(), name);
      setBody("");
      onCreated(reply);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const name = getName();
    if (!name) {
      setNeedName(true);
      return;
    }
    submit(name);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6">
      {needName && (
        <NamePrompt
          onDone={(name) => {
            setNeedName(false);
            submit(name);
          }}
          onCancel={() => setNeedName(false)}
        />
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Write a reply…"
        className="w-full rounded-lg border border-stone-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-stone-600"
      />
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={busy || !body.trim()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "Replying…" : "Reply"}
        </button>
      </div>
    </form>
  );
}
