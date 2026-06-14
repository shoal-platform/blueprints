"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getTopic, type Reply, type Topic } from "@/lib/api";
import ReplyForm from "@/components/ReplyForm";
import VoteButtons from "@/components/VoteButtons";

export default function TopicPage() {
  const params = useParams<{ id: string }>();
  const topicId = Number(params.id);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isInteger(topicId)) {
      setError("Invalid topic id");
      return;
    }
    getTopic(topicId)
      .then((data) => {
        setTopic(data.topic);
        setReplies(data.replies);
      })
      .catch((err) => setError(err.message));
  }, [topicId]);

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-rose-600">{error}</p>
        <Link href="/" className="text-sm text-emerald-600 hover:underline">
          ← Back to topics
        </Link>
      </div>
    );
  }

  if (!topic) {
    return <p className="text-sm text-stone-500">Loading…</p>;
  }

  return (
    <div>
      <Link href="/" className="text-sm text-stone-500 hover:text-emerald-600">
        ← Back to topics
      </Link>

      <article className="mt-4 flex gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <VoteButtons
          targetType="topic"
          targetId={topic.id}
          score={topic.score}
          userVote={topic.user_vote}
        />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{topic.title}</h1>
          <p className="mt-1 text-sm text-stone-500">
            by {topic.author_name} ·{" "}
            {new Date(topic.created_at).toLocaleString()}
          </p>
          {topic.body && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
              {topic.body}
            </p>
          )}
        </div>
      </article>

      <h2 className="mt-8 text-lg font-semibold">
        {replies.length} {replies.length === 1 ? "reply" : "replies"}
      </h2>

      <ul className="mt-3 space-y-3">
        {replies.map((reply) => (
          <li
            key={reply.id}
            className="flex gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900"
          >
            <VoteButtons
              targetType="reply"
              targetId={reply.id}
              score={reply.score}
              userVote={reply.user_vote}
            />
            <div className="min-w-0">
              <p className="text-sm text-stone-500">
                {reply.author_name} ·{" "}
                {new Date(reply.created_at).toLocaleString()}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                {reply.body}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <ReplyForm
        topicId={topicId}
        onCreated={(reply) => setReplies((prev) => [...prev, reply])}
      />
    </div>
  );
}
