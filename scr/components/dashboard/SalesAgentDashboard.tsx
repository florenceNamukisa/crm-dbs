import {
  Users, Briefcase, Trophy, BarChart3, DollarSign, TrendingUp, CheckSquare, Repeat,
  UserPlus, Plus, CalendarPlus, PhoneCall, ListPlus, Mail, MessageCircle, FileText,
  ArrowUp, ArrowDown, Send, ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from "recharts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import { apiFetch } from "@/lib/auth";
import { useFormDialog } from "@/hooks/useFormDialog";
import { sendWhatsAppMessage, WHATSAPP_CONTACT } from "@/lib/communications";

const ORANGE = "#ff8c00";
const ORANGE_DEEP = "#ff6a00";

const kpis = [
  { icon: Users, label: "Leads Assigned", value: "125", trend: 18, up: true },
  { icon: Briefcase, label: "Active Deals", value: "28", trend: 12, up: true },
  { icon: Trophy, label: "Won Deals", value: "15", trend: 25, up: true },
  { icon: BarChart3, label: "Pipeline Value", value: "$245,800", trend: 16, up: true },
  { icon: DollarSign, label: "Revenue (This Month)", value: "$89,450", trend: 20, up: true },
  { icon: TrendingUp, label: "Conversion Rate", value: "18.6%", trend: 2.4, up: true },
  { icon: CheckSquare, label: "Tasks Due Today", value: "8", trend: 11, up: false },
  { icon: Repeat, label: "Follow-ups Due", value: "14", trend: 7, up: false },
];

const pipeline = [
  { stage: "New Lead", n: 50, pct: 100 },
  { stage: "Contacted", n: 35, pct: 70 },
  { stage: "Qualified", n: 24, pct: 48 },
  { stage: "Proposal Sent", n: 18, pct: 36 },
  { stage: "Negotiation", n: 12, pct: 24 },
  { stage: "Won", n: 15, pct: 30 },
];

const revenue = [
  { d: "May 01", v: 18000 }, { d: "May 06", v: 32000 }, { d: "May 11", v: 28000 },
  { d: "May 16", v: 45000 }, { d: "May 21", v: 52000 }, { d: "May 26", v: 70000 }, { d: "May 31", v: 89000 },
];

const sources = [
  { name: "Website", value: 35, pct: 28, color: "#ff6a00" },
  { name: "Referral", value: 28, pct: 22, color: "#ff8c00" },
  { name: "Social Media", value: 25, pct: 20, color: "#ffb347" },
  { name: "Email Campaign", value: 18, pct: 14, color: "#a855f7" },
  { name: "Cold Call", value: 12, pct: 10, color: "#6366f1" },
  { name: "Others", value: 7, pct: 6, color: "#22c55e" },
];

const tasks = [
  { t: "Follow up with Tech Solutions Inc.", time: "10:00 AM", p: "High" },
  { t: "Send proposal to Global Marketing Co.", time: "11:30 AM", p: "High" },
  { t: "Call Sarah Williams", time: "02:00 PM", p: "Medium" },
  { t: "Prepare quote for Bright Future Ltd.", time: "03:30 PM", p: "Medium" },
  { t: "Follow up with Data Pro Systems", time: "05:00 PM", p: "Low" },
  { t: "Meeting with Cloud Services LLC", time: "06:00 PM", p: "Low" },
];

const leads = [
  { name: "Michael Johnson", co: "Tech Solutions Inc.", src: "Website", status: "New", score: 85, on: "May 30, 2025" },
  { name: "Sarah Williams", co: "Global Marketing Co.", src: "Referral", status: "Contacted", score: 78, on: "May 30, 2025" },
  { name: "David Brown", co: "Data Pro Systems", src: "Social Media", status: "Qualified", score: 72, on: "May 29, 2025" },
  { name: "Emma Davis", co: "Bright Future Ltd.", src: "Email Campaign", status: "New", score: 65, on: "May 29, 2025" },
  { name: "James Wilson", co: "Cloud Services LLC", src: "Cold Call", status: "Contacted", score: 60, on: "May 28, 2025" },
];

const deals = [
  { n: "Tech Solutions CRM Deal", stage: "Proposal Sent", amt: "$25,000", close: "Jun 05, 2025", prob: 75 },
  { n: "Global Marketing Project", stage: "Negotiation", amt: "$18,500", close: "Jun 10, 2025", prob: 60 },
  { n: "Data Pro Systems Deal", stage: "Qualified", amt: "$32,000", close: "Jun 15, 2025", prob: 50 },
  { n: "Bright Future Implementation", stage: "Proposal Sent", amt: "$12,750", close: "Jun 20, 2025", prob: 70 },
  { n: "Cloud Services Contract", stage: "Negotiation", amt: "$45,000", close: "Jun 25, 2025", prob: 65 },
];

const meetings = [
  { co: "Tech Solutions Inc.", t: "Product Demo", date: "May 31, 2025", time: "10:00 AM" },
  { co: "Global Marketing Co.", t: "Proposal Discussion", date: "May 31, 2025", time: "02:00 PM" },
  { co: "Data Pro Systems", t: "Requirement Review", date: "Jun 01, 2025", time: "11:00 AM" },
  { co: "Cloud Services LLC", t: "Contract Discussion", date: "Jun 01, 2025", time: "04:00 PM" },
];

const followups = [
  { name: "Sarah Williams", co: "Global Marketing Co.", when: "Today" },
  { name: "Michael Johnson", co: "Tech Solutions Inc.", when: "Tomorrow" },
  { name: "David Brown", co: "Data Pro Systems", when: "Jun 02, 2025" },
  { name: "Emma Davis", co: "Bright Future Ltd.", when: "Jun 03, 2025" },
  { name: "James Wilson", co: "Cloud Services LLC", when: "Jun 04, 2025" },
];

const activities = [
  { t: "New lead assigned: Tech Solutions Inc.", when: "2 min ago" },
  { t: "Sarah Williams opened your email", when: "15 min ago" },
  { t: "Follow-up completed with Data Pro Systems", when: "1 hour ago" },
  { t: "Deal won: Bright Future Ltd.", when: "2 hours ago" },
  { t: "Invoice INV-2025-0056 created", when: "3 hours ago" },
];

const messages = [
  { name: "Sarah Williams", msg: "Please find the proposal attached.", time: "10:30 AM", n: 2 },
  { name: "Michael Johnson", msg: "Can we schedule a call today?", time: "09:15 AM", n: 1 },
  { name: "Global Marketing Co.", msg: "Re: Proposal for CRM Implementation", time: "Yesterday" },
  { name: "+1 (555) 123-4567", msg: "WhatsApp message", time: "Yesterday" },
];

const aiSuggestions = [
  "Show me my top deals to close this month",
  "Which leads should I prioritize today?",
  "Write a follow-up email to Sarah Williams",
  "Show me my sales performance",
];

type DashboardPayload = {
  kpis: Array<Omit<(typeof kpis)[number], "icon"> & { icon?: (typeof kpis)[number]["icon"] }>;
  pipeline: typeof pipeline;
  revenue: typeof revenue;
  sources: typeof sources;
  tasks: typeof tasks;
  leads: typeof leads;
  deals: typeof deals;
  meetings: typeof meetings;
  followups: typeof followups;
  activities: typeof activities;
  messages: typeof messages;
};

const fallbackDashboard: DashboardPayload = {
  kpis,
  pipeline,
  revenue,
  sources,
  tasks,
  leads,
  deals,
  meetings,
  followups,
  activities,
  messages,
};

function statusColor(s: string) {
  switch (s) {
    case "New": return "text-orange-400";
    case "Contacted": return "text-amber-400";
    case "Qualified": return "text-emerald-400";
    default: return "text-muted-foreground";
  }
}
function priorityBadge(p: string) {
  const map: Record<string, string> = {
    High: "bg-red-500/15 text-red-400 border-red-500/30",
    Medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  };
  return `text-[10px] px-2 py-0.5 rounded border ${map[p]}`;
}

export default function SalesAgentDashboard() {
  const queryClient = useQueryClient();
  const { setOpenForm } = useFormDialog();
  const { data } = useQuery({
    queryKey: ["sales-dashboard"],
    queryFn: () => apiFetch<DashboardPayload>("/dashboard/sales"),
  });
  const dashboard = data ?? fallbackDashboard;

  async function scheduleMeeting() {
    try {
      const co = window.prompt("Company:");
      if (!co) return;
      const t = window.prompt("Title:") || "Meeting";
      const date = window.prompt("Date (e.g. Jun 01, 2025):") || undefined;
      const time = window.prompt("Time (e.g. 10:00 AM):") || undefined;
      await apiFetch("/meetings", { method: "POST", body: JSON.stringify({ co, t, date, time }) });
      alert("Meeting scheduled");
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard"] as unknown as readonly unknown[] });
    } catch (err: any) {
      alert(err.message || "Failed to schedule meeting");
    }
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* KPI row */}
      <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {dashboard.kpis.map((k, index) => {
          const Icon = k.icon ?? kpis[index]?.icon ?? Users;
          return (
            <div key={k.label} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="icon-tile h-10 w-10 rounded-lg grid place-items-center">
                  <Icon className="h-5 w-5 text-orange-400" />
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">{k.label}</div>
              <div className="text-2xl font-bold mt-0.5">{k.value}</div>
              <div className={"text-[11px] mt-1 flex items-center gap-1 " + (k.up ? "text-emerald-400" : "text-red-400")}>
                {k.up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {k.trend}% <span className="text-muted-foreground">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main 3-col + right rail */}
      <div className="col-span-12 xl:col-span-9 grid grid-cols-12 gap-4">
        {/* Sales Pipeline funnel */}
        <div className="col-span-12 lg:col-span-4 glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Sales Pipeline</h3>
            <a className="text-xs text-orange-400 hover:underline cursor-pointer">View full pipeline</a>
          </div>
          <div className="space-y-2">
            {dashboard.pipeline.map((p) => (
              <div key={p.stage} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full gradient-orange" />
                <div className="text-sm flex-1">{p.stage}</div>
                <div className="text-xs text-muted-foreground w-28 text-right">{p.n} ({p.pct}%)</div>
              </div>
            ))}
            <div className="mt-3 space-y-1">
              {dashboard.pipeline.map((p) => (
                <div key={p.stage} className="h-7 rounded gradient-orange opacity-90" style={{ width: `${p.pct}%` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="col-span-12 lg:col-span-4 glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Revenue Trend</h3>
            <select className="bg-card border border-border rounded px-2 py-1 text-xs">
              <option>This Month</option><option>Last Month</option>
            </select>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboard.revenue}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ORANGE} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="d" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `$${v / 1000}K`} />
                <Tooltip contentStyle={{ background: "#222", border: "1px solid #444", borderRadius: 8 }} />
                <Area type="monotone" dataKey="v" stroke={ORANGE_DEEP} strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leads by Source donut */}
        <div className="col-span-12 lg:col-span-4 glass-card rounded-xl p-4">
          <h3 className="font-semibold mb-3">Leads by Source</h3>
          <div className="flex items-center gap-4">
            <div className="relative h-[200px] w-[200px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={dashboard.sources} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={2}>
                    {dashboard.sources.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center">
                  <div className="text-2xl font-bold">125</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
            </div>
            <ul className="flex-1 space-y-1.5 text-xs">
              {dashboard.sources.map((s) => (
                <li key={s.name} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span className="flex-1">{s.name}</span>
                  <span className="text-muted-foreground">{s.value} ({s.pct}%)</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Quick actions */}
        <div className="col-span-12 glass-card rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { i: UserPlus, l: "Add Lead", on: () => setOpenForm("lead") },
            { i: Plus, l: "Add Deal", on: () => setOpenForm("sale") },
            { i: CalendarPlus, l: "Schedule Meeting", on: scheduleMeeting },
            { i: PhoneCall, l: "Log Call", on: () => alert("(Demo) Call logged") },
            { i: ListPlus, l: "Add Task", on: () => setOpenForm("task") },
            { i: Mail, l: "Send Email", on: () => alert("(Demo) Email sent") },
            { i: MessageCircle, l: "Send WhatsApp", on: () => sendWhatsAppMessage(WHATSAPP_CONTACT, "Hi! I'm reaching out from the CRM") },
            { i: FileText, l: "Create Client", on: () => setOpenForm("client") },
          ].map(({ i: I, l, on }) => (
            <button key={l} onClick={on} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition text-sm">
              <span className="icon-tile h-8 w-8 rounded-md grid place-items-center"><I className="h-4 w-4 text-orange-400" /></span>
              <span>{l}</span>
            </button>
          ))}
        </div>


        {/* Recent Leads */}
        <div className="col-span-12 lg:col-span-6 glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Recent Leads</h3>
            <a className="text-xs text-orange-400 cursor-pointer">View all</a>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="text-left">
                <th className="font-normal pb-2">Name</th><th className="font-normal pb-2">Company</th>
                <th className="font-normal pb-2">Source</th><th className="font-normal pb-2">Status</th>
                <th className="font-normal pb-2">Score</th><th className="font-normal pb-2">Assigned On</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.leads.map((l) => (
                <tr key={l.name} className="border-t border-border/50">
                  <td className="py-2">{l.name}</td>
                  <td className="text-muted-foreground">{l.co}</td>
                  <td className="text-muted-foreground">{l.src}</td>
                  <td className={statusColor(l.status)}>{l.status}</td>
                  <td>{l.score}</td>
                  <td className="text-muted-foreground">{l.on}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between text-xs mt-3 text-muted-foreground">
            <span>Showing 1 to 5 of 20 leads</span>
            <a className="text-orange-400 cursor-pointer">View all leads</a>
          </div>
        </div>

        {/* Active Deals */}
        <div className="col-span-12 lg:col-span-6 glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Active Deals</h3>
            <a className="text-xs text-orange-400 cursor-pointer">View all</a>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="text-left">
                <th className="font-normal pb-2">Deal Name</th><th className="font-normal pb-2">Stage</th>
                <th className="font-normal pb-2">Amount</th><th className="font-normal pb-2">Close Date</th>
                <th className="font-normal pb-2">Probability</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.deals.map((d) => (
                <tr key={d.n} className="border-t border-border/50">
                  <td className="py-2">{d.n}</td>
                  <td><span className="text-[11px] px-2 py-0.5 rounded gradient-orange text-white">{d.stage}</span></td>
                  <td>{d.amt}</td>
                  <td className="text-muted-foreground">{d.close}</td>
                  <td>{d.prob}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between text-xs mt-3">
            <span className="text-muted-foreground">Total Pipeline Value: $245,800</span>
            <a className="text-orange-400 cursor-pointer">View all deals</a>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="col-span-12 lg:col-span-4 glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Activity Feed</h3>
            <a className="text-xs text-orange-400 cursor-pointer">View all</a>
          </div>
          <ul className="space-y-3">
            {dashboard.activities.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="icon-tile h-8 w-8 rounded-md grid place-items-center mt-0.5">
                  <Activity className="h-4 w-4 text-orange-400" />
                </span>
                <div className="flex-1">
                  <div className="text-sm">{a.t}</div>
                  <div className="text-xs text-muted-foreground">{a.when}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Communication center */}
        <div className="col-span-12 lg:col-span-4 glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Communication Center</h3>
            <a className="text-xs text-orange-400 cursor-pointer">View all</a>
          </div>
          <div className="flex gap-2 text-xs mb-3">
            {["All", "Email", "WhatsApp", "SMS", "Calls"].map((t, i) => (
              <button key={t} className={"px-3 py-1 rounded-full border " + (i === 0 ? "gradient-orange text-white border-transparent" : "border-border text-muted-foreground")}>{t}</button>
            ))}
          </div>
          <ul className="space-y-3">
            {dashboard.messages.map((m, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 grid place-items-center text-xs text-white font-semibold">
                  {m.name.split(" ").map(s => s[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm">
                    <span className="truncate">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.time}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{m.msg}</div>
                </div>
                {m.n && <span className="text-[10px] gradient-orange text-white rounded-full h-5 w-5 grid place-items-center">{m.n}</span>}
              </li>
            ))}
          </ul>
        </div>

        {/* Sales Performance */}
        <div className="col-span-12 lg:col-span-4 glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Sales Performance</h3>
            <select className="bg-card border border-border rounded px-2 py-1 text-xs"><option>This Month</option></select>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-xs text-muted-foreground">Revenue Target</div>
              <div className="text-xl font-bold">$100,000</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Achieved</div>
              <div className="text-xl font-bold">$89,450</div>
            </div>
          </div>
          <div className="h-[150px] relative">
            <ResponsiveContainer>
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: "x", value: 89, fill: ORANGE }]} startAngle={90} endAngle={-270}>
                <RadialBar background={{ fill: "#ffffff15" }} dataKey="value" cornerRadius={10} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="text-2xl font-bold">89%</div>
                <div className="text-xs text-muted-foreground">Achieved</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2 text-center text-xs">
            {[["Deals Won", "15", "+25%"], ["Avg. Deal Size", "$5,963", "+8%"], ["Calls Made", "42", "+12%"], ["Meetings Held", "18", "+20%"]].map(([l, v, c]) => (
              <div key={l}>
                <div className="text-muted-foreground">{l}</div>
                <div className="font-semibold text-sm">{v}</div>
                <div className="text-emerald-400 text-[10px]">{c}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-2"><a className="text-xs text-orange-400 cursor-pointer">View full performance report</a></div>
        </div>
      </div>

      {/* Right rail */}
      <div className="col-span-12 xl:col-span-3 space-y-4">
        {/* Tasks Due Today */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Tasks Due Today</h3>
            <a className="text-xs text-orange-400 cursor-pointer">View all</a>
          </div>
          <ul className="space-y-2.5">
            {dashboard.tasks.map((t) => (
              <li key={t.t} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded accent-orange-500" />
                <span className="flex-1 truncate">{t.t}</span>
                <span className="text-xs text-muted-foreground">{t.time}</span>
                <span className={priorityBadge(t.p)}>{t.p}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Upcoming Meetings */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Upcoming Meetings</h3>
            <a className="text-xs text-orange-400 cursor-pointer">View all</a>
          </div>
          <ul className="space-y-3">
            {dashboard.meetings.map((m) => (
              <li key={m.co} className="flex items-start gap-3">
                <span className="icon-tile h-9 w-9 rounded-md grid place-items-center"><CalendarPlus className="h-4 w-4 text-orange-400" /></span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{m.co}</div>
                  <div className="text-xs text-muted-foreground">{m.t}</div>
                </div>
                <div className="text-right text-xs">
                  <div>{m.date}</div>
                  <div className="text-muted-foreground">{m.time}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Follow-ups Due */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Follow-ups Due</h3>
            <a className="text-xs text-orange-400 cursor-pointer">View all</a>
          </div>
          <ul className="space-y-2">
            {dashboard.followups.map((f) => (
              <li key={f.name} className="flex items-center justify-between text-sm">
                <div>
                  <div>{f.name}</div>
                  <div className="text-xs text-muted-foreground">{f.co}</div>
                </div>
                <span className="text-xs text-orange-400">{f.when}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* AI Assistant */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="icon-tile h-8 w-8 rounded-md grid place-items-center">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-orange-400" fill="currentColor"><path d="M12 2l2.4 5 5.6.6-4.2 3.8 1.3 5.6L12 14l-5.1 3 1.3-5.6L4 7.6 9.6 7z"/></svg>
            </span>
            <h3 className="font-semibold">AI Sales Assistant</h3>
          </div>
          <div className="text-xs text-muted-foreground mb-2 text-center">How can I help you today?</div>
          <ul className="space-y-1.5">
            {aiSuggestions.map((s) => (
              <li key={s}>
                <button className="w-full text-left text-sm flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent">
                  <ChevronRight className="h-3 w-3 text-orange-400" />{s}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 relative">
            <input placeholder="Ask me anything..." className="w-full h-9 pl-3 pr-10 rounded-lg bg-card border border-border text-sm outline-none" />
            <button className="absolute right-1 top-1 h-7 w-7 rounded-md gradient-orange grid place-items-center">
              <Send className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Activity(props: ComponentProps<typeof Repeat>) {
  return <Repeat {...props} />;
}
