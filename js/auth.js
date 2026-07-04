import { ApiError, api } from "./api.js";
import { WIKIS, state } from "./state.js";
import { Sync, getBookmarks, getRecents } from "./storage.js";

/* ═══════════════════════════════════════════════════════════════
   PASSWORD POLICY (§7) - mirrors wiki-be; keep in sync via auth.md
   ═══════════════════════════════════════════════════════════════ */
const PW_RULES = [
  { id: "len", label: "At least 12 characters", test: (p) => p.length >= 12 },
  { id: "upper", label: "An uppercase letter (A–Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "A lowercase letter (a–z)", test: (p) => /[a-z]/.test(p) },
  { id: "digit", label: "A number (0–9)", test: (p) => /[0-9]/.test(p) },
  {
    id: "special",
    label: "A special character ( ! @ # $ % ^ & * ? - _ )",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

function validatePassword(pw) {
  const rules = PW_RULES.map((r) => ({ id: r.id, label: r.label, ok: r.test(pw) }));
  return { valid: rules.every((r) => r.ok), rules };
}

/* ═══════════════════════════════════════════════════════════════
   ANON → LOGIN MIGRATION
   One prompt on login if local anon data exists. Never blocks login.
   The "Keep them" action rides the toast's single action button;
   toast expiry (no action) is treated as "Discard".
   ═══════════════════════════════════════════════════════════════ */
function _collectLocalReads() {
  const out = [];
  for (const wiki of WIKIS) {
    let arr = [];
    try {
      arr = JSON.parse(localStorage.getItem(`wiki-read-${wiki.id}`) || "[]");
    } catch {
      arr = [];
    }
    for (const path of arr) out.push({ wiki_id: wiki.id, path });
  }
  return out;
}

function _hasLocalData() {
  return getBookmarks().length > 0 || getRecents().length > 0 || _collectLocalReads().length > 0;
}

async function maybeMigrate() {
  if (!_hasLocalData()) return;

  const keep = await new Promise((resolve) => {
    let settled = false;
    const done = (v) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    document.dispatchEvent(
      new CustomEvent("wiki:toast", {
        detail: {
          message:
            "You have unsaved items on this device from browsing signed out. Keep them in your account?",
          durationMs: 12000,
          actionLabel: "Keep them",
          onUndo: () => done(true),
        },
      }),
    );
    setTimeout(() => done(false), 12500);
  });

  if (keep) {
    const payload = {
      bookmarks: getBookmarks().map((b) => ({ wiki_id: b.wikiId, path: b.path })),
      reads: _collectLocalReads(),
      recents: getRecents().map((r) => ({ wiki_id: r.wikiId, path: r.path })),
    };
    await api.importAll(payload).catch(() => {});
  } else {
    Sync.clearUserDataCache();
  }
}

/* ═══════════════════════════════════════════════════════════════
   AUTH MODAL CONTROLLER
   ═══════════════════════════════════════════════════════════════ */
const AuthModal = {
  _lastFocus: null,

  open(panel = "login") {
    this._lastFocus = document.activeElement;
    const m = document.getElementById("auth-modal");
    m.classList.remove("hidden");
    m.setAttribute("aria-hidden", "false");
    this._swap(panel);
  },

  close() {
    const m = document.getElementById("auth-modal");
    m.classList.add("hidden");
    m.setAttribute("aria-hidden", "true");
    this._clearErrors();
    if (this._lastFocus?.focus) this._lastFocus.focus();
  },

  isOpen() {
    return !document.getElementById("auth-modal").classList.contains("hidden");
  },

  _swap(panel) {
    document.querySelectorAll(".auth-panel").forEach((p) => {
      p.classList.toggle("active", p.id === `auth-panel-${panel}`);
    });
    this._clearErrors();
    if (panel === "register") this._renderChecklist("auth-pw-checklist", "");
    if (panel === "reset") this._renderChecklist("auth-reset-pw-checklist", "");
    const focusId =
      panel === "login"
        ? "auth-login-email"
        : panel === "register"
          ? "auth-reg-email"
          : panel === "forgot"
            ? "auth-forgot-email"
            : panel === "reset"
              ? "auth-reset-password"
              : panel === "verify"
                ? "auth-resend-btn"
                : null;
    document.getElementById(focusId)?.focus();
  },

  _renderChecklist(listId, pw) {
    const { rules } = validatePassword(pw);
    const ul = document.getElementById(listId);
    if (!ul) return;
    ul.innerHTML = rules.map((r) => `<li class="${r.ok ? "ok" : ""}">${r.label}</li>`).join("");
  },

  _clearErrors() {
    ["auth-login-error", "auth-reg-error", "auth-forgot-error", "auth-reset-error"].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) {
          el.hidden = true;
          el.textContent = "";
        }
      },
    );
  },

  _showError(id, msg) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = msg;
      el.hidden = false;
    }
  },
};

/* ═══════════════════════════════════════════════════════════════
   AUTH - boot + flows
   ═══════════════════════════════════════════════════════════════ */
const Auth = {
  _pendingResetToken: null,

  // Called once on app boot (real page load only). One GET /auth/me.
  async init() {
    try {
      const data = await api.auth.me();
      state.session = { user: data.user, status: "in" };
      await Sync.pullAll();
      document.dispatchEvent(new CustomEvent("wiki:session-changed"));
    } catch {
      state.session = { user: null, status: "out" };
    }
    this.refreshButtons();
    this._wireModalInputs();
  },

  refreshButtons() {
    const loggedIn = state.session.status === "in";
    document.querySelectorAll(".topbar-auth-btn .auth-btn-label").forEach((el) => {
      el.textContent = loggedIn ? "Logout" : "Login";
    });
    document.querySelectorAll(".topbar-auth-btn").forEach((b) => {
      b.title = loggedIn ? "Logout" : "Login";
    });
  },

  // Topbar button handler.
  toggle() {
    if (state.session.status === "in") {
      this.logout();
    } else {
      AuthModal.open("login");
    }
  },

  async login(email, password) {
    try {
      const data = await api.auth.login(email, password);
      state.session = { user: data.user, status: "in" };
      AuthModal.close();
      this.refreshButtons();
      // migration prompt then pull server truth
      await maybeMigrate();
      await Sync.pullAll();
      document.dispatchEvent(new CustomEvent("wiki:session-changed"));
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        AuthModal._swap("verify");
      } else {
        AuthModal._showError(
          "auth-login-error",
          e instanceof ApiError ? e.message : "Login failed",
        );
      }
    }
  },

  async register(email, password) {
    const { valid } = validatePassword(password);
    if (!valid) {
      AuthModal._showError("auth-reg-error", "Password does not meet all rules.");
      return;
    }
    try {
      await api.auth.register(email, password);
      AuthModal._swap("verify");
    } catch (e) {
      AuthModal._showError(
        "auth-reg-error",
        e instanceof ApiError ? e.message : "Registration failed",
      );
    }
  },

  async resend(email) {
    try {
      await api.auth.resend(email);
    } catch {
      /* generic 200 either way; ignore */
    }
  },

  async verifyFromLink(token) {
    AuthModal.open("verify-result");
    const copy = document.getElementById("auth-verify-result-copy");
    const backBtn = document.getElementById("auth-verify-result-to-login");
    try {
      await api.auth.verify(token);
      if (copy) copy.textContent = "Email verified! You can log in now.";
    } catch (e) {
      if (copy) {
        copy.textContent =
          e instanceof ApiError ? e.message : "This link is invalid or has expired.";
      }
    }
    if (backBtn) backBtn.hidden = false;
  },

  async forgotPassword(email) {
    try {
      await api.auth.forgotPassword(email);
      document.getElementById("auth-forgot-sent").hidden = false;
    } catch (e) {
      AuthModal._showError(
        "auth-forgot-error",
        e instanceof ApiError ? e.message : "Could not send reset link.",
      );
    }
  },

  async resetPassword(token, password) {
    const { valid } = validatePassword(password);
    if (!valid) {
      AuthModal._showError("auth-reset-error", "Password does not meet all rules.");
      return;
    }
    try {
      const data = await api.auth.resetPassword(token, password);
      state.session = { user: data.user, status: "in" };
      AuthModal.close();
      this.refreshButtons();
      await Sync.pullAll();
      document.dispatchEvent(new CustomEvent("wiki:session-changed"));
    } catch (e) {
      AuthModal._showError(
        "auth-reset-error",
        e instanceof ApiError ? e.message : "Reset failed. The link may have expired.",
      );
    }
  },

  // Reads ?mode=verify|reset&token=... once on boot; opens the matching panel.
  // Strips the query string afterward so a page refresh doesn't re-trigger it.
  handleBootParams() {
    const params = new URLSearchParams(location.search);
    const mode = params.get("mode");
    const token = params.get("token");
    if (!mode || !token) return;

    if (mode === "verify") {
      this.verifyFromLink(token);
    } else if (mode === "reset") {
      AuthModal.open("reset");
      this._pendingResetToken = token;
    }

    const url = new URL(location.href);
    url.searchParams.delete("mode");
    url.searchParams.delete("token");
    history.replaceState(null, "", url.toString());
  },

  async logout() {
    // B-lite: best-effort flush, then clear + logout regardless of result.
    await Sync.flushBestEffort().catch(() => {});
    await api.auth.logout().catch(() => {});
    state.session = { user: null, status: "out" };
    Sync.clearUserDataCache();
    this.refreshButtons();
    document.dispatchEvent(new CustomEvent("wiki:session-changed"));
  },

  _wireModalInputs() {
    // live checklist + submit gating
    const pw = document.getElementById("auth-reg-password");
    const submit = document.getElementById("auth-reg-submit");
    pw?.addEventListener("input", () => {
      AuthModal._renderChecklist("auth-pw-checklist", pw.value);
      if (submit) submit.disabled = !validatePassword(pw.value).valid;
    });
    // submit handlers
    document
      .getElementById("auth-login-submit")
      ?.addEventListener("click", () =>
        this.login(
          document.getElementById("auth-login-email").value.trim(),
          document.getElementById("auth-login-password").value,
        ),
      );
    document
      .getElementById("auth-reg-submit")
      ?.addEventListener("click", () =>
        this.register(
          document.getElementById("auth-reg-email").value.trim(),
          document.getElementById("auth-reg-password").value,
        ),
      );
    document
      .getElementById("auth-resend-btn")
      ?.addEventListener("click", () =>
        this.resend(document.getElementById("auth-reg-email").value.trim()),
      );
    document
      .getElementById("auth-to-forgot")
      ?.addEventListener("click", () => AuthModal._swap("forgot"));
    document
      .getElementById("auth-forgot-to-login")
      ?.addEventListener("click", () => AuthModal._swap("login"));
    document
      .getElementById("auth-forgot-submit")
      ?.addEventListener("click", () =>
        this.forgotPassword(document.getElementById("auth-forgot-email").value.trim()),
      );
    document
      .getElementById("auth-verify-result-to-login")
      ?.addEventListener("click", () => AuthModal._swap("login"));

    const resetPw = document.getElementById("auth-reset-password");
    const resetSubmit = document.getElementById("auth-reset-submit");
    resetPw?.addEventListener("input", () => {
      AuthModal._renderChecklist("auth-reset-pw-checklist", resetPw.value);
      if (resetSubmit) resetSubmit.disabled = !validatePassword(resetPw.value).valid;
    });
    resetSubmit?.addEventListener("click", () =>
      this.resetPassword(this._pendingResetToken, resetPw.value),
    );
    // panel swaps
    document
      .getElementById("auth-to-register")
      ?.addEventListener("click", () => AuthModal._swap("register"));
    document
      .getElementById("auth-to-login")
      ?.addEventListener("click", () => AuthModal._swap("login"));
    document
      .getElementById("auth-verify-to-login")
      ?.addEventListener("click", () => AuthModal._swap("login"));
  },
};

export { validatePassword, PW_RULES, AuthModal, Auth };
