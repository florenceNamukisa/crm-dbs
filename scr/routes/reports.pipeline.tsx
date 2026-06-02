import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { GitBranch, Trophy, XCircle, DollarSign } from "lucide-react";

export const Route = createFileRoute("/reports/pipeline")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "Pipeline Item", entityPlural: "Pipeline Report",
        subtitle: "Pipeline by stage, owner and forecast confidence.",
        titleKey: "deal", subtitleKey: "client",
        kanban: { statusKey: "stage", stages: ["Open", "Won", "Lost"] },
        kpis: [
          { icon: GitBranch, label: "Open Pipeline", value: "$248,200", trend: 14.4 },
          { icon: Trophy, label: "Won (30d)", value: "$98,400", trend: 22.1 },
          { icon: XCircle, label: "Lost (30d)", value: "$32,100", trend: 4.2, up: false },
          { icon: DollarSign, label: "Avg Deal Size", value: "$8,420", trend: 6.0 },
        ],
        columns: [
          { key: "deal", label: "Deal" }, { key: "client", label: "Client" },
          { key: "amount", label: "Amount", kind: "currency" },
          { key: "stage", label: "Stage", kind: "status" },
          { key: "prob", label: "Probability" }, { key: "owner", label: "Owner" },
        ],
        rows: [
          { deal: "Tech Solutions Deal", client: "Tech Solutions Inc.", amount: "$25,000", stage: "Open", prob: "55%", owner: "John Doe" },
          { deal: "GreenField Agro Deal", client: "GreenField Agro", amount: "$18,500", stage: "Won", prob: "100%", owner: "Jane Smith" },
          { deal: "Finance Pro Deal", client: "Finance Pro Group", amount: "$32,000", stage: "Open", prob: "40%", owner: "John Doe" },
          { deal: "Bright Future Deal", client: "Bright Future Ltd.", amount: "$12,750", stage: "Lost", prob: "0%", owner: "Mike Johnson" },
          { deal: "Cloud Services Deal", client: "Cloud Services LLC", amount: "$45,000", stage: "Open", prob: "65%", owner: "Jane Smith" },
        ],
      }} />
    </AppShell>
  ),
});
