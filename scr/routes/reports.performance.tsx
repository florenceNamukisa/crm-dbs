import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { Trophy, Target, TrendingUp, Star } from "lucide-react";

export const Route = createFileRoute("/reports/performance")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "Agent", entityPlural: "Sales Performance",
        subtitle: "Per-agent quota attainment, conversion and revenue.",
        titleKey: "name", subtitleKey: "team",
        kanban: { statusKey: "tier", stages: ["Top", "On Track", "Below"] },
        kpis: [
          { icon: Trophy, label: "Quota Attainment", value: "112%", trend: 8.0 },
          { icon: Target, label: "Avg Deal Size", value: "$8,420", trend: 4.2 },
          { icon: TrendingUp, label: "Win Rate", value: "32.4%", trend: 2.6 },
          { icon: Star, label: "Top Performers", value: "6", trend: 1.0 },
        ],
        columns: [
          { key: "name", label: "Agent" }, { key: "team", label: "Team" },
          { key: "quota", label: "Quota", kind: "currency" }, { key: "achieved", label: "Achieved", kind: "currency" },
          { key: "deals", label: "Deals Won", kind: "number" },
          { key: "tier", label: "Tier", kind: "status" },
        ],
        rows: [
          { name: "Jane Smith", team: "Enterprise", quota: "$80,000", achieved: "$98,400", deals: 14, tier: "Top" },
          { name: "John Doe", team: "Enterprise", quota: "$80,000", achieved: "$82,200", deals: 11, tier: "On Track" },
          { name: "Mike Johnson", team: "SMB", quota: "$40,000", achieved: "$32,100", deals: 9, tier: "Below" },
          { name: "Lisa Park", team: "SMB", quota: "$40,000", achieved: "$48,600", deals: 12, tier: "Top" },
          { name: "Tom Reed", team: "Mid-Market", quota: "$60,000", achieved: "$56,200", deals: 8, tier: "On Track" },
        ],
      }} />
    </AppShell>
  ),
});
