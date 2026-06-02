import { Briefcase, DollarSign, Trophy, Percent } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { KpiCard, PageHeader, SectionCard } from "./parts";
import { DataSection } from "./EntityDashboard";

const funnel = [
  { stage: "Contacted", n: 45, pct: 18 },
  { stage: "Proposal", n: 60, pct: 24 },
  { stage: "Negotiation", n: 56, pct: 22 },
  { stage: "Closed Won", n: 45, pct: 18 },
  { stage: "Closed Lost", n: 20, pct: 8 },
];
const stages = [
  { s: "Contacted", n: 45 }, { s: "Proposal", n: 68 }, { s: "Negotiation", n: 33 }, { s: "Closed Won", n: 38 }, { s: "Closed Lost", n: 33 },
];
const rows = [
  { n: "Tech Solutions Deal", c: "Tech Solutions Inc.", amt: "$25,000", stage: "Proposal", prob: 50, close: "Jun 05, 2025", owner: "John Doe" },
  { n: "GreenField Agro Deal", c: "GreenField Agro Ltd.", amt: "$18,500", stage: "Negotiation", prob: 70, close: "Jun 10, 2025", owner: "John Doe" },
  { n: "Finance Pro Deal", c: "Finance Pro Group", amt: "$32,000", stage: "Contacted", prob: 40, close: "Jun 15, 2025", owner: "John Doe" },
  { n: "Bright Future Deal", c: "Bright Future Ltd.", amt: "$12,750", stage: "Proposal", prob: 55, close: "Jun 20, 2025", owner: "Mike Johnson" },
  { n: "Cloud Services Deal", c: "Cloud Services LLC", amt: "$45,000", stage: "Negotiation", prob: 65, close: "Jun 25, 2025", owner: "Jane Smith" },
];

export default function DealsDashboard() {
  return (
    <div className="space-y-4">
      <PageHeader title="Deals" subtitle="Track your pipeline, deal stages, and revenue." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Briefcase} label="Total Deals" value="128" trend={12.4} />
        <KpiCard icon={DollarSign} label="Pipeline Value" value="$245,800" trend={16.8} />
        <KpiCard icon={Trophy} label="Won Deals" value="45" trend={18.7} />
        <KpiCard icon={Percent} label="Win Rate" value="35.2%" trend={4.5} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <SectionCard title="Pipeline Overview" className="col-span-12 lg:col-span-6">
          <div className="space-y-2">
            {funnel.map((f, i) => {
              const width = 100 - i * 12;
              return (
                <div key={f.stage} className="flex items-center gap-3">
                  <div className="w-28 text-xs text-muted-foreground">{f.stage}</div>
                  <div className="flex-1 h-8 rounded-md gradient-orange grid place-items-center text-xs font-semibold text-white" style={{ width: `${width}%` }}>
                    {f.n} ({f.pct}%)
                  </div>
                </div>
              );
            })}
            <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs">
              <span className="text-muted-foreground">Total Deals: <span className="text-foreground font-semibold">240</span></span>
              <span className="text-muted-foreground">Total Value: <span className="text-foreground font-semibold">$245,800</span></span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Deals by Stage" className="col-span-12 lg:col-span-6" right={
          <select className="bg-card border border-border rounded px-2 py-1 text-xs"><option>This Month</option></select>
        }>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stages}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="s" stroke="#888" fontSize={10} />
                <YAxis stroke="#888" fontSize={11} />
                <Tooltip contentStyle={{ background: "#222", border: "1px solid #444", borderRadius: 8 }} />
                <Bar dataKey="n" radius={[6, 6, 0, 0]}>
                  {stages.map((_, i) => <Cell key={i} fill={["#ff6a00","#ff8c00","#ffb347","#ff8c00","#ff6a00"][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <DataSection
        config={{
          entity: "Deal",
          entityPlural: "Deals",
          titleKey: "n",
          subtitleKey: "c",
          kanban: { statusKey: "stage", stages: ["Contacted", "Proposal", "Negotiation", "Closed Won", "Closed Lost"] },
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
        }}
      />
    </div>
  );
}