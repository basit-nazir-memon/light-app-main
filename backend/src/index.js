import express from "express";
import { initSchema, db } from "./db.js";
import { seedIfEmpty } from "./seed.js";
import { api } from "./routes.js";
import { handleRestoreUpload } from "./backup-routes.js";
import { requireAuth } from "./middleware/auth.js";

const PORT = Number(process.env.PORT) || 3001;

initSchema();
seedIfEmpty();

const app = express();
// Allow all origins (local dev). No cors package — set headers on every response.
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Filename");
  if (_req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post(
  "/api/backup/restore",
  requireAuth,
  express.raw({ type: "application/octet-stream", limit: "100mb" }),
  handleRestoreUpload,
);

app.use(express.json());

app.use("/api", api);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
    return res.status(409).json({ error: "Duplicate entry" });
  }
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Yova Auto API running at http://localhost:${PORT}`);
  console.log(`SQLite database: ${db.name}`);
});
