import fs from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { db, getDataDir, getDbPath, reopenDatabase } from "./db.js";

const SETTINGS_FILE = "backup-settings.json";

function settingsPath() {
  return path.join(getDataDir(), SETTINGS_FILE);
}

const defaultSettings = () => ({
  backupDirectory: path.join(getDataDir(), "backups"),
  lastBackupAt: null,
});

export function loadBackupSettings() {
  const defaults = defaultSettings();
  const file = settingsPath();
  if (!fs.existsSync(file)) return defaults;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      backupDirectory: parsed.backupDirectory || defaults.backupDirectory,
      lastBackupAt: parsed.lastBackupAt ?? null,
    };
  } catch {
    return defaults;
  }
}

export function saveBackupSettings(partial) {
  const next = { ...loadBackupSettings(), ...partial };
  ensureDirectory(next.backupDirectory);
  fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function ensureDirectory(dir) {
  const resolved = path.resolve(dir);
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }
  return resolved;
}

function isSqliteDatabase(filePath) {
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    return buf.toString("utf8", 0, 16).startsWith("SQLite format 3");
  } finally {
    fs.closeSync(fd);
  }
}

/** Consistent snapshot via better-sqlite3 backup API (destPath must be a file path string). */
export async function writeDatabaseSnapshot(destPath) {
  const dir = path.dirname(destPath);
  if (dir) ensureDirectory(dir);
  await db.backup(destPath);
}

export async function runBackup(label = "") {
  const settings = loadBackupSettings();
  const dir = ensureDirectory(settings.backupDirectory);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const prefix = label ? `${label}-` : "";
  const filename = `${prefix}yova-auto-${stamp}.db`;
  const destPath = path.join(dir, filename);

  await writeDatabaseSnapshot(destPath);
  const stat = fs.statSync(destPath);
  const lastBackupAt = new Date().toISOString();
  saveBackupSettings({ lastBackupAt });

  return {
    filename,
    path: destPath,
    size: stat.size,
    createdAt: lastBackupAt,
  };
}

export function listBackups() {
  const settings = loadBackupSettings();
  const dir = settings.backupDirectory;
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".db"))
    .map((filename) => {
      const full = path.join(dir, filename);
      const stat = fs.statSync(full);
      return {
        filename,
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createExportTempFile() {
  const tmp = path.join(os.tmpdir(), `yova-export-${randomUUID()}.db`);
  await writeDatabaseSnapshot(tmp);
  return tmp;
}

export function resolveBackupFile(filename) {
  const settings = loadBackupSettings();
  const safe = path.basename(filename);
  if (safe !== filename || !safe.endsWith(".db")) {
    throw new Error("Invalid backup filename");
  }
  const full = path.join(path.resolve(settings.backupDirectory), safe);
  if (!fs.existsSync(full)) throw new Error("Backup file not found");
  return full;
}

export async function restoreDatabase(sourcePath) {
  if (!fs.existsSync(sourcePath)) throw new Error("Database file not found");
  if (!isSqliteDatabase(sourcePath)) {
    throw new Error("File is not a valid SQLite database");
  }

  const safety = await runBackup("pre-restore");
  const dbPath = getDbPath();

  db.close();

  for (const suffix of ["-wal", "-shm"]) {
    const p = dbPath + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  fs.copyFileSync(sourcePath, dbPath);
  reopenDatabase();

  return {
    safetyBackup: safety.filename,
    restoredAt: new Date().toISOString(),
  };
}

export async function restoreFromUploadedBuffer(buffer, originalName = "upload.db") {
  if (!buffer?.length) throw new Error("Empty file");
  if (buffer.length < 100) throw new Error("File is too small to be a database");

  const tmp = path.join(os.tmpdir(), `yova-restore-${randomUUID()}.db`);
  fs.writeFileSync(tmp, buffer);
  try {
    if (!isSqliteDatabase(tmp)) {
      throw new Error(`“${originalName}” is not a valid SQLite database`);
    }
    return await restoreDatabase(tmp);
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}

export function setBackupDirectory(backupDirectory) {
  if (!backupDirectory?.trim()) {
    throw new Error("Backup directory is required");
  }
  const resolved = path.resolve(backupDirectory.trim());
  ensureDirectory(resolved);
  return saveBackupSettings({ backupDirectory: resolved });
}
