import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  Paid: "bg-success/15 text-success border-success/30",
  Unpaid: "bg-muted text-muted-foreground border-border",
  Overdue: "bg-destructive/15 text-destructive border-destructive/30",
  Partial: "bg-warning/20 text-warning border-warning/30",
  Created: "bg-muted text-muted-foreground border-border",
  "Work in Progress": "bg-primary/15 text-primary border-primary/30",
  Completed: "bg-success/15 text-success border-success/30",
  Draft: "bg-muted text-muted-foreground border-border",
  Sent: "bg-primary/15 text-primary border-primary/30",
  Approved: "bg-success/15 text-success border-success/30",
  Rejected: "bg-destructive/15 text-destructive border-destructive/30",
  Active: "bg-success/15 text-success border-success/30",
  Left: "bg-muted text-muted-foreground border-border line-through",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium border", map[status] ?? "")}>
      {status}
    </Badge>
  );
}
