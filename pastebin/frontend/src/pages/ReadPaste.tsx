import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPaste, type Paste } from "../api";

export default function ReadPaste() {
  const { id } = useParams<{ id: string }>();
  const [paste, setPaste] = useState<Paste | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPaste(id)
      .then(setPaste)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!paste) return null;

  return (
    <section>
      <h1>{paste.title || "(untitled)"}</h1>
      <p className="paste-meta">
        <code>{paste.id}</code> · {new Date(paste.created_at).toLocaleString()}
      </p>
      <pre className="paste-content">{paste.content}</pre>
      <Link to="/" className="back-link">
        ← Back to board
      </Link>
    </section>
  );
}
