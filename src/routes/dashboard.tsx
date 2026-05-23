import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Users, Car, Wrench, Receipt, FileText, PoundSterling, CheckCircle2, Package,
  Plus, UserPlus, FilePlus2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend, PieChart, Pie, Cell,
} from "recharts";
import { useDashboard } from "@/lib/store";
import { gbp, fmtDate } from "@/lib/currency";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

const tooltipStyle = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "var(--shadow-soft)",
};

const pieColors = [
  "var(--color-chart-3)",
  "var(--color-chart-1)",
  "var(--color-chart-5)",
  "var(--color-chart-4)",
];

function Dashboard() {
  const { data, isLoading, isError, error } = useDashboard();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-muted-foreground">Loading dashboard…</div>
      </AppLayout>
    );
  }

  if (isError || !data) {
    return (
      <AppLayout>
        <div className="p-12 text-center">
          <p className="text-destructive">{error?.message ?? "Could not load dashboard"}</p>
          <p className="text-sm text-muted-foreground mt-2">Ensure the backend is running on port 3001.</p>
        </div>
      </AppLayout>
    );
  }

  const { counts, monthly, sparkline, monthlyRevenue, invoiceStatusBreakdown, mechanicJobs } = data;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Welcome back — here&apos;s what&apos;s happening in the garage today.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/customers"><UserPlus className="size-4 mr-1.5" />Add Customer</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/vehicles"><Car className="size-4 mr-1.5" />Add Vehicle</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/jobs"><Wrench className="size-4 mr-1.5" />New Job Card</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/quotes/new"><FilePlus2 className="size-4 mr-1.5" />New quote</Link>
            </Button>
            <Button asChild size="sm" className="shadow-[var(--shadow-elegant)]">
              <Link to="/invoices"><Plus className="size-4 mr-1.5" />Invoices</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Customers"
            value={String(counts.customers)}
            delta={{ value: "—", up: true }}
            icon={Users}
            spark={sparkline}
          />
          <StatCard
            label="Total Vehicles"
            value={String(counts.vehicles)}
            delta={{ value: "—", up: true }}
            icon={Car}
            spark={sparkline}
          />
          <StatCard
            label="Monthly Income"
            value={gbp(monthly.income)}
            delta={{ value: "—", up: true }}
            icon={PoundSterling}
            spark={sparkline}
            accent="success"
          />
          <StatCard
            label="Parts Sold This Month"
            value={gbp(monthly.partsSold)}
            delta={{ value: "—", up: true }}
            icon={Package}
            spark={sparkline}
            accent="success"
          />
          <StatCard
            label="Pending Invoices"
            value={String(counts.pendingInvoices)}
            delta={{ value: "—", up: false }}
            icon={Receipt}
            spark={sparkline}
            accent="warning"
          />
          <StatCard
            label="Active Jobs"
            value={String(counts.activeJobs)}
            delta={{ value: "—", up: true }}
            icon={Wrench}
            spark={sparkline}
          />
          <StatCard
            label="Completed Jobs"
            value={String(counts.completedJobs)}
            delta={{ value: "—", up: true }}
            icon={CheckCircle2}
            spark={sparkline}
            accent="success"
          />
          <StatCard
            label="Total Quotes"
            value={String(counts.quotes)}
            delta={{ value: "—", up: true }}
            icon={FileText}
            spark={sparkline}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Revenue</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenue}>
                  <defs>
                    <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `£${v}`}
                  />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => gbp(v)} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2.5}
                    fill="url(#gRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Invoice Status</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={invoiceStatusBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {invoiceStatusBreakdown.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Jobs by mechanic</CardTitle>
            <CardDescription>Assigned job cards per active mechanic</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mechanicJobs}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="jobs" fill="var(--color-chart-1)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Invoices</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/invoices">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.recentInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <div className="font-medium text-sm">{inv.number}</div>
                    <div className="text-xs text-muted-foreground">
                      {inv.customerName} · {fmtDate(inv.issuedAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{gbp(inv.total)}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Latest Repair Jobs</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/jobs">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.recentJobs.map((j) => (
                <div
                  key={j.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {j.number} — {j.vehicleLabel}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {j.customerName} · {j.mechanic || "—"}
                    </div>
                  </div>
                  <StatusBadge status={j.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
