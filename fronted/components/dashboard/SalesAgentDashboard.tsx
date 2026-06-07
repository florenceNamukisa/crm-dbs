import {
  Users, UserPlus, BarChart3, DollarSign, Repeat,
  Plus, CalendarPlus, FileText,
  ArrowUp, ArrowDown, Search, Calendar,
  Mail, Phone, X, Loader2, Edit, Trash2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  RadialBarChart, RadialBar,
} from "recharts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { apiFetch } from "@/lib/auth";
import { toast } from "sonner";
import { useFormDialog } from "@/hooks/useFormDialog";
import { useClients, useDeleteClient } from "@/lib/api/clients";

const ORANGE = "#ff8c00";
const ORANGE_DEEP = "#ff6a00";

type DashboardResponse = {
  kpis: Array<{ label: string; value: string; trend: number; up: boolean }>;
  revenue: Array<{ d: string; v: number }>;
  tasks: Array<{ t: string; time: string; p: string }>;
  meetings: Array<{ co: string; t: string; date: string; time: string }>;
  activities: Array<{ t: string; when: string }>;
};

const emptyDashboard: DashboardResponse = {
  kpis: [],
  revenue: [],
  tasks: [],
  meetings: [],
  activities: [],
};

const fallbackKpis = [
  { label: "Sales Value", value: "UGX 0", trend: 0, up: true },
  { label: "Pipeline", value: "UGX 0", trend: 0, up: true },
  { label: "Total Clients", value: "0", trend: 0, up: true },
  { label: "Leads", value: "0", trend: 0, up: true },
];

function priorityBadge(p: string) {
  const map: Record<string, string> = {
    High: "bg-red-500/15 text-red-400 border-red-500/30",
    Medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  };
  return `text-[10px] px-2 py-0.5 rounded border ${map[p]}`;
}

function fmtCurrency(v: number) {
  return `UGX ${(v || 0).toLocaleString()}`;
}

export default function SalesAgentDashboard() {
  const queryClient = useQueryClient();
  const { setOpenForm } = useFormDialog();
  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ["sales-dashboard"],
    queryFn: () => apiFetch<DashboardResponse>("/dashboards/sales"),
  });
  const dash = dashData ?? emptyDashboard;
  const { data: clientsData, isLoading: clientsLoading } = useClients();
  const allClients: any[] = clientsData?.clients ?? [];

  const [clientSearch, setClientSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);

  const filteredClients = useMemo(() => {
    return allClients.filter((c) => {
      const name = (c.name || c.company || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      const industry = (c.industry || "").toLowerCase();
      const q = clientSearch.toLowerCase();
      const matchesSearch = !q || name.includes(q) || email.includes(q) || industry.includes(q);
      const matchesFilter = clientFilter === "All" || (c.status || "active").toLowerCase() === clientFilter.toLowerCase();
      let matchesDate = true;
      if (startDate || endDate) {
        const createdDate = c.createdAt ? new Date(c.createdAt) : null;
        if (createdDate) {
          if (startDate && createdDate < new Date(startDate)) matchesDate = false;
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (createdDate > end) matchesDate = false;
          }
        }
      }
      return matchesSearch && matchesFilter && matchesDate;
    });
  }, [allClients, clientSearch, clientFilter, startDate, endDate]);

  const clearDateFilter = () => {
    setStartDate("");
    setEndDate("");
    setShowDateFilter(false);
  };

  const totalClients = allClients.length;
  const activeClients = allClients.filter((c) => (c.status || "active") === "active").length;

  // Build kpis from API + local for total clients
  const displayKpis = dash.kpis.length > 0
    ? [
        ...dash.kpis.slice(0, 3),
        { label: "Total Clients", value: String(totalClients), trend: totalClients > 0 ? 8 : 0, up: true },
      ]
    : [
        ...fallbackKpis.slice(0, 3).map((k) => ({ ...k, value: "0" })),
        { label: "Total Clients", value: String(totalClients), trend: totalClients > 0 ? 8 : 0, up: true },
      ];

  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ title: "", location: "In Person", date: "", time: "" });

  async function scheduleMeeting() {
    if (!meetingForm.title || !meetingForm.date) {
      toast.error("Title and date are required");
      return;
    }
    try {
      let scheduledTime = null;
      if (meetingForm.date && meetingForm.time) {
        scheduledTime = new Date(`${meetingForm.date}T${meetingForm.time}`).toISOString();
      } else if (meetingForm.date) {
        scheduledTime = new Date(meetingForm.date).toISOString();
      }
      await apiFetch("/meetings", {
        method: "POST",
        body: JSON.stringify({
          title: meetingForm.title,
          location: meetingForm.location,
          scheduledTime,
        }),
      });
      toast.success("Meeting scheduled successfully");
      setShowMeetingForm(false);
      setMeetingForm({ title: "", location: "In Person", date: "", time: "" });
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard"] });
    } catch (err: any) {
      toast.error("Failed to schedule meeting", { description: err.message });
    }
  }

  const kpiIcons = [DollarSign, BarChart3, Users, UserPlus];
  const deleteClient = useDeleteClient();

  async function handleDeleteClient(id: string) {
    if (!confirm("Are you sure you want to delete this client?")) return;
    try {
      await deleteClient.mutateAsync(id);
      toast.success("Client deleted");
    } catch (err: any) {
      toast.error("Failed to delete client", { description: err.message });
    }
  }

  return (
    <div className="space-y-4">
      {/* Meeting Form Modal */}
      {showMeetingForm && (
        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Schedule Meeting</h3>
            <button onClick={() => setShowMeetingForm(false)} className="h-7 w-7 rounded grid place-items-center hover:bg-accent">✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={meetingForm.title} onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
              placeholder="Meeting title" className="h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40" />
            <select value={meetingForm.location} onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
              className="h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none">
              <option>In Person</option><option>Google Meet</option><option>Phone Call</option>
            </select>
            <input type="date" value={meetingForm.date} onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
              className="h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40" />
            <input type="time" value={meetingForm.time} onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })}
              className="h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowMeetingForm(false)} className="h-9 px-4 rounded-lg border border-border text-sm hover:bg-accent">Cancel</button>
            <button onClick={scheduleMeeting} className="h-9 px-4 gradient-orange text-white rounded-lg text-sm font-medium hover:opacity-90">Schedule</button>
          </div>
        </div>
      )}
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(dashLoading ? fallbackKpis : displayKpis).map((k, i) => {
          const Icon = kpiIcons[i] ?? DollarSign;
          return (
            <div key={`kpi-${k.label}-${i}`} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="icon-tile h-10 w-10 rounded-lg grid place-items-center">
                  <Icon className="h-5 w-5 text-orange-400" />
                </div>
                {dashLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">{k.label}</div>
              <div className="text-2xl font-bold mt-0.5">{dashLoading ? "..." : k.value}</div>
              <div className={"text-[11px] mt-1 flex items-center gap-1 " + (k.up ? "text-emerald-400" : "text-red-400")}>
                {k.up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {k.trend}% <span className="text-muted-foreground">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { i: UserPlus, l: "Add Lead", on: () => setOpenForm("lead") },
          { i: Plus, l: "Add Sale", on: () => setOpenForm("sale") },
          { i: CalendarPlus, l: "Schedule Meeting", on: () => setShowMeetingForm(true) },
          { i: FileText, l: "Create Client", on: () => setOpenForm("client") },
        ].map(({ i: I, l, on }) => (
          <button key={l} onClick={on} className="glass-card rounded-xl p-3 flex items-center justify-center gap-2 hover:bg-accent transition text-sm font-medium">
            <span className="icon-tile h-8 w-8 rounded-md grid place-items-center"><I className="h-4 w-4 text-orange-400" /></span>
            <span>{l}</span>
          </button>
        ))}
      </div>

      {/* Revenue Trend + Sales Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Revenue Trend</h3>
            <select className="bg-card border border-border rounded px-2 py-1 text-xs"><option>This Month</option></select>
          </div>
          <div className="h-[240px]">
            {dash.revenue.length === 0 ? (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">No revenue data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dash.revenue}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ORANGE} stopOpacity={0.6} />
                      <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="d" stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `UGX ${(v / 1000000).toFixed(0)}M`} />
                  <Tooltip contentStyle={{ background: "#222", border: "1px solid #444", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="v" stroke={ORANGE_DEEP} strokeWidth={2} fill="url(#grad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Sales Performance */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Sales Performance</h3>
            <select className="bg-card border border-border rounded px-2 py-1 text-xs"><option>This Month</option></select>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-xs text-muted-foreground">Total Clients</div>
              <div className="text-xl font-bold">{totalClients}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Active Clients</div>
              <div className="text-xl font-bold">{activeClients}</div>
            </div>
          </div>
          <div className="h-[150px] relative">
            {totalClients === 0 ? (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">No clients yet</div>
            ) : (
              <>
                <ResponsiveContainer>
                  <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: "x", value: Math.round((activeClients / Math.max(totalClients, 1)) * 100), fill: ORANGE }]} startAngle={90} endAngle={-270}>
                    <RadialBar background={{ fill: "#ffffff15" }} dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0}%</div>
                    <div className="text-xs text-muted-foreground">Active Rate</div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2 text-center text-xs">
            {[
              ["Total Clients", String(totalClients), "+0%"],
              ["Active Clients", String(activeClients), "+0%"],
              ["Leads", String(allClients.filter((c) => c.leadStatus && c.leadStatus !== "Converted").length), "+0%"],
              ["Pipeline", fmtCurrency(allClients.reduce((s: number, c: any) => s + (c.pipelineValue || 0), 0)), "+0%"],
            ].map(([l, v]) => (
              <div key={l}>
                <div className="text-muted-foreground">{l}</div>
                <div className="font-semibold text-sm">{v}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-2"><Link to="/clients" className="text-xs text-orange-400 cursor-pointer">View all clients</Link></div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Clients</h3>
          <Link to="/clients" className="text-xs text-orange-400 cursor-pointer">View all</Link>
        </div>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Search clients..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none"
          >
            <option value="All">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="h-9 px-3 rounded-lg bg-background border border-border text-sm flex items-center gap-2 hover:bg-accent"
          >
            <Calendar className="h-4 w-4" />
            <span>{startDate || endDate ? "Date Range" : "Custom Range"}</span>
          </button>
          {(startDate || endDate) && (
            <button onClick={clearDateFilter} className="h-9 px-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-1 hover:bg-red-500/20">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>

        {showDateFilter && (
          <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-lg bg-background/50 border border-border">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">From:</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 px-2 rounded-md bg-background border border-border text-xs outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">To:</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 px-2 rounded-md bg-background border border-border text-xs outline-none" />
            </div>
            <button onClick={() => setShowDateFilter(false)} className="h-8 px-3 rounded-md gradient-orange text-white text-xs font-medium">Apply</button>
          </div>
        )}

        <div className="overflow-auto">
          {clientsLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading clients...</div>
          ) : (
            <table className="w-full text-sm">
<thead className="text-xs text-muted-foreground">
                 <tr className="text-left">
                   <th className="font-normal pb-2 pr-3">Name</th>
                   <th className="font-normal pb-2 pr-3">Industry</th>
                   <th className="font-normal pb-2 pr-3">Email</th>
                   <th className="font-normal pb-2 pr-3">Phone</th>
                   <th className="font-normal pb-2 pr-3">Created</th>
                   <th className="font-normal pb-2 pr-3">Status</th>
                   <th className="font-normal pb-2 pr-3">Actions</th>
                 </tr>
               </thead>
<tbody>
                 {filteredClients.length === 0 && (
                   <tr><td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">No clients found</td></tr>
                 )}
                 {filteredClients.slice(0, 8).map((c: any) => (
                   <tr key={c._id} className="border-t border-border/50 hover:bg-accent/30">
                     <td className="py-2.5 pr-3 font-medium">{c.name || c.company || "—"}</td>
                     <td className="py-2.5 pr-3 text-muted-foreground">{c.industry || "—"}</td>
                     <td className="py-2.5 pr-3 text-muted-foreground">
                       <span className="flex items-center gap-1"><Mail className="h-3 w-3 shrink-0" />{c.email || "—"}</span>
                     </td>
                     <td className="py-2.5 pr-3 text-muted-foreground">
                       <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" />{c.phone || c.telephone || "—"}</span>
                     </td>
                     <td className="py-2.5 pr-3 text-muted-foreground text-xs">
                       {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                     </td>
                     <td className="py-2.5 pr-3">
                       <span className={`text-[10px] px-2 py-0.5 rounded border ${(c.status || "active") === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"}`}>
                         {(c.status || "Active").charAt(0).toUpperCase() + (c.status || "Active").slice(1)}
                       </span>
                     </td>
                     <td className="py-2.5 pr-3">
                       <div className="flex gap-1">
                         <button onClick={(e) => { e.stopPropagation(); setOpenForm("client"); }} className="h-6 w-6 rounded grid place-items-center hover:bg-accent" title="Edit client">
                           <Edit className="h-3.5 w-3.5 text-orange-400" />
                         </button>
                         <button onClick={(e) => { e.stopPropagation(); handleDeleteClient(c._id); }} className="h-6 w-6 rounded grid place-items-center hover:bg-accent" title="Delete client">
                           <Trash2 className="h-3.5 w-3.5 text-red-400" />
                         </button>
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
            </table>
          )}
        </div>
        <div className="flex items-center justify-between text-xs mt-3">
          <span className="text-muted-foreground">Showing {Math.min(filteredClients.length, 8)} of {filteredClients.length} clients</span>
          <Link to="/clients" className="text-orange-400 cursor-pointer">View all clients</Link>
        </div>
      </div>

      {/* Activity Feed + Tasks Due Today */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Activity Feed</h3>
            <Link to="/activities" className="text-xs text-orange-400 cursor-pointer">View all</Link>
          </div>
          {dash.activities.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No recent activity</div>
          ) : (
            <ul className="space-y-3">
              {dash.activities.map((a, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="icon-tile h-8 w-8 rounded-md grid place-items-center mt-0.5">
                    <Repeat className="h-4 w-4 text-orange-400" />
                  </span>
                  <div className="flex-1">
                    <div className="text-sm">{a.t}</div>
                    <div className="text-xs text-muted-foreground">{a.when}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Tasks Due Today</h3>
            <Link to="/tasks" className="text-xs text-orange-400 cursor-pointer">View all</Link>
          </div>
          {dash.tasks.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No tasks for today</div>
          ) : (
            dash.tasks.map((t: any) => (
              <div key={t.t} className="flex items-center gap-2 text-sm py-2 border-b border-border/30 last:border-0">
                <input type="checkbox" className="rounded accent-orange-500" />
                <span className="flex-1 truncate">{t.t}</span>
                <span className="text-xs text-muted-foreground">{t.time}</span>
                <span className={priorityBadge(t.p)}>{t.p}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upcoming Meetings */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Upcoming Meetings</h3>
          <Link to="/meetings" className="text-xs text-orange-400 cursor-pointer">View all</Link>
        </div>
        {dash.meetings.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No upcoming meetings</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {dash.meetings.map((m: any) => (
              <div key={m.co} className="flex items-start gap-3 border border-border/50 rounded-lg p-3">
                <span className="icon-tile h-9 w-9 rounded-md grid place-items-center shrink-0"><CalendarPlus className="h-4 w-4 text-orange-400" /></span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.co}</div>
                  <div className="text-xs text-muted-foreground">{m.t}</div>
                  <div className="text-xs text-muted-foreground mt-1">{m.date} · {m.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}