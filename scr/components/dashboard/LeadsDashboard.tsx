import { Users, UserPlus, UserCheck, TrendingUp, CalendarDays } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { KpiCard, PageHeader, SectionCard, action } from "./parts";
import { DataSection } from "./EntityDashboard";

const series = [
  { d: "May 01", v: 320 }, { d: "May 06", v: 410 }, { d: "May 11", v: 380 },
  { d: "May 16", v: 520 }, { d: "May 21", v: 470 }, { d: "May 26", v: 610 }, { d: "May 31", v: 700 },
];
const sources = [
  { name: "Website", v: 45, color: "#ff6a00" },
  { name: "Referral", v: 25, color: "#ff8c00" },
  { name: "Social Media", v: 15, color: "#ffb347" },
  { name: "Email Campaign", v: 10, color: "#a855f7" },
  { name: "Others", v: 5, color: "#22c55e" },
];
const rows = [
  { name: "Michael Johnson", co: "Tech Solutions Inc.", email: "michael@tech.com", phone: "+1 555 123 4567", src: "Website", status: "New", rating: "Hot", assigned: "John Doe", created: "May 31, 2025" },
  { name: "Sarah Williams", co: "GreenField Agro Ltd.", email: "sarah@greenfield.com", phone: "+1 555 987 6543", src: "Referral", status: "Contacted", rating: "Warm", assigned: "John Doe", created: "May 30, 2025" },
  { name: "David Brown", co: "Finance Pro Group", email: "david@finance.com", phone: "+1 555 456 7890", src: "Social Media", status: "Qualified", rating: "Hot", assigned: "John Doe", created: "May 30, 2025" },
  { name: "Emma Davis", co: "Bright Future Ltd.", email: "emma@brightfuture.com", phone: "+1 555 321 6547", src: "Email Campaign", status: "New", rating: "Cold", assigned: "Mike Johnson", created: "May 29, 2025" },
  { name: "James Wilson", co: "Cloud Services LLC", email: "james@cloudserv.com", phone: "+1 555 654 3210", src: "Website", status: "Unqualified", rating: "Cold", assigned: "Jane Smith", created: "May 29, 2025" },
];

export default function LeadsDashboard() {
  return (
    <div className="space-y-4">
      <PageHeader title="Leads" subtitle="Manage your sales leads, track sources, and conversion." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Users} label="Total Leads" value="1,256" trend={15.3} />
        <KpiCard icon={UserPlus} label="New Leads" value="325" trend={12.5} />
        <KpiCard icon={UserCheck} label="Converted Leads" value="210" trend={8.4} />
        <KpiCard icon={TrendingUp} label="Conversion Rate" value="16.7%" trend={2.3} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <SectionCard title="Leads Over Time" className="col-span-12 lg:col-span-8" right={
          <select className="bg-card border border-border rounded px-2 py-1 text-xs"><option>This Month</option><option>Last Month</option></select>
        }>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
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
              <ResponsiveContainer><PieChart><Pie data={sources} dataKey="v" innerRadius={60} outerRadius={90} paddingAngle={2}>
                {sources.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie></PieChart></ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center"><div className="text-2xl font-bold">1,256</div><div className="text-xs text-muted-foreground">Total</div></div>
              </div>
            </div>
            <ul className="flex-1 space-y-1.5 text-xs">
              {sources.map((s) => (<li key={s.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /><span className="flex-1">{s.name}</span><span className="text-muted-foreground">{s.v}%</span>
              </li>))}
            </ul>
          </div>
        </SectionCard>
      </div>

      <DataSection
        config={{
          entity: "Lead",
          entityPlural: "Leads",
          titleKey: "name",
          subtitleKey: "co",
          kanban: { statusKey: "status", stages: ["New", "Contacted", "Qualified", "Unqualified"] },
          columns: [
            { key: "name", label: "Name" },
            { key: "co", label: "Company" },
            { key: "email", label: "Email", kind: "email" },
            { key: "phone", label: "Phone", kind: "phone" },
            { key: "src", label: "Source", kind: "select", options: ["Website", "Referral", "Social Media", "Email Campaign", "Others"] },
            { key: "status", label: "Status", kind: "status" },
            { key: "rating", label: "Rating", kind: "select", options: ["Hot", "Warm", "Cold"] },
            { key: "assigned", label: "Assigned To" },
            { key: "created", label: "Created", kind: "date" },
          ],
          rows,
        }}
      />

      <SectionCard title="Today's Schedule" right={<button onClick={action("Opening calendar")} className="text-xs text-orange-400 hover:underline">View Calendar</button>}>
        <div className="flex items-center gap-3 text-sm">
          <CalendarDays className="h-5 w-5 text-orange-400" />
          <span>3 Meetings scheduled today</span>
        </div>
      </SectionCard>
    </div>
  );
}