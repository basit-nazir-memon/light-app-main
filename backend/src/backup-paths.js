import path from "path";
import { getDataDir } from "./db.js";

/** Default backup folder: backend/data/backups */
export function defaultBackupDirectory() {
  return path.join(getDataDir(), "backups");
}

/**
 * Resolve stored backup path (relative to data dir or absolute custom path).
 * Migrates legacy absolute paths that point at this project's data/backups.
 */
export function resolveBackupDirectory(stored) {
  const fallback = defaultBackupDirectory();
  if (!stored || !String(stored).trim()) return fallback;

  const raw = String(stored).trim();
  if (raw === "backups" || raw.startsWith("./") || raw.startsWith(".\\")) {
    const rel = raw.replace(/^\.[/\\]/, "");
    return path.join(getDataDir(), rel);
  }

  if (!path.isAbsolute(raw)) {
    return path.join(getDataDir(), raw);
  }

  const resolved = path.resolve(raw);
  const defaultResolved = path.resolve(fallback);
  if (resolved === defaultResolved) {
    return defaultResolved;
  }

  return resolved;
}

/** Prefer a relative path when the folder lives under backend/data. */
export function normalizeBackupDirectoryForStorage(dir) {
  const resolved = path.resolve(String(dir).trim());
  const dataDir = path.resolve(getDataDir());
  const rel = path.relative(dataDir, resolved);
  if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) {
    return rel.split(path.sep).join("/");
  }
  return resolved;
}
