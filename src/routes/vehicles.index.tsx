import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Car, Calendar, Gauge, Fuel, Eye, Pencil } from "lucide-react";
import { useVehiclesList, useCustomers, useAddVehicle } from "@/lib/store";
import { type Vehicle } from "@/lib/mockData";
import { fmtDate } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { VehicleForm, emptyVehicleForm, type VehicleFormValues } from "@/components/VehicleForm";
import { toast } from "sonner";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ListPagination } from "@/components/ListPagination";

export const Route = createFileRoute("/vehicles/")({ component: VehiclesPage });

const PAGE_SIZE = 12;

function VehiclesPage() {
  const { data: customers = [] } = useCustomers();
  const addMut = useAddVehicle();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [fuel, setFuel] = useState<string>("all");
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, fuel]);

  const { data, isLoading } = useVehiclesList({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    fuel: fuel === "all" ? undefined : fuel,
  });
  const vehicles = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Vehicles</h1>
            <p className="text-muted-foreground text-sm mt-1">{total} vehicles on file</p>
          </div>
          <AddVehicleDialog
            customers={customers}
            onAdd={(v) =>
              addMut.mutate(v, {
                onSuccess: () => toast.success("Vehicle added"),
                onError: (e) => toast.error(e.message),
              })
            }
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by reg, make, model, owner…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={fuel} onValueChange={setFuel}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fuel Types</SelectItem>
              <SelectItem value="Petrol">Petrol</SelectItem>
              <SelectItem value="Diesel">Diesel</SelectItem>
              <SelectItem value="Hybrid">Hybrid</SelectItem>
              <SelectItem value="Electric">Electric</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading && (
            <p className="text-sm text-muted-foreground col-span-full text-center py-12">Loading…</p>
          )}
          {!isLoading &&
            vehicles.map((v) => {
              const motSoon = v.motExpiry
                ? new Date(v.motExpiry).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 60
                : false;
              return (
                <Card
                  key={v.id}
                  className="overflow-hidden hover:shadow-[var(--shadow-elegant)] transition-shadow group"
                >
                  <div className="h-20 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent flex items-center justify-between px-4">
                    <Link to="/vehicles/$vehicleId" params={{ vehicleId: v.id }} className="hover:opacity-90">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Reg</div>
                      <div className="font-display text-lg font-bold tracking-wider text-primary">{v.reg}</div>
                    </Link>
                    <Car className="size-9 text-primary/40 group-hover:text-primary transition-colors" />
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <div>
                      <div className="font-semibold text-sm">
                        {v.year} {v.make} {v.model}
                      </div>
                      <div className="text-xs text-muted-foreground">Owner: {v.customerName ?? "—"}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <div className="flex items-center gap-1">
                        <Gauge className="size-3 text-muted-foreground shrink-0" />
                        {v.mileage.toLocaleString()} mi
                      </div>
                      <div className="flex items-center gap-1">
                        <Fuel className="size-3 text-muted-foreground shrink-0" />
                        {v.fuel}
                      </div>
                      <div className="flex items-center gap-1 col-span-2">
                        <Calendar className="size-3 text-muted-foreground shrink-0" />
                        MOT {v.motExpiry ? fmtDate(v.motExpiry) : "—"}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <Badge variant="outline" className="text-[10px]">
                        {v.serviceCount ?? 0} services
                      </Badge>
                      {motSoon && (
                        <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30 text-[10px]">
                          MOT soon
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" asChild>
                        <Link to="/vehicles/$vehicleId" params={{ vehicleId: v.id }}>
                          <Eye className="size-3.5 mr-1" />
                          View
                        </Link>
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                        <Link to="/vehicles/$vehicleId/edit" params={{ vehicleId: v.id }}>
                          <Pencil className="size-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        {!isLoading && vehicles.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">No vehicles found.</p>
        )}

        <ListPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>
    </AppLayout>
  );
}

function AddVehicleDialog({
  customers,
  onAdd,
}: {
  customers: import("@/lib/mockData").Customer[];
  onAdd: (v: Omit<Vehicle, "id">) => void;
}) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<VehicleFormValues>(emptyVehicleForm());
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" />
          Add Vehicle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Vehicle</DialogTitle>
        </DialogHeader>
        <VehicleForm
          value={f}
          onChange={setF}
          customers={customers}
          submitLabel="Save vehicle"
          onSubmit={() => {
            if (!f.reg || !f.customerId) return toast.error("Registration and owner required");
            onAdd({
              reg: f.reg,
              make: f.make,
              model: f.model,
              year: f.year,
              vin: f.vin,
              mileage: f.mileage,
              fuel: f.fuel,
              transmission: f.transmission,
              customerId: f.customerId,
              motExpiry: f.motExpiry ?? "",
              notes: f.notes,
            });
            setOpen(false);
            setF(emptyVehicleForm());
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
