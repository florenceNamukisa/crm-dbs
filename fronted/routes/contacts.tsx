import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Contact2, Search, UserPlus, Star, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/contacts")({
  component: ContactsPage,
});

function ContactsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => apiFetch<{ contacts: any[] }>("/clients/contacts"),
    staleTime: 30_000,
  });

  const contacts = data?.contacts ?? [];
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return contacts.filter((c: any) => {
      const name = (c.name || "").toLowerCase();
      const company = (c.company || c.organization || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      const q = search.toLowerCase();
      const matchesSearch = !q || name.includes(q) || company.includes(q) || email.includes(q);
      const matchesStatus = statusFilter === "all" || (c.status || "active").toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [contacts, search, statusFilter]);

  const totalCount = contacts.length;
  const activeCount = contacts.filter((c: any) => (c.status || "active") === "active").length;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Contacts</h1>
            <p className="text-sm text-muted-foreground">
              People directory with profiles, interactions, and communication preferences.
            </p>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="icon-tile h-10 w-10 rounded-lg grid place-items-center">
                <Contact2 className="h-5 w-5 text-orange-400" />
              </span>
              <div>
                <div className="text-xs text-muted-foreground">Total Contacts</div>
                <div className="text-xl font-bold">{totalCount}</div>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="icon-tile h-10 w-10 rounded-lg grid place-items-center">
                <UserPlus className="h-5 w-5 text-orange-400" />
              </span>
              <div>
                <div className="text-xs text-muted-foreground">Active</div>
                <div className="text-xl font-bold">{activeCount}</div>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="icon-tile h-10 w-10 rounded-lg grid place-items-center">
                <Star className="h-5 w-5 text-orange-400" />
              </span>
              <div>
                <div className="text-xs text-muted-foreground">Inactive</div>
                <div className="text-xl font-bold">{totalCount - activeCount}</div>
              </div>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="icon-tile h-10 w-10 rounded-lg grid place-items-center">
                <MessageSquare className="h-5 w-5 text-orange-400" />
              </span>
              <div>
                <div className="text-xs text-muted-foreground">With Position</div>
                <div className="text-xl font-bold">{contacts.filter((c: any) => c.position).length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-background border border-border text-sm outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Contacts Table */}
        <div className="glass-card rounded-xl p-4">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading contacts...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
              <span className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card/40">
                <Contact2 className="h-5 w-5 opacity-60" />
              </span>
              <div className="text-sm font-medium">No contacts found</div>
              <div className="text-xs opacity-80">Contacts will appear here once added to clients.</div>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left">
                    {["Name", "Organization", "Email", "Phone", "Position", "Status"].map((h) => (
                      <th key={h} className="pb-2 pr-3 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c: any, idx: number) => (
                    <tr key={c._id || idx} className="border-t border-border/50 hover:bg-accent/30">
                      <td className="py-2.5 pr-3 font-medium">{c.name || "—"}</td>
                      <td className="pr-3 text-muted-foreground">{c.company || c.organization || "—"}</td>
                      <td className="pr-3 text-muted-foreground">{c.email || "—"}</td>
                      <td className="pr-3 text-muted-foreground">{c.phone || "—"}</td>
                      <td className="pr-3 text-muted-foreground">{c.position || "—"}</td>
                      <td className="pr-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${
                          (c.status || "active") === "active"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
                        }`}>
                          {(c.status || "Active").charAt(0).toUpperCase() + (c.status || "Active").slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-3">
            Showing {filtered.length} of {totalCount} contacts
          </div>
        </div>
      </div>
    </AppShell>
  );
}