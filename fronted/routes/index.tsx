import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import SalesAgentDashboard from "@/components/dashboard/SalesAgentDashboard";

export const Route = createFileRoute("/")({
  component: () => (
    <RequireAuth roles={["sales_agent", "tenant_admin", "superadmin", "sales_manager"]}>
      <AppShell>
        <SalesAgentDashboard />
      </AppShell>
    </RequireAuth>
  ),
});
