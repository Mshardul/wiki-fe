import { beforeEach, describe, expect, it, vi } from "vitest";

const { add, remove, listMock } = vi.hoisted(() => ({
  add: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  listMock: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/api", () => ({
  api: { bookmarks: { add, remove, list: listMock, clear: vi.fn() } },
}));
const state = vi.hoisted(() => ({ status: "in" }));
vi.mock("./session", () => ({ getSession: () => ({ user: null, status: state.status }) }));

import { getBookmarks, isBookmarked, pullBookmarks, toggleBookmark } from "./bookmarks";

describe("lib/storage/bookmarks", () => {
  beforeEach(() => {
    localStorage.clear();
    state.status = "in";
    add.mockClear().mockResolvedValue(undefined);
    remove.mockClear().mockResolvedValue(undefined);
    listMock.mockReset().mockResolvedValue([]);
  });

  it("toggle adds a bookmark locally and fires the API write", async () => {
    const now = toggleBookmark("dsa", "content/dsa/patterns/sliding-window.md", "Sliding Window");
    expect(now).toBe(true);
    expect(isBookmarked("dsa", "content/dsa/patterns/sliding-window.md")).toBe(true);
    expect(getBookmarks()[0]?.title).toBe("Sliding Window");
    await vi.waitFor(() =>
      expect(add).toHaveBeenCalledWith("dsa", "content/dsa/patterns/sliding-window.md"),
    );
  });

  it("toggle again removes it and fires the remove", async () => {
    toggleBookmark("dsa", "content/dsa/x.md");
    const now = toggleBookmark("dsa", "content/dsa/x.md");
    expect(now).toBe(false);
    expect(getBookmarks()).toHaveLength(0);
    await vi.waitFor(() => expect(remove).toHaveBeenCalledWith("dsa", "content/dsa/x.md"));
  });

  it("does not fire an API write when logged out", () => {
    state.status = "out";
    toggleBookmark("dsa", "content/dsa/x.md");
    expect(add).not.toHaveBeenCalled();
    expect(getBookmarks()).toHaveLength(1);
  });

  it("pull replaces local with server truth", async () => {
    listMock.mockResolvedValueOnce([{ wiki_id: "dsa", path: "content/dsa/from-server.md" }]);
    toggleBookmark("dsa", "content/dsa/local-only.md");
    await pullBookmarks();
    expect(getBookmarks().map((b) => b.path)).toEqual(["content/dsa/from-server.md"]);
  });
});
