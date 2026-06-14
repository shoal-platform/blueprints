// Anonymous identity, kept in localStorage: a generated session id used for
// vote dedup, and a display name the user picks once.

const SESSION_KEY = "forum_session_id";
const NAME_KEY = "forum_name";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function getName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(NAME_KEY);
}

export function setName(name: string): void {
  window.localStorage.setItem(NAME_KEY, name.trim());
}
