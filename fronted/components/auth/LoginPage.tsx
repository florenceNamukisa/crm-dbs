import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, LockKeyhole, LogIn, Mail } from "lucide-react";
import { toast } from "sonner";
import { getApiBase, saveSession, type AuthUser } from "@/lib/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${getApiBase()}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Login failed");
      }

      const raw = payload as { token: string; user: any };
      // Map backend roles to frontend roles
      const roleMap: Record<string, AuthUser["role"]> = {
        superadmin: "superadmin",
        admin: "tenant_admin",
        manager: "sales_manager",
        sales_manager: "sales_manager",
        agent: "sales_agent",
        sales_agent: "sales_agent",
      };
      const user: AuthUser = {
        ...raw.user,
        role: roleMap[raw.user.role] ?? raw.user.role,
        tenantId: raw.user.tenant?.id ?? null,
        tenantName: raw.user.tenant?.name ?? null,
        tenantLogo: raw.user.tenant?.logo ?? null,
      };
      // If this is the user's first login, force them to set a real password first.
      const isFirst = Boolean((raw.user as any)?.isFirstLogin);
      if (isFirst) {
        // Stash both email and OTP in localStorage so the set-password page can pre-fill them.
        try { localStorage.setItem("crm.auth.pendingEmail", user.email); } catch {}
        if (raw.user.otp) { try { localStorage.setItem("crm.auth.pendingOTP", raw.user.otp); } catch {} }
        toast.message("First time signing in", { description: "Please set a password to continue." });
        await navigate({ to: "/set-password" });
        return;
      }

      saveSession(raw.token, user);
      toast.success("Login successful", { description: `Welcome, ${user.name}` });

      // Route each role to the correct dashboard.
      const target =
        user.role === "superadmin" ? "/super-admin" :
        user.role === "tenant_admin" ? "/tenant-admin" :
        user.role === "sales_manager" ? "/manager" :
        "/";
      await navigate({ to: target });
    } catch (error) {
      toast.error("Could not sign in", { description: error instanceof Error ? error.message : "Please try again." });
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
          <h2 className="text-2xl font-bold">Sign in</h2>
          <p className="text-sm text-muted-foreground">Use your CRM account to continue.</p>
        </div>
        <form onSubmit={handleSubmit} className="w-full">
          <label className="mb-2 block text-sm font-medium" htmlFor="email">Email</label>
          <div className="relative mb-4">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full rounded-md border border-border bg-card pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              autoComplete="email"
              required
            />
          </div>

          <label className="mb-2 block text-sm font-medium" htmlFor="password">Password</label>
          <div className="relative mb-6">
            <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 w-full rounded-md border border-border bg-card pl-10 pr-11 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              autoComplete="current-password"
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

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md gradient-orange font-semibold text-white shadow-lg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <div className="mt-3 text-center text-sm text-muted-foreground">
            <Link to="/forgot-password" className="font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

