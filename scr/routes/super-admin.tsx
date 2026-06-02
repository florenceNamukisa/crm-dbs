import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/auth/RequireAuth";
import SuperAdminDashboard from "@/components/dashboard/SuperAdminDashboard";

export const Route = createFileRoute("/super-admin")({
  component: () => (
    <RequireAuth roles={["superadmin"]}>
      <SuperAdminDashboard />
    </RequireAuth>
  ),
});
