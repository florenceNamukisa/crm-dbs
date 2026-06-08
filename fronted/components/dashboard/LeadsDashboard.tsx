import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, UserCheck, TrendingUp, Search, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { KpiCard, PageHeader, SectionCard, RowActions, StatusPill } from "./parts";
import { useClients } from "@/lib/api/clients";
import { useUsers } from "@/lib/api/users";
import { apiFetch } from "@/lib/auth";
import { KanbanBoard } from "./KanbanBoard";

const sourceColors = ["#ff6a00", "#ff8c00", "#ffb347", "#a855f7", "#22c55e"];

export default function LeadsDashboard() {
  const qc = useQueryClient();
  const { data } = useClients();
  const clients: any[] = data?.clients ?? [];
  const leads = clients.filter((c) => c.leadStatus && c.leadStatus !== "Converted");

  const converted = clients.filter((c) => c.leadStatus === "Converted").length;
  const convRate = leads.length + converted > 0 ? (((converted) / (leads.length + converted)) * 100).toFixed(1) : "0.0";

  const sourceMap: Record<string, number> = {};
  leads.forEach((c) => { const k = c.source || "Others"; sourceMap[k] = (sourceMap[k] || 0) + 1; });
  const sources = Object.entries(sourceMap).map(([name, v], i) => ({
    name, v, color: sourceColors[i % sourceColors.length],
  }));

  const weekMap: Record<string, number> = {};
  leads.forEach((c) => {
    const d = new Date(c.createdAt);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    weekMap[key] = (weekMap[key] || 0) + 1;
  });
  const series = Object.entries(weekMap).slice(-7).map(([d, v]) => ({ d, v }));

  const [search, setSearch] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [view, setView] = useState<"list" | "kanban">("list");

  // Modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);

  // Form states
  const [emailBody, setEmailBody] = useState("");
  const [notes, setNotes] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventType, setEventType] = useState("meeting");
  const [forwardAgent, setForwardAgent] = useState("");

  const { data: usersData } = useUsers();
  const agents = (usersData?.users || []).filter((u: any) => u.role === "agent");

  const LEAD_STAGES = ["New", "Contacted", "Qualified", "Converted"];

  const handleLeadAction = async (actionType: string, lead: any) => {
    switch (actionType) {
      case "change_status": {
        const currentIdx = LEAD_STAGES.indexOf(lead.status || "New");
        const nextStatus = LEAD_STAGES[(currentIdx + 1) % LEAD_STAGES.length];
        try {
          await apiFetch(`/clients/${lead._id}`, {
            method: "PUT",
            body: JSON.stringify({ leadStatus: nextStatus }),
          });
          toast.success(`Status changed to "${nextStatus}"`);
          qc.invalidateQueries({ queryKey: ["clients"] });
        } catch (err: any) { toast.error(err.message || "Failed to change status"); }
        break;
      }
      case "call":
        toast.info("Call feature coming soon!");
        break;
      case "email":
        setSelectedLead(lead);
        setEmailBody("");
        setShowEmailModal(true);
        break;
      case "whatsapp":
        const phone = lead.phone ? lead.phone.replace(/[^0-9]/g, "") : "";
        if (phone) window.open(`https://wa.me/${phone.startsWith("0") ? phone : "0" + phone}`);
        else toast.error("No phone number");
        break;
      case "notes":
        setSelectedLead(lead);
        setNotes("");
        setShowNotesModal(true);
        break;
      case "task":
        setSelectedLead(lead);
        setTaskTitle("");
        setTaskDueDate("");
        setShowTaskModal(true);
        break;
      case "event":
        setSelectedLead(lead);
        setEventTitle("");
        setEventDate("");
        setEventTime("");
        setEventType("meeting");
        setShowEventModal(true);
        break;
      case "forward":
        setSelectedLead(lead);
        setForwardAgent("");
        setShowForwardModal(true);
        break;
      default:
        toast.success(actionType);
    }
  };

  const handleEmailSubmit = async () => {
    if (!selectedLead?.email || !emailBody.trim()) { toast.error("Please enter a message"); return; }
    try {
      await apiFetch("/notifications/send-email", {
        method: "POST",
        body: JSON.stringify({ to: selectedLead.email, subject: `Message from CRM regarding ${selectedLead.name}`, body: emailBody }),
      });
      toast.success("Email sent successfully!");
      setShowEmailModal(false);
    } catch (err: any) { toast.error(err.message || "Failed to send email"); }
  };

  const handleNotesSubmit = async () => {
    if (!notes.trim()) { toast.error("Please enter notes"); return; }
    try {
      await apiFetch(`/clients/${selectedLead._id}/notes`, {
        method: "POST",
        body: JSON.stringify({ notes }),
      });
      toast.success("Notes saved successfully!");
      setShowNotesModal(false);
    } catch (err: any) { toast.error(err.message || "Failed to save notes"); }
  };

  const handleTaskSubmit = async () => {
    if (!taskTitle.trim()) { toast.error("Please enter a task title"); return; }
    try {
      await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({ clientId: selectedLead._id, title: taskTitle, subject: "Other", dueDate: taskDueDate || undefined, priority: "Medium", status: "pending" }),
      });
      toast.success("Task created successfully!");
      setShowTaskModal(false);
    } catch (err: any) { toast.error(err.message || "Failed to create task"); }
  };

  const handleEventSubmit = async () => {
    if (!eventTitle.trim() || !eventDate) { toast.error("Please enter event title and date"); return; }
    try {
      await apiFetch("/meetings", {
        method: "POST",
        body: JSON.stringify({ client: selectedLead._id, title: eventTitle, type: eventType, scheduledDate: eventDate, scheduledTime: eventTime, status: "scheduled" }),
      });
      toast.success("Event created successfully!");
      setShowEventModal(false);
    } catch (err: any) { toast.error(err.message || "Failed to create event"); }
  };

  const handleForwardSubmit = async () => {
    if (!forwardAgent) { toast.error("Please select an agent"); return; }
    try {
      await apiFetch(`/clients/${selectedLead._id}/forward`, {
        method: "POST",
        body: JSON.stringify({ agentId: forwardAgent }),
      });
      toast.success("Lead forwarded successfully!");
      setShowForwardModal(false);
    } catch (err: any) { toast.error(err.message || "Failed to forward lead"); }
  };

  const rows = useMemo(() => {
    const filtered = search.trim() ? leads.filter((c) => {
      const q = search.toLowerCase();
      return (c.name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
    }) : leads;
    return filtered.map((c) => ({
      name: c.name,
      co: c.company || c.companyName || "—",
      email: c.email,
      phone: c.phone,
      src: c.source || "—",
      status: c.leadStatus || "New",
      rating: c.rating || "Cold",
      assigned: c.agent?.name || "—",
      created: new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      _id: c._id,
    }));
  }, [leads, search]);

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx,.xls,.json";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        let imported: any[] = [];
        if (file.name.endsWith(".json")) {
          imported = JSON.parse(text);
        } else {
          const lines = text.split("\n").filter((l: string) => l.trim());
          const headers = lines[0].split(",").map((h: string) => h.trim().replace(/"/g, ""));
          lines.slice(1).forEach((line: string) => {
            const vals = line.split(",").map((v: string) => v.trim().replace(/"/g, ""));
            const row: Record<string, string> = {};
            headers.forEach((h: string, i: number) => (row[h] = vals[i] || ""));
            imported.push(row);
          });
        }
        toast.success(`Imported ${imported.length} leads`);
      } catch (err: any) {
        setImportError(err.message);
        toast.error("Import failed", { description: err.message });
        setTimeout(() => setImportError(null), 4000);
      }
    };
    input.click();
  };

  const handleExport = (format: "csv" | "xlsx" | "pdf") => {
    if (rows.length === 0) {
      toast.error("No leads to export");
      return;
    }
    if (format === "csv") {
      const headers = "Name,Company,Email,Phone,Source,Status,Rating,Assigned,Created";
      const csvRows = rows.map((r) => `"${r.name}","${r.co}","${r.email}","${r.phone}","${r.src}","${r.status}","${r.rating}","${r.assigned}","${r.created}"`);
      const csv = [headers, ...csvRows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } else if (format === "xlsx") {
      const XLSX = (window as any).XLSX;
      if (!XLSX) {
        toast.error("Excel export requires xlsx library");
        return;
      }
      const sheet = XLSX.utils.json_to_sheet(rows.map((r) => ({
        Name: r.name, Company: r.co, Email: r.email, Phone: r.phone,
        Source: r.src, Status: r.status, Rating: r.rating, Assigned: r.assigned, Created: r.created,
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, "Leads");
      XLSX.writeFile(wb, `leads_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else if (format === "pdf") {
      const win = window.open("", "_blank");
      if (!win) { toast.error("Popup blocked"); return; }
      win.document.write(`
        <html>
          <head>
            <title>Leads Export</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; color: #222; }
              h2 { color: #ff6a00; margin-bottom: 4px; }
              p { color: #666; margin-top: 0; font-size: 12px; }
              table { border-collapse: collapse; width: 100%; margin-top: 14px; }
              th { background: #ff8c00; color: #fff; padding: 8px 10px; font-size: 12px; text-align: left; }
              td { border: 1px solid #e5e7eb; padding: 7px 10px; font-size: 12px; }
              tr:nth-child(even) { background: #f9fafb; }
            </style>
          </head>
          <body>
            <h2>Leads Report</h2>
            <p>Generated: ${new Date().toLocaleString()} &middot; Total: ${rows.length}</p>
            <table>
              <thead>
                <tr><th>Name</th><th>Company</th><th>Email</th><th>Phone</th><th>Source</th><th>Status</th><th>Rating</th><th>Assigned</th><th>Created</th></tr>
              </thead>
              <tbody>
                ${rows.map((r) => `<tr><td>${r.name}</td><td>${r.co}</td><td>${r.email}</td><td>${r.phone}</td><td>${r.src}</td><td>${r.status}</td><td>${r.rating}</td><td>${r.assigned}</td><td>${r.created}</td></tr>`).join("")}
              </tbody>
            </table>
          </body>
        </html>
      `);
      win.document.close();
      setTimeout(() => win.print(), 300);
    }
    toast.success(`Exported as ${format.toUpperCase()}`);
  };


  return (
    <div className="space-y-4">
      <PageHeader title="Leads" subtitle="Manage your sales leads, track sources, and conversion." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Users} label="Total Leads" value={String(leads.length)} trend={15.3} />
        <KpiCard icon={UserPlus} label="New Leads" value={String(leads.filter((c) => c.leadStatus === "New").length)} trend={12.5} />
        <KpiCard icon={UserCheck} label="Converted" value={String(converted)} trend={8.4} />
        <KpiCard icon={TrendingUp} label="Conversion Rate" value={`${convRate}%`} trend={2.3} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <SectionCard title="Leads Over Time" className="col-span-12 lg:col-span-8">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series.length ? series : [{ d: "—", v: 0 }]}>
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
              <ResponsiveContainer><PieChart><Pie data={sources.length ? sources : [{ name: "None", v: 1, color: "#334155" }]} dataKey="v" innerRadius={60} outerRadius={90} paddingAngle={2}>
                {(sources.length ? sources : [{ name: "None", v: 1, color: "#334155" }]).map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie></PieChart></ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center"><div className="text-2xl font-bold">{leads.length}</div><div className="text-xs text-muted-foreground">Total</div></div>
              </div>
            </div>
            <ul className="flex-1 space-y-1.5 text-xs">
              {sources.map((s) => (<li key={s.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /><span className="flex-1">{s.name}</span><span className="text-muted-foreground">{s.v}</span>
              </li>))}
              {sources.length === 0 && <li className="text-muted-foreground">No leads yet</li>}
            </ul>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Leads" right={
        <div className="flex items-center gap-2">
          <button onClick={handleImport} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-accent"><Upload className="h-3.5 w-3.5" /> Import</button>
          <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-accent"><Download className="h-3.5 w-3.5" /> Export</button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[140px] py-1">
                  <button onClick={() => { handleExport("csv"); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-accent">Export as CSV</button>
                  <button onClick={() => { handleExport("xlsx"); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-accent">Export as Excel</button>
                  <button onClick={() => { handleExport("pdf"); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-accent">Export as PDF</button>
                </div>
              </>
            )}
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["list", "kanban"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium transition ${view === v ? "gradient-orange text-white" : "hover:bg-accent"}`}
              >
                {v === "list" ? "List" : "Kanban"}
              </button>
            ))}
          </div>
        </div>
      }>
        {view === "list" ? (
          <div className="space-y-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email or company..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left">
                    <th className="font-normal pb-2 pr-3">Name</th>
                    <th className="font-normal pb-2 pr-3">Company</th>
                    <th className="font-normal pb-2 pr-3">Email</th>
                    <th className="font-normal pb-2 pr-3">Phone</th>
                    <th className="font-normal pb-2 pr-3">Source</th>
                    <th className="font-normal pb-2 pr-3">Status</th>
                    <th className="font-normal pb-2 pr-3">Rating</th>
                    <th className="font-normal pb-2 pr-3">Agent</th>
                    <th className="font-normal pb-2 pr-3 w-10">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (<tr><td colSpan={9} className="py-8 text-center text-muted-foreground text-sm">No leads found</td></tr>)}
                  {rows.map((r: any, idx: number) => (
                    <tr key={idx} className="border-t border-border/50 hover:bg-accent/30">
                      <td className="py-2.5 pr-3 font-medium">{r.name || "—"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{r.co || "—"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{r.email || "—"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{r.phone || "—"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{r.src || "—"}</td>
                      <td className="py-2.5 pr-3"><StatusPill value={String(r.status || "New")} /></td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{r.rating || "—"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{r.assigned || "—"}</td>
                      <td className="py-2.5 pr-3"><RowActions onAction={(a) => handleLeadAction(a, r)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <KanbanBoard rows={leads.map((c: any) => ({
            _id: c._id,
            name: c.name,
            leadStatus: c.leadStatus || 'New',
            company: c.company,
            email: c.email,
            stage: c.leadStatus || 'New',
            status: c.leadStatus || 'New',
          }))} type="leads" statusKey="leadStatus" />
        )}
      </SectionCard>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowEmailModal(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Send Email to {selectedLead?.name}</h3>
            <p className="text-xs text-muted-foreground mb-4">To: {selectedLead?.email}</p>
            <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="Type your message here..." className="w-full h-32 rounded-lg bg-background border border-border text-sm p-3 outline-none focus:ring-2 focus:ring-primary/40 mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowEmailModal(false)} className="flex-1 px-4 py-2 text-sm border border-border rounded-md hover:bg-accent">Cancel</button>
              <button onClick={handleEmailSubmit} className="flex-1 px-4 py-2 text-sm gradient-orange text-white rounded-md font-medium">Send</button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowNotesModal(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Notes for {selectedLead?.name}</h3>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes about this lead..." className="w-full h-32 rounded-lg bg-background border border-border text-sm p-3 outline-none focus:ring-2 focus:ring-primary/40 mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowNotesModal(false)} className="flex-1 px-4 py-2 text-sm border border-border rounded-md hover:bg-accent">Cancel</button>
              <button onClick={handleNotesSubmit} className="flex-1 px-4 py-2 text-sm gradient-orange text-white rounded-md font-medium">Save Notes</button>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowTaskModal(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Create Task for {selectedLead?.name}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Task Title *</label>
                <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Enter task title" className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="text-xs font-medium">Due Date</label>
                <input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowTaskModal(false)} className="flex-1 px-4 py-2 text-sm border border-border rounded-md hover:bg-accent">Cancel</button>
              <button onClick={handleTaskSubmit} className="flex-1 px-4 py-2 text-sm gradient-orange text-white rounded-md font-medium">Create Task</button>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowEventModal(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Schedule Event for {selectedLead?.name}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Event Title *</label>
                <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Enter event title" className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="text-xs font-medium">Event Type</label>
                <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="meeting">Meeting</option>
                  <option value="call">Call</option>
                  <option value="follow-up">Follow-up</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Date *</label>
                <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="text-xs font-medium">Time</label>
                <input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowEventModal(false)} className="flex-1 px-4 py-2 text-sm border border-border rounded-md hover:bg-accent">Cancel</button>
              <button onClick={handleEventSubmit} className="flex-1 px-4 py-2 text-sm gradient-orange text-white rounded-md font-medium">Create Event</button>
            </div>
          </div>
        </div>
      )}

      {/* Forward Modal */}
      {showForwardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForwardModal(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Forward Lead to Agent</h3>
            <p className="text-sm text-muted-foreground mb-4">Select an agent to forward <strong>{selectedLead?.name}</strong> to:</p>
            <select value={forwardAgent} onChange={(e) => setForwardAgent(e.target.value)} className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40 mb-4">
              <option value="">-- Select Agent --</option>
              {agents.map((a: any) => (<option key={a._id || a.id} value={a._id || a.id}>{a.name} ({a.email})</option>))}
            </select>
            {agents.length === 0 && <p className="text-xs text-muted-foreground mb-4">No agents available.</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowForwardModal(false)} className="flex-1 px-4 py-2 text-sm border border-border rounded-md hover:bg-accent">Cancel</button>
              <button onClick={handleForwardSubmit} className="flex-1 px-4 py-2 text-sm gradient-orange text-white rounded-md font-medium" disabled={agents.length === 0}>Forward</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
