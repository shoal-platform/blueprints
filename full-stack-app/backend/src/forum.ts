import { pool } from "./db.js";

export type TargetType = "topic" | "reply";

// Score and the caller's own vote are computed per row at query time; the
// votes_target_idx index keeps the aggregates cheap at demo scale.
const TOPIC_FIELDS = `
  t.id::int, t.title, t.body, t.author_name, t.created_at,
  COALESCE((SELECT SUM(v.value) FROM votes v
            WHERE v.target_type = 'topic' AND v.target_id = t.id), 0)::int AS score,
  (SELECT COUNT(*) FROM replies r WHERE r.topic_id = t.id)::int AS reply_count,
  (SELECT v.value FROM votes v
   WHERE v.target_type = 'topic' AND v.target_id = t.id AND v.session_id = $1)::int AS user_vote
`;

export async function listTopics(sort: "new" | "top", sessionId: string) {
  const orderBy =
    sort === "top" ? "score DESC, t.created_at DESC" : "t.created_at DESC";
  const { rows } = await pool.query(
    `SELECT ${TOPIC_FIELDS} FROM topics t ORDER BY ${orderBy}`,
    [sessionId],
  );
  return rows;
}

export async function getTopic(id: number, sessionId: string) {
  const { rows } = await pool.query(
    `SELECT ${TOPIC_FIELDS} FROM topics t WHERE t.id = $2`,
    [sessionId, id],
  );
  return rows[0] ?? null;
}

export async function listReplies(topicId: number, sessionId: string) {
  const { rows } = await pool.query(
    `SELECT r.id::int, r.topic_id::int, r.body, r.author_name, r.created_at,
       COALESCE((SELECT SUM(v.value) FROM votes v
                 WHERE v.target_type = 'reply' AND v.target_id = r.id), 0)::int AS score,
       (SELECT v.value FROM votes v
        WHERE v.target_type = 'reply' AND v.target_id = r.id AND v.session_id = $1)::int AS user_vote
     FROM replies r
     WHERE r.topic_id = $2
     ORDER BY r.created_at`,
    [sessionId, topicId],
  );
  return rows;
}

export async function createTopic(
  title: string,
  body: string,
  authorName: string,
  sessionId: string,
) {
  const { rows } = await pool.query(
    `INSERT INTO topics (title, body, author_name, session_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id::int, title, body, author_name, created_at`,
    [title, body, authorName, sessionId],
  );
  return { ...rows[0], score: 0, reply_count: 0, user_vote: null };
}

export async function createReply(
  topicId: number,
  body: string,
  authorName: string,
  sessionId: string,
) {
  const { rows } = await pool.query(
    `INSERT INTO replies (topic_id, body, author_name, session_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id::int, topic_id::int, body, author_name, created_at`,
    [topicId, body, authorName, sessionId],
  );
  return { ...rows[0], score: 0, user_vote: null };
}

export async function targetExists(
  type: TargetType,
  id: number,
): Promise<boolean> {
  const table = type === "topic" ? "topics" : "replies";
  const { rowCount } = await pool.query(
    `SELECT 1 FROM ${table} WHERE id = $1`,
    [id],
  );
  return (rowCount ?? 0) > 0;
}

// Same vote again toggles it off; the opposite vote replaces it.
export async function castVote(
  type: TargetType,
  id: number,
  sessionId: string,
  value: 1 | -1,
) {
  const existing = await pool.query(
    `SELECT value FROM votes
     WHERE target_type = $1 AND target_id = $2 AND session_id = $3`,
    [type, id, sessionId],
  );
  let userVote: number | null;
  if (existing.rowCount === 0) {
    await pool.query(
      `INSERT INTO votes (target_type, target_id, session_id, value)
       VALUES ($1, $2, $3, $4)`,
      [type, id, sessionId, value],
    );
    userVote = value;
  } else if (existing.rows[0].value === value) {
    await pool.query(
      `DELETE FROM votes
       WHERE target_type = $1 AND target_id = $2 AND session_id = $3`,
      [type, id, sessionId],
    );
    userVote = null;
  } else {
    await pool.query(
      `UPDATE votes SET value = $4
       WHERE target_type = $1 AND target_id = $2 AND session_id = $3`,
      [type, id, sessionId, value],
    );
    userVote = value;
  }
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(value), 0)::int AS score FROM votes
     WHERE target_type = $1 AND target_id = $2`,
    [type, id],
  );
  return { score: rows[0].score as number, user_vote: userVote };
}
