import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/auth";

// Centralized query keys so cache invalidation works across all components
export const SALES_QUERY_KEYS = {
  all: ["sales-crm"] as const,
  list: (params?: Record<string, string>) =>
    params ? (["sales-crm", params] as const) : (["sales-crm"] as const),
  dashboard: ["sales-dashboard"] as const,
};

/**
 * Fetch the list of sales for the current user/tenant.
 * Uses a single source of truth: ["sales-crm"] (with optional params).
 */
export function useSales(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: [...SALES_QUERY_KEYS.all, params ?? null],
    queryFn: () => apiFetch<{ sales: any[] }>(`/sales${qs}`),
    staleTime: 0, // Always re-fetch on focus/mount to keep dashboard cards/graphs fresh
    refetchOnWindowFocus: true,
  });
}

/**
 * Create a new sale. Invalidates EVERY relevant query key so the
 * dashboard cards, graphs, and tables update immediately.
 */
export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch<any>("/sales", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      // Invalidate all sales-related query keys so every component
      // (dashboard KPIs, sales vs leads graph, my performance,
      //  /sales list page, kanban, etc.) refetches.
      qc.invalidateQueries({ queryKey: ["sales-crm"] });
      qc.invalidateQueries({ queryKey: ["sales-dashboard"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}

/**
 * Update an existing sale. Same broad invalidation as create.
 */
export function useUpdateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiFetch<any>(`/sales/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-crm"] });
      qc.invalidateQueries({ queryKey: ["sales-dashboard"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}

/**
 * Delete a sale. Same broad invalidation.
 */
export function useDeleteSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<any>(`/sales/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-crm"] });
      qc.invalidateQueries({ queryKey: ["sales-dashboard"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}
