import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/auth";

export function usePerformanceReport() {
  return useQuery({
    queryKey: ["reports", "performance"],
    queryFn: () => apiFetch<any>("/performance"),
    staleTime: 60_000,
  });
}

export function usePipelineReport() {
  return useQuery({
    queryKey: ["reports", "pipeline"],
    queryFn: () => apiFetch<any>("/reports/pipeline"),
    staleTime: 60_000,
  });
}

export function useActivityReport() {
  return useQuery({
    queryKey: ["reports", "activity"],
    queryFn: () => apiFetch<any>("/audit-logs"),
    staleTime: 60_000,
  });
}
