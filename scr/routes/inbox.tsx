import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { Inbox, Mail, Archive, Reply } from "lucide-react";

export const Route = createFileRoute("/inbox")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "Message", entityPlural: "Inbox",
        subtitle: "Unified inbox across email, chat, WhatsApp and SMS.",
        titleKey: "subject", subtitleKey: "from",
        kanban: { statusKey: "status", stages: ["Unread", "Read", "Replied", "Archived"] },
        kpis: [
          { icon: Inbox, label: "Total Threads", value: "1,420", trend: 5.2 },
          { icon: Mail, label: "Unread", value: "12", trend: 0.6, up: false },
          { icon: Reply, label: "Replied", value: "984", trend: 9.1 },
          { icon: Archive, label: "Archived", value: "342", trend: 2.4 },
        ],
        columns: [
          { key: "from", label: "From" }, { key: "subject", label: "Subject" },
          { key: "channel", label: "Channel", kind: "select", options: ["Email", "WhatsApp", "SMS", "Chat"] },
          { key: "preview", label: "Preview", kind: "longtext" },
          { key: "status", label: "Status", kind: "status" }, { key: "received", label: "Received", kind: "date" },
        ],
        rows: [
          { from: "Michael Johnson", subject: "Re: Pricing question", channel: "Email", preview: "Thanks for the detailed breakdown…", status: "Unread", received: "2025-05-27" },
          { from: "Sarah Williams", subject: "Demo confirmed", channel: "WhatsApp", preview: "Looking forward to tomorrow.", status: "Read", received: "2025-05-27" },
          { from: "David Brown", subject: "Renewal terms", channel: "Email", preview: "Could we revisit the discount?", status: "Replied", received: "2025-05-26" },
          { from: "Emma Davis", subject: "Onboarding link", channel: "SMS", preview: "Sending the kickoff link.", status: "Read", received: "2025-05-26" },
          { from: "James Wilson", subject: "Out of office", channel: "Email", preview: "I'm away until June 3rd.", status: "Archived", received: "2025-05-25" },
        ],
      }} />
    </AppShell>
  ),
});
