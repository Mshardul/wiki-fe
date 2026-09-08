"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/common/Modal";
import {
  anonDataExists,
  forgotPasswordFlow,
  loginFlow,
  registerFlow,
  resendFlow,
  resetPasswordFlow,
  verifyFromLinkFlow,
} from "@/lib/auth/authFlows";
import { validatePassword } from "@/lib/auth/passwordRules";
import { showToast } from "@/lib/toast";
import { type AuthPanel, registerAuthModal } from "./authModalController";
import { PasswordChecklist } from "./PasswordChecklist";

const RESEND_COOLDOWN_S = 30;

export function AuthModal() {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<AuthPanel>("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // shared field state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [pendingEmail, setPendingEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [forgotSent, setForgotSent] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const firstFieldRef = useRef<HTMLInputElement>(null);

  const swap = useCallback((next: AuthPanel) => {
    setPanel(next);
    setError("");
    setPassword("");
    setPasswordConfirm("");
    setForgotSent(false);
  }, []);

  useEffect(() => {
    return registerAuthModal((p, token) => {
      setOpen(true);
      swap(p);
      if (token) {
        if (p === "reset") setResetToken(token);
        if (p === "verify-result") {
          setVerifyResult(null);
          void verifyFromLinkFlow(token).then((r) =>
            setVerifyResult({
              ok: r.ok,
              msg: r.ok ? "Email verified! You can log in now." : (r.error ?? ""),
            }),
          );
        }
      }
    });
  }, [swap]);

  useEffect(() => {
    if (open) firstFieldRef.current?.focus();
  }, [open, panel]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const pwValid = validatePassword(password).valid;

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  const onLogin = () =>
    run(async () => {
      const keep = anonDataExists()
        ? confirm("Keep the bookmarks and history saved on this device?")
        : true;
      const r = await loginFlow(email.trim(), password, keep);
      if (r.ok) {
        if (r.code === "MIGRATION_FAILED") {
          showToast("Couldn't save your local data to your account — it's still on this device.", {
            variant: "error",
            durationMs: 5000,
          });
        }
        showToast("Logged in", { variant: "success" });
        setOpen(false);
      } else if (r.code === "UNVERIFIED") {
        setPendingEmail(email.trim());
        swap("verify");
      } else {
        setError(r.error ?? "Couldn't log you in.");
      }
    });

  const onRegister = () =>
    run(async () => {
      if (!pwValid) return setError("Password does not meet all rules.");
      if (password !== passwordConfirm) return setError("Passwords do not match.");
      const r = await registerFlow(email.trim(), password);
      if (r.ok) {
        setPendingEmail(email.trim());
        swap("verify");
      } else {
        setError(r.error ?? "Couldn't create your account.");
      }
    });

  const onForgot = () =>
    run(async () => {
      const r = await forgotPasswordFlow(email.trim());
      if (r.ok) setForgotSent(true);
      else setError(r.error ?? "Couldn't send the reset link.");
    });

  const onReset = () =>
    run(async () => {
      if (!pwValid) return setError("Password does not meet all rules.");
      if (password !== passwordConfirm) return setError("Passwords do not match.");
      const keep = anonDataExists()
        ? confirm("Keep the bookmarks and history saved on this device?")
        : true;
      const r = await resetPasswordFlow(resetToken, password, keep);
      if (r.ok) {
        showToast("Password updated", { variant: "success" });
        setOpen(false);
      } else {
        setError(r.error ?? "This reset link was already used or has expired.");
      }
    });

  const onResend = (addr: string) =>
    run(async () => {
      const r = await resendFlow(addr);
      showToast(r.networkError ?? "Verification email sent");
      if (!r.networkError) setCooldown(RESEND_COOLDOWN_S);
    });

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      label="Account"
      className="auth-dialog"
      backdropClassName="auth-modal"
      initialFocusRef={firstFieldRef}
    >
      {panel === "login" && (
        <form
          className="auth-panel active"
          onSubmit={(e) => {
            e.preventDefault();
            void onLogin();
          }}
        >
          <h2>Log in</h2>
          <input
            ref={firstFieldRef}
            type="email"
            placeholder="Email"
            aria-label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="auth-pw-field">
            <input
              type={showPw ? "text" : "password"}
              placeholder="Password"
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="auth-pw-toggle"
              aria-pressed={showPw}
              aria-label={showPw ? "Hide password" : "Show password"}
              onClick={() => setShowPw((v) => !v)}
            >
              👁
            </button>
          </div>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? "Logging in…" : "Log in"}
          </button>
          <div className="auth-links">
            <button type="button" onClick={() => swap("register")}>
              Create account
            </button>
            <button type="button" onClick={() => swap("forgot")}>
              Forgot password?
            </button>
          </div>
        </form>
      )}

      {panel === "register" && (
        <form
          className="auth-panel active"
          onSubmit={(e) => {
            e.preventDefault();
            void onRegister();
          }}
        >
          <h2>Create account</h2>
          <input
            ref={firstFieldRef}
            type="email"
            placeholder="Email"
            aria-label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type={showPw ? "text" : "password"}
            placeholder="Password"
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type={showPw ? "text" : "password"}
            placeholder="Confirm password"
            aria-label="Confirm password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
          />
          <PasswordChecklist password={password} />
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="auth-submit"
            disabled={busy || !pwValid || password !== passwordConfirm}
          >
            {busy ? "Creating…" : "Create account"}
          </button>
          <div className="auth-links">
            <button type="button" onClick={() => swap("login")}>
              Back to log in
            </button>
          </div>
        </form>
      )}

      {panel === "verify" && (
        <div className="auth-panel active">
          <h2>Check your email</h2>
          <p>
            We sent a verification link to <strong>{pendingEmail}</strong>. Click it to finish
            signing up.
          </p>
          <button
            type="button"
            className="auth-submit"
            disabled={busy || cooldown > 0}
            onClick={() => void onResend(pendingEmail)}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
          </button>
          <div className="auth-links">
            <button type="button" onClick={() => swap("login")}>
              Back to log in
            </button>
          </div>
        </div>
      )}

      {panel === "forgot" && (
        <form
          className="auth-panel active"
          onSubmit={(e) => {
            e.preventDefault();
            void onForgot();
          }}
        >
          <h2>Reset your password</h2>
          {forgotSent ? (
            <p>If that account exists, a reset link is on its way.</p>
          ) : (
            <>
              <input
                ref={firstFieldRef}
                type="email"
                placeholder="Email"
                aria-label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="auth-submit" disabled={busy}>
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </>
          )}
          <div className="auth-links">
            <button type="button" onClick={() => swap("login")}>
              Back to log in
            </button>
          </div>
        </form>
      )}

      {panel === "reset" && (
        <form
          className="auth-panel active"
          onSubmit={(e) => {
            e.preventDefault();
            void onReset();
          }}
        >
          <h2>Set a new password</h2>
          <input
            ref={firstFieldRef}
            type={showPw ? "text" : "password"}
            placeholder="New password"
            aria-label="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type={showPw ? "text" : "password"}
            placeholder="Confirm new password"
            aria-label="Confirm new password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
          />
          <PasswordChecklist password={password} />
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="auth-submit"
            disabled={busy || !pwValid || password !== passwordConfirm}
          >
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      )}

      {panel === "verify-result" && (
        <div className="auth-panel active">
          <h2>
            {verifyResult == null
              ? "Verifying…"
              : verifyResult.ok
                ? "Email verified"
                : "Verification failed"}
          </h2>
          {verifyResult != null && <p>{verifyResult.msg}</p>}
          <div className="auth-links">
            <button type="button" onClick={() => swap("login")}>
              Go to log in
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
