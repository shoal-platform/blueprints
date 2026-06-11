import { pool } from "./db.js";
import { generateId } from "./id.js";

export interface Paste {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export type PasteSummary = Omit<Paste, "content">;

export async function createPaste(
  title: string,
  content: string,
): Promise<Paste> {
  const id = generateId();
  const { rows } = await pool.query<Paste>(
    `INSERT INTO pastes (id, title, content)
     VALUES ($1, $2, $3)
     RETURNING id, title, content, created_at`,
    [id, title, content],
  );
  return rows[0];
}

export async function getPaste(id: string): Promise<Paste | null> {
  const { rows } = await pool.query<Paste>(
    `SELECT id, title, content, created_at FROM pastes WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listPastes(): Promise<PasteSummary[]> {
  const { rows } = await pool.query<PasteSummary>(
    `SELECT id, title, created_at FROM pastes ORDER BY created_at DESC`,
  );
  return rows;
}
