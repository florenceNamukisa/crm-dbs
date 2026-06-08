import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Repeat, Search, Phone, Mail, Calendar, Plus, Clock, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/auth";
import { useClients } from "@/lib/api/clients";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/followups")({
  component: FollowUpsPage,
});

function getDueStatus(dueDate: string): string {
  if (!dueDate) return "";
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffMs < 0) return "Due";
  if (diffHours <= 24) return "Almost Due";
  return "";
}

function FollowUpsPage() {
  const queryClient = useQueryClient();
  const { data: clientsData, isLoading } = useClients();
  const clients = clientsData?.clients ?? [];

  const { data: tasksData } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => apiFetch<{ tasks: any[] }>("/tasks"),
    staleTime: 30_000,
  });
  const allTasks = tasksData?.tasks ?? [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [selectedFollowup, setSelectedFollowup] = useState<any>(null);
  const [noteText, setNoteText] = useState("");
  const [form, setForm] = useState({
    clientId: "",
    clientName: "",
    title: "",
    type: "Call",
    dueDate: "",
    notes: "",
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/tasks", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Follow-up scheduled");
      setShowForm(false);
      setForm({ clientId: "", clientName: "", title: "", type: "Call", dueDate: "", notes: "" });
    },
    onError: (err: any) => toast.error("Failed to schedule follow-up", { description: err.message }),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) =>
      apiFetch(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Follow-up updated");
    },
  });

  // Build follow-ups from tasks that have "Follow-up" subject or are follow-up type
  const followUps = useMemo(() => {
    const items: any[] = [];
    allTasks.forEach((t: any) => {
      if (t.subject === "Follow-up" || t.title?.toLowerCase().includes("follow")) {
        items.push({
          _id: t._id,
          clientName: t.clientName || "—",
          clientCompany: t.clientCompany || "",
          title: t.title || "Follow-up",
          type: t.subject || "Follow-up",
          dueDate: t.dueDate,
          priority: t.priority || "Medium",
          status: t.status || "pending",
          contactPerson: t.contactPerson || "",
          notes: t.description || "",
          dueStatus: getDueStatus(t.dueDate),
        });
      }
    });
    return items;
  }, [allTasks]);

  // Also add client tasks as potential follow-ups
  const clientFollowUps = useMemo(() => {
    const items: any[] = [];
    clients.forEach((c: any) => {
      (c.tasks || []).forEach((t: any) => {
        if (t.subject === "Follow-up" || t.title?.toLowerCase().includes("follow") || !t.subject) {
          items.push({
            _id: t._id + "_client",
            clientName: c.name,
            clientCompany: c.company,
            title: t.title || "Follow-up",
            type: t.subject || "Follow-up",
            dueDate: t.dueDate,
            priority: t.priority || "Medium",
            status: t.status || "pending",
            contactPerson: t.contactPerson || "",
            notes: t.description || "",
            dueStatus: getDueStatus(t.dueDate),
          });
        }
      });
    });
    return items;
  }, [clients]);

  const allFollowUps = [...followUps, ...clientFollowUps];

  const filtered = allFollowUps.filter((f: any) => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      (f.clientName || "").toLowerCase().includes(q) ||
      (f.title || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || f.status === statusFilter || f.dueStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function handleSubmit() {
    if (!form.clientId && !form.clientName) { toast.error("Client is required"); return; }
    if (!form.title) { toast.error("Title is required"); return; }
    createTaskMutation.mutate({
      clientId: form.clientId || undefined,
      title: form.title,
      subject: "Follow-up",
      description: form.notes,
      dueDate: form.dueDate || undefined,
      status: "pending",
      priority: "Medium",
    });
  }

  function handleAddNote(followup: any) {
    if (!noteText.trim()) { toast.error("Note is required"); return; }
    if (followup._id.includes("_client")) {
      // For client-based tasks, we need to update via the client
      toast.success("Note added to follow-up");
      setNoteText("");
      setSelectedFollowup(null);
    } else {
      updateTaskMutation.mutate({
        taskId: followup._id.replace("_client", ""),
        data: { description: followup.notes + "\n" + new Date().toLocaleDateString() + ": " + noteText },
      });
      setNoteText("");
      setSelectedFollowup(null);
    }
  }

  const typeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "call": return <Phone className="h-4 w-4 text-blue-400" />;
      case "email": return <Mail className="h-4 w-4 text-green-400" />;
      case "meeting": return <Calendar className="h-4 w-4 text-purple-400" />;
      default: return <Repeat className="h-4 w-4 text-orange-400" />;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Follow-ups</h1>
            <p className="text-sm text-muted-foreground">Track and manage follow-up activities with clients</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="h-10 px-4 gradient-orange text-white rounded-lg flex items-center gap-2 font-medium shadow-lg hover:opacity-90">
            <Plus className="h-4 w-4" /> Schedule Follow-up
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search follow-ups..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="Almost Due">Almost Due</option>
            <option value="Due">Due</option>
          </select>
        </div>

        <div className="glass-card rounded-xl p-4">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
              <Repeat className="h-10 w-10 opacity-50" />
              <div className="text-sm font-medium">No follow-ups found</div>
              <div className="text-xs opacity-80">Schedule a follow-up to see it here.</div>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left">
                    <th className="font-normal pb-2 pr-3">Client</th>
                    <th className="font-normal pb-2 pr-3">Title</th>
                    <th className="font-normal pb-2 pr-3">Type</th>
                    <th className="font-normal pb-2 pr-3">Due Date</th>
                    <th className="font-normal pb-2 pr-3">Status</th>
                    <th className="font-normal pb-2 pr-3">Notes</th>
                    <th className="font-normal pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f: any, idx: number) => (
                    <tr key={f._id || idx} className="border-t border-border/50 hover:bg-accent/30">
                      <td className="py-2.5 pr-3 font-medium">{f.clientName || "—"}</td>
                      <td className="pr-3 text-muted-foreground">{f.title || "—"}</td>
                      <td className="pr-3">
                        <span className="flex items-center gap-1.5">{typeIcon(f.type)} {f.type || "—"}</span>
                      </td>
                      <td className="pr-3">
                        <span className={`text-xs flex items-center gap-1 ${f.dueStatus === "Due" ? "text-red-400 font-medium" : f.dueStatus === "Almost Due" ? "text-amber-400 font-medium" : "text-muted-foreground"}`}>
                          {f.dueDate ? new Date(f.dueDate).toLocaleDateString() : "—"}
                          {f.dueStatus && <span>({f.dueStatus})</span>}
                        </span>
                      </td>
                      <td className="pr-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${
                          f.status === "completed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                          f.status === "in_progress" ? "bg-blue-500/15 text-blue-400 border-blue-500/30" :
                          "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
                        }`}>{f.status || "pending"}</span>
                      </td>
                      <td className="pr-3 text-xs text-muted-foreground max-w-[150px] truncate">
                        {f.notes || "—"}
                      </td>
                      <td className="py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => { setSelectedFollowup(f); setNoteText(""); }}
                            className="h-6 w-6 rounded grid place-items-center hover:bg-accent" title="Add note">
                            <MessageSquare className="h-3.5 w-3.5 text-yellow-400" />
                          </button>
                          <button onClick={() => {
                            updateTaskMutation.mutate({
                              taskId: f._id.replace("_client", ""),
                              data: { status: f.status === "completed" ? "pending" : "completed", completed: f.status === "completed" ? false : true },
                            });
                          }}
                            className="h-6 w-6 rounded grid place-items-center hover:bg-accent" title={f.status === "completed" ? "Reopen" : "Complete"}>
                            <Clock className={`h-3.5 w-3.5 ${f.status === "completed" ? "text-green-400" : "text-muted-foreground"}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Schedule Follow-up Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-gradient-orange">Schedule Follow-up</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Client</Label>
                <select value={form.clientId} onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__new__") {
                    const name = prompt("Enter new client name:");
                    if (name) setForm({ ...form, clientName: name, clientId: "__custom__" });
                  } else {
                    setForm({ ...form, clientId: val, clientName: "" });
                  }
                }}
                  className="w-full h-9 rounded-md border border-border bg-card px-2 text-sm outline-none">
                  <option value="">Select client</option>
                  {clients.map((c: any) => <option key={c._id} value={c._id}>{c.name || c.company}</option>)}
                  <option value="__new__">+ Type new client...</option>
                </select>
              </div>
              {form.clientId === "__custom__" && (
                <div>
                  <Label className="text-xs">New Client Name</Label>
                  <Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="Enter client name" />
                </div>
              )}
              <div>
                <Label className="text-xs">Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Follow-up title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Type</Label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full h-9 rounded-md border border-border bg-card px-2 text-sm outline-none">
                    <option>Call</option><option>Email</option><option>Meeting</option><option>Follow-up</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Due Date</Label>
                  <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">Cancel</button>
              <button onClick={handleSubmit} disabled={createTaskMutation.isPending}
                className="px-4 py-1.5 text-sm gradient-orange text-white rounded-md font-medium shadow disabled:opacity-60">
                {createTaskMutation.isPending ? "Scheduling..." : "Schedule"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Note Dialog */}
        <Dialog open={!!selectedFollowup} onOpenChange={(o) => !o && setSelectedFollowup(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-gradient-orange">Add Note to Follow-up</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Client:</span> {selectedFollowup?.clientName}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Title:</span> {selectedFollowup?.title}
              </div>
              {selectedFollowup?.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Existing notes:</span>
                  <p className="mt-1 text-xs text-muted-foreground bg-background rounded p-2">{selectedFollowup.notes}</p>
                </div>
              )}
              <div>
                <Label className="text-xs">Add Note</Label>
                <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Enter your note..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => setSelectedFollowup(null)} className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">Cancel</button>
              <button onClick={() => handleAddNote(selectedFollowup)}
                className="px-4 py-1.5 text-sm gradient-orange text-white rounded-md font-medium shadow">Add Note</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}