import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Printer, Eye } from "lucide-react";
import { findCustomer, findVehicle, invoiceTotal } from "@/lib/mockData";
import { useInvoices, useCustomers, useVehicles } from "@/lib/store";
import { gbp, fmtDate } from "@/lib/currency";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadDocumentPdf, openDocumentPreview } from "@/lib/pdf";

export const Route = createFileRoute("/invoices/")({ component: InvoicesPage });

function InvoicesPage() {
  const { data: invoices = [] } = useInvoices();
  const { data: customers = [] } = useCustomers();
  const { data: vehicles = [] } = useVehicles();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "Paid" | "Unpaid" | "Overdue" | "Partial">("all");

  const filtered = invoices.filter((i) =>
    (tab === "all" || i.status === tab) &&
    [i.number, findCustomer(customers, i.customerId)?.name].join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  const stats = {
    total: invoices.reduce((s, i) => s + invoiceTotal(i).total, 0),
    paid: invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + invoiceTotal(i).total, 0),
    unpaid: invoices.filter((i) => i.status !== "Paid").reduce((s, i) => s + invoiceTotal(i).total, 0),
    overdue: invoices.filter((i) => i.status === "Overdue").reduce((s, i) => s + invoiceTotal(i).total, 0),
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Invoices</h1>
            <p className="text-muted-foreground text-sm mt-1">Track payments and generate professional PDF invoices.</p>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total billed", value: gbp(stats.total) },
            { label: "Paid", value: gbp(stats.paid), accent: "text-success" },
            { label: "Outstanding", value: gbp(stats.unpaid), accent: "text-warning" },
            { label: "Overdue", value: gbp(stats.overdue), accent: "text-destructive" },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className={`text-2xl font-display font-bold mt-1 ${s.accent ?? ""}`}>{s.value}</div>
            </Card>
          ))}
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="Paid">Paid</TabsTrigger>
                <TabsTrigger value="Unpaid">Unpaid</TabsTrigger>
                <TabsTrigger value="Overdue">Overdue</TabsTrigger>
                <TabsTrigger value="Partial">Partial</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search invoices…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((i) => {
                const { total } = invoiceTotal(i);
                const cust = findCustomer(customers, i.customerId);
                const veh = findVehicle(vehicles, i.vehicleId);
                return (
                  <TableRow key={i.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm font-semibold text-primary">
                      <Link to="/invoices/$invoiceId" params={{ invoiceId: i.id }} className="hover:underline">
                        {i.number}
                      </Link>
                    </TableCell>
                    <TableCell>{cust?.name}</TableCell>
                    <TableCell className="text-sm">{veh?.reg}</TableCell>
                    <TableCell className="text-sm">{fmtDate(i.issuedAt)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(i.dueDate)}</TableCell>
                    <TableCell className="text-right font-semibold">{gbp(total)}</TableCell>
                    <TableCell><StatusBadge status={i.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button size="icon" variant="ghost" asChild>
                          <Link to="/invoices/$invoiceId" params={{ invoiceId: i.id }}><Eye className="size-4" /></Link>
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => downloadDocumentPdf({ kind: "Invoice", doc: i, customer: cust, vehicle: veh })}><Download className="size-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openDocumentPreview({ kind: "Invoice", doc: i, customer: cust, vehicle: veh })}><Printer className="size-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppLayout>
  );
}
