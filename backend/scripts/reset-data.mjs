/**
 * Wipe operational data; keep admin user and business-settings.json.
 * Removes backup snapshot files and clears last-backup timestamp.
 *
 * Stop the API server before running to avoid database lock errors.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "yova-auto.db");
const businessSettingsPath = path.join(dataDir, "business-settings.json");
const backupSettingsPath = path.join(dataDir, "backup-settings.json");

const ADMIN_EMAIL = "admin@yovaauto.co.uk";
const ADMIN_PASSWORD = "admin";
const ADMIN_NAME = "Admin";

const DATA_TABLES = ["invoices", "quotes", "jobs", "vehicles", "customers", "mechanics"];

function removeDirContents(dir) {
  if (!fs.existsSync(dir)) return 0;
  let removed = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      removed += removeDirContents(full);
      fs.rmdirSync(full);
    } else {
      fs.unlinkSync(full);
      removed += 1;
    }
  }
  return removed;
}

function resolveBackupDir(stored) {
  const fallback = path.join(dataDir, "backups");
  if (!stored || !String(stored).trim()) return fallback;
  const raw = String(stored).trim();
  if (!path.isAbsolute(raw)) return path.join(dataDir, raw.replace(/^\.[/\\]/, ""));
  return path.resolve(raw);
}

function loadBackupDir() {
  if (!fs.existsSync(backupSettingsPath)) return path.join(dataDir, "backups");
  try {
    const parsed = JSON.parse(fs.readFileSync(backupSettingsPath, "utf8"));
    return resolveBackupDir(parsed.backupDirectory);
  } catch {
    return path.join(dataDir, "backups");
  }
}

function resetBackupSettings() {
  const backupDirectory = path.join(dataDir, "backups");
  fs.writeFileSync(
    backupSettingsPath,
    JSON.stringify({ backupDirectory: "backups", lastBackupAt: null }, null, 2),
    "utf8",
  );
  return backupDirectory;
}

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found: ${dbPath}`);
  process.exit(1);
}

if (!fs.existsSync(businessSettingsPath)) {
  console.warn(`business-settings.json not found — company PDF footer will use API defaults until saved in Settings.`);
}

let db;
try {
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const wipe = db.transaction(() => {
    for (const table of DATA_TABLES) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
    db.prepare("DELETE FROM users WHERE lower(email) != lower(?)").run(ADMIN_EMAIL);

    const admin = db.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(ADMIN_EMAIL);
    if (!admin) {
      const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
      db.prepare(
        "INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)",
      ).run(randomUUID(), ADMIN_EMAIL, hash, ADMIN_NAME);
      console.log("Created admin user.");
    } else {
      console.log("Kept admin user.");
    }
  });
  wipe();
  db.exec("VACUUM");
} catch (e) {
  console.error("Database reset failed:", e.message);
  console.error("Stop the API server (npm run dev) and run this script again.");
  process.exit(1);
} finally {
  db?.close();
}

const backupDir = resetBackupSettings();
const removedBackups = removeDirContents(backupDir);

// Remove stray .db copies in data folder (exports / safety copies), not the live DB
let removedDbCopies = 0;
for (const name of fs.readdirSync(dataDir)) {
  if (!name.endsWith(".db") || name === "yova-auto.db") continue;
  fs.unlinkSync(path.join(dataDir, name));
  removedDbCopies += 1;
}

console.log("Operational data cleared (customers, vehicles, jobs, quotes, invoices, mechanics).");
console.log(`Company settings preserved: ${businessSettingsPath}`);
console.log(`Removed ${removedBackups} backup file(s) from ${backupDir}`);
if (removedDbCopies) console.log(`Removed ${removedDbCopies} extra database copy/copies in data/.`);
console.log("Done. Restart the API if it was stopped.");
