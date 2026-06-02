import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { Bot, Sparkles, Brain, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/ai-assistant")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "Conversation", entityPlural: "AI Sales Assistant",
        subtitle: "AI-powered prompts, summaries, and next-best-action suggestions.",
        titleKey: "prompt", subtitleKey: "context",
        kanban: { statusKey: "status", stages: ["Open", "Resolved", "Archived"] },
        kpis: [
          { icon: Bot, label: "AI Sessions", value: "1,842", trend: 22.1 },
          { icon: Sparkles, label: "Suggestions", value: "5,260", trend: 18.4 },
          { icon: Brain, label: "Auto-summaries", value: "812", trend: 14.6 },
          { icon: MessageSquare, label: "Avg Reply Time", value: "1.4s", trend: 0.2 },
        ],
        columns: [
          { key: "prompt", label: "Prompt" }, { key: "context", label: "Context" },
          { key: "intent", label: "Intent", kind: "select", options: ["Draft Email", "Summarize", "Forecast", "Coach", "Research"] },
          { key: "status", label: "Status", kind: "status" },
          { key: "created", label: "Created", kind: "date" }, { key: "owner", label: "User" },
        ],
        rows: [
          { prompt: "Draft a follow-up to Michael", context: "Tech Solutions Deal", intent: "Draft Email", status: "Resolved", created: "2025-05-27", owner: "John Doe" },
          { prompt: "Summarize last 5 calls", context: "GreenField Agro", intent: "Summarize", status: "Open", created: "2025-05-27", owner: "Jane Smith" },
          { prompt: "Forecast Q3 pipeline", context: "All Deals", intent: "Forecast", status: "Open", created: "2025-05-26", owner: "John Doe" },
          { prompt: "Coach me on objection: price", context: "—", intent: "Coach", status: "Resolved", created: "2025-05-26", owner: "Mike Johnson" },
          { prompt: "Research Cloud Services LLC", context: "Cloud Services LLC", intent: "Research", status: "Archived", created: "2025-05-25", owner: "Jane Smith" },
        ],
      }} />
    </AppShell>
  ),
});
