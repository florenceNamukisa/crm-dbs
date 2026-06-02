import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { FileText, Send, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/proposals")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "Proposal", entityPlural: "Proposals",
        subtitle: "Draft, send, and track sales proposals with e-sign workflows.",
        titleKey: "title", subtitleKey: "client",
        kanban: { statusKey: "status", stages: ["Draft", "Sent", "Accepted", "Rejected"] },
        kpis: [
          { icon: FileText, label: "Total Proposals", value: "342", trend: 11.4 },
          { icon: Send, label: "Sent", value: "210", trend: 8.6 },
          { icon: CheckCircle2, label: "Accepted", value: "126", trend: 14.2 },
          { icon: XCircle, label: "Rejected", value: "32", trend: 3.1, up: false },
        ],
        columns: [
          { key: "title", label: "Title" }, { key: "client", label: "Client" },
          { key: "amount", label: "Amount", kind: "currency" },
          { key: "status", label: "Status", kind: "status" },
          { key: "validTill", label: "Valid Till", kind: "date" },
          { key: "owner", label: "Owner" },
        ],
        rows: [
          { title: "Annual CRM License", client: "Tech Solutions Inc.", amount: "$24,000", status: "Sent", validTill: "2025-06-30", owner: "John Doe" },
          { title: "Cloud Migration Plan", client: "GreenField Agro", amount: "$48,500", status: "Draft", validTill: "2025-07-15", owner: "Jane Smith" },
          { title: "Support Retainer", client: "Finance Pro Group", amount: "$12,000", status: "Accepted", validTill: "2025-08-01", owner: "John Doe" },
          { title: "Analytics Upgrade", client: "Bright Future Ltd.", amount: "$8,750", status: "Rejected", validTill: "2025-06-10", owner: "Mike Johnson" },
          { title: "Implementation SOW", client: "Cloud Services LLC", amount: "$32,000", status: "Sent", validTill: "2025-07-22", owner: "Jane Smith" },
        ],
      }} />
    </AppShell>
  ),
});
