"use client";

import { useState } from "react";
import { setName } from "@/lib/session";

interface Props {
  onDone: (name: string) => void;
  onCancel: () => void;
}

export default function NamePrompt({ onDone, onCancel }: Props) {
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = value.trim();
    if (!name) return;
    setName(name);
    onDone(name);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-700 dark:bg-stone-900"
      >
        <h2 className="text-lg font-semibold">Pick a name</h2>
        <p className="mt-1 text-sm text-stone-500">
          No account needed — this name is just kept in your browser.
        </p>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={50}
          placeholder="e.g. CuriousOtter"
          className="mt-4 w-full rounded-lg border border-stone-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-stone-600"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!value.trim()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
