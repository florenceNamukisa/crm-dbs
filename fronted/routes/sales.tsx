import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  DollarSign, TrendingUp, Search, Plus, Loader2,
  Upload, Download, LayoutGrid, List
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/auth";
import { useClients } from "@/lib/api/clients";
import { useUsers } from "@/lib/api/users";
import { useSales, useUpdateSale } from "@/lib/api/sales";
import { useDeals, useUpdateDeal } from "@/lib/api/deals";
import { KpiCard, PageHeader, StatusPill, RowActions, action } from "@/components/dashboard/parts";
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

export const Route = createFileRoute("/sales")({
  component: SalesPage,
});

function fmtUGX(v: number) {
  return `UGX ${(v || 0).toLocaleString()}`;
}

const STAGES = ["Contacted", "Proposal", "Negotiations", "Closed (Won)", "Lost"];

function getProbability(stage: string) {
  if (stage === "Lost") return 0;
  if (stage === "Contacted") return 10;
  if (stage === "Proposal") return 40;
  if (stage === "Negotiations") return 70;
  if (stage === "Closed (Won)") return 100;
  return 0;
}

function KanbanColumn({ stage, sales, children }: { stage: string; sales: any[]; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div ref={setNodeRef} className={`w-72 shrink-0 glass-card rounded-xl p-3 transition-colors ${isOver ? "border-orange-500 border-2" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full gradient-orange" />
          <h4 className="text-sm font-semibold">{stage}</h4>
          <span className="text-[10px] text-muted-foreground">({sales.length})</span>
        </div>
      </div>
      <SortableContext items={sales.map((s: any) => s._id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[100px]">
          {children}
          {sales.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-6 border border-dashed border-border rounded-md">
              Drop items here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SalesPage() {
  const queryClient = useQueryClient();
  const { data: clientsData } = useClients();
  const clients = clientsData?.clients ?? [];
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use the standardized hook so the cache is shared with the dashboard
  // and any other component. The hook already configures staleTime: 0
  // + refetchOnWindowFocus so updates land instantly.
  const { data: salesData, isLoading: salesLoading } = useSales();
  const allSales = salesData?.sales ?? [];

  // Also fetch deals - this is the primary source since CreateSaleForm creates deals
  // which are what the dashboard displays as "Number of Sales"
  const { data: dealsData, isLoading: dealsLoadingState } = useDeals();
  const allDeals = dealsData?.deals ?? [];

  // Use deals as primary source if sales is empty (they share the same agent filter)
  // Once deals are loaded, prefer them since CreateSaleForm creates deals
  const displaySales = allSales.length > 0 ? allSales : allDeals.map((d: any) => ({
    _id: d._id,
    clientName: d.client?.name || d.clientName,
    amount: d.value || d.amount,
    stage: d.stage === "won" ? "Closed (Won)" : d.stage === "lost" ? "Lost" : d.stage === "proposal" ? "Proposal" : d.stage === "negotiation" ? "Negotiations" : "Contacted",
    type: d.dealType === "existing" ? "Existing" : "New",
    probability: d.probability || 0,
    createdAt: d.createdAt,
    client: d.client,
  }));

  const isLoading = salesLoading || dealsLoadingState;

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [showForm, setShowForm] = useState(false);

  // Action modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  // Action form states
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
  const [form, setForm] = useState({
    clientId: "",
    clientName: "",
    amount: "",
    stage: "Contacted" as string,
    type: "New",
    notes: "",
  });

  const createSaleMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/deals", { method: "POST", body: JSON.stringify({ ...data, value: data.amount }) }),
    onSuccess: () => {
      // Invalidate EVERY sales-related key so the dashboard,
      // kanban, and any other mounted component refreshes.
      queryClient.invalidateQueries({ queryKey: ["sales-crm"] });
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Sale created");
      setShowForm(false);
      resetForm();
    },
    onError: (err: any) => toast.error("Failed to create sale", { description: err.message }),
  });

  const updateDealMutation = useUpdateDeal();

  function resetForm() {
    setForm({ clientId: "", clientName: "", amount: "", stage: "Contacted", type: "New", notes: "" });
  }

  function handleCreateSale() {
    if (!form.clientId && !form.clientName) { toast.error("Client is required"); return; }
    if (!form.amount) { toast.error("Amount is required"); return; }
    const client = clients.find((c: any) => c._id === form.clientId);
    // Map sales stages to deal stages
    const dealStageMap: Record<string, string> = {
      "Contacted": "lead",
      "Proposal": "proposal",
      "Negotiations": "negotiation",
      "Closed (Won)": "won",
      "Lost": "lost",
    };
    createSaleMutation.mutate({
      title: `Sale - ${form.clientName || client?.name || "Client"}`,
      value: parseFloat(form.amount),
      client: form.clientId || undefined,
      stage: dealStageMap[form.stage] || "lead",
      dealType: form.type === "Existing" ? "existing" : "new",
    });
  }

  const filteredSales = useMemo(() => {
    return displaySales.filter((s: any) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (s.clientName || s.client?.name || "").toLowerCase().includes(q) ||
        (s.amount?.toString() || "").includes(q) ||
        (s.stage || "").toLowerCase().includes(q);
    });
  }, [displaySales, search]);

  const groupedByStage = useMemo(() => {
    const g: Record<string, any[]> = {};
    STAGES.forEach((st) => (g[st] = []));
    filteredSales.forEach((s: any) => {
      const stage = s.stage || "Contacted";
      if (!g[stage]) g[stage] = [];
      g[stage].push(s);
    });
    return g;
  }, [filteredSales]);

  const totalSales = displaySales.length;
  const totalAmount = displaySales.reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
const activeCount = displaySales.filter((s: any) => s.stage !== "Lost" && s.stage !== "Closed (Won)").length;

  function handleStageChange(saleId: string, newStage: string) {
    // Map sales stages to deal stages
    const dealStageMap: Record<string, string> = {
      "Contacted": "lead",
      "Proposal": "proposal",
      "Negotiations": "negotiation",
      "Closed (Won)": "won",
      "Lost": "lost",
    };
    const dealStage = dealStageMap[newStage] || "lead";
    updateDealMutation.mutate({ id: saleId, data: { stage: dealStage } });
  }

  function handleAction(actionType: string, sale: any) {
    switch (actionType) {
      case "change_status": {
        const stages = STAGES;
        const next = stages[(stages.indexOf(sale.stage) + 1) % stages.length];
        handleStageChange(sale._id, next);
        break;
      }
      case "call":
        toast.info("Call feature coming soon!");
        break;
      case "email":
        setSelectedSale(sale);
        setEmailBody("");
        setShowEmailModal(true);
        break;
      case "whatsapp": {
        const phone = sale.client?.phone || sale.customerPhone;
        if (phone) window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`);
        else toast.error("No phone number");
        break;
      }
      case "notes":
        setSelectedSale(sale);
        setNotes("");
        setShowNotesModal(true);
        break;
      case "task":
        setSelectedSale(sale);
        setTaskTitle("");
        setTaskDueDate("");
        setShowTaskModal(true);
        break;
      case "event": {
        setSelectedSale(sale);
        setEventTitle("");
        setEventDate("");
        setEventTime("");
        setEventType("meeting");
        setShowEventModal(true);
        break;
      }
      case "forward":
        setSelectedSale(sale);
        setForwardAgent("");
        setShowForwardModal(true);
        break;
      default: action(actionType);
    }
  }

  const handleEmailSubmit = async () => {
    if (!selectedSale || !emailBody.trim()) { toast.error("Please enter a message"); return; }
    const email = selectedSale.client?.email || selectedSale.customerEmail;
    const name = selectedSale.clientName || selectedSale.client?.name || "Customer";
    if (!email) { toast.error("No email address"); return; }
    try {
      await apiFetch("/notifications/send-email", {
        method: "POST",
        body: JSON.stringify({ to: email, subject: `Message from CRM regarding ${name}`, body: emailBody }),
      });
      toast.success("Email sent successfully!");
      setShowEmailModal(false);
    } catch (err: any) { toast.error(err.message || "Failed to send email"); }
  };

  const handleNotesSubmit = async () => {
    if (!selectedSale || !notes.trim()) { toast.error("Please enter notes"); return; }
    const clientId = selectedSale.client?._id || selectedSale.client;
    if (!clientId) { toast.error("No client associated"); return; }
    try {
      await apiFetch(`/clients/${clientId}/notes`, {
        method: "POST",
        body: JSON.stringify({ notes }),
      });
      toast.success("Notes saved successfully!");
      setShowNotesModal(false);
    } catch (err: any) { toast.error(err.message || "Failed to save notes"); }
  };

  const handleTaskSubmit = async () => {
    if (!selectedSale || !taskTitle.trim()) { toast.error("Please enter a task title"); return; }
    const clientId = selectedSale.client?._id || selectedSale.client;
    try {
      await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({ clientId, title: taskTitle, subject: "Other", dueDate: taskDueDate || undefined, priority: "Medium", status: "pending" }),
      });
      toast.success("Task created successfully!");
      setShowTaskModal(false);
    } catch (err: any) { toast.error(err.message || "Failed to create task"); }
  };

  const handleEventSubmit = async () => {
    if (!selectedSale || !eventTitle.trim() || !eventDate) { toast.error("Please enter event title and date"); return; }
    const clientId = selectedSale.client?._id || selectedSale.client;
    try {
      await apiFetch("/meetings", {
        method: "POST",
        body: JSON.stringify({ client: clientId, title: eventTitle, type: eventType, scheduledDate: eventDate, scheduledTime: eventTime, status: "scheduled" }),
      });
      toast.success("Event created successfully!");
      setShowEventModal(false);
    } catch (err: any) { toast.error(err.message || "Failed to create event"); }
  };

  const handleForwardSubmit = async () => {
    if (!selectedSale || !forwardAgent) { toast.error("Please select an agent"); return; }
    const clientId = selectedSale.client?._id || selectedSale.client;
    if (!clientId) { toast.error("No client associated"); return; }
    try {
      await apiFetch(`/clients/${clientId}/forward`, {
        method: "POST",
        body: JSON.stringify({ agentId: forwardAgent }),
      });
      toast.success("Sale forwarded successfully!");
      setShowForwardModal(false);
    } catch (err: any) { toast.error(err.message || "Failed to forward sale"); }
  };

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
        if (row.ClientName || row.clientName || row.name) {
          createSaleMutation.mutate({
            clientName: row.ClientName || row.clientName || row.name,
            amount: parseFloat(row.Amount || row.amount || 0),
            stage: row.Stage || row.stage || "Contacted",
            type: row.Type || row.type || "New",
            probability: getProbability(row.Stage || row.stage || "Contacted"),
          });
          count++;
        }
      });
      toast.success(`Importing ${count} sales...`);
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleExport(format: "csv" | "xlsx" | "pdf") {
    const data = filteredSales.map((s: any) => ({
      "Client Name": s.clientName || s.client?.name || "",
      "Amount (UGX)": s.amount || 0,
      Stage: s.stage || "",
      Type: s.type || "",
      Probability: `${getProbability(s.stage || "")}%`,
    }));
    if (format === "csv") {
      const ws = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `sales_export_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      toast.success("CSV exported");
    } else if (format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sales");
      XLSX.writeFile(wb, `sales_export_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Excel exported");
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Sales Report", 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
      (doc as any).autoTable({
        startY: 35,
        head: [Object.keys(data[0] || {})],
        body: data.map((r) => Object.values(r)),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [255, 140, 0] },
      });
      doc.save(`sales_export_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF exported");
    }
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const draggedId = active.id;
    const targetId = over.id;

    let targetStage = null;
    if (STAGES.includes(targetId)) {
      targetStage = targetId;
    } else {
      for (const [stage, sales] of Object.entries(groupedByStage)) {
        if (sales.some((s: any) => s._id === targetId)) {
          targetStage = stage;
          break;
        }
      }
    }

    if (targetStage && targetStage !== active.id) {
      handleStageChange(draggedId, targetStage);
    }
  }

  function SortableSaleCard({ sale }: { sale: any }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sale._id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}
        className="glass-card rounded-md p-3 cursor-grab active:cursor-grabbing hover:border-orange-500/40 transition">
        <div className="text-sm font-medium">{sale.clientName || sale.client?.name || "—"}</div>
        <div className="text-xs text-muted-foreground mt-1">{fmtUGX(sale.amount || 0)}</div>
        <div className="text-[10px] text-muted-foreground mt-1">Probability: {sale.probability ?? getProbability(sale.stage || "")}%</div>
        <div className="mt-2 flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">{sale.type || "New"}</span>
          <StatusPill value={sale.stage || "Contacted"} />
        </div>
      </div>
    );
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Sales" subtitle="Track and manage your sales pipeline" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={DollarSign} label="Total Sales" value={String(totalSales)} trend={5} />
          <KpiCard icon={TrendingUp} label="Total Value" value={fmtUGX(totalAmount)} trend={8} />
          <KpiCard icon={TrendingUp} label="Active Sales" value={String(activeCount)} trend={3} />
          <KpiCard icon={DollarSign} label="Avg Value" value={totalSales > 0 ? fmtUGX(totalAmount / totalSales) : "UGX 0"} trend={2} />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-56 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div className="flex items-center border border-border rounded-md overflow-hidden">
              <button onClick={() => setView("list")} className={"px-2.5 py-1.5 text-xs flex items-center gap-1 " + (view === "list" ? "gradient-orange text-white" : "hover:bg-accent")}><List className="h-3.5 w-3.5" /> <span className="hidden sm:inline">List</span></button>
              <button onClick={() => setView("kanban")} className={"px-2.5 py-1.5 text-xs flex items-center gap-1 " + (view === "kanban" ? "gradient-orange text-white" : "hover:bg-accept")}><LayoutGrid className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Kanban</span></button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".csv,.xlsx,.xls" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 text-xs border border-border rounded-md hover:bg-accent"><Upload className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Import</span></button>
            <div className="relative">
              <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 text-xs border border-border rounded-md hover:bg-accent"><Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export</span></button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[130px] py-1">
                    <button onClick={() => { setShowExportMenu(false); handleExport("csv"); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent">CSV</button>
                    <button onClick={() => { setShowExportMenu(false); handleExport("xlsx"); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent">Excel</button>
                    <button onClick={() => { setShowExportMenu(false); handleExport("pdf"); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent">PDF</button>
                  </div>
                </>
              )}
            </div>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 text-xs gradient-orange text-white rounded-md font-medium shadow-lg"><Plus className="h-3.5 w-3.5" /> New Sale</button>
          </div>
        </div>

        {view === "list" && (
          <div className="glass-card rounded-xl p-4">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading sales...</div>
            ) : filteredSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground"><DollarSign className="h-10 w-10 opacity-50" /><div className="text-sm font-medium">No sales found</div></div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="text-left">
                      <th className="font-normal pb-2 pr-3">Client</th><th className="font-normal pb-2 pr-3">Amount (UGX)</th><th className="font-normal pb-2 pr-3">Stage</th><th className="font-normal pb-2 pr-3">Type</th><th className="font-normal pb-2 pr-3">Probability</th><th className="font-normal pb-2 pr-3">Date</th><th className="font-normal pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((s: any) => (
                      <tr key={s._id} className="border-t border-border/50 hover:bg-accent/30">
                        <td className="py-2.5 pr-3 font-medium">{s.clientName || s.client?.name || "—"}</td>
                        <td className="py-2.5 pr-3">{fmtUGX(s.amount || 0)}</td>
                        <td className="py-2.5 pr-3">
                          <select value={s.stage || "Contacted"} onChange={(e) => handleStageChange(s._id, e.target.value)} className="text-[10px] px-1 py-0.5 rounded bg-background border border-border outline-none text-foreground">
                            {STAGES.map((st) => <option key={st} value={st} className="text-foreground">{st}</option>)}
                          </select>
                        </td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{s.type || "New"}</td>
                        <td className="py-2.5 pr-3"><span className={`text-[10px] px-2 py-0.5 rounded ${s.stage === "Lost" ? "bg-red-500/15 text-red-400" : s.stage === "Closed (Won)" ? "bg-emerald-500/15 text-emerald-400" : "bg-blue-500/15 text-blue-400"}`}>{s.probability ?? getProbability(s.stage || "")}%</span></td>
                        <td className="py-2.5 pr-3 text-muted-foreground text-xs">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}</td>
                        <td className="py-2.5"><RowActions onAction={(a) => handleAction(a, s)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-3">Showing {filteredSales.length} of {displaySales.length} sales</div>
          </div>
        )}

        {view === "kanban" && (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {STAGES.map((stage) => (
                <KanbanColumn key={stage} stage={stage} sales={groupedByStage[stage] || []}>
                  {(groupedByStage[stage] || []).map((sale: any) => (
                    <SortableSaleCard key={sale._id} sale={sale} />
                  ))}
                </KanbanColumn>
              ))}
            </div>
          </DndContext>
        )}

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="text-gradient-orange">Create New Sale</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs">Client *</Label>
<select value={form.clientId} onChange={(e) => {
                   const val = e.target.value;
                   if (val === "__new__") {
                     const name = prompt("Enter new client name:");
                     if (name) setForm({ ...form, clientName: name, clientId: "__custom__" });
                   } else setForm({ ...form, clientId: val, clientName: "" });
                 }} className="w-full h-9 rounded-md border border-border bg-card px-2 text-sm outline-none text-foreground">
                  <option value="" className="text-foreground">Select client</option>
                  {clients.map((c: any) => <option key={c._id} value={c._id} className="text-foreground">{c.name || c.company}</option>)}
                  <option value="__new__" className="text-foreground">+ Type new client...</option>
                </select>
              </div>
              {form.clientId === "__custom__" && (
                <div className="col-span-2"><Label className="text-xs">New Client Name</Label><Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="Enter client name" /></div>
              )}
              <div><Label className="text-xs">Amount (UGX) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" /></div>
              <div><Label className="text-xs">Stage</Label>
                <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} className="w-full h-9 rounded-md border border-border bg-card px-2 text-sm outline-none text-foreground">{STAGES.map((st) => <option key={st} value={st} className="text-foreground">{st}</option>)}</select>
              </div>
              <div><Label className="text-xs">Type</Label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full h-9 rounded-md border border-border bg-card px-2 text-sm outline-none text-foreground"><option value="New" className="text-foreground">New</option><option value="Existing" className="text-foreground">Existing</option></select>
              </div>
              <div><Label className="text-xs">Probability</Label><Input value={`${getProbability(form.stage)}%`} disabled className="bg-background/50" /></div>
              <div className="col-span-2"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." /></div>
            </div>
            <DialogFooter>
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">Cancel</button>
              <button onClick={handleCreateSale} disabled={createSaleMutation.isPending} className="px-4 py-1.5 text-sm gradient-orange text-white rounded-md font-medium shadow disabled:opacity-60">
                {createSaleMutation.isPending ? "Creating..." : "Create Sale"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowEmailModal(false)}>
            <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">Send Email to {selectedSale?.clientName || selectedSale?.client?.name || "Customer"}</h3>
              <p className="text-xs text-muted-foreground mb-4">To: {selectedSale?.client?.email || selectedSale?.customerEmail || "No email"}</p>
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
              <h3 className="text-lg font-semibold mb-4">Notes for {selectedSale?.clientName || selectedSale?.client?.name || "Sale"}</h3>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes about this sale..." className="w-full h-32 rounded-lg bg-background border border-border text-sm p-3 outline-none focus:ring-2 focus:ring-primary/40 mb-4" />
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
              <h3 className="text-lg font-semibold mb-4">Create Task for {selectedSale?.clientName || selectedSale?.client?.name || "Sale"}</h3>
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
              <h3 className="text-lg font-semibold mb-4">Schedule Event for {selectedSale?.clientName || selectedSale?.client?.name || "Sale"}</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium">Event Title *</label>
                  <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Enter event title" className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-xs font-medium">Event Type</label>
                  <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40 text-foreground">
                    <option value="meeting" className="text-foreground">Meeting</option>
                    <option value="call" className="text-foreground">Call</option>
                    <option value="follow-up" className="text-foreground">Follow-up</option>
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
              <h3 className="text-lg font-semibold mb-4">Forward Sale to Agent</h3>
              <p className="text-sm text-muted-foreground mb-4">Select an agent to forward <strong>{selectedSale?.clientName || selectedSale?.client?.name || "this sale"}</strong> to:</p>
              <select value={forwardAgent} onChange={(e) => setForwardAgent(e.target.value)} className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40 mb-4 text-foreground">
                <option value="" className="text-foreground">-- Select Agent --</option>
                {agents.map((a: any) => (<option key={a._id || a.id} value={a._id || a.id} className="text-foreground">{a.name} ({a.email})</option>))}
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
    </AppShell>
  );
}
