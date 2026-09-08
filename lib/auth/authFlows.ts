import { ApiError, api, setSessionToken } from "@/lib/api";
import { verticalRegistry } from "@/lib/content/verticals";
import { getBookmarks } from "@/lib/storage/bookmarks";
import { listCompletions } from "@/lib/storage/completions";
import { getRecents } from "@/lib/storage/recents";
import { broadcastSessionChange, setSession } from "@/lib/storage/session";
import { clearUserDataCache, pullAll } from "@/lib/storage/sync";

// NETWORK carries the raw fetch-failure string — never surface it verbatim. Ported from js/auth.js _authErrorMessage.
export function authErrorMessage(e: unknown, fallback: string): string {
  if (!(e instanceof ApiError)) return fallback;
  if (e.code === "NETWORK")
    return "Couldn't reach the server. Check your connection and try again.";
  if (e.code === "TIMEOUT") return "The request timed out. Please try again.";
  return e.message;
}

function hasLocalData(): boolean {
  return (
    getBookmarks().length > 0 ||
    getRecents().length > 0 ||
    verticalRegistry().some((v) => listCompletions(v.id).length > 0)
  );
}

// Returns false only if the user chose "Keep" and the import failed — caller must then skip pullAll().
// Ported from js/auth.js maybeMigrate.
export async function migrateAnonData(keep: boolean): Promise<boolean> {
  if (!hasLocalData()) return true;
  if (!keep) {
    clearUserDataCache();
    return true;
  }
  const payload = {
    bookmarks: getBookmarks().map((b) => ({ wiki_id: b.wikiId, path: b.path })),
    recents: getRecents().map((r) => ({ wiki_id: r.wikiId, path: r.path })),
  };
  return api.importAll(payload).then(
    () => true,
    () => false,
  );
}

export function anonDataExists(): boolean {
  return hasLocalData();
}

interface FlowResult {
  ok: boolean;
  error?: string;
  code?: string;
}

// After a login / reset that returns a session: store the token, flip session, sync.
async function completeSession(
  res: { user: import("@/lib/api").User; session_token: string },
  keep: boolean,
) {
  setSessionToken(res.session_token);
  setSession({ user: res.user, status: "in" });
  const migrated = await migrateAnonData(keep);
  if (migrated) await pullAll();
  document.dispatchEvent(new CustomEvent("wiki:session-changed"));
  broadcastSessionChange();
  return migrated;
}

export async function loginFlow(
  email: string,
  password: string,
  keepAnon: boolean,
): Promise<FlowResult> {
  try {
    const res = await api.auth.login(email, password);
    const migrated = await completeSession(res, keepAnon);
    return { ok: true, code: migrated ? undefined : "MIGRATION_FAILED" };
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return { ok: false, code: "UNVERIFIED" };
    return { ok: false, error: authErrorMessage(e, "Couldn't log you in. Please try again.") };
  }
}

export async function registerFlow(email: string, password: string): Promise<FlowResult> {
  try {
    await api.auth.register(email, password);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: authErrorMessage(e, "Couldn't create your account. Please try again."),
    };
  }
}

export async function resendFlow(email: string): Promise<{ networkError?: string }> {
  try {
    await api.auth.resendVerification(email);
    return {};
  } catch (e) {
    if (e instanceof ApiError && (e.code === "NETWORK" || e.code === "TIMEOUT")) {
      return { networkError: authErrorMessage(e, "Couldn't reach the server.") };
    }
    // auth-domain errors: BE returns 200 either way (anti-enumeration); still confirm the click
    return {};
  }
}

export async function forgotPasswordFlow(email: string): Promise<FlowResult> {
  try {
    await api.auth.forgotPassword(email);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: authErrorMessage(e, "Couldn't send the reset link. Please try again."),
    };
  }
}

export async function resetPasswordFlow(
  token: string,
  password: string,
  keepAnon: boolean,
): Promise<FlowResult> {
  try {
    const res = await api.auth.resetPassword(token, password);
    await completeSession(res, keepAnon);
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError && e.code !== "INVALID_TOKEN") {
      return { ok: false, error: authErrorMessage(e, e.message) };
    }
    return {
      ok: false,
      error:
        "This reset link was already used or has expired. If you already reset your password, try logging in with your new password.",
    };
  }
}

export async function verifyFromLinkFlow(token: string): Promise<FlowResult> {
  try {
    await api.auth.verifyEmail(token);
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError && e.code === "INVALID_TOKEN") {
      return { ok: false, error: "This verification link is invalid or has expired." };
    }
    return { ok: false, error: authErrorMessage(e, "This link is invalid or has expired.") };
  }
}

export async function logoutFlow(): Promise<void> {
  await api.auth.logout().catch(() => {});
  setSessionToken(null);
  setSession({ user: null, status: "out" });
  clearUserDataCache();
  document.dispatchEvent(new CustomEvent("wiki:session-changed"));
  broadcastSessionChange();
}
