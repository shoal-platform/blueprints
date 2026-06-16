"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listTopics, type Sort, type Topic } from "@/lib/api";
import NewTopicForm from "@/components/NewTopicForm";
import VoteButtons from "@/components/VoteButtons";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Home() {
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [sort, setSort] = useState<Sort>("new");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    listTopics(sort).then(setTopics).catch((err) => setError(err.message));
  }, [sort]);

  const sortButton = (value: Sort, label: string) => (
    <button
      onClick={() => setSort(value)}
      className={`rounded-full px-3 py-1 text-sm transition-colors ${
        sort === value
          ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
          : "text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <NewTopicForm
        onCreated={(topic) => setTopics((prev) => [topic, ...(prev ?? [])])}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Topics</h1>
        <div className="flex gap-1">
          {sortButton("new", "Newest")}
          {sortButton("top", "Top")}
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {topics === null && !error && (
        <p className="text-sm text-stone-500">Loading…</p>
      )}
      {topics?.length === 0 && (
        <p className="text-sm text-stone-500">
          Nothing here yet — start the first topic.
        </p>
      )}

      <ul className="space-y-3">
        {topics?.map((topic) => (
          <li
            key={topic.id}
            className="relative flex gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow hover:shadow dark:border-stone-700 dark:bg-stone-900"
          >
            <div className="relative z-10">
              <VoteButtons
                targetType="topic"
                targetId={topic.id}
                score={topic.score}
                userVote={topic.user_vote}
              />
            </div>
            <div className="min-w-0">
              <Link
                href={`/topics/${topic.id}`}
                className="font-medium after:absolute after:inset-0 hover:text-emerald-600"
              >
                {topic.title}
              </Link>
              <p className="mt-1 text-sm text-stone-500">
                by {topic.author_name} · {timeAgo(topic.created_at)} ·{" "}
                {topic.reply_count}{" "}
                {topic.reply_count === 1 ? "reply" : "replies"}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
