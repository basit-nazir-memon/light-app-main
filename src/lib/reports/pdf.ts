import { company } from "@/lib/mockData";
import {
  fetchBusinessSettings,
  defaultBusinessSettings,
  type BusinessSettings,
} from "@/lib/business-settings-api";
import type { ReportAnalytics, KpiRow, SeriesPoint, TableRow } from "./analytics";
import logoUrl from "@/assets/logo.png";

function reportLogoSrc() {
  if (typeof window !== "undefined" && logoUrl.startsWith("/")) {
    return `${window.location.origin}${logoUrl}`;
  }
  return logoUrl;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function gbp(n: number) {
  return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function barChartSvg(
  data: SeriesPoint[],
  opts: { width?: number; height?: number; dual?: boolean; title?: string } = {},
) {
  const w = opts.width ?? 520;
  const h = opts.height ?? 180;
  const pad = { t: 28, r: 16, b: 36, l: 48 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  if (!data.length) {
    return `<svg width="${w}" height="${h}"><text x="${w / 2}" y="${h / 2}" text-anchor="middle" fill="#94a3b8" font-size="12">No data in range</text></svg>`;
  }
  const max = Math.max(...data.flatMap((d) => [d.value, d.value2 ?? 0]), 1);
  const barW = innerW / data.length;
  const bars = data
    .map((d, i) => {
      const x = pad.l + i * barW + barW * 0.15;
      const bw = barW * 0.35;
      const h1 = (d.value / max) * innerH;
      const y1 = pad.t + innerH - h1;
      const h2 = d.value2 != null ? (d.value2 / max) * innerH : 0;
      const y2 = pad.t + innerH - h2;
      const label = esc(d.label.slice(0, 8));
      const lx = pad.l + i * barW + barW / 2;
      return `
        <rect x="${x}" y="${y1}" width="${bw}" height="${h1}" fill="#1e40af" rx="3"/>
        ${d.value2 != null ? `<rect x="${x + bw + 4}" y="${y2}" width="${bw}" height="${h2}" fill="#0ea5e9" rx="3"/>` : ""}
        <text x="${lx}" y="${h - 8}" text-anchor="middle" font-size="9" fill="#64748b">${label}</text>`;
    })
    .join("");
  const title = opts.title ? `<text x="${pad.l}" y="16" font-size="11" font-weight="600" fill="#334155">${esc(opts.title)}</text>` : "";
  const legend = opts.dual
    ? `<g transform="translate(${w - 140}, 8)"><rect width="10" height="10" fill="#1e40af"/><text x="14" y="9" font-size="9" fill="#64748b">Primary</text><rect y="14" width="10" height="10" fill="#0ea5e9"/><text x="14" y="23" font-size="9" fill="#64748b">Secondary</text></g>`
    : "";
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${title}${legend}${bars}</svg>`;
}

function lineChartSvg(data: SeriesPoint[], opts: { width?: number; height?: number; title?: string } = {}) {
  const w = opts.width ?? 520;
  const h = opts.height ?? 160;
  const pad = { t: 24, r: 16, b: 32, l: 44 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  if (!data.length) {
    return `<svg width="${w}" height="${h}"><text x="${w / 2}" y="${h / 2}" text-anchor="middle" fill="#94a3b8" font-size="12">No data</text></svg>`;
  }
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const pts = data
    .map((d, i) => {
      const x = pad.l + (i / Math.max(data.length - 1, 1)) * innerW;
      const y = pad.t + innerH - ((d.value - min) / range) * innerH;
      return `${x},${y}`;
    })
    .join(" ");
  const title = opts.title ? `<text x="${pad.l}" y="14" font-size="11" font-weight="600" fill="#334155">${esc(opts.title)}</text>` : "";
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${title}<polyline fill="none" stroke="#1e40af" stroke-width="2.5" points="${pts}"/>${data.map((d, i) => {
    const x = pad.l + (i / Math.max(data.length - 1, 1)) * innerW;
    const y = pad.t + innerH - ((d.value - min) / range) * innerH;
    return `<circle cx="${x}" cy="${y}" r="4" fill="#1e40af"/>`;
  }).join("")}</svg>`;
}

function pieLegendSvg(data: SeriesPoint[]) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const colors = ["#1e40af", "#0ea5e9", "#38bdf8", "#64748b", "#94a3b8", "#cbd5e1"];
  return `<table class="mini-table"><tbody>${data
    .map(
      (d, i) =>
        `<tr><td><span class="dot" style="background:${colors[i % colors.length]}"></span>${esc(d.label)}</td><td class="right">${d.value} (${Math.round((d.value / total) * 100)}%)</td></tr>`,
    )
    .join("")}</tbody></table>`;
}

function kpiGrid(kpis: KpiRow[]) {
  return `<div class="kpi-grid">${kpis
    .map(
      (k) =>
        `<div class="kpi"><div class="label">${esc(k.label)}</div><div class="val">${esc(k.value)}</div>${k.hint ? `<div class="hint">${esc(k.hint)}</div>` : ""}</div>`,
    )
    .join("")}</div>`;
}

function dataTable(rows: TableRow[], maxRows = 25) {
  if (!rows.length) return "<p class='muted'>No records in selected period.</p>";
  const keys = Object.keys(rows[0]);
  const slice = rows.slice(0, maxRows);
  return `<table><thead><tr>${keys.map((k) => `<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${slice
    .map(
      (r) =>
        `<tr>${keys
          .map((k) => {
            const v = r[k];
            const cls = typeof v === "number" && k.toLowerCase().includes("total") ? "right" : "";
            return `<td class="${cls}">${esc(String(v))}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("")}</tbody></table>${rows.length > maxRows ? `<p class="muted">Showing ${maxRows} of ${rows.length} rows.</p>` : ""}`;
}

const BASE_STYLES = `
@page { margin: 18mm; }
body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 32px; color: #0f172a; background: #fff; max-width: 900px; margin: auto; font-size: 13px; line-height: 1.45; }
h1,h2,h3 { font-family: Georgia, 'Times New Roman', serif; letter-spacing: -0.02em; margin: 0 0 8px; }
.hdr { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 24px; }
.brand-logo { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.brand-logo img { max-height: 56px; max-width: 140px; width: auto; height: auto; object-fit: contain; }
.meta { text-align: right; font-size: 12px; color: #64748b; }
.meta h2 { color: #1e40af; font-size: 20px; }
.section { margin: 28px 0; page-break-inside: avoid; }
.section h3 { font-size: 15px; color: #1e40af; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 16px 0; }
.kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
.kpi .label { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; }
.kpi .val { font-size: 18px; font-weight: 700; color: #1e40af; margin-top: 4px; }
.kpi .hint { font-size: 10px; color: #94a3b8; margin-top: 2px; }
.chart-row { display: flex; flex-wrap: wrap; gap: 16px; margin: 12px 0; }
table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; padding: 8px 6px; border-bottom: 2px solid #e2e8f0; }
td { padding: 8px 6px; border-bottom: 1px solid #f1f5f9; }
.right { text-align: right; }
.muted { color: #94a3b8; font-size: 11px; }
.mini-table td { padding: 4px 8px; border: none; font-size: 11px; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
.sig { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
.sig .line { border-top: 1px solid #0f172a; padding-top: 6px; font-size: 11px; color: #64748b; }
`;

function reportHeader(title: string, rangeLabel: string) {
  const date = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `
<div class="hdr">
  <div style="display:flex;gap:12px;align-items:center;">
    <div class="brand-logo"><img src="${esc(reportLogoSrc())}" alt="${esc(company.name)}" /></div>
    <div>
      <h1 style="margin:0;font-size:22px;">${esc(company.name)}</h1>
      <div style="font-size:11px;color:#64748b;">${esc(company.tagline)}</div>
    </div>
  </div>
  <div class="meta">
    <div style="letter-spacing:.15em;text-transform:uppercase;font-size:10px;">Analytics Report</div>
    <h2>${esc(title)}</h2>
    <div>Period: <strong>${esc(rangeLabel)}</strong></div>
    <div>Generated ${date}</div>
  </div>
</div>`;
}

function reportFooter(footer: BusinessSettings) {
  return `
<div class="sig">
  <div class="line">Prepared by — Yova Auto Management</div>
  <div class="line">Authorised signature</div>
</div>
<div class="footer">
  <div>${esc(company.address)} · VAT ${esc(footer.vatNumber)} · ${esc(footer.email)} · ${esc(footer.phone)}</div>
  <div>© ${new Date().getFullYear()} ${esc(company.name)}</div>
</div>`;
}

async function resolveReportFooter(): Promise<BusinessSettings> {
  try {
    return await fetchBusinessSettings();
  } catch {
    return defaultBusinessSettings();
  }
}

type Section = { title: string; html: string };

function buildSections(reportId: string, a: ReportAnalytics, rangeLabel: string): Section[] {
  const t = a.totals;
  const sections: Section[] = [];

  const financialKpis: KpiRow[] = [
    { label: "Revenue", value: gbp(t.revenue) },
    { label: "Parts sold (cost)", value: gbp(t.partsRevenue) },
    { label: "Labour revenue", value: gbp(t.labourRevenue) },
    { label: "Paid revenue", value: gbp(t.paidRevenue) },
    { label: "Outstanding", value: gbp(t.outstanding) },
    { label: "Avg invoice", value: gbp(t.avgInvoice) },
  ];

  const partsLabourSeries = a.monthlyBreakdown.map((m) => ({
    label: m.label,
    value: m.parts,
    value2: m.labour,
  }));

  if (reportId === "financial-overview") {
    sections.push({
      title: "Executive summary",
      html: kpiGrid(financialKpis),
    });
    sections.push({
      title: "Monthly revenue, parts & labour",
      html: `<div class="chart-row">${barChartSvg(a.monthlyFinancial, { title: "Revenue by month" })}</div>
        <div class="chart-row">${barChartSvg(partsLabourSeries, { dual: true, title: "Parts (blue) vs Labour (cyan)" })}</div>
        <table><thead><tr><th>Month</th><th class="right">Revenue</th><th class="right">Parts</th><th class="right">Labour</th></tr></thead><tbody>
        ${a.monthlyBreakdown.map((m) => `<tr><td>${esc(m.label)}</td><td class="right">${gbp(m.revenue)}</td><td class="right">${gbp(m.parts)}</td><td class="right">${gbp(m.labour)}</td></tr>`).join("")}
        </tbody></table>`,
    });
  }

  if (reportId === "revenue-growth") {
    sections.push({
      title: "Revenue growth trends",
      html: `<div class="chart-row">${lineChartSvg(a.revenueGrowth, { title: "MoM growth %" })}</div>
      <table><thead><tr><th>Month</th><th class="right">Growth %</th></tr></thead><tbody>
      ${a.revenueGrowth.map((m) => `<tr><td>${esc(m.label)}</td><td class="right">${m.value}%</td></tr>`).join("")}
      </tbody></table>`,
    });
  }

  if (reportId === "parts-analysis") {
    sections.push({
      title: "Parts revenue analysis",
      html: `${kpiGrid([{ label: "Parts revenue", value: gbp(t.partsRevenue) }, { label: "Share of revenue", value: t.revenue ? `${Math.round((t.partsRevenue / t.revenue) * 100)}%` : "—" }])}
      <div class="chart-row">${barChartSvg(a.partsVsLabour, { dual: true, title: "Parts vs Labour (recent months)" })}</div>
      <h4 style="font-size:12px;margin:12px 0 6px;">Top parts &amp; materials</h4>
      ${dataTable(a.partsBreakdown)}`,
    });
  }

  if (reportId === "labour-analysis") {
    sections.push({
      title: "Labour revenue analysis",
      html: `${kpiGrid([{ label: "Labour revenue", value: gbp(t.labourRevenue) }, { label: "Share of revenue", value: t.revenue ? `${Math.round((t.labourRevenue / t.revenue) * 100)}%` : "—" }])}
      <h4 style="font-size:12px;margin:12px 0 6px;">Labour line breakdown</h4>
      ${dataTable(a.labourBreakdown)}`,
    });
  }

  if (reportId === "jobs-performance") {
    sections.push({
      title: "Jobs performance",
      html: `${kpiGrid([
        { label: "Total jobs", value: String(t.jobsTotal) },
        { label: "Completed", value: String(t.jobsCompleted) },
        { label: "Completion rate", value: t.jobsTotal ? `${Math.round((t.jobsCompleted / t.jobsTotal) * 100)}%` : "—" },
        { label: "In progress", value: String(t.jobsTotal - t.jobsCompleted) },
      ])}
      <div class="two-col">
        <div><h4 style="font-size:12px;">Status distribution</h4>${pieLegendSvg(a.jobStatus)}</div>
        <div class="chart-row">${barChartSvg(a.jobStatus, { title: "Jobs by status" })}</div>
      </div>
      <h4 style="font-size:12px;margin:16px 0 6px;">Job register</h4>
      ${dataTable(a.jobsDetail, 40)}`,
    });
  }

  if (reportId === "mechanics-performance") {
    sections.push({
      title: "Mechanics performance",
      html: `<div class="chart-row">${barChartSvg(a.mechanicJobs, { title: "Assigned jobs per mechanic" })}</div>
      <table><thead><tr><th>Mechanic</th><th class="right">Assigned jobs</th></tr></thead><tbody>
      ${a.mechanicJobs.map((m) => `<tr><td>${esc(m.label)}</td><td class="right">${m.value}</td></tr>`).join("")}
      </tbody></table>`,
    });
  }

  if (reportId === "invoices-summary") {
    sections.push({
      title: "Invoices summary",
      html: `${kpiGrid([
        { label: "Invoices", value: String(a.invoicesDetail.length) },
        { label: "Outstanding", value: gbp(t.outstanding) },
        { label: "Collected", value: gbp(t.paidRevenue) },
      ])}
      <div class="two-col">
        <div>${pieLegendSvg(a.invoiceStatus)}</div>
        <div class="chart-row">${barChartSvg(a.invoiceStatus, { title: "By status" })}</div>
      </div>
      <h4 style="font-size:12px;margin:16px 0 6px;">Invoice register</h4>
      ${dataTable(a.invoicesDetail, 40)}`,
    });
  }

  if (reportId === "quotes-summary") {
    sections.push({
      title: "Quotations summary",
      html: `${kpiGrid([
        { label: "Quotes", value: String(t.quotesTotal) },
        { label: "Approved", value: String(t.quotesApproved) },
        { label: "Approval rate", value: t.quotesTotal ? `${Math.round((t.quotesApproved / t.quotesTotal) * 100)}%` : "—" },
      ])}
      <div class="two-col">
        <div>${pieLegendSvg(a.quotesByStatus)}</div>
        <div class="chart-row">${barChartSvg(a.quotesByStatus, { title: "Quotes by status" })}</div>
      </div>
      <h4 style="font-size:12px;margin:16px 0 6px;">Quote register</h4>
      ${dataTable(a.quotesDetail, 40)}`,
    });
  }

  if (reportId === "customers-behavior") {
    sections.push({
      title: "Customer behaviour & spend",
      html: `<div class="chart-row">${barChartSvg(a.topCustomers.slice(0, 8), { title: "Top customers by spend" })}</div>
      <h4 style="font-size:12px;margin:12px 0 6px;">Customer activity table</h4>
      ${dataTable(a.customerBehavior)}`,
    });
  }

  if (reportId === "vehicles-analysis") {
    sections.push({
      title: "Customer vehicles",
      html: `<div class="chart-row">${barChartSvg(a.topVehicles.slice(0, 8), { title: "Most serviced registrations" })}</div>
      <table><thead><tr><th>Registration</th><th class="right">Activity score</th></tr></thead><tbody>
      ${a.topVehicles.map((v) => `<tr><td>${esc(v.label)}</td><td class="right">${v.value}</td></tr>`).join("")}
      </tbody></table>`,
    });
  }

  return sections;
}

export function renderReportHtml(
  reportId: string,
  title: string,
  rangeLabel: string,
  analytics: ReportAnalytics,
  footer: BusinessSettings,
) {
  const sections = buildSections(reportId, analytics, rangeLabel);
  const body = sections
    .map((s) => `<div class="section"><h3>${esc(s.title)}</h3>${s.html}</div>`)
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(title)} — ${esc(company.name)}</title>
<style>${BASE_STYLES}</style></head><body>
${reportHeader(title, rangeLabel)}
${body}
${reportFooter(footer)}
</body></html>`;
}

export async function downloadReportPdf(
  reportId: string,
  title: string,
  rangeLabel: string,
  analytics: ReportAnalytics,
) {
  const footer = await resolveReportFooter();
  const html = renderReportHtml(reportId, title, rangeLabel, analytics, footer);
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.document.title = `${title} — ${company.name}`;
  setTimeout(() => {
    w.focus();
    w.print();
  }, 500);
  return true;
}
