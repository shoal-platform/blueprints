import { getSessionId } from "./session";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export interface Topic {
  id: number;
  title: string;
  body: string;
  author_name: string;
  created_at: string;
  score: number;
  reply_count: number;
  user_vote: 1 | -1 | null;
}

export interface Reply {
  id: number;
  topic_id: number;
  body: string;
  author_name: string;
  created_at: string;
  score: number;
  user_vote: 1 | -1 | null;
}

export type Sort = "new" | "top";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request failed (${res.status})`,
    );
  }
  return res.json() as Promise<T>;
}

function post(path: string, body: unknown): Promise<Response> {
  return fetch(`${API}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function listTopics(sort: Sort): Promise<Topic[]> {
  return fetch(
    `${API}/api/topics?sort=${sort}&session_id=${getSessionId()}`,
  ).then(json<Topic[]>);
}

export function getTopic(
  id: number,
): Promise<{ topic: Topic; replies: Reply[] }> {
  return fetch(`${API}/api/topics/${id}?session_id=${getSessionId()}`).then(
    json<{ topic: Topic; replies: Reply[] }>,
  );
}

export function createTopic(
  title: string,
  body: string,
  authorName: string,
): Promise<Topic> {
  return post("/api/topics", {
    title,
    body,
    author_name: authorName,
    session_id: getSessionId(),
  }).then(json<Topic>);
}

export function createReply(
  topicId: number,
  body: string,
  authorName: string,
): Promise<Reply> {
  return post(`/api/topics/${topicId}/replies`, {
    body,
    author_name: authorName,
    session_id: getSessionId(),
  }).then(json<Reply>);
}

export function vote(
  targetType: "topic" | "reply",
  targetId: number,
  value: 1 | -1,
): Promise<{ score: number; user_vote: 1 | -1 | null }> {
  return post("/api/votes", {
    target_type: targetType,
    target_id: targetId,
    session_id: getSessionId(),
    value,
  }).then(json<{ score: number; user_vote: 1 | -1 | null }>);
}
