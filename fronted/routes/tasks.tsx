import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { CheckSquare, Plus, Search, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, getStoredUser } from "@/lib/auth";
import { useClients } from "@/lib/api/clients";

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const user = getStoredUser();
  const queryClient = useQueryClient();
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => apiFetch<{ tasks: any[] }>("/tasks"),
    staleTime: 30_000,
  });
  const { data: clientsData } = useClients();
  const clients = clientsData?.clients ?? [];
  const allTasks = tasksData?.tasks ?? [];

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    clientId: "",
    title: "",
    subject: "Call",
    description: "",
    dueDate: "",
    priority: "Medium",
    status: "in_progress",
    assignedTo: user?.role === "sales_agent" ? "" : "",
    contactPerson: "",
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/tasks", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created");
      setShowForm(false);
      setForm({ clientId: "", title: "", subject: "Call", description: "", dueDate: "", priority: "Medium", status: "in_progress", assignedTo: "", contactPerson: "" });
    },
    onError: (err: any) => toast.error("Failed to create task", { description: err.message }),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) =>
      apiFetch(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => apiFetch(`/tasks/${taskId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
  });

  const filtered = useMemo(() => {
    return allTasks.filter((t: any) => {
      const matchesSearch = !search || (t.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.clientName || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allTasks, search, statusFilter]);

  function handleSubmit() {
    if (!form.title) { toast.error("Title is required"); return; }
    createTaskMutation.mutate({
      clientId: form.clientId || undefined,
      title: form.title,
      subject: form.subject,
      description: form.description,
      dueDate: form.dueDate || undefined,
      priority: form.priority,
      status: form.status,
      assignedTo: form.assignedTo || user?.role === "sales_agent" ? undefined : undefined,
      contactPerson: form.contactPerson,
    });
  }

  function toggleComplete(task: any) {
    updateTaskMutation.mutate({
      taskId: task._id,
      data: { completed: !task.completed, status: task.completed ? "in_progress" : "completed" },
    });
  }

  function priorityColor(p: string) {
    if (p === "Critical") return "bg-red-500/15 text-red-400 border-red-500/30";
    if (p === "Low") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  }

  function statusColor(s: string) {
    if (s === "completed") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    if (s === "in_progress") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    if (s === "waiting") return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    if (s === "deferred") return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
    return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tasks</h1>
            <p className="text-sm text-muted-foreground">Track due dates, priorities, and assignments</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="h-10 px-4 gradient-orange text-white rounded-lg flex items-center gap-2 font-medium shadow-lg hover:opacity-90"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Close" : "New Task"}
          </button>
        </div>

        {showForm && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold text-lg">Create Task</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client</label>
                <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">Select client</option>
                  {clients.map((c: any) => <option key={c._id} value={c._id}>{c.name} {c.company && `- ${c.company}`}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Task title" className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm outline-none">
                  <option>Call</option><option>Support</option><option>Follow-up</option><option>Meeting</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm outline-none">
                  <option>Low</option><option>Medium</option><option>Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm outline-none">
                  <option value="in_progress">In Progress</option><option value="completed">Completed</option>
                  <option value="waiting">Waiting on Someone</option><option value="deferred">Deferred</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact Person</label>
                <input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  placeholder="Contact person" className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Task details..." rows={3}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="h-10 px-4 rounded-lg border border-border text-sm hover:bg-accent">Cancel</button>
              <button onClick={handleSubmit} disabled={createTaskMutation.isPending}
                className="h-10 px-4 gradient-orange text-white rounded-lg text-sm font-medium shadow-lg hover:opacity-90 disabled:opacity-60">
                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none">
            <option value="all">All Status</option><option value="in_progress">In Progress</option>
            <option value="completed">Completed</option><option value="waiting">Waiting</option>
            <option value="deferred">Deferred</option><option value="pending">Pending</option>
          </select>
        </div>

        <div className="glass-card rounded-xl p-4">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading tasks...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-content-center gap-2 py-10 text-center text-muted-foreground">
              <CheckSquare className="h-10 w-10 opacity-50" />
              <div className="text-sm font-medium">No tasks found</div>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((t: any) => (
                <div key={t._id} className={`flex items-center gap-3 p-3 rounded-lg border transition hover:bg-accent/30 ${t.completed ? "opacity-60" : ""}`}>
                  <input type="checkbox" checked={t.completed} onChange={() => toggleComplete(t)}
                    className="rounded accent-orange-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${t.completed ? "line-through" : ""}`}>{t.title || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.clientName || "—"} {t.contactPerson && `· ${t.contactPerson}`}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded border shrink-0 ${priorityColor(t.priority || "Medium")}`}>{t.priority || "Medium"}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded border shrink-0 ${statusColor(t.status || "pending")}`}>{t.status || "pending"}</span>
                  {t.dueDate && (
                    <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                      <Clock className="h-3 w-3" />{new Date(t.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  <button onClick={() => deleteTaskMutation.mutate(t._id)}
                    className="h-7 w-7 rounded grid place-items-center hover:bg-accent text-red-400 shrink-0">✕</button>
                </div>
              ))}
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-3">Showing {filtered.length} of {allTasks.length} tasks</div>
        </div>
      </div>
    </AppShell>
  );
}