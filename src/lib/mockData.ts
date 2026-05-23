// Domain types, helpers and company info for the Yova Auto garage app.
// Live data comes from the local API via src/lib/store.ts.
export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  createdAt: string;
};

export type Vehicle = {
  id: string;
  reg: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  mileage: number;
  fuel: "Petrol" | "Diesel" | "Hybrid" | "Electric";
  transmission: "Manual" | "Automatic";
  customerId: string;
  motExpiry: string;
  notes?: string;
};

export type JobCardStatus = "Created" | "Work in Progress" | "Completed";

/** Job cards use only these three workshop statuses. */
export type JobStatus = JobCardStatus;

export const JOB_CARD_STATUSES: JobCardStatus[] = [
  "Created",
  "Work in Progress",
  "Completed",
];

/** Map legacy DB statuses onto the three job-card statuses. */
export function normalizeJobBoardStatus(status: string): JobCardStatus {
  if (JOB_CARD_STATUSES.includes(status as JobCardStatus)) return status as JobCardStatus;
  if (status === "In Progress") return "Work in Progress";
  if (status === "Completed") return "Completed";
  return "Created";
}

/** Allowed status changes from the current job-card status. */
export function getAllowedJobTransitions(current: JobCardStatus): JobCardStatus[] {
  switch (current) {
    case "Created":
      return ["Work in Progress"];
    case "Work in Progress":
      return ["Completed"];
    case "Completed":
      return [];
    default:
      return [];
  }
}

export function isAllowedJobTransition(from: JobCardStatus, to: JobCardStatus): boolean {
  if (from === to) return false;
  return getAllowedJobTransitions(from).includes(to);
}

export type JobWorkDetails = {
  parts_lines: { description: string; qty: number }[];
  labour_lines: { description: string; hours: number; fixedRate: boolean }[];
};

export type Part = { name: string; qty: number; price: number };

export type QuoteLineItem = { description: string; qty: number; price: number };
export type QuoteLabourItem = { description: string; price: number };
export type QuoteSection<T> = { category: string; items: T[] };

export type QuotePartLine = {
  description: string;
  qty: number;
  price: number;
  amount: number;
};

export type QuoteLabourLine = {
  description: string;
  rate: number;
  hours: number;
  fixedRate: boolean;
  amount: number;
};

export type QuoteDiscountType = "none" | "flat" | "percentage";

export type Job = {
  id: string;
  number: string;
  customerId: string;
  vehicleId: string;
  quoteId?: string;
  mechanic: string;
  mechanics: string[];
  workDetails?: JobWorkDetails;
  complaint: string;
  diagnostic?: string;
  parts: Part[];
  labourHours: number;
  labourRate: number;
  mileage: number;
  status: JobStatus;
  eta: string;
  createdAt: string;
  completedAt?: string;
};

export type InvoiceLabourLine = {
  description: string;
  rate: number;
  hours: number;
  fixedRate: boolean;
  amount: number;
};

export type Invoice = {
  id: string;
  number: string;
  customerId: string;
  vehicleId: string;
  jobId?: string;
  quoteId?: string;
  parts: Part[];
  labourLines: InvoiceLabourLine[];
  labour: number;
  vatRate: number;
  status: "Paid" | "Unpaid" | "Overdue" | "Partial";
  paymentMethod?: "Cash" | "Card" | "Bank Transfer";
  dueDate: string;
  issuedAt: string;
  paymentDate?: string;
  discountType: QuoteDiscountType;
  discountValue: number;
  warranty?: string;
  notes?: string;
};

export type Quote = {
  id: string;
  number: string;
  customerId: string;
  vehicleId: string;
  partsLines: QuotePartLine[];
  labourLines: QuoteLabourLine[];
  /** @deprecated — kept for legacy PDF/helpers */
  partsSections: QuoteSection<QuoteLineItem>[];
  labourSections: QuoteSection<QuoteLabourItem>[];
  parts: Part[];
  labour: number;
  vatRate: number;
  validUntil: string;
  status: "Draft" | "Sent" | "Approved" | "Rejected";
  warranty?: string;
  notes?: string;
  discountType: QuoteDiscountType;
  discountValue: number;
  createdAt: string;
};

export type MechanicStatus = "Active" | "Left";

export type Mechanic = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  notes?: string;
  jobsCompleted: number;
  rating: number;
  status: MechanicStatus;
  leftDate?: string;
  leftReason?: string;
  createdAt: string;
};

export const company = {
  name: "Yova Auto",
  tagline: "Mobile Mechanic Services",
  address: "Unit 4, Industrial Way, Manchester, M40 2RT",
  phone: "+44 161 555 0199",
  email: "hello@yovaauto.co.uk",
  vatNumber: "GB 123 4567 89",
  vatRate: 20,
};

export function quotePartsSubtotal(lines: QuotePartLine[]) {
  return lines.reduce((s, i) => s + (i.amount ?? i.qty * i.price), 0);
}

export function quoteLabourSubtotal(lines: QuoteLabourLine[]) {
  return lines.reduce((s, i) => s + i.amount, 0);
}

export function calcLabourLineAmount(line: Pick<QuoteLabourLine, "rate" | "hours" | "fixedRate">) {
  if (line.fixedRate) return line.rate || 0;
  return (line.rate || 0) * (line.hours || 0);
}

export function calcQuoteTotals(q: Pick<
  Quote,
  "partsLines" | "labourLines" | "vatRate" | "discountType" | "discountValue"
>) {
  const partsSub = quotePartsSubtotal(q.partsLines);
  const labourSub = quoteLabourSubtotal(q.labourLines);
  const sub = partsSub + labourSub;
  let discount = 0;
  if (q.discountType === "flat") discount = q.discountValue || 0;
  if (q.discountType === "percentage") discount = sub * ((q.discountValue || 0) / 100);
  const afterDiscount = Math.max(0, sub - discount);
  const vat = afterDiscount * (q.vatRate / 100);
  const total = afterDiscount + vat;
  return { partsSub, labourSub, sub, discount, afterDiscount, vat, total };
}

export function calcInvoiceTotals(inv: Pick<
  Invoice,
  "parts" | "labour" | "vatRate" | "discountType" | "discountValue"
>) {
  const partsSub = inv.parts.reduce((s, p) => s + p.qty * p.price, 0);
  const sub = partsSub + inv.labour;
  let discount = 0;
  if (inv.discountType === "flat") discount = inv.discountValue || 0;
  if (inv.discountType === "percentage") discount = sub * ((inv.discountValue || 0) / 100);
  const afterDiscount = Math.max(0, sub - discount);
  const vat = afterDiscount * (inv.vatRate / 100);
  return { partsSub, labourSub: inv.labour, sub, discount, afterDiscount, vat, total: afterDiscount + vat };
}

export const invoiceTotal = (doc: Invoice | Quote) => {
  if ("partsLines" in doc) {
    const t = calcQuoteTotals(doc);
    return { sub: t.afterDiscount, vat: t.vat, total: t.total };
  }
  const t = calcInvoiceTotals(doc);
  return { sub: t.afterDiscount, vat: t.vat, total: t.total };
};

export const findCustomer = (list: Customer[], id: string) =>
  list.find((c) => c.id === id);
export const findVehicle = (list: Vehicle[], id: string) =>
  list.find((v) => v.id === id);

// Derived analytics from live data
export function deriveMonthlyRevenue(invoices: Invoice[]) {
  const map = new Map<string, { income: number; expenses: number }>();
  const fmt = new Intl.DateTimeFormat("en-GB", { month: "short" });
  for (const inv of invoices) {
    const d = new Date(inv.issuedAt);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    const entry = map.get(key) ?? { income: 0, expenses: 0 };
    const t = invoiceTotal(inv).total;
    entry.income += t;
    entry.expenses += t * 0.34; // simulated cost ratio
    map.set(key, entry);
  }
  const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-7);
  return sorted.map(([k, v]) => {
    const [y, m] = k.split("-").map(Number);
    return { month: fmt.format(new Date(y, m, 1)), income: Math.round(v.income), expenses: Math.round(v.expenses) };
  });
}

export function deriveInvoiceStatusBreakdown(invoices: Invoice[]) {
  const counts: Record<string, number> = { Paid: 0, Unpaid: 0, Overdue: 0, Partial: 0 };
  for (const i of invoices) counts[i.status] = (counts[i.status] ?? 0) + 1;
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

export function deriveServiceTrends(jobs: Job[]) {
  // Group jobs by ISO week label W1..W6 based on createdAt within last 6 weeks
  const now = Date.now();
  const weeks: { week: string; services: number }[] = Array.from({ length: 6 }, (_, i) => ({
    week: `W${i + 1}`,
    services: 0,
  }));
  for (const j of jobs) {
    const t = new Date(j.createdAt).getTime();
    if (isNaN(t)) continue;
    const diffWeeks = Math.floor((now - t) / (1000 * 60 * 60 * 24 * 7));
    if (diffWeeks >= 0 && diffWeeks < 6) {
      weeks[5 - diffWeeks].services += 1;
    }
  }
  return weeks;
}
