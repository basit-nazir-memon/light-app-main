import type { Customer, Invoice, Job, Quote, Vehicle, Mechanic } from "@/lib/mockData";
import {
  calcInvoiceTotals, calcQuoteTotals, invoiceTotal, normalizeJobBoardStatus,
} from "@/lib/mockData";
import { buildMechanicJobStats } from "@/lib/mechanics-stats";
import { inDateRange, monthKey, type DateRange, getRangeBounds } from "./date-range";

export type FilteredData = {
  rangeLabel: string;
  customers: Customer[];
  vehicles: Vehicle[];
  jobs: Job[];
  invoices: Invoice[];
  quotes: Quote[];
  mechanics: Mechanic[];
};

export function filterData(
  range: DateRange,
  raw: {
    customers: Customer[];
    vehicles: Vehicle[];
    jobs: Job[];
    invoices: Invoice[];
    quotes: Quote[];
    mechanics: Mechanic[];
  },
): FilteredData {
  const { start, end, label } = getRangeBounds(range);
  return {
    rangeLabel: label,
    customers: raw.customers,
    vehicles: raw.vehicles,
    jobs: raw.jobs.filter((j) => inDateRange(j.createdAt, start, end)),
    invoices: raw.invoices.filter((i) => inDateRange(i.issuedAt, start, end)),
    quotes: raw.quotes.filter((q) => inDateRange(q.createdAt, start, end)),
    mechanics: raw.mechanics,
  };
}

export type KpiRow = { label: string; value: string; hint?: string };

export type SeriesPoint = { label: string; value: number; value2?: number };

export type MonthlyBreakdown = {
  label: string;
  revenue: number;
  parts: number;
  labour: number;
};

export type TableRow = Record<string, string | number>;

export type ReportAnalytics = {
  kpis: KpiRow[];
  monthlyBreakdown: MonthlyBreakdown[];
  monthlyFinancial: SeriesPoint[];
  revenueGrowth: SeriesPoint[];
  invoiceStatus: SeriesPoint[];
  jobStatus: SeriesPoint[];
  quotesByStatus: SeriesPoint[];
  partsVsLabour: SeriesPoint[];
  topCustomers: SeriesPoint[];
  topVehicles: SeriesPoint[];
  mechanicJobs: SeriesPoint[];
  customerBehavior: TableRow[];
  jobsDetail: TableRow[];
  invoicesDetail: TableRow[];
  quotesDetail: TableRow[];
  partsBreakdown: TableRow[];
  labourBreakdown: TableRow[];
  totals: {
    revenue: number;
    partsRevenue: number;
    labourRevenue: number;
    paidRevenue: number;
    outstanding: number;
    jobsTotal: number;
    jobsCompleted: number;
    quotesTotal: number;
    quotesApproved: number;
    avgInvoice: number;
  };
};

function invoicePartsSub(inv: Invoice) {
  return inv.parts.reduce((s, p) => s + p.qty * p.price, 0);
}

function invoiceLabourSub(inv: Invoice) {
  const lines = inv.labourLines ?? [];
  if (lines.length) return lines.reduce((s, l) => s + l.amount, 0);
  return inv.labour;
}

export function buildAnalytics(data: FilteredData): ReportAnalytics {
  const { invoices, quotes, jobs, customers, vehicles, mechanics } = data;

  let revenue = 0;
  let partsRevenue = 0;
  let labourRevenue = 0;
  let paidRevenue = 0;
  let outstanding = 0;

  const monthlyMap = new Map<string, { revenue: number; parts: number; labour: number }>();

  for (const inv of invoices) {
    const t = calcInvoiceTotals(inv);
    const total = t.total;
    const parts = invoicePartsSub(inv);
    const labour = invoiceLabourSub(inv);
    revenue += total;
    partsRevenue += parts;
    labourRevenue += labour;
    if (inv.status === "Paid") paidRevenue += total;
    else outstanding += total;

    const d = new Date(inv.issuedAt);
    const key = monthKey(d);
    const entry = monthlyMap.get(key) ?? { revenue: 0, parts: 0, labour: 0 };
    entry.revenue += total;
    entry.parts += parts;
    entry.labour += labour;
    monthlyMap.set(key, entry);
  }

  const monthlySorted = [...monthlyMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  const fmtMonth = new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" });

  const monthlyBreakdown: MonthlyBreakdown[] = monthlySorted.map(([k, v]) => {
    const [y, m] = k.split("-").map(Number);
    return {
      label: fmtMonth.format(new Date(y, m - 1, 1)),
      revenue: Math.round(v.revenue),
      parts: Math.round(v.parts),
      labour: Math.round(v.labour),
    };
  });

  const monthlyFinancial: SeriesPoint[] = monthlyBreakdown.map((m) => ({
    label: m.label,
    value: m.revenue,
  }));

  const revenueGrowth: SeriesPoint[] = monthlyBreakdown.map((m, i, arr) => {
    const prev = i > 0 ? arr[i - 1].revenue : 0;
    const growth = prev > 0 ? ((m.revenue - prev) / prev) * 100 : 0;
    return {
      label: m.label,
      value: Math.round(growth * 10) / 10,
    };
  });

  const invoiceStatusMap: Record<string, number> = {};
  for (const inv of invoices) {
    invoiceStatusMap[inv.status] = (invoiceStatusMap[inv.status] ?? 0) + 1;
  }
  const invoiceStatus = Object.entries(invoiceStatusMap).map(([label, value]) => ({ label, value }));

  const jobStatusMap: Record<string, number> = {};
  for (const j of jobs) {
    const s = normalizeJobBoardStatus(j.status);
    jobStatusMap[s] = (jobStatusMap[s] ?? 0) + 1;
  }
  const jobStatus = Object.entries(jobStatusMap).map(([label, value]) => ({ label, value }));

  const quoteStatusMap: Record<string, number> = {};
  for (const q of quotes) {
    quoteStatusMap[q.status] = (quoteStatusMap[q.status] ?? 0) + 1;
  }
  const quotesByStatus = Object.entries(quoteStatusMap).map(([label, value]) => ({ label, value }));

  const partsVsLabour: SeriesPoint[] = monthlyBreakdown.slice(-6).map((m) => ({
    label: m.label,
    value: m.parts,
    value2: m.labour,
  }));

  const custSpend = new Map<string, number>();
  for (const inv of invoices) {
    custSpend.set(inv.customerId, (custSpend.get(inv.customerId) ?? 0) + invoiceTotal(inv).total);
  }
  const topCustomers: SeriesPoint[] = [...custSpend.entries()]
    .map(([id, value]) => ({
      label: customers.find((c) => c.id === id)?.name?.split(" ")[0] ?? "Unknown",
      value: Math.round(value),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const vehCount = new Map<string, number>();
  for (const j of jobs) {
    vehCount.set(j.vehicleId, (vehCount.get(j.vehicleId) ?? 0) + 1);
  }
  for (const inv of invoices) {
    vehCount.set(inv.vehicleId, (vehCount.get(inv.vehicleId) ?? 0) + 0.5);
  }
  const topVehicles: SeriesPoint[] = [...vehCount.entries()]
    .map(([id, value]) => {
      const v = vehicles.find((x) => x.id === id);
      return { label: v ? `${v.reg}` : "—", value: Math.round(value) };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const mechanicJobs: SeriesPoint[] = buildMechanicJobStats(mechanics, jobs, { activeOnly: true })
    .slice(0, 8)
    .map((s) => ({ label: s.shortName, value: s.assignedJobs }));

  const custInvCount = new Map<string, { count: number; total: number; quotes: number }>();
  for (const inv of invoices) {
    const c = custInvCount.get(inv.customerId) ?? { count: 0, total: 0, quotes: 0 };
    c.count++;
    c.total += invoiceTotal(inv).total;
    custInvCount.set(inv.customerId, c);
  }
  for (const q of quotes) {
    const c = custInvCount.get(q.customerId) ?? { count: 0, total: 0, quotes: 0 };
    c.quotes++;
    custInvCount.set(q.customerId, c);
  }

  const customerBehavior: TableRow[] = [...custInvCount.entries()]
    .map(([id, s]) => {
      const c = customers.find((x) => x.id === id);
      return {
        Customer: c?.name ?? "—",
        Invoices: s.count,
        Quotes: s.quotes,
        "Total spend": Math.round(s.total),
        "Avg invoice": s.count ? Math.round(s.total / s.count) : 0,
      };
    })
    .sort((a, b) => Number(b["Total spend"]) - Number(a["Total spend"]))
    .slice(0, 15);

  const jobsDetail: TableRow[] = jobs.map((j) => ({
    "Job #": j.number,
    Status: normalizeJobBoardStatus(j.status),
    Customer: customers.find((c) => c.id === j.customerId)?.name ?? "—",
    Vehicle: vehicles.find((v) => v.id === j.vehicleId)?.reg ?? "—",
    Mechanic: j.mechanics?.join(", ") || j.mechanic || "—",
    Created: j.createdAt.slice(0, 10),
  }));

  const invoicesDetail: TableRow[] = invoices.map((i) => ({
    Invoice: i.number,
    Status: i.status,
    Customer: customers.find((c) => c.id === i.customerId)?.name ?? "—",
    Total: Math.round(invoiceTotal(i).total),
    Issued: i.issuedAt,
    Paid: i.paymentDate ?? "—",
  }));

  const quotesDetail: TableRow[] = quotes.map((q) => ({
    Quote: q.number,
    Status: q.status,
    Customer: customers.find((c) => c.id === q.customerId)?.name ?? "—",
    Total: Math.round(calcQuoteTotals(q).total),
    Created: q.createdAt.slice(0, 10),
  }));

  const partsMap = new Map<string, number>();
  for (const inv of invoices) {
    for (const p of inv.parts) {
      const k = p.name || "Part";
      partsMap.set(k, (partsMap.get(k) ?? 0) + p.qty * p.price);
    }
  }
  for (const q of quotes) {
    for (const p of q.partsLines) {
      if (!p.description?.trim()) continue;
      partsMap.set(p.description, (partsMap.get(p.description) ?? 0) + (p.amount ?? p.qty * p.price));
    }
  }
  const partsBreakdown: TableRow[] = [...partsMap.entries()]
    .map(([name, total]) => ({ Description: name, Revenue: Math.round(total) }))
    .sort((a, b) => Number(b.Revenue) - Number(a.Revenue))
    .slice(0, 20);

  const labourMap = new Map<string, number>();
  for (const inv of invoices) {
    for (const l of inv.labourLines ?? []) {
      if (!l.description?.trim()) continue;
      labourMap.set(l.description, (labourMap.get(l.description) ?? 0) + l.amount);
    }
  }
  if (labourMap.size === 0 && labourRevenue > 0) {
    labourMap.set("Labour (aggregated)", labourRevenue);
  }
  for (const q of quotes) {
    for (const l of q.labourLines) {
      if (!l.description?.trim()) continue;
      labourMap.set(l.description, (labourMap.get(l.description) ?? 0) + l.amount);
    }
  }
  const labourBreakdown: TableRow[] = [...labourMap.entries()]
    .map(([name, total]) => ({ Description: name, Revenue: Math.round(total) }))
    .sort((a, b) => Number(b.Revenue) - Number(a.Revenue))
    .slice(0, 20);

  const jobsCompleted = jobs.filter((j) => normalizeJobBoardStatus(j.status) === "Completed").length;
  const quotesApproved = quotes.filter((q) => q.status === "Approved").length;
  const avgInvoice = invoices.length ? revenue / invoices.length : 0;

  const kpis: KpiRow[] = [
    { label: "Total revenue (Inc. VAT)", value: `£${revenue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}` },
    {
      label: "Parts Revenue",
      value: `£${partsRevenue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`,
      hint: "From invoices in period",
    },
    {
      label: "Labour revenue",
      value: `£${labourRevenue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`,
      hint: "From invoices in period",
    },
    { label: "Outstanding", value: `£${outstanding.toLocaleString("en-GB", { minimumFractionDigits: 2 })}` },
    { label: "Jobs", value: String(jobs.length), hint: `${jobsCompleted} completed` },
    { label: "Quotes", value: String(quotes.length), hint: `${quotesApproved} approved` },
    { label: "Invoices", value: String(invoices.length) },
    { label: "Avg invoice", value: `£${avgInvoice.toFixed(2)}` },
  ];

  return {
    kpis,
    monthlyBreakdown,
    monthlyFinancial,
    revenueGrowth,
    invoiceStatus,
    jobStatus,
    quotesByStatus,
    partsVsLabour,
    topCustomers,
    topVehicles,
    mechanicJobs,
    customerBehavior,
    jobsDetail,
    invoicesDetail,
    quotesDetail,
    partsBreakdown,
    labourBreakdown,
    totals: {
      revenue,
      partsRevenue,
      labourRevenue,
      paidRevenue,
      outstanding,
      jobsTotal: jobs.length,
      jobsCompleted,
      quotesTotal: quotes.length,
      quotesApproved,
      avgInvoice,
    },
  };
}
