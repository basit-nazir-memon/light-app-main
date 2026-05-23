import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, FileBarChart, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
import { useCustomers, useInvoices, useJobs, useMechanics, useQuotes, useVehicles } from "@/lib/store";
import { gbp } from "@/lib/currency";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  type DateRange,
  type DateRangePreset,
  currentMonthValue,
  monthOptions,
  yearOptions,
} from "@/lib/reports/date-range";
import { filterData, buildAnalytics } from "@/lib/reports/analytics";
import { REPORT_CATALOG, CATEGORY_LABELS, type ReportCategory } from "@/lib/reports/catalog";
import { downloadReportPdf } from "@/lib/reports/pdf";

export const Route = createFileRoute("/reports")({ component: ReportsPage });

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const tooltipStyle = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
};

function ReportsPage() {
  const { data: customers = [] } = useCustomers();
  const { data: invoices = [] } = useInvoices();
  const { data: jobs = [] } = useJobs();
  const { data: quotes = [] } = useQuotes();
  const { data: vehicles = [] } = useVehicles();
  const { data: mechanics = [] } = useMechanics();

  const [preset, setPreset] = useState<DateRangePreset>("all");
  const [month, setMonth] = useState(currentMonthValue());
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [from, setFrom] = useState(currentMonthValue());
  const [to, setTo] = useState(currentMonthValue());
  const [category, setCategory] = useState<ReportCategory | "all">("all");
  const [selectedId, setSelectedId] = useState(REPORT_CATALOG[0].id);

  const dateRange: DateRange = useMemo(
    () => ({ preset, month, year, from, to }),
    [preset, month, year, from, to],
  );

  const filtered = useMemo(
    () =>
      filterData(dateRange, {
        customers,
        vehicles,
        jobs,
        invoices,
        quotes,
        mechanics,
      }),
    [dateRange, customers, vehicles, jobs, invoices, quotes, mechanics],
  );

  const analytics = useMemo(() => buildAnalytics(filtered), [filtered]);

  const selectedReport = REPORT_CATALOG.find((r) => r.id === selectedId) ?? REPORT_CATALOG[0];

  const visibleReports = REPORT_CATALOG.filter(
    (r) => category === "all" || r.category === category,
  );

  const monthlyChart = analytics.monthlyBreakdown.map((m) => ({
    month: m.label,
    revenue: m.revenue,
    parts: m.parts,
    labour: m.labour,
  }));

  const handleDownload = async (reportId: string, title: string) => {
    const ok = await downloadReportPdf(reportId, title, filtered.rangeLabel, analytics);
    if (ok) toast.success(`${title} — open print dialog and choose Save as PDF`);
    else toast.error("Pop-up blocked — allow pop-ups to download PDF");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Reports &amp; Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Detailed tabular and graphical reports — filter by month, year, or custom range, then download PDF.
            </p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Calendar className="size-3.5" />
            {filtered.rangeLabel}
          </Badge>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Date range</CardTitle>
            <CardDescription>Applies to all previews and PDF exports</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label>Period</Label>
              <Select value={preset} onValueChange={(v) => setPreset(v as DateRangePreset)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="month">Single month</SelectItem>
                  <SelectItem value="year">Full year</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {preset === "month" && (
              <div className="space-y-1.5">
                <Label>Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions().map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {preset === "year" && (
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions().map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {preset === "custom" && (
              <>
                <div className="space-y-1.5">
                  <Label>From (YYYY-MM)</Label>
                  <Input type="month" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1.5">
                  <Label>To (YYYY-MM)</Label>
                  <Input type="month" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {analytics.kpis.slice(0, 8).map((k) => (
            <Card key={k.label}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</p>
                <p className="font-display text-xl font-bold mt-1">{k.value}</p>
                {k.hint && <p className="text-xs text-muted-foreground mt-0.5">{k.hint}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(280px,340px)_1fr]">
          <div className="space-y-3">
            <Tabs value={category} onValueChange={(v) => setCategory(v as ReportCategory | "all")}>
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="all">All</TabsTrigger>
                {(Object.keys(CATEGORY_LABELS) as ReportCategory[]).map((c) => (
                  <TabsTrigger key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {visibleReports.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selectedId === r.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <FileBarChart className="size-4 mt-0.5 shrink-0 text-primary" />
                    <div>
                      <div className="font-medium text-sm">{r.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{selectedReport.title}</CardTitle>
                  <CardDescription>{selectedReport.description}</CardDescription>
                </div>
                <Button onClick={() => void handleDownload(selectedReport.id, selectedReport.title)}>
                  <Download className="size-4 mr-2" />
                  Download PDF
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <ReportPreview reportId={selectedReport.id} analytics={analytics} monthlyChart={monthlyChart} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="size-4" />
                  Download all reports
                </CardTitle>
                <CardDescription>Each opens in a new tab — use Print → Save as PDF</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {REPORT_CATALOG.map((r) => (
                  <Button
                    key={r.id}
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDownload(r.id, r.title)}
                  >
                    <Download className="size-3.5 mr-1.5" />
                    {r.title}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

type PreviewProps = {
  reportId: string;
  analytics: ReturnType<typeof buildAnalytics>;
  monthlyChart: { month: string; revenue: number; parts: number; labour: number }[];
};

function ReportPreview({ reportId, analytics, monthlyChart }: PreviewProps) {
  const show = (ids: string[]) => ids.includes(reportId);

  return (
    <div className="space-y-6">
      {show(["financial-overview"]) && (
        <PreviewBlock title="Monthly financial performance">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChart}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => gbp(v)} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="var(--color-chart-1)" fill="var(--color-chart-1)" fillOpacity={0.2} name="Revenue" />
                <Area type="monotone" dataKey="parts" stroke="var(--color-chart-2)" fill="var(--color-chart-2)" fillOpacity={0.15} name="Parts sold (cost)" />
                <Area type="monotone" dataKey="labour" stroke="var(--color-chart-3)" fill="var(--color-chart-3)" fillOpacity={0.15} name="Labour revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <DataTable rows={monthlyChart.map((m) => ({
            Month: m.month,
            Revenue: gbp(m.revenue),
            "Parts sold (cost)": gbp(m.parts),
            "Labour revenue": gbp(m.labour),
          }))} />
        </PreviewBlock>
      )}

      {show(["revenue-growth"]) && (
        <PreviewBlock title="Revenue growth %">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.revenueGrowth.map((d) => ({ month: d.label, growth: d.value }))}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="growth" stroke="var(--color-chart-1)" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </PreviewBlock>
      )}

      {show(["parts-analysis", "labour-analysis"]) && (
        <PreviewBlock title="Parts vs labour (recent months)">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.partsVsLabour.map((d) => ({ month: d.label, parts: d.value, labour: d.value2 ?? 0 }))}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => gbp(v)} />
                <Legend />
                <Bar dataKey="parts" stackId="a" fill="var(--color-chart-1)" name="Parts" />
                <Bar dataKey="labour" stackId="a" fill="var(--color-chart-2)" name="Labour" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {show(["parts-analysis"]) && <DataTable rows={analytics.partsBreakdown.slice(0, 8)} />}
          {show(["labour-analysis"]) && <DataTable rows={analytics.labourBreakdown.slice(0, 8)} />}
        </PreviewBlock>
      )}

      {show(["jobs-performance", "mechanics-performance"]) && (
        <PreviewBlock title="Jobs & mechanics (assigned counts)">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.jobStatus.map((d) => ({ name: d.label, value: d.value }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {analytics.jobStatus.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.mechanicJobs.map((d) => ({ name: d.label, jobs: d.value }))}
                  layout="vertical"
                >
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={72} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="jobs" fill="var(--color-chart-3)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {show(["jobs-performance"]) && <DataTable rows={analytics.jobsDetail.slice(0, 10)} />}
        </PreviewBlock>
      )}

      {show(["invoices-summary", "quotes-summary"]) && (
        <PreviewBlock title="Sales pipeline">
          <div className="grid gap-4 md:grid-cols-2">
            <StatusChart title="Invoices" data={analytics.invoiceStatus} />
            <StatusChart title="Quotes" data={analytics.quotesByStatus} />
          </div>
          {show(["invoices-summary"]) && <DataTable rows={analytics.invoicesDetail.slice(0, 10)} />}
          {show(["quotes-summary"]) && <DataTable rows={analytics.quotesDetail.slice(0, 10)} />}
        </PreviewBlock>
      )}

      {show(["customers-behavior"]) && (
        <PreviewBlock title="Customer behaviour">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.topCustomers.slice(0, 8).map((d) => ({ name: d.label, spend: d.value }))} layout="vertical">
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `£${v}`} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => gbp(v)} />
                <Bar dataKey="spend" fill="var(--color-chart-1)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <DataTable rows={analytics.customerBehavior.slice(0, 10)} />
        </PreviewBlock>
      )}

      {show(["vehicles-analysis"]) && (
        <PreviewBlock title="Customer vehicles">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.topVehicles.slice(0, 8).map((d) => ({ reg: d.label, score: d.value }))}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="reg" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="score" fill="var(--color-chart-4)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PreviewBlock>
      )}
    </div>
  );
}

function PreviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function StatusChart({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  const chartData = data.map((d) => ({ name: d.label, value: d.value }));
  return (
    <div>
      <p className="text-xs font-medium mb-2">{title}</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DataTable({ rows }: { rows: Record<string, string | number>[] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">No data for this period.</p>;
  const keys = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            {keys.map((k) => (
              <th key={k} className="text-left px-3 py-2 font-medium text-muted-foreground">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0">
              {keys.map((k) => (
                <td key={k} className="px-3 py-2">
                  {row[k]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
