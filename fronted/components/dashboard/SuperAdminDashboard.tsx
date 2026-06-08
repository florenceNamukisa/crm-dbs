import { useState } from "react";
import {
  Building2, CircleDollarSign, CreditCard, FileBarChart, FileClock,
  Gauge, Layers3, LogOut, Menu, Network, Plus, Download,
  Settings, Users, UserCheck, UserX, ShoppingCart, Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  useSuperAdminOverview, useSuperAdminAnalytics, useTenants,
  useCreateTenant, useTenantControl, useSuperAdminActivity,
} from "@/lib/api/superadmin";
import { useUsers } from "@/lib/api/users";
import { clearSession, getStoredUser, apiFetch } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";

const ORANGE = "#ff8c00";

type NavItem = { label: string; icon: LucideIcon };
const navSections: Array<{ title: string; items: NavItem[] }> = [
  { title: "Main", items: [
    { label: "Dashboard", icon: Gauge },
    { label: "Tenants", icon: Building2 },
    { label: "Users", icon: Users },
    { label: "Plans & Pricing", icon: Layers3 },
    { label: "Transactions", icon: ShoppingCart },
  ]},
  { title: "Management", items: [
    { label: "Tenant Management", icon: Network },
    { label: "User Management", icon: Users },
  ]},
  { title: "System", items: [
    { label: "Audit Logs", icon: FileClock },
    { label: "Activity Logs", icon: Activity },
  ]},
  { title: "Analytics", items: [
    { label: "Reports & Analytics", icon: FileBarChart },
  ]},
  { title: "Settings", items: [
    { label: "Platform Settings", icon: Settings },
  ]},
];

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function badge(status: string) {
  const map: Record<string, string> = {
    Active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    Trial: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    trial: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Suspended: "bg-red-500/15 text-red-400 border-red-500/30",
    suspended: "bg-red-500/15 text-red-400 border-red-500/30",
    Inactive: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    inactive: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
    expired: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };
  return `rounded border px-2 py-0.5 text-[10px] ${map[status] ?? "border-border text-muted-foreground"}`;
}

function KpiCard({ icon: Icon, label, value, sub, up }: { icon: LucideIcon; label: string; value: string; sub: string; up?: boolean }) {
  return (
    <div className="glass-card rounded-lg p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full gradient-orange shadow-lg shadow-orange-950/40">
          <Icon className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
          {sub && <div className={`text-[11px] ${up === false ? "text-red-400" : "text-emerald-400"}`}>{up ? "↑" : up === false ? "↓" : ""} {sub}</div>}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, action, children, className = "" }: { title: string; action?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`glass-card rounded-lg p-3 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action && <span className="text-xs text-orange-400">{action}</span>}
      </div>
      {children}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD TENANT MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function AddTenantModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    name: "", sector: "IT", location: "", tel: "", email: "",
    adminName: "", adminTel: "", adminEmail: "", subscriptionPlan: "starter",
  });
  const createTenant = useCreateTenant();
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createTenant.mutateAsync({
        name: form.name,
        email: form.adminEmail,
        phone: form.tel,
        adminName: form.adminName,
        subscriptionPlan: form.subscriptionPlan,
      });
      toast.success("Tenant registered", { description: `${form.name} added.` });
      setForm({ name: "", sector: "IT", location: "", tel: "", email: "", adminName: "", adminTel: "", adminEmail: "", subscriptionPlan: "starter" });
      onClose();
    } catch (err: any) { toast.error("Failed", { description: err.message }); }
  }
  const u = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Register New Tenant</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-2 max-h-[70vh] overflow-y-auto pr-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tenant Information</h4>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Tenant Name *</label>
            <input type="text" value={form.name} required onChange={e => u("name", e.target.value)} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" /></div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Sector</label>
            <select value={form.sector} onChange={e => u("sector", e.target.value)} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40">
              <option value="IT">IT</option><option value="Agric">Agric</option><option value="Finance">Finance</option><option value="Healthcare">Healthcare</option><option value="Education">Education</option><option value="Other">Other</option></select></div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Location</label>
            <input type="text" value={form.location} onChange={e => u("location", e.target.value)} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Telephone</label>
              <input type="tel" value={form.tel} onChange={e => u("tel", e.target.value)} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Company Email</label>
              <input type="email" value={form.email} onChange={e => u("email", e.target.value)} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" /></div>
          </div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">Company Admin</h4>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Admin Full Name *</label>
            <input type="text" value={form.adminName} required onChange={e => u("adminName", e.target.value)} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Admin Telephone *</label>
              <input type="tel" value={form.adminTel} required onChange={e => u("adminTel", e.target.value)} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Admin Email *</label>
              <input type="email" value={form.adminEmail} required onChange={e => u("adminEmail", e.target.value)} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" /></div>
          </div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">Subscription</h4>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Plan</label>
            <select value={form.subscriptionPlan} onChange={e => u("subscriptionPlan", e.target.value)} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40">
              <option value="starter">Starter</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option></select></div>
          <button type="submit" disabled={createTenant.isPending} className="flex h-10 w-full items-center justify-center gap-2 rounded-md gradient-orange font-semibold text-white hover:opacity-90 disabled:opacity-60">
            <Plus className="h-4 w-4" />{createTenant.isPending ? "Registering..." : "Register Tenant"}</button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSIGN PLAN MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function AssignPlanModal({ open, onClose, tenant }: { open: boolean; onClose: () => void; tenant: any }) {
  const [plan, setPlan] = useState("professional");
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch(`/tenants/${tenant._id}/subscription`, {
        method: "PATCH",
        body: JSON.stringify({ planName: plan }),
      });
      toast.success("Plan updated", { description: `${tenant.name} now on ${plan}` });
      onClose();
    } catch (err: any) { toast.error("Failed", { description: err.message }); }
  }
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Assign Plan — {tenant?.name}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Plan</label>
            <select value={plan} onChange={e => setPlan(e.target.value)} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40">
              <option value="starter">Starter</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option></select></div>
          <button type="submit" className="flex h-10 w-full items-center justify-center gap-2 rounded-md gradient-orange font-semibold text-white hover:opacity-90">Assign Plan</button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TENANTS TABLE (reusable component)
// ═══════════════════════════════════════════════════════════════════════════════
function TenantsTable() {
  const { data, isLoading } = useTenants();
  const tenantControl = useTenantControl();
  const tenants: any[] = data?.tenants ?? [];
  const [assignTenant, setAssignTenant] = useState<any>(null);

  const exportToCSV = () => {
    const headers = ["Company", "Sector", "Admin", "Users", "Plan", "Status"];
    const rows = tenants.map((t: any) => [t.name, t.sector || "—", t.email || "—", t.usage?.totalUsers ?? 0, t.subscription?.planName || "starter", t.status || "active"]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `tenants-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    toast.success("Exported as CSV");
  };

  return (
    <Panel title="All Tenants" action={`${tenants.length} total`}>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={exportToCSV} className="h-8 px-3 rounded-lg border border-border text-xs flex items-center gap-1.5 hover:bg-accent">
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </div>
      <div className="overflow-auto">
        {isLoading ? <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div> : (
          <table className="w-full min-w-[700px] text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left">
                {["Company", "Sector", "Admin", "Users", "Plan", "Status", "Actions"].map(h => <th key={h} className="pb-2 pr-3 font-normal">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">No tenants</td></tr>}
              {tenants.map((t: any) => (
                <tr key={t._id} className="border-t border-border/50">
                  <td className="py-2 pr-3 font-medium">{t.name}</td>
                  <td className="pr-3 text-muted-foreground">{t.sector || "—"}</td>
                  <td className="pr-3 text-muted-foreground">{t.email || "—"}</td>
                  <td className="pr-3">{t.usage?.totalUsers ?? 0}</td>
                  <td className="pr-3">{t.subscription?.planName || "starter"}</td>
                  <td className="pr-3"><span className={badge(t.status)}>{(t.status || "active").charAt(0).toUpperCase() + (t.status || "active").slice(1)}</span></td>
                  <td><div className="flex gap-1">
                    {t.status === "active" ? (
                      <button onClick={() => tenantControl.mutate({ id: t._id, action: "suspend" })} className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/20">Suspend</button>
                    ) : (
                      <button onClick={() => tenantControl.mutate({ id: t._id, action: "reactivate" })} className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 hover:bg-emerald-500/20">Activate</button>
                    )}
                    <button onClick={() => setAssignTenant(t)} className="rounded border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-400 hover:bg-orange-500/20">Plan</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <AssignPlanModal open={!!assignTenant} onClose={() => setAssignTenant(null)} tenant={assignTenant} />
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function DashboardView() {
  const { data: overviewData } = useSuperAdminOverview();
  const { data: analyticsData } = useSuperAdminAnalytics("30d");
  const { data: tenantsData } = useTenants();
  const { data: usersData } = useUsers();
  const overview = overviewData?.overview;
  const tenantList: any[] = tenantsData?.tenants ?? [];
  const users: any[] = usersData?.users ?? [];

  // Revenue chart
  const revenueChart = (analyticsData?.growth?.revenue ?? []).map((r: any) => ({ d: r._id, v: r.revenue }));

  // Tenant growth chart
  const tenantGrowth = (() => {
    const raw: any[] = analyticsData?.growth?.tenants ?? [];
    let cum = 0;
    return raw.map((r: any) => { cum += r.count; return { d: r._id, v: cum }; });
  })();

  const totalTenants = overview?.tenants?.total ?? tenantList.length;
  const activeTenants = overview?.tenants?.active ?? tenantList.filter((t: any) => t.status === "active").length;
  const totalUsers = overview?.users?.total ?? users.length;
  const cancelledSubs = tenantList.filter((t: any) => {
    const s = t.subscription?.status || t.status;
    return s === "cancelled" || s === "expired" || s === "suspended" || s === "inactive";
  }).length;
  const subscriptionValue = tenantList.reduce((sum: number, t: any) => {
    const plan = t.subscription?.planName || "starter";
    const amounts: Record<string, number> = { starter: 0, professional: 9900, enterprise: 29900 };
    return sum + (amounts[plan] || 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard icon={Building2} label="Tenants" value={String(totalTenants)} sub={`${activeTenants} active`} up={true} />
        <KpiCard icon={Users} label="Users" value={String(totalUsers)} sub="platform wide" up={true} />
        <KpiCard icon={CreditCard} label="Cancelled Subscriptions" value={String(cancelledSubs)} sub="suspended/expired" up={false} />
        <KpiCard icon={CircleDollarSign} label="Value of Subscriptions" value={fmt(subscriptionValue)} sub="monthly recurring" up={true} />
      </div>

      {/* Revenue & Tenant Growth Charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Monthly Subscription Revenue">
          <div className="h-56">
            {revenueChart.length === 0 ? <div className="h-full grid place-items-center text-xs text-muted-foreground">No revenue data</div> : (
              <ResponsiveContainer><AreaChart data={revenueChart}>
                <defs><linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ORANGE} stopOpacity={0.6} /><stop offset="100%" stopColor={ORANGE} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#ffffff12" /><XAxis dataKey="d" stroke="#888" fontSize={10} /><YAxis stroke="#888" fontSize={10} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #ffffff22", borderRadius: 8 }} />
                <Area dataKey="v" stroke={ORANGE} fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart></ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel title="Tenant Growth Trend">
          <div className="h-56">
            {tenantGrowth.length === 0 ? <div className="h-full grid place-items-center text-xs text-muted-foreground">No tenant growth data</div> : (
              <ResponsiveContainer><LineChart data={tenantGrowth}>
                <CartesianGrid stroke="#ffffff12" /><XAxis dataKey="d" stroke="#888" fontSize={10} /><YAxis stroke="#888" fontSize={10} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #ffffff22", borderRadius: 8 }} />
                <Line dataKey="v" stroke={ORANGE} strokeWidth={2} dot={{ fill: ORANGE }} />
              </LineChart></ResponsiveContainer>
            )}
          </div>
        </Panel>
      </div>

      {/* Tenants Table */}
      <TenantsTable />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TENANTS VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function TenantsView() {
  const { data, isLoading } = useTenants();
  const tenantControl = useTenantControl();
  const tenants: any[] = data?.tenants ?? [];
  const [assignTenant, setAssignTenant] = useState<any>(null);

  const total = tenants.length;
  const active = tenants.filter(t => t.status === "active").length;
  const suspended = tenants.filter(t => t.status === "suspended").length;
  const trial = tenants.filter(t => t.status === "trial" || !t.status || t.status === "inactive").length;

  const exportToCSV = () => {
    const headers = ["Company", "Sector", "Admin", "Users", "Plan", "Status"];
    const rows = tenants.map((t: any) => [t.name, t.sector || "—", t.email || "—", t.usage?.totalUsers ?? 0, t.subscription?.planName || "starter", t.status || "active"]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `tenants-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    toast.success("Exported as CSV");
  };

  return (
    <div className="space-y-4">
      {/* Tenant cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard icon={Building2} label="Total Tenants" value={String(total)} sub={`${total} total`} up={true} />
        <KpiCard icon={UserCheck} label="Active Tenants" value={String(active)} sub={`${active} active`} up={true} />
        <KpiCard icon={UserX} label="Suspended Tenants" value={String(suspended)} sub={`${suspended} suspended`} up={false} />
        <KpiCard icon={CreditCard} label="Trial Tenants" value={String(trial)} sub={`${trial} on trial`} up={true} />
      </div>

      {/* Tenants table */}
      <Panel title="All Tenants" action={`${tenants.length} total`}>
        <div className="flex items-center gap-2 mb-3">
          <button onClick={exportToCSV} className="h-8 px-3 rounded-lg border border-border text-xs flex items-center gap-1.5 hover:bg-accent">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
        <div className="overflow-auto">
          {isLoading ? <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div> : (
            <table className="w-full min-w-[700px] text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left">
                  {["Company", "Sector", "Admin", "Users", "Plan", "Status", "Actions"].map(h => <th key={h} className="pb-2 pr-3 font-normal">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {tenants.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">No tenants</td></tr>}
                {tenants.map((t: any) => (
                  <tr key={t._id} className="border-t border-border/50">
                    <td className="py-2 pr-3 font-medium">{t.name}</td>
                    <td className="pr-3 text-muted-foreground">{t.sector || "—"}</td>
                    <td className="pr-3 text-muted-foreground">{t.email || "—"}</td>
                    <td className="pr-3">{t.usage?.totalUsers ?? 0}</td>
                    <td className="pr-3">{t.subscription?.planName || "starter"}</td>
                    <td className="pr-3"><span className={badge(t.status)}>{(t.status || "active").charAt(0).toUpperCase() + (t.status || "active").slice(1)}</span></td>
                    <td><div className="flex gap-1">
                      {t.status === "active" ? (
                        <button onClick={() => tenantControl.mutate({ id: t._id, action: "suspend" })} className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/20">Suspend</button>
                      ) : (
                        <button onClick={() => tenantControl.mutate({ id: t._id, action: "reactivate" })} className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 hover:bg-emerald-500/20">Activate</button>
                      )}
                      <button onClick={() => setAssignTenant(t)} className="rounded border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-400 hover:bg-orange-500/20">Plan</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
      <AssignPlanModal open={!!assignTenant} onClose={() => setAssignTenant(null)} tenant={assignTenant} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// USERS VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function UsersView() {
  const { data: usersData, isLoading } = useUsers();
  const users: any[] = usersData?.users ?? [];
  const { data: tenantsData } = useTenants();
  const tenantList: any[] = tenantsData?.tenants ?? [];
  const { data: analyticsData } = useSuperAdminAnalytics("30d");

  const total = users.length;
  const active = users.filter((u: any) => u.isActive).length;
  const inactive = total - active;

  // User growth chart
  const userGrowth = (analyticsData?.growth?.users ?? []).map((r: any) => ({ d: r._id, v: r.count }));

  // Users by tenant
  const usersByTenant = tenantList.map(t => ({
    name: t.name,
    users: t.usage?.totalUsers ?? 0,
  })).sort((a, b) => b.users - a.users).slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard icon={Users} label="Total Users" value={String(total)} sub="platform wide" up={true} />
        <KpiCard icon={UserCheck} label="Active Users" value={String(active)} sub={`${active} online`} up={true} />
        <KpiCard icon={UserX} label="Inactive Users" value={String(inactive)} sub={`${inactive} offline`} up={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="User Growth Trend">
          <div className="h-56">
            {userGrowth.length === 0 ? <div className="h-full grid place-items-center text-xs text-muted-foreground">No user growth data</div> : (
              <ResponsiveContainer><LineChart data={userGrowth}>
                <CartesianGrid stroke="#ffffff12" /><XAxis dataKey="d" stroke="#888" fontSize={10} /><YAxis stroke="#888" fontSize={10} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #ffffff22", borderRadius: 8 }} />
                <Line dataKey="v" stroke={ORANGE} strokeWidth={2} dot={{ fill: ORANGE }} />
              </LineChart></ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel title="Users by Tenant">
          <div className="h-56">
            {usersByTenant.length === 0 ? <div className="h-full grid place-items-center text-xs text-muted-foreground">No tenant user data</div> : (
              <ResponsiveContainer><BarChart data={usersByTenant} layout="vertical">
                <CartesianGrid stroke="#ffffff12" />
                <XAxis type="number" stroke="#888" fontSize={10} />
                <YAxis type="category" dataKey="name" stroke="#888" fontSize={9} width={90} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #ffffff22", borderRadius: 8 }} />
                <Bar dataKey="users" fill={ORANGE} radius={[0, 4, 4, 0]} />
              </BarChart></ResponsiveContainer>
            )}
          </div>
        </Panel>
      </div>

      <Panel title="All Users">
        <div className="overflow-auto">
          {isLoading ? <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div> : (
            <table className="w-full min-w-[600px] text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left">
                  {["Name", "Email", "Role", "Tenant", "Status", "Last Active"].map(h => <th key={h} className="pb-2 pr-3 font-normal">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No users</td></tr>}
                {users.slice(0, 15).map((u: any) => (
                  <tr key={u._id} className="border-t border-border/50">
                    <td className="py-2 pr-3 font-medium">{u.name}</td>
                    <td className="pr-3 text-muted-foreground">{u.email}</td>
                    <td className="pr-3 capitalize">{u.role}</td>
                    <td className="pr-3 text-muted-foreground">{u.tenant?.name || "—"}</td>
                    <td className="pr-3"><span className={badge(u.isActive ? "Active" : "Inactive")}>{u.isActive ? "Active" : "Inactive"}</span></td>
                    <td className="pr-3 text-muted-foreground">{u.updatedAt ? new Date(u.updatedAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRICING VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function PricingView() {
  const { data: tenantsData } = useTenants();
  const tenants: any[] = tenantsData?.tenants ?? [];

  const plans = [
    { name: "Starter", price: "$0", cycle: "Free", features: "5 users, 100 clients, 50 deals", subscribers: tenants.filter(t => (t.subscription?.planName || "starter") === "starter").length },
    { name: "Professional", price: "$9,900", cycle: "Monthly", features: "50 users, 1K clients, 500 deals, reports, API", subscribers: tenants.filter(t => t.subscription?.planName === "professional").length },
    { name: "Enterprise", price: "$29,900", cycle: "Monthly", features: "Unlimited users, clients & deals, SSO, priority support", subscribers: tenants.filter(t => t.subscription?.planName === "enterprise").length },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(p => (
          <div key={p.name} className="glass-card rounded-xl p-4 text-center">
            <div className="text-lg font-bold">{p.name}</div>
            <div className="text-3xl font-bold mt-2 gradient-orange text-transparent bg-clip-text">{p.price}</div>
            <div className="text-xs text-muted-foreground mt-1">{p.cycle}</div>
            <div className="text-xs mt-3 text-muted-foreground">{p.features}</div>
            <div className="mt-3 text-sm font-semibold">{p.subscribers} subscriber{p.subscribers !== 1 ? "s" : ""}</div>
          </div>
        ))}
      </div>

      <Panel title="Subscription Plans Overview">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="text-left">
              {["Plan Name", "Price", "Billing Cycle", "Features", "Subscribers"].map(h => <th key={h} className="pb-2 pr-3 font-normal">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {plans.map(p => (
              <tr key={p.name} className="border-t border-border/50">
                <td className="py-2 pr-3 font-medium">{p.name}</td>
                <td className="pr-3">{p.price}</td>
                <td className="pr-3">{p.cycle}</td>
                <td className="pr-3 text-muted-foreground">{p.features}</td>
                <td className="pr-3">{p.subscribers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function ReportsView() {
  const { data: overviewData } = useSuperAdminOverview();
  const { data: tenantsData } = useTenants();
  const { data: usersData } = useUsers();
  const { data: activityData } = useSuperAdminActivity(20);

  const overview = overviewData?.overview;
  const tenants: any[] = tenantsData?.tenants ?? [];
  const users: any[] = usersData?.users ?? [];
  const activities: any[] = activityData?.activities ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Building2} label="Total Tenants" value={String(tenants.length)} sub="all time" up={true} />
        <KpiCard icon={Users} label="Total Users" value={String(users.length)} sub="all time" up={true} />
        <KpiCard icon={CreditCard} label="Active Subscriptions" value={String(overview?.subscriptions?.active ?? 0)} sub="active" up={true} />
        <KpiCard icon={CircleDollarSign} label="Total Revenue" value={fmt(overview?.revenue?.totalRevenue ?? 0)} sub="all time" up={true} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Platform Activity">
          <div className="space-y-2 text-xs">
            {activities.length === 0 && <div className="py-4 text-center text-muted-foreground">No activity</div>}
            {activities.slice(0, 10).map((a: any) => (
              <div key={a.id} className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${a.action?.includes("CREATE") ? "bg-emerald-500" : a.action?.includes("DELETE") ? "bg-red-500" : "bg-orange-500"}`} />
                <span className="flex-1 truncate">{a.description}</span>
                <span className="text-muted-foreground shrink-0">{new Date(a.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="System Overview">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border/30"><span>Total Tenants</span><span className="font-semibold">{tenants.length}</span></div>
            <div className="flex justify-between py-1 border-b border-border/30"><span>Total Users</span><span className="font-semibold">{users.length}</span></div>
            <div className="flex justify-between py-1 border-b border-border/30"><span>Active Subscriptions</span><span className="font-semibold">{overview?.subscriptions?.active ?? 0}</span></div>
            <div className="flex justify-between py-1 border-b border-border/30"><span>Total Revenue</span><span className="font-semibold">{fmt(overview?.revenue?.totalRevenue ?? 0)}</span></div>
            <div className="flex justify-between py-1 border-b border-border/30"><span>Today Actions</span><span className="font-semibold">{overview?.activity?.todayActions ?? 0}</span></div>
            <div className="flex justify-between py-1"><span>MRR</span><span className="font-semibold">{fmt(overview?.mrr ?? 0)}</span></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function SuperAdminDashboard() {
  const [section, setSection] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [addTenantOpen, setAddTenantOpen] = useState(false);
  const navigate = useNavigate();
  const user = getStoredUser();
  const initials = (user?.name || "SA").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

  function handleLogout() { clearSession(); toast.success("Logged out"); navigate({ to: "/login" }); }

  const renderContent = () => {
    switch (section) {
      case "Dashboard": return <DashboardView />;
      case "Tenants":
      case "Tenant Management": return <TenantsView />;
      case "Users":
      case "User Management": return <UsersView />;
      case "Plans & Pricing": return <PricingView />;
      case "Reports & Analytics":
      case "Audit Logs":
      case "Activity Logs":
      case "Transactions": return <ReportsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className={`${sidebarOpen ? "w-56" : "w-0 overflow-hidden"} transition-all duration-200 shrink-0 border-r border-border bg-sidebar flex flex-col`}>
        <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
          <span className="grid h-8 w-8 place-items-center rounded-md gradient-orange"><Building2 className="h-4 w-4 text-white" /></span>
          <div><div className="font-bold text-sm leading-none">CRM</div><div className="text-[10px] tracking-widest text-muted-foreground mt-1">SUPER ADMIN</div></div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navSections.map(sec => (
            <div key={sec.title}>
              <div className="px-3 py-1 text-[10px] font-semibold tracking-widest text-sidebar-foreground">{sec.title}</div>
              <ul className="space-y-0.5">
                {sec.items.map(item => (
                  <li key={item.label}>
                    <button onClick={() => setSection(item.label)}
                      className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${section === item.label ? "gradient-orange text-white shadow-md shadow-orange-900/30 font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}>
                      <item.icon className="h-4 w-4" /><span className="flex-1 text-left">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-700 grid place-items-center text-white font-semibold">{initials}</div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-sidebar" />
          </div>
          <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate text-sidebar-foreground">{user?.name ?? "Super Admin"}</div><div className="text-xs text-sidebar-foreground/60">Super Admin</div></div>
          <button onClick={handleLogout} className="grid h-9 w-9 place-items-center rounded-md border border-sidebar-border hover:bg-sidebar-accent" aria-label="Sign out"><LogOut className="h-4 w-4 text-sidebar-foreground" /></button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-background/60 backdrop-blur px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(v => !v)} className="grid h-8 w-8 place-items-center rounded hover:bg-accent"><Menu className="h-4 w-4" /></button>
            <span className="text-sm font-semibold">{section}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={() => setAddTenantOpen(true)} className="flex items-center gap-2 rounded-md gradient-orange px-4 py-2 text-xs font-semibold text-white hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> Add Tenant
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{renderContent()}</main>
      </div>
      <AddTenantModal open={addTenantOpen} onClose={() => setAddTenantOpen(false)} />
    </div>
  );
}