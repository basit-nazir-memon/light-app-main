import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Customer } from "@/lib/mockData";
import {
  hasCustomerContactErrors,
  sanitizeCustomerPhoneInput,
  validateCustomerContact,
  type CustomerContactErrors,
} from "@/lib/customer-validation";

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
  const [errors, setErrors] = useState<CustomerContactErrors>({});
  const set = (patch: Partial<CustomerFormValues>) => {
    onChange({ ...value, ...patch });
    if (patch.phone !== undefined && errors.phone) {
      setErrors((e) => ({ ...e, phone: undefined }));
    }
    if (patch.email !== undefined && errors.email) {
      setErrors((e) => ({ ...e, email: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateCustomerContact(value.phone, value.email);
    if (hasCustomerContactErrors(nextErrors)) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
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
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+44 7700 900123"
                value={value.phone}
                onChange={(e) => set({ phone: sanitizeCustomerPhoneInput(e.target.value) })}
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={value.email}
                onChange={(e) => set({ email: e.target.value })}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
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
