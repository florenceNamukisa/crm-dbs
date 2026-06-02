import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/auth/RequireAuth";
import TenantAdminDashboard from "@/components/dashboard/TenantAdminDashboard";

export const Route = createFileRoute("/tenant-admin")({
  component: () => (
    <RequireAuth roles={["tenant_admin", "superadmin"]}>
      <TenantAdminDashboard />
    </RequireAuth>
  ),
});
