export type DashboardCounts = {
  customers: number;
  vehicles: number;
  quotes: number;
  pendingInvoices: number;
  activeJobs: number;
  completedJobs: number;
};

export type DashboardMonthlyPoint = {
  month: string;
  revenue: number;
};

export type DashboardNameValue = {
  name: string;
  value: number;
};

export type DashboardMechanicJobs = {
  name: string;
  jobs: number;
  completed: number;
};

export type DashboardRecentInvoice = {
  id: string;
  number: string;
  status: string;
  issuedAt: string;
  customerName: string;
  total: number;
};

export type DashboardRecentJob = {
  id: string;
  number: string;
  status: string;
  customerName: string;
  vehicleLabel: string;
  mechanic: string;
};

export type DashboardData = {
  counts: DashboardCounts;
  monthly: { income: number; partsSold: number };
  sparkline: { v: number }[];
  monthlyRevenue: DashboardMonthlyPoint[];
  invoiceStatusBreakdown: DashboardNameValue[];
  mechanicJobs: DashboardMechanicJobs[];
  recentInvoices: DashboardRecentInvoice[];
  recentJobs: DashboardRecentJob[];
};
