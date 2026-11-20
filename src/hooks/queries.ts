// React Query hooks — one per API resource. Data is cached and shared across
// pages (e.g. products are fetched once for the Products page and # search).
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  BankResponse,
  Business,
  BusinessUpdate,
  Dashboard,
  Debt,
  Expense,
  Invoice,
  LoginRequest,
  LowStockItem,
  Me,
  Period,
  Product,
  Reports,
  Sale,
  StockRecord,
  SignupRequest,
  SuppliersResponse,
  WriteResult,
} from "@/data/types";

export const queryKeys = {
  business: ["business"] as const,
  dashboard: ["dashboard"] as const,
  products: ["products"] as const,
  lowStock: ["products", "low"] as const,
  stockRecords: (p: Period) => ["stock-records", p] as const,
  sales: (p: Period) => ["sales", p] as const,
  expenses: (p: Period) => ["expenses", p] as const,
  debts: ["debts"] as const,
  suppliers: ["suppliers"] as const,
  invoices: ["invoices"] as const,
  reports: ["reports"] as const,
  bank: ["bank"] as const,
};

export const useBusiness = () => useQuery({ queryKey: queryKeys.business, queryFn: () => api.get<Business>("business") });
export const useDashboard = () => useQuery({ queryKey: queryKeys.dashboard, queryFn: () => api.get<Dashboard>("dashboard") });
export const useProducts = () => useQuery({ queryKey: queryKeys.products, queryFn: () => api.get<Product[]>("products") });
export const useLowStock = () => useQuery({ queryKey: queryKeys.lowStock, queryFn: () => api.get<LowStockItem[]>("products?view=low") });
export const useDebts = () => useQuery({ queryKey: queryKeys.debts, queryFn: () => api.get<Debt[]>("debts") });
export const useSuppliers = () => useQuery({ queryKey: queryKeys.suppliers, queryFn: () => api.get<SuppliersResponse>("suppliers") });
export const useInvoices = () => useQuery({ queryKey: queryKeys.invoices, queryFn: () => api.get<Invoice[]>("invoices") });
export const useReports = () => useQuery({ queryKey: queryKeys.reports, queryFn: () => api.get<Reports>("reports") });
export const useBank = () => useQuery({ queryKey: queryKeys.bank, queryFn: () => api.get<BankResponse>("bank") });

// Period-filtered lists keep showing the previous period while the next one loads.
export const useStockRecords = (period: Period) =>
  useQuery({
    queryKey: queryKeys.stockRecords(period),
    queryFn: () => api.get<StockRecord[]>(`stock-records?period=${period}`),
    placeholderData: keepPreviousData,
  });
export const useSales = (period: Period) =>
  useQuery({ queryKey: queryKeys.sales(period), queryFn: () => api.get<Sale[]>(`sales?period=${period}`), placeholderData: keepPreviousData });
export const useExpenses = (period: Period) =>
  useQuery({ queryKey: queryKeys.expenses(period), queryFn: () => api.get<Expense[]>(`expenses?period=${period}`), placeholderData: keepPreviousData });

export function useReconcile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: string) => api.post<BankResponse>("bank", { transactionId }),
    onSuccess: (data) => qc.setQueryData(queryKeys.bank, data),
  });
}

export function useUpdateBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (update: BusinessUpdate) => api.put<Business>("business", update),
    onSuccess: (data) => qc.setQueryData(queryKeys.business, data),
  });
}

// ---- Auth ----

export const meKey = ["me"] as const;

/** The signed-in user, or null when logged out. */
export const useMe = () => useQuery({ queryKey: meKey, queryFn: () => api.get<Me | null>("auth/me"), staleTime: 5 * 60_000 });

function useAuthMutation<T>(path: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: T) => api.post<{ ok: true }>(path, body),
    // a different user may now be signed in: drop every cached record
    onSuccess: async () => {
      qc.removeQueries();
      await qc.fetchQuery({ queryKey: meKey, queryFn: () => api.get<Me | null>("auth/me") });
    },
  });
}

export const useLogin = () => useAuthMutation<LoginRequest>("auth/login");
export const useSignup = () => useAuthMutation<SignupRequest>("auth/signup");

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ ok: true }>("auth/logout", {}),
    onSettled: () => {
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
      qc.setQueryData(meKey, null);
    },
  });
}

// ---- Creating records (forms) ----

/** POST a new record, then refresh every screen that shows records. */
export function useCreateRecord(path: "products" | "sales" | "expenses" | "debts") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<WriteResult>(path, body),
    onSuccess: () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "me" }),
  });
}
