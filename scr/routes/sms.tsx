import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { MessageSquare, Send, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/sms")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "SMS", entityPlural: "SMS",
        subtitle: "Outbound SMS campaigns, alerts and 2-way conversations.",
        titleKey: "to", subtitleKey: "phone",
        kanban: { statusKey: "status", stages: ["Queued", "Sent", "Delivered", "Failed"] },
        kpis: [
          { icon: MessageSquare, label: "Sent (30d)", value: "12,408", trend: 9.6 },
          { icon: Send, label: "Delivery", value: "98.4%", trend: 0.6 },
          { icon: CheckCircle2, label: "Reply Rate", value: "12.1%", trend: 1.8 },
          { icon: AlertTriangle, label: "Failed", value: "204", trend: 0.4, up: false },
        ],
        columns: [
          { key: "to", label: "To" }, { key: "phone", label: "Phone" },
          { key: "message", label: "Message", kind: "longtext" },
          { key: "status", label: "Status", kind: "status" },
          { key: "sent", label: "Sent", kind: "date" }, { key: "owner", label: "Agent" },
        ],
        rows: [
          { to: "Michael Johnson", phone: "+1 555 123 4567", message: "Reminder: Demo tomorrow at 10am.", status: "Delivered", sent: "2025-05-27", owner: "John Doe" },
          { to: "Sarah Williams", phone: "+1 555 987 6543", message: "Your quote QT-1041 is approved.", status: "Sent", sent: "2025-05-27", owner: "Jane Smith" },
          { to: "David Brown", phone: "+1 555 456 7890", message: "Renewal link inside.", status: "Queued", sent: "—", owner: "John Doe" },
          { to: "Emma Davis", phone: "+1 555 321 6547", message: "Welcome aboard 🎉", status: "Delivered", sent: "2025-05-26", owner: "Mike Johnson" },
          { to: "James Wilson", phone: "+1 555 654 3210", message: "Account update failed.", status: "Failed", sent: "2025-05-25", owner: "Jane Smith" },
        ],
      }} />
    </AppShell>
  ),
});
