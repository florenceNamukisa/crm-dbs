import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { FileBarChart, Send, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/invoices")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "Invoice", entityPlural: "Invoices",
        subtitle: "Issue invoices, track payments and overdue accounts.",
        titleKey: "number", subtitleKey: "client",
        kanban: { statusKey: "status", stages: ["Draft", "Sent", "Paid", "Overdue"] },
        kpis: [
          { icon: FileBarChart, label: "Total Invoices", value: "1,084", trend: 13.2 },
          { icon: Send, label: "Outstanding", value: "$48,210", trend: 5.6, up: false },
          { icon: CheckCircle2, label: "Paid", value: "$312,500", trend: 18.7 },
          { icon: AlertTriangle, label: "Overdue", value: "$9,820", trend: 2.4, up: false },
        ],
        columns: [
          { key: "number", label: "Invoice #" }, { key: "client", label: "Client" },
          { key: "amount", label: "Amount", kind: "currency" },
          { key: "status", label: "Status", kind: "status" },
          { key: "due", label: "Due Date", kind: "date" },
          { key: "owner", label: "Owner" },
        ],
        rows: [
          { number: "INV-2105", client: "Tech Solutions Inc.", amount: "$9,800", status: "Paid", due: "2025-05-20", owner: "John Doe" },
          { number: "INV-2104", client: "Cloud Services LLC", amount: "$22,500", status: "Sent", due: "2025-06-05", owner: "Jane Smith" },
          { number: "INV-2103", client: "Bright Future Ltd.", amount: "$4,300", status: "Overdue", due: "2025-05-10", owner: "Mike Johnson" },
          { number: "INV-2102", client: "GreenField Agro", amount: "$11,750", status: "Draft", due: "2025-06-18", owner: "John Doe" },
          { number: "INV-2101", client: "Finance Pro Group", amount: "$18,900", status: "Paid", due: "2025-05-02", owner: "Jane Smith" },
        ],
      }} />
    </AppShell>
  ),
});
