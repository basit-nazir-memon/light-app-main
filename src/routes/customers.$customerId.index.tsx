import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Car, ExternalLink } from "lucide-react";
import { useCustomer, useVehicles, useInvoices } from "@/lib/store";
import { invoiceTotal } from "@/lib/mockData";
import { fmtDate, gbp } from "@/lib/currency";

export const Route = createFileRoute("/customers/$customerId/")({
  component: ViewCustomerPage,
});

function ViewCustomerPage() {
  const { customerId } = Route.useParams();
  const { data: customer, isLoading, isError } = useCustomer(customerId);
  const { data: vehicles = [] } = useVehicles();
  const { data: invoices = [] } = useInvoices();

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

  const customerVehicles = vehicles.filter((v) => v.customerId === customerId);
  const customerInvoices = invoices.filter((i) => i.customerId === customerId);
  const lifetimeSpend = customerInvoices.reduce((s, i) => s + invoiceTotal(i).total, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/customers">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">{customer.name}</h1>
              <p className="text-muted-foreground text-sm mt-1">Customer since {fmtDate(customer.createdAt)}</p>
            </div>
          </div>
          <Button asChild>
            <Link to="/customers/$customerId/edit" params={{ customerId }}>
              <Pencil className="size-4 mr-2" />
              Edit customer
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Vehicles</div>
              <div className="text-2xl font-bold mt-1">{customerVehicles.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Invoices</div>
              <div className="text-2xl font-bold mt-1">{customerInvoices.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Lifetime spend</div>
              <div className="text-2xl font-bold mt-1 text-primary">{gbp(lifetimeSpend)}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="font-semibold mb-4">Contact</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              {customer.email || "—"}
            </div>
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" />
              {customer.phone || "—"}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-muted-foreground" />
              {customer.address || "—"}
            </div>
          </div>
          {customer.notes && (
            <p className="text-sm text-muted-foreground mt-4 border-t pt-4">{customer.notes}</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Car className="size-4" />
            Vehicles
          </h2>
          {customerVehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vehicles on file.</p>
          ) : (
            <ul className="space-y-2">
              {customerVehicles.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded-lg text-sm"
                >
                  <div>
                    <Link
                      to="/vehicles/$vehicleId"
                      params={{ vehicleId: v.id }}
                      className="font-medium text-primary hover:underline inline-flex items-center gap-1.5"
                    >
                      {v.reg}
                      <ExternalLink className="size-3.5 opacity-70" />
                    </Link>
                    <span className="text-muted-foreground ml-2">
                      {v.year} {v.make} {v.model}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-4">Recent invoices</h2>
          {customerInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <ul className="divide-y">
              {customerInvoices.slice(0, 8).map((i) => (
                <li key={i.id} className="flex justify-between py-3 text-sm">
                  <div>
                    <Link
                      to="/invoices/$invoiceId"
                      params={{ invoiceId: i.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {i.number}
                    </Link>
                    <div className="text-xs text-muted-foreground">{fmtDate(i.issuedAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{gbp(invoiceTotal(i).total)}</div>
                    <div className="text-xs text-muted-foreground">{i.status}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
