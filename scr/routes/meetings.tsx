import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { CalendarDays, Users, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/meetings")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "Meeting", entityPlural: "Meetings",
        subtitle: "Schedule, invite, and run sales meetings with agendas.",
        titleKey: "title", subtitleKey: "client",
        kanban: { statusKey: "status", stages: ["Scheduled", "Confirmed", "Completed", "Cancelled"] },
        kpis: [
          { icon: CalendarDays, label: "Meetings", value: "94", trend: 12.0 },
          { icon: Users, label: "Attendees", value: "312", trend: 7.6 },
          { icon: CheckCircle2, label: "Completed", value: "68", trend: 14.4 },
          { icon: XCircle, label: "Cancelled", value: "9", trend: 1.2, up: false },
        ],
        columns: [
          { key: "title", label: "Title" }, { key: "client", label: "Client" },
          { key: "date", label: "Date", kind: "date" }, { key: "location", label: "Location" },
          { key: "status", label: "Status", kind: "status" }, { key: "owner", label: "Host" },
        ],
        rows: [
          { title: "Product Demo", client: "Tech Solutions Inc.", date: "2025-05-28", location: "Zoom", status: "Confirmed", owner: "John Doe" },
          { title: "Stakeholder Sync", client: "GreenField Agro", date: "2025-05-29", location: "Google Meet", status: "Scheduled", owner: "Jane Smith" },
          { title: "Pricing Workshop", client: "Finance Pro Group", date: "2025-05-30", location: "Onsite NYC", status: "Confirmed", owner: "John Doe" },
          { title: "Kickoff", client: "Bright Future Ltd.", date: "2025-06-01", location: "Teams", status: "Scheduled", owner: "Mike Johnson" },
          { title: "Renewal Review", client: "Cloud Services LLC", date: "2025-06-03", location: "Zoom", status: "Completed", owner: "Jane Smith" },
        ],
      }} />
    </AppShell>
  ),
});
