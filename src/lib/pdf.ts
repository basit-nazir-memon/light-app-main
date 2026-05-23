// Browser-side quotation PDF (print / save as PDF). Always renders in light industrial layout.
import {
  company,
  invoiceTotal,
  calcQuoteTotals,
  type Invoice,
  type Quote,
  type Customer,
  type Vehicle,
} from "@/lib/mockData";
import { gbp, fmtDate } from "@/lib/currency";
import logoUrl from "@/assets/logo.png";

type Doc =
  | { kind: "Invoice"; doc: Invoice; customer?: Customer; vehicle?: Vehicle }
  | { kind: "Quote"; doc: Quote; customer?: Customer; vehicle?: Vehicle };

function renderQuoteLinesHtml(doc: Quote) {
  const partsRows = doc.partsLines
    .filter((p) => p.description?.trim())
    .map(
      (p) => `<tr>
        <td>${esc(p.description)}</td>
        <td class="right">${p.qty}</td>
        <td class="right">${gbp(p.price)}</td>
        <td class="right">${gbp(p.amount)}</td>
      </tr>`,
    )
    .join("");

  const labourRows = doc.labourLines
    .filter((l) => l.description?.trim())
    .map((l) => {
      const detail = l.fixedRate
        ? "Fixed rate"
        : `${gbp(l.rate)}/hr × ${l.hours}h`;
      return `<tr>
        <td>${esc(l.description)}<br/><span style="font-size:11px;color:#64748b">${detail}</span></td>
        <td class="right">${gbp(l.amount)}</td>
      </tr>`;
    })
    .join("");

  return `
    <h4 class="category-heading">Parts &amp; Materials</h4>
    <table class="lines">
      <thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Price</th><th class="right">Amount</th></tr></thead>
      <tbody>${partsRows || '<tr><td colspan="4" class="muted">No parts</td></tr>'}</tbody>
    </table>
    <h4 class="category-heading" style="margin-top:28px">Labour</h4>
    <table class="lines">
      <thead><tr><th>Description</th><th class="right">Amount</th></tr></thead>
      <tbody>${labourRows || '<tr><td colspan="2" class="muted">No labour</td></tr>'}</tbody>
    </table>`;
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderDoc({ kind, doc, customer: cust, vehicle: veh }: Doc) {
  const isQuote = kind === "Quote";
  const quote = isQuote ? (doc as Quote) : null;
  const totals = isQuote && quote ? calcQuoteTotals(quote) : null;
  const invTotals = !isQuote ? invoiceTotal(doc as Invoice) : null;
  const sub = totals?.afterDiscount ?? invTotals!.sub;
  const vat = totals?.vat ?? invTotals!.vat;
  const total = totals?.total ?? invTotals!.total;
  const number = doc.number;
  const issued = "issuedAt" in doc ? doc.issuedAt : doc.createdAt;
  const dueLabel = kind === "Invoice" ? "Due Date" : "Valid Until";
  const dueDate = kind === "Invoice" ? (doc as Invoice).dueDate : (doc as Quote).validUntil;

  const lineItems =
    isQuote && quote
      ? renderQuoteLinesHtml(quote)
      : `<table class="lines">
        <thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Unit</th><th class="right">Amount</th></tr></thead>
        <tbody>
          ${doc.parts.map((p) => `<tr><td>${esc(p.name)}</td><td class="right">${p.qty}</td><td class="right">${gbp(p.price)}</td><td class="right">${gbp(p.qty * p.price)}</td></tr>`).join("")}
          ${doc.labour > 0 ? `<tr><td>Labour</td><td class="right">—</td><td class="right">—</td><td class="right">${gbp(doc.labour)}</td></tr>` : ""}
        </tbody>
      </table>`;

  return `<!doctype html>
<html><head>
<meta charset="utf-8" />
<title>${number} — ${company.name}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, system-ui, sans-serif; color: #0f172a; background: #fff; margin: 0; padding: 0; }
  .page { max-width: 900px; margin: 0 auto; padding: 40px 48px 56px; }
  .top-bar { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #0c4a6e 100%); color: #fff; padding: 28px 48px; display: flex; align-items: center; justify-content: space-between; gap: 32px; }
  .logo-wrap { background: #fff; border-radius: 12px; padding: 12px 16px; min-width: 140px; min-height: 88px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 24px rgba(0,0,0,0.2); }
  .logo-wrap img { max-height: 72px; max-width: 160px; width: auto; height: auto; object-fit: contain; }
  .company-block h1 { font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.02em; }
  .company-block .tag { font-size: 12px; opacity: 0.85; letter-spacing: 0.12em; text-transform: uppercase; }
  .company-block .addr { font-size: 11px; opacity: 0.7; margin-top: 8px; max-width: 280px; line-height: 1.5; }
  .doc-meta { text-align: right; }
  .doc-meta .type { font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; opacity: 0.75; }
  .doc-meta .num { font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 700; margin-top: 6px; color: #7dd3fc; }
  .doc-meta .dates { font-size: 12px; opacity: 0.85; margin-top: 12px; line-height: 1.6; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 32px 0; }
  .panel { border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; background: #f8fafc; }
  .panel h3 { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #64748b; margin: 0 0 10px; font-weight: 700; }
  .panel .name { font-weight: 700; font-size: 15px; }
  .panel .line { font-size: 13px; color: #475569; margin-top: 4px; }
  .category-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 8px; }
  .category-heading { font-family: 'Space Grotesk', sans-serif; font-size: 13px; text-transform: uppercase; letter-spacing: 0.15em; color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 8px; margin: 0 0 16px; }
  .section-block { margin-bottom: 20px; }
  .section-title { font-size: 12px; font-weight: 700; color: #334155; background: #e2e8f0; padding: 6px 10px; border-radius: 4px; margin-bottom: 8px; }
  table.lines { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.lines th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; padding: 8px 6px; border-bottom: 2px solid #cbd5e1; }
  table.lines td { padding: 10px 6px; border-bottom: 1px solid #e2e8f0; }
  .right { text-align: right; }
  .section-sub { text-align: right; font-size: 12px; color: #475569; margin-top: 6px; }
  .category-total { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #94a3b8; }
  .muted { font-size: 13px; color: #94a3b8; font-style: italic; }
  .totals-wrap { display: flex; justify-content: flex-end; margin-top: 32px; }
  .totals { width: 340px; font-size: 14px; border: 2px solid #0f172a; border-radius: 8px; padding: 20px; background: #f8fafc; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; }
  .totals .grand { border-top: 2px solid #0f172a; font-weight: 700; font-size: 20px; padding-top: 12px; margin-top: 8px; color: #1e40af; font-family: 'Space Grotesk', sans-serif; }
  .notes { margin-top: 24px; padding: 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 13px; }
  .signature { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 64px; }
  .signature .line { border-top: 1px solid #0f172a; padding-top: 8px; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }
  .currency-note { font-size: 10px; color: #94a3b8; text-align: right; margin-top: 4px; }
  @media print { .top-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; } body { padding: 0; } .page { padding: 24px; } }
</style>
</head>
<body>
  <div class="top-bar">
    <div style="display:flex;align-items:center;gap:24px;">
      <div class="logo-wrap"><img src="${logoUrl}" alt="${company.name}" /></div>
      <div class="company-block">
        <h1>${company.name}</h1>
        <div class="tag">${company.tagline}</div>
        <div class="addr">${company.address}</div>
      </div>
    </div>
    <div class="doc-meta">
      <div class="type">${kind}</div>
      <div class="num">${number}</div>
      <div class="dates">
        Issued ${fmtDate(issued)}<br/>
        ${dueLabel} ${fmtDate(dueDate)}
      </div>
    </div>
  </div>

  <div class="page">
    <div class="grid2">
      <div class="panel">
        <h3>Customer</h3>
        <div class="name">${esc(cust?.name ?? "—")}</div>
        <div class="line">${esc(cust?.address ?? "")}</div>
        <div class="line">${esc(cust?.email ?? "")}${cust?.phone ? ` · ${esc(cust.phone)}` : ""}</div>
      </div>
      <div class="panel">
        <h3>Vehicle</h3>
        <div class="name">${veh?.year ?? ""} ${esc(veh?.make ?? "")} ${esc(veh?.model ?? "")}</div>
        <div class="line">Reg: ${esc(veh?.reg ?? "—")}${veh?.vin ? ` · VIN: ${esc(veh.vin)}` : ""}</div>
        <div class="line">${(veh?.mileage ?? 0).toLocaleString("en-GB")} miles · ${esc(veh?.fuel ?? "")} · ${esc(veh?.transmission ?? "")}</div>
      </div>
    </div>

    ${lineItems}

    <div class="totals-wrap">
      <div class="totals">
        ${totals ? `<div class="row"><span>Parts subtotal</span><span>${gbp(totals.partsSub)}</span></div>
        <div class="row"><span>Labour subtotal</span><span>${gbp(totals.labourSub)}</span></div>
        <div class="row"><span>Subtotal</span><span>${gbp(totals.sub)}</span></div>
        ${totals.discount > 0 ? `<div class="row"><span>Discount</span><span>-${gbp(totals.discount)}</span></div>` : ""}
        <div class="row"><span>After discount</span><span>${gbp(totals.afterDiscount)}</span></div>` : `<div class="row"><span>Subtotal (ex. VAT)</span><span>${gbp(sub)}</span></div>`}
        <div class="row"><span>VAT (${doc.vatRate}%)</span><span>${gbp(vat)}</span></div>
        <div class="row grand"><span>Total (GBP)</span><span>${gbp(total)}</span></div>
        <div class="currency-note">All amounts in British Pounds (GBP)</div>
      </div>
    </div>

    ${quote?.warranty ? `<div class="notes"><strong>Warranty:</strong> ${esc(quote.warranty)}</div>` : ""}
    ${quote?.notes ? `<div class="notes" style="margin-top:12px"><strong>Notes:</strong> ${esc(quote.notes)}</div>` : ""}

    <div class="signature">
      <div class="line">Authorised signature — ${company.name}</div>
      <div class="line">Customer acceptance</div>
    </div>

    <div class="footer">
      <div>VAT Reg. ${company.vatNumber} · ${company.email} · ${company.phone}</div>
      <div>Document generated ${fmtDate(new Date())}</div>
    </div>
  </div>
</body></html>`;
}

function openPrintWindow(html: string, title: string) {
  const w = window.open("", "_blank");
  if (!w) return null;
  w.document.write(html);
  w.document.close();
  w.document.title = title;
  return w;
}

export function openDocumentPreview(d: Doc) {
  openPrintWindow(renderDoc(d), `${d.doc.number} — ${company.name}`);
}

export function downloadDocumentPdf(d: Doc) {
  const w = openPrintWindow(renderDoc(d), `${d.doc.number} — ${company.name}`);
  if (!w) return;
  setTimeout(() => {
    w.focus();
    w.print();
  }, 500);
}
