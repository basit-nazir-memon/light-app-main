import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Printer, LayoutGrid, Columns3 } from "lucide-react";
import {
  findCustomer, findVehicle, JOB_CARD_STATUSES, normalizeJobBoardStatus, type Job, type JobCardStatus,
} from "@/lib/mockData";
import { useJobs, useCustomers, useVehicles } from "@/lib/store";
import { fmtDate } from "@/lib/currency";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/jobs/")({ component: JobsPage });

type ViewMode = "kanban" | "grid";

function JobBoardCard({
  job,
  customers,
  vehicles,
}: {
  job: Job;
  customers: ReturnType<typeof useCustomers>["data"];
  vehicles: ReturnType<typeof useVehicles>["data"];
}) {
  const navigate = useNavigate();
  const veh = findVehicle(vehicles ?? [], job.vehicleId);
  const cust = findCustomer(customers ?? [], job.customerId);
  const boardStatus = normalizeJobBoardStatus(job.status);
  const mechanics = job.mechanics.length ? job.mechanics.join(", ") : job.mechanic || "—";

  const openJob = () => navigate({ to: "/jobs/$jobId", params: { jobId: job.id } });

  return (
    <Card
      className="cursor-pointer hover:shadow-[var(--shadow-elegant)] transition-all hover:-translate-y-0.5 h-full"
      onClick={openJob}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openJob();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-semibold text-primary">{job.number}</span>
          <StatusBadge status={boardStatus} />
        </div>
        <div className="text-sm font-medium leading-snug line-clamp-2">{job.complaint}</div>
        <div className="text-xs text-muted-foreground">
          {veh?.year} {veh?.make} {veh?.model} · {veh?.reg}
        </div>
        <div className="text-xs text-muted-foreground pt-2 border-t truncate" title={mechanics}>
          {mechanics}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {fmtDate(job.createdAt.slice(0, 10))} · {cust?.name}
        </div>
      </CardContent>
    </Card>
  );
}

function JobsPage() {
  const { data: jobs = [] } = useJobs();
  const { data: customers = [] } = useCustomers();
  const { data: vehicles = [] } = useVehicles();
  const [view, setView] = useState<ViewMode>("kanban");

  const jobsByColumn = (status: JobCardStatus) =>
    jobs.filter((j) => normalizeJobBoardStatus(j.status) === status);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Job Cards</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track workshop jobs: Created → Work in Progress → Completed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="inline-flex rounded-lg border p-0.5 bg-muted/40">
              <Button
                type="button"
                size="sm"
                variant={view === "kanban" ? "default" : "ghost"}
                className="h-8"
                onClick={() => setView("kanban")}
              >
                <Columns3 className="size-4 mr-1.5" />Kanban
              </Button>
              <Button
                type="button"
                size="sm"
                variant={view === "grid" ? "default" : "ghost"}
                className="h-8"
                onClick={() => setView("grid")}
              >
                <LayoutGrid className="size-4 mr-1.5" />Grid
              </Button>
            </div>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4 mr-2" />Print
            </Button>
            <Button onClick={() => toast.info("Start work from a quotation to create a job card.")}>
              <Plus className="size-4 mr-2" />New Job Card
            </Button>
          </div>
        </div>

        {view === "kanban" ? (
          <div className="overflow-x-auto pb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0 md:min-w-[720px]">
              {JOB_CARD_STATUSES.map((status) => {
                const list = jobsByColumn(status);
                return (
                  <div key={status} className="bg-muted/40 rounded-xl p-3 min-h-80">
                    <div className="flex items-center justify-between px-1 mb-3">
                      <h3 className="font-semibold text-sm">{status}</h3>
                      <span className="text-xs text-muted-foreground bg-card px-2 py-0.5 rounded-md">
                        {list.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {list.length === 0 && (
                        <div className="text-xs text-muted-foreground italic px-1 py-4 text-center">
                          No jobs
                        </div>
                      )}
                      {list.map((j) => (
                        <JobBoardCard key={j.id} job={j} customers={customers} vehicles={vehicles} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {jobs.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-12">
                No job cards yet. Use <strong>Start work</strong> on a quotation to create one.
              </p>
            )}
            {jobs.map((j) => (
              <div
                key={j.id}
                className={cn(
                  "rounded-xl border-l-4 overflow-hidden",
                  normalizeJobBoardStatus(j.status) === "Created" && "border-l-muted-foreground",
                  normalizeJobBoardStatus(j.status) === "Work in Progress" && "border-l-primary",
                  normalizeJobBoardStatus(j.status) === "Completed" && "border-l-success",
                )}
              >
                <JobBoardCard job={j} customers={customers} vehicles={vehicles} />
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
