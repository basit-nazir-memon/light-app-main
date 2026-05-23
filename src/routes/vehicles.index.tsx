import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Car, Calendar, Gauge, Fuel, Eye, Pencil } from "lucide-react";
import { useVehicles, useJobs, useCustomers, useAddVehicle } from "@/lib/store";
import { findCustomer, type Vehicle } from "@/lib/mockData";
import { fmtDate } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { VehicleForm, emptyVehicleForm, type VehicleFormValues } from "@/components/VehicleForm";
import { toast } from "sonner";

export const Route = createFileRoute("/vehicles/")({ component: VehiclesPage });

function VehiclesPage() {
  const { data: vehicles = [] } = useVehicles();
  const { data: jobs = [] } = useJobs();
  const { data: customers = [] } = useCustomers();
  const addMut = useAddVehicle();

  const [q, setQ] = useState("");
  const [fuel, setFuel] = useState<string>("all");
  const filtered = vehicles.filter((v) =>
    (fuel === "all" || v.fuel === fuel) &&
    [v.reg, v.make, v.model, v.vin].join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Vehicles</h1>
            <p className="text-muted-foreground text-sm mt-1">{vehicles.length} vehicles on file</p>
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
            <Input placeholder="Search by reg, make, VIN…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={fuel} onValueChange={setFuel}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fuel Types</SelectItem>
              <SelectItem value="Petrol">Petrol</SelectItem>
              <SelectItem value="Diesel">Diesel</SelectItem>
              <SelectItem value="Hybrid">Hybrid</SelectItem>
              <SelectItem value="Electric">Electric</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => {
            const owner = findCustomer(customers, v.customerId);
            const serviceCount = jobs.filter((j) => j.vehicleId === v.id).length;
            const motSoon = v.motExpiry ? new Date(v.motExpiry).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 60 : false;
            return (
              <Card key={v.id} className="overflow-hidden hover:shadow-[var(--shadow-elegant)] transition-shadow group">
                <div className="h-24 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent flex items-center justify-between px-5">
                  <Link to="/vehicles/$vehicleId" params={{ vehicleId: v.id }} className="hover:opacity-90">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Reg</div>
                    <div className="font-display text-xl font-bold tracking-wider text-primary">{v.reg}</div>
                  </Link>
                  <Car className="size-12 text-primary/40 group-hover:text-primary transition-colors" />
                </div>
                <CardContent className="p-5 space-y-3">
                  <div>
                    <div className="font-semibold">{v.year} {v.make} {v.model}</div>
                    <div className="text-xs text-muted-foreground">Owner: {owner?.name ?? "—"}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5"><Gauge className="size-3.5 text-muted-foreground" />{v.mileage.toLocaleString()} mi</div>
                    <div className="flex items-center gap-1.5"><Fuel className="size-3.5 text-muted-foreground" />{v.fuel}</div>
                    <div className="flex items-center gap-1.5"><Calendar className="size-3.5 text-muted-foreground" />MOT {v.motExpiry ? fmtDate(v.motExpiry) : "—"}</div>
                    <div className="text-muted-foreground">{v.transmission}</div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Badge variant="outline" className="text-xs">{serviceCount} services</Badge>
                    {motSoon && <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30 text-xs">MOT due soon</Badge>}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <Link to="/vehicles/$vehicleId" params={{ vehicleId: v.id }}><Eye className="size-4 mr-1" />View</Link>
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/vehicles/$vehicleId/edit" params={{ vehicleId: v.id }}><Pencil className="size-4" /></Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
        <Button><Plus className="size-4 mr-2" />Add Vehicle</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Vehicle</DialogTitle></DialogHeader>
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
