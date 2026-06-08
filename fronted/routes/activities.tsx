import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Repeat, Search, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/auth";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/activities")({
  component: ActivitiesPage,
});

type DashboardResponse = {
  activities: Array<{ t: string; when: string }>;
};

function ActivitiesPage() {
  const [search, setSearch] = useState("");

  const { data: dashData, isLoading } = useQuery({
    queryKey: ["sales-dashboard"],
    queryFn: () => apiFetch<DashboardResponse>("/dashboards/sales"),
    staleTime: 30_000,
  });

  const activities = dashData?.activities ?? [];

  const filtered = search.trim()
    ? activities.filter(
        (a) =>
          a.t.toLowerCase().includes(search.toLowerCase()) ||
          a.when.toLowerCase().includes(search.toLowerCase())
      )
    : activities;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="h-9 w-9 rounded-lg border border-border grid place-items-center hover:bg-accent transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gradient-orange">Activity Feed</h1>
            <p className="text-sm text-muted-foreground">
              View all recent activity across your CRM
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activities..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="glass-card rounded-xl p-4">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Loading activities...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
              <Repeat className="h-10 w-10 opacity-50" />
              <div className="text-sm font-medium">No activities found</div>
            </div>
          ) : (
            <ul className="space-y-4">
              {filtered.map((a, i) => (
                <li
                  key={i}
                  className="flex items-start gap-4 pb-4 border-b border-border/30 last:border-0 last:pb-0"
                >
                  <span className="icon-tile h-10 w-10 rounded-lg grid place-items-center mt-0.5 shrink-0">
                    <Repeat className="h-5 w-5 text-orange-400" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{a.t}</div>
                    <div className="text-xs text-muted-foreground mt-1">{a.when}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!isLoading && (
            <div className="text-xs text-muted-foreground mt-3">
              Showing {filtered.length} of {activities.length} activities
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}