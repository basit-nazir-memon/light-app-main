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
import {
  fetchBusinessSettings,
  defaultBusinessSettings,
  type BusinessSettings,
} from "@/lib/business-settings-api";
import logoUrl from "@/assets/logo.png";

export type PdfFooterContact = BusinessSettings;

async function resolvePdfFooter(): Promise<PdfFooterContact> {
  try {
    return await fetchBusinessSettings();
  } catch {
    return defaultBusinessSettings();
  }
}

type Doc =
  | { kind: "Invoice"; doc: Invoice; customer?: Customer; vehicle?: Vehicle }
  | { kind: "Quote"; doc: Quote; customer?: Customer; vehicle?: Vehicle };

function renderQuoteLinesHtml(doc: Quote) {
  const partsRows = doc.partsLines
    .filter((p) => p.description?.trim())
    .map(
      (p) => `<tr>
        <td class="desc">${esc(p.description)}</td>
        <td class="num">${p.qty}</td>
        <td class="num">${gbp(p.price)}</td>
        <td class="num">${gbp(p.amount)}</td>
      </tr>`,
    )
    .join("");

  const labourRows = doc.labourLines
    .filter((l) => l.description?.trim())
    .map((l) => {
      const qtyCell = l.fixedRate ? "—" : String(l.hours);
      const priceCell = l.fixedRate ? "Fixed rate" : `${gbp(l.rate)}/hr`;
      return `<tr>
        <td class="desc">${esc(l.description)}</td>
        <td class="num">${qtyCell}</td>
        <td class="num">${priceCell}</td>
        <td class="num">${gbp(l.amount)}</td>
      </tr>`;
    })
    .join("");

  const lineCols = `<colgroup>
    <col class="col-desc" /><col class="col-qty" /><col class="col-price" /><col class="col-amount" />
  </colgroup>`;
  const lineHead = `<thead><tr><th class="desc">Description</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Amount</th></tr></thead>`;

  return `
    <section class="table-section avoid-break">
      <h4 class="category-heading">Parts &amp; Materials</h4>
      <table class="lines">
        ${lineCols}
        ${lineHead}
        <tbody>${partsRows || '<tr><td colspan="4" class="muted">No parts</td></tr>'}</tbody>
      </table>
    </section>
    <section class="table-section">
      <h4 class="category-heading">Labour</h4>
      <table class="lines">
        ${lineCols}
        ${lineHead}
        <tbody>${labourRows || '<tr><td colspan="4" class="muted">No labour</td></tr>'}</tbody>
      </table>
    </section>`;
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderDoc({ kind, doc, customer: cust, vehicle: veh }: Doc, footer: PdfFooterContact) {
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
      : `<section class="table-section">
        <table class="lines">
          <colgroup>
            <col class="col-desc" /><col class="col-qty" /><col class="col-price" /><col class="col-amount" />
          </colgroup>
          <thead><tr><th class="desc">Description</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${doc.parts.map((p) => `<tr><td class="desc">${esc(p.name)}</td><td class="num">${p.qty}</td><td class="num">${gbp(p.price)}</td><td class="num">${gbp(p.qty * p.price)}</td></tr>`).join("")}
            ${doc.labour > 0 ? `<tr><td class="desc">Labour</td><td class="num">—</td><td class="num">—</td><td class="num">${gbp(doc.labour)}</td></tr>` : ""}
          </tbody>
        </table>
      </section>`;

  return `<!doctype html>
<html><head>
<meta charset="utf-8" />
<title>${number} — ${company.name}</title>
<style>
  @page { size: A4; margin: 10mm 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9pt;
    line-height: 1.35;
    color: #0f172a;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .document { max-width: 186mm; margin: 0 auto; }
  .avoid-break { break-inside: avoid; page-break-inside: avoid; }
  .top-bar {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #0c4a6e 100%);
    color: #fff;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .top-bar-inner { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
  .logo-wrap {
    background: #fff;
    border-radius: 4px;
    padding: 4px 8px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .logo-wrap img { display: block; max-height: 36px; max-width: 72px; width: auto; height: auto; object-fit: contain; }
  .company-block { min-width: 0; }
  .company-block h1 { font-size: 11pt; font-weight: 700; margin: 0 0 1px; line-height: 1.2; }
  .company-block .tag { font-size: 6.5pt; opacity: 0.85; letter-spacing: 0.08em; text-transform: uppercase; line-height: 1.2; }
  .company-block .addr { font-size: 6.5pt; opacity: 0.75; margin-top: 2px; line-height: 1.3; }
  .doc-meta { text-align: right; flex-shrink: 0; }
  .doc-meta .type { font-size: 6.5pt; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.8; }
  .doc-meta .num { font-size: 11pt; font-weight: 700; margin-top: 2px; color: #7dd3fc; line-height: 1.2; white-space: nowrap; }
  .doc-meta .dates { font-size: 7pt; opacity: 0.9; margin-top: 3px; line-height: 1.35; white-space: nowrap; }
  .page { padding: 10px 0 0; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 0 10px; }
  .panel {
    border: 1px solid #cbd5e1;
    border-radius: 3px;
    padding: 6px 8px;
    background: #f8fafc;
    line-height: 1.35;
  }
  .panel h3 { font-size: 6.5pt; letter-spacing: 0.1em; text-transform: uppercase; color: #64748b; margin: 0 0 3px; font-weight: 700; }
  .panel .name { font-weight: 700; font-size: 9pt; line-height: 1.25; }
  .panel .line { font-size: 8pt; color: #475569; margin-top: 1px; word-break: break-word; }
  .table-section { margin-bottom: 8px; }
  .category-heading {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #1e40af;
    border-bottom: 1px solid #1e40af;
    padding-bottom: 2px;
    margin: 0 0 4px;
    line-height: 1.2;
  }
  table.lines { width: 100%; border-collapse: collapse; font-size: 8pt; table-layout: fixed; }
  table.lines th,
  table.lines td {
    padding: 3px 4px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
    line-height: 1.3;
  }
  table.lines th {
    font-size: 6.5pt;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #64748b;
    border-bottom: 1px solid #94a3b8;
    line-height: 1.2;
  }
  table.lines th.desc,
  table.lines td.desc {
    text-align: left;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  table.lines th.num,
  table.lines td.num {
    text-align: right;
    white-space: nowrap;
  }
  table.lines col.col-desc { width: 48%; }
  table.lines col.col-qty { width: 10%; }
  table.lines col.col-price { width: 22%; }
  table.lines col.col-amount { width: 20%; }
  .muted { font-size: 8pt; color: #94a3b8; font-style: italic; }
  .totals-wrap { display: flex; justify-content: flex-end; margin-top: 8px; }
  .totals {
    width: 52%;
    max-width: 72mm;
    min-width: 58mm;
    font-size: 8pt;
    border: 1px solid #0f172a;
    border-radius: 3px;
    padding: 6px 8px;
    background: #f8fafc;
  }
  .totals .row { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; line-height: 1.3; }
  .totals .row span:last-child { white-space: nowrap; text-align: right; }
  .totals .grand {
    border-top: 1px solid #0f172a;
    font-weight: 700;
    font-size: 9.5pt;
    padding-top: 4px;
    margin-top: 3px;
    color: #1e40af;
  }
  .currency-note { font-size: 6.5pt; color: #94a3b8; text-align: right; margin-top: 2px; }
  .notes {
    margin-top: 8px;
    padding: 6px 8px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 3px;
    font-size: 8pt;
    line-height: 1.35;
  }
  .notes + .notes { margin-top: 6px; }
  .signature-spacer { height: 2.7em; }
  .signature {
    margin-top: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  .signature .line {
    border-top: 1px solid #0f172a;
    padding-top: 4px;
    font-size: 6.5pt;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .footer {
    margin-top: 12px;
    padding-top: 6px;
    border-top: 1px solid #e2e8f0;
    font-size: 6.5pt;
    color: #64748b;
    display: flex;
    justify-content: space-between;
    gap: 8px;
    line-height: 1.3;
  }
  @media print {
    body { padding: 0; }
    .document { max-width: none; }
    .page { padding-top: 6px; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .top-bar, .grid2, .totals-wrap, .totals, .notes, .signature { break-inside: avoid; page-break-inside: avoid; }
    .table-section.avoid-break { break-inside: avoid; page-break-inside: avoid; }
  }
  @media screen {
    body { padding: 12px; background: #e2e8f0; }
    .document { background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.12); }
  }
</style>
</head>
<body>
  <div class="document">
    <header class="top-bar avoid-break">
      <div class="top-bar-inner">
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
        <div class="dates">Issued ${fmtDate(issued)} · ${dueLabel} ${fmtDate(dueDate)}</div>
      </div>
    </header>

    <main class="page">
      <div class="grid2 avoid-break">
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
          <div class="line">${(veh?.mileage ?? 0).toLocaleString("en-GB")} mi · ${esc(veh?.fuel ?? "")} · ${esc(veh?.transmission ?? "")}</div>
        </div>
      </div>

      ${lineItems}

      <div class="totals-wrap avoid-break">
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

      ${quote?.warranty ? `<div class="notes avoid-break"><strong>Warranty:</strong> ${esc(quote.warranty)}</div>` : ""}
      ${quote?.notes ? `<div class="notes avoid-break"><strong>Notes:</strong> ${esc(quote.notes)}</div>` : ""}

      <div class="signature-spacer" aria-hidden="true"></div>
      <div class="signature avoid-break">
        <div class="line">Authorised signature — ${company.name}</div>
        <div class="line">Customer acceptance</div>
      </div>

      <div class="footer">
        <div>VAT ${esc(footer.vatNumber)} · ${esc(footer.email)} · ${esc(footer.phone)}</div>
        <div>Generated ${fmtDate(new Date())}</div>
      </div>
    </main>
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

export async function openDocumentPreview(d: Doc) {
  const footer = await resolvePdfFooter();
  openPrintWindow(renderDoc(d, footer), `${d.doc.number} — ${company.name}`);
}

function triggerPrint(w: Window) {
  w.focus();
  w.print();
}

export async function downloadDocumentPdf(d: Doc) {
  const footer = await resolvePdfFooter();
  const w = openPrintWindow(renderDoc(d, footer), `${d.doc.number} — ${company.name}`);
  if (!w) return;
  const done = () => triggerPrint(w);
  const img = w.document.querySelector<HTMLImageElement>(".logo-wrap img");
  if (img && !img.complete) {
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
    setTimeout(done, 1200);
  } else {
    setTimeout(done, 350);
  }
}
