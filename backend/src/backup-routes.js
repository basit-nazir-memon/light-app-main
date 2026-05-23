import { Router } from "express";
import fs from "fs";
import path from "path";
import { getDataDir, getDbPath } from "./db.js";
import { defaultBackupDirectory } from "./backup-paths.js";
import {
  loadBackupSettings,
  setBackupDirectory,
  runBackup,
  listBackups,
  createExportTempFile,
  restoreFromUploadedBuffer,
  restoreDatabase,
  resolveBackupFile,
} from "./backup.js";

/** Mounted at /api/backup (auth applied by parent api router). */
export const backupApi = Router();

backupApi.get("/settings", (_req, res) => {
  const settings = loadBackupSettings();
  res.json({
    backupDirectory: settings.backupDirectory,
    lastBackupAt: settings.lastBackupAt,
    databasePath: getDbPath(),
    dataDirectory: getDataDir(),
    defaultBackupDirectory: defaultBackupDirectory(),
  });
});

backupApi.patch("/settings", (req, res) => {
  try {
    const { backupDirectory } = req.body ?? {};
    if (!backupDirectory) {
      return res.status(400).json({ error: "backupDirectory is required" });
    }
    const settings = setBackupDirectory(backupDirectory);
    res.json({
      backupDirectory: settings.backupDirectory,
      lastBackupAt: settings.lastBackupAt,
      message: "Backup storage location saved",
    });
  } catch (e) {
    res.status(400).json({ error: e.message || "Could not save backup location" });
  }
});

backupApi.get("/list", (_req, res) => {
  res.json({ backups: listBackups() });
});

backupApi.post("/run", async (_req, res) => {
  try {
    const result = await runBackup();
    res.status(201).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message || "Backup failed" });
  }
});

backupApi.get("/export", async (_req, res) => {
  let tmp;
  try {
    tmp = await createExportTempFile();
    const date = new Date().toISOString().slice(0, 10);
    const filename = `yova-auto-export-${date}.db`;
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", String(fs.statSync(tmp).size));
    const stream = fs.createReadStream(tmp);
    stream.pipe(res);
    stream.on("end", () => {
      if (tmp && fs.existsSync(tmp)) fs.unlinkSync(tmp);
    });
    stream.on("error", () => {
      if (tmp && fs.existsSync(tmp)) fs.unlinkSync(tmp);
      if (!res.headersSent) res.status(500).json({ error: "Export failed" });
    });
  } catch (e) {
    if (tmp && fs.existsSync(tmp)) fs.unlinkSync(tmp);
    res.status(500).json({ error: e.message || "Export failed" });
  }
});

backupApi.post("/restore/:filename", async (req, res) => {
  try {
    const source = resolveBackupFile(req.params.filename);
    const result = await restoreDatabase(source);
    const settings = loadBackupSettings();
    res.json({
      ...result,
      message: "Database restored from backup. Reload the app to refresh all data.",
      lastBackupAt: settings.lastBackupAt,
    });
  } catch (e) {
    res.status(400).json({ error: e.message || "Restore failed" });
  }
});

/** Raw SQLite file upload — mount with express.raw on this route only */
export async function handleRestoreUpload(req, res) {
  try {
    const name = req.headers["x-filename"] || "upload.db";
    const result = await restoreFromUploadedBuffer(req.body, String(name));
    const settings = loadBackupSettings();
    res.json({
      ...result,
      message: "Database restored. Reload the app to refresh all data.",
      lastBackupAt: settings.lastBackupAt,
    });
  } catch (e) {
    res.status(400).json({ error: e.message || "Restore failed" });
  }
}
