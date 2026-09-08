import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api", () => ({
  api: {
    bookmarks: {
      add: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
  },
}));
vi.mock("@/lib/storage/session", () => ({ getSession: () => ({ user: null, status: "out" }) }));

import { toggleBookmark } from "@/lib/storage/bookmarks";
import { BookmarksModal } from "./BookmarksModal";

describe("BookmarksModal", () => {
  beforeEach(() => {
    localStorage.clear();
    push.mockClear();
  });

  it("opens on ⌘B and lists the empty state", () => {
    render(<BookmarksModal />);
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => {
      fireEvent.keyDown(document, { key: "b", metaKey: true });
    });
    expect(screen.getByRole("dialog", { name: "Bookmarks" })).toBeTruthy();
    expect(screen.getByText(/no bookmarks anywhere yet/)).toBeTruthy();
  });

  it("lists bookmarks, navigates on entry click, removes on the x", () => {
    act(() => {
      toggleBookmark("dsa", "content/dsa/patterns/sliding-window.md", "Sliding Window");
    });
    render(<BookmarksModal />);
    act(() => {
      fireEvent.keyDown(document, { key: "b", metaKey: true });
    });

    fireEvent.click(screen.getByLabelText("Remove bookmark"));
    expect(screen.queryByText("Sliding Window")).toBeNull();

    // entry click navigates + closes
    act(() => {
      toggleBookmark("dsa", "content/dsa/patterns/two-pointers.md", "Two Pointers");
    });
    fireEvent.click(screen.getByText("Two Pointers"));
    expect(push).toHaveBeenCalledWith("/dsa/two-pointers/");
  });
});
