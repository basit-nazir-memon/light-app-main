import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CustomerForm, customerToFormValues } from "@/components/CustomerForm";
import { useCustomer, useUpdateCustomer } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/customers/$customerId/edit")({
  component: EditCustomerPage,
});

function EditCustomerPage() {
  const { customerId } = Route.useParams();
  const navigate = useNavigate();
  const { data: customer, isLoading, isError } = useCustomer(customerId);
  const updateMut = useUpdateCustomer();
  const [form, setForm] = useState<ReturnType<typeof customerToFormValues> | null>(null);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-muted-foreground">Loading customer…</div>
      </AppLayout>
    );
  }

  if (isError || !customer) {
    return (
      <AppLayout>
        <div className="p-12 text-center">
          <p className="text-destructive">Customer not found.</p>
          <Button asChild className="mt-4">
            <Link to="/customers">Back to customers</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const values = form ?? customerToFormValues(customer);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/customers/$customerId" params={{ customerId }}>
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Edit customer</h1>
            <p className="text-muted-foreground text-sm mt-1">{customer.name}</p>
          </div>
        </div>

        <CustomerForm
          value={values}
          onChange={setForm}
          submitLabel="Save changes"
          loading={updateMut.isPending}
          onSubmit={() => {
            if (!values.name.trim()) return toast.error("Name is required");
            updateMut.mutate(
              {
                ...customer,
                name: values.name.trim(),
                phone: values.phone,
                email: values.email,
                address: values.address,
                notes: values.notes || undefined,
              },
              {
                onSuccess: () => {
                  toast.success("Customer updated");
                  navigate({ to: "/customers/$customerId", params: { customerId } });
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
