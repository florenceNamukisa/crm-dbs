import { useState } from "react";
import {
  Activity, Archive, Bell, Bot, Brain, Briefcase, Building2, Calendar, ChevronDown,
  CircleDollarSign, Clock, CreditCard, FileBarChart, FileText, Flag,
  Gauge, Lock, Mail, Menu, MessageCircle,
  Network, NotebookPen, Package, PhoneCall, Plus, Search, Settings,
  ShieldCheck, Star, Ticket, Users, Workflow, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Funnel, FunnelChart,
  LabelList, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const ORANGE = "#ff8c00";
const ORANGE_DEEP = "#ff6a00";
const ORANGE_LIGHT = "#ffb347";
const GREEN = "#22c55e";
type View = "table" | "cards" | "kanban";

const navSections: Array<{ title: string; items: Array<{ label: string; icon: LucideIcon; badge?: string }> }> = [
  { title: "Workspace", items: [
    { label: "Dashboard", icon: Gauge },
    { label: "User Management", icon: Users },
    { label: "Departments", icon: Building2 },
    { label: "Branches/Regions", icon: Network },
    { label: "Leads", icon: Star, badge: "325" },
    { label: "Clients & Organizations", icon: Building2 },
    { label: "Contacts", icon: Users },
    { label: "Deals & Sales Pipeline", icon: Briefcase },
  ] },
  { title: "Activities", items: [
    { label: "Calendar", icon: Calendar },
    { label: "Tasks", icon: Clock },
    { label: "Support Tickets", icon: Ticket, badge: "18" },
    { label: "Communications", icon: MessageCircle },
    { label: "Email", icon: Mail },
    { label: "WhatsApp", icon: MessageCircle },
    { label: "SMS", icon: PhoneCall },
    { label: "Calls", icon: PhoneCall },
    { label: "Meetings", icon: Calendar },
    { label: "Follow-ups", icon: Activity },
  ] },
  { title: "Sales & Finance", items: [
    { label: "Products & Services", icon: Package },
    { label: "Quotations", icon: FileText },
    { label: "Invoices", icon: FileText },
    { label: "Payments", icon: CreditCard },
    { label: "Reports", icon: FileBarChart },
    { label: "Pipeline Reports", icon: FileBarChart },
    { label: "Sales Performance Reports", icon: FileBarChart },
    { label: "Activity Reports", icon: Activity },
  ] },
  { title: "Platform", items: [
    { label: "AI Assistant", icon: Brain },
    { label: "Workflow Automation", icon: Workflow },
    { label: "Documents", icon: Archive },
    { label: "Notes", icon: NotebookPen },
    { label: "Integrations", icon: Network },
    { label: "Security", icon: ShieldCheck },
    { label: "Audit Logs", icon: Lock },
    { label: "Notifications", icon: Bell },
    { label: "Settings", icon: Settings },
    { label: "Billing", icon: CircleDollarSign },
    { label: "Company Branding", icon: Flag },
  ] },
];

const kpis = [
  { icon: CircleDollarSign, label: "Monthly Sales Revenue", value: "$284,900", sub: "+18.4%", up: true },
  { icon: Briefcase, label: "Total Deals", value: "428", sub: "+32", up: true },
  { icon: Star, label: "Total Leads", value: "1,256", sub: "+325", up: true },
  { icon: Building2, label: "Total Clients", value: "342", sub: "+24", up: true },
  { icon: Users, label: "Active Users", value: "86", sub: "94% online", up: true },
  { icon: Zap, label: "Conversion Rate", value: "22.8%", sub: "+3.1%", up: true },
  { icon: Clock, label: "Pending Tasks", value: "74", sub: "18 urgent", up: false },
  { icon: Calendar, label: "Upcoming Meetings", value: "26", sub: "today", up: true },
  { icon: Ticket, label: "Support Tickets", value: "18", sub: "4 critical", up: false },
  { icon: FileBarChart, label: "Pipeline Value", value: "$1.84M", sub: "+12.9%", up: true },
  { icon: CreditCard, label: "Invoice Collections", value: "$196K", sub: "+8.2%", up: true },
  { icon: Brain, label: "AI Predictions", value: "87%", sub: "forecast confidence", up: true },
];

const revenue = [
  { d: "May 01", v: 42, leads: 90 }, { d: "May 06", v: 68, leads: 130 }, { d: "May 11", v: 74, leads: 180 },
  { d: "May 16", v: 115, leads: 230 }, { d: "May 21", v: 96, leads: 270 }, { d: "May 26", v: 134, leads: 320 }, { d: "May 31", v: 168, leads: 390 },
];
const funnel = [
  { name: "New Lead", value: 325, fill: ORANGE_LIGHT }, { name: "Contacted", value: 240, fill: ORANGE },
  { name: "Proposal", value: 136, fill: ORANGE_DEEP }, { name: "Negotiation", value: 92, fill: "#a855f7" },
  { name: "Closed Won", value: 64, fill: GREEN }, { name: "Lost", value: 28, fill: "#ef4444" },
];
const sources = [
  { name: "Website", value: 42, color: ORANGE_DEEP }, { name: "Referral", value: 26, color: ORANGE },
  { name: "Campaigns", value: 18, color: ORANGE_LIGHT }, { name: "WhatsApp", value: 14, color: GREEN },
];
const agents = [
  ["John Doe", "$82,450", "86%", "$4,120"], ["Sarah Williams", "$71,220", "78%", "$3,560"],
  ["Mike Johnson", "$64,800", "72%", "$3,240"], ["Emma Davis", "$51,900", "66%", "$2,595"],
];
const leads = [
  { name: "Michael Johnson", company: "Tech Solutions Inc.", rating: "Hot", status: "New", agent: "John Doe", reminder: "Today 2 PM" },
  { name: "Sarah Williams", company: "GreenField Agro", rating: "Warm", status: "Contacted", agent: "John Doe", reminder: "Tomorrow" },
  { name: "David Brown", company: "Finance Pro Group", rating: "Hot", status: "Qualified", agent: "Mike Johnson", reminder: "Fri 10 AM" },
  { name: "Emma Davis", company: "Bright Future Ltd.", rating: "Cold", status: "Unqualified", agent: "Sarah Williams", reminder: "Next week" },
  { name: "James Wilson", company: "Cloud Services LLC", rating: "Warm", status: "Converted", agent: "Emma Davis", reminder: "Done" },
];
const clients = [
  ["Tech Solutions Inc.", "Technology", "12 contacts", "$42,800", "96"], ["GreenField Agro", "Agriculture", "8 contacts", "$18,200", "84"],
  ["Finance Pro Group", "Finance", "15 contacts", "$63,900", "91"], ["Cloud Services LLC", "Cloud", "9 contacts", "$22,400", "78"],
];
const tickets = [
  ["API sync failing", "Critical", "2h SLA", "Escalated"], ["Invoice dispute", "Medium", "12h SLA", "Open"],
  ["Login issue", "Low", "24h SLA", "Waiting"], ["Data import review", "Medium", "8h SLA", "Internal note"],
];
const users = [
  ["EMP-001", "John Doe", "Sales", "Central", "Admin", "Online", "94%"],
  ["EMP-014", "Sarah Williams", "Sales", "East", "Manager", "Online", "88%"],
  ["EMP-029", "Mike Johnson", "Support", "West", "Agent", "Idle", "76%"],
  ["EMP-041", "Emma Davis", "Marketing", "Central", "User", "Offline", "82%"],
];
const tasks = [
  ["Follow up Tech Solutions", "High", "Today", "John Doe"], ["Prepare quotation", "Medium", "Tomorrow", "Sarah Williams"],
  ["Schedule renewal call", "High", "Fri", "Mike Johnson"], ["Upload contract notes", "Low", "Next week", "Emma Davis"],
];

function Panel({ title, action, children, className = "" }: { title: string; action?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`glass-card rounded-lg p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gradient-orange">{title}</h3>
        {action && <button className="text-xs text-orange-400 hover:underline">{action}</button>}
      </div>
      {children}
    </section>
  );
}

function Badge({ value }: { value: string }) {
  const color = value.includes("Hot") || value.includes("Critical") || value.includes("High") ? "border-red-500/30 bg-red-500/10 text-red-300" : value.includes("Warm") || value.includes("Medium") ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : value.includes("Online") || value.includes("Active") || value.includes("Qualified") || value.includes("Converted") ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-border text-muted-foreground";
  return <span className={`rounded border px-2 py-0.5 text-[10px] ${color}`}>{value}</span>;
}

function Kpi({ icon: Icon, label, value, sub, up }: { icon: LucideIcon; label: string; value: string; sub: string; up: boolean }) {
  return (
    <div className="glass-card rounded-lg p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full gradient-orange shadow-lg shadow-orange-950/40"><Icon className="h-5 w-5 text-white" /></span>
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
          <div className={`text-[11px] ${up ? "text-emerald-400" : "text-red-400"}`}>{up ? "↑" : "↓"} {sub}</div>
        </div>
      </div>
    </div>
  );
}

function LeadsTable({ openAction }: { openAction: (title: string) => void }) {
  return (
    <Panel title="Leads Management" action="Advanced filters" className="col-span-12">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none" placeholder="Search leads, tags, agents, reminders..." /></div>
        {["PDF", "Excel", "CSV"].map((x) => <button key={x} className="h-9 rounded-md border border-border px-3 text-xs hover:bg-accent">{x}</button>)}
      </div>
      <div className="overflow-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="text-xs text-muted-foreground"><tr className="text-left">{["Lead", "Company", "Rating", "Status", "Assigned", "Reminder", "Actions"].map((h) => <th key={h} className="pb-2 pr-3 font-normal">{h}</th>)}</tr></thead>
          <tbody>{leads.map((lead) => <tr key={lead.name} className="border-t border-border/50"><td className="py-2 pr-3 font-medium">{lead.name}</td><td className="pr-3 text-muted-foreground">{lead.company}</td><td className="pr-3"><Badge value={lead.rating} /></td><td className="pr-3"><Badge value={lead.status} /></td><td className="pr-3">{lead.agent}</td><td className="pr-3 text-muted-foreground">{lead.reminder}</td><td><div className="flex gap-1">{[PhoneCall, Mail, MessageCircle, Clock, Calendar].map((Icon, i) => <button key={i} onClick={() => openAction(["Call Lead", "Email Lead", "WhatsApp Lead", "Create Task", "Schedule Meeting"][i])} className="grid h-7 w-7 place-items-center rounded border border-border hover:bg-accent"><Icon className="h-3.5 w-3.5" /></button>)}</div></td></tr>)}</tbody>
        </table>
      </div>
    </Panel>
  );
}

function KanbanBoard({ title, items }: { title: string; items: typeof leads }) {
  const stages = ["New", "Contacted", "Qualified", "Converted"];
  return (
    <Panel title={title} action="Board settings" className="col-span-12">
      <div className="grid gap-3 lg:grid-cols-4">
        {stages.map((stage) => <div key={stage} className="rounded-lg border border-border bg-card/30 p-3"><div className="mb-3 flex justify-between text-sm font-semibold"><span>{stage}</span><span className="rounded bg-white/10 px-2 text-xs">{items.filter((x) => x.status === stage).length}</span></div><div className="space-y-2">{items.filter((x) => x.status === stage).map((lead) => <div key={lead.name} className="rounded border border-border bg-background/30 p-3 text-sm"><div className="font-medium">{lead.name}</div><div className="text-xs text-muted-foreground">{lead.company}</div><div className="mt-2 flex justify-between"><Badge value={lead.rating} /><span className="text-xs text-orange-400">{lead.agent}</span></div></div>)}</div></div>)}
      </div>
    </Panel>
  );
}

function Dashboard({ openAction }: { openAction: (title: string) => void }) {
  return (
    <div className="grid grid-cols-12 gap-4">
      <section className="col-span-12 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{kpis.map((k) => <Kpi key={k.label} {...k} />)}</section>
      <Panel title="Sales Revenue Trend" action="This Month" className="col-span-12 xl:col-span-6"><div className="h-72"><ResponsiveContainer><AreaChart data={revenue}><defs><linearGradient id="tenantRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ORANGE} stopOpacity={0.75} /><stop offset="100%" stopColor={ORANGE_DEEP} stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#ffffff12" /><XAxis dataKey="d" stroke="#888" fontSize={10} /><YAxis stroke="#888" fontSize={10} /><Tooltip contentStyle={{ background: "#111", border: "1px solid #ffffff22", borderRadius: 8 }} /><Area dataKey="v" stroke={ORANGE} fill="url(#tenantRevenue)" /></AreaChart></ResponsiveContainer></div></Panel>
      <Panel title="Lead Sources" className="col-span-12 md:col-span-6 xl:col-span-3"><div className="relative h-64"><ResponsiveContainer><PieChart><Pie data={sources} dataKey="value" innerRadius={62} outerRadius={96}>{sources.map((s) => <Cell key={s.name} fill={s.color} />)}</Pie></PieChart></ResponsiveContainer><div className="absolute inset-0 grid place-items-center text-center"><div><div className="text-2xl font-bold">1,256</div><div className="text-xs text-muted-foreground">Leads</div></div></div></div></Panel>
      <Panel title="Sales Pipeline Funnel" className="col-span-12 md:col-span-6 xl:col-span-3"><div className="h-64"><ResponsiveContainer><FunnelChart><Tooltip contentStyle={{ background: "#111", border: "1px solid #ffffff22", borderRadius: 8 }} /><Funnel dataKey="value" data={funnel}><LabelList position="right" fill="#fff" stroke="none" dataKey="name" /></Funnel></FunnelChart></ResponsiveContainer></div></Panel>
      <Panel title="Team Performance" action="Targets" className="col-span-12 xl:col-span-5">{agents.map(([name, revenueValue, conversion, commission]) => <div key={name} className="mb-3 grid grid-cols-[1fr_90px_70px_80px] items-center gap-2 rounded border border-border bg-card/35 p-3 text-sm"><span>{name}</span><span>{revenueValue}</span><span className="text-emerald-400">{conversion}</span><span>{commission}</span></div>)}</Panel>
      <LeadsTable openAction={openAction} />
      <Panel title="Clients & Organizations" className="col-span-12 xl:col-span-7"><div className="grid gap-3 md:grid-cols-2">{clients.map(([name, industry, contacts, balance, health]) => <div key={name} className="rounded border border-border bg-card/35 p-4"><div className="flex justify-between"><div><div className="font-semibold">{name}</div><div className="text-xs text-muted-foreground">{industry} · {contacts}</div></div><span className="text-emerald-400">{health}% health</span></div><div className="mt-3 text-sm">Outstanding balance: {balance}</div></div>)}</div></Panel>
      <Panel title="AI Sales Assistant" className="col-span-12 xl:col-span-5">{["Prioritize Tech Solutions follow-up", "GreenField renewal risk detected", "Forecast: $318K likely close this month", "Meeting summary ready for Finance Pro"].map((i) => <div key={i} className="mb-2 flex items-center gap-2 rounded border border-border bg-card/35 p-3 text-sm"><Bot className="h-4 w-4 text-orange-400" />{i}</div>)}</Panel>
    </div>
  );
}

function SectionView({ section, openAction }: { section: string; openAction: (title: string) => void }) {
  const [view, setView] = useState<View>("table");
  if (section === "Dashboard") return <Dashboard openAction={openAction} />;
  if (["Leads", "Deals & Sales Pipeline"].includes(section)) {
    return <div className="grid grid-cols-12 gap-4"><section className="col-span-12 flex gap-2">{(["table", "cards", "kanban"] as const).map((mode) => <button key={mode} onClick={() => setView(mode)} className={`rounded px-3 py-1.5 text-xs capitalize ${view === mode ? "gradient-orange text-white" : "border border-border bg-card hover:bg-accent"}`}>{mode}</button>)}</section>{view === "table" && <LeadsTable openAction={openAction} />}{view === "cards" && <Panel title="Lead Cards" className="col-span-12"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{leads.map((l) => <div key={l.name} className="rounded border border-border bg-card/35 p-4"><div className="font-semibold">{l.name}</div><div className="text-xs text-muted-foreground">{l.company}</div><div className="mt-3 flex gap-2"><Badge value={l.rating} /><Badge value={l.status} /></div></div>)}</div></Panel>}{view === "kanban" && <KanbanBoard title="Sales Pipeline Kanban" items={leads} />}<Panel title="Pipeline Trend" className="col-span-12 xl:col-span-6"><div className="h-64"><ResponsiveContainer><LineChart data={revenue}><CartesianGrid stroke="#ffffff12" /><XAxis dataKey="d" stroke="#888" fontSize={10} /><YAxis stroke="#888" fontSize={10} /><Tooltip contentStyle={{ background: "#111", border: "1px solid #ffffff22", borderRadius: 8 }} /><Line dataKey="leads" stroke={ORANGE} /></LineChart></ResponsiveContainer></div></Panel><Panel title="AI Deal Predictions" className="col-span-12 xl:col-span-6">{["Tech Solutions: 82% close probability", "Finance Pro: quote approval pending", "Cloud Services: needs executive touch"].map((i) => <div key={i} className="mb-2 rounded border border-border bg-card/35 p-3 text-sm">{i}</div>)}</Panel></div>;
  }
  if (["User Management", "Departments", "Branches/Regions"].includes(section)) return <div className="grid grid-cols-12 gap-4"><Panel title="Employee Directory" className="col-span-12 xl:col-span-8"><table className="w-full text-sm"><tbody>{users.map((u) => <tr key={u[0]} className="border-t border-border/50"><td className="py-2">{u[0]}</td><td>{u[1]}</td><td>{u[2]}</td><td>{u[3]}</td><td>{u[4]}</td><td><Badge value={u[5]} /></td><td>{u[6]}</td></tr>)}</tbody></table></Panel><Panel title="Departments & Regions" className="col-span-12 xl:col-span-4">{["Central Sales", "East Region", "West Region", "Support Desk", "Marketing"].map((i) => <div key={i} className="mb-2 rounded border border-border bg-card/35 p-3 text-sm">{i}</div>)}</Panel></div>;
  if (["Clients & Organizations", "Contacts"].includes(section)) return <div className="grid grid-cols-12 gap-4"><Panel title="Company Cards" className="col-span-12"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{clients.map(([name, industry, contacts, balance, health]) => <div key={name} className="rounded border border-border bg-card/35 p-4"><div className="font-semibold">{name}</div><div className="text-xs text-muted-foreground">{industry} · {contacts}</div><div className="mt-3">Balance {balance}</div><div className="mt-2 h-2 rounded bg-white/10"><div className="h-2 rounded gradient-orange" style={{ width: `${health}%` }} /></div></div>)}</div></Panel><Panel title="Relationship Timeline" className="col-span-12">{["Call completed", "Quotation sent", "Invoice paid", "Ticket resolved"].map((i) => <div key={i} className="mb-2 border-l-2 border-orange-500 pl-3 text-sm">{i}</div>)}</Panel></div>;
  if (["Calendar", "Tasks", "Meetings", "Follow-ups"].includes(section)) return <div className="grid grid-cols-12 gap-4"><Panel title="Tasks & Follow-ups" className="col-span-12 xl:col-span-7">{tasks.map(([task, priority, due, owner]) => <div key={task} className="mb-2 grid grid-cols-4 rounded border border-border bg-card/35 p-3 text-sm"><span>{task}</span><Badge value={priority} /><span>{due}</span><span>{owner}</span></div>)}</Panel><Panel title="Calendar Sync & Meetings" className="col-span-12 xl:col-span-5">{["Google Calendar connected", "Zoom integration active", "3 recurring events today", "5 reminders scheduled"].map((i) => <div key={i} className="mb-2 rounded border border-border bg-card/35 p-3 text-sm">{i}</div>)}</Panel></div>;
  if (["Support Tickets"].includes(section)) return <div className="grid grid-cols-12 gap-4"><Panel title="Support & Issues" className="col-span-12">{tickets.map(([title, priority, sla, status]) => <div key={title} className="mb-2 grid grid-cols-4 rounded border border-border bg-card/35 p-3 text-sm"><span>{title}</span><Badge value={priority} /><span>{sla}</span><span>{status}</span></div>)}</Panel></div>;
  if (["Reports", "Pipeline Reports", "Sales Performance Reports", "Activity Reports"].includes(section)) return <div className="grid grid-cols-12 gap-4"><Panel title="Reports & Analytics" className="col-span-12 xl:col-span-6"><div className="h-72"><ResponsiveContainer><BarChart data={revenue}><CartesianGrid stroke="#ffffff12" /><XAxis dataKey="d" stroke="#888" fontSize={10} /><YAxis stroke="#888" fontSize={10} /><Tooltip contentStyle={{ background: "#111", border: "1px solid #ffffff22", borderRadius: 8 }} /><Bar dataKey="v" fill={ORANGE} /></BarChart></ResponsiveContainer></div></Panel><Panel title="Download Center" className="col-span-12 xl:col-span-6">{["Sales Reports", "Revenue Reports", "Pipeline Reports", "User Activity Reports", "Client Reports", "Support Reports", "AI Insights"].map((r) => <button key={r} className="mr-2 mb-2 rounded border border-border bg-card px-3 py-2 text-sm hover:bg-accent">{r}</button>)}</Panel></div>;
  return <div className="grid grid-cols-12 gap-4"><Panel title={`${section} Control Center`} className="col-span-12 xl:col-span-5">{["Configuration", "Permissions", "Templates", "Automation", "History"].map((i) => <div key={i} className="mb-2 flex justify-between rounded border border-border bg-card/35 p-3 text-sm"><span>{i}</span><span className="text-emerald-400">Enabled</span></div>)}</Panel><Panel title="Activity & Audit" className="col-span-12 xl:col-span-4">{["Login from Nairobi", "Role updated", "Template changed", "Integration synced"].map((i) => <div key={i} className="mb-2 border-l-2 border-orange-500 pl-3 text-sm">{i}</div>)}</Panel><Panel title="Quick Workflow" className="col-span-12 xl:col-span-3">{["Trigger", "Approval", "Reminder", "Escalation", "AI Action"].map((i, idx) => <div key={i} className="mb-2 flex items-center gap-2 rounded border border-border bg-card/35 p-3 text-sm"><span className="grid h-6 w-6 place-items-center rounded gradient-orange text-xs text-white">{idx + 1}</span>{i}</div>)}</Panel></div>;
}

export default function TenantAdminDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [actionForm, setActionForm] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className={`${collapsed ? "w-20" : "w-72"} hidden shrink-0 border-r border-sidebar-border bg-sidebar/95 transition-all lg:flex lg:flex-col`}>
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg gradient-orange text-white"><Building2 className="h-5 w-5" /></div>
            {!collapsed && <div><div className="font-bold leading-none">Tenant Admin</div><div className="mt-1 text-[10px] uppercase tracking-widest text-orange-400">Company Control</div></div>}
            <button onClick={() => setCollapsed(!collapsed)} className="ml-auto grid h-8 w-8 place-items-center rounded-md hover:bg-accent"><Menu className="h-4 w-4" /></button>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 py-3">
            {navSections.map((section) => <div key={section.title} className="mb-3 border-b border-orange-500/20 pb-2 last:border-b-0">{!collapsed && <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-400">{section.title}</div>}{section.items.map((item) => { const Icon = item.icon; const active = activeSection === item.label; return <button key={item.label} onClick={() => setActiveSection(item.label)} className={`mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition ${active ? "gradient-orange text-white" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}><Icon className="h-4 w-4 shrink-0" />{!collapsed && <span className="flex-1 truncate">{item.label}</span>}{!collapsed && item.badge && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">{item.badge}</span>}</button>; })}</div>)}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-3 border-b border-border bg-background/85 px-4 py-2 backdrop-blur xl:flex-nowrap">
            <div className="min-w-0"><div className="text-xl font-bold">{activeSection === "Dashboard" ? "Tenant Admin Dashboard" : activeSection}</div><div className="text-xs text-muted-foreground">Acme Holdings CRM workspace · Company administrator</div></div>
            <div className="relative min-w-64 flex-1 xl:max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input className="h-10 w-full rounded-md border border-border bg-card pl-10 pr-16 text-sm outline-none" placeholder="Search users, leads, deals, clients, invoices..." /><kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">Ctrl + K</kbd></div>
            <button className="relative grid h-9 w-9 place-items-center rounded-md border border-border bg-card"><Bell className="h-4 w-4" /><span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-[10px] text-white">8</span></button>
            <button className="relative grid h-9 w-9 place-items-center rounded-md border border-border bg-card"><Mail className="h-4 w-4" /><span className="absolute -right-1 -top-1 rounded-full bg-orange-500 px-1 text-[10px] text-white">14</span></button>
            <button onClick={() => setActionForm("AI Assistant")} className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card"><Bot className="h-4 w-4 text-orange-400" /></button>
            <ThemeToggle />
            <button onClick={() => setActionForm("Quick Action")} className="flex h-9 items-center gap-2 rounded-md gradient-orange px-3 text-sm text-white"><Plus className="h-4 w-4" /> Quick Action <ChevronDown className="h-3 w-3" /></button>
            <button className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm"><span className="grid h-6 w-6 place-items-center rounded-full gradient-orange text-xs text-white">AH</span> Admin</button>
          </header>
          <main className="p-4"><SectionView section={activeSection} openAction={setActionForm} /></main>
        </div>
      </div>
      <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2">
        {["Create Lead", "Create Deal", "Create Invoice", "Schedule Meeting", "Create Task", "Support Ticket", "Report"].map((label) => <button key={label} onClick={() => setActionForm(label)} className="h-10 rounded-full border border-orange-500/40 bg-orange-500/20 px-4 text-xs text-orange-100 shadow-lg shadow-orange-950/40">{label}</button>)}
      </div>
      <Dialog open={!!actionForm} onOpenChange={(open) => !open && setActionForm(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="text-gradient-orange">{actionForm}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2"><input className="h-10 rounded-md border border-border bg-card px-3 text-sm outline-none" placeholder="Title / Name" /><select className="h-10 rounded-md border border-border bg-card px-3 text-sm outline-none"><option>Assign to John Doe</option><option>Assign to Sales Team</option></select><textarea className="min-h-28 rounded-md border border-border bg-card px-3 py-2 text-sm outline-none md:col-span-2" placeholder="Details, notes, reminders, client context..." /></div>
          <div className="mt-4 flex justify-end gap-2"><button onClick={() => setActionForm(null)} className="h-10 rounded-md border border-border px-4 text-sm hover:bg-accent">Cancel</button><button onClick={() => { toast.success(`${actionForm} submitted`); setActionForm(null); }} className="h-10 rounded-md gradient-orange px-4 text-sm font-medium text-white">Submit</button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
