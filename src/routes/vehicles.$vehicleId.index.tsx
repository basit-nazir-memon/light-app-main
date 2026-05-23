import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Pencil, Car, Gauge, Fuel, Calendar, User2, FileText, Receipt,
  Wrench, Package, Mail, Phone, MapPin, ExternalLink,
} from "lucide-react";
import { normalizeJobBoardStatus } from "@/lib/mockData";
import {
  useVehicle, useCustomers, useJobs, useInvoices, useQuotes,
} from "@/lib/store";
import { findCustomer, invoiceTotal, quoteLabourSubtotal, quotePartsSubtotal } from "@/lib/mockData";
import { gbp, fmtDate } from "@/lib/currency";
import { StatusBadge } from "@/components/StatusBadge";
import {
  getVehicleJobs, getVehicleInvoices, getVehicleQuotes,
  getVehiclePartsHistory, vehicleSpendTotal, vehicleQuotesTotal,
} from "@/lib/vehicle-history";

export const Route = createFileRoute("/vehicles/$vehicleId/")({ component: ViewVehiclePage });

function ViewVehiclePage() {
  const { vehicleId } = Route.useParams();
  const { data: vehicle, isLoading, error } = useVehicle(vehicleId);
  const { data: customers = [] } = useCustomers();
  const { data: jobs = [] } = useJobs();
  const { data: invoices = [] } = useInvoices();
  const { data: quotes = [] } = useQuotes();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-muted-foreground">Loading vehicle…</div>
      </AppLayout>
    );
  }

  if (error || !vehicle) {
    return (
      <AppLayout>
        <div className="p-12 text-center">
          <p className="text-destructive">Vehicle not found.</p>
          <Button asChild className="mt-4"><Link to="/vehicles">Back to vehicles</Link></Button>
        </div>
      </AppLayout>
    );
  }

  const owner = findCustomer(customers, vehicle.customerId);
  const vehicleJobs = getVehicleJobs(jobs, vehicleId);
  const vehicleInvoices = getVehicleInvoices(invoices, vehicleId);
  const vehicleQuotes = getVehicleQuotes(quotes, vehicleId);
  const partsHistory = getVehiclePartsHistory(vehicleId, jobs, invoices, quotes);
  const totalSpend = vehicleSpendTotal(invoices, vehicleId);
  const quotesValue = vehicleQuotesTotal(quotes, vehicleId);
  const motSoon = vehicle.motExpiry
    ? new Date(vehicle.motExpiry).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 60
    : false;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/vehicles"><ArrowLeft className="size-5" /></Link>
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-3xl font-bold tracking-wider text-primary">{vehicle.reg}</h1>
                {motSoon && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-warning/20 text-warning border border-warning/30">
                    MOT due soon
                  </span>
                )}
              </div>
              <p className="text-lg text-muted-foreground mt-0.5">
                {vehicle.year} {vehicle.make} {vehicle.model} · {vehicle.fuel} · {vehicle.transmission}
              </p>
            </div>
          </div>
          <Button asChild>
            <Link to="/vehicles/$vehicleId/edit" params={{ vehicleId }}>
              <Pencil className="size-4 mr-2" />Edit vehicle
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Jobs completed" value={String(vehicleJobs.length)} icon={Wrench} />
          <StatCard label="Invoiced (GBP)" value={gbp(totalSpend)} icon={Receipt} />
          <StatCard label="Quotes (GBP)" value={gbp(quotesValue)} icon={FileText} />
          <StatCard label="Parts used" value={String(partsHistory.length)} icon={Package} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 overflow-hidden">
            <div className="h-32 bg-gradient-to-br from-slate-900 via-slate-800 to-primary/40 flex items-end justify-between p-6">
              <div className="text-white">
                <Car className="size-10 mb-2 opacity-80" />
                <div className="text-sm opacity-75 uppercase tracking-widest">Vehicle profile</div>
              </div>
              <Button size="sm" variant="secondary" asChild>
                <Link to="/vehicles/$vehicleId" params={{ vehicleId }}>
                  <Car className="size-4 mr-2" />Vehicle details
                </Link>
              </Button>
            </div>
            <CardContent className="p-6 grid sm:grid-cols-2 gap-6">
              <Detail icon={Gauge} label="Mileage" value={`${vehicle.mileage.toLocaleString("en-GB")} miles`} />
              <Detail icon={Fuel} label="Fuel type" value={vehicle.fuel} />
              <Detail icon={Calendar} label="MOT expiry" value={vehicle.motExpiry ? fmtDate(vehicle.motExpiry) : "—"} />
              <Detail label="Transmission" value={vehicle.transmission} />
              <Detail label="VIN" value={vehicle.vin || "—"} mono />
              <Detail label="Year" value={String(vehicle.year)} />
              {vehicle.notes && (
                <div className="sm:col-span-2 rounded-lg bg-muted/40 p-4 text-sm">
                  <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">Notes</div>
                  {vehicle.notes}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><User2 className="size-4" />Owner</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {owner ? (
                <>
                  <div className="font-semibold text-lg">{owner.name}</div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Mail className="size-3.5" />{owner.email}</div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Phone className="size-3.5" />{owner.phone}</div>
                  <div className="flex items-start gap-2 text-muted-foreground"><MapPin className="size-3.5 mt-0.5 shrink-0" />{owner.address}</div>
                </>
              ) : (
                <p className="text-muted-foreground">No owner linked</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="jobs" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="jobs">Work history ({vehicleJobs.length})</TabsTrigger>
            <TabsTrigger value="parts">Parts ({partsHistory.length})</TabsTrigger>
            <TabsTrigger value="invoices">Invoices ({vehicleInvoices.length})</TabsTrigger>
            <TabsTrigger value="quotes">Quotes ({vehicleQuotes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
            <Card>
              <CardHeader><CardTitle>Repair &amp; service history</CardTitle></CardHeader>
              <CardContent className="p-0">
                {vehicleJobs.length === 0 ? (
                  <EmptyTab message="No jobs recorded for this vehicle." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Mechanic</TableHead>
                        <TableHead>Complaint</TableHead>
                        <TableHead>Parts</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicleJobs.map((j) => (
                        <TableRow key={j.id}>
                          <TableCell className="font-mono font-medium">
                            <Link
                              to="/jobs/$jobId"
                              params={{ jobId: j.id }}
                              className="text-primary hover:underline"
                            >
                              {j.number}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm">{fmtDate(j.createdAt.slice(0, 10))}</TableCell>
                          <TableCell>{j.mechanics?.length ? j.mechanics.join(", ") : j.mechanic}</TableCell>
                          <TableCell className="max-w-xs truncate text-sm">{j.complaint}</TableCell>
                          <TableCell className="text-sm">{j.parts.length} line(s)</TableCell>
                          <TableCell>
                            <StatusBadge status={normalizeJobBoardStatus(j.status)} />
                            {j.completedAt && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                Done {fmtDate(j.completedAt)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to="/jobs/$jobId" params={{ jobId: j.id }}>
                                <ExternalLink className="size-4 mr-1" />Job card
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parts">
            <Card>
              <CardHeader><CardTitle>Parts &amp; materials history</CardTitle></CardHeader>
              <CardContent className="p-0">
                {partsHistory.length === 0 ? (
                  <EmptyTab message="No parts recorded across jobs, invoices, or quotes." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partsHistory.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{fmtDate(p.date)}</TableCell>
                          <TableCell><BadgeSource source={p.source} /></TableCell>
                          <TableCell className="font-mono text-sm">{p.reference}</TableCell>
                          <TableCell>
                            <div>{p.description}</div>
                            {p.category && <div className="text-xs text-muted-foreground">{p.category}</div>}
                          </TableCell>
                          <TableCell className="text-right">{p.qty}</TableCell>
                          <TableCell className="text-right">{gbp(p.unitPrice)}</TableCell>
                          <TableCell className="text-right font-medium">{gbp(p.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
                <p className="text-sm text-muted-foreground">Total billed: {gbp(totalSpend)}</p>
              </CardHeader>
              <CardContent className="p-0">
                {vehicleInvoices.length === 0 ? (
                  <EmptyTab message="No invoices for this vehicle." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Issued</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicleInvoices.map((inv) => {
                        const { total } = invoiceTotal(inv);
                        return (
                          <TableRow key={inv.id}>
                            <TableCell className="font-mono text-sm font-medium text-primary">{inv.number}</TableCell>
                            <TableCell className="text-sm">{fmtDate(inv.issuedAt)}</TableCell>
                            <TableCell className="text-sm">{fmtDate(inv.dueDate)}</TableCell>
                            <TableCell className="text-right font-semibold">{gbp(total)}</TableCell>
                            <TableCell><StatusBadge status={inv.status} /></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quotes">
            <Card>
              <CardHeader>
                <CardTitle>Quotations</CardTitle>
                <p className="text-sm text-muted-foreground">Combined quote value: {gbp(quotesValue)}</p>
              </CardHeader>
              <CardContent className="p-0">
                {vehicleQuotes.length === 0 ? (
                  <EmptyTab message="No quotes for this vehicle." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quote #</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicleQuotes.map((q) => {
                        const { total } = invoiceTotal(q);
                        return (
                          <TableRow key={q.id}>
                            <TableCell>
                              <Link
                                to="/quotes/$quoteId"
                                params={{ quoteId: q.id }}
                                className="font-mono text-sm font-medium text-primary hover:underline"
                              >
                                {q.number}
                              </Link>
                            </TableCell>
                            <TableCell className="text-sm">{fmtDate(q.createdAt.slice(0, 10))}</TableCell>
                            <TableCell className="text-right font-semibold">{gbp(total)}</TableCell>
                            <TableCell><StatusBadge status={q.status} /></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Car }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="size-4" />
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl font-bold font-display">{value}</div>
    </Card>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon?: typeof Gauge;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground mb-1">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </div>
      <div className={mono ? "font-mono text-sm" : "font-medium"}>{value}</div>
    </div>
  );
}

function BadgeSource({ source }: { source: string }) {
  const styles: Record<string, string> = {
    Job: "bg-primary/15 text-primary",
    Invoice: "bg-success/15 text-success",
    Quote: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[source] ?? ""}`}>{source}</span>
  );
}

function EmptyTab({ message }: { message: string }) {
  return <div className="p-12 text-center text-sm text-muted-foreground">{message}</div>;
}
