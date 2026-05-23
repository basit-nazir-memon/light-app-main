import type { Quote, QuotePartLine, QuoteLabourLine, QuoteDiscountType } from "./mockData";
import { calcLabourLineAmount } from "./mockData";

export function emptyPartLine(): QuotePartLine {
  return { description: "", qty: 1, price: 0, amount: 0 };
}

export function emptyLabourLine(): QuoteLabourLine {
  return { description: "", rate: 0, hours: 1, fixedRate: false, amount: 0 };
}

export function syncPartAmount(line: QuotePartLine): QuotePartLine {
  const qty = Number(line.qty) || 0;
  const price = Number(line.price) || 0;
  return { ...line, qty, price, amount: qty * price };
}

export function syncLabourAmount(line: QuoteLabourLine): QuoteLabourLine {
  const rate = Number(line.rate) || 0;
  const hours = Number(line.hours) || 0;
  const fixedRate = Boolean(line.fixedRate);
  return {
    ...line,
    rate,
    hours,
    fixedRate,
    amount: calcLabourLineAmount({ rate, hours, fixedRate }),
  };
}

export type QuotePayload = {
  customerId: string;
  vehicleId: string;
  partsLines: QuotePartLine[];
  labourLines: QuoteLabourLine[];
  vatRate: number;
  validUntil: string;
  status: Quote["status"];
  warranty?: string;
  notes?: string;
  discountType: QuoteDiscountType;
  discountValue: number;
};

export function quotePayloadToApi(q: QuotePayload) {
  return {
    customer_id: q.customerId,
    vehicle_id: q.vehicleId,
    parts_lines: q.partsLines.map(syncPartAmount),
    labour_lines: q.labourLines.map(syncLabourAmount),
    vat_rate: q.vatRate,
    valid_until: q.validUntil || null,
    status: q.status,
    warranty: q.warranty || null,
    notes: q.notes || null,
    discount_type: q.discountType,
    discount_value: q.discountType === "none" ? 0 : q.discountValue,
  };
}

export function quoteToPayload(q: Quote): QuotePayload {
  return {
    customerId: q.customerId,
    vehicleId: q.vehicleId,
    partsLines: q.partsLines,
    labourLines: q.labourLines,
    vatRate: q.vatRate,
    validUntil: q.validUntil,
    status: q.status,
    warranty: q.warranty,
    notes: q.notes,
    discountType: q.discountType,
    discountValue: q.discountValue,
  };
}

export function defaultQuotePayload(): QuotePayload {
  const valid = new Date();
  valid.setDate(valid.getDate() + 14);
  return {
    customerId: "",
    vehicleId: "",
    partsLines: [],
    labourLines: [],
    vatRate: 20,
    validUntil: valid.toISOString().slice(0, 10),
    status: "Draft",
    warranty: "",
    notes: "",
    discountType: "none",
    discountValue: 0,
  };
}
