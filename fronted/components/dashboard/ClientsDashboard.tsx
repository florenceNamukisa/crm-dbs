import { Building2, UserCheck, UserPlus, DollarSign } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { KpiCard, PageHeader, SectionCard } from "./parts";
import { DataSection } from "./EntityDashboard";
import { useClients } from "@/lib/api/clients";

const industryColors = ["#ff6a00", "#ff8c00", "#ffb347", "#a855f7", "#6366f1", "#22c55e"];

export default function ClientsDashboard() {
  const { data, isLoading } = useClients();
  const clients: any[] = data?.clients ?? [];

  const activeCount = clients.filter((c) => c.status === "active").length;
  const industryMap: Record<string, number> = {};
  clients.forEach((c) => { const k = c.industry || "Others"; industryMap[k] = (industryMap[k] || 0) + 1; });
  const industries = Object.entries(industryMap).map(([name, v], i) => ({ name, v, color: industryColors[i % industryColors.length] }));

  const rows = clients.map((c) => ({
    c: c.name || c.company,
    ind: c.industry || "—",
    email: c.email,
    phone: c.phone,
    status: c.status?.charAt(0).toUpperCase() + c.status?.slice(1) || "Active",
    deals: 0,
    revenue: "$0",
  }));

  return (
    <div className="space-y-4">
      <PageHeader title="Clients" subtitle="Manage your client accounts, industries, and revenue." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Building2} label="Total Clients" value={String(clients.length)} trend={12.4} />
        <KpiCard icon={UserCheck} label="Active Clients" value={String(activeCount)} trend={14.2} />
        <KpiCard icon={UserPlus} label="New Clients" value={String(clients.filter((c) => { const d = new Date(c.createdAt); const now = new Date(); return d.getMonth() === now.getMonth(); }).length)} trend={10.5} />
        <KpiCard icon={DollarSign} label="Clients" value={isLoading ? "..." : String(clients.length)} trend={4.9} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <SectionCard title="Clients by Industry" className="col-span-12 lg:col-span-6">
          <div className="flex items-center gap-4">
            <div className="relative h-[220px] w-[220px]">
              <ResponsiveContainer><PieChart><Pie data={industries.length ? industries : [{ name: "None", v: 1, color: "#334155" }]} dataKey="v" innerRadius={70} outerRadius={100} paddingAngle={2}>
                {(industries.length ? industries : [{ name: "None", v: 1, color: "#334155" }]).map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie></PieChart></ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center"><div className="text-2xl font-bold">{clients.length}</div></div>
              </div>
            </div>
            <ul className="flex-1 space-y-1.5 text-xs">
              {industries.map((s) => (<li key={s.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /><span className="flex-1">{s.name}</span><span className="text-muted-foreground">{s.v}</span>
              </li>))}
              {industries.length === 0 && <li className="text-muted-foreground">No clients yet</li>}
            </ul>
          </div>
        </SectionCard>

        <SectionCard title="Top Clients" className="col-span-12 lg:col-span-6">
          <ul className="space-y-3">
            {clients.slice(0, 5).map((c, i) => (
              <li key={c._id} className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-md gradient-orange grid place-items-center text-xs font-bold text-white">{i + 1}</span>
                <span className="flex-1 text-sm">{c.name || c.company}</span>
                <span className="text-xs text-muted-foreground">{c.company || "—"}</span>
              </li>
            ))}
            {clients.length === 0 && <li className="text-sm text-muted-foreground py-4 text-center">No clients yet</li>}
          </ul>
        </SectionCard>
      </div>

      <DataSection config={{
        entity: "Client", entityPlural: "Clients", titleKey: "c", subtitleKey: "ind",
        kanban: { statusKey: "status", stages: ["Active", "Inactive"] },
        columns: [
          { key: "c", label: "Client Name" },
          { key: "ind", label: "Industry" },
          { key: "email", label: "Email", kind: "email" },
          { key: "phone", label: "Phone", kind: "phone" },
          { key: "status", label: "Status", kind: "status" },
        ],
        rows,
      }} />
    </div>
  );
}