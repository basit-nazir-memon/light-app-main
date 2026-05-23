import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2 } from "lucide-react";
import type { Customer, Vehicle, Quote, QuoteDiscountType } from "@/lib/mockData";
import { calcQuoteTotals } from "@/lib/mockData";
import {
  type QuotePayload,
  emptyPartLine,
  emptyLabourLine,
  syncPartAmount,
  syncLabourAmount,
} from "@/lib/quotes";
import { gbp } from "@/lib/currency";

type Props = {
  initial: QuotePayload;
  customers: Customer[];
  vehicles: Vehicle[];
  onSubmit: (payload: QuotePayload) => void;
  submitLabel: string;
  loading?: boolean;
};

export function QuoteForm({
  initial,
  customers,
  vehicles,
  onSubmit,
  submitLabel,
  loading,
}: Props) {
  const [form, setForm] = useState<QuotePayload>(initial);
  const customerVehicles = vehicles.filter((v) => v.customerId === form.customerId);

  const totals = calcQuoteTotals({
    partsLines: form.partsLines,
    labourLines: form.labourLines,
    vatRate: form.vatRate,
    discountType: form.discountType,
    discountValue: form.discountValue,
  } as Quote);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.vehicleId) return;
    onSubmit({
      ...form,
      partsLines: form.partsLines.map(syncPartAmount),
      labourLines: form.labourLines.map(syncLabourAmount),
    });
  };

  const updatePart = (index: number, patch: Partial<QuotePayload["partsLines"][0]>) => {
    const next = [...form.partsLines];
    next[index] = syncPartAmount({ ...next[index], ...patch });
    setForm({ ...form, partsLines: next });
  };

  const updateLabour = (index: number, patch: Partial<QuotePayload["labourLines"][0]>) => {
    const next = [...form.labourLines];
    next[index] = syncLabourAmount({ ...next[index], ...patch });
    setForm({ ...form, labourLines: next });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader><CardTitle>Quotation details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Customer *</Label>
            <Select
              value={form.customerId || undefined}
              onValueChange={(v) => setForm({ ...form, customerId: v, vehicleId: "" })}
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
            <Label>Vehicle *</Label>
            <Select
              value={form.vehicleId || undefined}
              onValueChange={(v) => setForm({ ...form, vehicleId: v })}
              disabled={!form.customerId}
            >
              <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
              <SelectContent>
                {customerVehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.reg} — {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Valid until *</Label>
            <Input
              type="date"
              value={form.validUntil}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label>VAT rate (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.vatRate}
              onChange={(e) => setForm({ ...form, vatRate: Number(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Parts &amp; materials</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setForm({ ...form, partsLines: [...form.partsLines, emptyPartLine()] })}
          >
            <Plus className="size-4 mr-1" />Add line
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.partsLines.length === 0 && (
            <p className="text-sm text-muted-foreground">No parts added yet.</p>
          )}
          {form.partsLines.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3 bg-muted/20">
              <div className="col-span-4 grid gap-1">
                <Label className="text-xs">Description</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updatePart(i, { description: e.target.value })}
                />
              </div>
              <div className="col-span-2 grid gap-1">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={item.qty}
                  onChange={(e) => updatePart(i, { qty: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-2 grid gap-1">
                <Label className="text-xs">Price (GBP)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={item.price}
                  onChange={(e) => updatePart(i, { price: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-3 grid gap-1">
                <Label className="text-xs">Amount (GBP)</Label>
                <Input value={gbp(item.qty * item.price)} readOnly className="bg-muted font-medium" />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="col-span-1 text-destructive"
                onClick={() => setForm({ ...form, partsLines: form.partsLines.filter((_, j) => j !== i) })}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Labour</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setForm({ ...form, labourLines: [...form.labourLines, emptyLabourLine()] })}
          >
            <Plus className="size-4 mr-1" />Add line
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.labourLines.length === 0 && (
            <p className="text-sm text-muted-foreground">No labour lines added yet.</p>
          )}
          {form.labourLines.map((item, i) => (
            <div key={i} className="rounded-lg border p-3 bg-muted/20 space-y-3">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5 grid gap-1">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateLabour(i, { description: e.target.value })}
                  />
                </div>
                <div className="col-span-2 grid gap-1">
                  <Label className="text-xs">Rate (GBP)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.rate}
                    onChange={(e) => updateLabour(i, { rate: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2 grid gap-1">
                  <Label className="text-xs">Hours</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.25}
                    value={item.hours}
                    disabled={item.fixedRate}
                    onChange={(e) => updateLabour(i, { hours: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2 grid gap-1">
                  <Label className="text-xs">Amount (GBP)</Label>
                  <Input value={gbp(item.amount)} readOnly className="bg-muted font-medium" />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setForm({ ...form, labourLines: form.labourLines.filter((_, j) => j !== i) })}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={item.fixedRate}
                  onCheckedChange={(c) => updateLabour(i, { fixedRate: c === true })}
                />
                Fixed rate (use rate only, ignore hours)
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Warranty &amp; notes</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Warranty</Label>
            <Textarea
              value={form.warranty ?? ""}
              onChange={(e) => setForm({ ...form, warranty: e.target.value })}
              rows={3}
              placeholder="Warranty terms for parts and labour…"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Additional terms or instructions…"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Discount on total</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={form.discountType}
            onValueChange={(v) =>
              setForm({
                ...form,
                discountType: v as QuoteDiscountType,
                discountValue: v === "none" ? 0 : form.discountValue,
              })
            }
            className="flex flex-wrap gap-4"
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="none" /> Nil
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="flat" /> Flat amount (GBP)
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="percentage" /> Percentage (%)
            </label>
          </RadioGroup>
          {form.discountType !== "none" && (
            <div className="grid gap-1.5 max-w-xs">
              <Label>
                {form.discountType === "flat" ? "Discount amount (GBP)" : "Discount (%)"}
              </Label>
              <Input
                type="number"
                min={0}
                step={form.discountType === "percentage" ? 0.1 : 0.01}
                max={form.discountType === "percentage" ? 100 : undefined}
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6 space-y-2 text-sm">
          <div className="flex justify-between"><span>Parts subtotal</span><span>{gbp(totals.partsSub)}</span></div>
          <div className="flex justify-between"><span>Labour subtotal</span><span>{gbp(totals.labourSub)}</span></div>
          <div className="flex justify-between"><span>Subtotal</span><span>{gbp(totals.sub)}</span></div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-destructive">
              <span>Discount</span><span>-{gbp(totals.discount)}</span>
            </div>
          )}
          <div className="flex justify-between"><span>VAT ({form.vatRate}%)</span><span>{gbp(totals.vat)}</span></div>
          <div className="flex justify-between text-lg font-bold text-primary border-t pt-2">
            <span>Total (GBP)</span><span>{gbp(totals.total)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading} className="min-w-[160px]">
          {loading ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export { defaultQuotePayload } from "@/lib/quotes";
