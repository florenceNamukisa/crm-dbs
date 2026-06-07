import { createFileRoute } from "@tanstack/react-router";
import ForgotPasswordPage from "@/components/auth/ForgotPasswordPage";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      email: typeof search.email === "string" ? search.email : undefined,
    };
  },
});
