import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/auth/RequireAuth";
import SalesManagerDashboard from "@/components/dashboard/SalesManagerDashboard";

export const Route = createFileRoute("/manager")({
  component: () => (
    <RequireAuth roles={["sales_manager", "superadmin", "tenant_admin"]}>
      <SalesManagerDashboard />
    </RequireAuth>
  ),
});
