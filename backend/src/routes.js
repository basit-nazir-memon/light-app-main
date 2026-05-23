import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "./db.js";
import { requireAuth, signToken } from "./middleware/auth.js";
import {
  normalizeQuoteRow,
  serializeQuoteData,
  labourTotalFromLines,
  nextQuoteNumber,
} from "./quote-utils.js";
import {
  normalizeJobRow,
  normalizeInvoiceRow,
  getQuoteJob,
  createJobForQuote,
  createInvoiceForQuote,
  ensureCompletedJobForQuote,
  isAllowedJobTransition,
} from "./quote-actions.js";
import { backupApi } from "./backup-routes.js";
import { buildDashboardPayload } from "./dashboard.js";
import { parseListQuery, paginated, buildLikeClause } from "./pagination.js";
import { validateCustomerContact } from "./customer-validation.js";
import {
  jobBoardFilterClause,
  jobBoardColumnClause,
  COMPLETED_RECENT_LIMIT,
} from "./job-board.js";

function parseJsonCol(row, key) {
  if (!row || row[key] == null) return row;
  try {
    row[key] = JSON.parse(row[key]);
  } catch {
    row[key] = [];
  }
  return row;
}

function mapRows(rows, jsonKeys = []) {
  return rows.map((r) => {
    const copy = { ...r };
    for (const k of jsonKeys) parseJsonCol(copy, k);
    return copy;
  });
}

export const api = Router();

api.post("/auth/login", (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  const user = db
    .prepare("SELECT id, email, password_hash, full_name FROM users WHERE email = ?")
    .get(String(email).toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, email: user.email, full_name: user.full_name },
  });
});

api.get("/auth/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.sub,
      email: req.user.email,
      full_name: req.user.full_name,
    },
  });
});

api.use(requireAuth);

api.use("/backup", backupApi);

api.get("/dashboard", (_req, res) => {
  res.json(buildDashboardPayload(db));
});

api.get("/customers", (req, res) => {
  const { page, limit, search, offset, all } = parseListQuery(req);
  const { clause, params } = buildLikeClause(
    ["name", "phone", "email", "address", "notes"],
    search,
  );
  const where = `WHERE 1=1${clause}`;
  const order = "ORDER BY created_at DESC";
  if (all) {
    const rows = db.prepare(`SELECT * FROM customers ${where} ${order}`).all(...params);
    return res.json(rows);
  }
  const total = db.prepare(`SELECT COUNT(*) AS n FROM customers ${where}`).get(...params).n;
  const rows = db
    .prepare(`SELECT * FROM customers ${where} ${order} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  res.json(paginated(rows, total, page, limit));
});

api.post("/customers", (req, res) => {
  const { name, phone, email, address, notes } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "Name is required" });
  const contactErrors = validateCustomerContact(phone, email);
  if (contactErrors.length) return res.status(400).json({ error: contactErrors[0] });
  const id = randomUUID();
  db.prepare(
    `INSERT INTO customers (id, name, phone, email, address, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, name, phone ?? null, email ?? null, address ?? null, notes ?? null);
  const row = db.prepare("SELECT * FROM customers WHERE id = ?").get(id);
  res.status(201).json(row);
});

api.get("/customers/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

api.patch("/customers/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const { name, phone, email, address, notes } = req.body ?? {};
  if (!name?.trim()) return res.status(400).json({ error: "Name is required" });
  const contactErrors = validateCustomerContact(phone, email);
  if (contactErrors.length) return res.status(400).json({ error: contactErrors[0] });
  db.prepare(
    `UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, notes = ? WHERE id = ?`,
  ).run(
    name.trim(),
    phone ?? null,
    email ?? null,
    address ?? null,
    notes ?? null,
    req.params.id,
  );
  const row = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);
  res.json(row);
});

api.delete("/customers/:id", (req, res) => {
  const r = db.prepare("DELETE FROM customers WHERE id = ?").run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

api.get("/vehicles", (req, res) => {
  const { page, limit, search, offset, all } = parseListQuery(req);
  const fuel = String(req.query.fuel ?? "").trim();
  let fuelClause = "";
  const fuelParams = [];
  if (fuel && fuel !== "all") {
    fuelClause = " AND v.fuel = ?";
    fuelParams.push(fuel);
  }
  const { clause, params: searchParams } = buildLikeClause(
    ["v.reg", "v.make", "v.model", "v.vin", "v.notes", "c.name"],
    search,
  );
  const from = `FROM vehicles v LEFT JOIN customers c ON c.id = v.customer_id`;
  const where = `WHERE 1=1${fuelClause}${clause}`;
  const order = "ORDER BY v.created_at DESC";
  const allParams = [...fuelParams, ...searchParams];
  const select = `SELECT v.*, c.name AS customer_name,
    (SELECT COUNT(*) FROM jobs j WHERE j.vehicle_id = v.id) AS service_count`;
  if (all) {
    const rows = db.prepare(`${select} ${from} ${where} ${order}`).all(...allParams);
    return res.json(rows);
  }
  const total = db.prepare(`SELECT COUNT(*) AS n ${from} ${where}`).get(...allParams).n;
  const rows = db
    .prepare(`${select} ${from} ${where} ${order} LIMIT ? OFFSET ?`)
    .all(...allParams, limit, offset);
  res.json(paginated(rows, total, page, limit));
});

api.get("/vehicles/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

api.post("/vehicles", (req, res) => {
  const v = req.body ?? {};
  if (!v.reg) return res.status(400).json({ error: "Registration is required" });
  const id = randomUUID();
  db.prepare(
    `INSERT INTO vehicles (
      id, customer_id, reg, make, model, year, vin, mileage,
      fuel, transmission, mot_expiry, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    v.customer_id ?? null,
    v.reg,
    v.make ?? null,
    v.model ?? null,
    v.year ?? null,
    v.vin ?? null,
    v.mileage ?? 0,
    v.fuel ?? null,
    v.transmission ?? null,
    v.mot_expiry ?? null,
    v.notes ?? null,
  );
  const row = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id);
  res.status(201).json(row);
});

api.patch("/vehicles/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const v = req.body ?? {};
  if (!v.reg?.trim()) return res.status(400).json({ error: "Registration is required" });
  db.prepare(
    `UPDATE vehicles SET
      customer_id = ?, reg = ?, make = ?, model = ?, year = ?, vin = ?,
      mileage = ?, fuel = ?, transmission = ?, mot_expiry = ?, notes = ?
     WHERE id = ?`,
  ).run(
    v.customer_id ?? null,
    v.reg.trim().toUpperCase(),
    v.make ?? null,
    v.model ?? null,
    v.year ?? null,
    v.vin ?? null,
    v.mileage ?? 0,
    v.fuel ?? null,
    v.transmission ?? null,
    v.mot_expiry ?? null,
    v.notes ?? null,
    req.params.id,
  );
  res.json(db.prepare("SELECT * FROM vehicles WHERE id = ?").get(req.params.id));
});

const JOB_LIST_FROM = `FROM jobs j
  LEFT JOIN vehicles v ON v.id = j.vehicle_id
  LEFT JOIN customers c ON c.id = j.customer_id`;

function jobListSearchClause(search) {
  return buildLikeClause(
    [
      "j.number",
      "j.complaint",
      "j.mechanic",
      "v.reg",
      "v.make",
      "v.model",
      "c.name",
    ],
    search,
  );
}

const JOB_BOARD_SELECT = `SELECT j.*, c.name AS customer_name, v.reg AS vehicle_reg,
  v.make AS vehicle_make, v.model AS vehicle_model, v.year AS vehicle_year`;

api.get("/jobs/board", (_req, res) => {
  const order = "ORDER BY COALESCE(j.completed_at, j.created_at) DESC";
  const join = `FROM jobs j
    LEFT JOIN customers c ON c.id = j.customer_id
    LEFT JOIN vehicles v ON v.id = j.vehicle_id`;
  const created = db
    .prepare(
      `${JOB_BOARD_SELECT} ${join} WHERE ${jobBoardColumnClause("created")} ORDER BY j.created_at DESC`,
    )
    .all()
    .map(normalizeJobRow);
  const workInProgress = db
    .prepare(
      `${JOB_BOARD_SELECT} ${join} WHERE ${jobBoardColumnClause("wip")} ORDER BY j.created_at DESC`,
    )
    .all()
    .map(normalizeJobRow);
  const completedTotal = db
    .prepare(`SELECT COUNT(*) AS n FROM jobs j WHERE ${jobBoardColumnClause("completed")}`)
    .get().n;
  const completedRecent = db
    .prepare(
      `${JOB_BOARD_SELECT} ${join} WHERE ${jobBoardColumnClause("completed")} ${order} LIMIT ?`,
    )
    .all(COMPLETED_RECENT_LIMIT)
    .map(normalizeJobRow);
  res.json({
    created,
    workInProgress,
    completedRecent,
    completedTotal,
    completedLimit: COMPLETED_RECENT_LIMIT,
  });
});

api.get("/jobs", (req, res) => {
  const { page, limit, search, offset, all } = parseListQuery(req);
  const boardStatus = String(req.query.boardStatus ?? req.query.status ?? "").trim().toLowerCase();
  const { clause: statusClause, params: statusParams } = jobBoardFilterClause(boardStatus);
  const { clause: searchClause, params: searchParams } = jobListSearchClause(search);
  const where = `WHERE 1=1${statusClause}${searchClause}`;
  const order = "ORDER BY j.created_at DESC";
  const params = [...statusParams, ...searchParams];
  if (all) {
    const rows = db
      .prepare(`SELECT j.* ${JOB_LIST_FROM} ${where} ${order}`)
      .all(...params)
      .map(normalizeJobRow);
    return res.json(rows);
  }
  const total = db.prepare(`SELECT COUNT(*) AS n ${JOB_LIST_FROM} ${where}`).get(...params).n;
  const rows = db
    .prepare(`SELECT j.* ${JOB_LIST_FROM} ${where} ${order} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset)
    .map(normalizeJobRow);
  res.json(paginated(rows, total, page, limit));
});

api.get("/jobs/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(normalizeJobRow(row));
});

api.post("/jobs", (req, res) => {
  const j = req.body ?? {};
  if (!j.number) return res.status(400).json({ error: "Job number is required" });
  const id = randomUUID();
  const parts = JSON.stringify(j.parts ?? []);
  db.prepare(
    `INSERT INTO jobs (
      id, number, customer_id, vehicle_id, mechanic, complaint, diagnostic,
      parts, labour_hours, labour_rate, mileage, status, eta
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    j.number,
    j.customer_id ?? null,
    j.vehicle_id ?? null,
    j.mechanic ?? null,
    j.complaint ?? null,
    j.diagnostic ?? null,
    parts,
    j.labour_hours ?? 0,
    j.labour_rate ?? 55,
    j.mileage ?? 0,
    j.status ?? "Created",
    j.eta ?? null,
  );
  res.status(201).json(normalizeJobRow(db.prepare("SELECT * FROM jobs WHERE id = ?").get(id)));
});

const JOB_CARD_STATUSES = ["Created", "Work in Progress", "Completed"];

api.patch("/jobs/:id/status", (req, res) => {
  const { status, mechanics } = req.body ?? {};
  if (!status) return res.status(400).json({ error: "Status is required" });
  if (!JOB_CARD_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid job status" });
  }
  if (status === "Completed") {
    return res.status(400).json({
      error: "Use job completion to mark as Completed (creates invoice)",
    });
  }
  const existing = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const from = existing.status ?? "Created";
  if (!isAllowedJobTransition(from, status)) {
    return res.status(400).json({ error: `Cannot change status from ${from} to ${status}` });
  }

  const completedAt =
    status === "Completed"
      ? new Date().toISOString().slice(0, 10)
      : status === "Work in Progress" && from === "Completed"
        ? null
        : existing.completed_at;

  const names = Array.isArray(mechanics) ? mechanics.filter(Boolean) : null;
  if (names) {
    db.prepare(
      "UPDATE jobs SET status = ?, mechanic = ?, mechanics = ?, completed_at = ? WHERE id = ?",
    ).run(status, names.join(", ") || null, JSON.stringify(names), completedAt, req.params.id);
  } else {
    db.prepare("UPDATE jobs SET status = ?, completed_at = ? WHERE id = ?").run(
      status,
      completedAt,
      req.params.id,
    );
  }
  res.json(normalizeJobRow(db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id)));
});

api.post("/jobs/:id/complete-and-invoice", (req, res) => {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Not found" });
  if (!job.quote_id) {
    return res.status(400).json({ error: "Job is not linked to a quotation" });
  }
  const quote = db.prepare("SELECT * FROM quotes WHERE id = ?").get(job.quote_id);
  if (!quote) return res.status(404).json({ error: "Quotation not found" });

  const today = new Date().toISOString().slice(0, 10);
  db.prepare("UPDATE jobs SET status = 'Completed', completed_at = ? WHERE id = ?").run(
    today,
    req.params.id,
  );
  try {
    const invoice = createInvoiceForQuote(db, quote, {
      status: "Unpaid",
      jobId: job.id,
      allowExisting: true,
    });
    res.json({
      job: normalizeJobRow(db.prepare("SELECT * FROM jobs WHERE id = ?").get(job.id)),
      invoice,
    });
  } catch (e) {
    return res.status(e.status ?? 500).json({ error: e.message });
  }
});

const INVOICE_FROM = `FROM invoices i
  LEFT JOIN customers c ON c.id = i.customer_id
  LEFT JOIN vehicles v ON v.id = i.vehicle_id`;

api.get("/invoices/stats", (_req, res) => {
  const rows = db.prepare("SELECT status, parts, labour, labour_lines, vat_rate, discount_type, discount_value FROM invoices").all();
  let total = 0;
  let paid = 0;
  let unpaid = 0;
  let overdue = 0;
  for (const row of rows) {
    const norm = normalizeInvoiceRow(row);
    const partsSub = (norm.parts ?? []).reduce((s, p) => s + p.qty * p.price, 0);
    const labourSub =
      (norm.labourLines ?? []).reduce((s, l) => s + l.amount, 0) || Number(norm.labour ?? 0);
    const sub = partsSub + labourSub;
    const vat = sub * (Number(norm.vatRate ?? 20) / 100);
    const amount = sub + vat;
    total += amount;
    if (row.status === "Paid") paid += amount;
    else unpaid += amount;
    if (row.status === "Overdue") overdue += amount;
  }
  res.json({ total, paid, unpaid, overdue, count: rows.length });
});

api.get("/invoices", (req, res) => {
  const { page, limit, search, offset, all } = parseListQuery(req);
  const status = String(req.query.status ?? "").trim();
  let statusClause = "";
  const statusParams = [];
  if (status && status !== "all") {
    statusClause = " AND i.status = ?";
    statusParams.push(status);
  }
  const { clause: searchClause, params: searchParams } = buildLikeClause(
    ["i.number", "c.name", "v.reg", "v.make", "v.model"],
    search,
  );
  const where = `WHERE 1=1${statusClause}${searchClause}`;
  const order = "ORDER BY i.issued_at DESC";
  const params = [...statusParams, ...searchParams];
  const select = `SELECT i.*, c.name AS customer_name, v.reg AS vehicle_reg, v.make AS vehicle_make, v.model AS vehicle_model`;
  if (all) {
    const rows = db
      .prepare(`${select} ${INVOICE_FROM} ${where} ${order}`)
      .all(...params)
      .map(normalizeInvoiceRow);
    return res.json(rows);
  }
  const total = db.prepare(`SELECT COUNT(*) AS n ${INVOICE_FROM} ${where}`).get(...params).n;
  const rows = db
    .prepare(`${select} ${INVOICE_FROM} ${where} ${order} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset)
    .map(normalizeInvoiceRow);
  res.json(paginated(rows, total, page, limit));
});

api.get("/invoices/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM invoices WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(normalizeInvoiceRow(row));
});

api.patch("/invoices/:id/mark-paid", (req, res) => {
  const row = db.prepare("SELECT * FROM invoices WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  if (row.status === "Paid") {
    return res.status(400).json({ error: "Invoice is already marked as paid" });
  }
  const { payment_date, payment_method } = req.body ?? {};
  const paymentDate = payment_date ?? new Date().toISOString().slice(0, 10);
  db.prepare(
    `UPDATE invoices SET status = 'Paid', payment_date = ?, payment_method = ? WHERE id = ?`,
  ).run(paymentDate, payment_method ?? "Bank Transfer", req.params.id);
  res.json(
    normalizeInvoiceRow(db.prepare("SELECT * FROM invoices WHERE id = ?").get(req.params.id)),
  );
});

api.post("/invoices", (req, res) => {
  const i = req.body ?? {};
  if (!i.number) return res.status(400).json({ error: "Invoice number is required" });
  const id = randomUUID();
  const parts = JSON.stringify(i.parts ?? []);
  db.prepare(
    `INSERT INTO invoices (
      id, number, customer_id, vehicle_id, job_id, parts, labour, vat_rate,
      status, payment_method, due_date, issued_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    i.number,
    i.customer_id ?? null,
    i.vehicle_id ?? null,
    i.job_id ?? null,
    parts,
    i.labour ?? 0,
    i.vat_rate ?? 20,
    i.status ?? "Unpaid",
    i.payment_method ?? null,
    i.due_date ?? null,
    i.issued_at ?? new Date().toISOString().slice(0, 10),
  );
  res.status(201).json(
    normalizeInvoiceRow(db.prepare("SELECT * FROM invoices WHERE id = ?").get(id)),
  );
});

api.get("/quotes/next-number", (_req, res) => {
  res.json({ number: nextQuoteNumber(db) });
});

const QUOTE_FROM = `FROM quotes q
  LEFT JOIN customers c ON c.id = q.customer_id
  LEFT JOIN vehicles v ON v.id = q.vehicle_id`;

api.get("/quotes", (req, res) => {
  const { page, limit, search, offset, all } = parseListQuery(req);
  const status = String(req.query.status ?? "").trim();
  let statusClause = "";
  const statusParams = [];
  if (status && status !== "all") {
    statusClause = " AND q.status = ?";
    statusParams.push(status);
  }
  const { clause: searchClause, params: searchParams } = buildLikeClause(
    ["q.number", "c.name", "v.reg", "v.make", "v.model"],
    search,
  );
  const where = `WHERE 1=1${statusClause}${searchClause}`;
  const order = "ORDER BY q.created_at DESC";
  const params = [...statusParams, ...searchParams];
  const select = `SELECT q.*, c.name AS customer_name, v.reg AS vehicle_reg, v.make AS vehicle_make, v.model AS vehicle_model`;
  if (all) {
    const rows = db
      .prepare(`${select} ${QUOTE_FROM} ${where} ${order}`)
      .all(...params)
      .map(normalizeQuoteRow);
    return res.json(rows);
  }
  const total = db.prepare(`SELECT COUNT(*) AS n ${QUOTE_FROM} ${where}`).get(...params).n;
  const rows = db
    .prepare(`${select} ${QUOTE_FROM} ${where} ${order} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset)
    .map(normalizeQuoteRow);
  res.json(paginated(rows, total, page, limit));
});

api.get("/quotes/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM quotes WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(normalizeQuoteRow(row));
});

api.post("/quotes", (req, res) => {
  const q = req.body ?? {};
  const partsLines = q.parts_lines ?? [];
  const labourLines = q.labour_lines ?? [];
  const labour = labourTotalFromLines(labourLines);
  const number = nextQuoteNumber(db);
  const id = randomUUID();
  const partsJson = serializeQuoteData(partsLines, labourLines);
  db.prepare(
    `INSERT INTO quotes (
      id, number, customer_id, vehicle_id, parts, labour, vat_rate,
      valid_until, status, notes, warranty, discount_type, discount_value
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    number,
    q.customer_id ?? null,
    q.vehicle_id ?? null,
    partsJson,
    labour,
    q.vat_rate ?? 20,
    q.valid_until ?? null,
    q.status ?? "Draft",
    q.notes ?? null,
    q.warranty ?? null,
    q.discount_type ?? "none",
    Number(q.discount_value ?? 0),
  );
  res.status(201).json(normalizeQuoteRow(db.prepare("SELECT * FROM quotes WHERE id = ?").get(id)));
});

api.patch("/quotes/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM quotes WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const q = req.body ?? {};
  const partsLines = q.parts_lines ?? [];
  const labourLines = q.labour_lines ?? [];
  const labour = labourTotalFromLines(labourLines);
  db.prepare(
    `UPDATE quotes SET
      customer_id = ?, vehicle_id = ?, parts = ?, labour = ?,
      vat_rate = ?, valid_until = ?, status = ?, notes = ?,
      warranty = ?, discount_type = ?, discount_value = ?
     WHERE id = ?`,
  ).run(
    q.customer_id ?? null,
    q.vehicle_id ?? null,
    serializeQuoteData(partsLines, labourLines),
    labour,
    q.vat_rate ?? 20,
    q.valid_until ?? null,
    q.status ?? "Draft",
    q.notes ?? null,
    q.warranty ?? null,
    q.discount_type ?? "none",
    Number(q.discount_value ?? 0),
    req.params.id,
  );
  res.json(normalizeQuoteRow(db.prepare("SELECT * FROM quotes WHERE id = ?").get(req.params.id)));
});

api.get("/quotes/:id/job", (req, res) => {
  const quote = db.prepare("SELECT id FROM quotes WHERE id = ?").get(req.params.id);
  if (!quote) return res.status(404).json({ error: "Not found" });
  const job = getQuoteJob(db, req.params.id);
  res.json(job);
});

api.get("/quotes/:id/invoice", (req, res) => {
  const quote = db.prepare("SELECT id FROM quotes WHERE id = ?").get(req.params.id);
  if (!quote) return res.status(404).json({ error: "Not found" });
  const row = db
    .prepare("SELECT * FROM invoices WHERE quote_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(req.params.id);
  res.json(row ? normalizeInvoiceRow(row) : null);
});

api.post("/quotes/:id/reject", (req, res) => {
  const quote = db.prepare("SELECT * FROM quotes WHERE id = ?").get(req.params.id);
  if (!quote) return res.status(404).json({ error: "Not found" });
  if (quote.status === "Rejected") {
    return res.status(400).json({ error: "Quotation is already rejected" });
  }
  db.prepare("UPDATE quotes SET status = 'Rejected' WHERE id = ?").run(req.params.id);
  res.json(normalizeQuoteRow(db.prepare("SELECT * FROM quotes WHERE id = ?").get(req.params.id)));
});

api.post("/quotes/:id/start-work", (req, res) => {
  const quote = db.prepare("SELECT * FROM quotes WHERE id = ?").get(req.params.id);
  if (!quote) return res.status(404).json({ error: "Not found" });
  if (quote.status === "Rejected") {
    return res.status(400).json({ error: "Cannot start work on a rejected quotation" });
  }
  const mechanics = req.body?.mechanics ?? [];
  if (!mechanics.length) {
    return res.status(400).json({ error: "At least one mechanic is required" });
  }
  try {
    const job = createJobForQuote(db, quote, { status: "Created", mechanics });
    if (quote.status === "Draft") {
      db.prepare("UPDATE quotes SET status = 'Approved' WHERE id = ?").run(quote.id);
    }
    res.status(201).json({
      job,
      quote: normalizeQuoteRow(db.prepare("SELECT * FROM quotes WHERE id = ?").get(quote.id)),
    });
  } catch (e) {
    return res.status(e.status ?? 500).json({ error: e.message });
  }
});

api.post("/quotes/:id/convert-invoice", (req, res) => {
  const quote = db.prepare("SELECT * FROM quotes WHERE id = ?").get(req.params.id);
  if (!quote) return res.status(404).json({ error: "Not found" });
  if (quote.status === "Rejected") {
    return res.status(400).json({ error: "Cannot convert a rejected quotation" });
  }
  const mechanics = req.body?.mechanics ?? [];
  try {
    const job = ensureCompletedJobForQuote(db, quote, mechanics, "Completed");
    const invoice = createInvoiceForQuote(db, quote, {
      status: "Unpaid",
      jobId: job.id,
    });
    res.status(201).json({ job, invoice });
  } catch (e) {
    return res.status(e.status ?? 500).json({ error: e.message });
  }
});

api.post("/quotes/:id/mark-paid", (req, res) => {
  const quote = db.prepare("SELECT * FROM quotes WHERE id = ?").get(req.params.id);
  if (!quote) return res.status(404).json({ error: "Not found" });
  if (quote.status === "Rejected") {
    return res.status(400).json({ error: "Cannot mark a rejected quotation as paid" });
  }
  const paymentDate = req.body?.payment_date ?? new Date().toISOString().slice(0, 10);
  const mechanics = req.body?.mechanics ?? [];
  const paymentMethod = req.body?.payment_method ?? "Bank Transfer";
  try {
    const job = ensureCompletedJobForQuote(db, quote, mechanics, "Completed");
    const invoice = createInvoiceForQuote(db, quote, {
      status: "Paid",
      jobId: job.id,
      paymentDate,
      paymentMethod,
    });
    res.status(201).json({ job, invoice });
  } catch (e) {
    return res.status(e.status ?? 500).json({ error: e.message });
  }
});

const MECH_ORDER =
  "ORDER BY CASE WHEN status = 'Active' THEN 0 ELSE 1 END, name COLLATE NOCASE";

api.get("/mechanics", (req, res) => {
  const filter = String(req.query.status ?? "active").toLowerCase();
  let sql = "SELECT * FROM mechanics";
  if (filter === "active") sql += " WHERE status = 'Active'";
  else if (filter === "left") sql += " WHERE status = 'Left'";
  sql += ` ${MECH_ORDER}`;
  res.json(db.prepare(sql).all());
});

api.get("/mechanics/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM mechanics WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

api.post("/mechanics", (req, res) => {
  const m = req.body ?? {};
  if (!m.name) return res.status(400).json({ error: "Name is required" });
  const id = randomUUID();
  db.prepare(
    `INSERT INTO mechanics (
      id, name, email, phone, role, notes, jobs_completed, rating, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
  ).run(
    id,
    m.name,
    m.email ?? null,
    m.phone ?? null,
    m.role ?? null,
    m.notes ?? null,
    m.jobs_completed ?? 0,
    m.rating ?? 5,
  );
  const row = db.prepare("SELECT * FROM mechanics WHERE id = ?").get(id);
  res.status(201).json(row);
});

api.patch("/mechanics/:id/leave", (req, res) => {
  const { left_date, left_reason } = req.body ?? {};
  if (!left_date) return res.status(400).json({ error: "Leave date is required" });
  if (!left_reason?.trim()) return res.status(400).json({ error: "Leave reason is required" });
  const existing = db.prepare("SELECT status FROM mechanics WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (existing.status === "Left") {
    return res.status(400).json({ error: "Staff member has already left" });
  }
  db.prepare(
    `UPDATE mechanics SET status = 'Left', left_date = ?, left_reason = ? WHERE id = ?`,
  ).run(left_date, left_reason.trim(), req.params.id);
  const row = db.prepare("SELECT * FROM mechanics WHERE id = ?").get(req.params.id);
  res.json(row);
});

api.patch("/mechanics/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM mechanics WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (existing.status === "Left") {
    return res.status(400).json({ error: "Cannot edit staff who have left" });
  }
  const m = req.body ?? {};
  if (!m.name?.trim()) return res.status(400).json({ error: "Name is required" });
  db.prepare(
    `UPDATE mechanics SET
      name = ?, email = ?, phone = ?, role = ?, notes = ?,
      jobs_completed = ?, rating = ?
     WHERE id = ?`,
  ).run(
    m.name.trim(),
    m.email ?? null,
    m.phone ?? null,
    m.role ?? null,
    m.notes ?? null,
    m.jobs_completed ?? existing.jobs_completed,
    m.rating ?? existing.rating,
    req.params.id,
  );
  const row = db.prepare("SELECT * FROM mechanics WHERE id = ?").get(req.params.id);
  res.json(row);
});
