import { useState, useMemo } from "react";
import { Bot, Briefcase, Calendar, CircleDollarSign, Clock, Gauge, Menu, MessageCircle, Search, Ticket, Users, TrendingUp, FileBarChart, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useDeals } from "@/lib/api/deals";
import { useUsers } from "@/lib/api/users";
import { useSchedules } from "@/lib/api/schedules";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { clearSession, getStoredUser } from "@/lib/auth";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

const ORANGE = "#ff8c00";
const ORANGE_DEEP = "#ff6a00";

const navSections = [
  { title: "Management", items: [
    { label: "Dashboard", icon: Gauge },
    { label: "Team", icon: Users },
    { label: "Pipeline", icon: Briefcase },
  ] },
  { title: "Activity", items: [
    { label: "Calendar", icon: Calendar },
    { label: "Tasks", icon: Clock },
    { label: "Support", icon: Ticket },
    { label: "Messages", icon: MessageCircle },
  ] },
  { title: "Reports", items: [
    { label: "Performance", icon: TrendingUp },
    { label: "Sales Reports", icon: FileBarChart },
  ] },
];

function Panel({ title, action, children, className = "" }: { title: string; action?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`glass-card rounded-lg p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gradient-orange">{title}</h3>
        {action && <span className="text-xs text-orange-400">{action}</span>}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ icon: Icon, label, hint }: { icon: LucideIcon; label: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
      <span className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card/40">
        <Icon className="h-5 w-5 opacity-60" />
      </span>
      <div className="text-sm font-medium">{label}</div>
      {hint && <div className="text-xs opacity-80">{hint}</div>}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, up }: { icon: LucideIcon; label: string; value: string; sub: string; up: boolean }) {
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

function ManagerDashboardView({ users, deals, tasks }: { users: any[]; deals: any[]; tasks: any[] }) {
  // KPIs
  const teamSize = users.length;
  const activeAgents = users.filter((u: any) => u.isActive).length;
  const totalDeals = deals.length;
  const wonDeals = deals.filter((d: any) => (d.stage || d.status || '').toLowerCase() === 'won');
  const pipelineValue = deals.reduce((s: number, d: any) => s + Number(d.value || d.amount || 0), 0);
  const wonValue = wonDeals.reduce((s: number, d: any) => s + Number(d.value || d.amount || 0), 0);
  const conversion = totalDeals > 0 ? Math.round((wonDeals.length / totalDeals) * 100) : 0;

  // Per-agent performance
  const agentPerf = useMemo(() => {
    const map = new Map<string, { name: string; deals: number; revenue: number; won: number }>();
    users.forEach((u: any) => {
      map.set(u._id, { name: u.name, deals: 0, revenue: 0, won: 0 });
    });
    deals.forEach((d: any) => {
      const key = d.assignedTo?._id || d.assignedTo || d.agent?._id || d.agent;
      if (!key) return;
      const id = String(key);
      const existing = map.get(id) || { name: 'Unassigned', deals: 0, revenue: 0, won: 0 };
      existing.deals += 1;
      existing.revenue += Number(d.value || d.amount || 0);
      if ((d.stage || d.status || '').toLowerCase() === 'won') existing.won += 1;
      map.set(id, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [users, deals]);

  // Deal stages funnel
  const stageData = useMemo(() => {
    const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
    return stages.map((s) => ({
      name: s.charAt(0).toUpperCase() + s.slice(1),
      value: deals.filter((d: any) => (d.stage || d.status || '').toLowerCase() === s).length,
    }));
  }, [deals]);

  // Revenue trend (last 7 days)
  const revenue = useMemo(() => {
    const days: { d: string; v: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const day = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const sum = deals
        .filter((dl: any) => {
          if (!dl.createdAt) return false;
          const t = new Date(dl.createdAt).getTime();
          return t >= dayStart.getTime() && t < dayEnd.getTime();
        })
        .reduce((s: number, dl: any) => s + Number(dl.value || dl.amount || 0), 0);
      days.push({ d: day, v: sum });
    }
    return days;
  }, [deals]);

  return (
    <div className="space-y-4">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Users} label="Team Size" value={String(teamSize)} sub={`${activeAgents} active`} up={teamSize > 0} />
        <Kpi icon={Briefcase} label="Total Deals" value={String(totalDeals)} sub={`${wonDeals.length} won`} up={totalDeals > 0} />
        <Kpi icon={CircleDollarSign} label="Pipeline Value" value={`UGX ${pipelineValue.toLocaleString()}`} sub={`UGX ${wonValue.toLocaleString()} won`} up={pipelineValue > 0} />
        <Kpi icon={TrendingUp} label="Conversion" value={`${conversion}%`} sub={`${wonDeals.length} / ${totalDeals}`} up={conversion > 0} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Revenue (7 days)" className="lg:col-span-2">
          <div className="h-64">
            {revenue.every((r) => r.v === 0) ? (
              <EmptyState icon={CircleDollarSign} label="No revenue this week" hint="Revenue will appear once your team closes deals." />
            ) : (
              <ResponsiveContainer>
                <AreaChart data={revenue}>
                  <defs>
                    <linearGradient id="mgrRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ORANGE} stopOpacity={0.6} />
                      <stop offset="100%" stopColor={ORANGE_DEEP} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#ffffff12" />
                  <XAxis dataKey="d" stroke="#888" fontSize={10} />
                  <YAxis stroke="#888" fontSize={10} tickFormatter={(v) => `UGX ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid #ffffff22', borderRadius: 8 }} />
                  <Area dataKey="v" stroke={ORANGE} fill="url(#mgrRev)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel title="Pipeline by Stage">
          <div className="h-64">
            {stageData.every((s) => s.value === 0) ? (
              <EmptyState icon={Briefcase} label="No pipeline" hint="Deals will populate the funnel here." />
            ) : (
              <ResponsiveContainer>
                <BarChart data={stageData} layout="vertical">
                  <CartesianGrid stroke="#ffffff12" />
                  <XAxis type="number" stroke="#888" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="#888" fontSize={10} width={80} />
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid #ffffff22', borderRadius: 8 }} />
                  <Bar dataKey="value" fill={ORANGE} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>
      </div>

      {/* Team performance */}
      <Panel title="Team Performance" action={`${teamSize} agents`}>
        {agentPerf.length === 0 ? (
          <EmptyState icon={Users} label="No team members yet" hint="Performance will appear once you have team members with deals." />
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="text-left">
                  {["Agent", "Deals", "Won", "Revenue", "Conv. %"].map((h) => <th key={h} className="pb-2 pr-3 font-normal">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {agentPerf.map((row, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="py-2 pr-3 font-medium">{row.name}</td>
                    <td className="pr-3 text-muted-foreground">{row.deals}</td>
                    <td className="pr-3 text-muted-foreground">{row.won}</td>
                    <td className="pr-3 text-muted-foreground">UGX {row.revenue.toLocaleString()}</td>
                    <td className="pr-3">
                      <span className={`text-[11px] ${row.deals > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                        {row.deals > 0 ? Math.round((row.won / row.deals) * 100) : 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Open Tasks">
          {tasks.length === 0 ? (
            <EmptyState icon={Clock} label="No tasks" hint="Tasks assigned to your team will appear here." />
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 8).map((t: any) => (
                <div key={t._id} className="grid grid-cols-[1fr_90px_90px] items-center gap-2 rounded border border-border bg-card/35 p-3 text-sm">
                  <span>{t.title || t.name || '—'}</span>
                  <span className="text-muted-foreground">{t.priority || '—'}</span>
                  <span className="text-muted-foreground">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="AI Insights">
          <EmptyState icon={Bot} label="No AI insights yet" hint="Insights about team performance will appear here." />
        </Panel>
      </div>
    </div>
  );
}

export default function SalesManagerDashboard() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const me = getStoredUser();
  const initials = (me?.name || 'SM').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  const { data: usersData } = useUsers();
  const { data: dealsData } = useDeals();
  const { data: tasksData } = useSchedules();

  const users = (usersData?.users ?? []).filter((u: any) => (u.role || '').toLowerCase() === 'agent' || (u.role || '').toLowerCase() === 'sales_agent');
  const deals = dealsData?.deals ?? [];
  const tasks = tasksData?.schedules ?? [];

  function handleLogout() {
    clearSession();
    toast.success('Logged out');
    navigate({ to: '/login' });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className={`${collapsed ? 'w-20' : 'w-64'} hidden shrink-0 border-r border-sidebar-border bg-sidebar/95 transition-all lg:flex lg:flex-col`}>
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg gradient-orange text-white">
              <BarChart className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div>
                <div className="font-bold leading-none">Sales Manager</div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-orange-400">Team Workspace</div>
              </div>
            )}
            <button onClick={() => setCollapsed(!collapsed)} className="ml-auto grid h-8 w-8 place-items-center rounded-md hover:bg-accent">
              <Menu className="h-4 w-4" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 py-3">
            {navSections.map((section) => (
              <div key={section.title} className="mb-3 border-b border-orange-500/20 pb-2 last:border-b-0">
                {!collapsed && <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-400">{section.title}</div>}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.label} className="mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition text-sidebar-foreground hover:bg-sidebar-accent">
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="p-3 border-t border-sidebar-border flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-700 grid place-items-center text-white text-xs font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-sidebar-foreground">{me?.name || 'Sales Manager'}</div>
              <div className="text-xs text-muted-foreground">Sales Manager</div>
            </div>
            <button onClick={handleLogout} className="grid h-8 w-8 place-items-center rounded-md border border-sidebar-border hover:bg-sidebar-accent" aria-label="Sign out">
              <LogOut className="h-4 w-4 text-sidebar-foreground" />
            </button>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 flex-wrap items-center gap-3 border-b border-border bg-background/85 px-4 py-2 backdrop-blur xl:flex-nowrap">
            <div className="min-w-0">
              <div className="text-xl font-bold">Sales Manager Dashboard</div>
              <div className="text-xs text-muted-foreground">Team workspace · Sales management</div>
            </div>
            <div className="relative min-w-64 flex-1 xl:max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input className="h-10 w-full rounded-md border border-border bg-card pl-10 pr-16 text-sm outline-none" placeholder="Search agents, deals, clients..." />
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <ManagerDashboardView users={users} deals={deals} tasks={tasks} />
          </main>
        </div>
      </div>
    </div>
  );
}
