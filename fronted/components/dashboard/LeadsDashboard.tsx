import { Users, UserPlus, UserCheck, TrendingUp, CalendarDays } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { KpiCard, PageHeader, SectionCard, action } from "./parts";
import { DataSection } from "./EntityDashboard";
import { useClients } from "@/lib/api/clients";

const sourceColors = ["#ff6a00", "#ff8c00", "#ffb347", "#a855f7", "#22c55e"];

export default function LeadsDashboard() {
  const { data } = useClients();
  const clients: any[] = data?.clients ?? [];
  const leads = clients.filter((c) => c.leadStatus && c.leadStatus !== "Converted");

  const converted = clients.filter((c) => c.leadStatus === "Converted").length;
  const convRate = leads.length + converted > 0 ? (((converted) / (leads.length + converted)) * 100).toFixed(1) : "0.0";

  const sourceMap: Record<string, number> = {};
  leads.forEach((c) => { const k = c.source || "Others"; sourceMap[k] = (sourceMap[k] || 0) + 1; });
  const sources = Object.entries(sourceMap).map(([name, v], i) => ({
    name, v, color: sourceColors[i % sourceColors.length],
  }));

  // chart: group by createdAt week
  const weekMap: Record<string, number> = {};
  leads.forEach((c) => {
    const d = new Date(c.createdAt);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    weekMap[key] = (weekMap[key] || 0) + 1;
  });
  const series = Object.entries(weekMap).slice(-7).map(([d, v]) => ({ d, v }));

  const rows = leads.map((c) => ({
    name: c.name,
    co: c.company || c.companyName || "—",
    email: c.email,
    phone: c.phone,
    src: c.source || "—",
    status: c.leadStatus || "New",
    rating: c.rating || "Cold",
    assigned: c.agent?.name || "—",
    created: new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  }));

  return (
    <div className="space-y-4">
      <PageHeader title="Leads" subtitle="Manage your sales leads, track sources, and conversion." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Users} label="Total Leads" value={String(leads.length)} trend={15.3} />
        <KpiCard icon={UserPlus} label="New Leads" value={String(leads.filter((c) => c.leadStatus === "New").length)} trend={12.5} />
        <KpiCard icon={UserCheck} label="Converted" value={String(converted)} trend={8.4} />
        <KpiCard icon={TrendingUp} label="Conversion Rate" value={`${convRate}%`} trend={2.3} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <SectionCard title="Leads Over Time" className="col-span-12 lg:col-span-8">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series.length ? series : [{ d: "—", v: 0 }]}>
                <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff8c00" stopOpacity={0.7}/><stop offset="100%" stopColor="#ff8c00" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="d" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={11} />
                <Tooltip contentStyle={{ background: "#222", border: "1px solid #444", borderRadius: 8 }} />
                <Area type="monotone" dataKey="v" stroke="#ff6a00" strokeWidth={2} fill="url(#lg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Leads by Source" className="col-span-12 lg:col-span-4">
          <div className="flex items-center gap-4">
            <div className="relative h-[200px] w-[200px]">
              <ResponsiveContainer><PieChart><Pie data={sources.length ? sources : [{ name: "None", v: 1, color: "#334155" }]} dataKey="v" innerRadius={60} outerRadius={90} paddingAngle={2}>
                {(sources.length ? sources : [{ name: "None", v: 1, color: "#334155" }]).map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie></PieChart></ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center"><div className="text-2xl font-bold">{leads.length}</div><div className="text-xs text-muted-foreground">Total</div></div>
              </div>
            </div>
            <ul className="flex-1 space-y-1.5 text-xs">
              {sources.map((s) => (<li key={s.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /><span className="flex-1">{s.name}</span><span className="text-muted-foreground">{s.v}</span>
              </li>))}
              {sources.length === 0 && <li className="text-muted-foreground">No leads yet</li>}
            </ul>
          </div>
        </SectionCard>
      </div>

      <DataSection config={{
        entity: "Lead", entityPlural: "Leads", titleKey: "name", subtitleKey: "co",
        kanban: { statusKey: "status", stages: ["New", "Contacted", "Qualified", "Unqualified"] },
        columns: [
          { key: "name", label: "Name" },
          { key: "co", label: "Company" },
          { key: "email", label: "Email", kind: "email" },
          { key: "phone", label: "Phone", kind: "phone" },
          { key: "src", label: "Source" },
          { key: "status", label: "Status", kind: "status" },
          { key: "rating", label: "Rating" },
          { key: "assigned", label: "Assigned To" },
          { key: "created", label: "Created", kind: "date" },
        ],
        rows,
      }} />

      <SectionCard title="Today's Schedule" right={<button onClick={action("Opening calendar")} className="text-xs text-orange-400 hover:underline">View Calendar</button>}>
        <div className="flex items-center gap-3 text-sm">
          <CalendarDays className="h-5 w-5 text-orange-400" />
          <span>Check the meetings section for today's schedule</span>
        </div>
      </SectionCard>
    </div>
  );
}

