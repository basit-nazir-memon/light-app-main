import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Customer, Vehicle } from "@/lib/mockData";

export type VehicleFormValues = {
  reg: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  mileage: number;
  fuel: Vehicle["fuel"];
  transmission: Vehicle["transmission"];
  customerId: string;
  notes?: string;
  motExpiry?: string;
};

type Props = {
  value: VehicleFormValues;
  onChange: (v: VehicleFormValues) => void;
  customers: Customer[];
  onSubmit: () => void;
  submitLabel: string;
  loading?: boolean;
  /** Edit mode: vehicle details only — no date pickers */
  mode?: "create" | "edit";
};

export function VehicleForm({
  value,
  onChange,
  customers,
  onSubmit,
  submitLabel,
  loading,
  mode = "create",
}: Props) {
  const set = (patch: Partial<VehicleFormValues>) => onChange({ ...value, ...patch });
  const isEdit = mode === "edit";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-6 max-w-3xl"
    >
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Vehicle details" : "Registration & identity"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="reg">Registration number *</Label>
            <Input
              id="reg"
              value={value.reg}
              onChange={(e) => set({ reg: e.target.value.toUpperCase() })}
              placeholder="e.g. AB12 CDE"
              className="font-mono text-lg tracking-wider"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="make">Make</Label>
            <Input
              id="make"
              value={value.make}
              onChange={(e) => set({ make: e.target.value })}
              placeholder="e.g. BMW"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={value.model}
              onChange={(e) => set({ model: e.target.value })}
              placeholder="e.g. 320d"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              type="number"
              min={1980}
              max={new Date().getFullYear() + 1}
              value={value.year || ""}
              onChange={(e) => set({ year: Number(e.target.value) || 0 })}
              placeholder="e.g. 2019"
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="vin">VIN</Label>
            <Input
              id="vin"
              value={value.vin}
              onChange={(e) => set({ vin: e.target.value.toUpperCase() })}
              className="font-mono text-sm"
              placeholder="Vehicle identification number"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Type &amp; mileage</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="mileage">Mileage (miles)</Label>
            <Input
              id="mileage"
              type="number"
              min={0}
              step={1}
              value={value.mileage}
              onChange={(e) => set({ mileage: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Fuel type</Label>
            <Select value={value.fuel} onValueChange={(v) => set({ fuel: v as Vehicle["fuel"] })}>
              <SelectTrigger><SelectValue placeholder="Select fuel type" /></SelectTrigger>
              <SelectContent>
                {(["Petrol", "Diesel", "Hybrid", "Electric"] as const).map((x) => (
                  <SelectItem key={x} value={x}>{x}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Transmission type</Label>
            <Select
              value={value.transmission}
              onValueChange={(v) => set({ transmission: v as Vehicle["transmission"] })}
            >
              <SelectTrigger><SelectValue placeholder="Select transmission" /></SelectTrigger>
              <SelectContent>
                {(["Manual", "Automatic"] as const).map((x) => (
                  <SelectItem key={x} value={x}>{x}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!isEdit && (
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="mot">MOT expiry</Label>
              <Input
                id="mot"
                type="date"
                value={value.motExpiry ?? ""}
                onChange={(e) => set({ motExpiry: e.target.value })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Owner &amp; notes</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Owner *</Label>
            <Select
              value={value.customerId || undefined}
              onValueChange={(v) => set({ customerId: v })}
            >
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={value.notes ?? ""}
              onChange={(e) => set({ notes: e.target.value })}
              rows={3}
              placeholder="Service notes, known issues…"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={loading} className="min-w-[140px]">
          {loading ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function emptyVehicleForm(): VehicleFormValues & { motExpiry?: string } {
  return {
    reg: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    vin: "",
    mileage: 0,
    fuel: "Petrol",
    transmission: "Manual",
    customerId: "",
    motExpiry: "",
    notes: "",
  };
}

export function vehicleToFormValues(v: Vehicle): VehicleFormValues {
  return {
    reg: v.reg,
    make: v.make,
    model: v.model,
    year: v.year,
    vin: v.vin,
    mileage: v.mileage,
    fuel: v.fuel,
    transmission: v.transmission,
    customerId: v.customerId,
    notes: v.notes ?? "",
  };
}
