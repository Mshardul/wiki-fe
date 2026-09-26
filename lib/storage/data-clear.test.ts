import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  api: { bookmarks: { clear: vi.fn() }, recents: { clear: vi.fn() } },
}));
vi.mock("./session", () => ({ getSession: () => ({ user: null, status: "out" }) }));

import { clearData, DATA_CATEGORIES } from "./data-clear";

beforeEach(() => localStorage.clear());

describe("data-clear", () => {
  it("clears the selected categories only", () => {
    localStorage.setItem("wiki-bookmarks", "[]");
    localStorage.setItem("wiki-recents", "[]");
    localStorage.setItem("wiki-recent-searches", '["x"]');
    localStorage.setItem("wiki-heading-collapsed-dsa-x-a", "1");
    localStorage.setItem("wiki-table-cols-dsa-x-t", "[]");

    clearData(["recentSearches", "scrollCollapse"]);

    expect(localStorage.getItem("wiki-recent-searches")).toBeNull();
    expect(localStorage.getItem("wiki-heading-collapsed-dsa-x-a")).toBeNull();
    expect(localStorage.getItem("wiki-bookmarks")).toBe("[]");
    expect(localStorage.getItem("wiki-table-cols-dsa-x-t")).toBe("[]");
  });

  it("every category has a label", () => {
    expect(DATA_CATEGORIES.every((c) => c.label.length > 0)).toBe(true);
  });
});
