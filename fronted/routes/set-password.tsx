import { createFileRoute } from "@tanstack/react-router";
import SetPasswordPage from "@/components/auth/SetPasswordPage";

export const Route = createFileRoute("/set-password")({
  component: () => <SetPasswordPage />,
});
