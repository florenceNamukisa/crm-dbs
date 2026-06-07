import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { getStoredUser, type UserRole } from "@/lib/auth";

export function RequireAuth({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    const fallback =
      user.role === "superadmin" ? "/super-admin" :
      user.role === "tenant_admin" ? "/tenant-admin" :
      user.role === "sales_manager" ? "/manager" :
      "/";
    return <Navigate to={fallback} replace />;
  }

  return children;
}

