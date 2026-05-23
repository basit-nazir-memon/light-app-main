export type DateRangePreset = "all" | "month" | "year" | "custom";

export type DateRange = {
  preset: DateRangePreset;
  month?: string;
  year?: string;
  from?: string;
  to?: string;
};

export function parseMonthKey(iso: string): Date | null {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getRangeBounds(range: DateRange): {
  start: Date | null;
  end: Date | null;
  label: string;
} {
  if (range.preset === "all") {
    return { start: null, end: null, label: "All time" };
  }
  if (range.preset === "month" && range.month) {
    const [y, m] = range.month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);
    const fmt = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
    return { start, end, label: fmt.format(start) };
  }
  if (range.preset === "year" && range.year) {
    const y = Number(range.year);
    return {
      start: new Date(y, 0, 1),
      end: new Date(y, 11, 31, 23, 59, 59, 999),
      label: `Year ${y}`,
    };
  }
  if (range.preset === "custom" && range.from && range.to) {
    const [fy, fm] = range.from.split("-").map(Number);
    const [ty, tm] = range.to.split("-").map(Number);
    const start = new Date(fy, fm - 1, 1);
    const end = new Date(ty, tm, 0, 23, 59, 59, 999);
    return { start, end, label: `${range.from} – ${range.to}` };
  }
  return { start: null, end: null, label: "All time" };
}

export function inDateRange(iso: string, start: Date | null, end: Date | null): boolean {
  if (!start && !end) return true;
  const d = parseMonthKey(iso);
  if (!d) return false;
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
}

export function currentMonthValue(): string {
  const n = new Date();
  return monthKey(n);
}

export function yearOptions(count = 5): string[] {
  const y = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => String(y - i));
}

export function monthOptions(): { value: string; label: string }[] {
  const fmt = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ value: monthKey(d), label: fmt.format(d) });
  }
  return out;
}
