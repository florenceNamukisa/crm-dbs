import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/auth";

export function useMeetings() {
  return useQuery({
    queryKey: ["meetings"],
    queryFn: () => apiFetch<{ meetings: any[] }>("/meetings"),
    staleTime: 30_000,
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch<any>("/meetings", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });
}
