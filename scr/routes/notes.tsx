import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { StickyNote, Pin, Users, Lock } from "lucide-react";

export const Route = createFileRoute("/notes")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "Note", entityPlural: "Notes",
        subtitle: "Personal & shared notes attached to leads, deals and clients.",
        titleKey: "title", subtitleKey: "related",
        kanban: { statusKey: "visibility", stages: ["Personal", "Shared", "Pinned"] },
        kpis: [
          { icon: StickyNote, label: "Total Notes", value: "486", trend: 5.4 },
          { icon: Pin, label: "Pinned", value: "24", trend: 1.0 },
          { icon: Users, label: "Shared", value: "182", trend: 8.4 },
          { icon: Lock, label: "Personal", value: "280", trend: 2.6 },
        ],
        columns: [
          { key: "title", label: "Title" }, { key: "related", label: "Related To" },
          { key: "body", label: "Note", kind: "longtext" },
          { key: "visibility", label: "Visibility", kind: "status" },
          { key: "updated", label: "Updated", kind: "date" }, { key: "owner", label: "Author" },
        ],
        rows: [
          { title: "Buyer concerns", related: "Tech Solutions Deal", body: "Wants to see security report and SOC2.", visibility: "Shared", updated: "2025-05-27", owner: "John Doe" },
          { title: "Champion identified", related: "GreenField Agro", body: "Priya is internal champion; loop her in.", visibility: "Pinned", updated: "2025-05-26", owner: "Jane Smith" },
          { title: "Pricing benchmarks", related: "Finance Pro Group", body: "Competitor X quoted -12%.", visibility: "Personal", updated: "2025-05-25", owner: "John Doe" },
          { title: "Onboarding gotchas", related: "Bright Future", body: "SSO setup is tricky; schedule call.", visibility: "Shared", updated: "2025-05-25", owner: "Mike Johnson" },
          { title: "Renewal risk", related: "Cloud Services", body: "Sponsor changed; re-engage.", visibility: "Pinned", updated: "2025-05-24", owner: "Jane Smith" },
        ],
      }} />
    </AppShell>
  ),
});
