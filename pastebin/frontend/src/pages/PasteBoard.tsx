import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listPastes, type PasteSummary } from "../api";

export default function PasteBoard() {
  const [pastes, setPastes] = useState<PasteSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPastes()
      .then(setPastes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <section>
      <h1>Paste board</h1>
      {pastes.length === 0 ? (
        <p className="muted">
          No pastes yet. <Link to="/new">Create one</Link>.
        </p>
      ) : (
        <ul className="paste-list">
          {pastes.map((p) => (
            <li key={p.id}>
              <Link to={`/p/${p.id}`} className="paste-link">
                <span className="paste-title">{p.title || "(untitled)"}</span>
                <span className="paste-meta">
                  <code>{p.id}</code> ·{" "}
                  {new Date(p.created_at).toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
