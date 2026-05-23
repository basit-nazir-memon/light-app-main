import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Printer, Eye } from "lucide-react";
import { invoiceTotal } from "@/lib/mockData";
import { useInvoicesList, useInvoiceStats } from "@/lib/store";
import { gbp, fmtDate } from "@/lib/currency";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadDocumentPdf, openDocumentPreview } from "@/lib/pdf";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ListPagination } from "@/components/ListPagination";

export const Route = createFileRoute("/invoices/")({ component: InvoicesPage });

const PAGE_SIZE = 20;

function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "Paid" | "Unpaid" | "Overdue" | "Partial">("all");
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, tab]);

  const { data: stats } = useInvoiceStats();
  const { data, isLoading } = useInvoicesList({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    status: tab === "all" ? undefined : tab,
  });
  const invoices = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Invoices</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track payments and generate professional PDF invoices.
            </p>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total billed", value: gbp(stats?.total ?? 0) },
            { label: "Paid", value: gbp(stats?.paid ?? 0), accent: "text-success" },
            { label: "Outstanding", value: gbp(stats?.unpaid ?? 0), accent: "text-warning" },
            { label: "Overdue", value: gbp(stats?.overdue ?? 0), accent: "text-destructive" },
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
              <Input
                placeholder="Search invoices…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
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
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                invoices.map((i) => {
                  const { total: lineTotal } = invoiceTotal(i);
                  return (
                    <TableRow key={i.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-sm font-semibold text-primary">
                        <Link
                          to="/invoices/$invoiceId"
                          params={{ invoiceId: i.id }}
                          className="hover:underline"
                        >
                          {i.number}
                        </Link>
                      </TableCell>
                      <TableCell>{i.customerName}</TableCell>
                      <TableCell className="text-sm">{i.vehicleReg}</TableCell>
                      <TableCell className="text-sm">{fmtDate(i.issuedAt)}</TableCell>
                      <TableCell className="text-sm">{fmtDate(i.dueDate)}</TableCell>
                      <TableCell className="text-right font-semibold">{gbp(lineTotal)}</TableCell>
                      <TableCell>
                        <StatusBadge status={i.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button size="icon" variant="ghost" asChild>
                            <Link to="/invoices/$invoiceId" params={{ invoiceId: i.id }}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              downloadDocumentPdf({
                                kind: "Invoice",
                                doc: i,
                                customer: i.customerName
                                  ? {
                                      id: i.customerId,
                                      name: i.customerName,
                                      phone: "",
                                      email: "",
                                      address: "",
                                      createdAt: "",
                                    }
                                  : undefined,
                                vehicle: i.vehicleReg
                                  ? {
                                      id: i.vehicleId,
                                      reg: i.vehicleReg,
                                      make: i.vehicleMake ?? "",
                                      model: i.vehicleModel ?? "",
                                      year: 0,
                                      vin: "",
                                      mileage: 0,
                                      fuel: "Petrol",
                                      transmission: "Manual",
                                      customerId: i.customerId,
                                      motExpiry: "",
                                    }
                                  : undefined,
                              })
                            }
                          >
                            <Download className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              openDocumentPreview({
                                kind: "Invoice",
                                doc: i,
                                customer: i.customerName
                                  ? {
                                      id: i.customerId,
                                      name: i.customerName,
                                      phone: "",
                                      email: "",
                                      address: "",
                                      createdAt: "",
                                    }
                                  : undefined,
                                vehicle: i.vehicleReg
                                  ? {
                                      id: i.vehicleId,
                                      reg: i.vehicleReg,
                                      make: i.vehicleMake ?? "",
                                      model: i.vehicleModel ?? "",
                                      year: 0,
                                      vin: "",
                                      mileage: 0,
                                      fuel: "Petrol",
                                      transmission: "Manual",
                                      customerId: i.customerId,
                                      motExpiry: "",
                                    }
                                  : undefined,
                              })
                            }
                          >
                            <Printer className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
          {!isLoading && invoices.length === 0 && (
            <div className="p-12 text-center text-sm text-muted-foreground">No invoices found.</div>
          )}

          <ListPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </Card>
      </div>
    </AppLayout>
  );
}
