import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const flows = vi.hoisted(() => ({
  loginFlow: vi.fn(),
  registerFlow: vi.fn(),
  forgotPasswordFlow: vi.fn(),
  resetPasswordFlow: vi.fn(),
  resendFlow: vi.fn().mockResolvedValue({}),
  verifyFromLinkFlow: vi.fn(),
  anonDataExists: vi.fn().mockReturnValue(false),
}));
vi.mock("@/lib/auth/authFlows", () => flows);
vi.mock("@/lib/toast", () => ({ showToast: vi.fn() }));

import { AuthModal } from "./AuthModal";
import { openAuthModal } from "./authModalController";

beforeEach(() => {
  vi.clearAllMocks();
  flows.anonDataExists.mockReturnValue(false);
  flows.resendFlow.mockResolvedValue({});
});

function openTo(panel: Parameters<typeof openAuthModal>[0]) {
  render(<AuthModal />);
  act(() => openAuthModal(panel));
}

describe("AuthModal", () => {
  it("opens on the login panel and switches to register then back", () => {
    openTo("login");
    expect(screen.getByRole("heading", { name: "Log in" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByRole("heading", { name: "Create account" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back to log in" }));
    expect(screen.getByRole("heading", { name: "Log in" })).toBeTruthy();
  });

  it("register success moves to the verify panel", async () => {
    flows.registerFlow.mockResolvedValue({ ok: true });
    openTo("register");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "LongEnough1!xx" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "LongEnough1!xx" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Check your email" })).toBeTruthy(),
    );
    expect(screen.getByText("a@example.com")).toBeTruthy();
  });

  it("keeps the register submit disabled until the password is valid and matches", () => {
    openTo("register");
    const submit = screen.getByRole<HTMLButtonElement>("button", { name: "Create account" });
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "LongEnough1!xx" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "LongEnough1!xx" },
    });
    expect(submit.disabled).toBe(false);
  });

  it("register panel has its own password reveal toggle (was only on login before this fix)", () => {
    openTo("register");
    const pw = screen.getByLabelText<HTMLInputElement>("Password");
    expect(pw.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(pw.type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeTruthy();
  });

  it("register inputs disable while a request is in flight", async () => {
    let resolveRegister: (v: { ok: boolean }) => void = () => {};
    flows.registerFlow.mockReturnValue(new Promise((r) => (resolveRegister = r)));
    openTo("register");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "LongEnough1!xx" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "LongEnough1!xx" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByLabelText<HTMLInputElement>("Email").disabled).toBe(true);
    // failure keeps the panel on "register" - success swaps to "verify", which has no Email field
    resolveRegister({ ok: false });
    await waitFor(() =>
      expect(screen.getByLabelText<HTMLInputElement>("Email").disabled).toBe(false),
    );
  });

  it("login with an unverified account swaps to the verify panel", async () => {
    flows.loginFlow.mockResolvedValue({ ok: false, code: "UNVERIFIED" });
    openTo("login");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "whatever12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Check your email" })).toBeTruthy(),
    );
  });

  it("login failure shows the error message", async () => {
    flows.loginFlow.mockResolvedValue({ ok: false, error: "Bad credentials." });
    openTo("login");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "whatever12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Bad credentials."));
  });

  it("reset panel has recovery links so an expired token doesn't dead-end the user", () => {
    render(<AuthModal />);
    act(() => openAuthModal("reset", "expiredtok"));
    expect(screen.getByRole("heading", { name: "Set a new password" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Request a new link" }));
    expect(screen.getByRole("heading", { name: "Reset your password" })).toBeTruthy();
  });

  it("verify-result panel renders the outcome of a deep-linked verification", async () => {
    flows.verifyFromLinkFlow.mockResolvedValue({ ok: true });
    render(<AuthModal />);
    act(() => openAuthModal("verify-result", "tok"));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Email verified" })).toBeTruthy(),
    );
  });

  it("a failed verify-from-link shows a resend sub-form; success hides it", async () => {
    flows.verifyFromLinkFlow.mockResolvedValue({ ok: false, error: "invalid" });
    render(<AuthModal />);
    act(() => openAuthModal("verify-result", "badtok"));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Verification failed" })).toBeTruthy(),
    );
    expect(screen.getAllByLabelText("Email").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "retry@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Resend verification email" }));
    await waitFor(() => expect(flows.resendFlow).toHaveBeenCalledWith("retry@example.com"));
  });

  it("a successful verify-from-link shows no resend sub-form", async () => {
    flows.verifyFromLinkFlow.mockResolvedValue({ ok: true });
    render(<AuthModal />);
    act(() => openAuthModal("verify-result", "goodtok"));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Email verified" })).toBeTruthy(),
    );
    expect(screen.queryByRole("button", { name: "Resend verification email" })).toBeNull();
  });

  it("login failure marks the fields aria-invalid, linked to the error via aria-describedby", async () => {
    flows.loginFlow.mockResolvedValue({ ok: false, error: "Bad credentials." });
    openTo("login");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "whatever12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    const email = screen.getByLabelText("Email");
    const password = screen.getByLabelText("Password");
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(password.getAttribute("aria-invalid")).toBe("true");
    expect(email.getAttribute("aria-describedby")).toBe("auth-login-error");
    expect(password.getAttribute("aria-describedby")).toBe("auth-login-error");
  });

  it("a double-click on submit fires the login flow exactly once", async () => {
    let resolveLogin: (v: { ok: boolean }) => void = () => {};
    flows.loginFlow.mockReturnValue(new Promise((r) => (resolveLogin = r)));
    openTo("login");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "whatever12345" } });
    const submit = screen.getByRole("button", { name: "Log in" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    resolveLogin({ ok: true });
    await waitFor(() => expect(flows.loginFlow).toHaveBeenCalledTimes(1));
  });
});
