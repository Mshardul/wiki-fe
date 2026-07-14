import { state } from "./state.js";

/* Base URL: localhost → local BE; else prod. BE URL is public by nature
   (browser must reach it) - not a secret. Security = CORS + cookie + BE validation. */
const _isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
const BACKEND_URL = _isLocal ? "http://localhost:8001" : "https://wiki-be.onrender.com";
const API = `${BACKEND_URL}/api/v1`;

class ApiError extends Error {
  constructor(code, message, status) {
    super(message || code);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

let _sessionExpiredFired = false;

const _DEFAULT_TIMEOUT_MS = 15000;

// Bearer session token key - owned here since only api.js reads it (for the Authorization header); auth.js writes via setSessionToken().
const SESSION_TOKEN_KEY = "wiki-session-token";

function getSessionToken() {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setSessionToken(token) {
  try {
    if (token) {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    /* storage unavailable (private mode etc.) - session won't persist */
  }
}

async function _request(
  method,
  path,
  body,
  { silent401 = false, timeoutMs = _DEFAULT_TIMEOUT_MS } = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const token = getSessionToken();
  const headers = body ? { "Content-Type": "application/json" } : {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (networkErr) {
    if (networkErr.name === "AbortError") {
      throw new ApiError("TIMEOUT", "Request timed out. Please try again.", 0);
    }
    throw new ApiError("NETWORK", networkErr.message, 0);
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 && !silent401) {
    // A 401 here means the session expired mid-use - clear the dead token (else every future request 401s again); fires once.
    if (!_sessionExpiredFired) {
      _sessionExpiredFired = true;
      setSessionToken(null);
      state.session = { user: null, status: "out" };
      document.dispatchEvent(new CustomEvent("wiki:session-expired"));
    }
    throw new ApiError("UNAUTHORIZED", "Session expired", 401);
  }

  if (res.status === 204) {
    _sessionExpiredFired = false;
    return null;
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const env = data?.error || {};
    throw new ApiError(env.code || "ERROR", env.message || res.statusText, res.status);
  }
  // A real (non-401) response proves the session is valid again - re-arm the guard.
  _sessionExpiredFired = false;
  return data;
}

const api = {
  get: (p) => _request("GET", p),
  post: (p, b) => _request("POST", p, b),
  del: (p, b) => _request("DELETE", p, b),

  auth: {
    // Boot probe: 401 = anonymous, must not trigger the global session-expired flow.
    me: () => _request("GET", "/auth/me", undefined, { silent401: true }),
    register: (email, password) => api.post("/auth/register", { email, password }),
    // Login 401 = bad credentials, not an expired session - bypass the global handler.
    login: (email, password) =>
      _request("POST", "/auth/login", { email, password }, { silent401: true }),
    logout: () => api.post("/auth/logout"),
    resend: (email) => api.post("/auth/resend-verification", { email }),
    verify: (token) => api.post("/auth/verify", { token }),
    forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
    resetPassword: (token, password) => api.post("/auth/reset-password", { token, password }),
  },
  bookmarks: {
    list: () => api.get("/bookmarks"),
    add: (wiki_id, path) => api.post("/bookmarks", { wiki_id, path }),
    remove: (wiki_id, path) => api.del("/bookmarks", { wiki_id, path }),
    clear: (wiki_id) => api.del("/bookmarks/all", wiki_id ? { wiki_id } : {}),
  },
  reads: {
    list: () => api.get("/reads"),
    add: (wiki_id, path) => api.post("/reads", { wiki_id, path }),
    remove: (wiki_id, path) => api.del("/reads", { wiki_id, path }),
  },
  recents: {
    list: () => api.get("/recents"),
    add: (wiki_id, path) => api.post("/recents", { wiki_id, path }),
    clear: (wiki_id) => api.del("/recents/all", wiki_id ? { wiki_id } : {}),
  },
  importAll: (payload) => api.post("/sync/import", payload),
};

export { api, ApiError, BACKEND_URL, getSessionToken, setSessionToken };
