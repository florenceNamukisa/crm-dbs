import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { MessageCircle, Reply, CheckCheck, Clock } from "lucide-react";

export const Route = createFileRoute("/whatsapp")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "Chat", entityPlural: "WhatsApp",
        subtitle: "WhatsApp Business conversations with customers and leads.",
        titleKey: "contact", subtitleKey: "phone",
        kanban: { statusKey: "status", stages: ["Unread", "Replied", "Closed"] },
        kpis: [
          { icon: MessageCircle, label: "Active Chats", value: "82", trend: 6.0 },
          { icon: Reply, label: "Replied", value: "61", trend: 8.4 },
          { icon: CheckCheck, label: "Closed", value: "104", trend: 3.2 },
          { icon: Clock, label: "Avg Response", value: "4m 18s", trend: 1.2 },
        ],
        columns: [
          { key: "contact", label: "Contact" }, { key: "phone", label: "Phone" },
          { key: "last", label: "Last Message", kind: "longtext" },
          { key: "status", label: "Status", kind: "status" },
          { key: "received", label: "Updated", kind: "date" }, { key: "owner", label: "Agent" },
        ],
        rows: [
          { contact: "Michael Johnson", phone: "+1 555 123 4567", last: "Can we move the demo to Thursday?", status: "Unread", received: "2025-05-27", owner: "John Doe" },
          { contact: "Sarah Williams", phone: "+1 555 987 6543", last: "Got the proposal, thanks!", status: "Replied", received: "2025-05-27", owner: "Jane Smith" },
          { contact: "David Brown", phone: "+1 555 456 7890", last: "Renewal signed ✅", status: "Closed", received: "2025-05-26", owner: "John Doe" },
          { contact: "Emma Davis", phone: "+1 555 321 6547", last: "Sharing onboarding link…", status: "Replied", received: "2025-05-26", owner: "Mike Johnson" },
          { contact: "James Wilson", phone: "+1 555 654 3210", last: "Out of office until Jun 3", status: "Closed", received: "2025-05-25", owner: "Jane Smith" },
        ],
      }} />
    </AppShell>
  ),
});
