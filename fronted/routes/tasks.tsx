import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { CheckSquare, Plus, Search, Clock, Loader2, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, getStoredUser } from "@/lib/auth";
import { useClients } from "@/lib/api/clients";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
});

const STATUSES = ["New Task", "In Progress", "Completed"];

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

function priorityColor(p: string) {
  if (p === "Critical") return "bg-red-500/15 text-red-400 border-red-500/30";
  if (p === "Low") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  return "bg-amber-500/15 text-amber-400 border-amber-500/30";
}

function KanbanColumn({ status, tasks, children }: { status: string; tasks: any[]; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={`w-72 shrink-0 glass-card rounded-xl p-3 transition-colors ${isOver ? "border-orange-500 border-2" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full gradient-orange" />
          <h4 className="text-sm font-semibold">{status}</h4>
          <span className="text-[10px] text-muted-foreground">({tasks.length})</span>
        </div>
      </div>
      <SortableContext items={tasks.map((t: any) => t._id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[100px]">
          {children}
          {tasks.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-6 border border-dashed border-border rounded-md">
              Drop items here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function TasksPage() {
  const user = getStoredUser();
  const queryClient = useQueryClient();
  const { data: clientsData } = useClients();
  const clients = clientsData?.clients ?? [];

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => apiFetch<{ tasks: any[] }>("/tasks"),
    staleTime: 30_000,
  });
  const allTasks = tasksData?.tasks ?? [];

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    clientId: "",
    clientName: "",
    title: "",
    subject: "Call",
    description: "",
    dueDate: "",
    priority: "Medium",
    status: "new_task",
    contactPerson: "",
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/tasks", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created");
      setShowForm(false);
      resetForm();
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

  function resetForm() {
    setForm({ clientId: "", clientName: "", title: "", subject: "Call", description: "", dueDate: "", priority: "Medium", status: "new_task", contactPerson: "" });
  }

  function handleSubmit() {
    if (!form.title) { toast.error("Title is required"); return; }
    const client = clients.find((c: any) => c._id === form.clientId);
    createTaskMutation.mutate({
      clientId: form.clientId || undefined,
      clientName: client?.name || form.clientName,
      title: form.title,
      subject: form.subject,
      description: form.description,
      dueDate: form.dueDate || undefined,
      priority: form.priority,
      status: form.status === "New Task" ? "new_task" : form.status === "In Progress" ? "in_progress" : "completed",
      contactPerson: form.contactPerson,
      assignedTo: user?._id || user?.id || undefined,
    });
  }

  const tasksWithDueStatus = useMemo(() => {
    return allTasks.map((t: any) => ({
      ...t,
      dueStatus: getDueStatus(t.dueDate),
    }));
  }, [allTasks]);

  const filtered = useMemo(() => {
    return tasksWithDueStatus.filter((t: any) => {
      const q = search.toLowerCase();
      const matchesSearch = !search ||
        (t.title || "").toLowerCase().includes(q) ||
        (t.clientName || "").toLowerCase().includes(q) ||
        (t.contactPerson || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || t.status === statusFilter || t.dueStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasksWithDueStatus, search, statusFilter]);

  const groupedByStatus = useMemo(() => {
    const g: Record<string, any[]> = {};
    STATUSES.forEach((s) => (g[s] = []));
    filtered.forEach((t: any) => {
      const st = t.status === "completed" ? "Completed" : t.status === "in_progress" ? "In Progress" : "New Task";
      if (!g[st]) g[st] = [];
      g[st].push(t);
    });
    return g;
  }, [filtered]);

  function handleStatusChange(taskId: string, newStatus: string) {
    updateTaskMutation.mutate({
      taskId,
      data: {
        status: newStatus === "Completed" ? "completed" : newStatus === "In Progress" ? "in_progress" : "new_task",
        completed: newStatus === "Completed",
      },
    });
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const taskId = active.id;
    const targetId = over.id;

    let targetStatus = null;
    if (STATUSES.includes(targetId)) {
      targetStatus = targetId;
    } else {
      for (const [status, tasks] of Object.entries(groupedByStatus)) {
        if (tasks.some((t: any) => t._id === targetId)) {
          targetStatus = status;
          break;
        }
      }
    }

    if (targetStatus) {
      handleStatusChange(taskId, targetStatus);
    }
  }

  function SortableTaskCard({ task }: { task: any }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: task._id,
    });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}
        className="glass-card rounded-md p-3 cursor-grab active:cursor-grabbing hover:border-orange-500/40 transition">
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={task.completed}
            onChange={(e) => { e.stopPropagation(); handleStatusChange(task._id, task.completed ? "New Task" : "Completed"); }}
            className="rounded accent-orange-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium ${task.completed ? "line-through opacity-60" : ""}`}>{task.title || "—"}</div>
            <div className="text-xs text-muted-foreground">{task.clientName || "—"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 text-[10px]">
          <span className={`px-1.5 py-0.5 rounded border ${priorityColor(task.priority || "Medium")}`}>{task.priority || "Medium"}</span>
          {task.dueDate && (
            <span className={`flex items-center gap-1 ${task.dueStatus === "Due" ? "text-red-400" : task.dueStatus === "Almost Due" ? "text-amber-400" : "text-muted-foreground"}`}>
              <Clock className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString()}
              {task.dueStatus && <span className="font-medium">({task.dueStatus})</span>}
            </span>
          )}
          <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (confirm("Delete task?")) deleteTaskMutation.mutate(task._id); }}
            className="ml-auto text-red-400 hover:text-red-300">✕</button>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tasks</h1>
            <p className="text-sm text-muted-foreground">Track due dates, priorities, and assignments</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="h-10 px-4 gradient-orange text-white rounded-lg flex items-center gap-2 font-medium shadow-lg hover:opacity-90">
            <Plus className="h-4 w-4" /> New Task
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none">
            <option value="all">All Status</option>
            <option value="new_task">New Task</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="Almost Due">Almost Due</option>
            <option value="Due">Due</option>
          </select>
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
        </div>

        {view === "list" && (
          <div className="glass-card rounded-xl p-4">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading tasks...</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
                <CheckSquare className="h-10 w-10 opacity-50" />
                <div className="text-sm font-medium">No tasks found</div>
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="text-left">
                      <th className="font-normal pb-2 pr-3 w-8"></th>
                      <th className="font-normal pb-2 pr-3">Title</th>
                      <th className="font-normal pb-2 pr-3">Client</th>
                      <th className="font-normal pb-2 pr-3">Type</th>
                      <th className="font-normal pb-2 pr-3">Status</th>
                      <th className="font-normal pb-2 pr-3">Priority</th>
                      <th className="font-normal pb-2 pr-3">Due Date</th>
                      <th className="font-normal pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t: any) => (
                      <tr key={t._id} className={`border-t border-border/50 hover:bg-accent/30 ${t.completed ? "opacity-60" : ""}`}>
                        <td className="py-2.5 pr-3">
                          <input type="checkbox" checked={t.completed}
                            onChange={() => handleStatusChange(t._id, t.completed ? "New Task" : "Completed")}
                            className="rounded accent-orange-500" />
                        </td>
                        <td className="py-2.5 pr-3"><div className={`text-sm font-medium ${t.completed ? "line-through" : ""}`}>{t.title || "—"}</div></td>
                        <td className="py-2.5 pr-3 text-muted-foreground text-xs">{t.clientName || "—"}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground text-xs">{t.subject || "—"}</td>
                        <td className="py-2.5 pr-3">
                          <select value={t.status || "new_task"}
                            onChange={(e) => handleStatusChange(t._id, e.target.value)}
                            className="text-[10px] px-1 py-0.5 rounded bg-background border border-border outline-none">
                            <option value="new_task">New Task</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded border ${priorityColor(t.priority || "Medium")}`}>{t.priority || "Medium"}</span>
                        </td>
                        <td className="py-2.5 pr-3">
                          {t.dueDate && (
                            <span className={`text-[10px] flex items-center gap-1 ${t.dueStatus === "Due" ? "text-red-400" : t.dueStatus === "Almost Due" ? "text-amber-400" : "text-muted-foreground"}`}>
                              <Clock className="h-3 w-3" />
                              {new Date(t.dueDate).toLocaleDateString()}
                              {t.dueStatus && <span className="font-medium">({t.dueStatus})</span>}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <button onClick={() => deleteTaskMutation.mutate(t._id)}
                            className="h-6 w-6 rounded grid place-items-center hover:bg-accent text-red-400">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-3">Showing {filtered.length} of {allTasks.length} tasks</div>
          </div>
        )}

        {view === "kanban" && (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {STATUSES.map((status) => (
                <KanbanColumn key={status} status={status} tasks={groupedByStatus[status] || []}>
                  {(groupedByStatus[status] || []).map((task: any) => (
                    <SortableTaskCard key={task._id} task={task} />
                  ))}
                </KanbanColumn>
              ))}
            </div>
          </DndContext>
        )}

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-gradient-orange">Create New Task</DialogTitle>
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
                <div><Label className="text-xs">New Client Name</Label><Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="Enter client name" /></div>
              )}
              <div><Label className="text-xs">Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Type</Label>
                  <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full h-9 rounded-md border border-border bg-card px-2 text-sm outline-none">
                    <option>Call</option><option>Support</option><option>Follow-up</option><option>Meeting</option><option>Other</option>
                  </select>
                </div>
                <div><Label className="text-xs">Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
                <div><Label className="text-xs">Priority</Label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full h-9 rounded-md border border-border bg-card px-2 text-sm outline-none">
                    <option>Low</option><option>Medium</option><option>Critical</option>
                  </select>
                </div>
                <div><Label className="text-xs">Status</Label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full h-9 rounded-md border border-border bg-card px-2 text-sm outline-none">
                    <option value="new_task">New Task</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div><Label className="text-xs">Contact Person</Label><Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="Contact person" /></div>
              <div><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Task details..." rows={3} /></div>
            </div>
            <DialogFooter>
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">Cancel</button>
              <button onClick={handleSubmit} disabled={createTaskMutation.isPending}
                className="px-4 py-1.5 text-sm gradient-orange text-white rounded-md font-medium shadow disabled:opacity-60">
                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}