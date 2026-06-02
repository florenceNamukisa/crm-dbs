import { Building2, UserCheck, UserPlus, DollarSign } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { KpiCard, PageHeader, SectionCard } from "./parts";
import { DataSection } from "./EntityDashboard";

const industries = [
  { name: "IT Services", v: 40, color: "#ff6a00" },
  { name: "Agriculture", v: 15, color: "#ff8c00" },
  { name: "Finance", v: 15, color: "#ffb347" },
  { name: "Education", v: 10, color: "#a855f7" },
  { name: "Healthcare", v: 10, color: "#6366f1" },
  { name: "Others", v: 10, color: "#22c55e" },
];
const top = [
  { c: "Tech Solutions Inc.", v: "$25,450" },
  { c: "GreenField Agro Ltd.", v: "$18,750" },
  { c: "Finance Pro Group", v: "$15,600" },
  { c: "Bright Future Ltd.", v: "$12,800" },
  { c: "Cloud Services LLC", v: "$11,250" },
];
const rows = [
  { c: "Tech Solutions Inc.", ind: "IT Services", email: "info@tech.com", phone: "+1 555 123 4567", status: "Active", deals: 12, revenue: "$25,450" },
  { c: "GreenField Agro Ltd.", ind: "Agriculture", email: "info@greenfield.com", phone: "+1 555 987 6543", status: "Active", deals: 8, revenue: "$18,750" },
  { c: "Finance Pro Group", ind: "Finance", email: "info@finance.com", phone: "+1 555 456 7890", status: "Active", deals: 6, revenue: "$15,600" },
  { c: "Bright Future Ltd.", ind: "Education", email: "info@brightfuture.com", phone: "+1 555 321 6547", status: "Active", deals: 7, revenue: "$12,800" },
  { c: "Cloud Services LLC", ind: "IT Services", email: "info@cloudserv.com", phone: "+1 555 654 3210", status: "Active", deals: 5, revenue: "$11,250" },
];

export default function ClientsDashboard() {
  return (
    <div className="space-y-4">
      <PageHeader title="Clients" subtitle="Manage your client accounts, industries, and revenue." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Building2} label="Total Clients" value="128" trend={12.4} />
        <KpiCard icon={UserCheck} label="Active Clients" value="98" trend={14.2} />
        <KpiCard icon={UserPlus} label="New Clients" value="30" trend={10.5} />
        <KpiCard icon={DollarSign} label="Revenue" value="$89,450" trend={4.9} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <SectionCard title="Clients by Industry" className="col-span-12 lg:col-span-6">
          <div className="flex items-center gap-4">
            <div className="relative h-[220px] w-[220px]">
              <ResponsiveContainer><PieChart><Pie data={industries} dataKey="v" innerRadius={70} outerRadius={100} paddingAngle={2}>
                {industries.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie></PieChart></ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center"><div className="text-2xl font-bold">128</div></div>
              </div>
            </div>
            <ul className="flex-1 space-y-1.5 text-xs">
              {industries.map((s) => (<li key={s.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /><span className="flex-1">{s.name}</span><span className="text-muted-foreground">{s.v}%</span>
              </li>))}
            </ul>
          </div>
        </SectionCard>

        <SectionCard title="Top Clients by Revenue" className="col-span-12 lg:col-span-6" right={
          <select className="bg-card border border-border rounded px-2 py-1 text-xs"><option>This Month</option></select>
        }>
          <ul className="space-y-3">
            {top.map((t, i) => (
              <li key={t.c} className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-md gradient-orange grid place-items-center text-xs font-bold text-white">{i + 1}</span>
                <span className="flex-1 text-sm">{t.c}</span>
                <span className="text-sm font-semibold">{t.v}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <DataSection
        config={{
          entity: "Client",
          entityPlural: "Clients",
          titleKey: "c",
          subtitleKey: "ind",
          kanban: { statusKey: "status", stages: ["Active", "Inactive"] },
          columns: [
            { key: "c", label: "Client Name" },
            { key: "ind", label: "Industry", kind: "select", options: ["IT Services", "Agriculture", "Finance", "Education", "Healthcare", "Others"] },
            { key: "email", label: "Email", kind: "email" },
            { key: "phone", label: "Phone", kind: "phone" },
            { key: "status", label: "Status", kind: "status" },
            { key: "deals", label: "Total Deals", kind: "number" },
            { key: "revenue", label: "Revenue", kind: "currency" },
          ],
          rows,
        }}
      />
    </div>
  );
}