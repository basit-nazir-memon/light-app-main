import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useMechanics } from "@/lib/store";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  required?: boolean;
  confirmLabel?: string;
  onConfirm: (mechanics: string[]) => void;
  loading?: boolean;
};

export function MechanicPickerDialog({
  open,
  onOpenChange,
  title,
  description,
  required = true,
  confirmLabel = "Confirm",
  onConfirm,
  loading,
}: Props) {
  const { data: mechanics = [] } = useMechanics("active");
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const handleConfirm = () => {
    onConfirm(selected);
    setSelected([]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSelected([]); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3 max-h-64 overflow-y-auto py-2">
          {mechanics.length === 0 && (
            <p className="text-sm text-muted-foreground">No active mechanics. Add staff first.</p>
          )}
          {mechanics.map((m) => (
            <label key={m.id} className="flex items-center gap-3 cursor-pointer rounded-lg border p-3 hover:bg-muted/50">
              <Checkbox
                checked={selected.includes(m.name)}
                onCheckedChange={() => toggle(m.name)}
              />
              <div>
                <div className="font-medium text-sm">{m.name}</div>
                {m.role && <div className="text-xs text-muted-foreground">{m.role}</div>}
              </div>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || (required && selected.length === 0)}
          >
            {loading ? "Please wait…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
