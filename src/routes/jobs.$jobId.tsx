import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ExternalLink, User2, Car, CalendarCheck } from "lucide-react";
import {
  useJob, useCustomers, useVehicles, useUpdateJobStatus, useJobCompleteAndInvoice,
} from "@/lib/store";
import {
  findCustomer,
  findVehicle,
  getAllowedJobTransitions,
  normalizeJobBoardStatus,
  type JobCardStatus,
} from "@/lib/mockData";
import { fmtDate } from "@/lib/currency";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/jobs/$jobId")({ component: JobCardPage });

function statusConfirmMessage(from: JobCardStatus, to: JobCardStatus): string {
  if (from === "Created" && to === "Work in Progress") {
    return "This job will move to Work in Progress. Continue?";
  }
  if (from === "Work in Progress" && to === "Completed") {
    return "This job will be marked as Completed, an invoice (Not Paid) will be created from the quotation, and you will be taken to the invoice. Continue?";
  }
  if (from === "Completed" && to === "Work in Progress") {
    return "This job will reopen as Work in Progress. The completion date will be cleared. Continue?";
  }
  return `Change job status to ${to}?`;
}

function JobCardPage() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const { data: job, isLoading, error } = useJob(jobId);
  const { data: customers = [] } = useCustomers();
  const { data: vehicles = [] } = useVehicles();
  const updateStatus = useUpdateJobStatus();
  const completeInv = useJobCompleteAndInvoice();

  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<JobCardStatus | null>(null);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-muted-foreground">Loading job card…</div>
      </AppLayout>
    );
  }

  if (error || !job) {
    return (
      <AppLayout>
        <div className="p-12 text-center">
          <p className="text-destructive">Job card not found.</p>
          <Button asChild className="mt-4"><Link to="/jobs">Back to jobs</Link></Button>
        </div>
      </AppLayout>
    );
  }

  const cust = findCustomer(customers, job.customerId);
  const veh = findVehicle(vehicles, job.vehicleId);
  const work = job.workDetails;
  const boardStatus = normalizeJobBoardStatus(job.status);
  const allowedNext = getAllowedJobTransitions(boardStatus);
  const canChangeStatus = allowedNext.length > 0;

  const onStatusSelect = (next: string) => {
    const status = next as JobCardStatus;
    if (status === boardStatus) return;
    setPendingStatus(status);
    setStatusConfirmOpen(true);
  };

  const completeJobAndOpenInvoice = () => {
    if (!job.quoteId) {
      toast.error("This job is not linked to a quotation. Cannot create an invoice.");
      setStatusConfirmOpen(false);
      setPendingStatus(null);
      return;
    }
    completeInv.mutate(jobId, {
      onSuccess: (res) => {
        toast.success("Job completed — invoice created (Not Paid)");
        setStatusConfirmOpen(false);
        setPendingStatus(null);
        const invId = res.invoice?.id as string;
        if (invId) navigate({ to: "/invoices/$invoiceId", params: { invoiceId: invId } });
        else toast.error("Invoice was created but could not be opened.");
      },
      onError: (e) => toast.error(e.message),
    });
  };

  const handleStatusConfirm = () => {
    if (!pendingStatus) return;
    if (pendingStatus === "Completed") {
      completeJobAndOpenInvoice();
      return;
    }
    updateStatus.mutate(
      { id: jobId, status: pendingStatus },
      {
        onSuccess: () => {
          toast.success(`Status updated to ${pendingStatus}`);
          setStatusConfirmOpen(false);
          setPendingStatus(null);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/jobs"><ArrowLeft className="size-5" /></Link>
            </Button>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">Job Card</h1>
              <p className="text-muted-foreground text-sm mt-1 font-mono">{job.number}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {job.vehicleId && (
              <Button variant="outline" asChild>
                <Link to="/vehicles/$vehicleId" params={{ vehicleId: job.vehicleId }}>
                  <Car className="size-4 mr-2" />View vehicle
                </Link>
              </Button>
            )}
            {job.quoteId && (
              <Button variant="outline" asChild>
                <Link to="/quotes/$quoteId" params={{ quoteId: job.quoteId }}>
                  <ExternalLink className="size-4 mr-2" />Open quotation
                </Link>
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Workshop status</CardTitle>
              {boardStatus === "Completed" && job.completedAt && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <CalendarCheck className="size-4 text-success" />
                  Completed on <strong>{fmtDate(job.completedAt)}</strong>
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 min-w-[220px]">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground shrink-0">Status</Label>
                {canChangeStatus ? (
                  <Select
                    value={boardStatus}
                    onValueChange={onStatusSelect}
                    disabled={updateStatus.isPending || completeInv.isPending}
                  >
                    <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={boardStatus}>{boardStatus}</SelectItem>
                      {allowedNext.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <StatusBadge status={boardStatus} />
                )}
              </div>
              {boardStatus === "Completed" && (
                <p className="text-xs text-muted-foreground text-right">No further status changes</p>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                <User2 className="size-3" /> Customer
              </div>
              <div className="font-semibold">{cust?.name}</div>
              <div className="text-sm text-muted-foreground">{cust?.phone} · {cust?.email}</div>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                  <Car className="size-3" /> Vehicle
                </div>
                {job.vehicleId && (
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                    <Link to="/vehicles/$vehicleId" params={{ vehicleId: job.vehicleId }}>
                      View details
                    </Link>
                  </Button>
                )}
              </div>
              {job.vehicleId ? (
                <Link
                  to="/vehicles/$vehicleId"
                  params={{ vehicleId: job.vehicleId }}
                  className="block hover:bg-muted/50 -m-1 p-1 rounded-md transition-colors"
                >
                  <div className="font-semibold text-primary hover:underline">
                    {veh?.year} {veh?.make} {veh?.model}
                  </div>
                  <div className="text-sm text-muted-foreground">Reg: {veh?.reg}</div>
                </Link>
              ) : (
                <>
                  <div className="font-semibold">—</div>
                  <div className="text-sm text-muted-foreground">No vehicle linked</div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Assigned mechanics</CardTitle></CardHeader>
          <CardContent>
            {job.mechanics.length === 0 ? (
              <p className="text-sm text-muted-foreground">No mechanics assigned.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {job.mechanics.map((m) => (
                  <li key={m} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">{m}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Parts &amp; materials</CardTitle></CardHeader>
          <CardContent>
            {!work?.parts_lines?.length ? (
              <p className="text-sm text-muted-foreground italic">No parts listed.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {work.parts_lines.map((p, i) => (
                  <li key={i} className="flex justify-between border-b py-2">
                    <span>{p.description || "—"}</span>
                    <span className="text-muted-foreground">Qty: {p.qty}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Labour</CardTitle></CardHeader>
          <CardContent>
            {!work?.labour_lines?.length ? (
              <p className="text-sm text-muted-foreground italic">No labour listed.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {work.labour_lines.map((l, i) => (
                  <li key={i} className="flex justify-between border-b py-2">
                    <span>{l.description || "—"}</span>
                    <span className="text-muted-foreground">
                      {l.fixedRate ? "Fixed rate" : `${l.hours}h`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Created {fmtDate(job.createdAt.slice(0, 10))}
          {canChangeStatus && (
            <> · Next status: <strong>{allowedNext.join(", ")}</strong></>
          )}
        </p>
      </div>

      {pendingStatus && (
        <ConfirmActionDialog
          open={statusConfirmOpen}
          onOpenChange={(o) => {
            setStatusConfirmOpen(o);
            if (!o) setPendingStatus(null);
          }}
          title="Change job status?"
          description={statusConfirmMessage(boardStatus, pendingStatus)}
          confirmLabel="Yes, continue"
          onConfirm={handleStatusConfirm}
          loading={updateStatus.isPending || completeInv.isPending}
        />
      )}
    </AppLayout>
  );
}
