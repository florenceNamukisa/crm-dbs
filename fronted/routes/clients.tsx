import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import ClientsDashboard from "@/components/dashboard/ClientsDashboard";

export const Route = createFileRoute("/clients")({
  component: () => (<AppShell><ClientsDashboard /></AppShell>),
});
