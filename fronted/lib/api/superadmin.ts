import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/auth";

export function useSuperAdminOverview() {
  return useQuery({
    queryKey: ["superadmin", "overview"],
    queryFn: () => apiFetch<any>("/superadmin/dashboard/overview"),
    staleTime: 30_000,
  });
}

export function useSuperAdminAnalytics(period = "30d") {
  return useQuery({
    queryKey: ["superadmin", "analytics", period],
    queryFn: () => apiFetch<any>(`/superadmin/analytics?period=${period}`),
    staleTime: 60_000,
  });
}

export function useSuperAdminActivity(limit = 50) {
  return useQuery({
    queryKey: ["superadmin", "activity", limit],
    queryFn: () => apiFetch<any>(`/superadmin/activity-feed?limit=${limit}`),
    staleTime: 15_000,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ["superadmin", "health"],
    queryFn: () => apiFetch<any>("/superadmin/system/health"),
    staleTime: 30_000,
  });
}

export function useSecurityAlerts() {
  return useQuery({
    queryKey: ["superadmin", "security"],
    queryFn: () => apiFetch<any>("/superadmin/security/alerts"),
    staleTime: 60_000,
  });
}

export function useTenants() {
  return useQuery({
    queryKey: ["tenants"],
    queryFn: () => apiFetch<{ tenants: any[]; total: number }>("/tenants"),
    staleTime: 30_000,
  });
}

export function useTenantProfile(id: string | null) {
  return useQuery({
    queryKey: ["tenant", "profile", id],
    queryFn: () => apiFetch<any>(`/tenants/${id}/profile`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      email: string;
      phone?: string;
      adminName?: string;
      subscriptionPlan?: string;
    }) => apiFetch<any>("/tenants", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      qc.invalidateQueries({ queryKey: ["superadmin", "overview"] });
    },
  });
}

export function useTenantControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: string; reason?: string }) =>
      apiFetch<any>(`/tenants/${id}/control`, { method: "PATCH", body: JSON.stringify({ action, reason }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      qc.invalidateQueries({ queryKey: ["tenant", "profile"] });
      qc.invalidateQueries({ queryKey: ["superadmin", "overview"] });
    },
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiFetch<any>(`/tenants/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      qc.invalidateQueries({ queryKey: ["tenant", "profile"] });
    },
  });
}

export function useAssignPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, planName }: { id: string; planName: string }) =>
      apiFetch<any>(`/tenants/${id}/subscription`, { method: "PATCH", body: JSON.stringify({ planName }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      qc.invalidateQueries({ queryKey: ["tenant", "profile"] });
    },
  });
}

export function useImpersonateTenant() {
  return useMutation({
    mutationFn: (tenantId: string) =>
      apiFetch<{ token: string; expiresIn: string; user: any }>(`/tenants/${tenantId}/impersonate-admin`, { method: "POST" }),
  });
}