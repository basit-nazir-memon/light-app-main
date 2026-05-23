import { labourTotalFromLines } from "./quote-utils.js";

const ACTIVE_JOB_EXCLUDE = new Set(["Completed", "Cancelled"]);

function calcPartsSubtotal(row) {
  let parts = [];
  try {
    parts = JSON.parse(row.parts ?? "[]");
  } catch {
    parts = [];
  }
  return parts.reduce((s, p) => s + Number(p.qty || 0) * Number(p.price || 0), 0);
}

function calcInvoiceTotal(row) {
  const partsSub = calcPartsSubtotal(row);
  let labour = Number(row.labour ?? 0);
  let labourLines = [];
  try {
    labourLines = JSON.parse(row.labour_lines ?? "[]");
  } catch {
    labourLines = [];
  }
  if (labourLines.length) labour = labourTotalFromLines(labourLines);
  const sub = partsSub + labour;
  const vatRate = Number(row.vat_rate ?? 20);
  let discount = 0;
  const dt = row.discount_type ?? "none";
  const dv = Number(row.discount_value ?? 0);
  if (dt === "flat") discount = dv;
  if (dt === "percentage") discount = sub * (dv / 100);
  const afterDiscount = Math.max(0, sub - discount);
  const vat = afterDiscount * (vatRate / 100);
  return Math.round((afterDiscount + vat) * 100) / 100;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;
}

function monthKeyFromIssuedAt(issuedAt) {
  const d = new Date(issuedAt);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
}

function jobMechanicNames(job) {
  const names = new Set();
  try {
    for (const n of JSON.parse(job.mechanics ?? "[]")) {
      const t = String(n ?? "").trim();
      if (t) names.add(t);
    }
  } catch {
    /* ignore */
  }
  const legacy = String(job.mechanic ?? "").trim();
  if (legacy) {
    for (const part of legacy.split(",")) {
      const t = part.trim();
      if (t) names.add(t);
    }
  }
  return names;
}

function isMechanicOnJob(job, mechanicName) {
  const target = mechanicName.trim().toLowerCase();
  if (!target) return false;
  for (const n of jobMechanicNames(job)) {
    if (n.toLowerCase() === target) return true;
  }
  return false;
}

function monthlyRevenueChart(invoiceRows) {
  const map = new Map();
  const fmt = new Intl.DateTimeFormat("en-GB", { month: "short" });
  for (const inv of invoiceRows) {
    const key = monthKeyFromIssuedAt(inv.issued_at);
    if (!key) continue;
    const entry = map.get(key) ?? { revenue: 0 };
    entry.revenue += calcInvoiceTotal(inv);
    map.set(key, entry);
  }
  const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-7);
  return sorted.map(([k, v]) => {
    const [y, m] = k.split("-").map(Number);
    return {
      month: fmt.format(new Date(y, m, 1)),
      revenue: Math.round(v.revenue),
    };
  });
}

function partsSoldThisMonth(invoiceRows) {
  const key = currentMonthKey();
  let total = 0;
  for (const inv of invoiceRows) {
    if (monthKeyFromIssuedAt(inv.issued_at) !== key) continue;
    total += calcPartsSubtotal(inv);
  }
  return Math.round(total * 100) / 100;
}

function invoiceStatusBreakdown(invoiceRows) {
  const counts = { Paid: 0, Unpaid: 0, Overdue: 0, Partial: 0 };
  for (const inv of invoiceRows) {
    const s = inv.status ?? "Unpaid";
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function mechanicJobChart(activeMechanics, jobRows) {
  return activeMechanics
    .map((m) => {
      let assigned = 0;
      let completed = 0;
      for (const j of jobRows) {
        if (!isMechanicOnJob(j, m.name)) continue;
        assigned++;
        if (j.status === "Completed") completed++;
      }
      const shortName = m.name.split(" ")[0] || m.name;
      return { name: shortName, jobs: assigned, completed };
    })
    .sort((a, b) => b.jobs - a.jobs)
    .slice(0, 10);
}

export function buildDashboardPayload(db) {
  const customers = db.prepare("SELECT COUNT(*) AS c FROM customers").get().c;
  const vehicles = db.prepare("SELECT COUNT(*) AS c FROM vehicles").get().c;
  const quotes = db.prepare("SELECT COUNT(*) AS c FROM quotes").get().c;
  const pendingInvoices = db
    .prepare("SELECT COUNT(*) AS c FROM invoices WHERE status != 'Paid'")
    .get().c;

  const jobStatusRows = db.prepare("SELECT status FROM jobs").all();
  let activeJobs = 0;
  let completedJobs = 0;
  for (const { status } of jobStatusRows) {
    if (status === "Completed") completedJobs++;
    if (!ACTIVE_JOB_EXCLUDE.has(status)) activeJobs++;
  }

  const invoiceAggRows = db
    .prepare(
      `SELECT parts, labour, labour_lines, vat_rate, discount_type, discount_value, status, issued_at
       FROM invoices`,
    )
    .all();

  const monthlyRevenue = monthlyRevenueChart(invoiceAggRows);
  const last = monthlyRevenue.at(-1);
  const monthlyIncome = last?.revenue ?? 0;
  const partsSoldMonth = partsSoldThisMonth(invoiceAggRows);

  const recentInvoices = db
    .prepare(
      `SELECT i.id, i.number, i.status, i.issued_at, i.parts, i.labour, i.labour_lines,
              i.vat_rate, i.discount_type, i.discount_value, c.name AS customer_name
       FROM invoices i
       LEFT JOIN customers c ON c.id = i.customer_id
       ORDER BY i.issued_at DESC
       LIMIT 4`,
    )
    .all()
    .map((row) => ({
      id: row.id,
      number: row.number,
      status: row.status,
      issuedAt: row.issued_at,
      customerName: row.customer_name ?? "—",
      total: calcInvoiceTotal(row),
    }));

  const recentJobs = db
    .prepare(
      `SELECT j.id, j.number, j.status, j.mechanic, j.mechanics,
              c.name AS customer_name, v.make, v.model
       FROM jobs j
       LEFT JOIN customers c ON c.id = j.customer_id
       LEFT JOIN vehicles v ON v.id = j.vehicle_id
       ORDER BY j.created_at DESC
       LIMIT 4`,
    )
    .all()
    .map((row) => ({
      id: row.id,
      number: row.number,
      status: row.status,
      customerName: row.customer_name ?? "—",
      vehicleLabel: [row.make, row.model].filter(Boolean).join(" ") || "—",
      mechanic: row.mechanic ?? "",
    }));

  const jobAssignRows = db
    .prepare("SELECT mechanic, mechanics, status FROM jobs")
    .all();
  const activeMechanics = db
    .prepare("SELECT name FROM mechanics WHERE status = 'Active' ORDER BY name")
    .all();

  return {
    counts: {
      customers,
      vehicles,
      quotes,
      pendingInvoices,
      activeJobs,
      completedJobs,
    },
    monthly: {
      income: monthlyIncome,
      partsSold: partsSoldMonth,
    },
    sparkline: monthlyRevenue.length
      ? monthlyRevenue.map((m) => ({ v: m.revenue }))
      : [{ v: 0 }],
    monthlyRevenue,
    invoiceStatusBreakdown: invoiceStatusBreakdown(invoiceAggRows),
    mechanicJobs: mechanicJobChart(activeMechanics, jobAssignRows),
    recentInvoices,
    recentJobs,
  };
}
