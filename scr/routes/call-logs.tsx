import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from "lucide-react";

export const Route = createFileRoute("/call-logs")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "Call Log", entityPlural: "Call Logs",
        subtitle: "Full history of inbound, outbound and missed calls with recordings.",
        titleKey: "contact", subtitleKey: "phone",
        kanban: { statusKey: "direction", stages: ["Inbound", "Outbound", "Missed"] },
        kpis: [
          { icon: PhoneIncoming, label: "Inbound", value: "412", trend: 6.8 },
          { icon: PhoneOutgoing, label: "Outbound", value: "658", trend: 11.0 },
          { icon: PhoneMissed, label: "Missed", value: "48", trend: 2.4, up: false },
          { icon: Clock, label: "Avg Talk Time", value: "7m 02s", trend: 1.0 },
        ],
        columns: [
          { key: "contact", label: "Contact" }, { key: "phone", label: "Phone" },
          { key: "direction", label: "Direction", kind: "status" },
          { key: "duration", label: "Duration" }, { key: "outcome", label: "Outcome" },
          { key: "owner", label: "Agent" }, { key: "time", label: "Time" },
        ],
        rows: [
          { contact: "Michael Johnson", phone: "+1 555 123 4567", direction: "Outbound", duration: "8m 12s", outcome: "Connected", owner: "John Doe", time: "09:14" },
          { contact: "Sarah Williams", phone: "+1 555 987 6543", direction: "Inbound", duration: "5m 03s", outcome: "Voicemail", owner: "Jane Smith", time: "10:32" },
          { contact: "David Brown", phone: "+1 555 456 7890", direction: "Outbound", duration: "—", outcome: "No Answer", owner: "John Doe", time: "11:48" },
          { contact: "Emma Davis", phone: "+1 555 321 6547", direction: "Missed", duration: "—", outcome: "Missed", owner: "Mike Johnson", time: "13:05" },
          { contact: "James Wilson", phone: "+1 555 654 3210", direction: "Inbound", duration: "12m 41s", outcome: "Connected", owner: "Jane Smith", time: "15:28" },
        ],
      }} />
    </AppShell>
  ),
});
