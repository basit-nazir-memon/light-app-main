import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Calendar,
  FileBarChart,
  TrendingUp,
  PoundSterling,
  Package,
  Wrench,
  AlertCircle,
  ClipboardList,
  FileText,
  Receipt,
  BarChart3,
  ChevronDown,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useCustomers, useInvoices, useJobs, useMechanics, useQuotes, useVehicles } from "@/lib/store";
import { gbp } from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

const KPI_ICONS: LucideIcon[] = [
  PoundSterling,
  Package,
  Wrench,
  AlertCircle,
  ClipboardList,
  FileText,
  Receipt,
  BarChart3,
];

const REPORT_CATEGORIES: (ReportCategory | "all")[] = [
  "all",
  ...(Object.keys(CATEGORY_LABELS) as ReportCategory[]),
];

const KPI_ACCENTS = [
  "from-emerald-500/20 to-transparent border-emerald-500/30",
  "from-sky-500/20 to-transparent border-sky-500/30",
  "from-violet-500/20 to-transparent border-violet-500/30",
  "from-amber-500/20 to-transparent border-amber-500/30",
  "from-blue-500/20 to-transparent border-blue-500/30",
  "from-cyan-500/20 to-transparent border-cyan-500/30",
  "from-indigo-500/20 to-transparent border-indigo-500/30",
  "from-primary/20 to-transparent border-primary/30",
];

const tooltipStyle = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
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
  const [bulkOpen, setBulkOpen] = useState(false);

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
      <div className="space-y-5 pb-8">
        {/* Hero + compact date toolbar */}
        <section className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-sky-500/8"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />
          <div className="relative p-5 md:p-6 space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="size-4" />
                  <span className="text-xs font-semibold uppercase tracking-widest">Analytics</span>
                </div>
                <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
                  Reports &amp; Analytics
                </h1>
                <p className="text-muted-foreground text-sm max-w-xl">
                  Detailed tabular and graphical reports — filter by period, preview live, then export PDF.
                </p>
              </div>
              <Badge
                variant="secondary"
                className="w-fit shrink-0 gap-1.5 px-3 py-1.5 text-xs font-medium border bg-background/80 backdrop-blur-sm"
              >
                <Calendar className="size-3.5 text-primary" />
                {filtered.rangeLabel}
              </Badge>
            </div>

            <DateRangeToolbar
              preset={preset}
              setPreset={setPreset}
              month={month}
              setMonth={setMonth}
              year={year}
              setYear={setYear}
              from={from}
              setFrom={setFrom}
              to={to}
              setTo={setTo}
            />
          </div>
        </section>

        {/* KPI strip */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
          {analytics.kpis.map((k, i) => (
            <KpiTile key={k.label} kpi={k} icon={KPI_ICONS[i % KPI_ICONS.length]} accent={KPI_ACCENTS[i % KPI_ACCENTS.length]} />
          ))}
        </div>

        {/* Main workspace */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,300px)_1fr] xl:grid-cols-[320px_1fr]">
          <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
            <Card className="overflow-hidden border shadow-sm">
              <CardHeader className="py-3 px-4 bg-muted/30 border-b">
                <CardTitle className="text-sm font-semibold">Report library</CardTitle>
                <CardDescription className="text-xs">Choose a report to preview</CardDescription>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {REPORT_CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors border",
                        category === c
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {c === "all" ? "All" : CATEGORY_LABELS[c]}
                    </button>
                  ))}
                </div>
                <div className="space-y-1 max-h-[min(52vh,520px)] overflow-y-auto pr-0.5 -mr-0.5">
                  {visibleReports.map((r) => {
                    const active = selectedId === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedId(r.id)}
                        className={cn(
                          "w-full text-left rounded-lg px-3 py-2.5 transition-all border",
                          active
                            ? "border-primary/50 bg-primary/8 shadow-[inset_3px_0_0_0] shadow-primary"
                            : "border-transparent hover:bg-muted/60 hover:border-border/60",
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={cn(
                              "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
                              active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                            )}
                          >
                            <FileBarChart className="size-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm leading-tight">{r.title}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                              {r.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </aside>

          <div className="space-y-4 min-w-0">
            <Card className="overflow-hidden border shadow-sm">
              <div className="border-b bg-muted/20 px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                    {CATEGORY_LABELS[selectedReport.category]}
                  </p>
                  <CardTitle className="text-lg md:text-xl">{selectedReport.title}</CardTitle>
                  <CardDescription className="mt-1 text-sm">{selectedReport.description}</CardDescription>
                </div>
                <Button
                  className="shrink-0 shadow-[var(--shadow-elegant)]"
                  onClick={() => void handleDownload(selectedReport.id, selectedReport.title)}
                >
                  <Download className="size-4 mr-2" />
                  Download PDF
                </Button>
              </div>
              <CardContent className="p-5 md:p-6 bg-gradient-to-b from-muted/15 to-transparent">
                <ReportPreview reportId={selectedReport.id} analytics={analytics} monthlyChart={monthlyChart} />
              </CardContent>
            </Card>

            <Collapsible open={bulkOpen} onOpenChange={setBulkOpen}>
              <Card className="border shadow-sm">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp className="size-4 text-primary" />
                      <div>
                        <div className="font-semibold text-sm">Download all reports</div>
                        <div className="text-xs text-muted-foreground">
                          {REPORT_CATALOG.length} PDFs — Print → Save as PDF in each tab
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn("size-4 text-muted-foreground transition-transform", bulkOpen && "rotate-180")}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Separator />
                  <CardContent className="pt-4 pb-4 flex flex-wrap gap-2">
                    {REPORT_CATALOG.map((r) => (
                      <Button
                        key={r.id}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => void handleDownload(r.id, r.title)}
                      >
                        <Download className="size-3 mr-1.5" />
                        {r.title}
                      </Button>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function DateRangeToolbar({
  preset,
  setPreset,
  month,
  setMonth,
  year,
  setYear,
  from,
  setFrom,
  to,
  setTo,
}: {
  preset: DateRangePreset;
  setPreset: (v: DateRangePreset) => void;
  month: string;
  setMonth: (v: string) => void;
  year: string;
  setYear: (v: string) => void;
  from: string;
  setFrom: (v: string) => void;
  to: string;
  setTo: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center rounded-xl border bg-background/70 backdrop-blur-sm px-3 py-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 px-1">
        Period
      </span>
      <ToggleGroup
        type="single"
        value={preset}
        onValueChange={(v) => v && setPreset(v as DateRangePreset)}
        className="flex flex-wrap justify-start gap-0.5"
      >
        <ToggleGroupItem value="all" className="h-8 px-3 text-xs rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          All time
        </ToggleGroupItem>
        <ToggleGroupItem value="month" className="h-8 px-3 text-xs rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          Month
        </ToggleGroupItem>
        <ToggleGroupItem value="year" className="h-8 px-3 text-xs rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          Year
        </ToggleGroupItem>
        <ToggleGroupItem value="custom" className="h-8 px-3 text-xs rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          Custom
        </ToggleGroupItem>
      </ToggleGroup>

      {(preset === "month" || preset === "year" || preset === "custom") && (
        <>
          <Separator orientation="vertical" className="hidden sm:block h-7 mx-1" />
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {preset === "month" && (
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="h-8 w-full sm:w-[180px] text-xs">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions().map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {preset === "year" && (
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-8 w-[100px] text-xs">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions().map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {preset === "custom" && (
              <>
                <Input
                  type="month"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-8 w-[140px] text-xs"
                  aria-label="From month"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="month"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-8 w-[140px] text-xs"
                  aria-label="To month"
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function KpiTile({
  kpi,
  icon: Icon,
  accent,
}: {
  kpi: { label: string; value: string; hint?: string };
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
        "bg-gradient-to-br",
        accent,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-tight">
          {kpi.label}
        </p>
        <Icon className="size-3.5 shrink-0 text-primary/70" />
      </div>
      <p className="font-display text-base sm:text-lg font-bold mt-1.5 tabular-nums leading-none">{kpi.value}</p>
      {kpi.hint && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{kpi.hint}</p>}
    </div>
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
    <div className="space-y-8">
      {show(["financial-overview"]) && (
        <PreviewBlock title="Monthly financial performance">
          <ChartShell height="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChart}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => gbp(v)} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="var(--color-chart-1)" fill="var(--color-chart-1)" fillOpacity={0.25} name="Revenue" />
                <Area type="monotone" dataKey="parts" stroke="var(--color-chart-2)" fill="var(--color-chart-2)" fillOpacity={0.18} name="Parts sold (cost)" />
                <Area type="monotone" dataKey="labour" stroke="var(--color-chart-3)" fill="var(--color-chart-3)" fillOpacity={0.18} name="Labour revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartShell>
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
          <ChartShell height="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.revenueGrowth.map((d) => ({ month: d.label, growth: d.value }))}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="growth" stroke="var(--color-chart-1)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartShell>
        </PreviewBlock>
      )}

      {show(["parts-analysis", "labour-analysis"]) && (
        <PreviewBlock title="Parts vs labour (recent months)">
          <ChartShell height="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.partsVsLabour.map((d) => ({ month: d.label, parts: d.value, labour: d.value2 ?? 0 }))}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => gbp(v)} />
                <Legend />
                <Bar dataKey="parts" stackId="a" fill="var(--color-chart-1)" name="Parts" radius={[0, 0, 0, 0]} />
                <Bar dataKey="labour" stackId="a" fill="var(--color-chart-2)" name="Labour" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>
          {show(["parts-analysis"]) && <DataTable rows={analytics.partsBreakdown.slice(0, 8)} />}
          {show(["labour-analysis"]) && <DataTable rows={analytics.labourBreakdown.slice(0, 8)} />}
        </PreviewBlock>
      )}

      {show(["jobs-performance", "mechanics-performance"]) && (
        <PreviewBlock title="Jobs & mechanics (assigned counts)">
          <div className="grid gap-4 md:grid-cols-2">
            <ChartShell height="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.jobStatus.map((d) => ({ name: d.label, value: d.value }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label>
                    {analytics.jobStatus.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </ChartShell>
            <ChartShell height="h-52">
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
            </ChartShell>
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
          <ChartShell height="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.topCustomers.slice(0, 8).map((d) => ({ name: d.label, spend: d.value }))} layout="vertical">
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `£${v}`} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => gbp(v)} />
                <Bar dataKey="spend" fill="var(--color-chart-1)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>
          <DataTable rows={analytics.customerBehavior.slice(0, 10)} />
        </PreviewBlock>
      )}

      {show(["vehicles-analysis"]) && (
        <PreviewBlock title="Customer vehicles">
          <ChartShell height="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.topVehicles.slice(0, 8).map((d) => ({ reg: d.label, score: d.value }))}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="reg" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="score" fill="var(--color-chart-4)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>
        </PreviewBlock>
      )}
    </div>
  );
}

function PreviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground shrink-0 px-1">
          {title}
        </h3>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function ChartShell({ height, children }: { height: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border bg-card/80 p-3 shadow-inner", height)}>{children}</div>
  );
}

function StatusChart({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  const chartData = data.map((d) => ({ name: d.label, value: d.value }));
  return (
    <div className="rounded-xl border bg-card/80 p-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
      <ChartShell height="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>
    </div>
  );
}

function DataTable({ rows }: { rows: Record<string, string | number>[] }) {
  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6 rounded-xl border border-dashed bg-muted/20">
        No data for this period.
      </p>
    );
  }
  const keys = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {keys.map((k) => (
              <th key={k} className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0 even:bg-muted/20 hover:bg-muted/40 transition-colors">
              {keys.map((k) => (
                <td key={k} className="px-4 py-2.5 tabular-nums">
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
