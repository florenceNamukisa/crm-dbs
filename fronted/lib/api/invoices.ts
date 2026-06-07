import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/auth";
import { getStoredUser } from "@/lib/auth";

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: () => {
      const user = getStoredUser();
      const endpoint = user?.role === "superadmin" ? "/superadmin/invoices" : "/sales";
      return apiFetch<any>(endpoint);
    },
    staleTime: 30_000,
  });
}
