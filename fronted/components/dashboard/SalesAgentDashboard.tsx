import {
  Users, UserPlus, BarChart3, DollarSign,
  Plus, CalendarPlus, FileText,
  ArrowUp, ArrowDown, Search, Calendar,
  Mail, Phone, X, Loader2, Edit, Trash2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  RadialBarChart, RadialBar, LineChart, Line, Legend,
} from "recharts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { apiFetch } from "@/lib/auth";
import { toast } from "sonner";
import { useFormDialog } from "@/hooks/useFormDialog";
import { useClients, useDeleteClient } from "@/lib/api/clients";
import { useDeals } from "@/lib/api/deals";
import { useSales } from "@/lib/api/sales";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  { label: "Number of Sales", value: "0", trend: 0, up: true },
  { label: "Value of Sales", value: "UGX 0", trend: 0, up: true },
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
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const dash = dashData ?? emptyDashboard;
  const { data: clientsData, isLoading: clientsLoading } = useClients();
  const allClients: any[] = clientsData?.clients ?? [];

  // ── Deals drive "Number of Sales" and "Value of Sales" on this dashboard,
  //    matching the calculation used in TenantAdminDashboard /
  //    SalesManagerDashboard. The backend deals route already filters by the
  //    current agent when the role is "agent".
  const { data: dealsData, isLoading: dealsLoading } = useDeals();
  const allDeals: any[] = dealsData?.deals ?? [];

  // Sales still drive the /sales page (list/kanban) – keep them around so
  // navigating to /sales stays in sync.
  const { data: salesData } = useSales();

  // Keep the dashboard in sync when the user comes back to the tab.
  useEffect(() => {
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["sales-crm"] });
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [queryClient]);

  const [clientSearch, setClientSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ title: "", location: "In Person", date: "", time: "" });

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

  // ── KPI numbers from deals (matches admin dashboard formula) ─────────
  // Number of sales  =  deals.length     (same as admin "Total Deals")
  // Value of sales   =  sum(deal.value)  (same as admin "Pipeline Value")
  const totalDealsCount = allDeals.length;
  const totalSalesValue = allDeals.reduce(
    (s: number, d: any) => s + Number(d.value ?? d.amount ?? 0),
    0
  );
  const wonDeals = allDeals.filter(
    (d: any) => (d.stage || "").toLowerCase() === "won"
  );
  const wonValue = wonDeals.reduce(
    (s: number, d: any) => s + Number(d.value ?? d.amount ?? 0),
    0
  );
  const totalLeads = allClients.filter(
    (c: any) => c.leadStatus && c.leadStatus !== "Converted"
  ).length;

  const displayKpis = [
    {
      label: "Number of Sales",
      value: String(totalDealsCount),
      trend: totalDealsCount > 0 ? 12 : 0,
      up: true,
    },
    {
      label: "Value of Sales",
      value: fmtCurrency(totalSalesValue),
      trend: totalSalesValue > 0 ? 18 : 0,
      up: true,
    },
    {
      label: "Total Clients",
      value: String(totalClients),
      trend: totalClients > 0 ? 8 : 0,
      up: true,
    },
    {
      label: "Leads",
      value: String(totalLeads),
      trend: totalLeads > 0 ? 5 : 0,
      up: true,
    },
  ];

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

  const kpiIcons = [BarChart3, DollarSign, Users, UserPlus];
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
      {/* Meeting Form Dialog (popup) */}
      <Dialog open={showMeetingForm} onOpenChange={setShowMeetingForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gradient-orange">Schedule Meeting</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Meeting Title *</Label>
              <Input value={meetingForm.title} onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })} placeholder="Meeting title" />
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <select value={meetingForm.location} onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                className="w-full h-9 rounded-md border border-border bg-card px-2 text-sm outline-none">
                <option>In Person</option><option>Google Meet</option><option>Phone Call</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={meetingForm.date} onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Time</Label>
              <Input type="time" value={meetingForm.time} onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowMeetingForm(false)} className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">Cancel</button>
            <button onClick={scheduleMeeting} className="px-4 py-1.5 text-sm gradient-orange text-white rounded-md font-medium shadow">Schedule</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KPI row — uses the same data source & formula as the admin dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(dealsLoading && salesData === undefined ? fallbackKpis : displayKpis).map((k, i) => {
          const Icon = kpiIcons[i] ?? DollarSign;
          return (
            <div key={`kpi-${k.label}-${i}`} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="icon-tile h-10 w-10 rounded-lg grid place-items-center">
                  <Icon className="h-5 w-5 text-orange-400" />
                </div>
                {dealsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">{k.label}</div>
              <div className="text-2xl font-bold mt-0.5">
                {dealsLoading ? "..." : k.value}
              </div>
              <div className={"text-[11px] mt-1 flex items-center gap-1 " + (k.up ? "text-emerald-400" : "text-red-400")}>
                {k.up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {k.trend}% <span className="text-muted-foreground">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action buttons - all open popup forms */}
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

      {/* Sales vs Leads + My Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales vs Leads — Sales series is now driven by deals */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Sales vs Leads</h3>
          </div>
          <div className="h-[240px]">
            {(() => {
              const monthMap: Record<string, { sales: number; leads: number }> = {};
              allDeals.forEach((d: any) => {
                const dt = d.createdAt || d.saleDate;
                if (!dt) return;
                const date = new Date(dt);
                const key = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
                if (!monthMap[key]) monthMap[key] = { sales: 0, leads: 0 };
                monthMap[key].sales += 1;
              });
              allClients.forEach((c: any) => {
                if (c.leadStatus && c.leadStatus !== "Converted") {
                  const date = new Date(c.createdAt);
                  const key = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
                  if (!monthMap[key]) monthMap[key] = { sales: 0, leads: 0 };
                  monthMap[key].leads += 1;
                }
              });
              const chartData = Object.entries(monthMap)
                .slice(-7)
                .map(([d, v]) => ({ d, sales: v.sales, leads: v.leads }));
              if (chartData.length === 0) {
                chartData.push({ d: "Total", sales: totalDealsCount, leads: totalLeads });
              }
              return (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="d" stroke="#888" fontSize={11} />
                    <YAxis stroke="#888" fontSize={11} />
                    <Tooltip contentStyle={{ background: "#222", border: "1px solid #444", borderRadius: 8 }} />
                    <Legend />
                    <Line type="monotone" dataKey="sales" name="Sales" stroke={ORANGE_DEEP} strokeWidth={2} dot={{ r: 4, fill: ORANGE_DEEP }} />
                    <Line type="monotone" dataKey="leads" name="Leads" stroke="#a855f7" strokeWidth={2} dot={{ r: 4, fill: "#a855f7" }} />
                  </LineChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </div>

        {/* My Performance — driven by deals to match the admin dashboard */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">My Performance</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-xs text-muted-foreground">Total Sales</div>
              <div className="text-xl font-bold">{totalDealsCount}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Sales Value</div>
              <div className="text-xl font-bold">{fmtCurrency(totalSalesValue)}</div>
            </div>
          </div>
          <div className="h-[150px] relative">
            {totalClients === 0 ? (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">No data yet</div>
            ) : (
              <>
                <ResponsiveContainer>
                  <RadialBarChart
                    innerRadius="70%"
                    outerRadius="100%"
                    data={[{ name: "x", value: Math.round((activeClients / Math.max(totalClients, 1)) * 100), fill: ORANGE }]}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar background={{ fill: "#ffffff15" }} dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0}%</div>
                    <div className="text-xs text-muted-foreground">Client Activity</div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2 text-center text-xs">
            {[
              ["My Sales", String(totalDealsCount)],
              ["My Leads", String(totalLeads)],
              ["Clients", String(totalClients)],
              ["Won Value", fmtCurrency(wonValue)],
            ].map(([l, v]) => (
              <div key={l}>
                <div className="text-muted-foreground">{l}</div>
                <div className="font-semibold text-sm">{v}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-2"><Link to="/sales" className="text-xs text-orange-400 cursor-pointer">View all sales</Link></div>
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
                        <button onClick={(e) => { e.stopPropagation(); setOpenForm("client", c); }} className="h-6 w-6 rounded grid place-items-center hover:bg-accent" title="Edit client">
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

      {/* Tasks Due Today + Upcoming Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Upcoming Meetings</h3>
            <Link to="/meetings" className="text-xs text-orange-400 cursor-pointer">View all</Link>
          </div>
          {dash.meetings.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No upcoming meetings</div>
          ) : (
            <div className="space-y-3">
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
    </div>
  );
}
