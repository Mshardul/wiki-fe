import { ApiError, api } from "./api.js";
import { showToast } from "./render/toast.js";
import { WIKIS, state } from "./state.js";
import { getBookmarks } from "./storage/bookmarks.js";
import { getRecents } from "./storage/recents.js";
import { Sync } from "./storage/settings-theme.js";

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
    document.addEventListener("keydown", this._trapFocus);
  },

  close() {
    const m = document.getElementById("auth-modal");
    m.classList.add("hidden");
    m.setAttribute("aria-hidden", "true");
    this._clearErrors();
    document.removeEventListener("keydown", this._trapFocus);
    if (this._lastFocus?.focus) this._lastFocus.focus();
  },

  // Bound as a property (not a method) so add/removeEventListener see the
  // same reference; cycles Tab/Shift+Tab between first/last focusable
  // elements in .auth-dialog so keyboard focus can't leak to the page behind.
  _trapFocus: (e) => {
    if (e.key !== "Tab") return;
    const dialog = document.querySelector(".auth-dialog");
    if (!dialog) return;
    const focusable = dialog.querySelectorAll(
      "button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), a[href]",
    );
    const visible = Array.from(focusable).filter((el) => el.offsetParent !== null);
    if (!visible.length) return;
    const first = visible[0];
    const last = visible[visible.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
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

// Disables btnId synchronously (blocks double-fire from rapid clicks/Enter),
// awaits fn(), then always re-enables - success paths that close/swap the
// modal make the disabled state moot, error paths need the button back.
async function _withSubmitGuard(btnId, fn) {
  const btn = document.getElementById(btnId);
  if (btn?.disabled) return;
  if (btn) btn.disabled = true;
  try {
    await fn();
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Cross-tab session sync: bumping this key fires a `storage` event in every
// *other* tab (same-tab writes don't self-fire), which re-probes /auth/me
// there so a login/logout in one tab reflects in the rest without a manual reload.
const SESSION_SYNC_KEY = "wiki-session-sync";
function _broadcastSessionChange() {
  try {
    localStorage.setItem(SESSION_SYNC_KEY, String(Date.now()));
  } catch {
    /* storage unavailable (private mode etc.) - single-tab still works */
  }
}

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
      _broadcastSessionChange();
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        const title = document.getElementById("auth-verify-title");
        const copy = document.getElementById("auth-verify-copy");
        if (title) title.textContent = "Account not verified";
        if (copy) {
          copy.textContent =
            "This account hasn't been verified yet. Resend the verification email to finish signing up.";
        }
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
      const title = document.getElementById("auth-verify-title");
      const copy = document.getElementById("auth-verify-copy");
      if (title) title.textContent = "Check your email";
      if (copy) {
        copy.textContent =
          "We sent a verification link to your inbox. Click it to finish signing up.";
      }
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
      showToast("Verification email sent");
    } catch {
      /* generic 200 either way; still confirm so the click isn't silent */
      showToast("Verification email sent");
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
      this._pendingResetToken = null;
      state.session = { user: data.user, status: "in" };
      AuthModal.close();
      this.refreshButtons();
      await Sync.pullAll();
      document.dispatchEvent(new CustomEvent("wiki:session-changed"));
      _broadcastSessionChange();
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.code === "INVALID_TOKEN") {
        this._pendingResetToken = null;
      }
      AuthModal._showError(
        "auth-reset-error",
        e instanceof ApiError && e.code !== "INVALID_TOKEN"
          ? e.message
          : "This reset link was already used or has expired. If you already reset your password, try logging in with your new password.",
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
    _broadcastSessionChange();
  },

  _wireModalInputs() {
    // live checklist + submit gating
    const pw = document.getElementById("auth-reg-password");
    const submit = document.getElementById("auth-reg-submit");
    pw?.addEventListener("input", () => {
      AuthModal._renderChecklist("auth-pw-checklist", pw.value);
      if (submit) submit.disabled = !validatePassword(pw.value).valid;
    });
    // submit handlers - wired to each panel's <form> submit so Enter-in-field works
    document.getElementById("auth-form-login")?.addEventListener("submit", (e) => {
      e.preventDefault();
      _withSubmitGuard("auth-login-submit", () =>
        this.login(
          document.getElementById("auth-login-email").value.trim(),
          document.getElementById("auth-login-password").value,
        ),
      );
    });
    document.getElementById("auth-form-register")?.addEventListener("submit", (e) => {
      e.preventDefault();
      _withSubmitGuard("auth-reg-submit", () =>
        this.register(
          document.getElementById("auth-reg-email").value.trim(),
          document.getElementById("auth-reg-password").value,
        ),
      );
    });
    document
      .getElementById("auth-resend-btn")
      ?.addEventListener("click", () =>
        _withSubmitGuard("auth-resend-btn", () =>
          this.resend(document.getElementById("auth-reg-email").value.trim()),
        ),
      );
    document
      .getElementById("auth-to-forgot")
      ?.addEventListener("click", () => AuthModal._swap("forgot"));
    document
      .getElementById("auth-forgot-to-login")
      ?.addEventListener("click", () => AuthModal._swap("login"));
    document.getElementById("auth-form-forgot")?.addEventListener("submit", (e) => {
      e.preventDefault();
      _withSubmitGuard("auth-forgot-submit", () =>
        this.forgotPassword(document.getElementById("auth-forgot-email").value.trim()),
      );
    });
    document
      .getElementById("auth-verify-result-to-login")
      ?.addEventListener("click", () => AuthModal._swap("login"));

    const resetPw = document.getElementById("auth-reset-password");
    const resetSubmit = document.getElementById("auth-reset-submit");
    resetPw?.addEventListener("input", () => {
      AuthModal._renderChecklist("auth-reset-pw-checklist", resetPw.value);
      if (resetSubmit) resetSubmit.disabled = !validatePassword(resetPw.value).valid;
    });
    document.getElementById("auth-form-reset")?.addEventListener("submit", (e) => {
      e.preventDefault();
      _withSubmitGuard("auth-reset-submit", () =>
        this.resetPassword(this._pendingResetToken, resetPw.value),
      );
    });
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
    document
      .getElementById("auth-reset-to-forgot")
      ?.addEventListener("click", () => AuthModal._swap("forgot"));
    document
      .getElementById("auth-reset-to-login")
      ?.addEventListener("click", () => AuthModal._swap("login"));
  },
};

// Another tab logged in/out - re-probe /auth/me here and re-render so this
// tab's session state and UI catch up without a manual reload.
window.addEventListener("storage", (e) => {
  if (e.key !== SESSION_SYNC_KEY) return;
  api.auth
    .me()
    .then((data) => {
      state.session = { user: data.user, status: "in" };
    })
    .catch(() => {
      state.session = { user: null, status: "out" };
    })
    .finally(() => {
      Auth.refreshButtons();
      document.dispatchEvent(new CustomEvent("wiki:session-changed"));
    });
});

export { validatePassword, PW_RULES, AuthModal, Auth };
