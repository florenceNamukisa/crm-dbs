import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import { Contact2, UserPlus, Star, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/contacts")({
  component: () => (
    <AppShell>
      <EntityDashboard
        config={{
          entity: "Contact",
          entityPlural: "Contacts",
          subtitle: "People directory with profiles, interactions, and communication preferences.",
          titleKey: "name",
          subtitleKey: "company",
          kanban: { statusKey: "status", stages: ["New", "Active", "Engaged", "Inactive"] },
          kpis: [
            { icon: Contact2, label: "Total Contacts", value: "2,348", trend: 9.4 },
            { icon: UserPlus, label: "Added This Month", value: "186", trend: 12.1 },
            { icon: Star, label: "VIP Contacts", value: "98", trend: 4.2 },
            { icon: MessageSquare, label: "Engaged", value: "1,120", trend: 7.8 },
          ],
          columns: [
            { key: "name", label: "Full Name" },
            { key: "company", label: "Company" },
            { key: "title", label: "Job Title" },
            { key: "email", label: "Email", kind: "email" },
            { key: "phone", label: "Phone" },
            { key: "status", label: "Status", kind: "status" },
            { key: "owner", label: "Owner" },
          ],
          rows: [
            { name: "Alex Carter", company: "Acme Corp", title: "CTO", email: "alex@acme.com", phone: "+1 555 100 1000", status: "Active", owner: "John Doe" },
            { name: "Priya Patel", company: "Nimbus AI", title: "Head of Ops", email: "priya@nimbus.ai", phone: "+1 555 100 2000", status: "Engaged", owner: "John Doe" },
            { name: "Liam Chen", company: "BluePeak Labs", title: "Founder", email: "liam@bluepeak.io", phone: "+1 555 100 3000", status: "New", owner: "Jane Smith" },
            { name: "Sara Müller", company: "OrbitOne", title: "Procurement", email: "sara@orbit.one", phone: "+49 30 1234567", status: "Inactive", owner: "Mike Johnson" },
            { name: "Marcus Lee", company: "Quanta Systems", title: "VP Sales", email: "marcus@quanta.io", phone: "+1 555 100 5000", status: "Active", owner: "John Doe" },
          ],
        }}
      />
    </AppShell>
  ),
});
