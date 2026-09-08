import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  api: { bookmarks: { add: vi.fn().mockResolvedValue(undefined), remove: vi.fn() } },
}));
vi.mock("@/lib/storage/session", () => ({ getSession: () => ({ user: null, status: "out" }) }));

import { useBookmarks } from "./useSyncedDomain";

function Probe() {
  const { value, toggle } = useBookmarks();
  return (
    <div>
      <span data-testid="count">{value.length}</span>
      <button type="button" onClick={() => toggle("dsa", "content/dsa/x.md", "X")}>
        toggle
      </button>
    </div>
  );
}

describe("useBookmarks", () => {
  beforeEach(() => localStorage.clear());

  it("re-renders when a bookmark is toggled", () => {
    render(<Probe />);
    expect(screen.getByTestId("count").textContent).toBe("0");
    act(() => screen.getByRole("button").click());
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("reflects a cross-tab storage event", () => {
    render(<Probe />);
    act(() => {
      localStorage.setItem(
        "wiki-bookmarks",
        JSON.stringify([
          { wikiId: "dsa", path: "content/dsa/y.md", slug: "y", title: "Y", wikiTitle: "DSA" },
        ]),
      );
      window.dispatchEvent(new StorageEvent("storage", { key: "wiki-bookmarks" }));
    });
    expect(screen.getByTestId("count").textContent).toBe("1");
  });
});
