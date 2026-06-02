import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { Mail, Send, Reply, FileEdit } from "lucide-react";

export const Route = createFileRoute("/email")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "Email", entityPlural: "Email",
        subtitle: "Compose, schedule, and track sales emails with open analytics.",
        titleKey: "subject", subtitleKey: "to",
        kanban: { statusKey: "status", stages: ["Draft", "Sent", "Replied", "Archived"] },
        kpis: [
          { icon: Mail, label: "Emails Sent", value: "3,148", trend: 11.0 },
          { icon: Send, label: "Open Rate", value: "62.4%", trend: 4.7 },
          { icon: Reply, label: "Reply Rate", value: "18.2%", trend: 2.1 },
          { icon: FileEdit, label: "Drafts", value: "14", trend: 0.4 },
        ],
        columns: [
          { key: "to", label: "To" }, { key: "subject", label: "Subject" },
          { key: "preview", label: "Preview", kind: "longtext" },
          { key: "status", label: "Status", kind: "status" },
          { key: "sent", label: "Sent", kind: "date" }, { key: "owner", label: "From" },
        ],
        rows: [
          { to: "michael@tech.com", subject: "Following up on our demo", preview: "Hi Michael, sharing the recap…", status: "Sent", sent: "2025-05-27", owner: "John Doe" },
          { to: "sarah@greenfield.com", subject: "Proposal v2 attached", preview: "Hi Sarah, please find v2…", status: "Replied", sent: "2025-05-26", owner: "Jane Smith" },
          { to: "david@finance.com", subject: "Renewal options", preview: "Hi David, three options…", status: "Draft", sent: "—", owner: "John Doe" },
          { to: "emma@brightfuture.com", subject: "Welcome to onboarding", preview: "Hi Emma, here's your link…", status: "Sent", sent: "2025-05-25", owner: "Mike Johnson" },
          { to: "james@cloudserv.com", subject: "Quick check-in", preview: "Hi James, just touching base…", status: "Archived", sent: "2025-05-22", owner: "Jane Smith" },
        ],
      }} />
    </AppShell>
  ),
});
