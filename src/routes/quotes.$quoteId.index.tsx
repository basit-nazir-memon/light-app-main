import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Pencil, Download, Printer, Play, XCircle, FileText, Banknote, ExternalLink,
} from "lucide-react";
import {
  useQuote, useCustomers, useVehicles, useQuoteJob, useQuoteInvoice,
  useQuoteReject, useQuoteStartWork, useQuoteConvertInvoice, useQuoteMarkPaid,
} from "@/lib/store";
import { findCustomer, findVehicle, calcQuoteTotals, normalizeJobBoardStatus } from "@/lib/mockData";
import { gbp, fmtDate } from "@/lib/currency";
import { StatusBadge } from "@/components/StatusBadge";
import { downloadDocumentPdf, openDocumentPreview } from "@/lib/pdf";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { MechanicPickerDialog } from "@/components/MechanicPickerDialog";
import logo from "@/assets/logo.png";
import { toast } from "sonner";

export const Route = createFileRoute("/quotes/$quoteId/")({ component: ViewQuotePage });

type ConfirmKind =
  | "reject"
  | "startWork"
  | "convert"
  | "markPaid"
  | null;

function ViewQuotePage() {
  const { quoteId } = Route.useParams();
  const navigate = useNavigate();
  const { data: quote, isLoading, error } = useQuote(quoteId);
  const { data: linkedJob } = useQuoteJob(quoteId);
  const { data: linkedInvoice } = useQuoteInvoice(quoteId);
  const { data: customers = [] } = useCustomers();
  const { data: vehicles = [] } = useVehicles();

  const rejectMut = useQuoteReject();
  const startWorkMut = useQuoteStartWork();
  const convertMut = useQuoteConvertInvoice();
  const markPaidMut = useQuoteMarkPaid();

  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [mechanicOpen, setMechanicOpen] = useState(false);
  const [mechanicMode, setMechanicMode] = useState<"start" | "convert" | "paid">("start");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [pendingMechanics, setPendingMechanics] = useState<string[]>([]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-muted-foreground">Loading quotation…</div>
      </AppLayout>
    );
  }

  if (error || !quote) {
    return (
      <AppLayout>
        <div className="p-12 text-center">
          <p className="text-destructive">Quotation not found.</p>
          <Button asChild className="mt-4"><Link to="/quotes">Back to quotes</Link></Button>
        </div>
      </AppLayout>
    );
  }

  const cust = findCustomer(customers, quote.customerId);
  const veh = findVehicle(vehicles, quote.vehicleId);
  const t = calcQuoteTotals(quote);
  const doc = { kind: "Quote" as const, doc: quote, customer: cust, vehicle: veh };
  const isRejected = quote.status === "Rejected";
  const hasJob = Boolean(linkedJob);
  const hasInvoice = Boolean(linkedInvoice);
  const jobCompleted =
    hasJob && normalizeJobBoardStatus(linkedJob!.status) === "Completed";
  const invoicePaid = linkedInvoice?.status === "Paid";

  const openMechanicPicker = (mode: typeof mechanicMode, required: boolean) => {
    setMechanicMode(mode);
    setMechanicOpen(true);
    if (!required) {
      // optional mechanics still use same dialog; user can confirm with none
    }
  };

  const runReject = () => {
    rejectMut.mutate(quoteId, {
      onSuccess: () => {
        toast.success("Quotation rejected");
        setConfirmKind(null);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  const runStartWork = (mechanics: string[]) => {
    startWorkMut.mutate(
      { quoteId, mechanics },
      {
        onSuccess: (res) => {
          toast.success("Job card created");
          setMechanicOpen(false);
          setConfirmKind(null);
          const jobId = res.job?.id as string;
          if (jobId) navigate({ to: "/jobs/$jobId", params: { jobId } });
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const runConvert = (mechanics: string[]) => {
    convertMut.mutate(
      { quoteId, mechanics },
      {
        onSuccess: (res) => {
          toast.success("Invoice created");
          setMechanicOpen(false);
          setConfirmKind(null);
          const invId = res.invoice?.id as string;
          if (invId) navigate({ to: "/invoices/$invoiceId", params: { invoiceId: invId } });
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const runMarkPaid = (mechanics: string[]) => {
    markPaidMut.mutate(
      {
        quoteId,
        mechanics,
        paymentDate,
        paymentMethod: "Bank Transfer",
      },
      {
        onSuccess: (res) => {
          toast.success("Marked as paid — invoice created");
          setPaymentOpen(false);
          setMechanicOpen(false);
          setConfirmKind(null);
          const invId = res.invoice?.id as string;
          if (invId) navigate({ to: "/invoices/$invoiceId", params: { invoiceId: invId } });
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const onMechanicConfirm = (mechanics: string[]) => {
    if (mechanicMode === "start") runStartWork(mechanics);
    else if (mechanicMode === "convert") runConvert(mechanics);
    else if (mechanicMode === "paid") {
      setPendingMechanics(mechanics);
      setMechanicOpen(false);
      setPaymentOpen(true);
    }
  };

  const confirmConfigs: Record<NonNullable<ConfirmKind>, { title: string; description: string; destructive?: boolean; label: string; action: () => void }> = {
    reject: {
      title: "Reject this quotation?",
      description:
        "This will set the quotation status to Rejected.\n\nOnce rejected, this action cannot be reverted.",
      destructive: true,
      label: "Yes, reject",
      action: runReject,
    },
    startWork: {
      title: "Start work on this quotation?",
      description: "A job card will be created with status Created. You will assign mechanic(s) next.",
      label: "Yes, start work",
      action: () => {
        setConfirmKind(null);
        openMechanicPicker("start", true);
      },
    },
    convert: {
      title: "Convert to invoice?",
      description:
        "A completed job card will be created (mechanics optional) and an invoice with status Not Paid will be generated.",
      label: "Yes, convert",
      action: () => {
        setConfirmKind(null);
        openMechanicPicker("convert", false);
      },
    },
    markPaid: {
      title: "Mark as paid?",
      description:
        "A completed job card will be created, an invoice will be generated with status Paid, and you will confirm the payment date.",
      label: "Yes, continue",
      action: () => {
        setConfirmKind(null);
        openMechanicPicker("paid", false);
      },
    },
  };

  const activeConfirm = confirmKind ? confirmConfigs[confirmKind] : null;
  const busy =
    rejectMut.isPending || startWorkMut.isPending || convertMut.isPending || markPaidMut.isPending;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/quotes"><ArrowLeft className="size-5" /></Link>
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl md:text-3xl font-bold font-mono text-primary">{quote.number}</h1>
                <StatusBadge status={quote.status} />
                {hasJob && (
                  <StatusBadge status={linkedJob!.status} />
                )}
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                Created {fmtDate(quote.createdAt.slice(0, 10))} · Valid until {fmtDate(quote.validUntil)}
                {hasJob && (
                  <> · Job: <Link to="/jobs/$jobId" params={{ jobId: linkedJob!.id }} className="text-primary hover:underline font-mono">{linkedJob!.number}</Link></>
                )}
              </p>
            </div>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap gap-2">
            {invoicePaid ? (
              <Button variant="outline" disabled title="Cannot edit — invoice is paid">
                <Pencil className="size-4 mr-2" />Edit quote
              </Button>
            ) : (
              <Button variant="outline" asChild disabled={isRejected}>
                <Link to="/quotes/$quoteId/edit" params={{ quoteId }}>
                  <Pencil className="size-4 mr-2" />Edit quote
                </Link>
              </Button>
            )}
            <Button variant="outline" onClick={() => downloadDocumentPdf(doc)}>
              <Download className="size-4 mr-2" />Download PDF
            </Button>
            <Button
              variant="outline"
              disabled={isRejected || hasJob}
              onClick={() => setConfirmKind("startWork")}
            >
              <Play className="size-4 mr-2" />Start work
            </Button>
            <Button
              variant="outline"
              disabled={isRejected || jobCompleted}
              title={jobCompleted ? "Cannot reject — job is completed" : undefined}
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={() => setConfirmKind("reject")}
            >
              <XCircle className="size-4 mr-2" />Reject quote
            </Button>
            <Button
              variant="outline"
              disabled={isRejected || hasInvoice}
              onClick={() => setConfirmKind("convert")}
            >
              <FileText className="size-4 mr-2" />Convert to invoice
            </Button>
            <Button
              disabled={isRejected || hasInvoice}
              onClick={() => setConfirmKind("markPaid")}
            >
              <Banknote className="size-4 mr-2" />Mark as paid
            </Button>
            {hasJob && (
              <Button variant="secondary" asChild>
                <Link to="/jobs/$jobId" params={{ jobId: linkedJob!.id }}>
                  <ExternalLink className="size-4 mr-2" />Open job card
                </Link>
              </Button>
            )}
            {hasInvoice && (
              <Button variant="secondary" asChild>
                <Link to="/invoices/$invoiceId" params={{ invoiceId: linkedInvoice!.id }}>
                  <ExternalLink className="size-4 mr-2" />Open invoice
                </Link>
              </Button>
            )}
            <Button variant="ghost" onClick={() => openDocumentPreview(doc)}>
              <Printer className="size-4 mr-2" />Preview
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden border-2">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-900 text-white p-6 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="bg-white rounded-xl p-3 min-w-[120px] min-h-[80px] flex items-center justify-center shadow-lg">
                <img src={logo} alt="Yova Auto" className="max-h-16 max-w-[140px] object-contain" />
              </div>
              <div>
                <div className="font-display text-xl font-bold">Yova Auto</div>
                <div className="text-xs opacity-80 uppercase tracking-widest">Quotation</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-display font-bold text-sky-300">{gbp(t.total)}</div>
              <div className="text-xs opacity-75 mt-1">Total incl. VAT (GBP)</div>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <Panel title="Customer" lines={[cust?.name, cust?.address, `${cust?.email ?? ""} · ${cust?.phone ?? ""}`]} />
              <Panel title="Vehicle" lines={[`${veh?.year} ${veh?.make} ${veh?.model}`, `Reg: ${veh?.reg}`, `${veh?.mileage?.toLocaleString()} miles`]} />
            </div>

            <PartsLinesView lines={quote.partsLines} />
            <LabourLinesView lines={quote.labourLines} />

            {quote.warranty && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 p-4 text-sm">
                <strong>Warranty:</strong> {quote.warranty}
              </div>
            )}
            {quote.notes && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 p-4 text-sm">
                <strong>Notes:</strong> {quote.notes}
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
                <div className="flex justify-between"><span>VAT ({quote.vatRate}%)</span><span>{gbp(t.vat)}</span></div>
                <div className="flex justify-between font-bold text-lg text-primary border-t pt-2">
                  <span>Total</span><span>{gbp(t.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {activeConfirm && (
        <ConfirmActionDialog
          open={!!confirmKind}
          onOpenChange={(o) => !o && setConfirmKind(null)}
          title={activeConfirm.title}
          description={activeConfirm.description}
          confirmLabel={activeConfirm.label}
          destructive={activeConfirm.destructive}
          onConfirm={activeConfirm.action}
          loading={busy}
        />
      )}

      <MechanicPickerDialog
        open={mechanicOpen}
        onOpenChange={setMechanicOpen}
        title={
          mechanicMode === "start"
            ? "Assign mechanics"
            : mechanicMode === "convert"
              ? "Assign mechanics (optional)"
              : "Assign mechanics (optional)"
        }
        description={
          mechanicMode === "start"
            ? "Select at least one mechanic for this job card."
            : "You may assign mechanics to the completed job card, or leave none selected."
        }
        required={mechanicMode === "start"}
        confirmLabel={mechanicMode === "start" ? "Create job card" : "Continue"}
        onConfirm={onMechanicConfirm}
        loading={busy}
      />

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment date</DialogTitle>
            <DialogDescription>Confirm when payment was received (defaults to today).</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-2">
            <Label>Payment date</Label>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button
              onClick={() => runMarkPaid(pendingMechanics)}
              disabled={markPaidMut.isPending || !paymentDate}
            >
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

function PartsLinesView({ lines }: { lines: import("@/lib/mockData").QuotePartLine[] }) {
  return (
    <div>
      <h3 className="font-display font-semibold text-primary border-b-2 border-primary pb-2 mb-4">Parts &amp; materials</h3>
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No parts listed.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {lines.map((item, j) => (
            <li key={j} className="flex justify-between gap-4 border-b border-border/50 py-2">
              <span>{item.description || "—"}</span>
              <span className="text-muted-foreground whitespace-nowrap text-right">
                {item.qty} × {gbp(item.price)} = <strong>{gbp(item.amount)}</strong>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LabourLinesView({ lines }: { lines: import("@/lib/mockData").QuoteLabourLine[] }) {
  return (
    <div>
      <h3 className="font-display font-semibold text-primary border-b-2 border-primary pb-2 mb-4">Labour</h3>
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No labour listed.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {lines.map((item, j) => (
            <li key={j} className="flex justify-between gap-4 border-b border-border/50 py-2">
              <span>
                {item.description || "—"}
                <span className="block text-xs text-muted-foreground">
                  {item.fixedRate ? "Fixed rate" : `${gbp(item.rate)}/hr × ${item.hours}h`}
                </span>
              </span>
              <span className="font-medium">{gbp(item.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
