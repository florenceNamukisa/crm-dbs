import { Briefcase, DollarSign, Trophy, Percent } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { KpiCard, PageHeader, SectionCard } from "./parts";
import { DataSection } from "./EntityDashboard";
import { useDeals } from "@/lib/api/deals";

export default function DealsDashboard() {
  const { data } = useDeals();
  const deals: any[] = data?.deals ?? [];

  const wonDeals = deals.filter((d) => d.stage === "won");
  const activeDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));
  const pipelineValue = activeDeals.reduce((s, d) => s + (d.value || 0), 0);
  const winRate = deals.length > 0 ? ((wonDeals.length / deals.length) * 100).toFixed(1) : "0.0";

  const stageMap: Record<string, number> = {};
  deals.forEach((d) => { stageMap[d.stage] = (stageMap[d.stage] || 0) + 1; });
  const stageLabels: Record<string, string> = { lead: "New Lead", qualification: "Qualified", proposal: "Proposal", negotiation: "Negotiation", won: "Won", lost: "Lost" };
  const stages = Object.entries(stageMap).map(([s, n]) => ({ s: stageLabels[s] || s, n }));

  const maxStage = Math.max(...deals.length ? Object.values(stageMap) : [1]);
  const funnel = Object.entries(stageMap).map(([stage, n]) => ({
    stage: stageLabels[stage] || stage,
    n,
    pct: Math.round((n / maxStage) * 100),
  }));

  const rows = deals.map((d) => ({
    n: d.title,
    c: d.client?.name || d.client?.company || "—",
    amt: `$${(d.value || 0).toLocaleString()}`,
    stage: stageLabels[d.stage] || d.stage,
    prob: d.probability || 0,
    close: d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD",
    owner: d.agent?.name || "—",
  }));

  return (
    <div className="space-y-4">
      <PageHeader title="Deals" subtitle="Track your pipeline, deal stages, and revenue." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Briefcase} label="Total Deals" value={String(deals.length)} trend={12.4} />
        <KpiCard icon={DollarSign} label="Pipeline Value" value={`$${pipelineValue.toLocaleString()}`} trend={16.8} />
        <KpiCard icon={Trophy} label="Won Deals" value={String(wonDeals.length)} trend={18.7} />
        <KpiCard icon={Percent} label="Win Rate" value={`${winRate}%`} trend={4.5} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <SectionCard title="Pipeline Overview" className="col-span-12 lg:col-span-6">
          <div className="space-y-2">
            {funnel.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">No deals yet</div>}
            {funnel.map((f) => (
              <div key={f.stage} className="flex items-center gap-3">
                <div className="w-28 text-xs text-muted-foreground">{f.stage}</div>
                <div className="flex-1 h-8 rounded-md gradient-orange grid place-items-center text-xs font-semibold text-white" style={{ width: `${f.pct}%`, minWidth: "60px" }}>
                  {f.n} ({f.pct}%)
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Deals by Stage" className="col-span-12 lg:col-span-6">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stages}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="s" stroke="#888" fontSize={10} />
                <YAxis stroke="#888" fontSize={11} />
                <Tooltip contentStyle={{ background: "#222", border: "1px solid #444", borderRadius: 8 }} />
                <Bar dataKey="n" radius={[6, 6, 0, 0]}>
                  {stages.map((_, i) => <Cell key={i} fill={["#ff6a00","#ff8c00","#ffb347","#ff8c00","#ff6a00","#ef4444"][i % 6]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <DataSection config={{
        entity: "Deal", entityPlural: "Deals", titleKey: "n", subtitleKey: "c",
        kanban: { statusKey: "stage", stages: ["New Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"] },
        columns: [
          { key: "n", label: "Deal Name" },
          { key: "c", label: "Client" },
          { key: "amt", label: "Amount", kind: "currency" },
          { key: "stage", label: "Stage", kind: "status" },
          { key: "prob", label: "Probability", kind: "number" },
          { key: "close", label: "Close Date", kind: "date" },
          { key: "owner", label: "Assigned To" },
        ],
        rows,
      }} />
    </div>
  );
}

