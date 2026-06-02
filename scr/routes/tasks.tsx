import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/components/layout/pageStub";

export const Route = createFileRoute("/tasks")({
  component: () => (
    <PageStub
      title="Tasks"
      description="Track due dates, priorities, and assignments across the sales team."
    />
  ),
});
