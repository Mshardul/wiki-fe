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

  it("verify-result panel renders the outcome of a deep-linked verification", async () => {
    flows.verifyFromLinkFlow.mockResolvedValue({ ok: true });
    render(<AuthModal />);
    act(() => openAuthModal("verify-result", "tok"));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Email verified" })).toBeTruthy(),
    );
  });
});
