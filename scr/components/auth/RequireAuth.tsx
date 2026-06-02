import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { getStoredUser, type UserRole } from "@/lib/auth";

export function RequireAuth({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === "superadmin" ? "/super-admin" : "/"} replace />;
  }

  return children;
}

