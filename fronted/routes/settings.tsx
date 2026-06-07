import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiFetch, getStoredUser } from "@/lib/auth";

function SettingsPage() {
  const user = getStoredUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully.");
    } catch (error) {
      toast.error("Could not update password", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-1">
            <div className="text-sm font-semibold text-muted-foreground">Account Settings</div>
            <h1 className="text-2xl font-bold">Security & password</h1>
            <p className="text-sm text-muted-foreground">
              Change your password here. This works for super admins and sales agents, and keeps your account secure.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Signed in as</div>
              <div className="mt-2 text-lg font-semibold">{user?.name ?? "Unknown user"}</div>
              <div className="text-sm text-muted-foreground">{user?.email ?? "No email available"}</div>
              <div className="mt-3 rounded-2xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                Role: {user?.role ?? "N/A"}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Need help?</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                If you forget your password, use the "Forgot password" link on the login page to receive a secure reset link and OTP by email.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-border bg-card p-6 shadow-sm max-w-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Change password</h2>
            <p className="text-sm text-muted-foreground">Enter your current password and choose a new password.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="mb-2 block text-sm font-medium">Current password</label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Current password"
                required
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
                placeholder="Confirm new password"
                required
              />
            </div>

            <div className="rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground">
              Use a strong password with at least 8 characters. If you don't know your current password, click "Forgot password" on the login screen.
            </div>
          </div>

          <Button type="submit" disabled={loading} className="mt-6">
            {loading ? "Updating password..." : "Update password"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
