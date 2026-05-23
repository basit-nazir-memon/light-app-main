import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Plus, Eye, Pencil } from "lucide-react";
import { calcQuoteTotals } from "@/lib/mockData";
import { useQuotesList } from "@/lib/store";
import { gbp, fmtDate } from "@/lib/currency";
import { StatusBadge } from "@/components/StatusBadge";
import { downloadDocumentPdf } from "@/lib/pdf";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ListPagination } from "@/components/ListPagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/quotes/")({ component: QuotesPage });

const PAGE_SIZE = 20;

const QUOTE_STATUSES = ["Draft", "Sent", "Approved", "Rejected", "Invoiced"] as const;

function QuotesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const { data, isLoading } = useQuotesList({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    status: status === "all" ? undefined : status,
  });
  const quotes = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Quotes</h1>
            <p className="text-muted-foreground text-sm mt-1">{total} quotations</p>
          </div>
          <Button asChild className="shadow-[var(--shadow-elegant)]">
            <Link to="/quotes/new">
              <Plus className="size-4 mr-2" />
              New quotation
            </Link>
          </Button>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search quote #, customer, vehicle…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {QUOTE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                quotes.map((qt) => {
                  const t = calcQuoteTotals(qt);
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
                      <TableCell>{qt.customerName}</TableCell>
                      <TableCell className="text-sm">
                        {qt.vehicleReg} · {qt.vehicleMake} {qt.vehicleModel}
                      </TableCell>
                      <TableCell className="text-sm">{fmtDate(qt.validUntil)}</TableCell>
                      <TableCell className="text-right">
                        <div className="font-semibold">{gbp(t.total)}</div>
                        <div className="text-xs text-muted-foreground">
                          Parts {gbp(t.partsSub)} · Labour {gbp(t.labourSub)}
                          {t.discount > 0 ? ` · Disc -${gbp(t.discount)}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={qt.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="ghost" asChild>
                            <Link to="/quotes/$quoteId" params={{ quoteId: qt.id }}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                          <Button size="sm" variant="ghost" asChild>
                            <Link to="/quotes/$quoteId/edit" params={{ quoteId: qt.id }}>
                              <Pencil className="size-4" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              downloadDocumentPdf({
                                kind: "Quote",
                                doc: qt,
                                customer: qt.customerName
                                  ? {
                                      id: qt.customerId,
                                      name: qt.customerName,
                                      phone: "",
                                      email: "",
                                      address: "",
                                      createdAt: "",
                                    }
                                  : undefined,
                                vehicle: qt.vehicleReg
                                  ? {
                                      id: qt.vehicleId,
                                      reg: qt.vehicleReg,
                                      make: qt.vehicleMake ?? "",
                                      model: qt.vehicleModel ?? "",
                                      year: 0,
                                      vin: "",
                                      mileage: 0,
                                      fuel: "Petrol",
                                      transmission: "Manual",
                                      customerId: qt.customerId,
                                      motExpiry: "",
                                    }
                                  : undefined,
                              })
                            }
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
          {!isLoading && quotes.length === 0 && (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No quotes found.
            </div>
          )}

          <ListPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </Card>
      </div>
    </AppLayout>
  );
}
