import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import DealsDashboard from "@/components/dashboard/DealsDashboard";

export const Route = createFileRoute("/sales")({
  component: () => (<AppShell><DealsDashboard /></AppShell>),
});