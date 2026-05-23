// In dev, call the API directly (Lovable/TanStack Start vite config strips the /api proxy).
// Override with VITE_API_URL if your API runs elsewhere.
export function getApiBase(): string {
  const env = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (env) return env.replace(/\/$/, "");
  if (import.meta.env.DEV) return "http://localhost:3001";
  return "";
}

const API_BASE = getApiBase();

const TOKEN_KEY = "yova_auth_token";

export function getToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof localStorage === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export type AuthUser = {
  id: string;
  email: string;
  full_name?: string | null;
};

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, ...init } = options;
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      auth: false,
    }),
  me: () => request<{ user: AuthUser }>("/api/auth/me"),
  get: <T>(path: string) => request<T>(`/api${path}`),
  post: <T>(path: string, body: unknown) =>
    request<T>(`/api${path}`, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(`/api${path}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path: string) =>
    request<void>(`/api${path}`, { method: "DELETE" }),
};
