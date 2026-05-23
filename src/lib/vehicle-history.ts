import type {
  Job, Invoice, Quote, Part, QuoteLineItem, QuoteSection,
} from "./mockData";
import { invoiceTotal, quotePartsSubtotal } from "./mockData";

export type VehiclePartRecord = {
  id: string;
  date: string;
  source: "Job" | "Invoice" | "Quote";
  reference: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
  category?: string;
};

export function getVehicleJobs(jobs: Job[], vehicleId: string) {
  return jobs
    .filter((j) => j.vehicleId === vehicleId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function getVehicleInvoices(invoices: Invoice[], vehicleId: string) {
  return invoices
    .filter((i) => i.vehicleId === vehicleId)
    .sort((a, b) => String(b.issuedAt).localeCompare(String(a.issuedAt)));
}

export function getVehicleQuotes(quotes: Quote[], vehicleId: string) {
  return quotes
    .filter((q) => q.vehicleId === vehicleId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function partsFromSections(sections: QuoteSection<QuoteLineItem>[]) {
  const out: { description: string; qty: number; price: number; category: string }[] = [];
  for (const sec of sections) {
    for (const item of sec.items) {
      if (!item.description.trim()) continue;
      out.push({
        description: item.description,
        qty: item.qty,
        price: item.price,
        category: sec.category,
      });
    }
  }
  return out;
}

export function getVehiclePartsHistory(
  vehicleId: string,
  jobs: Job[],
  invoices: Invoice[],
  quotes: Quote[],
): VehiclePartRecord[] {
  const records: VehiclePartRecord[] = [];

  for (const j of getVehicleJobs(jobs, vehicleId)) {
    const date = String(j.createdAt).slice(0, 10);
    for (const p of j.parts) {
      if (!p.name?.trim()) continue;
      records.push({
        id: `${j.id}-${p.name}`,
        date,
        source: "Job",
        reference: j.number,
        description: p.name,
        qty: p.qty,
        unitPrice: p.price,
        total: p.qty * p.price,
      });
    }
  }

  for (const inv of getVehicleInvoices(invoices, vehicleId)) {
    for (const p of inv.parts) {
      if (!p.name?.trim()) continue;
      records.push({
        id: `${inv.id}-${p.name}`,
        date: inv.issuedAt,
        source: "Invoice",
        reference: inv.number,
        description: p.name,
        qty: p.qty,
        unitPrice: p.price,
        total: p.qty * p.price,
      });
    }
  }

  for (const q of getVehicleQuotes(quotes, vehicleId)) {
    const date = String(q.createdAt).slice(0, 10);
    for (const p of q.partsLines ?? []) {
      if (!p.description?.trim()) continue;
      records.push({
        id: `${q.id}-${p.description}`,
        date,
        source: "Quote",
        reference: q.number,
        description: p.description,
        qty: p.qty,
        unitPrice: p.price,
        total: p.amount ?? p.qty * p.price,
      });
    }
  }

  return records.sort((a, b) => b.date.localeCompare(a.date));
}

export function vehicleSpendTotal(invoices: Invoice[], vehicleId: string) {
  return getVehicleInvoices(invoices, vehicleId).reduce(
    (s, inv) => s + invoiceTotal(inv).total,
    0,
  );
}

export function vehicleQuotesTotal(quotes: Quote[], vehicleId: string) {
  return getVehicleQuotes(quotes, vehicleId).reduce(
    (s, q) => s + invoiceTotal(q).total,
    0,
  );
}

export function flattenParts(parts: Part[]) {
  return parts.filter((p) => p.name?.trim());
}
