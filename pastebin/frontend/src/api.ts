export interface Paste {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export type PasteSummary = Omit<Paste, "content">;

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `request failed (${res.status})`);
  }
  return res.json();
}

export function listPastes(): Promise<PasteSummary[]> {
  return fetch("/api/pastes").then(json<PasteSummary[]>);
}

export function getPaste(id: string): Promise<Paste> {
  return fetch(`/api/pastes/${encodeURIComponent(id)}`).then(json<Paste>);
}

export function createPaste(title: string, content: string): Promise<Paste> {
  return fetch("/api/pastes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content }),
  }).then(json<Paste>);
}
