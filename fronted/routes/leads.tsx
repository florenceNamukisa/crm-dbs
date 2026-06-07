import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import LeadsDashboard from "@/components/dashboard/LeadsDashboard";

export const Route = createFileRoute("/leads")({
  component: () => (<AppShell><LeadsDashboard /></AppShell>),
});
