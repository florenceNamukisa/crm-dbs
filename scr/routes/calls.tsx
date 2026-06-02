import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { PhoneCall, PhoneIncoming, PhoneOff, Clock } from "lucide-react";

export const Route = createFileRoute("/calls")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "Call", entityPlural: "Calls",
        subtitle: "Plan and log sales calls with outcomes and recordings.",
        titleKey: "topic", subtitleKey: "contact",
        kanban: { statusKey: "status", stages: ["Planned", "Completed", "Missed"] },
        kpis: [
          { icon: PhoneCall, label: "Calls This Week", value: "146", trend: 8.5 },
          { icon: PhoneIncoming, label: "Connected", value: "112", trend: 11.2 },
          { icon: Clock, label: "Avg Duration", value: "6m 42s", trend: 1.8 },
          { icon: PhoneOff, label: "Missed", value: "18", trend: 2.1, up: false },
        ],
        columns: [
          { key: "topic", label: "Topic" }, { key: "contact", label: "Contact" },
          { key: "phone", label: "Phone" }, { key: "duration", label: "Duration" },
          { key: "status", label: "Status", kind: "status" }, { key: "owner", label: "Agent" },
        ],
        rows: [
          { topic: "Demo follow-up", contact: "Michael Johnson", phone: "+1 555 123 4567", duration: "8m 12s", status: "Completed", owner: "John Doe" },
          { topic: "Pricing discussion", contact: "Sarah Williams", phone: "+1 555 987 6543", duration: "12m 03s", status: "Completed", owner: "Jane Smith" },
          { topic: "Renewal check-in", contact: "David Brown", phone: "+1 555 456 7890", duration: "—", status: "Planned", owner: "John Doe" },
          { topic: "Technical Q&A", contact: "Emma Davis", phone: "+1 555 321 6547", duration: "—", status: "Missed", owner: "Mike Johnson" },
          { topic: "Onboarding", contact: "James Wilson", phone: "+1 555 654 3210", duration: "21m 47s", status: "Completed", owner: "Jane Smith" },
        ],
      }} />
    </AppShell>
  ),
});
