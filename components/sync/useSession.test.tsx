import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { setSession } from "@/lib/storage/session";
import { useSession } from "./useSession";

function Probe() {
  const { status, user } = useSession();
  return (
    <div data-testid="s">
      {status}:{user?.email ?? "none"}
    </div>
  );
}

describe("useSession", () => {
  it("reflects session changes", () => {
    act(() => setSession({ user: null, status: "out" }));
    render(<Probe />);
    expect(screen.getByTestId("s").textContent).toBe("out:none");

    act(() => setSession({ user: { id: "1", email: "a@example.com" }, status: "in" }));
    expect(screen.getByTestId("s").textContent).toBe("in:a@example.com");
  });

  it("updates on a wiki:session-expired event", () => {
    act(() => setSession({ user: { id: "1", email: "a@example.com" }, status: "in" }));
    render(<Probe />);
    act(() => {
      setSession({ user: null, status: "out" });
      document.dispatchEvent(new CustomEvent("wiki:session-expired"));
    });
    expect(screen.getByTestId("s").textContent).toBe("out:none");
  });
});
