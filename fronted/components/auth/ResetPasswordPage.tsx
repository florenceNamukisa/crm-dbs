"use client";

import { useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";
import { getApiBase } from "@/lib/auth";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ResetResponse = {
  message: string;
};

export default function ResetPasswordPage() {
  const search = useSearch({ from: "/reset-password" });
  const navigate = useNavigate();
  const emailFromQuery = typeof search?.email === "string" ? search.email : "";

  const [email, setEmail] = useState(emailFromQuery);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      if (!otp || !newPassword || !email) {
        throw new Error("Email, OTP, and new password are required.");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }
      if (newPassword.length < 6) {
        throw new Error("New password must be at least 6 characters.");
      }

      const response = await fetch(`${getApiBase()}/auth/reset-password`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const payload = (await response.json()) as ResetResponse;
      if (!response.ok) {
        throw new Error(payload.message || "Password reset failed.");
      }

      toast.success("Password updated", { description: payload.message });
      navigate({ to: "/login" });
    } catch (error) {
      toast.error("Reset failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="w-full max-w-md p-8 rounded-lg bg-card border border-border">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="h-12 w-12 grid place-items-center rounded-lg border border-orange-500/30 bg-orange-500/10">
            <LockKeyhole className="h-5 w-5 text-orange-400" />
          </div>
          <h2 className="text-2xl font-bold">Reset password</h2>
          <p className="text-sm text-muted-foreground">Enter the code from your email and choose a new password.</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="pl-9"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="otp">Reset code</Label>
            <Input
              id="otp"
              inputMode="numeric"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="pl-9 pr-10"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded hover:bg-accent"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="pl-9 pr-10"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Resetting..." : "Reset password"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
