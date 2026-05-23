import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { VehicleForm, vehicleToFormValues, type VehicleFormValues } from "@/components/VehicleForm";
import { useVehicle, useCustomers, useUpdateVehicle } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/vehicles/$vehicleId/edit")({ component: EditVehiclePage });

function EditVehiclePage() {
  const { vehicleId } = Route.useParams();
  const navigate = useNavigate();
  const { data: vehicle, isLoading, isError } = useVehicle(vehicleId);
  const { data: customers = [] } = useCustomers();
  const updateMut = useUpdateVehicle();
  const [form, setForm] = useState<VehicleFormValues | null>(null);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-muted-foreground">Loading vehicle…</div>
      </AppLayout>
    );
  }

  if (isError || !vehicle) {
    return (
      <AppLayout>
        <div className="p-12 text-center">
          <p className="text-destructive">Vehicle not found.</p>
          <Button asChild className="mt-4"><Link to="/vehicles">Back to vehicles</Link></Button>
        </div>
      </AppLayout>
    );
  }

  const values = form ?? vehicleToFormValues(vehicle);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/vehicles/$vehicleId" params={{ vehicleId }}><ArrowLeft className="size-5" /></Link>
          </Button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Edit vehicle</h1>
            <p className="text-muted-foreground text-sm mt-1 font-mono text-primary">{vehicle.reg}</p>
          </div>
        </div>

        <VehicleForm
          mode="edit"
          value={values}
          onChange={(v) => setForm(v)}
          customers={customers}
          submitLabel="Save changes"
          loading={updateMut.isPending}
          onSubmit={() => {
            if (!values.reg.trim()) return toast.error("Registration is required");
            if (!values.customerId) return toast.error("Owner is required");
            updateMut.mutate(
              {
                id: vehicleId,
                reg: values.reg.trim(),
                make: values.make,
                model: values.model,
                year: values.year,
                vin: values.vin,
                mileage: values.mileage,
                fuel: values.fuel,
                transmission: values.transmission,
                customerId: values.customerId,
                motExpiry: vehicle.motExpiry,
                notes: values.notes,
              },
              {
                onSuccess: () => {
                  toast.success("Vehicle updated");
                  navigate({ to: "/vehicles/$vehicleId", params: { vehicleId } });
                },
                onError: (e) => toast.error(e.message),
              },
            );
          }}
        />
      </div>
    </AppLayout>
  );
}
