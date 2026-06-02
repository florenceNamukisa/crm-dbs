import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { Receipt, Send, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/quotes")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "Quote", entityPlural: "Quotes",
        subtitle: "Create, send and track sales quotes and approvals.",
        titleKey: "number", subtitleKey: "client",
        kanban: { statusKey: "status", stages: ["Draft", "Sent", "Approved", "Expired"] },
        kpis: [
          { icon: Receipt, label: "Total Quotes", value: "512", trend: 9.8 },
          { icon: Send, label: "Sent", value: "318", trend: 6.4 },
          { icon: CheckCircle2, label: "Approved", value: "182", trend: 14.1 },
          { icon: Clock, label: "Expired", value: "24", trend: 1.2, up: false },
        ],
        columns: [
          { key: "number", label: "Quote #" }, { key: "client", label: "Client" },
          { key: "amount", label: "Amount", kind: "currency" },
          { key: "status", label: "Status", kind: "status" },
          { key: "issued", label: "Issued", kind: "date" },
          { key: "owner", label: "Owner" },
        ],
        rows: [
          { number: "QT-1042", client: "Tech Solutions Inc.", amount: "$12,400", status: "Sent", issued: "2025-05-12", owner: "John Doe" },
          { number: "QT-1041", client: "Bright Future Ltd.", amount: "$6,750", status: "Approved", issued: "2025-05-10", owner: "Jane Smith" },
          { number: "QT-1040", client: "Cloud Services LLC", amount: "$22,000", status: "Draft", issued: "2025-05-09", owner: "Mike Johnson" },
          { number: "QT-1039", client: "GreenField Agro", amount: "$8,200", status: "Expired", issued: "2025-04-28", owner: "John Doe" },
          { number: "QT-1038", client: "Finance Pro Group", amount: "$15,500", status: "Approved", issued: "2025-04-26", owner: "Jane Smith" },
        ],
      }} />
    </AppShell>
  ),
});
