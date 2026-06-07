import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Repeat, Search, Phone, Mail, Calendar } from "lucide-react";
import { useClients } from "@/lib/api/clients";

export const Route = createFileRoute("/followups")({
  component: FollowUpsPage,
});

function FollowUpsPage() {
  const { data: clientsData, isLoading } = useClients();
  const clients = clientsData?.clients ?? [];
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Build follow-ups from client tasks and interactions
  const followUps = useMemo(() => {
    const items: any[] = [];
    clients.forEach((c: any) => {
      (c.tasks || []).forEach((t: any) => {
        if (t.status !== "completed") {
          items.push({
            _id: t._id,
            clientName: c.name,
            clientCompany: c.company,
            title: t.title || t.subject || "Follow-up",
            type: t.subject || "Call",
            dueDate: t.dueDate,
            priority: t.priority || "Medium",
            status: t.status || "pending",
            contactPerson: t.contactPerson || "",
          });
        }
      });
      (c.interactions || []).forEach((i: any) => {
        if (i.type === "email" || i.type === "call") {
          items.push({
            _id: i._id + "_interaction",
            clientName: c.name,
            clientCompany: c.company,
            title: `${i.type === "email" ? "Email" : "Call"} follow-up`,
            type: i.type,
            dueDate: i.date,
            priority: "Medium",
            status: "completed",
            contactPerson: "",
          });
        }
      });
    });
    return items;
  }, [clients]);

  const filtered = followUps.filter((f: any) => {
    const matchesSearch =
      !search ||
      (f.clientName || "").toLowerCase().includes(search.toLowerCase()) ||
      (f.title || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <div>
          <h1 className="text-2xl font-bold">Follow-ups</h1>
          <p className="text-sm text-muted-foreground">Track and manage follow-up activities with clients</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search follow-ups..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="glass-card rounded-xl p-4">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
              <Repeat className="h-10 w-10 opacity-50" />
              <div className="text-sm font-medium">No follow-ups found</div>
              <div className="text-xs opacity-80">Follow-ups will appear from client tasks and interactions.</div>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left">
                    {["Client", "Title", "Type", "Due Date", "Priority", "Status"].map((h) => (
                      <th key={h} className="pb-2 pr-3 font-normal">{h}</th>
                    ))}
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
                      <td className="pr-3 text-muted-foreground text-xs">
                        {f.dueDate ? new Date(f.dueDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="pr-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded ${
                          f.priority === "Critical" ? "bg-red-500/15 text-red-400" :
                          f.priority === "Low" ? "bg-emerald-500/15 text-emerald-400" :
                          "bg-amber-500/15 text-amber-400"
                        }`}>{f.priority}</span>
                      </td>
                      <td className="pr-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${
                          f.status === "completed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                          f.status === "in_progress" ? "bg-blue-500/15 text-blue-400 border-blue-500/30" :
                          "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
                        }`}>{f.status || "pending"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}