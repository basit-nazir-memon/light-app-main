// Live data layer backed by local Node.js API + SQLite.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import {
  fetchBusinessSettings,
  saveBusinessSettings,
  type BusinessSettings,
} from "./business-settings-api";
import type {
  Customer, Vehicle, Job, Invoice, Quote, Mechanic, Part,
} from "./mockData";
import type { DashboardData } from "./dashboard-types";

type Row = Record<string, unknown>;

const toCust = (r: Row): Customer => ({
  id: r.id as string,
  name: r.name as string,
  phone: (r.phone as string) ?? "",
  email: (r.email as string) ?? "",
  address: (r.address as string) ?? "",
  notes: (r.notes as string) ?? undefined,
  createdAt: String(r.created_at ?? "").slice(0, 10),
});
const toVeh = (r: Row): Vehicle => ({
  id: r.id as string,
  reg: r.reg as string,
  make: (r.make as string) ?? "",
  model: (r.model as string) ?? "",
  year: (r.year as number) ?? 0,
  vin: (r.vin as string) ?? "",
  mileage: (r.mileage as number) ?? 0,
  fuel: ((r.fuel as string) ?? "Petrol") as Vehicle["fuel"],
  transmission: ((r.transmission as string) ?? "Manual") as Vehicle["transmission"],
  customerId: (r.customer_id as string) ?? "",
  motExpiry: (r.mot_expiry as string) ?? "",
  notes: (r.notes as string) ?? undefined,
});
const toJob = (r: Row): Job => {
  let mechanics: string[] = [];
  if (Array.isArray(r.mechanics)) mechanics = r.mechanics as string[];
  else if (typeof r.mechanics === "string") {
    try {
      mechanics = JSON.parse(r.mechanics);
    } catch {
      mechanics = r.mechanic ? [String(r.mechanic)] : [];
    }
  }
  let workDetails: Job["workDetails"];
  const wd = r.work_details;
  if (wd && typeof wd === "object") workDetails = wd as Job["workDetails"];
  return {
    id: r.id as string,
    number: r.number as string,
    customerId: (r.customer_id as string) ?? "",
    vehicleId: (r.vehicle_id as string) ?? "",
    quoteId: (r.quote_id as string) ?? undefined,
    mechanic: (r.mechanic as string) ?? "",
    mechanics,
    workDetails,
    complaint: (r.complaint as string) ?? "",
    diagnostic: (r.diagnostic as string) ?? undefined,
    parts: (r.parts ?? []) as Part[],
    labourHours: Number(r.labour_hours ?? 0),
    labourRate: Number(r.labour_rate ?? 55),
    mileage: (r.mileage as number) ?? 0,
    status: r.status as Job["status"],
    eta: (r.eta as string) ?? "",
    createdAt: (r.created_at as string) ?? "",
    completedAt: (r.completed_at as string) ?? undefined,
    customerName: (r.customer_name as string) ?? undefined,
    vehicleReg: (r.vehicle_reg as string) ?? undefined,
    vehicleMake: (r.vehicle_make as string) ?? undefined,
    vehicleModel: (r.vehicle_model as string) ?? undefined,
    vehicleYear: (r.vehicle_year as number) ?? undefined,
  };
};
const toInv = (r: Row): Invoice => ({
  id: r.id as string,
  number: r.number as string,
  customerId: (r.customer_id as string) ?? "",
  vehicleId: (r.vehicle_id as string) ?? "",
  jobId: (r.job_id as string) ?? undefined,
  quoteId: (r.quote_id as string) ?? undefined,
  parts: (r.parts ?? []) as Part[],
  labourLines: (r.labour_lines ?? []) as Invoice["labourLines"],
  labour: Number(r.labour ?? 0),
  vatRate: Number(r.vat_rate ?? 20),
  status: r.status as Invoice["status"],
  paymentMethod: (r.payment_method as Invoice["paymentMethod"]) ?? undefined,
  dueDate: (r.due_date as string) ?? "",
  issuedAt: (r.issued_at as string) ?? "",
  paymentDate: (r.payment_date as string) ?? undefined,
  discountType: (r.discount_type as Invoice["discountType"]) ?? "none",
  discountValue: Number(r.discount_value ?? 0),
  warranty: (r.warranty as string) ?? undefined,
  notes: (r.notes as string) ?? undefined,
});
const toQuo = (r: Row): Quote => {
  const partsLines = (r.parts_lines ?? []) as Quote["partsLines"];
  const labourLines = (r.labour_lines ?? []) as Quote["labourLines"];
  return {
    id: r.id as string,
    number: r.number as string,
    customerId: (r.customer_id as string) ?? "",
    vehicleId: (r.vehicle_id as string) ?? "",
    partsLines,
    labourLines,
    partsSections: partsLines.length
      ? [{ category: "Parts & Materials", items: partsLines.map((p) => ({
          description: p.description,
          qty: p.qty,
          price: p.price,
        })) }]
      : [],
    labourSections: labourLines.length
      ? [{ category: "Labour", items: labourLines.map((l) => ({
          description: l.description,
          price: l.amount,
        })) }]
      : [],
    parts: partsLines.map((p) => ({ name: p.description, qty: p.qty, price: p.price })),
    labour: Number(r.labour ?? 0),
    vatRate: Number(r.vat_rate ?? 20),
    validUntil: (r.valid_until as string) ?? "",
    status: r.status as Quote["status"],
    warranty: (r.warranty as string) ?? undefined,
    notes: (r.notes as string) ?? undefined,
    discountType: (r.discount_type as Quote["discountType"]) ?? "none",
    discountValue: Number(r.discount_value ?? 0),
    createdAt: (r.created_at as string) ?? "",
  };
};
const toMech = (r: Row): Mechanic => ({
  id: r.id as string,
  name: r.name as string,
  email: (r.email as string) ?? undefined,
  phone: (r.phone as string) ?? undefined,
  role: (r.role as string) ?? undefined,
  notes: (r.notes as string) ?? undefined,
  jobsCompleted: (r.jobs_completed as number) ?? 0,
  rating: Number(r.rating ?? 5),
  status: (r.status as Mechanic["status"]) ?? "Active",
  leftDate: (r.left_date as string) ?? undefined,
  leftReason: (r.left_reason as string) ?? undefined,
  createdAt: (r.created_at as string) ?? "",
});

function invalidate(qc: ReturnType<typeof useQueryClient>, keys: string[]) {
  keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/dashboard"),
    staleTime: 60_000,
  });
}

export function useBusinessSettings() {
  return useQuery({
    queryKey: ["settings", "business"],
    queryFn: fetchBusinessSettings,
    staleTime: 60_000,
  });
}

export function useUpdateBusinessSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BusinessSettings) => saveBusinessSettings(data),
    onSuccess: () => invalidate(qc, ["settings"]),
  });
}

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ListQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

function listQueryString(params: ListQuery & Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search?.trim()) q.set("search", params.search.trim());
  for (const [k, v] of Object.entries(params)) {
    if (["page", "limit", "search"].includes(k)) continue;
    if (v !== undefined && v !== "" && v !== "all") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers", "all"],
    queryFn: async () => {
      const data = await api.get<Row[]>("/customers?all=1");
      return data.map(toCust);
    },
  });
}

export function useCustomersList(params: ListQuery) {
  return useQuery({
    queryKey: ["customers", "list", params],
    queryFn: async () => {
      const data = await api.get<Paginated<Row>>(`/customers${listQueryString(params)}`);
      return { ...data, items: data.items.map(toCust) };
    },
  });
}

export function useVehicles() {
  return useQuery({
    queryKey: ["vehicles", "all"],
    queryFn: async () => {
      const data = await api.get<Row[]>("/vehicles?all=1");
      return data.map(toVeh);
    },
  });
}

export type VehicleListItem = Vehicle & {
  customerName?: string;
  serviceCount?: number;
};

const toVehList = (r: Row): VehicleListItem => ({
  ...toVeh(r),
  customerName: (r.customer_name as string) ?? undefined,
  serviceCount: Number(r.service_count ?? 0),
});

export function useVehiclesList(params: ListQuery & { fuel?: string }) {
  return useQuery({
    queryKey: ["vehicles", "list", params],
    queryFn: async () => {
      const data = await api.get<Paginated<Row>>(`/vehicles${listQueryString(params)}`);
      return { ...data, items: data.items.map(toVehList) };
    },
  });
}

export function useJobs() {
  return useQuery({
    queryKey: ["jobs", "all"],
    queryFn: async () => {
      const data = await api.get<Row[]>("/jobs?all=1");
      return data.map(toJob);
    },
  });
}

export type JobBoardData = {
  created: Job[];
  workInProgress: Job[];
  completedRecent: Job[];
  completedTotal: number;
  completedLimit: number;
};

export function useJobsBoard() {
  return useQuery({
    queryKey: ["jobs", "board"],
    queryFn: async () => {
      const data = await api.get<{
        created: Row[];
        workInProgress: Row[];
        completedRecent: Row[];
        completedTotal: number;
        completedLimit: number;
      }>("/jobs/board");
      return {
        created: data.created.map(toJob),
        workInProgress: data.workInProgress.map(toJob),
        completedRecent: data.completedRecent.map(toJob),
        completedTotal: data.completedTotal,
        completedLimit: data.completedLimit,
      };
    },
  });
}

export function useJobsList(params: ListQuery & { boardStatus?: string }) {
  return useQuery({
    queryKey: ["jobs", "list", params],
    queryFn: async () => {
      const data = await api.get<Paginated<Row>>(`/jobs${listQueryString(params)}`);
      return { ...data, items: data.items.map(toJob) };
    },
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices", "all"],
    queryFn: async () => {
      const data = await api.get<Row[]>("/invoices?all=1");
      return data.map(toInv);
    },
  });
}

export type InvoiceListItem = Invoice & {
  customerName?: string;
  vehicleReg?: string;
  vehicleMake?: string;
  vehicleModel?: string;
};

const toInvList = (r: Row): InvoiceListItem => ({
  ...toInv(r),
  customerName: (r.customer_name as string) ?? undefined,
  vehicleReg: (r.vehicle_reg as string) ?? undefined,
  vehicleMake: (r.vehicle_make as string) ?? undefined,
  vehicleModel: (r.vehicle_model as string) ?? undefined,
});

export type InvoiceStats = {
  total: number;
  paid: number;
  unpaid: number;
  overdue: number;
  count: number;
};

export function useInvoiceStats() {
  return useQuery({
    queryKey: ["invoices", "stats"],
    queryFn: () => api.get<InvoiceStats>("/invoices/stats"),
  });
}

export function useInvoicesList(params: ListQuery & { status?: string }) {
  return useQuery({
    queryKey: ["invoices", "list", params],
    queryFn: async () => {
      const data = await api.get<Paginated<Row>>(`/invoices${listQueryString(params)}`);
      return { ...data, items: data.items.map(toInvList) };
    },
  });
}

export function useQuotes() {
  return useQuery({
    queryKey: ["quotes", "all"],
    queryFn: async () => {
      const data = await api.get<Row[]>("/quotes?all=1");
      return data.map(toQuo);
    },
  });
}

export type QuoteListItem = Quote & {
  customerName?: string;
  vehicleReg?: string;
  vehicleMake?: string;
  vehicleModel?: string;
};

const toQuoList = (r: Row): QuoteListItem => ({
  ...toQuo(r),
  customerName: (r.customer_name as string) ?? undefined,
  vehicleReg: (r.vehicle_reg as string) ?? undefined,
  vehicleMake: (r.vehicle_make as string) ?? undefined,
  vehicleModel: (r.vehicle_model as string) ?? undefined,
});

export function useQuotesList(params: ListQuery & { status?: string }) {
  return useQuery({
    queryKey: ["quotes", "list", params],
    queryFn: async () => {
      const data = await api.get<Paginated<Row>>(`/quotes${listQueryString(params)}`);
      return { ...data, items: data.items.map(toQuoList) };
    },
  });
}

export type MechanicFilter = "active" | "left" | "all";

export function useMechanics(status: MechanicFilter = "active") {
  return useQuery({
    queryKey: ["mechanics", status],
    queryFn: async () => {
      const data = await api.get<Row[]>(`/mechanics?status=${status}`);
      return data.map(toMech);
    },
  });
}

export function useAddMechanic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Omit<Mechanic, "id" | "status" | "createdAt" | "leftDate" | "leftReason">) => {
      await api.post("/mechanics", {
        name: m.name,
        email: m.email || null,
        phone: m.phone || null,
        role: m.role || null,
        notes: m.notes || null,
        jobs_completed: m.jobsCompleted,
        rating: m.rating,
      });
    },
    onSuccess: () => invalidate(qc, ["mechanics"]),
  });
}

export function useUpdateMechanic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...m
    }: Omit<Mechanic, "status" | "createdAt" | "leftDate" | "leftReason">) => {
      await api.patch(`/mechanics/${id}`, {
        name: m.name,
        email: m.email || null,
        phone: m.phone || null,
        role: m.role || null,
        notes: m.notes || null,
        jobs_completed: m.jobsCompleted,
        rating: m.rating,
      });
    },
    onSuccess: () => invalidate(qc, ["mechanics"]),
  });
}

export function useLeaveMechanic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      leftDate,
      leftReason,
    }: {
      id: string;
      leftDate: string;
      leftReason: string;
    }) => {
      await api.patch(`/mechanics/${id}/leave`, {
        left_date: leftDate,
        left_reason: leftReason,
      });
    },
    onSuccess: () => invalidate(qc, ["mechanics"]),
  });
}

export function useAddCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Omit<Customer, "id" | "createdAt">) => {
      await api.post("/customers", {
        name: c.name,
        phone: c.phone || null,
        email: c.email || null,
        address: c.address || null,
        notes: c.notes || null,
      });
    },
    onSuccess: () => invalidate(qc, ["customers", "dashboard"]),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/customers/${id}`);
    },
    onSuccess: () => invalidate(qc, ["customers", "vehicles", "jobs", "invoices", "quotes"]),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: async () => {
      const data = await api.get<Row>(`/customers/${id}`);
      return toCust(data);
    },
    enabled: !!id,
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...c }: Customer) => {
      await api.patch(`/customers/${id}`, {
        name: c.name,
        phone: c.phone || null,
        email: c.email || null,
        address: c.address || null,
        notes: c.notes || null,
      });
    },
    onSuccess: (_d, vars) => {
      invalidate(qc, ["customers"]);
      invalidate(qc, ["customers", vars.id]);
    },
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: ["vehicles", id],
    queryFn: async () => {
      const data = await api.get<Row>(`/vehicles/${id}`);
      return toVeh(data);
    },
    enabled: !!id,
  });
}

export function useAddVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: Omit<Vehicle, "id">) => {
      await api.post("/vehicles", {
        customer_id: v.customerId || null,
        reg: v.reg,
        make: v.make,
        model: v.model,
        year: v.year,
        vin: v.vin || null,
        mileage: v.mileage,
        fuel: v.fuel,
        transmission: v.transmission,
        mot_expiry: v.motExpiry || null,
        notes: v.notes || null,
      });
    },
    onSuccess: () => invalidate(qc, ["vehicles"]),
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...v }: Vehicle) => {
      await api.patch(`/vehicles/${id}`, {
        customer_id: v.customerId || null,
        reg: v.reg,
        make: v.make,
        model: v.model,
        year: v.year,
        vin: v.vin || null,
        mileage: v.mileage,
        fuel: v.fuel,
        transmission: v.transmission,
        mot_expiry: v.motExpiry || null,
        notes: v.notes || null,
      });
    },
    onSuccess: (_d, vars) => {
      invalidate(qc, ["vehicles"]);
      invalidate(qc, ["vehicles", vars.id]);
    },
  });
}

export function useAddJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (j: Omit<Job, "id" | "createdAt">) => {
      await api.post("/jobs", {
        number: j.number,
        customer_id: j.customerId,
        vehicle_id: j.vehicleId,
        mechanic: j.mechanic,
        complaint: j.complaint,
        diagnostic: j.diagnostic || null,
        parts: j.parts,
        labour_hours: j.labourHours,
        labour_rate: j.labourRate,
        mileage: j.mileage,
        status: j.status,
        eta: j.eta || null,
      });
    },
    onSuccess: () => invalidate(qc, ["jobs"]),
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ["jobs", id],
    queryFn: async () => {
      const data = await api.get<Row>(`/jobs/${id}`);
      return toJob(data);
    },
    enabled: !!id,
  });
}

export function useQuoteJob(quoteId: string) {
  return useQuery({
    queryKey: ["quotes", quoteId, "job"],
    queryFn: async () => {
      const data = await api.get<Row | null>(`/quotes/${quoteId}/job`);
      return data ? toJob(data) : null;
    },
    enabled: !!quoteId,
  });
}

export function useQuoteInvoice(quoteId: string) {
  return useQuery({
    queryKey: ["quotes", quoteId, "invoice"],
    queryFn: async () => {
      const data = await api.get<Row | null>(`/quotes/${quoteId}/invoice`);
      return data ? toInv(data) : null;
    },
    enabled: !!quoteId,
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: async () => {
      const data = await api.get<Row>(`/invoices/${id}`);
      return toInv(data);
    },
    enabled: !!id,
  });
}

export function useMarkInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      paymentDate,
      paymentMethod,
    }: {
      id: string;
      paymentDate: string;
      paymentMethod?: Invoice["paymentMethod"];
    }) => {
      return api.patch<Row>(`/invoices/${id}/mark-paid`, {
        payment_date: paymentDate,
        payment_method: paymentMethod ?? "Bank Transfer",
      });
    },
    onSuccess: (data, vars) => {
      const inv = toInv(data as Row);
      invalidate(qc, ["invoices", "invoices", vars.id, "quotes"]);
      if (inv.quoteId) {
        invalidate(qc, ["quotes", inv.quoteId, "quotes", inv.quoteId, "invoice"]);
      }
    },
  });
}

export function useUpdateJobStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      mechanics,
    }: {
      id: string;
      status: Job["status"];
      mechanics?: string[];
    }) => {
      await api.patch(`/jobs/${id}/status`, { status, mechanics });
    },
    onSuccess: (_d, vars) => {
      invalidate(qc, ["jobs", "jobs", vars.id, "quotes"]);
    },
  });
}

export function useJobCompleteAndInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      return api.post<{ job: Row; invoice: Row }>(`/jobs/${jobId}/complete-and-invoice`, {});
    },
    onSuccess: (_d, jobId) => {
      invalidate(qc, ["jobs", "jobs", jobId, "invoices", "quotes"]);
    },
  });
}

export function useQuoteReject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quoteId: string) => {
      await api.post(`/quotes/${quoteId}/reject`, {});
    },
    onSuccess: (_d, quoteId) => {
      invalidate(qc, ["quotes", "quotes", quoteId]);
    },
  });
}

export function useQuoteStartWork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ quoteId, mechanics }: { quoteId: string; mechanics: string[] }) => {
      return api.post<{ job: Row }>(`/quotes/${quoteId}/start-work`, { mechanics });
    },
    onSuccess: (_d, vars) => {
      invalidate(qc, ["quotes", "quotes", vars.quoteId, "quotes", vars.quoteId, "job", "jobs"]);
    },
  });
}

export function useQuoteConvertInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      quoteId,
      mechanics = [],
    }: {
      quoteId: string;
      mechanics?: string[];
    }) => {
      return api.post<{ job: Row; invoice: Row }>(`/quotes/${quoteId}/convert-invoice`, {
        mechanics,
      });
    },
    onSuccess: (_d, vars) => {
      invalidate(qc, ["quotes", "quotes", vars.quoteId, "quotes", vars.quoteId, "job", "quotes", vars.quoteId, "invoice", "jobs", "invoices"]);
    },
  });
}

export function useQuoteMarkPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      quoteId,
      mechanics = [],
      paymentDate,
      paymentMethod,
    }: {
      quoteId: string;
      mechanics?: string[];
      paymentDate: string;
      paymentMethod?: Invoice["paymentMethod"];
    }) => {
      return api.post<{ job: Row; invoice: Row }>(`/quotes/${quoteId}/mark-paid`, {
        mechanics,
        payment_date: paymentDate,
        payment_method: paymentMethod,
      });
    },
    onSuccess: (_d, vars) => {
      invalidate(qc, ["quotes", "quotes", vars.quoteId, "quotes", vars.quoteId, "job", "quotes", vars.quoteId, "invoice", "jobs", "invoices"]);
    },
  });
}

export function useAddInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: Omit<Invoice, "id">) => {
      await api.post("/invoices", {
        number: i.number,
        customer_id: i.customerId,
        vehicle_id: i.vehicleId,
        job_id: i.jobId || null,
        parts: i.parts,
        labour: i.labour,
        vat_rate: i.vatRate,
        status: i.status,
        payment_method: i.paymentMethod || null,
        due_date: i.dueDate || null,
        issued_at: i.issuedAt,
      });
    },
    onSuccess: () => invalidate(qc, ["invoices"]),
  });
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: ["quotes", id],
    queryFn: async () => {
      const data = await api.get<Row>(`/quotes/${id}`);
      return toQuo(data);
    },
    enabled: !!id,
  });
}

export function useNextQuoteNumber() {
  return useQuery({
    queryKey: ["quotes", "next-number"],
    queryFn: async () => {
      const data = await api.get<{ number: string }>("/quotes/next-number");
      return data.number;
    },
  });
}

export function useAddQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      await api.post("/quotes", body);
    },
    onSuccess: () => invalidate(qc, ["quotes"]),
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & Record<string, unknown>) => {
      await api.patch(`/quotes/${id}`, body);
    },
    onSuccess: (_d, vars) => {
      invalidate(qc, ["quotes"]);
      invalidate(qc, ["quotes", vars.id]);
    },
  });
}
