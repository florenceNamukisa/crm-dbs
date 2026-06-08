import { useState, useMemo, useRef } from "react";
import { Building2, UserCheck, UserPlus, Search, Plus, Upload, Download, LayoutGrid, List, Loader2 } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/auth";
import { useClients } from "@/lib/api/clients";
import { KpiCard, PageHeader, SectionCard, StatusPill, RowActions, action } from "./parts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

const industryColors = ["#ff6a00", "#ff8c00", "#ffb347", "#a855f7", "#6366f1", "#22c55e"];

function KanbanColumn({ status, clients, children }: { status: string; clients: any[]; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={`w-72 shrink-0 bg-card/40 border border-border rounded-lg p-3 transition-colors ${isOver ? "border-orange-500 border-2" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full gradient-orange" />
          <h4 className="text-sm font-semibold">{status}</h4>
          <span className="text-[10px] text-muted-foreground">({clients.length})</span>
        </div>
      </div>
      <SortableContext items={clients.map((c: any) => c._id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[100px]">
          {children}
          {clients.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-6 border border-dashed border-border rounded-md">
              Drop items here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function ClientsDashboard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useClients();
  const clients: any[] = data?.clients ?? [];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({
    name: "", email: "", phone: "", company: "", industry: "", status: "active", notes: "",
  });

  const createClientMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/clients", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); toast.success("Client created"); setShowForm(false); resetForm(); },
    onError: (err: any) => toast.error("Failed to create client", { description: err.message }),
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiFetch(`/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); toast.success("Client updated"); },
    onError: (err: any) => toast.error("Update failed", { description: err.message }),
  });

  function resetForm() {
    setForm({ name: "", email: "", phone: "", company: "", industry: "", status: "active", notes: "" });
  }

  const activeCount = clients.filter((c) => c.status === "active").length;
  const inactiveCount = clients.filter((c) => c.status === "inactive" || c.status === "prospect").length;

  const industryMap: Record<string, number> = {};
  clients.forEach((c) => { const k = c.industry || "Others"; industryMap[k] = (industryMap[k] || 0) + 1; });
  const industries = Object.entries(industryMap).map(([name, v], i) => ({ name, v, color: industryColors[i % industryColors.length] }));

  const filteredClients = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter((c: any) =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.company || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  }, [clients, search]);

  const groupedByStatus = useMemo(() => {
    const g: Record<string, any[]> = { Active: [], Inactive: [] };
    filteredClients.forEach((c: any) => {
      const st = c.status === "active" ? "Active" : "Inactive";
      if (!g[st]) g[st] = [];
      g[st].push(c);
    });
    return g;
  }, [filteredClients]);

  // Map card id -> column name for fast lookup
  const cardToColumn = useMemo(() => {
    const m: Record<string, "Active" | "Inactive"> = {};
    for (const [col, rows] of Object.entries(groupedByStatus)) {
      for (const c of rows) {
        m[c._id] = col as "Active" | "Inactive";
      }
    }
    return m;
  }, [groupedByStatus]);

  function handleStatusChange(clientId: string, newStatus: string) {
    updateClientMutation.mutate({ id: clientId, data: { status: newStatus } });
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const targetId = over.id;
    let newStatus: string | null = null;

    if (targetId === "Active") newStatus = "active";
    else if (targetId === "Inactive") newStatus = "inactive";
    else newStatus = cardToColumn[targetId] === "Active" ? "active" : "inactive";

    handleStatusChange(active.id, newStatus);
  }

  function handleAction(actionType: string, client: any) {
    switch (actionType) {
      case "change_status":
        handleStatusChange(client._id, client.status === "active" ? "inactive" : "active");
        break;
      case "call":
        if (client.phone) window.open(`tel:${client.phone}`);
        else toast.error("No phone number");
        break;
      case "email":
        if (client.email) window.open(`mailto:${client.email}`);
        else toast.error("No email address");
        break;
      case "whatsapp":
        if (client.phone) window.open(`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}`);
        else toast.error("No phone number");
        break;
      case "notes":
        toast.success("Notes feature opened");
        break;
      case "task":
        toast.success("Task creation opened");
        break;
      case "event":
        toast.success("Event scheduling opened");
        break;
      case "forward":
        toast.success("Forward to agent opened");
        break;
      default:
        action(actionType);
    }
  }

  function handleCreateClient() {
    if (!form.name || !form.email) {
      toast.error("Name and email are required");
      return;
    }
    createClientMutation.mutate(form);
  }

  function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet) as any[];
      let count = 0;
      json.forEach((row: any) => {
        if (row.Name || row.name || row.Email || row.email) {
          createClientMutation.mutate({
            name: row.Name || row.name || "",
            email: row.Email || row.email || "",
            phone: row.Phone || row.phone || "",
            company: row.Company || row.company || "",
            industry: row.Industry || row.industry || "",
            status: "active",
          });
          count++;
        }
      });
      toast.success(`Importing ${count} clients...`);
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleExport(format: "csv" | "xlsx" | "pdf") {
    const data = filteredClients.map((c: any) => ({
      Name: c.name || "",
      Company: c.company || "",
      Email: c.email || "",
      Phone: c.phone || "",
      Industry: c.industry || "",
      Status: c.status || "active",
    }));

    if (format === "csv") {
      const ws = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `clients_export_${new Date().toISOString().split("T")[0]}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } else if (format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clients");
      XLSX.writeFile(wb, `clients_export_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Excel exported");
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Clients Report", 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
      (doc as any).autoTable({
        startY: 35,
        head: [Object.keys(data[0] || {})],
        body: data.map((r) => Object.values(r)),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [255, 140, 0] },
      });
      doc.save(`clients_export_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF exported");
    }
  }

  function SortableClientCard({ client }: { client: any }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: client._id,
    });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}
        className="glass-card rounded-md p-3 cursor-grab active:cursor-grabbing hover:border-orange-500/40 transition">
        <div className="text-sm font-medium">{client.name || client.company || "—"}</div>
        <div className="text-xs text-muted-foreground mt-1">{client.company || "—"}</div>
        <div className="text-xs text-muted-foreground">{client.email || "—"}</div>
        <div className="mt-2 flex items-center justify-between">
          <StatusPill value={client.status === "active" ? "Active" : "Inactive"} />
          <span className="text-[10px] text-muted-foreground">{client.industry || "—"}</span>
        </div>
      </div>
    );
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Clients" subtitle="Manage your client accounts, industries, and revenue." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Building2} label="Total Clients" value={String(clients.length)} trend={12.4} />
        <KpiCard icon={UserCheck} label="Active Clients" value={String(activeCount)} trend={14.2} />
        <KpiCard icon={UserPlus} label="Inactive Clients" value={String(inactiveCount)} trend={-2.1} up={false} />
        <KpiCard icon={Building2} label="New (This Month)" value={String(clients.filter((c: any) => { const d = new Date(c.createdAt); const now = new Date(); return d.getMonth() === now.getMonth(); }).length)} trend={10.5} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <SectionCard title="Clients by Industry" className="col-span-12 lg:col-span-6">
          <div className="flex items-center gap-4">
            <div className="relative h-[220px] w-[220px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={industries.length ? industries : [{ name: "None", v: 1, color: "#334155" }]} dataKey="v" innerRadius={70} outerRadius={100} paddingAngle={2}>
                    {(industries.length ? industries : [{ name: "None", v: 1, color: "#334155" }]).map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center"><div className="text-2xl font-bold">{clients.length}</div></div>
              </div>
            </div>
            <ul className="flex-1 space-y-1.5 text-xs">
              {industries.map((s) => (<li key={s.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /><span className="flex-1">{s.name}</span><span className="text-muted-foreground">{s.v}</span>
              </li>))}
              {industries.length === 0 && <li className="text-muted-foreground">No clients yet</li>}
            </ul>
          </div>
        </SectionCard>

        <SectionCard title="Top Clients" className="col-span-12 lg:col-span-6">
          <ul className="space-y-3">
            {clients.slice(0, 5).map((c: any, i) => (
              <li key={c._id} className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-md gradient-orange grid place-items-center text-xs font-bold text-white">{i + 1}</span>
                <span className="flex-1 text-sm">{c.name || c.company}</span>
                <span className="text-xs text-muted-foreground">{c.company || "—"}</span>
              </li>
            ))}
            {clients.length === 0 && <li className="text-sm text-muted-foreground py-4 text-center">No clients yet</li>}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title={`Clients ${view === "list" ? "List" : "Board"}`}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, company, email..."
              className="w-full h-9 pl-9 pr-3 rounded-md bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <button onClick={() => setView("list")}
              className={"px-2.5 py-1.5 text-xs flex items-center gap-1 " + (view === "list" ? "gradient-orange text-white" : "hover:bg-accent")}>
              <List className="h-3.5 w-3.5" /> List
            </button>
            <button onClick={() => setView("kanban")}
              className={"px-2.5 py-1.5 text-xs flex items-center gap-1 " + (view === "kanban" ? "gradient-orange text-white" : "hover:bg-accent")}>
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".csv,.xlsx,.xls" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-accent">
              <Upload className="h-3.5 w-3.5" /> Import
            </button>
            <div className="relative group">
              <button className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-md hover:bg-accent">
                <Download className="h-3.5 w-3.5" /> Export
              </button>
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 hidden group-hover:block min-w-[130px]">
                <button onClick={() => handleExport("csv")} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent">CSV</button>
                <button onClick={() => handleExport("xlsx")} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent">Excel</button>
                <button onClick={() => handleExport("pdf")} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent">PDF</button>
              </div>
            </div>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs gradient-orange text-white rounded-md font-medium shadow">
              <Plus className="h-3.5 w-3.5" /> New Client
            </button>
          </div>
        </div>

        {view === "list" && (
          <div className="overflow-auto">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading clients...
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">No clients found</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left">
                    <th className="font-normal pb-2 pr-3">Name</th>
                    <th className="font-normal pb-2 pr-3">Company</th>
                    <th className="font-normal pb-2 pr-3">Email</th>
                    <th className="font-normal pb-2 pr-3">Phone</th>
                    <th className="font-normal pb-2 pr-3">Industry</th>
                    <th className="font-normal pb-2 pr-3">Status</th>
                    <th className="font-normal pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((c: any) => (
                    <tr key={c._id} className="border-t border-border/50 hover:bg-accent/30">
                      <td className="py-2.5 pr-3 font-medium">{c.name || c.company || "—"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{c.company || "—"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground text-xs">{c.email || "—"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground text-xs">{c.phone || c.telephone || "—"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground text-xs">{c.industry || "—"}</td>
                      <td className="py-2.5 pr-3">
                        <StatusPill value={c.status === "active" ? "Active" : "Inactive"} />
                      </td>
                      <td className="py-2.5">
                        <RowActions onAction={(a) => handleAction(a, c)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="text-xs text-muted-foreground mt-3">Showing {filteredClients.length} of {clients.length} clients</div>
          </div>
        )}

        {view === "kanban" && (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {["Active", "Inactive"].map((status) => (
                <KanbanColumn key={status} status={status} clients={groupedByStatus[status] || []}>
                  {(groupedByStatus[status] || []).map((client: any) => (
                    <SortableClientCard key={client._id} client={client} />
                  ))}
                </KanbanColumn>
              ))}
            </div>
          </DndContext>
        )}
      </SectionCard>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gradient-orange">Create New Client</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Client name" />
            </div>
            <div>
              <Label className="text-xs">Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" />
            </div>
            <div>
              <Label className="text-xs">Company</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company" />
            </div>
            <div>
              <Label className="text-xs">Industry</Label>
              <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Industry" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-9 rounded-md border border-border bg-card px-2 text-sm outline-none">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">Cancel</button>
            <button onClick={handleCreateClient} disabled={createClientMutation.isPending}
              className="px-4 py-1.5 text-sm gradient-orange text-white rounded-md font-medium shadow disabled:opacity-60">
              {createClientMutation.isPending ? "Creating..." : "Create Client"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}