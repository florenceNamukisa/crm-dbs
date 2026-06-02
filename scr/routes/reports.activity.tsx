import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { Activity, PhoneCall, Mail, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/reports/activity")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "Activity", entityPlural: "Activity Report",
        subtitle: "Calls, emails, meetings and tasks per agent and team.",
        titleKey: "owner", subtitleKey: "team",
        kanban: { statusKey: "trend", stages: ["New", "Updated"] },
        kpis: [
          { icon: Activity, label: "Activities (30d)", value: "4,840", trend: 11.4 },
          { icon: PhoneCall, label: "Calls", value: "1,486", trend: 8.2 },
          { icon: Mail, label: "Emails", value: "2,148", trend: 14.4 },
          { icon: CalendarDays, label: "Meetings", value: "612", trend: 6.0 },
        ],
        columns: [
          { key: "owner", label: "Agent" }, { key: "team", label: "Team" },
          { key: "calls", label: "Calls", kind: "number" },
          { key: "emails", label: "Emails", kind: "number" },
          { key: "meetings", label: "Meetings", kind: "number" },
          { key: "trend", label: "Trend", kind: "status" },
        ],
        rows: [
          { owner: "John Doe", team: "Enterprise", calls: 142, emails: 410, meetings: 38, trend: "New" },
          { owner: "Jane Smith", team: "Enterprise", calls: 168, emails: 482, meetings: 44, trend: "Updated" },
          { owner: "Mike Johnson", team: "SMB", calls: 96, emails: 312, meetings: 24, trend: "New" },
          { owner: "Lisa Park", team: "SMB", calls: 124, emails: 388, meetings: 32, trend: "Updated" },
          { owner: "Tom Reed", team: "Mid-Market", calls: 88, emails: 246, meetings: 19, trend: "New" },
        ],
      }} />
    </AppShell>
  ),
});
