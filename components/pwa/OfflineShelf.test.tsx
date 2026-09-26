import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listSaved, evictArticle } = vi.hoisted(() => ({
  listSaved: vi.fn(),
  evictArticle: vi.fn(),
}));
vi.mock("@/lib/pwa/article-cache", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/pwa/article-cache")>("@/lib/pwa/article-cache");
  return { ...actual, listSaved, evictArticle };
});

import { OfflineShelf, type ShelfArticleMeta } from "./OfflineShelf";

const META: ShelfArticleMeta[] = [
  {
    route: "/wiki-fe/dsa/patterns/sliding-window/",
    title: "Sliding Window",
    verticalId: "dsa",
    verticalTitle: "DSA",
  },
  {
    route: "/wiki-fe/dsa/patterns/two-pointers/",
    title: "Two Pointers",
    verticalId: "dsa",
    verticalTitle: "DSA",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  evictArticle.mockResolvedValue(undefined);
});

describe("OfflineShelf", () => {
  it("lists saved articles by title", async () => {
    listSaved.mockResolvedValue([
      { path: "/wiki-fe/dsa/patterns/sliding-window/", cachedAt: Date.now() },
      { path: "/wiki-fe/dsa/patterns/two-pointers/", cachedAt: Date.now() },
    ]);
    render(<OfflineShelf articles={META} />);
    await waitFor(() => expect(screen.getByText("Sliding Window")).toBeTruthy());
    expect(screen.getByText("Two Pointers")).toBeTruthy();
  });

  it("evict removes the article from the list", async () => {
    listSaved
      .mockResolvedValueOnce([
        { path: "/wiki-fe/dsa/patterns/sliding-window/", cachedAt: Date.now() },
        { path: "/wiki-fe/dsa/patterns/two-pointers/", cachedAt: Date.now() },
      ])
      .mockResolvedValueOnce([
        { path: "/wiki-fe/dsa/patterns/two-pointers/", cachedAt: Date.now() },
      ]);
    render(<OfflineShelf articles={META} />);
    await waitFor(() => expect(screen.getByText("Sliding Window")).toBeTruthy());

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Sliding Window from offline storage" }),
    );
    await waitFor(() =>
      expect(evictArticle).toHaveBeenCalledWith("content/dsa/patterns/sliding-window.md"),
    );
    await waitFor(() => expect(screen.queryByText("Sliding Window")).toBeNull());
  });

  it("shows the empty state when nothing is saved", async () => {
    listSaved.mockResolvedValue([]);
    render(<OfflineShelf articles={META} />);
    await waitFor(() =>
      expect(screen.getByText(/No articles saved for offline reading/)).toBeTruthy(),
    );
  });
});
