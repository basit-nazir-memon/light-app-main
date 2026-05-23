import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Customer } from "@/lib/mockData";

export type CustomerFormValues = {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

export function customerToFormValues(c: Customer): CustomerFormValues {
  return {
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    notes: c.notes ?? "",
  };
}

export const emptyCustomerForm = (): CustomerFormValues => ({
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
});

type Props = {
  value: CustomerFormValues;
  onChange: (v: CustomerFormValues) => void;
  onSubmit: () => void;
  submitLabel: string;
  loading?: boolean;
};

export function CustomerForm({ value, onChange, onSubmit, submitLabel, loading }: Props) {
  const set = (patch: Partial<CustomerFormValues>) => onChange({ ...value, ...patch });

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
          <CardTitle>Contact details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Full name</Label>
            <Input value={value.name} onChange={(e) => set({ name: e.target.value })} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Phone</Label>
              <Input value={value.phone} onChange={(e) => set({ phone: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input type="email" value={value.email} onChange={(e) => set({ email: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Address</Label>
            <Input value={value.address} onChange={(e) => set({ address: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea value={value.notes} onChange={(e) => set({ notes: e.target.value })} rows={4} />
          </div>
        </CardContent>
      </Card>
      <Button type="submit" disabled={loading} className="shadow-[var(--shadow-elegant)]">
        {submitLabel}
      </Button>
    </form>
  );
}
