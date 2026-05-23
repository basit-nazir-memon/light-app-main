import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Plus, Eye, Pencil } from "lucide-react";
import { findCustomer, findVehicle, calcQuoteTotals } from "@/lib/mockData";
import { useQuotes, useCustomers, useVehicles } from "@/lib/store";
import { gbp, fmtDate } from "@/lib/currency";
import { StatusBadge } from "@/components/StatusBadge";
import { downloadDocumentPdf } from "@/lib/pdf";

export const Route = createFileRoute("/quotes/")({ component: QuotesPage });

function QuotesPage() {
  const { data: quotes = [] } = useQuotes();
  const { data: customers = [] } = useCustomers();
  const { data: vehicles = [] } = useVehicles();
  const [q, setQ] = useState("");

  const filtered = quotes.filter((qt) =>
    [qt.number, findCustomer(customers, qt.customerId)?.name].join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Quotes</h1>
            <p className="text-muted-foreground text-sm mt-1">Build, send and convert estimates.</p>
          </div>
          <Button asChild className="shadow-[var(--shadow-elegant)]">
            <Link to="/quotes/new"><Plus className="size-4 mr-2" />New quotation</Link>
          </Button>
        </div>

        <Card className="p-4">
          <div className="relative max-w-sm mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search quotes…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead className="text-right">Total (GBP)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((qt) => {
                const t = calcQuoteTotals(qt);
                const cust = findCustomer(customers, qt.customerId);
                const veh = findVehicle(vehicles, qt.vehicleId);
                return (
                  <TableRow key={qt.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Link
                        to="/quotes/$quoteId"
                        params={{ quoteId: qt.id }}
                        className="font-mono text-sm font-semibold text-primary hover:underline"
                      >
                        {qt.number}
                      </Link>
                    </TableCell>
                    <TableCell>{cust?.name}</TableCell>
                    <TableCell className="text-sm">{veh?.reg} · {veh?.make} {veh?.model}</TableCell>
                    <TableCell className="text-sm">{fmtDate(qt.validUntil)}</TableCell>
                    <TableCell className="text-right">
                      <div className="font-semibold">{gbp(t.total)}</div>
                      <div className="text-xs text-muted-foreground">
                        Parts {gbp(t.partsSub)} · Labour {gbp(t.labourSub)}
                        {t.discount > 0 ? ` · Disc -${gbp(t.discount)}` : ""}
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={qt.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="ghost" asChild>
                          <Link to="/quotes/$quoteId" params={{ quoteId: qt.id }}><Eye className="size-4" /></Link>
                        </Button>
                        <Button size="sm" variant="ghost" asChild>
                          <Link to="/quotes/$quoteId/edit" params={{ quoteId: qt.id }}><Pencil className="size-4" /></Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadDocumentPdf({ kind: "Quote", doc: qt, customer: cust, vehicle: veh })}
                        >
                          <Download className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-sm text-muted-foreground">No quotes yet. Create your first quotation.</div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
