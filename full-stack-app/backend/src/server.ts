import express from "express";
import cors from "cors";
import {
  castVote,
  createReply,
  createTopic,
  getTopic,
  listReplies,
  listTopics,
  targetExists,
  type TargetType,
} from "./forum.js";

function asName(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim().slice(0, 50);
}

function asSessionId(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim().slice(0, 100);
}

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/topics", async (req, res) => {
    const sort = req.query.sort === "top" ? "top" : "new";
    const sessionId = asSessionId(req.query.session_id) ?? "";
    res.json(await listTopics(sort, sessionId));
  });

  app.post("/api/topics", async (req, res) => {
    const { title, body, author_name, session_id } = req.body ?? {};
    const name = asName(author_name);
    const sessionId = asSessionId(session_id);
    if (typeof title !== "string" || title.trim() === "") {
      res.status(400).json({ error: "title is required" });
      return;
    }
    if (!name) {
      res.status(400).json({ error: "author_name is required" });
      return;
    }
    if (!sessionId) {
      res.status(400).json({ error: "session_id is required" });
      return;
    }
    const topic = await createTopic(
      title.trim().slice(0, 200),
      typeof body === "string" ? body : "",
      name,
      sessionId,
    );
    res.status(201).json(topic);
  });

  app.get("/api/topics/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "invalid topic id" });
      return;
    }
    const sessionId = asSessionId(req.query.session_id) ?? "";
    const topic = await getTopic(id, sessionId);
    if (!topic) {
      res.status(404).json({ error: "topic not found" });
      return;
    }
    res.json({ topic, replies: await listReplies(id, sessionId) });
  });

  app.post("/api/topics/:id/replies", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "invalid topic id" });
      return;
    }
    const { body, author_name, session_id } = req.body ?? {};
    const name = asName(author_name);
    const sessionId = asSessionId(session_id);
    if (typeof body !== "string" || body.trim() === "") {
      res.status(400).json({ error: "body is required" });
      return;
    }
    if (!name) {
      res.status(400).json({ error: "author_name is required" });
      return;
    }
    if (!sessionId) {
      res.status(400).json({ error: "session_id is required" });
      return;
    }
    if (!(await targetExists("topic", id))) {
      res.status(404).json({ error: "topic not found" });
      return;
    }
    res.status(201).json(await createReply(id, body.trim(), name, sessionId));
  });

  app.post("/api/votes", async (req, res) => {
    const { target_type, target_id, session_id, value } = req.body ?? {};
    const sessionId = asSessionId(session_id);
    if (target_type !== "topic" && target_type !== "reply") {
      res.status(400).json({ error: "target_type must be 'topic' or 'reply'" });
      return;
    }
    const id = Number(target_id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "invalid target_id" });
      return;
    }
    if (!sessionId) {
      res.status(400).json({ error: "session_id is required" });
      return;
    }
    if (value !== 1 && value !== -1) {
      res.status(400).json({ error: "value must be 1 or -1" });
      return;
    }
    if (!(await targetExists(target_type as TargetType, id))) {
      res.status(404).json({ error: `${target_type} not found` });
      return;
    }
    res.json(await castVote(target_type as TargetType, id, sessionId, value));
  });

  return app;
}
