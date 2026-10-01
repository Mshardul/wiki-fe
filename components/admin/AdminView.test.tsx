import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setSession } from "@/lib/storage/session";
import { AdminView } from "./AdminView";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    api: {
      ...actual.api,
      admin: {
        listUsers: vi.fn().mockResolvedValue([
          {
            id: "1",
            email: "a@example.com",
            role: "admin",
            is_active: true,
            email_verified: true,
            created_at: "2026-01-01T00:00:00Z",
          },
        ]),
        updateUserRole: vi.fn(),
        updateUserStatus: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/toast", () => ({ showToast: vi.fn() }));

const REPORTS = {
  brokenLinks: [{ title: "A", target: "./missing.md", sourcePath: "./a.md" }],
  orphans: [{ title: "Orphan", path: "content/x.md" }],
};

beforeEach(() => {
  setSession({ user: null, status: "out" });
});

describe("AdminView role gate", () => {
  it("denies non-admin sessions", () => {
    setSession({
      user: { id: "1", email: "u@example.com", role: "user" },
      status: "in",
    });
    render(<AdminView reports={REPORTS} />);
    expect(screen.getByText(/don't have access/i)).toBeTruthy();
  });

  it("shows reports for admin on Site Health tab", async () => {
    setSession({
      user: { id: "1", email: "a@example.com", role: "admin" },
      status: "in",
    });
    render(<AdminView reports={REPORTS} />);
    await waitFor(() => expect(screen.getByText("a@example.com")).toBeTruthy());

    act(() => {
      screen.getByRole("tab", { name: "Site Health" }).click();
    });
    expect(screen.getByText(/Broken Links \(1\)/)).toBeTruthy();
    expect(screen.getByText(/Orphan Pages \(1\)/)).toBeTruthy();
    expect(screen.getByText("./missing.md")).toBeTruthy();
  });
});
