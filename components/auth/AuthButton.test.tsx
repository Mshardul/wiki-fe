import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  logoutFlow: vi.fn().mockResolvedValue(undefined),
  openAuthModal: vi.fn(),
}));
vi.mock("@/lib/auth/authFlows", () => ({ logoutFlow: h.logoutFlow }));
vi.mock("@/lib/toast", () => ({ showToast: vi.fn() }));
vi.mock("./authModalController", () => ({ openAuthModal: h.openAuthModal }));

import { setSession } from "@/lib/storage/session";
import { AuthButton } from "./AuthButton";

describe("AuthButton", () => {
  it("shows 'Log in' when out and opens the modal on click", () => {
    act(() => setSession({ user: null, status: "out" }));
    render(<AuthButton />);
    const btn = screen.getByRole("button");
    expect(btn.textContent).toContain("Log in");
    fireEvent.click(btn);
    expect(h.openAuthModal).toHaveBeenCalledWith("login");
  });

  it("shows 'Log out' when in and runs the logout flow", () => {
    act(() => setSession({ user: { id: "1", email: "a@example.com" }, status: "in" }));
    render(<AuthButton />);
    const btn = screen.getByRole("button");
    expect(btn.textContent).toContain("Log out");
    fireEvent.click(btn);
    expect(h.logoutFlow).toHaveBeenCalled();
  });
});
