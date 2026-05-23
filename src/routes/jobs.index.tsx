import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Printer, LayoutGrid, Columns3, Search } from "lucide-react";
import {
  JOB_CARD_STATUSES,
  normalizeJobBoardStatus,
  type Job,
  type JobCardStatus,
} from "@/lib/mockData";
import { useJobsBoard, useJobsList } from "@/lib/store";
import { fmtDate } from "@/lib/currency";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ListPagination } from "@/components/ListPagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/jobs/")({ component: JobsPage });

type ViewMode = "kanban" | "grid";
type BoardFilter = "all" | "created" | "wip" | "completed";

const GRID_PAGE_SIZE = 12;

function JobBoardCard({ job }: { job: Job }) {
  const navigate = useNavigate();
  const boardStatus = normalizeJobBoardStatus(job.status);
  const mechanics = job.mechanics.length ? job.mechanics.join(", ") : job.mechanic || "—";
  const vehLine =
    job.vehicleReg || job.vehicleMake
      ? `${job.vehicleYear ?? ""} ${job.vehicleMake ?? ""} ${job.vehicleModel ?? ""} · ${job.vehicleReg ?? ""}`.trim()
      : "—";

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
        <div className="text-xs text-muted-foreground">{vehLine}</div>
        <div className="text-xs text-muted-foreground pt-2 border-t truncate" title={mechanics}>
          {mechanics}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {fmtDate(job.createdAt.slice(0, 10))} · {job.customerName ?? "—"}
        </div>
      </CardContent>
    </Card>
  );
}

function JobsPage() {
  const [view, setView] = useState<ViewMode>("kanban");
  const [boardFilter, setBoardFilter] = useState<BoardFilter>("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, boardFilter]);

  const { data: board, isLoading: boardLoading } = useJobsBoard();
  const gridStatus = boardFilter === "all" ? undefined : boardFilter;
  const { data: gridData, isLoading: gridLoading } = useJobsList({
    page,
    limit: GRID_PAGE_SIZE,
    search: debouncedSearch,
    boardStatus: view === "grid" ? gridStatus : undefined,
  });

  const gridJobs = gridData?.items ?? [];
  const gridTotal = gridData?.total ?? 0;
  const gridTotalPages = gridData?.totalPages ?? 1;

  const showAllCompleted = () => {
    setBoardFilter("completed");
    setView("grid");
    setPage(1);
  };

  const columnJobs = (status: JobCardStatus): Job[] => {
    if (!board) return [];
    if (status === "Created") return board.created;
    if (status === "Work in Progress") return board.workInProgress;
    return board.completedRecent;
  };

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
                <Columns3 className="size-4 mr-1.5" />
                Kanban
              </Button>
              <Button
                type="button"
                size="sm"
                variant={view === "grid" ? "default" : "ghost"}
                className="h-8"
                onClick={() => setView("grid")}
              >
                <LayoutGrid className="size-4 mr-1.5" />
                Grid
              </Button>
            </div>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4 mr-2" />
              Print
            </Button>
            <Button onClick={() => toast.info("Start work from a quotation to create a job card.")}>
              <Plus className="size-4 mr-2" />
              New Job Card
            </Button>
          </div>
        </div>

        {view === "grid" && (
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search reg, make, model, complaint…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={boardFilter} onValueChange={(v) => setBoardFilter(v as BoardFilter)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="wip">Work in Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {view === "kanban" ? (
          <div className="overflow-x-auto pb-4">
            {boardLoading && (
              <p className="text-sm text-muted-foreground text-center py-12">Loading board…</p>
            )}
            {!boardLoading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0 md:min-w-[720px]">
                {JOB_CARD_STATUSES.map((status) => {
                  const list = columnJobs(status);
                  const isCompleted = status === "Completed";
                  const totalCompleted = board?.completedTotal ?? 0;
                  const hiddenCount = Math.max(0, totalCompleted - list.length);
                  return (
                    <div key={status} className="bg-muted/40 rounded-xl p-3 min-h-80">
                      <div className="flex items-center justify-between px-1 mb-3">
                        <h3 className="font-semibold text-sm">{status}</h3>
                        <span className="text-xs text-muted-foreground bg-card px-2 py-0.5 rounded-md">
                          {isCompleted ? totalCompleted : list.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {list.length === 0 && (
                          <div className="text-xs text-muted-foreground italic px-1 py-4 text-center">
                            No jobs
                          </div>
                        )}
                        {list.map((j) => (
                          <JobBoardCard key={j.id} job={j} />
                        ))}
                        {isCompleted && hiddenCount > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            onClick={showAllCompleted}
                          >
                            Show all {totalCompleted} completed (grid view)
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {gridLoading && (
                <p className="text-sm text-muted-foreground col-span-full text-center py-12">
                  Loading…
                </p>
              )}
              {!gridLoading && gridJobs.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full text-center py-12">
                  No job cards found.
                </p>
              )}
              {!gridLoading &&
                gridJobs.map((j) => (
                  <div
                    key={j.id}
                    className={cn(
                      "rounded-xl border-l-4 overflow-hidden",
                      normalizeJobBoardStatus(j.status) === "Created" && "border-l-muted-foreground",
                      normalizeJobBoardStatus(j.status) === "Work in Progress" && "border-l-primary",
                      normalizeJobBoardStatus(j.status) === "Completed" && "border-l-success",
                    )}
                  >
                    <JobBoardCard job={j} />
                  </div>
                ))}
            </div>
            <ListPagination
              page={page}
              totalPages={gridTotalPages}
              total={gridTotal}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}
