import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { Settings, Bell, Lock, Palette } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "Setting", entityPlural: "Settings",
        subtitle: "Profile, security, notifications, integrations and appearance.",
        titleKey: "name", subtitleKey: "category",
        kanban: { statusKey: "status", stages: ["Active", "Inactive"] },
        kpis: [
          { icon: Settings, label: "Modules", value: "24", trend: 0.0 },
          { icon: Bell, label: "Notifications", value: "12", trend: 2.0 },
          { icon: Lock, label: "Security Items", value: "8", trend: 0.0 },
          { icon: Palette, label: "Themes", value: "3", trend: 0.0 },
        ],
        columns: [
          { key: "name", label: "Setting" }, { key: "category", label: "Category", kind: "select", options: ["Profile", "Security", "Notifications", "Integrations", "Appearance"] },
          { key: "value", label: "Current Value" },
          { key: "status", label: "Status", kind: "status" },
          { key: "updated", label: "Updated", kind: "date" },
        ],
        rows: [
          { name: "Two-Factor Auth", category: "Security", value: "Enabled (TOTP)", status: "Active", updated: "2025-05-12" },
          { name: "Email digest", category: "Notifications", value: "Daily 8:00 AM", status: "Active", updated: "2025-05-20" },
          { name: "Slack integration", category: "Integrations", value: "#sales-pipeline", status: "Active", updated: "2025-04-30" },
          { name: "Dark mode", category: "Appearance", value: "Charcoal Orange", status: "Active", updated: "2025-05-01" },
          { name: "API webhooks", category: "Integrations", value: "https://hooks.acme.com", status: "Inactive", updated: "2025-04-12" },
        ],
      }} />
    </AppShell>
  ),
});
