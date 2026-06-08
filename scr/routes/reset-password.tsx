import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP } from "@/components/ui/input-otp";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !token) {
      toast.error("Reset link is missing required information.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation must match.");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, token, otp, newPassword }),
      });
      toast.success("Password reset complete.");
      navigate({ to: "/login" });
    } catch (error) {
      toast.error("Unable to reset password", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Reset your password</h1>
            <p className="text-sm text-muted-foreground">Enter the OTP from your email and choose a new password.</p>
          </div>
        </div>

        {!email || !token ? (
          <div className="rounded-2xl border border-red-300 bg-red-100 p-4 text-sm text-red-800">
            The reset link is invalid or missing. Please request a new link from the <Link to="/forgot-password" className="font-medium text-primary hover:underline">forgot password</Link> page.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="otp" className="mb-2 block text-sm font-medium">OTP code</label>
              <InputOTP
                id="otp"
                value={otp}
                onChange={(value) => setOtp(value)}
                inputProps={{ inputMode: "numeric", maxLength: 6, className: "h-11 w-full rounded-md border border-border bg-card px-3 text-sm outline-none" }}
                numInputs={6}
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="mb-2 block text-sm font-medium">New password</label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password"
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">Confirm new password</label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
                required
              />
            </div>

            <div className="rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground">
              If you did not request a password change, ignore this email. Otherwise, complete the form to secure your account.
            </div>

            <Button type="submit" disabled={loading || otp.length < 6} className="w-full">
              {loading ? "Resetting password..." : "Reset password"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});
