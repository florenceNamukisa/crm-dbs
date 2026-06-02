import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import ProductsDashboard from "@/components/dashboard/ProductsDashboard";

export const Route = createFileRoute("/products")({
  component: () => (<AppShell><ProductsDashboard /></AppShell>),
});
