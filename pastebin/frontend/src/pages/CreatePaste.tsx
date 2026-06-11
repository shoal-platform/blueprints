import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPaste } from "../api";

export default function CreatePaste() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (content.trim() === "") {
      setError("Content is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const paste = await createPaste(title, content);
      navigate(`/p/${paste.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <section>
      <h1>New paste</h1>
      <form className="paste-form" onSubmit={submit}>
        <input
          type="text"
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Paste your text here…"
          value={content}
          rows={16}
          onChange={(e) => setContent(e.target.value)}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Create paste"}
        </button>
      </form>
    </section>
  );
}
