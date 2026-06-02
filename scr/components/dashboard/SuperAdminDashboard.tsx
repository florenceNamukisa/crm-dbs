import { useState } from "react";
import {
  Activity,
  Archive,
  Bell,
  Bot,
  Brain,
  Building2,
  Calendar,
  ChevronDown,
  CircleDollarSign,
  Code2,
  CreditCard,
  Database,
  Download,
  FileBarChart,
  FileClock,
  FileText,
  Flag,
  Gauge,
  HardDrive,
  HelpCircle,
  Layers3,
  Lock,
  Mail,
  Menu,
  MoreVertical,
  Network,
  Package,
  RefreshCcw,
  Search,
  Send,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { apiFetch, getApiBase } from "@/lib/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const ORANGE = "#ff8c00";
const ORANGE_DEEP = "#ff6a00";
const ORANGE_LIGHT = "#ffb347";
const GREEN = "#22c55e";

type Status = "Active" | "Trial" | "Suspended" | "Inactive";
type NavItem = { label: string; icon: LucideIcon; badge?: string };

const navSections: Array<{ title: string; items: NavItem[] }> = [
  { title: "Main", items: [
    { label: "Dashboard", icon: Gauge },
    { label: "Tenants", icon: Building2 },
    { label: "Users", icon: Users },
    { label: "Subscriptions & Billing", icon: CreditCard },
    { label: "Plans & Pricing", icon: Layers3 },
    { label: "Transactions", icon: CircleDollarSign },
    { label: "Invoices", icon: FileText },
    { label: "Revenue Reports", icon: FileBarChart },
  ] },
  { title: "Management", items: [
    { label: "Tenant Management", icon: Network },
    { label: "User Management", icon: Users },
    { label: "Role & Permissions", icon: Lock },
    { label: "Departments", icon: Building2 },
    { label: "Modules", icon: Package },
    { label: "Feature Flags", icon: Flag },
  ] },
  { title: "System", items: [
    { label: "System Health", icon: ShieldCheck },
    { label: "Server Monitoring", icon: Server },
    { label: "Database", icon: Database },
    { label: "Backup & Restore", icon: Archive },
    { label: "Queue Monitor", icon: Activity },
    { label: "API Management", icon: Code2 },
    { label: "Security Center", icon: ShieldAlert },
    { label: "Audit Logs", icon: FileClock },
    { label: "Activity Logs", icon: Activity },
  ] },
  { title: "Analytics", items: [
    { label: "Reports & Analytics", icon: FileBarChart },
    { label: "AI Insights", icon: Brain },
    { label: "Live Activity", icon: Zap },
  ] },
  { title: "Settings", items: [
    { label: "Platform Settings", icon: Settings },
    { label: "Email Templates", icon: Mail },
    { label: "Integrations", icon: Network },
    { label: "Custom Domain", icon: Code2 },
    { label: "White Label", icon: Flag },
    { label: "Maintenance Mode", icon: RefreshCcw },
  ] },
];

const kpis = [
  { icon: Building2, label: "Total Tenants", value: "245", sub: "18 this month", up: true },
  { icon: FileText, label: "Active Tenants", value: "218", sub: "89% of total", up: true },
  { icon: Users, label: "Total Users", value: "12,540", sub: "856 this month", up: true },
  { icon: CreditCard, label: "Active Subscriptions", value: "218", sub: "6.7% this month", up: true },
  { icon: FileBarChart, label: "Cancelled Subscriptions", value: "27", sub: "3 this month", up: false },
  { icon: Activity, label: "MRR", value: "$893,420", sub: "12.5% this month", up: true },
  { icon: CircleDollarSign, label: "ARR", value: "$10.72M", sub: "14.3% this month", up: true },
  { icon: Package, label: "Total Revenue", value: "$1.24M", sub: "15.8% this month", up: true },
];

const miniStats = [
  { icon: Users, label: "Total Users", value: "12,540", sub: "7.3%", up: true },
  { icon: FileBarChart, label: "Active Users", value: "9,856", sub: "6.8%", up: true },
  { icon: Calendar, label: "New Users", value: "856", sub: "12.2%", up: true },
  { icon: FileText, label: "Total Invoices", value: "18,745", sub: "13.0%", up: true },
  { icon: CreditCard, label: "Paid Invoices", value: "16,820", sub: "15.4%", up: false },
  { icon: Download, label: "Failed Payments", value: "245", sub: "8.3%", up: false },
  { icon: HardDrive, label: "Storage Used", value: "6.48 TB", sub: "9.7%", up: true },
];

const revenue = [
  { d: "May 01", v: 120 }, { d: "May 04", v: 310 }, { d: "May 07", v: 620 },
  { d: "May 10", v: 760 }, { d: "May 13", v: 920 }, { d: "May 16", v: 810 },
  { d: "May 19", v: 1180 }, { d: "May 22", v: 860 }, { d: "May 25", v: 1190 },
  { d: "May 28", v: 1320 }, { d: "May 31", v: 1580 },
];

const tenantGrowth = [
  { d: "May 01", v: 82 }, { d: "May 05", v: 118 }, { d: "May 09", v: 142 },
  { d: "May 13", v: 166 }, { d: "May 17", v: 178 }, { d: "May 21", v: 206 },
  { d: "May 25", v: 221 }, { d: "May 31", v: 245 },
];

const planMix = [
  { name: "Enterprise", value: 68, color: ORANGE_DEEP },
  { name: "Professional", value: 71, color: ORANGE },
  { name: "Standard", value: 58, color: "#3b82f6" },
  { name: "Basic", value: 30, color: GREEN },
  { name: "Trial", value: 18, color: "#64748b" },
];

const topRevenue = [
  ["Tech Solutions Inc.", "$124,430", "+28.5%"],
  ["Global Marketing Co.", "$98,210", "+21.3%"],
  ["Data Pro Systems", "$87,650", "+18.9%"],
  ["Cloud Services LLC", "$76,540", "+15.2%"],
  ["Bright Future Ltd.", "$65,320", "+12.7%"],
];

const tenants = [
  { name: "Tech Solutions Inc.", plan: "Enterprise", users: 245, status: "Active" as Status, mrr: "$12,450", joined: "May 31, 2025" },
  { name: "Global Marketing Co.", plan: "Professional", users: 156, status: "Active" as Status, mrr: "$8,920", joined: "May 30, 2025" },
  { name: "Data Pro Systems", plan: "Enterprise", users: 320, status: "Active" as Status, mrr: "$15,680", joined: "May 29, 2025" },
  { name: "Bright Future Ltd.", plan: "Standard", users: 85, status: "Active" as Status, mrr: "$4,750", joined: "May 28, 2025" },
  { name: "Cloud Services LLC", plan: "Professional", users: 178, status: "Active" as Status, mrr: "$7,890", joined: "May 28, 2025" },
  { name: "GreenField Agro Ltd.", plan: "Basic", users: 64, status: "Trial" as Status, mrr: "$0", joined: "May 27, 2025" },
  { name: "NextGen Innovations", plan: "Standard", users: 132, status: "Suspended" as Status, mrr: "$0", joined: "May 25, 2025" },
];

const users = [
  { name: "John Doe", tenant: "Tech Solutions Inc.", role: "Admin", status: "Active", login: "2m ago" },
  { name: "Sarah Williams", tenant: "Global Marketing Co.", role: "Sales Manager", status: "Active", login: "5m ago" },
  { name: "Mike Johnson", tenant: "Data Pro Systems", role: "Sales Agent", status: "Active", login: "7m ago" },
  { name: "Emma Davis", tenant: "Bright Future Ltd.", role: "Marketing", status: "Active", login: "10m ago" },
  { name: "David Brown", tenant: "Cloud Services LLC", role: "Support", status: "Active", login: "12m ago" },
  { name: "James Taylor", tenant: "NextGen Innovations", role: "Admin", status: "Inactive", login: "1h ago" },
];

const activities = [
  ["New tenant registered - Tech Solutions Inc.", "2m ago", "bg-red-500"],
  ["Subscription upgraded - Global Marketing Co.", "5m ago", "bg-orange-500"],
  ["Payment received from Data Pro Systems $2,450", "7m ago", "bg-emerald-500"],
  ["New user created - Sarah Williams", "8m ago", "bg-blue-500"],
  ["Invoice INV-04587 generated", "10m ago", "bg-red-500"],
  ["Backup completed successfully", "15m ago", "bg-sky-500"],
  ["Suspicious login detected", "18m ago", "bg-red-500"],
];

const health = [
  ["Web Server", 99.9, ORANGE],
  ["Database", 99.8, ORANGE],
  ["API Server", 99.6, ORANGE],
  ["Storage", 98.7, ORANGE],
  ["Queue Worker", 99.9, ORANGE],
  ["Email Service", 99.5, ORANGE],
  ["Backup Service", 100, GREEN],
];

const industries = [
  ["Technology", 68], ["Agriculture", 54], ["Finance", 42], ["Healthcare", 28],
  ["Education", 24], ["Real Estate", 18], ["Manufacturing", 11],
];

const transactions = [
  ["Payment from Tech Solutions Inc.", "$12,450", "2m ago"],
  ["Invoice #INV-04587", "$2,450", "5m ago"],
  ["Subscription - Global Marketing Co.", "$8,920", "7m ago"],
  ["Payment from Data Pro Systems", "$15,680", "10m ago"],
  ["Refund to Bright Future Ltd.", "-$1,250", "12m ago"],
];

const reports = ["Revenue Reports", "Tenant Comparison", "Sales Performance", "Usage Reports", "Security Reports", "Activity Reports", "Audit Reports", "AI Analytics"];
const funnelData = [
  { name: "Registered", value: 245, fill: ORANGE_LIGHT },
  { name: "Configured", value: 228, fill: ORANGE },
  { name: "Activated", value: 218, fill: ORANGE_DEEP },
  { name: "Expanded", value: 84, fill: GREEN },
];

function badge(status: string) {
  const map: Record<string, string> = {
    Active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    Trial: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Suspended: "bg-red-500/15 text-red-400 border-red-500/30",
    Inactive: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    Live: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    Review: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
  return `rounded border px-2 py-0.5 text-[10px] ${map[status] ?? "border-border text-muted-foreground"}`;
}

function Panel({ title, action, children, className = "" }: { title: string; action?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`glass-card rounded-lg p-3 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action && <button className="text-xs text-orange-400 hover:underline">{action}</button>}
      </div>
      {children}
    </section>
  );
}

function KpiCard({ icon: Icon, label, value, sub, up }: { icon: LucideIcon; label: string; value: string; sub: string; up: boolean }) {
  return (
    <div className="glass-card rounded-lg p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full gradient-orange shadow-lg shadow-orange-950/40">
          <Icon className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
          <div className={`text-[11px] ${up ? "text-emerald-400" : "text-red-400"}`}>{up ? "↑" : "↓"} {sub}</div>
        </div>
      </div>
    </div>
  );
}

function RecentTenantsTable({ className = "col-span-12 xl:col-span-6" }: { className?: string }) {
  return (
    <Panel title="Recent Tenants" action="Filter" className={className}>
      <div className="overflow-auto">
        <table className="w-full min-w-[620px] text-xs">
          <thead className="text-muted-foreground">
            <tr className="text-left">{["Tenant Name", "Plan", "Users", "Status", "MRR", "Joined Date", "Actions"].map((h) => <th key={h} className="pb-2 pr-3 font-normal">{h}</th>)}</tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.name} className="border-t border-border/50">
                <td className="py-2 pr-3">{tenant.name}</td>
                <td className="pr-3 text-muted-foreground">{tenant.plan}</td>
                <td className="pr-3">{tenant.users}</td>
                <td className="pr-3"><span className={badge(tenant.status)}>{tenant.status}</span></td>
                <td className="pr-3">{tenant.mrr}</td>
                <td className="pr-3 text-muted-foreground">{tenant.joined}</td>
                <td><button className="grid h-6 w-6 place-items-center rounded border border-border"><MoreVertical className="h-3 w-3" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function RecentUsersTable({ className = "col-span-12 xl:col-span-6" }: { className?: string }) {
  return (
    <Panel title="Recent Users" action="Filter" className={className}>
      <div className="overflow-auto">
        <table className="w-full min-w-[620px] text-xs">
          <thead className="text-muted-foreground">
            <tr className="text-left">{["User", "Tenant", "Role", "Status", "Last Login"].map((h) => <th key={h} className="pb-2 pr-3 font-normal">{h}</th>)}</tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.name} className="border-t border-border/50">
                <td className="py-2 pr-3"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full gradient-orange text-[10px] text-white">{user.name.split(" ").map((n) => n[0]).join("")}</span>{user.name}</div></td>
                <td className="pr-3 text-muted-foreground">{user.tenant}</td>
                <td className="pr-3">{user.role}</td>
                <td className="pr-3"><span className={badge(user.status)}>{user.status}</span></td>
                <td className="pr-3 text-muted-foreground">{user.login}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function DashboardOverview({ openTenant, openAction }: { openTenant: () => void; openAction: (title: string) => void }) {
  return (
    <div className="grid grid-cols-12 gap-4">
      <section className="col-span-12 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </section>

      <Panel title="Revenue Overview" action="This Month" className="col-span-12 2xl:col-span-5">
        <div className="mb-2 text-2xl font-bold">$1,238,450 <span className="text-xs text-emerald-400">↑ 15.8%</span></div>
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={revenue}>
              <defs>
                <linearGradient id="revenueMain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ORANGE} stopOpacity={0.75} />
                  <stop offset="100%" stopColor={ORANGE_DEEP} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#ffffff12" />
              <XAxis dataKey="d" stroke="#888" fontSize={10} />
              <YAxis stroke="#888" fontSize={10} tickFormatter={(v) => `$${v}K`} />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid #ffffff22", borderRadius: 8 }} />
              <Area dataKey="v" stroke={ORANGE} fill="url(#revenueMain)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Tenants by Plan" action="View all" className="col-span-12 lg:col-span-5 2xl:col-span-3">
        <div className="flex items-center gap-3">
          <div className="relative h-44 w-44 shrink-0">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={planMix} dataKey="value" innerRadius={52} outerRadius={78} paddingAngle={2}>
                  {planMix.map((p) => <Cell key={p.name} fill={p.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center text-center"><div><div className="text-2xl font-bold">245</div><div className="text-xs text-muted-foreground">Total</div></div></div>
          </div>
          <div className="space-y-2 text-xs">
            {planMix.map((p) => <div key={p.name} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}<span className="text-muted-foreground">{p.value}</span></div>)}
          </div>
        </div>
      </Panel>

      <Panel title="Top Tenants by Revenue" action="View all" className="col-span-12 lg:col-span-7 2xl:col-span-2">
        <div className="space-y-2 text-xs">
          {topRevenue.map(([name, amount, growthText], index) => (
            <div key={name} className="flex items-center gap-3">
              <span className="grid h-5 w-5 place-items-center rounded border border-border text-[10px]">{index + 1}</span>
              <span className="flex-1">{name}</span>
              <span>{amount}</span>
              <span className="text-emerald-400">{growthText}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Live Activity Feed" action="View all" className="col-span-12 2xl:col-span-2">
        <div className="space-y-2 text-xs">
          {activities.map(([text, time, color]) => (
            <div key={text} className="flex items-center gap-2">
              <span className={`h-5 w-5 rounded ${color}`} />
              <span className="flex-1">{text}</span>
              <span className="text-muted-foreground">{time}</span>
            </div>
          ))}
        </div>
      </Panel>

      <section className="col-span-12 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {miniStats.map((stat) => <KpiCard key={stat.label} {...stat} />)}
      </section>

      <RecentTenantsTable className="col-span-12 2xl:col-span-6" />
      <RecentUsersTable className="col-span-12 2xl:col-span-6" />

      <Panel title="System Health" action="View all" className="col-span-12 xl:col-span-4">
        <div className="space-y-2">
          {health.map(([label, value, color]) => (
            <div key={label} className="grid grid-cols-[90px_1fr_42px] items-center gap-2 text-xs">
              <span>{label}</span>
              <div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full" style={{ width: `${value}%`, background: color as string }} /></div>
              <span>{value}%</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Top Industries" className="col-span-12 md:col-span-6 xl:col-span-4">
        {industries.map(([name, value]) => (
          <div key={name} className="mb-2 grid grid-cols-[82px_1fr_28px] items-center gap-2 text-xs">
            <span>{name}</span>
            <div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full gradient-orange" style={{ width: `${Number(value) * 1.2}%` }} /></div>
            <span>{value}</span>
          </div>
        ))}
      </Panel>

      <Panel title="AI Insights" action="View all" className="col-span-12 md:col-span-6 xl:col-span-4">
        {["5 tenants at risk of churn", "Revenue predicted to grow 16.4%", "37 inactive users detected", "3 payment failures this week", "High growth in Technology sector"].map((item) => (
          <div key={item} className="mb-2 flex items-center gap-2 text-xs"><span className="grid h-6 w-6 place-items-center rounded-full gradient-orange"><Bot className="h-3 w-3 text-white" /></span>{item}</div>
        ))}
      </Panel>

      <Panel title="Revenue by Plan" action="This Month" className="col-span-12 md:col-span-4">
        {["Enterprise", "Professional", "Standard", "Basic", "Trial"].map((plan, i) => (
          <div key={plan} className="mb-3 grid grid-cols-[90px_1fr_96px] items-center gap-2 text-xs">
            <span>{plan}</span><div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full gradient-orange" style={{ width: `${88 - i * 13}%` }} /></div><span>{["$512,450", "$328,760", "$214,560", "$98,320", "$84,360"][i]}</span>
          </div>
        ))}
      </Panel>

      <Panel title="Tenant Growth" action="This Month" className="col-span-12 md:col-span-4">
        <div className="h-44">
          <ResponsiveContainer>
            <LineChart data={tenantGrowth}>
              <CartesianGrid stroke="#ffffff12" />
              <XAxis dataKey="d" stroke="#888" fontSize={10} />
              <YAxis stroke="#888" fontSize={10} />
              <Tooltip contentStyle={{ background: "#111", border: "1px solid #ffffff22", borderRadius: 8 }} />
              <Line dataKey="v" stroke={ORANGE} strokeWidth={2} dot={{ fill: ORANGE }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Platform Coverage" className="col-span-12 md:col-span-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {["North America 68", "Europe 54", "Asia 76", "Africa 21", "South America 26", "Oceania 10"].map((item) => (
            <div key={item} className="rounded border border-border bg-card/35 p-3">{item}</div>
          ))}
        </div>
      </Panel>

      <Panel title="Recent Transactions" action="View all" className="col-span-12 xl:col-span-6">
        {transactions.map(([text, amount, time]) => <div key={text} className="mb-2 flex justify-between text-xs"><span>{text}</span><span>{amount}</span><span className="text-muted-foreground">{time}</span></div>)}
      </Panel>

      <Panel title="Quick Actions" className="col-span-12 xl:col-span-6">
        <div className="grid grid-cols-2 gap-3">
          {([
            [Building2, "Add New Tenant", openTenant],
            [Users, "Add New User", () => openAction("Add New User")],
            [Layers3, "Create Plan", () => openAction("Create Plan")],
            [FileText, "Create Invoice", () => openAction("Create Invoice")],
            [FileBarChart, "View Reports", () => openAction("View Reports")],
            [Settings, "System Settings", () => openAction("System Settings")],
          ] satisfies Array<[LucideIcon, string, () => void]>).map(([Icon, label, action]) => (
            <button key={label} onClick={action} className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-xs hover:bg-orange-500/20">
              <Icon className="mx-auto mb-2 h-5 w-5 text-orange-400" />{label}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function TenantKanban() {
  const columns = [
    { label: "Trial", items: tenants.filter((t) => t.status === "Trial") },
    { label: "Active", items: tenants.filter((t) => t.status === "Active") },
    { label: "Suspended", items: tenants.filter((t) => t.status === "Suspended") },
  ];
  return (
    <Panel title="Tenant Lifecycle Kanban" action="Board settings" className="col-span-12">
      <div className="grid gap-3 lg:grid-cols-3">
        {columns.map((column) => (
          <div key={column.label} className="rounded-lg border border-border bg-card/30 p-3">
            <div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-semibold">{column.label}</h4><span className="rounded-full bg-white/10 px-2 text-xs">{column.items.length}</span></div>
            <div className="space-y-2">
              {column.items.map((tenant) => (
                <div key={tenant.name} className="rounded border border-border bg-background/30 p-3 text-sm">
                  <div className="font-medium">{tenant.name}</div>
                  <div className="text-xs text-muted-foreground">{tenant.plan} · {tenant.users} users · {tenant.mrr}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function TenantCards() {
  return (
    <Panel title="Tenant Summary Cards" action="Sort" className="col-span-12">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tenants.map((tenant) => (
          <div key={tenant.name} className="rounded-lg border border-border bg-card/35 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{tenant.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{tenant.plan} plan · {tenant.users} users</div>
              </div>
              <span className={badge(tenant.status)}>{tenant.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded border border-border bg-background/30 p-2"><div className="font-semibold">{tenant.mrr}</div><div className="text-muted-foreground">MRR</div></div>
              <div className="rounded border border-border bg-background/30 p-2"><div className="font-semibold">{tenant.users}</div><div className="text-muted-foreground">Users</div></div>
              <div className="rounded border border-border bg-background/30 p-2"><div className="font-semibold">{tenant.joined.slice(0, 6)}</div><div className="text-muted-foreground">Joined</div></div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function TenantSection() {
  const [view, setView] = useState<"table" | "cards" | "kanban">("table");

  return (
    <div className="grid grid-cols-12 gap-4">
      <section className="col-span-12 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-md border border-border bg-card p-1">
          {(["table", "cards", "kanban"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={`rounded px-3 py-1.5 text-xs capitalize ${view === mode ? "gradient-orange text-white" : "hover:bg-accent"}`}
            >
              {mode}
            </button>
          ))}
        </div>
        <div className="relative min-w-64 flex-1 xl:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none" placeholder="Search tenant records..." />
        </div>
      </section>
      {view === "table" && <RecentTenantsTable className="col-span-12" />}
      {view === "cards" && <TenantCards />}
      {view === "kanban" && <TenantKanban />}
      <Panel title="Tenant Activation Funnel" className="col-span-12 xl:col-span-4"><div className="h-64"><ResponsiveContainer><FunnelChart><Tooltip contentStyle={{ background: "#111", border: "1px solid #ffffff22", borderRadius: 8 }} /><Funnel dataKey="value" data={funnelData}><LabelList position="right" fill="#fff" stroke="none" dataKey="name" /></Funnel></FunnelChart></ResponsiveContainer></div></Panel>
      <Panel title="Tenant Risk Queue" className="col-span-12 xl:col-span-8">{tenants.map((t) => <div key={t.name} className="mb-2 flex items-center justify-between rounded border border-border bg-card/35 p-3 text-sm"><span>{t.name}</span><span>{t.plan}</span><span className={badge(t.status)}>{t.status}</span></div>)}</Panel>
    </div>
  );
}

function SectionView({ section, openTenant, openAction }: { section: string; openTenant: () => void; openAction: (title: string) => void }) {
  if (section === "Dashboard") return <DashboardOverview openTenant={openTenant} openAction={openAction} />;

  if (["Tenants", "Tenant Management"].includes(section)) {
    return <TenantSection />;
  }

  if (["Users", "User Management", "Role & Permissions", "Departments"].includes(section)) {
    return <div className="grid grid-cols-12 gap-3"><RecentUsersTable /><Panel title="Role Coverage" className="col-span-12 xl:col-span-4">{["Admin", "Sales Manager", "Sales Agent", "Marketing", "Support"].map((role, i) => <div key={role} className="mb-3"><div className="mb-1 flex justify-between text-xs"><span>{role}</span><span>{[340, 1280, 6820, 2140, 980][i]}</span></div><div className="h-2 rounded bg-white/10"><div className="h-2 rounded gradient-orange" style={{ width: `${90 - i * 11}%` }} /></div></div>)}</Panel><Panel title="Session Risk" className="col-span-12 xl:col-span-4">{["4 impossible travel events", "18 stale admin sessions", "3 MFA bypass attempts", "91 password rotations due"].map((i) => <div key={i} className="mb-2 rounded border border-border bg-card/35 p-3 text-sm">{i}</div>)}</Panel><Panel title="Permission Matrix" className="col-span-12 xl:col-span-4">{["CRM Core", "Billing", "Reports", "Security", "Integrations"].map((i) => <div key={i} className="mb-2 flex justify-between rounded border border-border bg-card/35 p-3 text-sm"><span>{i}</span><span className="text-emerald-400">Compliant</span></div>)}</Panel></div>;
  }

  if (["Subscriptions & Billing", "Plans & Pricing", "Transactions", "Invoices", "Revenue Reports", "Billing"].includes(section)) {
    return <div className="grid grid-cols-12 gap-3"><Panel title="Revenue Trend" className="col-span-12 xl:col-span-5"><div className="h-72"><ResponsiveContainer><AreaChart data={revenue}><CartesianGrid stroke="#ffffff12" /><XAxis dataKey="d" stroke="#888" fontSize={10} /><YAxis stroke="#888" fontSize={10} /><Tooltip contentStyle={{ background: "#111", border: "1px solid #ffffff22", borderRadius: 8 }} /><Area dataKey="v" stroke={ORANGE} fill={ORANGE_DEEP} fillOpacity={0.25} /></AreaChart></ResponsiveContainer></div></Panel><Panel title="Plan Mix" className="col-span-12 xl:col-span-3"><div className="h-72"><ResponsiveContainer><PieChart><Pie data={planMix} dataKey="value" innerRadius={62} outerRadius={96}>{planMix.map((p) => <Cell key={p.name} fill={p.color} />)}</Pie></PieChart></ResponsiveContainer></div></Panel><Panel title="Recent Transactions" className="col-span-12 xl:col-span-4">{transactions.map(([t, a, d]) => <div key={t} className="mb-2 flex justify-between rounded border border-border bg-card/35 p-3 text-sm"><span>{t}</span><span>{a}</span><span className="text-muted-foreground">{d}</span></div>)}</Panel><Panel title="Failed Payment Recovery" className="col-span-12">{["Retry queued", "Card expired", "Mobile money timeout", "Invoice disputed"].map((i, idx) => <div key={i} className="mb-2 grid grid-cols-4 rounded border border-border bg-card/35 p-3 text-sm"><span>{i}</span><span>{[42, 18, 9, 4][idx]} cases</span><span>${[18420, 9020, 2450, 880][idx].toLocaleString()}</span><span className="text-orange-400">Workflow active</span></div>)}</Panel></div>;
  }

  if (["System Health", "Server Monitoring", "Database", "Backup & Restore", "Queue Monitor", "API Management"].includes(section)) {
    return <div className="grid grid-cols-12 gap-3"><Panel title={`${section} Live Metrics`} className="col-span-12 xl:col-span-5"><div className="space-y-3">{health.map(([label, value, color]) => <div key={label} className="grid grid-cols-[120px_1fr_48px] items-center gap-3 text-sm"><span>{label}</span><div className="h-2 rounded bg-white/10"><div className="h-2 rounded" style={{ width: `${value}%`, background: color as string }} /></div><span>{value}%</span></div>)}</div></Panel><Panel title="Infrastructure Load" className="col-span-12 xl:col-span-4"><div className="h-72"><ResponsiveContainer><LineChart data={tenantGrowth}><CartesianGrid stroke="#ffffff12" /><XAxis dataKey="d" stroke="#888" fontSize={10} /><YAxis stroke="#888" fontSize={10} /><Tooltip contentStyle={{ background: "#111", border: "1px solid #ffffff22", borderRadius: 8 }} /><Line dataKey="v" stroke={ORANGE} strokeWidth={2} /></LineChart></ResponsiveContainer></div></Panel><Panel title="Operations Queue" className="col-span-12 xl:col-span-3">{["18,430 jobs processed", "44 retry jobs", "2 dead letters", "9 workers online", "99.2% success"].map((i) => <div key={i} className="mb-2 rounded border border-border bg-card/35 p-3 text-sm">{i}</div>)}</Panel></div>;
  }

  if (["Security Center", "Audit Logs", "Activity Logs"].includes(section)) {
    return <div className="grid grid-cols-12 gap-3"><Panel title="Threat Center" className="col-span-12 xl:col-span-4">{["42 suspicious logins", "1,284 failed attempts", "86 blocked IPs", "92% MFA compliance", "19 account locks"].map((i) => <div key={i} className="mb-2 rounded border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{i}</div>)}</Panel><Panel title="Immutable Audit Timeline" className="col-span-12 xl:col-span-8">{activities.map(([a, t]) => <div key={a} className="mb-3 border-l-2 border-orange-500 pl-3"><div className="font-medium">{a}</div><div className="text-xs text-muted-foreground">superadmin · Chrome · 104.21.9.18 · {t}</div></div>)}</Panel><RecentUsersTable /></div>;
  }

  if (["Reports & Analytics", "Reports", "AI Insights", "Live Activity"].includes(section)) {
    return <div className="grid grid-cols-12 gap-3"><Panel title="Analytics Trend" className="col-span-12 xl:col-span-6"><div className="h-72"><ResponsiveContainer><BarChart data={tenantGrowth}><CartesianGrid stroke="#ffffff12" /><XAxis dataKey="d" stroke="#888" fontSize={10} /><YAxis stroke="#888" fontSize={10} /><Tooltip contentStyle={{ background: "#111", border: "1px solid #ffffff22", borderRadius: 8 }} /><Bar dataKey="v" fill={ORANGE} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel><Panel title="AI Insight Queue" className="col-span-12 xl:col-span-6">{["5 tenants at churn risk", "Technology sector expansion expected", "37 inactive users detected", "Payment failures concentrated in Growth plan"].map((i) => <div key={i} className="mb-2 flex items-center gap-2 rounded border border-border bg-card/35 p-3 text-sm"><Bot className="h-4 w-4 text-orange-400" />{i}</div>)}</Panel><Panel title="Download Center" className="col-span-12">{reports.map((r) => <button key={r} className="mr-2 mb-2 rounded border border-border bg-card px-3 py-2 text-sm hover:bg-accent">{r}</button>)}</Panel></div>;
  }

  return <div className="grid grid-cols-12 gap-3"><Panel title={`${section} Configuration`} className="col-span-12 xl:col-span-5">{["Global defaults", "Tenant overrides", "Approval policy", "Notification rules", "Audit coverage"].map((i) => <div key={i} className="mb-2 flex justify-between rounded border border-border bg-card/35 p-3 text-sm"><span>{i}</span><span className="text-emerald-400">Enabled</span></div>)}</Panel><Panel title="Change History" className="col-span-12 xl:col-span-4">{activities.slice(0, 5).map(([a, t]) => <div key={a} className="mb-2 text-sm"><div>{a}</div><div className="text-xs text-muted-foreground">{t}</div></div>)}</Panel><Panel title="Action Board" className="col-span-12 xl:col-span-3">{["Review", "Approve", "Deploy", "Notify", "Archive"].map((i) => <div key={i} className="mb-2 rounded border border-border bg-card/35 p-3 text-sm">{i}</div>)}</Panel></div>;
}

function AiAssistantRail() {
  return (
    <aside className="hidden w-72 shrink-0 border-l border-border bg-background/70 p-4 backdrop-blur min-[1800px]:block">
      <div className="glass-card sticky top-20 rounded-lg p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg gradient-orange"><Bot className="h-4 w-4 text-white" /></span>
          <div><div className="font-semibold text-gradient-orange">AI Assistant</div><div className="text-xs text-muted-foreground">Super admin helper</div></div>
        </div>
        {["Summarize platform risk", "Find churn-risk tenants", "Explain failed payments", "Generate audit report"].map((prompt) => (
          <button key={prompt} className="mb-2 w-full rounded-lg border border-border bg-card/35 p-2 text-left text-sm hover:bg-accent">{prompt}</button>
        ))}
        <div className="mt-3 rounded-lg border border-orange-500/20 bg-orange-500/10 p-3 text-xs text-orange-200">Ready to connect to your AI endpoint for guided platform operations.</div>
        <div className="relative mt-3">
          <input className="h-10 w-full rounded-lg border border-border bg-card pl-3 pr-10 text-sm outline-none" placeholder="Ask anything..." />
          <button className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-md gradient-orange"><Send className="h-4 w-4 text-white" /></button>
        </div>
      </div>
    </aside>
  );
}

export default function SuperAdminDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [openTenant, setOpenTenant] = useState(false);
  const [actionForm, setActionForm] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [tenantName, setTenantName] = useState("");
  const [tenantPlan, setTenantPlan] = useState("Standard");
  const [tenantStatus, setTenantStatus] = useState("Active");
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [tenantLogoFile, setTenantLogoFile] = useState<File | null>(null);
  const [tenantLogoPreview, setTenantLogoPreview] = useState<string | null>(null);

  async function createTenant() {
    setCreatingTenant(true);
    try {
      const saved = await apiFetch<{ tenant?: { tenantId?: string } }>("/admin/tenants", {
        method: "POST",
        body: JSON.stringify({ name: tenantName, plan: tenantPlan, status: tenantStatus }),
      });
      toast.success("Tenant created", { description: `${tenantName} is now in the database.` });
      setTenantName("");
      setTenantPlan("Standard");
      setTenantStatus("Active");
      // If a logo was selected, upload it
      if (tenantLogoFile && saved?.tenant?.tenantId) {
        try {
          const form = new FormData();
          form.append("tenantId", saved.tenant.tenantId);
          form.append("logo", tenantLogoFile);
          const token = localStorage.getItem("crm.auth.token");
          await fetch(`${getApiBase()}/admin/tenant-logo`, {
            method: "POST",
            body: form,
            headers: token ? { authorization: `Bearer ${token}` } : {},
          });
          toast.success("Logo uploaded");
        } catch (err) {
          console.error(err);
          toast.error("Logo upload failed");
        }
      }

      setTenantLogoFile(null);
      setTenantLogoPreview(null);
      setOpenTenant(false);
      window.location.reload();
    } catch (error) {
      toast.error("Tenant was not created", { description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setCreatingTenant(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className={`${collapsed ? "w-20" : "w-64"} hidden shrink-0 border-r border-sidebar-border bg-sidebar/95 transition-all lg:flex lg:flex-col`}>
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-orange-500/40 gradient-orange text-white"><ShieldCheck className="h-5 w-5" /></div>
            {!collapsed && <div><div className="font-bold text-lg leading-none">CRM</div><div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-orange-400">Super Admin</div></div>}
            <button onClick={() => setCollapsed(!collapsed)} className="ml-auto grid h-8 w-8 place-items-center rounded-md hover:bg-accent"><Menu className="h-4 w-4" /></button>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 py-3">
            {navSections.map((section) => (
              <div key={section.title} className="mb-3 border-b border-orange-500/20 pb-2 last:border-b-0">
                {!collapsed && <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-400">{section.title}</div>}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeSection === item.label;
                  return (
                    <button key={item.label} onClick={() => setActiveSection(item.label)} className={`mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition ${active ? "gradient-orange text-white" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}>
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {!collapsed && item.badge && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">{item.badge}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
          {!collapsed && <div className="m-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-xs"><div className="text-emerald-400">● All Systems Operational</div><div className="mt-2 flex justify-between"><span>Uptime</span><span>99.98%</span></div><div className="flex justify-between"><span>Version</span><span>v2.4.1</span></div></div>}
        </aside>

        <div className="flex min-w-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-3 border-b border-border bg-background/85 px-4 py-2 backdrop-blur xl:flex-nowrap">
              <div className="min-w-0">
                <div className="text-xl font-bold">{activeSection === "Dashboard" ? "Super Admin Dashboard" : activeSection}</div>
                <div className="text-xs text-muted-foreground">Welcome back, Super Admin. Platform operations are live.</div>
              </div>
              <div className="relative min-w-64 flex-1 xl:max-w-xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input className="h-10 w-full rounded-md border border-border bg-card pl-10 pr-16 text-sm outline-none focus:ring-2 focus:ring-primary/40" placeholder="Search tenants, users, invoices, activities..." />
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">Ctrl + K</kbd>
              </div>
              <button className="relative grid h-9 w-9 place-items-center rounded-md border border-border bg-card"><Bell className="h-4 w-4" /><span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-[10px] text-white">25</span></button>
              <button className="relative grid h-9 w-9 place-items-center rounded-md border border-border bg-card"><Mail className="h-4 w-4" /><span className="absolute -right-1 -top-1 rounded-full bg-orange-500 px-1 text-[10px] text-white">12</span></button>
              <button className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card"><HelpCircle className="h-4 w-4" /></button>
              <button className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card"><Settings className="h-4 w-4" /></button>
              <ThemeToggle />
              <button className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm"><Calendar className="h-4 w-4" /> May 01 - May 31, 2025</button>
              <button onClick={() => setActionForm("Export Report")} className="flex h-9 items-center gap-2 rounded-md gradient-orange px-3 text-sm text-white"><Download className="h-4 w-4" /> Export Report</button>
              <button className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm"><span className="grid h-6 w-6 place-items-center rounded-full gradient-orange text-xs text-white">SA</span><span className="hidden xl:inline">Super Admin</span><ChevronDown className="h-3 w-3" /></button>
            </header>

            <main className="p-3">
              <SectionView section={activeSection} openTenant={() => setOpenTenant(true)} openAction={setActionForm} />
            </main>
          </div>
          <AiAssistantRail />
        </div>
      </div>

      <Dialog open={openTenant} onOpenChange={setOpenTenant}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader><DialogTitle className="text-gradient-orange">Create New Tenant</DialogTitle></DialogHeader>
              <div className="grid gap-3 md:grid-cols-3">
                {[
              "Tenant Name",
              "Sector",
              "Address",
              "Country",
              "Phone",
              "Email",
              "Company Logo Upload",
              "Custom Domain/Subdomain",
              "Currency",
              "Timezone",
              "Language",
              "Subscription Plan",
              "Billing Cycle",
              "Tenant Status",
              "Tenant Admin Name",
              "Tenant Admin Phone",
              "Tenant Admin Email",
              "Default Modules",
              "Storage Allocation",
              "Role Configuration",
                ].map((field) => (
              <label key={field} className={field === "Address" || field === "Default Modules" || field === "Role Configuration" ? "md:col-span-3" : ""}>
                <span className="mb-1 block text-xs text-muted-foreground">{field}</span>
                {field === "Tenant Name" ? (
                  <input value={tenantName} onChange={(event) => setTenantName(event.target.value)} className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none" placeholder={field} />
                ) : field === "Subscription Plan" ? (
                  <select value={tenantPlan} onChange={(event) => setTenantPlan(event.target.value)} className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none"><option>Enterprise</option><option>Professional</option><option>Standard</option><option>Basic</option><option>Trial</option></select>
                ) : field === "Tenant Status" ? (
                  <select value={tenantStatus} onChange={(event) => setTenantStatus(event.target.value)} className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none"><option>Active</option><option>Trial</option><option>Suspended</option><option>Inactive</option></select>
                ) : ["Sector", "Country", "Currency", "Timezone", "Language", "Billing Cycle"].includes(field) ? (
                  <select className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none"><option>{field === "Sector" ? "IT" : field}</option><option>Finance</option><option>Agriculture</option><option>Health</option><option>Education</option><option>Retail</option><option>Manufacturing</option></select>
                ) : (
                  field === "Company Logo Upload" ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setTenantLogoFile(f);
                          setTenantLogoPreview(f ? URL.createObjectURL(f) : null);
                        }}
                        className="text-sm"
                      />
                      {tenantLogoPreview && <img src={tenantLogoPreview} alt="Preview" className="h-10 w-10 rounded" />}
                    </div>
                  ) : (
                    <input className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none" placeholder={field} type={field.includes("Email") ? "email" : field.includes("Phone") ? "tel" : "text"} />
                  )
                )}
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setOpenTenant(false)} className="h-10 rounded-md border border-border px-4 text-sm hover:bg-accent">Cancel</button>
            <button onClick={createTenant} disabled={creatingTenant || tenantName.trim().length < 2} className="h-10 rounded-md gradient-orange px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">{creatingTenant ? "Creating..." : "Create Tenant"}</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionForm} onOpenChange={(open) => !open && setActionForm(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="text-gradient-orange">{actionForm}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs text-muted-foreground">Name / Title</span>
              <input className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none" placeholder={actionForm ?? "Action"} />
            </label>
            <label>
              <span className="mb-1 block text-xs text-muted-foreground">Owner</span>
              <select className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none">
                <option>Super Admin</option>
                <option>Billing Team</option>
                <option>Security Team</option>
              </select>
            </label>
            <label className="md:col-span-2">
              <span className="mb-1 block text-xs text-muted-foreground">Details</span>
              <textarea className="min-h-28 w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none" placeholder="Add notes, configuration, target tenants, or report filters..." />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setActionForm(null)} className="h-10 rounded-md border border-border px-4 text-sm hover:bg-accent">Cancel</button>
            <button onClick={() => { toast.success(`${actionForm} submitted`); setActionForm(null); }} className="h-10 rounded-md gradient-orange px-4 text-sm font-medium text-white">Submit</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
