export type ReportCategory =
  | "financial"
  | "operations"
  | "sales"
  | "customers"
  | "vehicles";

export type ReportDefinition = {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
};

export const REPORT_CATALOG: ReportDefinition[] = [
  {
    id: "financial-overview",
    title: "Financial Overview",
    description: "Revenue, parts and labour from invoices, with monthly breakdown charts.",
    category: "financial",
  },
  {
    id: "revenue-growth",
    title: "Revenue & Growth Trends",
    description: "Month-on-month revenue growth percentages and trend lines.",
    category: "financial",
  },
  {
    id: "parts-analysis",
    title: "Parts Revenue",
    description: "Parts sales by line item from invoices, monthly parts vs labour split.",
    category: "financial",
  },
  {
    id: "labour-analysis",
    title: "Labour Revenue",
    description: "Labour charges by description from invoices in the selected period.",
    category: "financial",
  },
  {
    id: "jobs-performance",
    title: "Jobs Performance",
    description: "Job counts by status, completion rates, and full job register.",
    category: "operations",
  },
  {
    id: "mechanics-performance",
    title: "Mechanics Performance",
    description: "Assigned job card counts per mechanic from live job data in the selected period.",
    category: "operations",
  },
  {
    id: "invoices-summary",
    title: "Invoices Summary",
    description: "Invoice status breakdown, outstanding balances, and invoice register.",
    category: "sales",
  },
  {
    id: "quotes-summary",
    title: "Quotations Summary",
    description: "Quote pipeline by status, conversion metrics, and quote register.",
    category: "sales",
  },
  {
    id: "customers-behavior",
    title: "Customer Behaviour",
    description: "Spend patterns, quote frequency, repeat customers, and top spenders.",
    category: "customers",
  },
  {
    id: "vehicles-analysis",
    title: "Customer Vehicles",
    description: "Most serviced registrations and vehicle activity in the period.",
    category: "vehicles",
  },
];

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  financial: "Financial",
  operations: "Jobs & Operations",
  sales: "Quotes & Invoices",
  customers: "Customers",
  vehicles: "Vehicles",
};
