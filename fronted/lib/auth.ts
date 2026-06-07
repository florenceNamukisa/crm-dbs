export type UserRole = "superadmin" | "tenant_admin" | "sales_manager" | "sales_agent";

export type AuthUser = {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  tenantName: string | null;
  tenantLogo?: string | null;
};

const TOKEN_KEY = "crm.auth.token";
const USER_KEY = "crm.auth.user";

export function getApiBase() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port !== "5000") {
    return "http://localhost:5000/api";
  }
  return `${window.location.origin}/api`;
}

export function saveSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    clearSession();
    return null;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(payload.message || "Request failed");
  }

  return response.json() as Promise<T>;
}
