import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { BarChart3, FileText, Star, Download } from "lucide-react";

export const Route = createFileRoute("/reports")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "Report", entityPlural: "My Reports",
        subtitle: "Saved reports — daily, weekly and monthly insights.",
        titleKey: "name", subtitleKey: "category",
        kanban: { statusKey: "schedule", stages: ["Daily", "Weekly", "Monthly", "On-demand"] },
        kpis: [
          { icon: BarChart3, label: "Total Reports", value: "42", trend: 4.0 },
          { icon: FileText, label: "Scheduled", value: "18", trend: 2.0 },
          { icon: Star, label: "Favourites", value: "9", trend: 0.0 },
          { icon: Download, label: "Exports (30d)", value: "284", trend: 12.5 },
        ],
        columns: [
          { key: "name", label: "Report" }, { key: "category", label: "Category", kind: "select", options: ["Pipeline", "Activity", "Performance", "Revenue"] },
          { key: "schedule", label: "Schedule", kind: "status" },
          { key: "lastRun", label: "Last Run", kind: "date" }, { key: "owner", label: "Owner" },
        ],
        rows: [
          { name: "Weekly Pipeline Health", category: "Pipeline", schedule: "Weekly", lastRun: "2025-05-26", owner: "John Doe" },
          { name: "Daily Activity Digest", category: "Activity", schedule: "Daily", lastRun: "2025-05-27", owner: "Jane Smith" },
          { name: "Top Performers", category: "Performance", schedule: "Monthly", lastRun: "2025-05-01", owner: "Mike Johnson" },
          { name: "Revenue by Region", category: "Revenue", schedule: "Monthly", lastRun: "2025-05-01", owner: "John Doe" },
          { name: "Lead Source ROI", category: "Pipeline", schedule: "On-demand", lastRun: "2025-05-20", owner: "Jane Smith" },
        ],
      }} />
    </AppShell>
  ),
});
