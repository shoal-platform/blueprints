import express from "express";
import cors from "cors";
import { createPaste, getPaste, listPastes } from "./pastes.js";

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/pastes", async (_req, res) => {
    res.json(await listPastes());
  });

  app.get("/api/pastes/:id", async (req, res) => {
    const paste = await getPaste(req.params.id);
    if (!paste) {
      res.status(404).json({ error: "paste not found" });
      return;
    }
    res.json(paste);
  });

  app.post("/api/pastes", async (req, res) => {
    const { title, content } = req.body ?? {};
    if (typeof content !== "string" || content.trim() === "") {
      res.status(400).json({ error: "content is required" });
      return;
    }
    const paste = await createPaste(
      typeof title === "string" ? title : "",
      content,
    );
    res.status(201).json(paste);
  });

  return app;
}
