import { createFileRoute } from "@tanstack/react-router";
import ResetPasswordPage from "@/components/auth/ResetPasswordPage";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      email: typeof search.email === "string" ? search.email : undefined,
    };
  },
});
