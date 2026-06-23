import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { getApiBase } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${getApiBase()}/auth/forgot-password`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Request failed");
      }

      setSubmitted(true);
      toast.success("Reset link sent", { description: "If the email exists, a reset link has been sent." });
    } catch (error) {
      toast.error("Request failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    navigate({ to: "/reset-password", search: { email } });
    return null;
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 md:p-8 rounded-lg bg-card border border-border">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="h-12 w-12 grid place-items-center rounded-lg border border-orange-500/30 bg-orange-500/10">
            <Mail className="h-5 w-5 text-orange-400" />
          </div>
          <h2 className="text-2xl font-bold">Forgot password?</h2>
          <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="space-y-2">
            <label className="mb-2 block text-sm font-medium" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              autoComplete="email"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md gradient-orange font-semibold text-white shadow-lg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
