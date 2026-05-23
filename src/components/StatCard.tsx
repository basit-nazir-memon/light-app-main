import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

export function StatCard({
  label, value, delta, icon: Icon, spark, accent = "primary",
}: {
  label: string;
  value: string;
  delta?: { value: string; up: boolean };
  icon: LucideIcon;
  spark?: { v: number }[];
  accent?: "primary" | "success" | "warning" | "destructive";
}) {
  const accentClass = {
    primary: "from-primary/15 to-primary/0 text-primary",
    success: "from-success/15 to-success/0 text-success",
    warning: "from-warning/20 to-warning/0 text-warning",
    destructive: "from-destructive/15 to-destructive/0 text-destructive",
  }[accent];

  return (
    <Card className="relative overflow-hidden p-5 hover:shadow-[var(--shadow-elegant)] transition-shadow">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", accentClass)} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className="mt-2 text-2xl font-display font-bold">{value}</div>
          {delta && (
            <div className={cn("mt-1 text-xs font-medium", delta.up ? "text-success" : "text-destructive")}>
              {delta.up ? "▲" : "▼"} {delta.value} vs last month
            </div>
          )}
        </div>
        <div className={cn("size-10 rounded-xl grid place-items-center bg-card/80 backdrop-blur", accentClass)}>
          <Icon className="size-5" />
        </div>
      </div>
      {spark && (
        <div className="relative h-10 mt-3 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark}>
              <defs>
                <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="currentColor" strokeWidth={2} fill={`url(#g-${label})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
