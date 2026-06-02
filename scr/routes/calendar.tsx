import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { Calendar, CalendarCheck, Clock, CalendarX } from "lucide-react";

export const Route = createFileRoute("/calendar")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "Event", entityPlural: "Calendar",
        subtitle: "Meetings, calls and reminders across your team's calendar.",
        titleKey: "title", subtitleKey: "with",
        kanban: { statusKey: "status", stages: ["Scheduled", "Confirmed", "Completed", "Cancelled"] },
        kpis: [
          { icon: Calendar, label: "Events This Month", value: "82", trend: 7.4 },
          { icon: CalendarCheck, label: "Confirmed", value: "61", trend: 9.2 },
          { icon: Clock, label: "Upcoming", value: "12", trend: 3.5 },
          { icon: CalendarX, label: "Cancelled", value: "9", trend: 1.1, up: false },
        ],
        columns: [
          { key: "title", label: "Event" }, { key: "with", label: "With" },
          { key: "date", label: "Date", kind: "date" }, { key: "time", label: "Time" },
          { key: "status", label: "Status", kind: "status" }, { key: "owner", label: "Organizer" },
        ],
        rows: [
          { title: "Discovery call", with: "Tech Solutions Inc.", date: "2025-05-28", time: "10:00 AM", status: "Scheduled", owner: "John Doe" },
          { title: "Proposal review", with: "GreenField Agro", date: "2025-05-28", time: "02:00 PM", status: "Confirmed", owner: "Jane Smith" },
          { title: "QBR", with: "Finance Pro Group", date: "2025-05-29", time: "11:30 AM", status: "Confirmed", owner: "John Doe" },
          { title: "Onboarding kickoff", with: "Bright Future Ltd.", date: "2025-05-30", time: "09:00 AM", status: "Scheduled", owner: "Mike Johnson" },
          { title: "Renewal chat", with: "Cloud Services LLC", date: "2025-05-31", time: "04:00 PM", status: "Completed", owner: "Jane Smith" },
        ],
      }} />
    </AppShell>
  ),
});
