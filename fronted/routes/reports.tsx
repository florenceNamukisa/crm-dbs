import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { ReportsView } from "@/components/dashboard/TenantAdminDashboard";
import { useClients } from "@/lib/api/clients";
import { useDeals } from "@/lib/api/deals";
import { useSales } from "@/lib/api/sales";
import { useUsers } from "@/lib/api/users";
import { useSchedules } from "@/lib/api/schedules";
import { useMeetings } from "@/lib/api/meetings";
import { useTasks } from "@/lib/api/tasks";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { data: usersData } = useUsers();
  const { data: clientsData } = useClients();
  const { data: dealsData } = useDeals();
  const { data: salesData } = useSales();
  const { data: schedulesData } = useSchedules();
  const { data: meetingsData } = useMeetings();
  const { data: tasksData } = useTasks();

  return (
    <AppShell>
      <ReportsView
        users={usersData?.users ?? []}
        clients={clientsData?.clients ?? []}
        deals={dealsData?.deals ?? []}
        sales={salesData?.sales ?? []}
        schedules={schedulesData?.schedules ?? []}
        meetings={meetingsData?.meetings ?? []}
        tasks={tasksData?.tasks ?? []}
      />
    </AppShell>
  );
}
