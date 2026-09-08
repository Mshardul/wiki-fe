// Single typed wiki-be client. Framework-agnostic (no Next coupling, spec §2). Ported from js/api.js.

const isLocal =
  typeof location !== "undefined" &&
  (location.hostname === "localhost" || location.hostname === "127.0.0.1");
export const BACKEND_URL = isLocal ? "http://localhost:8001" : "https://wiki-be.onrender.com";
const API = `${BACKEND_URL}/api/v1`;
const DEFAULT_TIMEOUT_MS = 15_000;
const SESSION_TOKEN_KEY = "wiki-session-token";

export class ApiError extends Error {
  code: string;
  status: number;
  requestId?: string;
  constructor(code: string, message: string, status: number, requestId?: string) {
    super(message || code);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

let sessionExpiredFired = false;

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(SESSION_TOKEN_KEY, token);
    else localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // storage unavailable — session won't persist
  }
}

interface RequestOpts {
  silent401?: boolean;
  timeoutMs?: number;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  { silent401 = false, timeoutMs = DEFAULT_TIMEOUT_MS }: RequestOpts = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const token = getSessionToken();
  const requestId = crypto.randomUUID();
  const headers: Record<string, string> = { "X-Request-Id": requestId };
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    const e = err as Error;
    if (e.name === "AbortError") {
      throw new ApiError("TIMEOUT", "Request timed out. Please try again.", 0, requestId);
    }
    throw new ApiError("NETWORK", e.message, 0, requestId);
  } finally {
    clearTimeout(timer);
  }

  const echoedId = res.headers.get("X-Request-Id") ?? requestId;

  if (res.status === 401 && !silent401) {
    if (!sessionExpiredFired) {
      sessionExpiredFired = true;
      setSessionToken(null);
      document.dispatchEvent(new CustomEvent("wiki:session-expired"));
    }
    throw new ApiError("UNAUTHORIZED", "Session expired", 401, echoedId);
  }

  if (res.status === 204) {
    sessionExpiredFired = false;
    return null as T;
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const env = (data as { error?: { code?: string; message?: string } })?.error ?? {};
    throw new ApiError(env.code ?? "ERROR", env.message ?? res.statusText, res.status, echoedId);
  }
  sessionExpiredFired = false;
  return data as T;
}

export interface User {
  id: string;
  email: string;
  role?: string;
  is_active?: boolean;
  is_verified?: boolean;
}
export interface MeResponse {
  user: User;
}
export interface AuthResponse {
  user: User;
  session_token: string;
}
export interface SyncRow {
  wiki_id: string;
  path: string;
}

const get = <T>(p: string) => request<T>("GET", p);
const post = <T>(p: string, b?: unknown) => request<T>("POST", p, b);
const del = <T>(p: string, b?: unknown) => request<T>("DELETE", p, b);

export const api = {
  get,
  post,
  del,
  auth: {
    me: () => request<MeResponse>("GET", "/auth/me", undefined, { silent401: true }),
    register: (email: string, password: string) =>
      post<AuthResponse>("/auth/register", { email, password }),
    login: (email: string, password: string) =>
      request<AuthResponse>("POST", "/auth/login", { email, password }, { silent401: true }),
    logout: () => post<void>("/auth/logout"),
    resendVerification: (email: string) => post<void>("/auth/resend-verification", { email }),
    verifyEmail: (token: string) => post<AuthResponse>("/auth/verify", { token }),
    forgotPassword: (email: string) => post<void>("/auth/forgot-password", { email }),
    resetPassword: (token: string, password: string) =>
      post<AuthResponse>("/auth/reset-password", { token, password }),
  },
  bookmarks: {
    list: () => get<SyncRow[]>("/bookmarks"),
    add: (wiki_id: string, path: string) => post<void>("/bookmarks", { wiki_id, path }),
    remove: (wiki_id: string, path: string) => del<void>("/bookmarks", { wiki_id, path }),
    clear: (wiki_id?: string) => del<void>("/bookmarks/all", wiki_id ? { wiki_id } : {}),
  },
  completions: {
    list: () => get<SyncRow[]>("/completions"),
    add: (wiki_id: string, path: string) => post<void>("/completions", { wiki_id, path }),
    remove: (wiki_id: string, path: string) => del<void>("/completions", { wiki_id, path }),
  },
  recents: {
    list: () => get<SyncRow[]>("/recents"),
    add: (wiki_id: string, path: string) => post<void>("/recents", { wiki_id, path }),
    clear: (wiki_id?: string) => del<void>("/recents/all", wiki_id ? { wiki_id } : {}),
  },
  importAll: (payload: unknown) => post<void>("/sync/import", payload),
  admin: {
    listUsers: () => get<User[]>("/admin/users"),
    updateUserRole: (userId: string, role: string) =>
      request<User>("PATCH", `/admin/users/${userId}/role`, { role }),
    updateUserStatus: (userId: string, is_active: boolean) =>
      request<User>("PATCH", `/admin/users/${userId}/status`, { is_active }),
  },
};

// test-only: reset the fired-once guard
export function _resetSessionExpiredGuard(): void {
  sessionExpiredFired = false;
}
