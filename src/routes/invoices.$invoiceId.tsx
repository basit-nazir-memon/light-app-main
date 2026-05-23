import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Download, Printer, ExternalLink, CreditCard, Calendar, CalendarCheck, Wrench,
} from "lucide-react";
import { useInvoice, useJob, useCustomers, useVehicles, useMarkInvoicePaid } from "@/lib/store";
import { findCustomer, findVehicle, calcInvoiceTotals, normalizeJobBoardStatus } from "@/lib/mockData";
import { gbp, fmtDate } from "@/lib/currency";
import { StatusBadge } from "@/components/StatusBadge";
import { downloadDocumentPdf, openDocumentPreview } from "@/lib/pdf";
import logo from "@/assets/logo.png";
import { toast } from "sonner";

export const Route = createFileRoute("/invoices/$invoiceId")({ component: ViewInvoicePage });

function ViewInvoicePage() {
  const { invoiceId } = Route.useParams();
  const { data: invoice, isLoading, error } = useInvoice(invoiceId);
  const { data: job } = useJob(invoice?.jobId ?? "");
  const { data: customers = [] } = useCustomers();
  const { data: vehicles = [] } = useVehicles();
  const markPaidMut = useMarkInvoicePaid();

  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-muted-foreground">Loading invoice…</div>
      </AppLayout>
    );
  }

  if (error || !invoice) {
    return (
      <AppLayout>
        <div className="p-12 text-center">
          <p className="text-destructive">Invoice not found.</p>
          <Button asChild className="mt-4"><Link to="/invoices">Back to invoices</Link></Button>
        </div>
      </AppLayout>
    );
  }

  const cust = findCustomer(customers, invoice.customerId);
  const veh = findVehicle(vehicles, invoice.vehicleId);
  const t = calcInvoiceTotals(invoice);
  const doc = { kind: "Invoice" as const, doc: invoice, customer: cust, vehicle: veh };
  const isPaid = invoice.status === "Paid";
  const isUnpaid = invoice.status === "Unpaid";
  const jobCompleted =
    job && normalizeJobBoardStatus(job.status) === "Completed";

  const handleMarkPaid = () => {
    markPaidMut.mutate(
      { id: invoiceId, paymentDate },
      {
        onSuccess: () => {
          toast.success("Invoice marked as paid");
          setMarkPaidOpen(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/invoices"><ArrowLeft className="size-5" /></Link>
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl md:text-3xl font-bold font-mono text-primary">{invoice.number}</h1>
                <StatusBadge status={invoice.status} />
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                Issued {fmtDate(invoice.issuedAt)} · Due {fmtDate(invoice.dueDate)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {invoice.quoteId && (
              <Button variant="outline" asChild>
                <Link to="/quotes/$quoteId" params={{ quoteId: invoice.quoteId }}>
                  <ExternalLink className="size-4 mr-2" />View quotation
                </Link>
              </Button>
            )}
            {invoice.jobId && (
              <Button variant="outline" asChild>
                <Link to="/jobs/$jobId" params={{ jobId: invoice.jobId }}>
                  <Wrench className="size-4 mr-2" />View job card
                </Link>
              </Button>
            )}
            {isUnpaid && (
              <Button onClick={() => setMarkPaidOpen(true)}>
                <CreditCard className="size-4 mr-2" />Mark as paid
              </Button>
            )}
            <Button variant="outline" onClick={() => void openDocumentPreview(doc)}>
              <Printer className="size-4 mr-2" />Preview
            </Button>
            <Button variant="outline" onClick={() => void downloadDocumentPdf(doc)}>
              <Download className="size-4 mr-2" />Download PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className={`rounded-xl border-2 p-4 flex flex-wrap items-center gap-4 ${isPaid ? "bg-success/10 border-success/40" : "bg-amber-50 dark:bg-amber-950/30 border-amber-300/50"}`}>
            <CreditCard className={`size-8 shrink-0 ${isPaid ? "text-success" : "text-amber-600"}`} />
            <div>
              <div className="font-display text-lg font-bold">
                {isPaid ? "Payment received" : "Payment outstanding"}
              </div>
              {isPaid && invoice.paymentDate && (
                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Calendar className="size-3.5" />
                  Payment date: <strong>{fmtDate(invoice.paymentDate)}</strong>
                  {invoice.paymentMethod && <> · {invoice.paymentMethod}</>}
                </div>
              )}
              {!isPaid && (
                <div className="text-sm text-muted-foreground">Amount due: <strong>{gbp(t.total)}</strong></div>
              )}
            </div>
          </div>

          {(job || jobCompleted) && (
            <div className="rounded-xl border p-4 flex flex-wrap items-center gap-4 bg-muted/30">
              <Wrench className="size-8 shrink-0 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="font-display font-semibold">Job card</div>
                {job ? (
                  <p className="text-sm text-muted-foreground font-mono">{job.number}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Linked to this invoice</p>
                )}
                {job?.completedAt && (
                  <p className="text-sm mt-1 flex items-center gap-1 text-success">
                    <CalendarCheck className="size-3.5" />
                    Job completed {fmtDate(job.completedAt)}
                  </p>
                )}
              </div>
              {invoice.jobId && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/jobs/$jobId" params={{ jobId: invoice.jobId }}>Open job card</Link>
                </Button>
              )}
            </div>
          )}
        </div>

        <Card className="overflow-hidden border-2">
          <div className={`p-6 flex flex-wrap items-center justify-between gap-6 text-white ${isPaid ? "bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900" : "bg-gradient-to-r from-slate-900 via-slate-800 to-amber-900"}`}>
            <div className="flex items-center gap-5">
              <div className="bg-white rounded-xl p-3 min-w-[120px] min-h-[80px] flex items-center justify-center shadow-lg">
                <img src={logo} alt="Yova Auto" className="max-h-16 max-w-[140px] object-contain" />
              </div>
              <div>
                <div className="font-display text-xl font-bold">Yova Auto</div>
                <div className="text-xs opacity-80 uppercase tracking-widest">Tax Invoice</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-display font-bold">{gbp(t.total)}</div>
              <div className="text-xs opacity-75 mt-1">Total incl. VAT (GBP)</div>
            </div>
          </div>

          <CardContent className="p-6 space-y-8">
            <div className="grid sm:grid-cols-2 gap-4">
              <Panel title="Bill to" lines={[cust?.name, cust?.address, `${cust?.email ?? ""} · ${cust?.phone ?? ""}`]} />
              <Panel title="Vehicle" lines={[`${veh?.year} ${veh?.make} ${veh?.model}`, `Reg: ${veh?.reg}`, `${veh?.mileage?.toLocaleString()} miles`]} />
            </div>

            <section>
              <h3 className="font-display font-semibold text-primary border-b-2 border-primary pb-2 mb-3">
                Parts &amp; materials
              </h3>
              {invoice.parts.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No parts listed.</p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right w-20">Qty</TableHead>
                        <TableHead className="text-right w-28">Unit price</TableHead>
                        <TableHead className="text-right w-28">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.parts.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{p.name || "—"}</TableCell>
                          <TableCell className="text-right">{p.qty}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{gbp(p.price)}</TableCell>
                          <TableCell className="text-right font-semibold">{gbp(p.qty * p.price)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            <section>
              <h3 className="font-display font-semibold text-primary border-b-2 border-primary pb-2 mb-3">
                Labour
              </h3>
              {invoice.labourLines.length > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right w-24">Rate</TableHead>
                        <TableHead className="text-right w-20">Hours</TableHead>
                        <TableHead className="w-28">Type</TableHead>
                        <TableHead className="text-right w-28">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.labourLines.map((l, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{l.description || "—"}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{gbp(l.rate)}</TableCell>
                          <TableCell className="text-right">{l.fixedRate ? "—" : l.hours}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {l.fixedRate ? "Fixed rate" : "Hourly"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{gbp(l.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : invoice.labour > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right w-28">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Labour</TableCell>
                        <TableCell className="text-right font-semibold">{gbp(invoice.labour)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No labour listed.</p>
              )}
            </section>

            {invoice.warranty && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border p-4 text-sm">
                <strong>Warranty:</strong> {invoice.warranty}
              </div>
            )}
            {invoice.notes && (
              <div className="rounded-lg bg-muted/50 border p-4 text-sm">
                <strong>Notes:</strong> {invoice.notes}
              </div>
            )}

            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-2 text-sm border-2 rounded-lg p-4 bg-muted/30">
                <div className="flex justify-between"><span>Parts</span><span>{gbp(t.partsSub)}</span></div>
                <div className="flex justify-between"><span>Labour</span><span>{gbp(t.labourSub)}</span></div>
                <div className="flex justify-between"><span>Subtotal</span><span>{gbp(t.sub)}</span></div>
                {t.discount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Discount</span><span>-{gbp(t.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between"><span>VAT ({invoice.vatRate}%)</span><span>{gbp(t.vat)}</span></div>
                <div className="flex justify-between font-bold text-lg text-primary border-t pt-2">
                  <span>Total due</span><span>{gbp(t.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark invoice as paid</DialogTitle>
            <DialogDescription>
              Status will change to <strong>Paid</strong>. Confirm the payment date.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-2">
            <Label>Payment date</Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkPaidOpen(false)}>Cancel</Button>
            <Button onClick={handleMarkPaid} disabled={markPaidMut.isPending || !paymentDate}>
              {markPaidMut.isPending ? "Saving…" : "Confirm paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function Panel({ title, lines }: { title: string; lines: (string | undefined)[] }) {
  return (
    <div className="rounded-lg border p-4 bg-muted/20">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">{title}</div>
      {lines.filter(Boolean).map((l, i) => (
        <div key={i} className={i === 0 ? "font-semibold" : "text-sm text-muted-foreground"}>{l}</div>
      ))}
    </div>
  );
}
