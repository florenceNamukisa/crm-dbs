import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart, Legend,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useClients } from "@/lib/api/clients";
import { useDeals } from "@/lib/api/deals";
import { useSales } from "@/lib/api/sales";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@/lib/api/users";
import { useSchedules, useCreateSchedule } from "@/lib/api/schedules";
import { useMeetings } from "@/lib/api/meetings";
import { useTasks } from "@/lib/api/tasks";
import { KanbanBoard } from "@/components/dashboard/KanbanBoard";
import { clearSession, getStoredUser, apiFetch } from "@/lib/auth";
import type { User, Client, Deal } from "@/lib/types";
import {
  Gauge, Users, Star, Building2, Briefcase, Clock, FileBarChart, CalendarDays,
  Menu, LogOut, Plus, Search, MoreHorizontal, Activity, CircleDollarSign,
  CalendarPlus, ChevronLeft, ChevronRight, X, AlertTriangle,
} from "lucide-react";

const ORANGE = "#ff8c00";

function GlobalMeetingForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ title: "", location: "In Person", date: "", time: "" });
  const queryClient = useQueryClient();
  return (
    <div className="space-y-3 pt-2">
      <div>
        <Label className="text-xs font-medium">Meeting Title *</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Meeting title" className="mt-1" />
      </div>
      <div>
        <Label className="text-xs font-medium">Location</Label>
        <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none mt-1">
          <option>In Person</option><option>Online</option><option>Phone Call</option>
        </select>
      </div>
      <div>
        <Label className="text-xs font-medium">Date *</Label>
        <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs font-medium">Time</Label>
        <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="mt-1" />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={async () => {
          if (!form.title || !form.date) { toast.error("Title and date are required"); return; }
          try {
            const scheduledTime = form.date && form.time ? new Date(`${form.date}T${form.time}`).toISOString() : form.date ? new Date(form.date).toISOString() : null;
            await apiFetch("/meetings", { method: "POST", body: JSON.stringify({ title: form.title, location: form.location, scheduledTime }) });
            toast.success("Meeting scheduled successfully");
            onClose();
            queryClient.invalidateQueries({ queryKey: ["schedules"] });
            queryClient.invalidateQueries({ queryKey: ["meetings"] });
          } catch (err: any) { toast.error("Failed to schedule meeting", { description: err.message }); }
        }} className="gradient-orange text-white">Schedule</Button>
      </DialogFooter>
    </div>
  );
}

const ORANGE_DEEP = "#ff6a00";
const GREEN = "#22c55e";

type View = "table" | "kanban";

const DEPARTMENTS = ['Sales'];
const REGIONS = [
  'Central — Kampala', 'Central — Wakiso', 'Central — Mukono', 'Central — Mpigi',
  'Central — Luweero', 'Central — Mityana', 'Central — Mubende',
  'East — Jinja', 'East — Mbale', 'East — Soroti', 'East — Tororo', 'East — Busia',
  'East — Iganga', 'East — Kamuli', 'East — Kapchorwa',
  'North — Gulu', 'North — Lira', 'North — Arua', 'North — Kitgum', 'North — Adjumani',
  'North — Moyo', 'North — Pader', 'North — Apac', 'North — Oyam',
  'West — Kasese', 'West — Mbarara', 'West — Hoima', 'West — Kabarole', 'West — Fort Portal',
  'West — Bushenyi', 'West — Kabale', 'West — Ibanda', 'West — Ntungamo', 'West — Rukungiri',
];
const ROLES_BY_DEPARTMENT: Record<string, string[]> = {
  'Sales': ['Sales Manager', 'Sales Agent'],
};

const navSections = [
  { title: "Workspace", items: [
    { label: "Dashboard", icon: Gauge },
    { label: "User Management", icon: Users },
    { label: "Leads", icon: Star },
    { label: "Clients & Organizations", icon: Building2 },
    { label: "Sales Pipeline", icon: Briefcase },
  ] },
  { title: "Activities", items: [
    { label: "Tasks", icon: Clock },
  ] },
  { title: "Reports", items: [
    { label: "Reports", icon: FileBarChart },
  ] },
];

function Panel({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`glass-card rounded-lg p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gradient-orange">{title}</h3>
        {action && <div>{action}</div>}
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
    <div className="glass-card rounded-lg p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full gradient-orange shadow-lg shadow-orange-950/40">
          <Icon className="h-6 w-6 text-white" />
        </span>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
          <div className={`text-[11px] ${up ? "text-emerald-400" : "text-red-400"}`}>{up ? "↑" : "↓"} {sub}</div>
        </div>
      </div>
    </div>
  );
}

function ConfigSelect({ label, required, value, options, onChange, placeholder = 'Select…', allowOther = true }: {
  label: string; required?: boolean; value: string; options: string[];
  onChange: (next: string) => void; placeholder?: string; allowOther?: boolean;
}) {
  const inOptions = options.includes(value);
  const isOther = !!value && !inOptions;
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}{required ? ' *' : ''}
      </label>
      <select
        value={isOther ? '__other__' : (value || '')}
        onChange={(e) => onChange(e.target.value === '__other__' ? '' : e.target.value)}
        className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        required={required && !value}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
        {allowOther && <option value="__other__">Other (type below)…</option>}
      </select>
      {allowOther && (isOther || !value) && (
        <input
          type="text"
          value={isOther ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Type ${label.toLowerCase()}`}
          className="mt-2 h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      )}
    </div>
  );
}

function AddUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createUser = useCreateUser();
  const [form, setForm] = useState({
    name: '',
    employeeId: '',
    email: '',
    phone: '',
    location: '',
    department: 'Sales',
    region: REGIONS[0],
    role: 'Sales Agent',
  });
  const [lastCreatedOtp, setLastCreatedOtp] = useState<string | null>(null);
  const [lastCreatedEmail, setLastCreatedEmail] = useState<string | null>(null);
  const u = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error('Name and email are required');
      return;
    }
    const backendRole = form.role === 'Sales Manager' ? 'sales_manager' : 'sales_agent';

try {
        const result = await createUser.mutateAsync({
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: backendRole,
          employeeId: form.employeeId,
          department: form.department,
          region: form.region,
        });
      if (result?.emailSent) {
        toast.success('User created & OTP email sent', { description: `${form.name} will receive an email with login instructions.` });
        setLastCreatedOtp(null);
        setLastCreatedEmail(null);
        setForm({ name: '', employeeId: '', email: '', phone: '', location: '', department: 'Sales', region: REGIONS[0], role: 'Sales Agent' });
        onClose();
      } else {
        // Store OTP so we can display it in the modal
        setLastCreatedOtp(result?.otp || null);
        setLastCreatedEmail(form.email);
        toast.warning('User created, email could not be sent', {
          description: result?.otp ? 'OTP is displayed below. Share it manually.' : 'Share the OTP manually with the user.',
          duration: 8000,
        });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to create user', { description: errorMessage });
    }
  }

  const rolesForDept = ROLES_BY_DEPARTMENT[form.department] || [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-gradient-orange">Create New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-2 max-h-[70vh] overflow-y-auto pr-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identity</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Full Name *</label>
              <input type="text" required value={form.name} onChange={(e) => u('name', e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Employee ID</label>
              <input type="text" value={form.employeeId} onChange={(e) => u('employeeId', e.target.value)}
                placeholder="EMP-001" className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          </div>

          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Location</label>
              <input type="text" value={form.location} onChange={(e) => u('location', e.target.value)}
                placeholder="City, District" className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Telephone</label>
              <input type="tel" value={form.phone} onChange={(e) => u('phone', e.target.value)}
                placeholder="+256 …" className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email *</label>
            <input type="email" required value={form.email} onChange={(e) => u('email', e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
          </div>

          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">Department & Region</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ConfigSelect label="Department" required value={form.department} options={DEPARTMENTS} onChange={(v) => {
              const next = v || 'Sales';
              const nextRoles = ROLES_BY_DEPARTMENT[next] || [];
              u('department', next);
              u('role', nextRoles[0] || '');
            }} />
            <ConfigSelect label="Region" required value={form.region} options={REGIONS} onChange={(v) => u('region', v || REGIONS[0])} />
          </div>

          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">Role</h4>
          <ConfigSelect label="Role" required value={form.role} options={rolesForDept} allowOther={false} onChange={(v) => u('role', v)} />

          <div className="mt-4 flex justify-end gap-2 pt-3 border-t border-border">
            <button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-4 text-sm hover:bg-accent">Cancel</button>
            <button type="submit" disabled={createUser.isPending} className="h-9 rounded-md gradient-orange px-4 text-sm font-semibold text-white disabled:opacity-60">
              {createUser.isPending ? 'Saving…' : 'Create user & send OTP'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── User Detail Modal ──────────────────────────────────────
function UserDetailModal({ user: u, clients, deals, open, onClose }: { user: User; clients: Client[]; deals: Deal[]; open: boolean; onClose: () => void }) {
  if (!u) return null;
    const userClients = clients.filter((c: Client) => {
    const agentId = (c.agent as any)?._id || c.agent;
    return String(agentId) === String(u._id);
  });
  const userDeals = deals.filter((d: Deal) => {
    const agentId = (d.agent as any)?._id || d.agent || (d.assignedTo as any)?._id || d.assignedTo;
    return String(agentId) === String(u._id);
  });
  const wonDeals = userDeals.filter((d: Deal) => (d.stage || '').toLowerCase() === 'won');
  const totalRevenue = userDeals.reduce((s: number, d: Deal) => s + Number(d.value || d.amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gradient-orange">User Details — {u.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Profile Header */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-background/50 border border-border">
            <div className="h-14 w-14 rounded-full gradient-orange grid place-items-center text-white text-lg font-bold shrink-0">
              {(u.name || 'U').split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-lg">{u.name}</div>
              <div className="text-sm text-muted-foreground">{u.email}</div>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded border ${u.isActive ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-zinc-500/30 bg-zinc-500/10 text-zinc-300'}`}>
                  {u.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 capitalize">{u.role}</span>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Phone', value: u.phone || '—' },
              { label: 'Department', value: u.department || '—' },
              { label: 'Region', value: u.region || '—' },
              { label: 'Joined', value: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—' },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-lg bg-background/50 border border-border">
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
                <div className="text-sm font-medium mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Performance Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Assigned Clients', value: String(userClients.length), color: 'text-blue-400' },
              { label: 'Total Sales', value: String(userDeals.length), color: 'text-orange-400' },
              { label: 'Won Sales', value: String(wonDeals.length), color: 'text-emerald-400' },
              { label: 'Revenue', value: `UGX ${totalRevenue.toLocaleString()}`, color: 'text-purple-400' },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-lg bg-background/50 border border-border text-center">
                <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{item.label}</div>
              </div>
            ))}
          </div>

          {/* Assigned Clients */}
          <Panel title={`Assigned Clients (${userClients.length})`}>
            {userClients.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">No clients assigned</div>
            ) : (
              <div className="overflow-auto max-h-48">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="text-left">
                      {['Name', 'Company', 'Email', 'Status'].map((h) => <th key={h} className="pb-1 pr-2 font-normal">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {userClients.map((c: Client) => (
                      <tr key={c._id} className="border-t border-border/30">
                        <td className="py-1.5 pr-2 font-medium">{c.name || '—'}</td>
                        <td className="pr-2 text-muted-foreground">{c.company || '—'}</td>
                        <td className="pr-2 text-muted-foreground">{c.email || '—'}</td>
                        <td className="pr-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">{c.status || 'active'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* User's Sales */}
          <Panel title={`Sales by ${u.name} (${userDeals.length})`}>
            {userDeals.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">No sales recorded</div>
            ) : (
              <div className="overflow-auto max-h-48">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="text-left">
                      {['Name', 'Value', 'Stage', 'Created'].map((h) => <th key={h} className="pb-1 pr-2 font-normal">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {userDeals.map((d: Deal) => (
                      <tr key={d._id} className="border-t border-border/30">
                        <td className="py-1.5 pr-2 font-medium">{d.name || d.title || '—'}</td>
                        <td className="pr-2 text-muted-foreground">UGX {Number(d.value || d.amount || 0).toLocaleString()}</td>
                        <td className="pr-2"><span className={`text-[10px] px-1.5 py-0.5 rounded ${(d.stage || 'New') === 'Won' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'}`}>{d.stage || 'New'}</span></td>
                        <td className="pr-2 text-muted-foreground text-xs">{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dashboard View ──────────────────────────────────────
function DashboardView({ users, clients, deals, onSelectUser }: { users: User[]; clients: Client[]; deals: Deal[]; schedules?: any[]; onSelectUser?: (user: User) => void }) {
  const monthlySales = useMemo(() => {
    const now = new Date();
    return deals
      .filter((d: Deal) => {
        const dt = d.createdAt ? new Date(d.createdAt) : null;
        return dt && dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
      })
      .reduce((sum: number, d: Deal) => sum + Number(d.value || d.amount || 0), 0);
  }, [deals]);

  const totalUsers = users.length;
  const activeUsers = users.filter((u: User) => u.isActive).length;
  const totalLeads = clients.filter((c: Client) => c.leadStatus && c.leadStatus !== 'Converted').length;
  const wonDeals = deals.filter((d: Deal) => (d.stage || '').toLowerCase() === 'won');
  const pipelineValue = deals.reduce((s: number, d: Deal) => s + Number(d.value || d.amount || 0), 0);
  const wonValue = wonDeals.reduce((s: number, d: Deal) => s + Number(d.value || d.amount || 0), 0);

  // ── Chart data: Revenue trend (last 7 days) ──
  const revenueData = useMemo(() => {
    const days: { d: string; v: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const sum = deals
        .filter((dl: any) => {
          if (!dl.createdAt) return false;
          const t = new Date(dl.createdAt).getTime();
          return t >= dayStart.getTime() && t < dayEnd.getTime();
        })
        .reduce((s: number, dl: any) => s + Number(dl.value || dl.amount || 0), 0);
      days.push({ d: dayLabel, v: sum });
    }
    return days;
  }, [deals]);

// ── Chart data: Users by department ──
   const deptData = useMemo(() => {
    const map = new Map<string, number>();
    users.forEach((u: any) => {
      const dept = u.department || 'Unassigned';
      map.set(dept, (map.get(dept) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [users]);

  // ── Chart data: User activity ──
  const userActivityData = useMemo(() => {
    const days: { d: string; users: number; deals: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const createdDeals = deals.filter((dl: Deal) => {
        if (!dl.createdAt) return false;
        const t = new Date(dl.createdAt).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime();
      });
      const createdUsers = users.filter((u: User) => {
        if (!u.createdAt) return false;
        const t = new Date(u.createdAt).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime();
      });
      days.push({ d: dayLabel, users: createdUsers.length, deals: createdDeals.length });
    }
    return days;
  }, [deals, users]);

  return (
     <div className="space-y-4">
       {/* KPI cards */}
       <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
         <Kpi icon={CircleDollarSign} label="Sales (Monthly)" value={monthlySales ? `UGX ${monthlySales.toLocaleString()}` : 'UGX 0'} sub={monthlySales ? 'this month so far' : 'no sales this month'} up={monthlySales > 0} />
         <Kpi icon={Users} label="Users (All time)" value={String(totalUsers)} sub={`${activeUsers} active`} up={totalUsers > 0} />
         <Kpi icon={Star} label="Leads" value={String(totalLeads)} sub={`${totalLeads} total`} up={totalLeads > 0} />
         <Kpi icon={Briefcase} label="Pipeline Value" value={`UGX ${pipelineValue.toLocaleString()}`} sub={`UGX ${wonValue.toLocaleString()} won`} up={pipelineValue > 0} />
       </div>

{/* Users Table */}
        <Panel title={`Team Members (${users.length})`}>
          {users.length === 0 ? (
            <EmptyState icon={Users} label="No users yet" hint="Add your first team member from User Management." />
          ) : (
            <div className="overflow-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left">
                    {['Name', 'Email', 'Role', 'Department', 'Status', 'Joined'].map((h) => (
                      <th key={h} className="pb-2 pr-3 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 10).map((u: User) => {
                    return (
                      <tr key={u._id} onClick={() => onSelectUser && onSelectUser(u)} className="border-t border-border/50 hover:bg-accent/50 cursor-pointer transition">
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-700 grid place-items-center text-white text-[10px] font-semibold shrink-0">
                              {(u.name || 'U').split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <span className="font-medium">{u.name || '—'}</span>
                          </div>
                        </td>
                        <td className="pr-3 text-muted-foreground">{u.email}</td>
                        <td className="pr-3 capitalize">{u.role}</td>
                       <td className="pr-3 text-muted-foreground">{u.department || '—'}</td>
                       <td className="pr-3">
                         <span className={`rounded border px-2 py-0.5 text-[10px] ${u.isActive ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-zinc-500/30 bg-zinc-500/10 text-zinc-300'}`}>
                           {u.isActive ? 'Active' : 'Inactive'}
                         </span>
                       </td>
                       <td className="pr-3 text-muted-foreground text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
         )}
         {users.length > 10 && <div className="text-xs text-muted-foreground mt-2">Showing 10 of {users.length} users. Click "User Management" to see all.</div>}
       </Panel>

       {/* Charts row 1 */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
         <Panel title="Revenue Trend (7 days)" className="lg:col-span-2">
           <div className="h-64">
             {revenueData.every((r) => r.v === 0) ? (
               <EmptyState icon={CircleDollarSign} label="No revenue data yet" hint="Revenue will appear once deals are created." />
             ) : (
               <ResponsiveContainer>
                 <AreaChart data={revenueData}>
                   <defs>
                     <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="0%" stopColor={ORANGE} stopOpacity={0.6} />
                       <stop offset="100%" stopColor={ORANGE} stopOpacity={0.02} />
                     </linearGradient>
                   </defs>
                   <CartesianGrid stroke="#ffffff12" />
                   <XAxis dataKey="d" stroke="#888" fontSize={10} />
                   <YAxis stroke="#888" fontSize={10} tickFormatter={(v) => `UGX ${(v / 1000).toFixed(0)}k`} />
                   <Tooltip contentStyle={{ background: '#111', border: '1px solid #ffffff22', borderRadius: 8 }} />
                   <Area dataKey="v" stroke={ORANGE_DEEP} fill="url(#adminGrad)" strokeWidth={2} />
                 </AreaChart>
               </ResponsiveContainer>
             )}
           </div>
         </Panel>

         <Panel title="Users by Department">
           <div className="h-64">
             {deptData.length === 0 ? (
               <EmptyState icon={Users} label="No departments yet" hint="Departments will appear as users are added." />
             ) : (
               <ResponsiveContainer>
                 <PieChart>
                   <Pie data={deptData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                     {deptData.map((_, i) => (
                       <Cell key={i} fill={[ORANGE, '#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#f59e0b', '#06b6d4'][i % 7]} />
                     ))}
                   </Pie>
                   <Tooltip contentStyle={{ background: '#111', border: '1px solid #ffffff22', borderRadius: 8 }} />
                 </PieChart>
               </ResponsiveContainer>
             )}
           </div>
           {deptData.length > 0 && (
             <div className="flex flex-wrap gap-2 mt-2">
               {deptData.map((d, i) => (
                 <span key={d.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                   <span className="h-2 w-2 rounded-full" style={{ background: [ORANGE, '#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#f59e0b', '#06b6d4'][i % 7] }} />
                   {d.name} ({d.value})
                 </span>
               ))}
             </div>
           )}
         </Panel>
       </div>

       {/* Activity (7 days) */}
       <Panel title="Activity (7 days)">
         <div className="h-64">
           {userActivityData.every((d) => d.users === 0 && d.deals === 0) ? (
             <EmptyState icon={Activity} label="No activity yet" hint="Activity will appear as your team works." />
           ) : (
             <ResponsiveContainer>
               <LineChart data={userActivityData}>
                 <CartesianGrid stroke="#ffffff12" />
                 <XAxis dataKey="d" stroke="#888" fontSize={10} />
                 <YAxis stroke="#888" fontSize={10} />
                 <Tooltip contentStyle={{ background: '#111', border: '1px solid #ffffff22', borderRadius: 8 }} />
                 <Legend />
                 <Line type="monotone" dataKey="deals" stroke={ORANGE} strokeWidth={2} name="Deals" dot={{ r: 3 }} />
                 <Line type="monotone" dataKey="users" stroke={GREEN} strokeWidth={2} name="Users" dot={{ r: 3 }} />
               </LineChart>
             </ResponsiveContainer>
           )}
         </div>
       </Panel>
      </div>
    );
  }

  // ─── User Management View ──────────────────────────────────────
function UserManagementView({ users, onSelectUser }: { users: any[]; onSelectUser?: (user: any) => void }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", isActive: true });
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const filteredUsers = useMemo(() => {
    return users.filter((u: any) => {
      const matchesSearch = !search ||
        (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none"
        >
          <option value="all">All Roles</option>
          <option value="agent">Agent</option>
          <option value="manager">Manager</option>
        </select>
      </div>

      <div className="glass-card rounded-lg p-4">
        {filteredUsers.length === 0 ? (
          <EmptyState icon={Users} label="No users found" hint="Try adjusting your search or filters." />
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="text-left">
                  {["Name", "Email", "Role", "Department", "Region", "Phone", "Status", "Joined", "Actions"].map((h) => (
                    <th key={h} className="pb-2 pr-3 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u: any) => (
                  <tr key={u._id} className="border-t border-border/50 hover:bg-accent/30 transition">
                    <td className="py-2 pr-3 font-medium">{u.name || '—'}</td>
                    <td className="pr-3 text-muted-foreground">{u.email}</td>
                    <td className="pr-3 capitalize">{u.role}</td>
                    <td className="pr-3 text-muted-foreground">{u.department || '—'}</td>
                    <td className="pr-3 text-muted-foreground">{u.region || '—'}</td>
                    <td className="pr-3 text-muted-foreground">{u.phone || '—'}</td>
                    <td className="pr-3">
                      <span className={`rounded border px-2 py-0.5 text-[10px] ${u.isActive ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-zinc-500/30 bg-zinc-500/10 text-zinc-300'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="pr-3 text-muted-foreground">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                    <td>
                      <div className="flex gap-1" onClick={(e) => { e.stopPropagation(); if (onSelectUser) onSelectUser(u); }}>
                        <button onClick={(e) => { e.stopPropagation(); openEdit(u); }} className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-400 hover:bg-blue-500/20">
                          Edit
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(u); }} className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/20">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-3">Showing {filteredUsers.length} of {users.length} users</div>
      </div>

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

// ─── Leads View (Table + Kanban) ──────────────────────────────
function LeadsView({ clients, users }: { clients: any[]; users: any[] }) {
  const [view, setView] = useState<View>("table");
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');

  const getAgentName = (agentId: any) => {
    const id = agentId?._id || agentId;
    const u = users.find((u: any) => String(u._id) === String(id));
    return u?.name || '—';
  };

  const leads = useMemo(() => {
    return clients.filter((c: any) => {
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q);
      const matchesAgent = agentFilter === 'all' ||
        String(c.agent?._id || c.agent) === agentFilter;
      return matchesSearch && matchesAgent;
    });
  }, [clients, search, agentFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or company..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none"
        >
          <option value="all">All Agents</option>
          {users.filter((u: any) => u.role === 'agent' || u.role === 'manager').map((u: any) => (
            <option key={u._id} value={u._id}>{u.name}</option>
          ))}
        </select>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setView("table")}
            className={`px-3 py-1.5 text-xs font-medium transition ${view === "table" ? "gradient-orange text-white" : "hover:bg-accent"}`}
          >
            Table
          </button>
          <button
            onClick={() => setView("kanban")}
            className={`px-3 py-1.5 text-xs font-medium transition ${view === "kanban" ? "gradient-orange text-white" : "hover:bg-accent"}`}
          >
            Kanban
          </button>
        </div>
      </div>

      {view === "table" ? (
        <div className="glass-card rounded-lg p-4">
          {leads.length === 0 ? (
            <EmptyState icon={Star} label="No leads found" hint="Leads will appear here once created by agents." />
          ) : (
            <div className="overflow-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left">
                    {["Name", "Company", "Agent", "Email", "Phone", "Status", "Rating", "Created"].map((h) => (
                      <th key={h} className="pb-2 pr-3 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((c: any) => (
                    <tr key={c._id} className="border-t border-border/50 hover:bg-accent/30">
                      <td className="py-2 pr-3 font-medium">{c.name || c.contactName || '—'}</td>
                      <td className="pr-3 text-muted-foreground">{c.company || c.companyName || '—'}</td>
                      <td className="pr-3 text-muted-foreground">{getAgentName(c.agent)}</td>
                      <td className="pr-3 text-muted-foreground">{c.email || '—'}</td>
                      <td className="pr-3 text-muted-foreground">{c.phone || c.telephone || '—'}</td>
                      <td className="pr-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${
                          (c.leadStatus || 'New') === 'New' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                          (c.leadStatus || '') === 'Contacted' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                          (c.leadStatus || '') === 'Qualified' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                          (c.leadStatus || '') === 'Converted' ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' :
                          'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
                        }`}>
                          {c.leadStatus || 'New'}
                        </span>
                      </td>
                      <td className="pr-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded ${
                          (c.rating || '') === 'Hot' ? 'bg-red-500/15 text-red-400' :
                          (c.rating || '') === 'Warm' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-blue-500/15 text-blue-400'
                        }`}>
                          {c.rating || 'Cold'}
                        </span>
                      </td>
                      <td className="pr-3 text-muted-foreground text-xs">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-3">Showing {leads.length} leads</div>
        </div>
      ) : (
        <Panel title="Leads Pipeline" action={<span className="text-xs text-muted-foreground">Drag to update status</span>}>
          <KanbanBoard rows={leads} type="leads" statusKey="leadStatus" />
        </Panel>
      )}
    </div>
  );
}

// ─── Client Detail Modal ──────────────────────────────────────
function ClientDetailModal({ client: cl, users, deals, schedules, meetings, open, onClose }: { client: any; users: any[]; deals: any[]; schedules: any[]; meetings?: any[]; open: boolean; onClose: () => void }) {
  if (!cl) return null;

  const getUserName = (userId: any) => {
    const id = userId?._id || userId;
    const u = users.find((u: any) => String(u._id) === String(id));
    return u?.name || '—';
  };

  const clientDeals = deals.filter((d: any) => {
    const cid = d.client?._id || d.client;
    return String(cid) === String(cl._id);
  });
  const wonDeals = clientDeals.filter((d: any) => (d.stage || '').toLowerCase() === 'won');
  const totalRevenue = clientDeals.reduce((s: number, d: any) => s + Number(d.value || d.amount || 0), 0);

  const clientSchedules = schedules.filter((s: any) => {
    const cid = s.client?._id || s.client;
    return String(cid) === String(cl._id);
  });

  const clientTasks = cl.tasks || [];
  const clientMeetings = (meetings || []).filter((m: any) => {
    const cid = m.client?._id || m.client;
    return String(cid) === String(cl._id);
  });
  const clientInteractions = cl.interactions || [];
  const clientContacts = cl.contacts || [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gradient-orange">Client Details — {cl.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Profile Header */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-background/50 border border-border">
            <div className="h-14 w-14 rounded-full gradient-orange grid place-items-center text-white text-lg font-bold shrink-0">
              {(cl.name || 'C').split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-lg">{cl.name}</div>
              <div className="text-sm text-muted-foreground">{cl.email} · {cl.phone || '—'}</div>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded border ${
                  (cl.status || 'prospect') === 'active' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' :
                  (cl.status || '') === 'vip' ? 'border-purple-500/30 bg-purple-500/10 text-purple-300' :
                  (cl.status || '') === 'inactive' ? 'border-zinc-500/30 bg-zinc-500/10 text-zinc-300' :
                  'border-blue-500/30 bg-blue-500/10 text-blue-300'
                }`}>
                  {(cl.status || 'prospect').charAt(0).toUpperCase() + (cl.status || 'prospect').slice(1)}
                </span>
                {cl.priority && (
                  <span className={`text-[10px] px-2 py-0.5 rounded ${
                    cl.priority === 'high' ? 'bg-red-500/15 text-red-400' :
                    cl.priority === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                    'bg-blue-500/15 text-blue-400'
                  }`}>
                    {cl.priority.charAt(0).toUpperCase() + cl.priority.slice(1)} Priority
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Agent', value: getUserName(cl.agent) },
              { label: 'Company', value: cl.company || '—' },
              { label: 'Industry', value: cl.industry || '—' },
              { label: 'Position', value: cl.position || '—' },
              { label: 'Address', value: [cl.city, cl.state, cl.country].filter(Boolean).join(', ') || cl.address || '—' },
              { label: 'NIN', value: cl.nin || '—' },
              { label: 'Engagement Score', value: cl.engagementScore != null ? `${cl.engagementScore}/100` : '—' },
              { label: 'Created', value: cl.createdAt ? new Date(cl.createdAt).toLocaleDateString() : '—' },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-lg bg-background/50 border border-border">
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
                <div className="text-sm font-medium mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Tags */}
          {cl.tags && cl.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {cl.tags.map((tag: string, i: number) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-orange-500/15 text-orange-400">{tag}</span>
              ))}
            </div>
          )}

          {/* Notes */}
          {cl.notes && (
            <Panel title="Notes">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{cl.notes}</p>
            </Panel>
          )}

          {/* Performance Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Deals', value: String(clientDeals.length), color: 'text-orange-400' },
              { label: 'Won Deals', value: String(wonDeals.length), color: 'text-emerald-400' },
              { label: 'Revenue', value: `UGX ${totalRevenue.toLocaleString()}`, color: 'text-purple-400' },
              { label: 'Schedules', value: String(clientSchedules.length), color: 'text-blue-400' },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-lg bg-background/50 border border-border text-center">
                <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{item.label}</div>
              </div>
            ))}
          </div>

          {/* Contact Persons */}
          {clientContacts.length > 0 && (
            <Panel title={`Contact Persons (${clientContacts.length})`}>
              <div className="overflow-auto max-h-48">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="text-left">
                      {['Name', 'Position', 'Email', 'Phone', 'Primary'].map((h) => <th key={h} className="pb-1 pr-2 font-normal">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {clientContacts.map((cp: any, i: number) => (
                      <tr key={i} className="border-t border-border/30">
                        <td className="py-1.5 pr-2 font-medium">{cp.name || '—'}</td>
                        <td className="pr-2 text-muted-foreground">{cp.position || '—'}</td>
                        <td className="pr-2 text-muted-foreground">{cp.email || '—'}</td>
                        <td className="pr-2 text-muted-foreground">{cp.phone || '—'}</td>
                        <td className="pr-2">{cp.isPrimary ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400">Primary</span> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {/* Assigned Agents */}
          {cl.assignedAgents && cl.assignedAgents.length > 0 && (
            <Panel title={`Assigned Agents (${cl.assignedAgents.length})`}>
              <div className="flex flex-wrap gap-2">
                {cl.assignedAgents.map((agId: any, i: number) => (
                  <span key={i} className="text-sm px-3 py-1 rounded-lg bg-background/50 border border-border">{getUserName(agId)}</span>
                ))}
              </div>
            </Panel>
          )}

          {/* Deals */}
          <Panel title={`Deals (${clientDeals.length})`}>
            {clientDeals.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">No deals recorded</div>
            ) : (
              <div className="overflow-auto max-h-48">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="text-left">
                      {['Name', 'Value', 'Agent', 'Stage', 'Created'].map((h) => <th key={h} className="pb-1 pr-2 font-normal">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {clientDeals.map((d: any) => (
                      <tr key={d._id} className="border-t border-border/30">
                        <td className="py-1.5 pr-2 font-medium">{d.name || d.title || '—'}</td>
                        <td className="pr-2 text-muted-foreground">UGX {Number(d.value || d.amount || 0).toLocaleString()}</td>
                        <td className="pr-2 text-muted-foreground">{getUserName(d.agent || d.assignedTo)}</td>
                        <td className="pr-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${(d.stage || 'New') === 'Won' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'}`}>{d.stage || 'New'}</span>
                        </td>
                        <td className="pr-2 text-muted-foreground text-xs">{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Schedules */}
          <Panel title={`Schedules (${clientSchedules.length})`}>
            {clientSchedules.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">No schedules</div>
            ) : (
              <div className="overflow-auto max-h-48">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="text-left">
                      {['Title', 'Date', 'Status'].map((h) => <th key={h} className="pb-1 pr-2 font-normal">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {clientSchedules.map((s: any) => (
                      <tr key={s._id} className="border-t border-border/30">
                        <td className="py-1.5 pr-2 font-medium">{s.title || s.name || '—'}</td>
                        <td className="pr-2 text-muted-foreground text-xs">{s.date ? new Date(s.date).toLocaleDateString() : s.scheduledTime ? new Date(s.scheduledTime).toLocaleDateString() : '—'}</td>
                        <td className="pr-2"><span className={`text-[10px] px-1.5 py-0.5 rounded ${(s.status || 'scheduled') === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'}`}>{s.status || 'Scheduled'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Tasks */}
          <Panel title={`Tasks (${clientTasks.length})`}>
            {clientTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">No tasks</div>
            ) : (
              <div className="overflow-auto max-h-48">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="text-left">
                      {['Title', 'Subject', 'Due Date', 'Status', 'Assigned To'].map((h) => <th key={h} className="pb-1 pr-2 font-normal">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {clientTasks.map((t: any, i: number) => (
                      <tr key={i} className="border-t border-border/30">
                        <td className="py-1.5 pr-2 font-medium">{t.title || '—'}</td>
                        <td className="pr-2 text-muted-foreground">{t.subject || '—'}</td>
                        <td className="pr-2 text-muted-foreground text-xs">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</td>
                        <td className="pr-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>{t.status || 'pending'}</span>
                        </td>
                        <td className="pr-2 text-muted-foreground">{t.assignedTo ? getUserName(t.assignedTo) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

{/* Interactions */}
           <Panel title={`Interactions (${clientInteractions.length})`}>
             {clientInteractions.length === 0 ? (
               <div className="text-sm text-muted-foreground py-4 text-center">No interactions recorded</div>
             ) : (
               <div className="overflow-auto max-h-48">
                 <table className="w-full text-sm">
                   <thead className="text-xs text-muted-foreground">
                     <tr className="text-left">
                       {['Type', 'Date', 'Notes', 'By'].map((h) => <th key={h} className="pb-1 pr-2 font-normal">{h}</th>)}
                     </tr>
                   </thead>
                   <tbody>
                     {clientInteractions.map((inter: any, i: number) => (
                       <tr key={i} className="border-t border-border/30">
                         <td className="py-1.5 pr-2">
                           <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                             inter.type === 'call' ? 'bg-blue-500/15 text-blue-400' :
                             inter.type === 'email' ? 'bg-purple-500/15 text-purple-400' :
                             inter.type === 'meeting' ? 'bg-emerald-500/15 text-emerald-400' :
                             'bg-zinc-500/15 text-zinc-400'
                           }`}>{inter.type || 'other'}</span>
                         </td>
                         <td className="pr-2 text-muted-foreground text-xs">{inter.date ? new Date(inter.date).toLocaleDateString() : '—'}</td>
                         <td className="pr-2 text-muted-foreground max-w-[200px] truncate">{inter.notes || '—'}</td>
                         <td className="pr-2 text-muted-foreground">{inter.createdBy ? getUserName(inter.createdBy) : '—'}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
           </Panel>

           {/* Meetings */}
           <Panel title={`Meetings (${clientMeetings.length})`}>
             {clientMeetings.length === 0 ? (
               <div className="text-sm text-muted-foreground py-4 text-center">No meetings recorded</div>
             ) : (
               <div className="overflow-auto max-h-48">
                 <table className="w-full text-sm">
                   <thead className="text-xs text-muted-foreground">
                     <tr className="text-left">
                       {['Title', 'Date', 'Status'].map((h) => <th key={h} className="pb-1 pr-2 font-normal">{h}</th>)}
                     </tr>
                   </thead>
                   <tbody>
                     {clientMeetings.map((m: any) => (
                       <tr key={m._id} className="border-t border-border/30">
                         <td className="py-1.5 pr-2 font-medium">{m.title || '—'}</td>
                         <td className="pr-2 text-muted-foreground text-xs">{m.scheduledTime ? new Date(m.scheduledTime).toLocaleDateString() : '—'}</td>
                         <td className="pr-2"><span className={`text-[10px] px-1.5 py-0.5 rounded ${m.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'}`}>{m.status || 'scheduled'}</span></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
           </Panel>
         </div>
       </DialogContent>
     </Dialog>
   );
}

// ─── Clients View ──────────────────────────────────────
function ClientsView({ clients, users, deals, schedules, meetings, onSelectClient }: { clients: any[]; users: any[]; deals: any[]; schedules: any[]; meetings: any[]; onSelectClient?: (client: any) => void }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [actionRow, setActionRow] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const getAgentName = (agentId: any) => {
    const id = agentId?._id || agentId;
    const u = users.find((u: any) => String(u._id) === String(id));
    return u?.name || '—';
  };

  const filteredClients = useMemo(() => {
    return clients.filter((c: any) => {
      const matchesSearch = !search ||
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesAgent = agentFilter === 'all' ||
        String(c.agent?._id || c.agent) === agentFilter;
      return matchesSearch && matchesStatus && matchesAgent;
    });
  }, [clients, search, statusFilter, agentFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none"
        >
          <option value="all">All Agents</option>
          {users.filter((u: any) => u.role === 'agent' || u.role === 'manager').map((u: any) => (
            <option key={u._id} value={u._id}>{u.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="vip">VIP</option>
          <option value="prospect">Prospect</option>
        </select>
      </div>

      <div className="glass-card rounded-lg p-4">
        {filteredClients.length === 0 ? (
          <EmptyState icon={Building2} label="No clients found" hint="Clients will appear here once created by agents." />
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="text-left">
                  {["Name", "Company", "Agent", "Email", "Phone", "Industry", "Status", "Created", "Actions"].map((h) => (
                    <th key={h} className="pb-2 pr-3 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c: any) => (
                  <tr key={c._id} onClick={() => onSelectClient && onSelectClient(c)} className="border-t border-border/50 hover:bg-accent/30 cursor-pointer transition">
                    <td className="py-2 pr-3 font-medium">{c.name || '—'}</td>
                    <td className="pr-3 text-muted-foreground">{c.company || '—'}</td>
                    <td className="pr-3 text-muted-foreground">{getAgentName(c.agent)}</td>
                    <td className="pr-3 text-muted-foreground">{c.email || '—'}</td>
                    <td className="pr-3 text-muted-foreground">{c.phone || '—'}</td>
                    <td className="pr-3 text-muted-foreground">{c.industry || '—'}</td>
                    <td className="pr-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${
                        (c.status || 'active') === 'active' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                        (c.status || '') === 'vip' ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' :
                        'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
                      }`}>
                        {(c.status || 'active').charAt(0).toUpperCase() + (c.status || 'active').slice(1)}
                      </span>
                    </td>
                    <td className="pr-3 text-muted-foreground text-xs">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="pr-3 relative">
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setActionRow(actionRow === c._id ? null : c._id); }} className="h-6 w-6 rounded grid place-items-center hover:bg-accent" title="View details">
                          <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        {actionRow === c._id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setActionRow(null)} />
                            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[160px] py-1">
                              <button onClick={(e) => { e.stopPropagation(); setSelectedClient(c); setActionRow(null); }} className="w-full text-left px-4 py-2 text-xs hover:bg-accent flex items-center gap-2"><MoreHorizontal className="h-3 w-3" /> View Details</button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-3">Showing {filteredClients.length} of {clients.length} clients</div>

        {selectedClient && <ClientDetailModal client={selectedClient} users={users} deals={deals} schedules={schedules} meetings={meetings} open={!!selectedClient} onClose={() => setSelectedClient(null)} />}
      </div>
    </div>
  );
}

// ─── Deals View ──────────────────────────────────────
function DealsView({ deals, users }: { deals: any[]; users: any[] }) {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  const filteredDeals = useMemo(() => {
    return deals.filter((d: any) => {
      const name = d.name || d.title || '';
      const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase());
      const matchesStage = stageFilter === 'all' || d.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [deals, search, stageFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deals..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none"
        >
          <option value="all">All Stages</option>
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="Proposal">Proposal</option>
          <option value="Won">Won</option>
          <option value="Lost">Lost</option>
        </select>
      </div>

      <div className="glass-card rounded-lg p-4">
        {filteredDeals.length === 0 ? (
          <EmptyState icon={Briefcase} label="No deals found" hint="Deals will appear here once created by agents." />
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="text-left">
                  {["Name", "Value", "Stage", "Client", "Agent", "Created"].map((h) => (
                    <th key={h} className="pb-2 pr-3 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((d: any) => (
                  <tr key={d._id} className="border-t border-border/50 hover:bg-accent/30">
                    <td className="py-2 pr-3 font-medium">{d.name || d.title || '—'}</td>
                    <td className="pr-3 text-muted-foreground">UGX {Number(d.value || d.amount || 0).toLocaleString()}</td>
                    <td className="pr-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${
                        (d.stage || 'New') === 'Won' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                        (d.stage || '') === 'Lost' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                        'bg-blue-500/15 text-blue-400 border-blue-500/30'
                      }`}>
                        {d.stage || 'New'}
                      </span>
                    </td>
                    <td className="pr-3 text-muted-foreground">{d.client?.name || '—'}</td>
                    <td className="pr-3 text-muted-foreground">
                      {(() => {
                        const raw = d.agent || d.assignedTo;
                        if (!raw) return '—';
                        if (typeof raw === 'object' && raw.name) return raw.name;
                        const found = users.find((u: any) => String(u._id) === String(raw));
                        return found?.name || '—';
                      })()}
                    </td>
                    <td className="pr-3 text-muted-foreground text-xs">
                      {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-3">Showing {filteredDeals.length} of {deals.length} deals</div>
      </div>
    </div>
  );
}

// ─── Schedules View ──────────────────────────────────────
function SchedulesView({ schedules, clients = [], users = [] }: { schedules: any[]; clients?: any[]; users?: any[] }) {
  const user = getStoredUser();
  const queryClient = useQueryClient();
  const createSchedule = useCreateSchedule();
  const [search, setSearch] = useState('');
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: "",
    location: "Office",
    date: "",
    time: "",
    duration: 60,
    client: "",
    agent: "",
    mode: "in-person",
  });
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyCells = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;

  const scheduleItems = useMemo(() => schedules
    .map((s: any) => ({ ...s, scheduleDate: s.date || s.scheduledTime }))
    .filter((s: any) => s.scheduleDate)
    .sort((a: any, b: any) => new Date(a.scheduleDate).getTime() - new Date(b.scheduleDate).getTime()), [schedules]);

  const filteredSchedules = useMemo(() => scheduleItems.filter((s: any) => {
    const title = s.title || s.name || '';
    const client = s.clientName || s.client?.name || '';
    const agent = s.agent?.name || s.agentName || '';
    const q = search.toLowerCase();
    return !q || title.toLowerCase().includes(q) || client.toLowerCase().includes(q) || agent.toLowerCase().includes(q);
  }), [scheduleItems, search]);

  const upcomingSchedules = filteredSchedules
    .filter((s: any) => new Date(s.scheduleDate) >= new Date(new Date().toDateString()))
    .slice(0, 8);

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    completed: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
    rescheduled: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };

  function resetMeetingForm() {
    setMeetingForm({ title: "", location: "Office", date: "", time: "", duration: 60, client: "", agent: "", mode: "in-person" });
  }

  function getScheduleDayKey(s: any) {
    const scheduleDate = s.date || s.scheduledTime;
    if (!scheduleDate) return "";
    const d = new Date(scheduleDate);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function getMonthSchedules(day: number) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filteredSchedules.filter((s: any) => getScheduleDayKey(s) === dateStr);
  }

  async function scheduleMeeting() {
    if (!meetingForm.title || !meetingForm.date) {
      toast.error("Title and date are required");
      return;
    }

    const agentId = meetingForm.agent || (user as any)?.id || (user as any)?._id;
    if (!agentId) {
      toast.error("Please select an agent");
      return;
    }

    const scheduledDate = new Date(`${meetingForm.date}T${meetingForm.time || "09:00"}`);
    if (Number.isNaN(scheduledDate.getTime())) {
      toast.error("Invalid date/time combination");
      return;
    }

    try {
      await createSchedule.mutateAsync({
        title: meetingForm.title,
        agent: agentId,
        client: meetingForm.client || null,
        date: scheduledDate.toISOString(),
        duration: meetingForm.duration || 60,
        type: "meeting",
        mode: meetingForm.mode,
        location: meetingForm.mode === "google-meet" ? "Google Meet" : meetingForm.location,
        status: "scheduled",
      });
      resetMeetingForm();
      setShowMeetingForm(false);
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting scheduled successfully");
    } catch (err: any) {
      toast.error("Failed to schedule meeting", { description: err.message });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search schedules..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowMeetingForm(true)}
          className="h-9 px-3 gradient-orange text-white rounded-md flex items-center gap-2 text-xs font-semibold shadow hover:opacity-90"
        >
          <CalendarPlus className="h-4 w-4" /> Schedule Meeting
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="glass-card rounded-lg p-4 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-orange-400" />
              <h3 className="font-semibold text-gradient-orange">{monthName}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))} className="h-8 w-8 rounded-lg border border-border hover:bg-accent flex items-center justify-center">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setCurrentDate(new Date())} className="h-8 px-3 rounded-lg border border-border hover:bg-accent text-xs font-medium">Today</button>
              <button type="button" onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))} className="h-8 w-8 rounded-lg border border-border hover:bg-accent flex items-center justify-center">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">{day}</div>
            ))}
            {emptyCells.map((i) => <div key={`empty-${i}`} className="min-h-[86px] rounded-lg bg-muted/30" />)}
            {calendarDays.map((day) => {
              const daySchedules = getMonthSchedules(day);
              const isToday = isCurrentMonth && day === today.getDate();
              return (
                <div key={day} className={`min-h-[86px] rounded-lg border p-1 ${isToday ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10" : "border-border"}`}>
                  <div className={`text-xs font-medium mb-1 ${isToday ? "text-orange-600" : "text-muted-foreground"}`}>{day}</div>
                  {daySchedules.slice(0, 3).map((s: any, idx: number) => (
                    <div key={`${s._id || idx}-${day}`} className="truncate rounded px-1 py-0.5 mb-0.5 bg-primary/10 text-primary text-[10px]">
                      {s.title || s.name || "Meeting"}
                    </div>
                  ))}
                  {daySchedules.length > 3 && <div className="text-[10px] text-muted-foreground">+{daySchedules.length - 3} more</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-5 w-5 text-orange-400" />
            <h3 className="font-semibold text-gradient-orange">Upcoming Meetings</h3>
          </div>
          {upcomingSchedules.length === 0 ? (
            <EmptyState icon={CalendarDays} label="No upcoming meetings" hint="Schedule a meeting to see it here." />
          ) : (
            <div className="space-y-3">
              {upcomingSchedules.map((s: any) => (
                <div key={s._id} className="rounded-xl border border-border p-3 space-y-1">
                  <div className="font-medium text-sm">{s.title || s.name || "Meeting"}</div>
                  <div className="text-xs text-muted-foreground">{s.client?.name || s.clientName || "No client selected"}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.agent?.name || s.agentName || "Admin"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.scheduleDate).toLocaleDateString()} at {new Date(s.scheduleDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded border ${statusColors[(s.status || "scheduled").toLowerCase()] || statusColors.scheduled}`}>
                    {s.status || "Scheduled"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card rounded-lg p-4">
        {filteredSchedules.length === 0 ? (
          <EmptyState icon={CalendarDays} label="No schedules found" hint="Schedules will appear here once created." />
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="text-left">
                  {["Title", "Client", "Agent", "Date", "Time", "Status"].map((h) => (
                    <th key={h} className="pb-2 pr-3 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.map((s: any) => (
                  <tr key={s._id} className="border-t border-border/50 hover:bg-accent/30">
                    <td className="py-2 pr-3 font-medium">{s.title || s.name || "—"}</td>
                    <td className="pr-3 text-muted-foreground">{s.clientName || s.client?.name || "—"}</td>
                    <td className="pr-3 text-muted-foreground">{s.agent?.name || s.agentName || "—"}</td>
                    <td className="pr-3 text-muted-foreground">{new Date(s.scheduleDate).toLocaleDateString()}</td>
                    <td className="pr-3 text-muted-foreground">{new Date(s.scheduleDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="pr-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${statusColors[(s.status || "scheduled").toLowerCase()] || statusColors.scheduled}`}>
                        {s.status || "Scheduled"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-3">Showing {filteredSchedules.length} schedules</div>
      </div>

      <Dialog open={showMeetingForm} onOpenChange={(open) => { setShowMeetingForm(open); if (!open) resetMeetingForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
            <button type="button" onClick={() => setShowMeetingForm(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="sm:col-span-2">
              <Label className="text-xs font-medium">Meeting Title *</Label>
              <Input value={meetingForm.title} onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })} placeholder="Meeting title" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium">Client</Label>
              <select value={meetingForm.client} onChange={(e) => setMeetingForm({ ...meetingForm, client: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none mt-1">
                <option value="">No client selected</option>
                {clients.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs font-medium">Agent *</Label>
              <select value={meetingForm.agent} onChange={(e) => setMeetingForm({ ...meetingForm, agent: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none mt-1">
                <option value="">Use current admin</option>
                {users.map((u: any) => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs font-medium">Mode</Label>
              <select value={meetingForm.mode} onChange={(e) => setMeetingForm({ ...meetingForm, mode: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none mt-1">
                <option value="in-person">In Person</option>
                <option value="google-meet">Google Meet</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-medium">Date *</Label>
              <Input type="date" value={meetingForm.date} onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium">Time</Label>
              <Input type="time" value={meetingForm.time} onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium">Duration (minutes)</Label>
              <Input type="number" min={1} max={1440} value={meetingForm.duration} onChange={(e) => setMeetingForm({ ...meetingForm, duration: parseInt(e.target.value) || 60 })} className="mt-1" />
            </div>
            {meetingForm.mode === "in-person" && (
              <div className="sm:col-span-2">
                <Label className="text-xs font-medium">Location</Label>
                <Input value={meetingForm.location} onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })} placeholder="Office, meeting room, or address" className="mt-1" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMeetingForm(false)}>Cancel</Button>
            <Button onClick={scheduleMeeting} disabled={createSchedule.isPending} className="gradient-orange text-white">
              {createSchedule.isPending ? "Scheduling..." : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Reports View ──────────────────────────────────────
type ReportTab = "overview" | "deals" | "sales" | "meetings" | "tasks";

export function ReportsView({ users, clients, deals, sales, schedules, meetings, tasks }: {
  users: any[];
  clients: any[];
  deals: any[];
  sales: any[];
  schedules: any[];
  meetings: any[];
  tasks: any[];
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");

  const reportUsers = useMemo(() => users
    .filter((u: any) => roleFilter === "all" || u.role === roleFilter)
    .filter((u: any) => ["agent", "manager"].includes(u.role))
    .map((u: any) => {
      const userId = u._id;
      const userDeals = deals.filter((d: any) => String(d.agent?._id || d.agent) === userId);
      const userSales = sales.filter((s: any) => String(s.agent?._id || s.agent) === userId);
      const userSchedules = schedules.filter((s: any) => String(s.agent?._id || s.agent) === userId);
      const userMeetings = meetings.filter((m: any) => String(m.agent?._id || m.agent) === userId);
      const userTasks = tasks.filter((t: any) => String(t.assignedTo?._id || t.assignedTo) === userId || String(t.createdBy?._id || t.createdBy) === userId);
      const userClients = clients.filter((c: any) => String(c.agent?._id || c.agent) === userId);
      const wonDeals = userDeals.filter((d: any) => (d.stage || "").toLowerCase() === "won");
      const lostDeals = userDeals.filter((d: any) => (d.stage || "").toLowerCase() === "lost");
      const pipelineValue = userDeals.reduce((sum: number, d: any) => sum + Number(d.value || d.amount || 0), 0);
      const revenue = userSales.reduce((sum: number, s: any) => sum + Number(s.finalAmount || s.totalAmount || s.amount || 0), 0);
      const completedMeetings = userSchedules.filter((s: any) => (s.type || "").toLowerCase() === "meeting" && (s.status || "").toLowerCase() === "completed").length;
      const upcomingMeetings = userSchedules.filter((s: any) => new Date(s.date || s.scheduledTime) >= new Date()).length;
      const activeTasks = userTasks.filter((t: any) => !["completed", "done"].includes((t.status || "").toLowerCase())).length;
      const completedTasks = userTasks.filter((t: any) => ["completed", "done"].includes((t.status || "").toLowerCase())).length;
      const performanceScore = u.performanceScore || Number(u.totalDeals || 0) + Math.round(revenue / 1000);

      return {
        user: u,
        userId,
        userDeals,
        userSales,
        userSchedules,
        userMeetings,
        userTasks,
        userClients,
        wonDeals,
        lostDeals,
        pipelineValue,
        revenue,
        completedMeetings,
        upcomingMeetings,
        activeTasks,
        completedTasks,
        performanceScore,
      };
    })
    .sort((a, b) => b.revenue - a.revenue), [users, clients, deals, sales, schedules, meetings, tasks, roleFilter]);

  const filteredReports = useMemo(() => reportUsers.filter((r: any) => {
    const q = search.toLowerCase();
    const name = r.user.name || "";
    const email = r.user.email || "";
    const region = r.user.region || "";
    return !q || name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || region.toLowerCase().includes(q);
  }), [reportUsers, search]);

  const selectedReport = reportUsers.find((r: any) => r.userId === selectedUserId) || reportUsers[0] || null;

  useEffect(() => {
    if (reportUsers.length === 0) {
      setSelectedUserId("");
      return;
    }
    if (!reportUsers.some((r: any) => r.userId === selectedUserId)) {
      setSelectedUserId(reportUsers[0].userId);
    }
  }, [reportUsers, selectedUserId]);

  const totalRevenue = reportUsers.reduce((sum: number, r: any) => sum + r.revenue, 0);
  const totalPipeline = reportUsers.reduce((sum: number, r: any) => sum + r.pipelineValue, 0);
  const totalMeetings = reportUsers.reduce((sum: number, r: any) => sum + r.completedMeetings + r.upcomingMeetings, 0);
  const totalTasks = reportUsers.reduce((sum: number, r: any) => sum + r.activeTasks + r.completedTasks, 0);

  function getId(value: any) {
    return value?._id || value?.id || value;
  }

  function formatCurrency(value: number) {
    return `UGX ${Number(value || 0).toLocaleString()}`;
  }

  function formatDate(value: any) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
  }

  function formatTime(value: any) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  const userRows = [
    { label: "Pipeline Value", value: formatCurrency(selectedReport?.pipelineValue || 0) },
    { label: "Revenue", value: formatCurrency(selectedReport?.revenue || 0) },
    { label: "Deals", value: String(selectedReport?.userDeals.length || 0) },
    { label: "Won Deals", value: String(selectedReport?.wonDeals.length || 0) },
    { label: "Lost Deals", value: String(selectedReport?.lostDeals.length || 0) },
    { label: "Meetings", value: String(selectedReport?.completedMeetings || 0) },
    { label: "Upcoming Meetings", value: String(selectedReport?.upcomingMeetings || 0) },
    { label: "Tasks", value: String((selectedReport?.activeTasks || 0) + (selectedReport?.completedTasks || 0)) },
    { label: "Clients", value: String(selectedReport?.userClients.length || 0) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Panel title="Sales Agents / Managers">
          <div className="text-2xl font-bold text-gradient-orange">{reportUsers.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Reportable users</div>
        </Panel>
        <Panel title="Total Revenue">
          <div className="text-2xl font-bold text-gradient-orange">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-muted-foreground mt-1">Closed sales</div>
        </Panel>
        <Panel title="Pipeline Value">
          <div className="text-2xl font-bold text-gradient-orange">{formatCurrency(totalPipeline)}</div>
          <div className="text-xs text-muted-foreground mt-1">All open and closed deals</div>
        </Panel>
        <Panel title="Meetings & Tasks">
          <div className="text-2xl font-bold text-gradient-orange">{totalMeetings + totalTasks}</div>
          <div className="text-xs text-muted-foreground mt-1">Activity records</div>
        </Panel>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agent or manager..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none"
        >
          <option value="all">All roles</option>
          <option value="agent">Sales agents</option>
          <option value="manager">Managers</option>
        </select>
      </div>

      <div className="glass-card rounded-lg p-4">
        <div className="overflow-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="text-left">
                {["User", "Role", "Region", "Deals", "Won", "Lost", "Pipeline", "Revenue", "Meetings", "Tasks", "Performance"].map((h) => (
                  <th key={h} className="pb-2 pr-3 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredReports.length === 0 ? (
                <tr><td colSpan={11} className="py-8 text-center text-muted-foreground">No report records found</td></tr>
              ) : filteredReports.map((r: any) => (
                <tr
                  key={r.userId}
                  onClick={() => setSelectedUserId(r.userId)}
                  className={`border-t border-border/50 hover:bg-accent/30 cursor-pointer transition ${selectedReport?.userId === r.userId ? "bg-orange-500/10" : ""}`}
                >
                  <td className="py-3 pr-3">
                    <div className="font-medium">{r.user.name}</div>
                    <div className="text-xs text-muted-foreground">{r.user.email}</div>
                  </td>
                  <td className="pr-3 capitalize">{r.user.role}</td>
                  <td className="pr-3 text-muted-foreground">{r.user.region || "—"}</td>
                  <td className="pr-3">{r.userDeals.length}</td>
                  <td className="pr-3 text-emerald-400">{r.wonDeals.length}</td>
                  <td className="pr-3 text-red-400">{r.lostDeals.length}</td>
                  <td className="pr-3">{formatCurrency(r.pipelineValue)}</td>
                  <td className="pr-3">{formatCurrency(r.revenue)}</td>
                  <td className="pr-3">{r.completedMeetings + r.upcomingMeetings}</td>
                  <td className="pr-3">{r.activeTasks + r.completedTasks}</td>
                  <td className="pr-3">{r.performanceScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReport ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Panel title={selectedReport.user.name}>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full gradient-orange grid place-items-center text-white font-bold">
                  {(selectedReport.user.name || "User").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{selectedReport.user.role}</div>
                  <div className="text-xs text-muted-foreground">{selectedReport.user.email}</div>
                </div>
              </div>
                <div className="grid grid-cols-2 gap-3">
                  {userRows.map((row) => (
                    <div key={row.label} className="rounded-lg border border-border bg-background/50 p-3">
                      <div className="text-xs text-muted-foreground">{row.label}</div>
                      <div className="font-semibold mt-1">{row.value}</div>
                    </div>
                  ))}
                </div>
            </div>
          </Panel>

          <div className="glass-card rounded-lg p-4 xl:col-span-2">
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: "overview", label: "Overview" },
                { key: "deals", label: "Deals" },
                { key: "sales", label: "Sales" },
                { key: "meetings", label: "Meetings" },
                { key: "tasks", label: "Tasks" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as ReportTab)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium border ${activeTab === tab.key ? "gradient-orange text-white border-orange-500" : "border-border hover:bg-accent"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Panel title="Deals by Stage">
                  {["lead", "qualification", "proposal", "negotiation", "won", "lost"].map((stage) => (
                    <div key={stage} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <span className="capitalize text-sm text-muted-foreground">{stage}</span>
                      <span className="font-semibold">{selectedReport.userDeals.filter((d: any) => (d.stage || "").toLowerCase() === stage).length}</span>
                    </div>
                  ))}
                </Panel>
                <Panel title="Sales Summary">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Cash sales</span>
                      <span className="font-semibold">{selectedReport.userSales.filter((s: any) => s.paymentMethod === "cash").length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Credit sales</span>
                      <span className="font-semibold">{selectedReport.userSales.filter((s: any) => s.paymentMethod === "credit").length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Average sale</span>
                      <span className="font-semibold">{formatCurrency(selectedReport.userSales.length ? selectedReport.revenue / selectedReport.userSales.length : 0)}</span>
                    </div>
                  </div>
                </Panel>
              </div>
            )}

            {activeTab === "deals" && (
              <div className="overflow-auto">
                {selectedReport.userDeals.length === 0 ? <EmptyState icon={FileBarChart} label="No deals" hint="No deals are assigned to this user." /> : (
                  <table className="w-full min-w-[800px] text-sm">
                    <thead className="text-xs text-muted-foreground"><tr className="text-left">{["Deal", "Client", "Stage", "Value", "Probability", "Close Date"].map((h) => <th key={h} className="pb-2 pr-3 font-normal">{h}</th>)}</tr></thead>
                    <tbody>
                      {selectedReport.userDeals.map((d: any) => (
                        <tr key={getId(d)} className="border-t border-border/50">
                          <td className="py-2 pr-3 font-medium">{d.title || "Untitled deal"}</td>
                          <td className="pr-3 text-muted-foreground">{typeof d.client === "object" ? d.client?.name : "Client"}</td>
                          <td className="pr-3 capitalize">{d.stage || "—"}</td>
                          <td className="pr-3">{formatCurrency(d.value || d.amount || 0)}</td>
                          <td className="pr-3">{d.probability ?? "—"}%</td>
                          <td className="pr-3 text-muted-foreground">{formatDate(d.expectedCloseDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === "sales" && (
              <div className="overflow-auto">
                {selectedReport.userSales.length === 0 ? <EmptyState icon={FileBarChart} label="No sales" hint="No sales are assigned to this user." /> : (
                  <table className="w-full min-w-[800px] text-sm">
                    <thead className="text-xs text-muted-foreground"><tr className="text-left">{["Customer", "Amount", "Payment", "Status", "Date", "Notes"].map((h) => <th key={h} className="pb-2 pr-3 font-normal">{h}</th>)}</tr></thead>
                    <tbody>
                      {selectedReport.userSales.map((s: any) => (
                        <tr key={getId(s)} className="border-t border-border/50">
                          <td className="py-2 pr-3 font-medium">{s.customerName || s.clientName || "Customer"}</td>
                          <td className="pr-3">{formatCurrency(s.finalAmount || s.totalAmount || s.amount || 0)}</td>
                          <td className="pr-3 capitalize">{s.paymentMethod || "—"}</td>
                          <td className="pr-3 capitalize">{s.status || s.stage || "—"}</td>
                          <td className="pr-3 text-muted-foreground">{formatDate(s.saleDate || s.createdAt)}</td>
                          <td className="pr-3 text-muted-foreground">{s.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === "meetings" && (
              <div className="overflow-auto">
                {selectedReport.userSchedules.length + selectedReport.userMeetings.length === 0 ? <EmptyState icon={CalendarDays} label="No meetings" hint="No meeting records for this user." /> : (
                  <table className="w-full min-w-[800px] text-sm">
                    <thead className="text-xs text-muted-foreground"><tr className="text-left">{["Title", "Client", "Type", "Date", "Time", "Status"].map((h) => <th key={h} className="pb-2 pr-3 font-normal">{h}</th>)}</tr></thead>
                    <tbody>
                      {[...selectedReport.userSchedules, ...selectedReport.userMeetings].sort((a: any, b: any) => new Date(b.date || b.scheduledTime || 0).getTime() - new Date(a.date || a.scheduledTime || 0).getTime()).map((m: any) => (
                        <tr key={getId(m)} className="border-t border-border/50">
                          <td className="py-2 pr-3 font-medium">{m.title || m.name || "Meeting"}</td>
                          <td className="pr-3 text-muted-foreground">{m.client?.name || m.clientName || "—"}</td>
                          <td className="pr-3 capitalize">{m.type || "meeting"}</td>
                          <td className="pr-3 text-muted-foreground">{formatDate(m.date || m.scheduledTime)}</td>
                          <td className="pr-3 text-muted-foreground">{formatTime(m.date || m.scheduledTime)}</td>
                          <td className="pr-3 capitalize">{m.status || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="overflow-auto">
                {selectedReport.userTasks.length === 0 ? <EmptyState icon={Clock} label="No tasks" hint="No tasks are assigned to this user." /> : (
                  <table className="w-full min-w-[800px] text-sm">
                    <thead className="text-xs text-muted-foreground"><tr className="text-left">{["Task", "Status", "Priority", "Due Date", "Created"].map((h) => <th key={h} className="pb-2 pr-3 font-normal">{h}</th>)}</tr></thead>
                    <tbody>
                      {selectedReport.userTasks.map((t: any) => (
                        <tr key={getId(t)} className="border-t border-border/50">
                          <td className="py-2 pr-3 font-medium">{t.title || t.description || "Task"}</td>
                          <td className="pr-3 capitalize">{t.status || "—"}</td>
                          <td className="pr-3 capitalize">{t.priority || "—"}</td>
                          <td className="pr-3 text-muted-foreground">{formatDate(t.dueDate || t.createdAt)}</td>
                          <td className="pr-3 text-muted-foreground">{formatDate(t.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <Panel title="No users found">
          <EmptyState icon={FileBarChart} label="No sales agents or managers" hint="Create users with agent or manager roles to see reports here." />
        </Panel>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────
export default function TenantAdminDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setSelectedClient] = useState<any>(null);
  const [globalShowMeetingForm, setGlobalShowMeetingForm] = useState(false);

  const user = getStoredUser();
  const initials = (user?.name || 'Admin')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const navigate = useNavigate();

  const { data: usersData } = useUsers();
  const { data: clientsData } = useClients();
  const { data: dealsData } = useDeals();
  const { data: salesData } = useSales();
  const { data: schedulesData } = useSchedules();
  const { data: meetingsData } = useMeetings();
  const { data: tasksData } = useTasks();
  const users = usersData?.users ?? [];
  const clients = clientsData?.clients ?? [];
  const deals = dealsData?.deals ?? [];
  const sales = salesData?.sales ?? [];
  const schedules = schedulesData?.schedules ?? [];
  const meetings = meetingsData?.meetings ?? [];
  const tasks = tasksData?.tasks ?? [];

  function handleLogout() {
    clearSession();
    void navigate({ to: '/login', replace: true });
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'Dashboard':
        return <DashboardView users={users} clients={clients} deals={deals} schedules={schedules} onSelectUser={setSelectedUser} />;
      case 'User Management':
        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">User Management</h2>
                <p className="text-xs text-muted-foreground">Manage your team members</p>
              </div>
              <button
                onClick={() => setAddUserOpen(true)}
                className="h-9 px-4 gradient-orange text-white rounded-md flex items-center gap-2 text-sm font-semibold shadow-md hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Add User
              </button>
            </div>
            <UserManagementView users={users} onSelectUser={setSelectedUser} />
          </div>
        );
      case 'Leads':
        return (
          <div>
            <h2 className="text-lg font-bold mb-4">Leads Pipeline</h2>
            <LeadsView clients={clients} users={users} />
          </div>
        );
      case 'Clients & Organizations':
        return (
          <div>
            <h2 className="text-lg font-bold mb-4">Clients & Organizations</h2>
            <ClientsView clients={clients} users={users} deals={deals} schedules={schedules} meetings={meetings} onSelectClient={setSelectedClient} />
          </div>
        );
      case 'Sales Pipeline':
        return (
          <div>
            <h2 className="text-lg font-bold mb-4">Sales Pipeline</h2>
            <DealsView deals={deals} users={users} />
          </div>
        );
      case 'Calendar':
        return null;
      case 'Tasks':
        return (
          <div>
            <h2 className="text-lg font-bold mb-4">Tasks</h2>
            <EmptyState icon={Clock} label="Tasks view" hint="Tasks assigned to your team members will appear here." />
          </div>
        );
      case 'Reports':
        return (
          <div>
            <h2 className="text-lg font-bold mb-4">Reports</h2>
            <ReportsView users={users} clients={clients} deals={deals} sales={sales} schedules={schedules} meetings={meetings} tasks={tasks} />
          </div>
        );
      default:
        return <DashboardView users={users} clients={clients} deals={deals} schedules={schedules} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className={`${collapsed ? 'w-20' : 'w-72'} hidden shrink-0 border-r border-sidebar-border bg-sidebar/95 transition-all lg:flex lg:flex-col`}>
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
            {user?.tenantId ? (
              <img
                src={user?.tenantLogo || `/uploads/tenants/default.png`}
                alt="Logo"
                className="h-10 w-10 rounded-xl object-cover shadow-lg"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-lg gradient-orange text-white shadow-lg">
                <Building2 className="h-5 w-5" />
              </div>
            )}
            {!collapsed && (
              <div>
                <div className="font-bold leading-none">{user?.tenantName || 'Tenant Admin'}</div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-orange-400">Company Control</div>
              </div>
            )}
<div onClick={() => setCollapsed(!collapsed)} className="ml-auto grid h-8 w-8 place-items-center rounded-md hover:bg-accent cursor-pointer" role="button" tabIndex={0}>
               <Menu className="h-4 w-4" />
             </div>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 py-3">
            {navSections.map((section) => (
              <div key={section.title} className="mb-3 border-b border-orange-500/20 pb-2 last:border-b-0">
                {!collapsed && <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-400">{section.title}</div>}
                {section.items.map((item) => {
const Icon = item.icon;
                    const active = activeSection === item.label;
                    return (
                      <div
                        key={item.label}
                        onClick={() => setActiveSection(item.label)}
                        className={`mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition cursor-pointer ${
                          active
                            ? 'gradient-orange text-white shadow-md shadow-orange-900/30 font-medium'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent'
                        }`}
                        role="button"
                        tabIndex={0}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      </div>
                    );
                })}
              </div>
            ))}
          </nav>
          <div className="p-3 border-t border-sidebar-border flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-700 grid place-items-center text-white text-xs font-semibold">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user?.name || 'Admin'}</div>
                <div className="text-xs text-muted-foreground">{user?.tenantName || 'Admin'}</div>
              </div>
            )}
            <button onClick={handleLogout} className="grid h-8 w-8 place-items-center rounded-md border border-sidebar-border hover:bg-sidebar-accent" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-3 border-b border-border bg-background/85 px-4 py-2 backdrop-blur xl:flex-nowrap">
            <div className="min-w-0">
              <div className="text-xl font-bold">{activeSection}</div>
              <div className="text-xs text-muted-foreground">
                {user?.tenantName ? `${user.tenantName} · Company administrator` : 'Workspace · Company administrator'}
              </div>
            </div>
            <div className="relative min-w-64 flex-1 xl:max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input className="h-10 w-full rounded-md border border-border bg-card pl-10 pr-16 text-sm outline-none" placeholder="Search users, leads, deals, clients..." />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">Ctrl + K</kbd>
            </div>
            <ThemeToggle />
            {activeSection === 'User Management' && (
              <button
                onClick={() => setAddUserOpen(true)}
                className="flex h-9 items-center gap-2 rounded-md gradient-orange px-3 text-sm font-semibold text-white shadow-md shadow-orange-900/30 hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Add User
              </button>
            )}
          </header>
          <main className="flex-1 overflow-auto p-4">
            {renderSection()}
          </main>
        </div>
      </div>
      <AddUserModal open={addUserOpen} onClose={() => setAddUserOpen(false)} />
      <UserDetailModal user={selectedUser} clients={clients} deals={deals} open={!!selectedUser} onClose={() => setSelectedUser(null)} />
      <Dialog open={globalShowMeetingForm} onOpenChange={setGlobalShowMeetingForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule Meeting</DialogTitle></DialogHeader>
          <GlobalMeetingForm onClose={() => setGlobalShowMeetingForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}