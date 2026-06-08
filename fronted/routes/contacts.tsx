import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/contacts")({
  component: () => {
    window.location.href = "/clients";
    return <AppShell><div className="p-8 text-center text-muted-foreground">Redirecting to Clients...</div></AppShell>;
  },
});
