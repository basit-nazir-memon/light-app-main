import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Download, Pencil, Trash2, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { type Customer } from "@/lib/mockData";
import { useCustomersList, useAddCustomer, useDeleteCustomer } from "@/lib/store";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/currency";
import { toast } from "sonner";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ListPagination } from "@/components/ListPagination";

export const Route = createFileRoute("/customers/")({ component: CustomersPage });

const PAGE_SIZE = 20;

function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useCustomersList({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
  });
  const list = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const addMut = useAddCustomer();
  const delMut = useDeleteCustomer();

  const onAdd = (c: Omit<Customer, "id" | "createdAt">) =>
    addMut.mutate(c, {
      onSuccess: () => toast.success("Customer added"),
      onError: (e) => toast.error(e.message),
    });
  const onDelete = (id: string) =>
    delMut.mutate(id, {
      onSuccess: () => toast.success("Customer removed"),
      onError: (e) => toast.error(e.message),
    });

  const exportCsv = async () => {
    const rows = await api.get<Record<string, unknown>[]>(
      `/customers?all=1${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ""}`,
    );
    const csv = [
      "Name,Email,Phone,Address,Created",
      ...rows.map(
        (c) =>
          `"${c.name}","${c.email ?? ""}","${c.phone ?? ""}","${c.address ?? ""}",${String(c.created_at ?? "").slice(0, 10)}`,
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "customers.csv";
    a.click();
    toast.success("Exported CSV");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Customers</h1>
            <p className="text-muted-foreground text-sm mt-1">{total} customers</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}>
              <Download className="size-4 mr-2" />
              Export
            </Button>
            <AddCustomerDialog onAdd={onAdd} />
          </div>
        </div>

        <Card className="p-4">
          <div className="relative max-w-sm mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search customers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  list.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/30">
                      <TableCell>
                        <Link
                          to="/customers/$customerId"
                          params={{ customerId: c.id }}
                          className="font-medium text-primary hover:underline"
                        >
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{c.email}</div>
                        <div className="text-xs text-muted-foreground">{c.phone}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{c.address}</TableCell>
                      <TableCell className="text-sm">{fmtDate(c.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button size="icon" variant="ghost" asChild>
                            <Link to="/customers/$customerId" params={{ customerId: c.id }}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                          <Button size="icon" variant="ghost" asChild>
                            <Link to="/customers/$customerId/edit" params={{ customerId: c.id }}>
                              <Pencil className="size-4" />
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive">
                                <Trash2 className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete customer?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove {c.name} and cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(c.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            {!isLoading && list.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground">No customers found.</div>
            )}
          </div>

          <ListPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </Card>
      </div>
    </AppLayout>
  );
}

function AddCustomerDialog({ onAdd }: { onAdd: (c: Omit<Customer, "id" | "createdAt">) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-[var(--shadow-elegant)]">
          <Plus className="size-4 mr-2" />
          Add Customer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Customer</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Full name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!form.name) return toast.error("Name required");
              onAdd(form);
              setOpen(false);
              setForm({ name: "", phone: "", email: "", address: "", notes: "" });
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
