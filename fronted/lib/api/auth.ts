import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/auth";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<{ user: { id: string; name: string; email: string; role: string } }>("/auth/me"),
    staleTime: Infinity,
    retry: false,
  });
}
