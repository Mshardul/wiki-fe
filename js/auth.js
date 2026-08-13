import { ApiError, api, getSessionToken, setSessionToken } from "./api.js";
import {
  createFocusTrap,
  getFocusableIn,
  markModalClosed,
  markModalOpened,
  registerModal,
} from "./modal-registry.js";
import { showToast } from "./render/toast.js";
import {
  WIKIS,
  discardBootMutations,
  flushBootMutations,
  lockBodyScroll,
  state,
  unlockBodyScroll,
} from "./state.js";
import { getBookmarks } from "./storage/bookmarks.js";
import { getRecents } from "./storage/recents.js";
import { Sync } from "./storage/settings-theme.js";

/* PASSWORD POLICY (§7) - mirrors wiki-be; keep in sync via auth.md */
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

// NETWORK carries the raw browser fetch-failure string (e.g. "Failed to fetch") - never show it verbatim.
function _authErrorMessage(e, fallback) {
  if (!(e instanceof ApiError)) return fallback;
  if (e.code === "NETWORK")
    return "Couldn't reach the server. Check your connection and try again.";
  return e.message;
}

/* ANON -> LOGIN MIGRATION — One prompt on login if local anon data exists; never blocks login. — Dedicated modal, not a toast, since the shared queue could bury it. */
function _hasLocalCompletions() {
  for (const wiki of WIKIS) {
    try {
      const arr = JSON.parse(localStorage.getItem(`wiki-completed-${wiki.id}`) || "[]");
      if (arr.length) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

function _hasLocalData() {
  return getBookmarks().length > 0 || getRecents().length > 0 || _hasLocalCompletions();
}

function _showMigrateModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById("migrate-modal");
    const keepBtn = document.getElementById("migrate-keep");
    const discardBtn = document.getElementById("migrate-discard");

    const done = (v) => {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      keepBtn.removeEventListener("click", onKeep);
      discardBtn.removeEventListener("click", onDiscard);
      resolve(v);
    };
    const onKeep = () => done(true);
    const onDiscard = () => done(false);

    keepBtn.addEventListener("click", onKeep);
    discardBtn.addEventListener("click", onDiscard);

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    keepBtn.focus();
  });
}

// Returns false only if "Keep them" was chosen and import failed - caller must skip pullAll() (would overwrite kept data) and surface the failure.
async function maybeMigrate() {
  if (!_hasLocalData()) return true;

  const keep = await _showMigrateModal();

  if (keep) {
    const payload = {
      bookmarks: getBookmarks().map((b) => ({ wiki_id: b.wikiId, path: b.path })),
      recents: getRecents().map((r) => ({ wiki_id: r.wikiId, path: r.path })),
    };
    const imported = await api.importAll(payload).then(
      () => true,
      () => false,
    );
    return imported;
  }
  Sync.clearUserDataCache();
  return true;
}

/* AUTH MODAL CONTROLLER */
const AuthModal = {
  _lastFocus: null,

  open(panel = "login") {
    const wasOpen = this.isOpen();
    if (!wasOpen) {
      this._lastFocus = document.activeElement;
      lockBodyScroll();
    }
    const m = document.getElementById("auth-modal");
    m.classList.remove("hidden");
    m.setAttribute("aria-hidden", "false");
    this._swap(panel);
    if (!wasOpen) {
      document.addEventListener("keydown", this._trapFocus);
      markModalOpened(authModal);
    }
  },

  close() {
    if (!this.isOpen()) return;
    markModalClosed(authModal);
    unlockBodyScroll();
    const m = document.getElementById("auth-modal");
    m.classList.add("hidden");
    m.setAttribute("aria-hidden", "true");
    this._clearErrors();
    document.removeEventListener("keydown", this._trapFocus);
    if (this._lastFocus?.focus) this._lastFocus.focus();
  },

  // Bound as a property (not method) so add/removeEventListener share the same reference; re-queries the dialog each Tab press since _swap changes content.
  _trapFocus: createFocusTrap(document, () => {
    const dialog = document.querySelector(".auth-dialog");
    return dialog ? getFocusableIn(dialog) : [];
  }),

  isOpen() {
    return !document.getElementById("auth-modal").classList.contains("hidden");
  },

  _swap(panel) {
    document.querySelectorAll(".auth-panel").forEach((p) => {
      p.classList.toggle("active", p.id === `auth-panel-${panel}`);
    });
    this._clearErrors();
    if (panel === "register")
      this._syncPasswordChecklist(
        "auth-reg-password",
        "auth-pw-checklist",
        "auth-reg-submit",
        "auth-reg-password-confirm",
      );
    if (panel === "reset")
      this._syncPasswordChecklist(
        "auth-reset-password",
        "auth-reset-pw-checklist",
        "auth-reset-submit",
        "auth-reset-password-confirm",
      );
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

  // Re-derives checklist + submit-disabled from the current value, used on both live typing and panel re-entry so a valid password never shows stale.
  _syncPasswordChecklist(inputId, listId, submitId, confirmId) {
    const pw = document.getElementById(inputId)?.value || "";
    this._renderChecklist(listId, pw);
    const confirmPw = confirmId ? document.getElementById(confirmId)?.value || "" : pw;
    const submit = document.getElementById(submitId);
    if (submit) submit.disabled = !validatePassword(pw).valid || pw !== confirmPw;
  },

  _renderChecklist(listId, pw) {
    const { rules } = validatePassword(pw);
    const ul = document.getElementById(listId);
    if (!ul) return;
    ul.innerHTML = rules
      .map(
        (r) =>
          `<li class="${r.ok ? "ok" : ""}">${r.label}<span class="visually-hidden">${r.ok ? " — met" : " — not met"}</span></li>`,
      )
      .join("");
  },

  // Inputs whose aria-describedby points at each error id - kept in sync with index.html.
  _ERROR_INPUT_IDS: {
    "auth-login-error": ["auth-login-email", "auth-login-password"],
    "auth-reg-error": ["auth-reg-email", "auth-reg-password", "auth-reg-password-confirm"],
    "auth-forgot-error": ["auth-forgot-email"],
    "auth-reset-error": ["auth-reset-password", "auth-reset-password-confirm"],
  },

  _clearErrors() {
    Object.entries(this._ERROR_INPUT_IDS).forEach(([id, inputIds]) => {
      const el = document.getElementById(id);
      if (el) {
        el.hidden = true;
        el.textContent = "";
      }
      inputIds.forEach((inputId) =>
        document.getElementById(inputId)?.removeAttribute("aria-invalid"),
      );
    });
    const forgotSent = document.getElementById("auth-forgot-sent");
    if (forgotSent) forgotSent.hidden = true;
  },

  _showError(id, msg) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = msg;
      el.hidden = false;
    }
    (this._ERROR_INPUT_IDS[id] || []).forEach((inputId) =>
      document.getElementById(inputId)?.setAttribute("aria-invalid", "true"),
    );
  },
};

const authModal = { isOpen: () => AuthModal.isOpen(), close: () => AuthModal.close() };
registerModal(authModal);

// Disables btnId during fn(), re-enabling after unless fn() started a longer-lived disable (e.g. resend cooldown).
async function _withSubmitGuard(btnId, fn) {
  const btn = document.getElementById(btnId);
  if (btn?.disabled) return;
  if (btn) btn.disabled = true;
  try {
    await fn();
  } finally {
    if (btn && !btn.dataset.cooldownActive) btn.disabled = false;
  }
}

async function _withLoadingState(formId, btnId, loadingLabel, fn) {
  const form = document.getElementById(formId);
  const btn = document.getElementById(btnId);
  const labelEl = btn?.querySelector(".auth-submit-label");
  const originalLabel = labelEl?.textContent;
  const inputs = form ? Array.from(form.querySelectorAll("input")) : [];
  inputs.forEach((el) => {
    el.disabled = true;
  });
  btn?.classList.add("is-loading");
  if (labelEl) labelEl.textContent = loadingLabel;
  try {
    await fn();
  } finally {
    inputs.forEach((el) => {
      el.disabled = false;
    });
    btn?.classList.remove("is-loading");
    if (labelEl && originalLabel !== undefined) labelEl.textContent = originalLabel;
  }
}

const RESEND_COOLDOWN_SECONDS = 30;

// Client-side only - independent of any backend-side rate limiting.
function _startResendCooldown(btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const labelEl = btn.querySelector(".auth-submit-label");
  const originalLabel = labelEl ? labelEl.textContent : btn.textContent;
  let remaining = RESEND_COOLDOWN_SECONDS;
  btn.disabled = true;
  btn.dataset.cooldownActive = "1";
  const setLabel = (text) => {
    if (labelEl) labelEl.textContent = text;
    else btn.textContent = text;
  };
  setLabel(`Resend in ${remaining}s`);
  const tick = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(tick);
      delete btn.dataset.cooldownActive;
      btn.disabled = false;
      setLabel(originalLabel);
    } else {
      setLabel(`Resend in ${remaining}s`);
    }
  }, 1000);
}

function _wirePasswordToggle(toggleId, inputId) {
  const toggle = document.getElementById(toggleId);
  const input = document.getElementById(inputId);
  if (!toggle || !input) return;
  toggle.addEventListener("click", () => {
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    toggle.setAttribute("aria-pressed", String(!showing));
    toggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
  });
}

// Cross-tab session sync key - bumping it fires a `storage` event in every other tab, triggering an /auth/me re-probe there.
const SESSION_SYNC_KEY = "wiki-session-sync";
function _broadcastSessionChange() {
  try {
    localStorage.setItem(SESSION_SYNC_KEY, String(Date.now()));
  } catch {
    /* storage unavailable (private mode etc.) - single-tab still works */
  }
}

/* AUTH - boot + flows */
const Auth = {
  _pendingResetToken: null,
  _pendingVerifyEmail: null,

  // Skips the GET /auth/me entirely if no token is stored - that's definitely anonymous.
  async init() {
    if (getSessionToken()) {
      try {
        const data = await api.auth.me();
        state.session = { user: data.user, status: "in" };
        await flushBootMutations();
        await Sync.pullAll();
        document.dispatchEvent(new CustomEvent("wiki:session-changed"));
      } catch {
        state.session = { user: null, status: "out" };
        discardBootMutations();
      }
    } else {
      state.session = { user: null, status: "out" };
      discardBootMutations();
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
    const adminBtn = document.getElementById("admin-nav-btn");
    if (adminBtn) adminBtn.hidden = state.session.user?.role !== "admin";
  },

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
      setSessionToken(data.session_token);
      state.session = { user: data.user, status: "in" };
      AuthModal.close();
      this.refreshButtons();
      const migrated = await maybeMigrate();
      if (migrated) {
        await Sync.pullAll();
      } else {
        showToast(
          "Couldn't save your local data to your account. It's still on this device - log out and back in to retry.",
          5000,
          null,
          undefined,
          "warning",
        );
      }
      document.dispatchEvent(new CustomEvent("wiki:session-changed"));
      _broadcastSessionChange();
      showToast("Logged in", 3000, null, undefined, "success");
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        this._pendingVerifyEmail = email;
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
          _authErrorMessage(e, "Couldn't log you in. Please try again."),
        );
      }
    }
  },

  async register(email, password, passwordConfirm) {
    const { valid } = validatePassword(password);
    if (!valid) {
      AuthModal._showError("auth-reg-error", "Password does not meet all rules.");
      return;
    }
    if (password !== passwordConfirm) {
      AuthModal._showError("auth-reg-error", "Passwords do not match.");
      return;
    }
    try {
      await api.auth.register(email, password);
      this._pendingVerifyEmail = email;
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
        _authErrorMessage(e, "Couldn't create your account. Please try again."),
      );
    }
  },

  async resend(email, btnId) {
    try {
      await api.auth.resend(email);
      showToast("Verification email sent");
    } catch (e) {
      if (e instanceof ApiError && (e.code === "NETWORK" || e.code === "TIMEOUT")) {
        showToast(
          _authErrorMessage(e, "Couldn't reach the server. Check your connection and try again."),
        );
      } else {
        /* auth-domain errors: generic 200 either way (anti-enumeration); still confirm so the click isn't silent */
        showToast("Verification email sent");
      }
    }
    if (btnId) _startResendCooldown(btnId);
  },

  async verifyFromLink(token) {
    AuthModal.open("verify-result");
    const title = document.getElementById("auth-verify-result-title");
    const copy = document.getElementById("auth-verify-result-copy");
    const backBtn = document.getElementById("auth-verify-result-to-login");
    const resendForm = document.getElementById("auth-form-verify-result-resend");
    try {
      await api.auth.verify(token);
      if (title) title.textContent = "Email verified";
      if (copy) copy.textContent = "Email verified! You can log in now.";
    } catch (e) {
      if (title) title.textContent = "Verification failed";
      if (copy) {
        copy.textContent =
          e instanceof ApiError
            ? e.code === "INVALID_TOKEN"
              ? "This verification link is invalid or has expired."
              : _authErrorMessage(e, "This link is invalid or has expired.")
            : "This link is invalid or has expired.";
      }
      if (resendForm) resendForm.hidden = false;
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
        _authErrorMessage(e, "Couldn't send the reset link. Please try again."),
      );
    }
  },

  async resetPassword(token, password, passwordConfirm) {
    const { valid } = validatePassword(password);
    if (!valid) {
      AuthModal._showError("auth-reset-error", "Password does not meet all rules.");
      return;
    }
    if (password !== passwordConfirm) {
      AuthModal._showError("auth-reset-error", "Passwords do not match.");
      return;
    }
    try {
      const data = await api.auth.resetPassword(token, password);
      this._pendingResetToken = null;
      setSessionToken(data.session_token);
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
          ? _authErrorMessage(e, e.message)
          : "This reset link was already used or has expired. If you already reset your password, try logging in with your new password.",
      );
    }
  },

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
    // Best-effort flush; clear + logout regardless of result.
    await Sync.flushBestEffort().catch(() => {});
    await api.auth.logout().catch(() => {});
    setSessionToken(null);
    state.session = { user: null, status: "out" };
    Sync.clearUserDataCache();
    this.refreshButtons();
    document.dispatchEvent(new CustomEvent("wiki:session-changed"));
    _broadcastSessionChange();
    showToast("Logged out", 3000, null, undefined, "success");
  },

  _wireModalInputs() {
    const pw = document.getElementById("auth-reg-password");
    const pwConfirm = document.getElementById("auth-reg-password-confirm");
    const syncRegChecklist = () =>
      AuthModal._syncPasswordChecklist(
        "auth-reg-password",
        "auth-pw-checklist",
        "auth-reg-submit",
        "auth-reg-password-confirm",
      );
    pw?.addEventListener("input", syncRegChecklist);
    pwConfirm?.addEventListener("input", syncRegChecklist);
    document.getElementById("auth-form-login")?.addEventListener("submit", (e) => {
      e.preventDefault();
      _withSubmitGuard("auth-login-submit", () =>
        _withLoadingState("auth-form-login", "auth-login-submit", "Logging in…", () =>
          this.login(
            document.getElementById("auth-login-email").value.trim(),
            document.getElementById("auth-login-password").value,
          ),
        ),
      );
    });
    document.getElementById("auth-form-register")?.addEventListener("submit", (e) => {
      e.preventDefault();
      _withSubmitGuard("auth-reg-submit", () =>
        _withLoadingState("auth-form-register", "auth-reg-submit", "Creating…", () =>
          this.register(
            document.getElementById("auth-reg-email").value.trim(),
            document.getElementById("auth-reg-password").value,
            document.getElementById("auth-reg-password-confirm").value,
          ),
        ),
      );
    });
    _wirePasswordToggle("auth-reg-pw-toggle", "auth-reg-password");
    _wirePasswordToggle("auth-reg-pw-confirm-toggle", "auth-reg-password-confirm");
    document
      .getElementById("auth-resend-btn")
      ?.addEventListener("click", () =>
        _withSubmitGuard("auth-resend-btn", () =>
          this.resend(this._pendingVerifyEmail, "auth-resend-btn"),
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
        _withLoadingState("auth-form-forgot", "auth-forgot-submit", "Sending…", () =>
          this.forgotPassword(document.getElementById("auth-forgot-email").value.trim()),
        ),
      );
    });
    document
      .getElementById("auth-verify-result-to-login")
      ?.addEventListener("click", () => AuthModal._swap("login"));
    document.getElementById("auth-form-verify-result-resend")?.addEventListener("submit", (e) => {
      e.preventDefault();
      _withSubmitGuard("auth-verify-result-resend-btn", () =>
        this.resend(
          document.getElementById("auth-verify-result-resend-email").value.trim(),
          "auth-verify-result-resend-btn",
        ),
      );
    });

    const resetPw = document.getElementById("auth-reset-password");
    const resetPwConfirm = document.getElementById("auth-reset-password-confirm");
    const syncResetChecklist = () =>
      AuthModal._syncPasswordChecklist(
        "auth-reset-password",
        "auth-reset-pw-checklist",
        "auth-reset-submit",
        "auth-reset-password-confirm",
      );
    resetPw?.addEventListener("input", syncResetChecklist);
    resetPwConfirm?.addEventListener("input", syncResetChecklist);
    document.getElementById("auth-form-reset")?.addEventListener("submit", (e) => {
      e.preventDefault();
      _withSubmitGuard("auth-reset-submit", () =>
        _withLoadingState("auth-form-reset", "auth-reset-submit", "Updating…", () =>
          this.resetPassword(this._pendingResetToken, resetPw.value, resetPwConfirm.value),
        ),
      );
    });
    _wirePasswordToggle("auth-reset-pw-toggle", "auth-reset-password");
    _wirePasswordToggle("auth-reset-pw-confirm-toggle", "auth-reset-password-confirm");
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

// Another tab logged in/out - re-probe /auth/me and re-render so this tab catches up.
window.addEventListener("storage", (e) => {
  if (e.key !== SESSION_SYNC_KEY) return;
  const wasIn = state.session.status === "in";
  api.auth
    .me()
    .then(async (data) => {
      state.session = { user: data.user, status: "in" };
      if (!wasIn) await Sync.pullAll();
    })
    .catch(() => {
      state.session = { user: null, status: "out" };
      if (wasIn) Sync.clearUserDataCache();
    })
    .finally(() => {
      Auth.refreshButtons();
      document.dispatchEvent(new CustomEvent("wiki:session-changed"));
    });
});

export { AuthModal, Auth };
