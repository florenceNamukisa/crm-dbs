import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getApiBase, saveSession, type AuthUser } from "@/lib/auth";

export default function SetPasswordPage() {
  const navigate = useNavigate();

  // Get OTP from localStorage (pre-filled on first login)
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem("crm.auth.pendingEmail") || ""; } catch { return ""; }
  });
  const [otp, setOtp] = useState(() => {
    try { return localStorage.getItem("crm.auth.pendingOTP") || ""; } catch { return ""; }
  });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${getApiBase()}/auth/set-password`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword: password }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Could not set password");
      }
      toast.success("Password set", { description: "You can now sign in with your new password." });

      // Auto sign-in: use the new password to log in
      try {
        const loginRes = await fetch(`${getApiBase()}/auth/login`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const lp = await loginRes.json();
        if (loginRes.ok && lp.token) {
          const roleMap: Record<string, AuthUser["role"]> = {
            superadmin: "superadmin",
            admin: "tenant_admin",
            manager: "sales_manager",
            sales_manager: "sales_manager",
            agent: "sales_agent",
            sales_agent: "sales_agent",
          };
          const user: AuthUser = {
            ...lp.user,
            role: roleMap[lp.user.role] ?? lp.user.role,
            tenantId: lp.user.tenant?.id ?? null,
            tenantName: lp.user.tenant?.name ?? null,
          };
          saveSession(lp.token, user);
          const target =
            user.role === "superadmin" ? "/super-admin" :
            user.role === "tenant_admin" ? "/tenant-admin" :
            user.role === "sales_manager" ? "/manager" :
            "/";
          await navigate({ to: target });
          return;
        }
      } catch {}
      await navigate({ to: "/login" });
    } catch (error) {
      toast.error("Could not set password", { description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-md p-8 rounded-2xl bg-card border border-border shadow-xl">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="h-12 w-12 grid place-items-center rounded-lg border border-orange-500/30 bg-orange-500/10">
            <KeyRound className="h-5 w-5 text-orange-400" />
          </div>
          <h2 className="text-2xl font-bold">Set your password</h2>
          <p className="text-sm text-muted-foreground text-center">
            Use the OTP from your welcome email and create a password you'll use going forward.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="w-full space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 w-full rounded-md border border-border bg-card pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">One-time code (OTP)</label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                inputMode="numeric"
                placeholder="6-digit code"
                readOnly={otp.length === 6 && !loading}
                className="h-11 w-full rounded-md border border-border bg-card pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 tracking-widest"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">New password (min 6 chars)</label>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11 w-full rounded-md border border-border bg-card pl-10 pr-11 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded hover:bg-accent"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Confirm new password</label>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                className="h-11 w-full rounded-md border border-border bg-card pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md gradient-orange font-semibold text-white shadow-lg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving…" : "Set password & sign in"}
          </button>
          <div className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
