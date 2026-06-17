import { useState, useEffect } from "react";
import {
  Building2, CircleDollarSign, CreditCard, FileClock,
  Gauge, Layers3, LogOut, Menu, Network, Plus, Download,
  Settings, Users, UserCheck, UserX,
  ChevronRight, ArrowLeft, Eye, Edit3, UserCog,
  Shield, AlertTriangle, MessageSquare,
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
  useCreateTenant, useTenantControl,
  useTenantProfile, useUpdateTenant, useAssignPlan, useImpersonateTenant,
} from "@/lib/api/superadmin";
import { useUsers, useUpdateUser, useDeleteUser } from "@/lib/api/users";
import { clearSession, getStoredUser, saveSession, apiFetch } from "@/lib/auth";
import { applyTheme, getStoredTheme, type ThemeMode } from "@/lib/theme";
import { useNavigate } from "@tanstack/react-router";

const ORANGE = "#ff8c00";

type NavItem = { label: string; icon: LucideIcon };
const navSections: Array<{ title: string; items: NavItem[] }> = [
  { title: "Main", items: [
    { label: "Dashboard", icon: Gauge },
    { label: "Tenant Management", icon: Network },
    { label: "User Management", icon: Users },
    { label: "Plans & Pricing", icon: Layers3 },
  ]},
  { title: "System", items: [
    { label: "Audit Logs", icon: FileClock },
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

function TablePagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border/30 pt-3 text-xs text-muted-foreground">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded border border-border px-3 py-1.5 disabled:opacity-40 hover:bg-accent">
        Previous
      </button>
      <span>Page {page} of {totalPages}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="rounded border border-border px-3 py-1.5 disabled:opacity-40 hover:bg-accent">
        Next
      </button>
    </div>
  );
}

function getPageSlice<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
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
// TENANT DETAIL VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function TenantDetailView({ tenantId, onBack }: { tenantId: string; onBack: () => void }) {
  const { data, isLoading } = useTenantProfile(tenantId);
  const tenantControl = useTenantControl();
  const updateTenant = useUpdateTenant();
  const assignPlan = useAssignPlan();
  const impersonate = useImpersonateTenant();
  const navigate = useNavigate();

  const tenant = data?.tenant;
  const users: any[] = data?.users ?? [];
  const timeline: any[] = data?.timeline ?? [];
  const impact = data?.impact;

  // Edit tenant modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });

  // Plan modal
  const [planOpen, setPlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("professional");

  // Status confirm modal
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [usersPage, setUsersPage] = useState(1);
  const usersPageSize = 8;
  const visibleUsers = getPageSlice(users, usersPage, usersPageSize);
  const usersTotalPages = Math.max(1, Math.ceil(users.length / usersPageSize));

  function openEdit() {
    if (!tenant) return;
    setEditForm({ name: tenant.name || "", email: tenant.email || "", phone: tenant.phone || "" });
    setEditOpen(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateTenant.mutateAsync({ id: tenantId, data: editForm });
      toast.success("Tenant updated");
      setEditOpen(false);
    } catch (err: any) { toast.error("Failed", { description: err.message }); }
  }

  async function handleControl(action: string) {
    try {
      await tenantControl.mutateAsync({ id: tenantId, action });
      toast.success(`Tenant ${action} successful`);
      setConfirmAction(null);
    } catch (err: any) { toast.error("Failed", { description: err.message }); }
  }

  async function handleAssignPlan(e: React.FormEvent) {
    e.preventDefault();
    try {
      await assignPlan.mutateAsync({ id: tenantId, planName: selectedPlan });
      toast.success("Plan updated");
      setPlanOpen(false);
    } catch (err: any) { toast.error("Failed", { description: err.message }); }
  }

  async function handleImpersonate() {
    try {
      const result = await impersonate.mutateAsync(tenantId);
      saveSession(result.token, {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: "tenant_admin",
        tenantId: result.user.tenant?.id || tenantId,
        tenantName: result.user.tenant?.name || tenant?.name || "",
      });
      toast.success(`Impersonating ${result.user.name}`, {
        description: "You are now logged in as this tenant's admin. Token expires in 30 min.",
      });
      navigate({ to: "/tenant-admin" });
    } catch (err: any) {
      toast.error("Impersonation failed", { description: err.message });
    }
  }

  function openWhatsApp() {
    const phone = tenant?.phone || users[0]?.phone;
    if (!phone) {
      toast.error("No phone number available for this tenant");
      return;
    }
    const cleaned = phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleaned}`, "_blank");
  }

  if (!tenantId) return null;
  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading tenant details...</div>;
  if (!tenant) return <div className="py-12 text-center text-muted-foreground">Tenant not found</div>;

  const adminUsers = users.filter((u: any) => u.role === "admin");
  const agentUsers = users.filter((u: any) => u.role === "agent" || u.role === "manager");

  return (
    <div className="space-y-4">
      {/* Back button & header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Tenants
        </button>
        <div className="text-lg font-bold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-orange-400" />
          {tenant.name}
          <span className={badge(tenant.status)}>{(tenant.status || "active").charAt(0).toUpperCase() + (tenant.status || "active").slice(1)}</span>
        </div>
      </div>

      {/* Action buttons bar */}
      <div className="flex flex-wrap items-center gap-2">
        {tenant.status === "active" ? (
          <button onClick={() => setConfirmAction("suspend")} className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20">
            <AlertTriangle className="h-3.5 w-3.5" /> Suspend
          </button>
        ) : (
          <button onClick={() => handleControl("reactivate")} className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20">
            <UserCheck className="h-3.5 w-3.5" /> Activate
          </button>
        )}
        <button onClick={() => setConfirmAction("deactivate")} className="flex items-center gap-1.5 rounded-md border border-zinc-500/30 bg-zinc-500/10 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-500/20">
          <UserX className="h-3.5 w-3.5" /> Deactivate
        </button>
        <button onClick={openEdit} className="flex items-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20">
          <Edit3 className="h-3.5 w-3.5" /> Edit
        </button>
        <button onClick={() => setPlanOpen(true)} className="flex items-center gap-1.5 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-400 hover:bg-orange-500/20">
          <Layers3 className="h-3.5 w-3.5" /> Change Plan
        </button>
        <button onClick={handleImpersonate} disabled={impersonate.isPending} className="flex items-center gap-1.5 rounded-md border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-500/20 disabled:opacity-50">
          <Eye className="h-3.5 w-3.5" /> {impersonate.isPending ? "Impersonating..." : "Impersonate"}
        </button>
        <button onClick={openWhatsApp} className="flex items-center gap-1.5 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20">
          <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Users} label="Total Users" value={String(users.length)} sub={`${users.filter((u: any) => u.isActive).length} active`} up={true} />
        <KpiCard icon={UserCog} label="Admins" value={String(adminUsers.length)} sub="tenant administrators" up={true} />
        <KpiCard icon={UserCheck} label="Agents" value={String(agentUsers.length)} sub="sales agents & managers" up={true} />
        <KpiCard icon={Shield} label="Security Score" value={data?.securityScore != null ? `${data.securityScore}%` : "—"} sub={data?.failedLogins ? `${data.failedLogins} failed logins` : "secure"} up={data?.securityScore != null && data.securityScore >= 70} />
      </div>

      {/* Users section - Shows ALL users with their info */}
      <Panel title={`Users (${users.length})`}>
        <div className="overflow-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead className="text-muted-foreground">
              <tr className="text-left">
                {["Name", "Email", "Phone", "Role", "Status", "Last Active"].map(h => <th key={h} className="pb-2 pr-3 font-normal">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No users in this tenant</td></tr>}
              {visibleUsers.map((u: any) => (
                <tr key={u._id} className="border-t border-border/50">
                  <td className="py-2 pr-3 font-medium">{u.name}</td>
                  <td className="pr-3 text-muted-foreground">{u.email}</td>
                  <td className="pr-3 text-muted-foreground">{u.phone || "—"}</td>
                  <td className="pr-3 capitalize">{u.role}</td>
                  <td className="pr-3"><span className={badge(u.isActive ? "Active" : "Inactive")}>{u.isActive ? "Active" : "Inactive"}</span></td>
                  <td className="pr-3 text-muted-foreground">{u.updatedAt ? new Date(u.updatedAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
            </table>
            <TablePagination page={usersPage} totalPages={usersTotalPages} onPageChange={setUsersPage} />
          </div>
      </Panel>

      {/* Activity Timeline */}
      <Panel title="Recent Activity" action={`${timeline.length} events`}>
        <div className="space-y-1.5 text-xs max-h-60 overflow-y-auto">
          {timeline.length === 0 && <div className="py-4 text-center text-muted-foreground">No activity recorded</div>}
          {timeline.slice(0, 20).map((entry: any) => (
            <div key={entry._id} className="flex items-center gap-2 py-1.5 border-b border-border/20 last:border-0">
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                entry.action?.includes("SUSPEND") || entry.action?.includes("DELETE") || entry.status === "failed"
                  ? "bg-red-500"
                  : entry.action?.includes("CREATE") || entry.status === "success"
                    ? "bg-emerald-500"
                    : "bg-orange-500"
              }`} />
              <span className="flex-1 truncate">{entry.description || entry.action}</span>
              <span className="text-muted-foreground shrink-0">
                {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : "—"}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Impact stats */}
      {impact && (
        <Panel title="Business Impact">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="p-2 rounded bg-border/10 text-center">
              <div className="text-lg font-bold">{impact.users || 0}</div>
              <div className="text-muted-foreground">Users</div>
            </div>
            <div className="p-2 rounded bg-border/10 text-center">
              <div className="text-lg font-bold">{impact.clients || 0}</div>
              <div className="text-muted-foreground">Clients</div>
            </div>
            <div className="p-2 rounded bg-border/10 text-center">
              <div className="text-lg font-bold">{impact.deals || 0}</div>
              <div className="text-muted-foreground">Deals</div>
            </div>
            <div className="p-2 rounded bg-border/10 text-center">
              <div className="text-lg font-bold">{impact.sales || 0}</div>
              <div className="text-muted-foreground">Sales</div>
            </div>
            <div className="p-2 rounded bg-border/10 text-center">
              <div className="text-lg font-bold">{fmt(impact.revenue || 0)}</div>
              <div className="text-muted-foreground">Revenue</div>
            </div>
          </div>
        </Panel>
      )}

      {/* Confirm action modal */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Confirm {confirmAction === "suspend" ? "Suspension" : "Deactivation"}
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            {confirmAction === "suspend"
              ? `Are you sure you want to suspend ${tenant.name}? All users will lose access until reactivated.`
              : `Are you sure you want to deactivate ${tenant.name}? The organization will be marked as inactive.`}
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button onClick={() => setConfirmAction(null)} className="px-4 py-2 rounded-md border border-border text-xs hover:bg-accent">Cancel</button>
            <button onClick={() => handleControl(confirmAction!)} className="px-4 py-2 rounded-md bg-red-500 text-white text-xs hover:bg-red-600">
              {confirmAction === "suspend" ? "Suspend" : "Deactivate"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit tenant modal */}
      <Dialog open={editOpen} onOpenChange={() => setEditOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit {tenant.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3 pt-2">
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Company Name</label>
              <input type="text" value={editForm.name} required onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
              <input type="email" value={editForm.email} required onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Phone</label>
              <input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" /></div>
            <button type="submit" disabled={updateTenant.isPending} className="flex h-10 w-full items-center justify-center gap-2 rounded-md gradient-orange font-semibold text-white hover:opacity-90 disabled:opacity-60">
              {updateTenant.isPending ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Plan modal */}
      <Dialog open={planOpen} onOpenChange={() => setPlanOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change Plan — {tenant.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleAssignPlan} className="space-y-3 pt-2">
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Plan</label>
              <select value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40">
                <option value="starter">Starter</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option>
              </select></div>
            <button type="submit" disabled={assignPlan.isPending} className="flex h-10 w-full items-center justify-center gap-2 rounded-md gradient-orange font-semibold text-white hover:opacity-90 disabled:opacity-60">
              {assignPlan.isPending ? "Updating..." : "Update Plan"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TENANTS VIEW with clickable rows & View More
// ═══════════════════════════════════════════════════════════════════════════════
function TenantsView() {
  const { data, isLoading } = useTenants();
  const tenantControl = useTenantControl();
  const tenants: any[] = data?.tenants ?? [];
  const [assignTenant, setAssignTenant] = useState<any>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantsPage, setTenantsPage] = useState(1);
  const tenantsPageSize = 10;
  const visibleTenants = getPageSlice(tenants, tenantsPage, tenantsPageSize);
  const tenantsTotalPages = Math.max(1, Math.ceil(tenants.length / tenantsPageSize));
  const total = tenants.length;
  const active = tenants.filter(t => t.status === "active").length;
  const suspended = tenants.filter(t => t.status === "suspended").length;
  const trial = tenants.filter(t => t.status === "trial" || !t.status || t.status === "inactive").length;

  // If a tenant is selected, show the detail view
  if (selectedTenantId) {
    return <TenantDetailView tenantId={selectedTenantId} onBack={() => setSelectedTenantId(null)} />;
  }

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
            <>
              <table className="w-full min-w-[800px] text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left">
                  {["Company", "Sector", "Admin", "Users", "Plan", "Status", "Actions"].map(h => <th key={h} className="pb-2 pr-3 font-normal">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {tenants.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">No tenants</td></tr>}
                {visibleTenants.map((t: any) => (
                  <tr key={t._id} className="border-t border-border/50 hover:bg-border/5 cursor-pointer transition-colors" onClick={() => setSelectedTenantId(t._id)}>
                    <td className="py-2 pr-3 font-medium flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                      {t.name}
                    </td>
                    <td className="pr-3 text-muted-foreground">{t.sector || "—"}</td>
                    <td className="pr-3 text-muted-foreground">{t.email || "—"}</td>
                    <td className="pr-3">{t.usage?.totalUsers ?? 0}</td>
                    <td className="pr-3">{t.subscription?.planName || "starter"}</td>
                    <td className="pr-3"><span className={badge(t.status)}>{(t.status || "active").charAt(0).toUpperCase() + (t.status || "active").slice(1)}</span></td>
                    <td>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        {t.status === "active" ? (
                          <button onClick={() => tenantControl.mutate({ id: t._id, action: "suspend" })} className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/20">Suspend</button>
                        ) : (
                          <button onClick={() => tenantControl.mutate({ id: t._id, action: "reactivate" })} className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 hover:bg-emerald-500/20">Activate</button>
                        )}
                        <button onClick={() => setAssignTenant(t)} className="rounded border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-400 hover:bg-orange-500/20">Plan</button>
                        <button onClick={() => setSelectedTenantId(t._id)} className="rounded border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-400 hover:bg-purple-500/20 flex items-center gap-1">
                          View More <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              <TablePagination page={tenantsPage} totalPages={tenantsTotalPages} onPageChange={setTenantsPage} />
            </>
          )}
        </div>
      </Panel>
      <AssignPlanModal open={!!assignTenant} onClose={() => setAssignTenant(null)} tenant={assignTenant} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSIGN PLAN MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function AssignPlanModal({ open, onClose, tenant }: { open: boolean; onClose: () => void; tenant: any }) {
  const assignPlan = useAssignPlan();
  const [plan, setPlan] = useState("professional");
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await assignPlan.mutateAsync({ id: tenant._id, planName: plan });
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
          <button type="submit" disabled={assignPlan.isPending} className="flex h-10 w-full items-center justify-center gap-2 rounded-md gradient-orange font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {assignPlan.isPending ? "Assigning..." : "Assign Plan"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
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
      <TenantsOverviewTable />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TENANTS OVERVIEW TABLE (reusable in Dashboard)
// ═══════════════════════════════════════════════════════════════════════════════
function TenantsOverviewTable() {
  const { data, isLoading } = useTenants();
  const tenantControl = useTenantControl();
  const tenants: any[] = data?.tenants ?? [];
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [overviewPage, setOverviewPage] = useState(1);
  const overviewPageSize = 8;
  const visibleTenants = getPageSlice(tenants, overviewPage, overviewPageSize);
  const overviewTotalPages = Math.max(1, Math.ceil(tenants.length / overviewPageSize));

  if (selectedTenantId) {
    return <TenantDetailView tenantId={selectedTenantId} onBack={() => setSelectedTenantId(null)} />;
  }

  return (
    <Panel title="All Tenants" action={`${tenants.length} total`}>
      <div className="overflow-auto">
        {isLoading ? <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div> : (
          <>
            <table className="w-full min-w-[700px] text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left">
                {["Company", "Sector", "Admin", "Users", "Plan", "Status", "Actions"].map(h => <th key={h} className="pb-2 pr-3 font-normal">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">No tenants</td></tr>}
              {visibleTenants.map((t: any) => (
                <tr key={t._id} className="border-t border-border/50 hover:bg-border/5 cursor-pointer transition-colors" onClick={() => setSelectedTenantId(t._id)}>
                  <td className="py-2 pr-3 font-medium">{t.name}</td>
                  <td className="pr-3 text-muted-foreground">{t.sector || "—"}</td>
                  <td className="pr-3 text-muted-foreground">{t.email || "—"}</td>
                  <td className="pr-3">{t.usage?.totalUsers ?? 0}</td>
                  <td className="pr-3">{t.subscription?.planName || "starter"}</td>
                  <td className="pr-3"><span className={badge(t.status)}>{(t.status || "active").charAt(0).toUpperCase() + (t.status || "active").slice(1)}</span></td>
                  <td><div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {t.status === "active" ? (
                      <button onClick={() => tenantControl.mutate({ id: t._id, action: "suspend" })} className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/20">Suspend</button>
                    ) : (
                      <button onClick={() => tenantControl.mutate({ id: t._id, action: "reactivate" })} className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 hover:bg-emerald-500/20">Activate</button>
                    )}
                    <button onClick={() => setSelectedTenantId(t._id)} className="rounded border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-400 hover:bg-purple-500/20 flex items-center gap-1">
                      View More <ChevronRight className="h-3 w-3" />
                    </button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <TablePagination page={overviewPage} totalPages={overviewTotalPages} onPageChange={setOverviewPage} />
        </>
        )}
      </div>
    </Panel>
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
  const [usersPage, setUsersPage] = useState(1);
  const usersPageSize = 12;
  const visibleUsers = getPageSlice(users, usersPage, usersPageSize);
  const usersTotalPages = Math.max(1, Math.ceil(users.length / usersPageSize));

  // Edit user state
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", isActive: true });
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  function openEdit(u: any) {
    setEditForm({ name: u.name || "", phone: u.phone || "", isActive: u.isActive ?? true });
    setEditUser(u);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    try {
      await updateUser.mutateAsync({ id: editUser._id, data: editForm });
      toast.success("User updated", { description: `${editUser.name} has been updated.` });
      setEditUser(null);
    } catch (err: any) { toast.error("Failed to update user", { description: err.message }); }
  }

  async function handleDeleteUser(u: any) {
    try {
      await deleteUser.mutateAsync(u._id);
      toast.success("User deleted", { description: `${u.name} has been permanently deleted.` });
      setDeleteConfirm(null);
    } catch (err: any) { toast.error("Failed to delete user", { description: err.message }); }
  }

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
            <>
              <table className="w-full min-w-[800px] text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left">
                  {["Name", "Email", "Role", "Tenant", "Status", "Last Active", "Actions"].map(h => <th key={h} className="pb-2 pr-3 font-normal">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">No users</td></tr>}
                {visibleUsers.map((u: any) => (
                  <tr key={u._id} className="border-t border-border/50">
                    <td className="py-2 pr-3 font-medium">{u.name}</td>
                    <td className="pr-3 text-muted-foreground">{u.email}</td>
                    <td className="pr-3 capitalize">{u.role}</td>
                    <td className="pr-3 text-muted-foreground">{u.tenant?.name || "—"}</td>
                    <td className="pr-3"><span className={badge(u.isActive ? "Active" : "Inactive")}>{u.isActive ? "Active" : "Inactive"}</span></td>
                    <td className="pr-3 text-muted-foreground">{u.updatedAt ? new Date(u.updatedAt).toLocaleDateString() : "—"}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(u)} className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-400 hover:bg-blue-500/20">
                          Edit
                        </button>
                        <button onClick={() => setDeleteConfirm(u)} className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/20">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              <TablePagination page={usersPage} totalPages={usersTotalPages} onPageChange={setUsersPage} />
            </>
          )}
        </div>
      </Panel>

      {/* Edit User Modal */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit User — {editUser?.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3 pt-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Full Name</label>
              <input type="text" value={editForm.name} required onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone</label>
              <input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-muted-foreground">Active</label>
              <input type="checkbox" checked={editForm.isActive} onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 rounded border-border accent-orange-500" />
            </div>
            <button type="submit" disabled={updateUser.isPending} className="flex h-10 w-full items-center justify-center gap-2 rounded-md gradient-orange font-semibold text-white hover:opacity-90 disabled:opacity-60">
              {updateUser.isPending ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Modal */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Delete User
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Are you sure you want to permanently delete <strong>{deleteConfirm?.name}</strong> ({deleteConfirm?.email})?<br /><br />
            This will also remove all associated data and reassign clients/deals to other active users.
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-md border border-border text-xs hover:bg-accent">Cancel</button>
            <button onClick={() => handleDeleteUser(deleteConfirm!)} disabled={deleteUser.isPending} className="px-4 py-2 rounded-md bg-red-500 text-white text-xs hover:bg-red-600 disabled:opacity-60">
              {deleteUser.isPending ? "Deleting..." : "Delete User"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
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
  const [plansPage, setPlansPage] = useState(1);
  const plansPageSize = 10;
  const visiblePlans = getPageSlice(plans, plansPage, plansPageSize);
  const plansTotalPages = Math.max(1, Math.ceil(plans.length / plansPageSize));

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
            {visiblePlans.map(p => (
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
        <TablePagination page={plansPage} totalPages={plansTotalPages} onPageChange={setPlansPage} />
      </Panel>
    </div>
  );
}

function AuditLogsView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch<any>(`/audit-logs?limit=${pageSize}&page=${page}`)
      .then((data) => {
        if (active) {
          setLogs(data.logs ?? []);
          setTotalPages(Math.max(1, data.pagination?.pages || Math.ceil((data.pagination?.total || 0) / pageSize)));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page]);

  return (
    <div className="space-y-4">
      <Panel title="Audit Logs" action={`${loading ? "loading" : `${logs.length} entries`}`}>
        {loading ? <div className="py-8 text-center text-muted-foreground text-sm">Loading audit logs...</div> : (
          <div className="overflow-auto">
            {logs.length === 0 ? <div className="py-8 text-center text-muted-foreground text-sm">No audit logs found</div> : (
              <table className="w-full min-w-[800px] text-xs">
                <thead className="text-muted-foreground">
                  <tr className="text-left">
                    {["Time", "Action", "User", "Entity", "Status", "Description"].map(h => <th key={h} className="pb-2 pr-3 font-normal">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => (
                    <tr key={log._id} className="border-t border-border/50">
                      <td className="py-2 pr-3 text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</td>
                      <td className="py-2 pr-3 font-medium">{log.action || "—"}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{log.userName || log.userEmail || "—"}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{log.entityType || "—"}</td>
                      <td className="py-2 pr-3"><span className={badge(log.status || "success")}>{(log.status || "success").charAt(0).toUpperCase() + (log.status || "success").slice(1)}</span></td>
                      <td className="py-2 pr-3 text-muted-foreground">{log.description || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </Panel>
    </div>
  );
}

function PlatformSettingsView() {
  const user = getStoredUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  function updateTheme(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully.");
    } catch (error) {
      toast.error("Could not update password", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Panel title="Platform Settings">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Super admin profile</div>
            <div className="mt-3 text-lg font-semibold">{user?.name ?? "Super Admin"}</div>
            <div className="text-sm text-muted-foreground">{user?.email ?? "No email available"}</div>
            <div className="mt-3 rounded-2xl bg-muted px-3 py-2 text-xs text-muted-foreground">Role: {user?.role ?? "superadmin"}</div>
          </div>

          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Appearance</div>
            <div className="mt-3 grid gap-3">
              <button type="button" onClick={() => updateTheme("dark")} className={`rounded-2xl border p-4 text-left ${theme === "dark" ? "border-orange-500 bg-orange-500/10" : "border-border hover:bg-accent"}`}>
                <div className="font-semibold">Dark mode</div>
                <div className="mt-1 text-sm text-muted-foreground">Use the high-contrast dark dashboard theme.</div>
              </button>
              <button type="button" onClick={() => updateTheme("light")} className={`rounded-2xl border p-4 text-left ${theme === "light" ? "border-orange-500 bg-orange-500/10" : "border-border hover:bg-accent"}`}>
                <div className="font-semibold">Light mode</div>
                <div className="mt-1 text-sm text-muted-foreground">Use the clean light dashboard theme.</div>
              </button>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Change password">
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Current password</label>
            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">New password</label>
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Confirm new password</label>
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <button type="submit" disabled={passwordLoading} className="gradient-orange rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {passwordLoading ? "Updating password..." : "Update password"}
          </button>
        </form>
      </Panel>
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
      case "Tenant Management": return <TenantsView />;
      case "User Management": return <UsersView />;
      case "Plans & Pricing": return <PricingView />;
      case "Audit Logs": return <AuditLogsView />;
      case "Platform Settings": return <PlatformSettingsView />;
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