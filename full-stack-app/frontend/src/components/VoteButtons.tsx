"use client";

import { useState } from "react";
import { vote } from "@/lib/api";

interface Props {
  targetType: "topic" | "reply";
  targetId: number;
  score: number;
  userVote: 1 | -1 | null;
}

export default function VoteButtons({
  targetType,
  targetId,
  score: initialScore,
  userVote: initialVote,
}: Props) {
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState(initialVote);
  const [busy, setBusy] = useState(false);

  async function cast(value: 1 | -1) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await vote(targetType, targetId, value);
      setScore(result.score);
      setUserVote(result.user_vote);
    } catch {
      // Demo app: swallow vote errors silently.
    } finally {
      setBusy(false);
    }
  }

  const base =
    "rounded p-1 text-xs leading-none transition-colors hover:bg-stone-200 dark:hover:bg-stone-700";

  return (
    <div className="flex flex-col items-center gap-0.5 text-stone-500">
      <button
        aria-label="Upvote"
        onClick={() => cast(1)}
        className={`${base} ${userVote === 1 ? "text-emerald-600 dark:text-emerald-400" : ""}`}
      >
        ▲
      </button>
      <span
        className={`text-sm font-semibold tabular-nums ${
          userVote === 1
            ? "text-emerald-600 dark:text-emerald-400"
            : userVote === -1
              ? "text-rose-600 dark:text-rose-400"
              : "text-stone-700 dark:text-stone-300"
        }`}
      >
        {score}
      </span>
      <button
        aria-label="Downvote"
        onClick={() => cast(-1)}
        className={`${base} ${userVote === -1 ? "text-rose-600 dark:text-rose-400" : ""}`}
      >
        ▼
      </button>
    </div>
  );
}
