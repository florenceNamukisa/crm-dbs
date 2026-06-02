import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { Folder, FileText, PenTool, Archive } from "lucide-react";

export const Route = createFileRoute("/documents")({
  component: () => (
    <AppShell>
      <EntityDashboard config={{
        entity: "Document", entityPlural: "Documents",
        subtitle: "Contracts, NDAs, brochures and e-signed docs by client.",
        titleKey: "name", subtitleKey: "client",
        kanban: { statusKey: "status", stages: ["Draft", "Shared", "Signed", "Archived"] },
        kpis: [
          { icon: Folder, label: "Total Files", value: "1,284", trend: 6.5 },
          { icon: FileText, label: "Shared", value: "412", trend: 8.1 },
          { icon: PenTool, label: "Signed", value: "318", trend: 12.6 },
          { icon: Archive, label: "Archived", value: "146", trend: 1.4 },
        ],
        columns: [
          { key: "name", label: "Document" }, { key: "client", label: "Client" },
          { key: "type", label: "Type", kind: "select", options: ["Contract", "NDA", "Proposal", "Brochure", "Other"] },
          { key: "size", label: "Size" },
          { key: "status", label: "Status", kind: "status" }, { key: "owner", label: "Owner" },
        ],
        rows: [
          { name: "MSA - Tech Solutions.pdf", client: "Tech Solutions Inc.", type: "Contract", size: "1.2 MB", status: "Signed", owner: "John Doe" },
          { name: "NDA - GreenField.pdf", client: "GreenField Agro", type: "NDA", size: "412 KB", status: "Shared", owner: "Jane Smith" },
          { name: "Proposal v2.pdf", client: "Finance Pro Group", type: "Proposal", size: "2.4 MB", status: "Draft", owner: "John Doe" },
          { name: "Brochure 2025.pdf", client: "—", type: "Brochure", size: "3.8 MB", status: "Shared", owner: "Marketing" },
          { name: "Renewal SOW.pdf", client: "Cloud Services LLC", type: "Contract", size: "980 KB", status: "Signed", owner: "Jane Smith" },
        ],
      }} />
    </AppShell>
  ),
});
