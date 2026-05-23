import Database from "better-sqlite3";
import { migrateQuotesColumns } from "./quote-utils.js";
import { migrateJobInvoiceLinkColumns, migrateJobStatuses } from "./quote-actions.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "yova-auto.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export function getDataDir() {
  return dataDir;
}

export function getDbPath() {
  return dbPath;
}

function configureDatabase(connection) {
  connection.pragma("journal_mode = WAL");
  connection.pragma("foreign_keys = ON");
}

export let db = new Database(dbPath);
configureDatabase(db);

/** Re-open SQLite after restore (live binding for route handlers). */
export function reopenDatabase() {
  db = new Database(dbPath);
  configureDatabase(db);
  migrateMechanicsColumns();
  migrateQuotesColumns(db);
  migrateJobInvoiceLinkColumns(db);
  migrateJobStatuses(db);
}

function migrateMechanicsColumns() {
  const cols = db.prepare("PRAGMA table_info(mechanics)").all().map((c) => c.name);
  const add = (sql) => {
    if (!cols.includes(sql.col)) {
      db.exec(`ALTER TABLE mechanics ADD COLUMN ${sql.def}`);
      cols.push(sql.col);
    }
  };
  add({ col: "email", def: "email TEXT" });
  add({ col: "phone", def: "phone TEXT" });
  add({ col: "role", def: "role TEXT" });
  add({ col: "notes", def: "notes TEXT" });
  add({ col: "status", def: "status TEXT NOT NULL DEFAULT 'Active'" });
  add({ col: "left_date", def: "left_date TEXT" });
  add({ col: "left_reason", def: "left_reason TEXT" });
  db.prepare("UPDATE mechanics SET status = 'Active' WHERE status IS NULL").run();
}

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
      reg TEXT NOT NULL,
      make TEXT,
      model TEXT,
      year INTEGER,
      vin TEXT,
      mileage INTEGER DEFAULT 0,
      fuel TEXT,
      transmission TEXT,
      mot_expiry TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mechanics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT,
      notes TEXT,
      jobs_completed INTEGER DEFAULT 0,
      rating REAL DEFAULT 5.0,
      status TEXT NOT NULL DEFAULT 'Active',
      left_date TEXT,
      left_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL UNIQUE,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
      mechanic TEXT,
      complaint TEXT,
      diagnostic TEXT,
      parts TEXT NOT NULL DEFAULT '[]',
      labour_hours REAL DEFAULT 0,
      labour_rate REAL DEFAULT 55,
      mileage INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Created',
      eta TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL UNIQUE,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
      job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
      parts TEXT NOT NULL DEFAULT '[]',
      labour REAL DEFAULT 0,
      vat_rate REAL DEFAULT 20,
      status TEXT NOT NULL DEFAULT 'Unpaid',
      payment_method TEXT,
      due_date TEXT,
      issued_at TEXT NOT NULL DEFAULT (date('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL UNIQUE,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
      parts TEXT NOT NULL DEFAULT '[]',
      labour REAL DEFAULT 0,
      vat_rate REAL DEFAULT 20,
      valid_until TEXT,
      status TEXT NOT NULL DEFAULT 'Draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  migrateMechanicsColumns();
  migrateQuotesColumns(db);
  migrateJobInvoiceLinkColumns(db);
  migrateJobStatuses(db);
}
