import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/auth";

export function useStock() {
  return useQuery({
    queryKey: ["stock"],
    queryFn: () => apiFetch<{ stock: any[] }>("/stock"),
    staleTime: 30_000,
  });
}

export function useCreateStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch<any>("/stock", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stock"] }),
  });
}
