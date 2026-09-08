import { api, getSessionToken, setSessionToken, type User } from "@/lib/api";

// Session state. Identity is never cached in localStorage (CONVENTIONS.md) — memory only,
// with a broadcast key that fires `storage` in other tabs. Ported from js/auth.js.

export type SessionStatus = "loading" | "in" | "out";
export interface Session {
  user: User | null;
  status: SessionStatus;
}

const SYNC_KEY = "wiki-session-sync";
let session: Session = { user: null, status: "loading" };
const listeners = new Set<() => void>();

export function getSession(): Session {
  return session;
}

export function setSession(next: Session): void {
  session = next;
  for (const cb of listeners) cb();
}

export function subscribeSession(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function broadcastSessionChange(): void {
  try {
    localStorage.setItem(SYNC_KEY, String(Date.now()));
  } catch {
    // single-tab still works
  }
}

// A boot probe: skip GET /auth/me entirely if there is no token.
export async function initSession(): Promise<void> {
  if (!getSessionToken()) {
    setSession({ user: null, status: "out" });
    return;
  }
  try {
    const { user } = await api.auth.me();
    setSession({ user, status: "in" });
  } catch {
    setSessionToken(null);
    setSession({ user: null, status: "out" });
  }
}

// Cross-tab: another tab logged in/out — re-probe and catch up.
export function bindCrossTabSession(onChange: (wasIn: boolean) => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key !== SYNC_KEY) return;
    const wasIn = session.status === "in";
    api.auth
      .me()
      .then(({ user }) => setSession({ user, status: "in" }))
      .catch(() => setSession({ user: null, status: "out" }))
      .finally(() => onChange(wasIn));
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
