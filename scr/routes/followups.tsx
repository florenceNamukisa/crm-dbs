import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { Repeat, Clock, CheckCircle2, SkipForward } from "lucide-react";

export const Route = createFileRoute("/followups")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "Follow-up", entityPlural: "Follow-ups",
        subtitle: "Stay on top of every promised touch with automated reminders.",
        titleKey: "subject", subtitleKey: "contact",
        kanban: { statusKey: "status", stages: ["Pending", "Done", "Skipped"] },
        kpis: [
          { icon: Repeat, label: "Total", value: "186", trend: 4.5 },
          { icon: Clock, label: "Due Today", value: "22", trend: 1.4 },
          { icon: CheckCircle2, label: "Done", value: "121", trend: 9.6 },
          { icon: SkipForward, label: "Skipped", value: "12", trend: 0.5, up: false },
        ],
        columns: [
          { key: "subject", label: "Subject" }, { key: "contact", label: "Contact" },
          { key: "channel", label: "Channel", kind: "select", options: ["Email", "Call", "WhatsApp", "SMS"] },
          { key: "due", label: "Due", kind: "date" },
          { key: "status", label: "Status", kind: "status" }, { key: "owner", label: "Owner" },
        ],
        rows: [
          { subject: "Send revised pricing", contact: "Michael Johnson", channel: "Email", due: "2025-05-28", status: "Pending", owner: "John Doe" },
          { subject: "Confirm demo attendees", contact: "Sarah Williams", channel: "WhatsApp", due: "2025-05-28", status: "Pending", owner: "Jane Smith" },
          { subject: "Check-in after onboarding", contact: "David Brown", channel: "Call", due: "2025-05-29", status: "Done", owner: "John Doe" },
          { subject: "Renewal proposal nudge", contact: "Emma Davis", channel: "Email", due: "2025-06-01", status: "Pending", owner: "Mike Johnson" },
          { subject: "Re-engagement", contact: "James Wilson", channel: "SMS", due: "2025-05-25", status: "Skipped", owner: "Jane Smith" },
        ],
      }} />
    </AppShell>
  ),
});
