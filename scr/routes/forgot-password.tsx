import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      toast.success("Reset link sent", {
        description: "Check your email for the reset link and OTP code.",
      });
      navigate({ to: "/login" });
    } catch (error) {
      toast.error("Unable to send reset email", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 shadow-lg">
        <button
          type="button"
          onClick={() => navigate({ to: "/login" })}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </button>

        <div className="space-y-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Forgot password</div>
            <h1 className="mt-3 text-3xl font-bold">Reset your password</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the email address associated with your account and we’ll send a reset link and OTP code.
              If you didn’t request a reset, ignore the email.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">Email address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending reset email..." : "Send reset link"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground">
            Already remember your password? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});
