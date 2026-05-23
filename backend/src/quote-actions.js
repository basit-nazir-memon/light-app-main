import { randomInt, randomUUID } from "crypto";
import { normalizeQuoteRow, labourTotalFromLines } from "./quote-utils.js";

export function migrateJobStatuses(db) {
  db.prepare(
    `UPDATE jobs SET status = 'Work in Progress' WHERE status = 'In Progress'`,
  ).run();
  db.prepare(
    `UPDATE jobs SET status = 'Created' WHERE status IN ('Pending', 'Diagnosing', 'Waiting for Parts', 'Cancelled')`,
  ).run();
}

export function migrateJobInvoiceLinkColumns(db) {
  const jobCols = db.prepare("PRAGMA table_info(jobs)").all().map((c) => c.name);
  if (!jobCols.includes("quote_id")) {
    db.exec("ALTER TABLE jobs ADD COLUMN quote_id TEXT REFERENCES quotes(id) ON DELETE SET NULL");
  }
  if (!jobCols.includes("mechanics")) {
    db.exec("ALTER TABLE jobs ADD COLUMN mechanics TEXT NOT NULL DEFAULT '[]'");
  }
  if (!jobCols.includes("work_details")) {
    db.exec("ALTER TABLE jobs ADD COLUMN work_details TEXT");
  }
  if (!jobCols.includes("completed_at")) {
    db.exec("ALTER TABLE jobs ADD COLUMN completed_at TEXT");
  }

  const invCols = db.prepare("PRAGMA table_info(invoices)").all().map((c) => c.name);
  if (!invCols.includes("quote_id")) {
    db.exec("ALTER TABLE invoices ADD COLUMN quote_id TEXT REFERENCES quotes(id) ON DELETE SET NULL");
  }
  if (!invCols.includes("payment_date")) {
    db.exec("ALTER TABLE invoices ADD COLUMN payment_date TEXT");
  }
  if (!invCols.includes("discount_type")) {
    db.exec("ALTER TABLE invoices ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'none'");
  }
  if (!invCols.includes("discount_value")) {
    db.exec("ALTER TABLE invoices ADD COLUMN discount_value REAL NOT NULL DEFAULT 0");
  }
  if (!invCols.includes("warranty")) db.exec("ALTER TABLE invoices ADD COLUMN warranty TEXT");
  if (!invCols.includes("notes")) db.exec("ALTER TABLE invoices ADD COLUMN notes TEXT");
  if (!invCols.includes("labour_lines")) {
    db.exec("ALTER TABLE invoices ADD COLUMN labour_lines TEXT NOT NULL DEFAULT '[]'");
  }
}

export function nextJobNumber(db) {
  const year = new Date().getFullYear();
  for (let i = 0; i < 100; i++) {
    const number = `JOB-${year}-${randomInt(100000, 999999)}`;
    if (!db.prepare("SELECT id FROM jobs WHERE number = ?").get(number)) return number;
  }
  return `JOB-${year}-${Date.now().toString().slice(-8)}`;
}

export function nextInvoiceNumber(db) {
  const year = new Date().getFullYear();
  for (let i = 0; i < 100; i++) {
    const number = `INV-${year}-${randomInt(100000, 999999)}`;
    if (!db.prepare("SELECT id FROM invoices WHERE number = ?").get(number)) return number;
  }
  return `INV-${year}-${Date.now().toString().slice(-8)}`;
}

export function buildWorkDetailsFromQuote(quote) {
  return JSON.stringify({
    parts_lines: (quote.parts_lines ?? []).map((p) => ({
      description: p.description ?? "",
      qty: Number(p.qty ?? 1),
    })),
    labour_lines: (quote.labour_lines ?? []).map((l) => ({
      description: l.description ?? "",
      hours: Number(l.hours ?? 0),
      fixedRate: Boolean(l.fixedRate),
    })),
  });
}

export function quoteToInvoicePayload(quote) {
  const parts = (quote.parts_lines ?? [])
    .filter((p) => p.description?.trim())
    .map((p) => ({
      name: p.description,
      qty: Number(p.qty ?? 1),
      price: Number(p.price ?? 0),
    }));
  const labour = labourTotalFromLines(quote.labour_lines);
  const labourLines = (quote.labour_lines ?? []).map((l) => ({
    description: l.description ?? "",
    rate: Number(l.rate ?? 0),
    hours: Number(l.hours ?? 0),
    fixedRate: Boolean(l.fixedRate),
    amount: Number(l.amount ?? 0),
  }));
  return {
    parts,
    labour,
    labour_lines: labourLines,
    vat_rate: Number(quote.vat_rate ?? quote.vatRate ?? 20),
    discount_type: quote.discount_type ?? "none",
    discount_value: Number(quote.discount_value ?? 0),
    warranty: quote.warranty ?? null,
    notes: quote.notes ?? null,
    customer_id: quote.customer_id,
    vehicle_id: quote.vehicle_id,
    quote_id: quote.id,
  };
}

export function getQuoteJob(db, quoteId) {
  const row = db.prepare("SELECT * FROM jobs WHERE quote_id = ? ORDER BY created_at DESC LIMIT 1").get(quoteId);
  if (!row) return null;
  return normalizeJobRow(row);
}

const JOB_CARD_STATUSES = ["Created", "Work in Progress", "Completed"];

export function isAllowedJobTransition(from, to) {
  const f = JOB_CARD_STATUSES.includes(from) ? from : "Created";
  if (f === to) return false;
  if (f === "Created") return to === "Work in Progress";
  if (f === "Work in Progress") return to === "Completed";
  if (f === "Completed") return false;
  return false;
}

export function normalizeJobRow(row) {
  if (!row) return row;
  let mechanics = [];
  try {
    mechanics = JSON.parse(row.mechanics ?? "[]");
  } catch {
    mechanics = row.mechanic ? [row.mechanic] : [];
  }
  let workDetails = null;
  if (row.work_details) {
    try {
      workDetails = JSON.parse(row.work_details);
    } catch {
      workDetails = null;
    }
  }
  let parts = [];
  try {
    parts = JSON.parse(row.parts ?? "[]");
  } catch {
    parts = [];
  }
  return {
    ...row,
    mechanics,
    work_details: workDetails,
    parts,
  };
}

export function normalizeInvoiceRow(row) {
  if (!row) return row;
  let parts = [];
  let labourLines = [];
  try {
    parts = JSON.parse(row.parts ?? "[]");
  } catch {
    parts = [];
  }
  try {
    labourLines = JSON.parse(row.labour_lines ?? "[]");
  } catch {
    labourLines = [];
  }
  return {
    ...row,
    parts,
    labour_lines: labourLines,
  };
}

export function createJobForQuote(db, quoteRow, { status, mechanics }) {
  const quote = normalizeQuoteRow(quoteRow);
  const existing = db.prepare("SELECT id FROM jobs WHERE quote_id = ?").get(quote.id);
  if (existing) {
    const err = new Error("A job card already exists for this quotation");
    err.status = 409;
    throw err;
  }
  const names = Array.isArray(mechanics) ? mechanics.filter(Boolean) : [];
  const id = randomUUID();
  const number = nextJobNumber(db);
  const workDetails = buildWorkDetailsFromQuote(quote);
  const partsJson = JSON.stringify([]);
  db.prepare(
    `INSERT INTO jobs (
      id, number, customer_id, vehicle_id, quote_id, mechanic, mechanics,
      complaint, diagnostic, parts, work_details, labour_hours, labour_rate,
      mileage, status, eta
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    number,
    quote.customer_id,
    quote.vehicle_id,
    quote.id,
    names.join(", ") || null,
    JSON.stringify(names),
    `Work from quotation ${quote.number}`,
    null,
    partsJson,
    workDetails,
    0,
    0,
    0,
    status ?? "Created",
    null,
  );
  return normalizeJobRow(db.prepare("SELECT * FROM jobs WHERE id = ?").get(id));
}

export function getInvoiceForQuote(db, quoteId) {
  const row = db
    .prepare("SELECT * FROM invoices WHERE quote_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(quoteId);
  return row ? normalizeInvoiceRow(row) : null;
}

export function createInvoiceForQuote(db, quoteRow, {
  status = "Unpaid",
  jobId = null,
  paymentDate = null,
  paymentMethod = null,
  allowExisting = false,
}) {
  const quote = normalizeQuoteRow(quoteRow);
  const existingInv = db
    .prepare("SELECT * FROM invoices WHERE quote_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(quote.id);
  if (existingInv) {
    if (allowExisting) return normalizeInvoiceRow(existingInv);
    const err = new Error("An invoice already exists for this quotation");
    err.status = 409;
    throw err;
  }
  const payload = quoteToInvoicePayload(quote);
  const id = randomUUID();
  const number = nextInvoiceNumber(db);
  const issued = paymentDate || new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  db.prepare(
    `INSERT INTO invoices (
      id, number, customer_id, vehicle_id, job_id, quote_id, parts, labour,
      labour_lines, vat_rate, status, payment_method, due_date, issued_at,
      payment_date, discount_type, discount_value, warranty, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    number,
    payload.customer_id,
    payload.vehicle_id,
    jobId,
    quote.id,
    JSON.stringify(payload.parts),
    payload.labour,
    JSON.stringify(payload.labour_lines),
    payload.vat_rate,
    status,
    paymentMethod,
    due,
    issued,
    paymentDate,
    payload.discount_type,
    payload.discount_value,
    payload.warranty,
    payload.notes,
  );
  db.prepare("UPDATE quotes SET status = ? WHERE id = ?").run("Approved", quote.id);
  return normalizeInvoiceRow(db.prepare("SELECT * FROM invoices WHERE id = ?").get(id));
}

export function ensureCompletedJobForQuote(db, quoteRow, mechanics, jobStatus = "Completed") {
  let job = getQuoteJob(db, quoteRow.id);
  const names = Array.isArray(mechanics) ? mechanics.filter(Boolean) : [];
  const completedAt =
    jobStatus === "Completed" ? new Date().toISOString().slice(0, 10) : null;
  if (job) {
    db.prepare(
      `UPDATE jobs SET status = ?, mechanic = ?, mechanics = ?, completed_at = ? WHERE id = ?`,
    ).run(
      jobStatus,
      names.length ? names.join(", ") : job.mechanic,
      JSON.stringify(names.length ? names : job.mechanics ?? []),
      completedAt,
      job.id,
    );
    return normalizeJobRow(db.prepare("SELECT * FROM jobs WHERE id = ?").get(job.id));
  }
  job = createJobForQuote(db, quoteRow, { status: jobStatus, mechanics: names });
  if (jobStatus !== "Created") {
    db.prepare("UPDATE jobs SET status = ?, completed_at = ? WHERE id = ?").run(
      jobStatus,
      completedAt,
      job.id,
    );
    job = normalizeJobRow(db.prepare("SELECT * FROM jobs WHERE id = ?").get(job.id));
  }
  return job;
}
