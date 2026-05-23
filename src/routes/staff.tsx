import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Pencil, UserMinus, Mail, Phone, Star, Briefcase } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { type Mechanic, type Job } from "@/lib/mockData";
import {
  useMechanics, useJobs, useAddMechanic, useUpdateMechanic, useLeaveMechanic,
  type MechanicFilter,
} from "@/lib/store";
import { countAssignedJobsForMechanic, countCompletedJobsForMechanic } from "@/lib/mechanics-stats";
import { fmtDate } from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/staff")({ component: StaffPage });

type StaffForm = {
  name: string;
  email: string;
  phone: string;
  role: string;
  notes: string;
  jobsCompleted: number;
  rating: number;
};

const emptyForm = (): StaffForm => ({
  name: "",
  email: "",
  phone: "",
  role: "Mechanic",
  notes: "",
  jobsCompleted: 0,
  rating: 5,
});

function StaffPage() {
  const [filter, setFilter] = useState<MechanicFilter>("active");
  const [q, setQ] = useState("");
  const { data: list = [], isLoading } = useMechanics(filter);
  const { data: jobs = [] } = useJobs();
  const addMut = useAddMechanic();
  const updateMut = useUpdateMechanic();
  const leaveMut = useLeaveMechanic();

  const filtered = list.filter((m) =>
    [m.name, m.email, m.phone, m.role, m.notes].join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  const onAdd = (form: StaffForm) =>
    addMut.mutate(
      {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        role: form.role || undefined,
        notes: form.notes || undefined,
        jobsCompleted: form.jobsCompleted,
        rating: form.rating,
      },
      {
        onSuccess: () => toast.success("Staff member added"),
        onError: (e) => toast.error(e.message),
      },
    );

  const onUpdate = (id: string, form: StaffForm) =>
    updateMut.mutate(
      {
        id,
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        role: form.role || undefined,
        notes: form.notes || undefined,
        jobsCompleted: form.jobsCompleted,
        rating: form.rating,
      },
      {
        onSuccess: () => toast.success("Staff member updated"),
        onError: (e) => toast.error(e.message),
      },
    );

  const onLeave = (id: string, leftDate: string, leftReason: string) =>
    leaveMut.mutate(
      { id, leftDate, leftReason },
      {
        onSuccess: () => toast.success("Staff marked as left"),
        onError: (e) => toast.error(e.message),
      },
    );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Staff Management</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage mechanics — add, edit, view details, or mark as left (no deletion).
            </p>
          </div>
          <AddStaffDialog onAdd={onAdd} />
        </div>

        <Card className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as MechanicFilter)}>
              <TabsList>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="left">Left</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search staff…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Assigned jobs</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-medium">{m.name}</div>
                      {m.status === "Left" && m.leftDate && (
                        <div className="text-xs text-muted-foreground">Left {fmtDate(m.leftDate)}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{m.role ?? "—"}</TableCell>
                    <TableCell>
                      <div className="text-sm">{m.email ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{m.phone ?? ""}</div>
                    </TableCell>
                    <TableCell>{countAssignedJobsForMechanic(m.name, jobs)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Star className="size-3.5 fill-warning text-warning" />
                        {m.rating.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell><StatusBadge status={m.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <StaffDetailSheet staff={m} jobs={jobs} />
                        {m.status === "Active" && (
                          <>
                            <EditStaffDialog staff={m} onSave={(form) => onUpdate(m.id, form)} />
                            <LeaveStaffDialog
                              name={m.name}
                              onLeave={(date, reason) => onLeave(m.id, date, reason)}
                            />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!isLoading && filtered.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground">
                No staff found for this filter.
              </div>
            )}
            {isLoading && (
              <div className="p-12 text-center text-sm text-muted-foreground">Loading…</div>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

function StaffFormFields({ form, setForm }: { form: StaffForm; setForm: (f: StaffForm) => void }) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label>Full name *</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>Role</Label>
          <Input
            placeholder="e.g. Lead Mechanic"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Rating (0–5)</Label>
          <Input
            type="number"
            min={0}
            max={5}
            step={0.1}
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>Jobs completed</Label>
        <Input
          type="number"
          min={0}
          value={form.jobsCompleted}
          onChange={(e) => setForm({ ...form, jobsCompleted: Number(e.target.value) })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
      </div>
    </div>
  );
}

function AddStaffDialog({ onAdd }: { onAdd: (f: StaffForm) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-[var(--shadow-elegant)]">
          <Plus className="size-4 mr-2" />Add Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New Staff Member</DialogTitle></DialogHeader>
        <StaffFormFields form={form} setForm={setForm} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) return toast.error("Name is required");
              onAdd(form);
              setOpen(false);
              setForm(emptyForm());
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditStaffDialog({
  staff,
  onSave,
}: {
  staff: Mechanic;
  onSave: (f: StaffForm) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<StaffForm>(() => ({
    name: staff.name,
    email: staff.email ?? "",
    phone: staff.phone ?? "",
    role: staff.role ?? "",
    notes: staff.notes ?? "",
    jobsCompleted: staff.jobsCompleted,
    rating: staff.rating,
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Edit">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit {staff.name}</DialogTitle></DialogHeader>
        <StaffFormFields form={form} setForm={setForm} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) return toast.error("Name is required");
              onSave(form);
              setOpen(false);
            }}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeaveStaffDialog({
  name,
  onLeave,
}: {
  name: string;
  onLeave: (date: string, reason: string) => void;
}) {
  const [leftDate, setLeftDate] = useState(new Date().toISOString().slice(0, 10));
  const [leftReason, setLeftReason] = useState("");

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" aria-label="Mark as left">
          <UserMinus className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark {name} as left?</AlertDialogTitle>
          <AlertDialogDescription>
            Staff cannot be deleted. They will be marked as <strong>Left</strong> and hidden from active lists by default.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="left-date">Leave date *</Label>
            <Input
              id="left-date"
              type="date"
              value={leftDate}
              onChange={(e) => setLeftDate(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="left-reason">Reason for leaving *</Label>
            <Textarea
              id="left-reason"
              placeholder="e.g. Relocated, career change, end of contract…"
              value={leftReason}
              onChange={(e) => setLeftReason(e.target.value)}
              rows={3}
              required
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (!leftDate) return toast.error("Leave date is required");
              if (!leftReason.trim()) return toast.error("Leave reason is required");
              onLeave(leftDate, leftReason.trim());
            }}
          >
            Confirm left
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function StaffDetailSheet({ staff, jobs }: { staff: Mechanic; jobs: Job[] }) {
  const assigned = countAssignedJobsForMechanic(staff.name, jobs);
  const completed = countCompletedJobsForMechanic(staff.name, jobs);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" variant="ghost">View</Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {staff.name}
            <StatusBadge status={staff.status} />
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-5">
          <div className="space-y-2 text-sm">
            {staff.role && (
              <div className="flex items-center gap-2">
                <Briefcase className="size-4 text-muted-foreground" />
                {staff.role}
              </div>
            )}
            {staff.email && (
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                {staff.email}
              </div>
            )}
            {staff.phone && (
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                {staff.phone}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Assigned</div>
              <div className="text-2xl font-bold mt-1">{assigned}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Completed</div>
              <div className="text-2xl font-bold mt-1">{completed}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Rating</div>
              <div className="text-2xl font-bold mt-1 inline-flex items-center gap-1">
                <Star className="size-5 fill-warning text-warning" />
                {staff.rating.toFixed(1)}
              </div>
            </Card>
          </div>

          {staff.notes && (
            <div>
              <div className="text-sm font-semibold mb-1">Notes</div>
              <p className="text-sm text-muted-foreground">{staff.notes}</p>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Joined {fmtDate(staff.createdAt.slice(0, 10))}
          </div>

          {staff.status === "Left" && (
            <Card className="p-4 border-destructive/30 bg-destructive/5">
              <div className="text-sm font-semibold text-destructive mb-2">Left organisation</div>
              <div className="text-sm space-y-1">
                <div><span className="text-muted-foreground">Date:</span> {fmtDate(staff.leftDate ?? "")}</div>
                <div><span className="text-muted-foreground">Reason:</span> {staff.leftReason}</div>
              </div>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
