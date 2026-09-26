import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { saveArticle, evictArticle, isSaved } = vi.hoisted(() => ({
  saveArticle: vi.fn(),
  evictArticle: vi.fn(),
  isSaved: vi.fn(),
}));
vi.mock("@/lib/pwa/article-cache", () => ({ saveArticle, evictArticle, isSaved }));
vi.mock("@/lib/toast", () => ({ showToast: vi.fn() }));

import { SaveOffline } from "./SaveOffline";

const PATH = "content/dsa/patterns/sliding-window.md";

beforeEach(() => {
  vi.clearAllMocks();
  isSaved.mockResolvedValue(false);
  saveArticle.mockResolvedValue(true);
  evictArticle.mockResolvedValue(undefined);
});

describe("SaveOffline", () => {
  it("click saves the article and flips to Saved", async () => {
    render(<SaveOffline articlePath={PATH} />);
    const btn = screen.getByRole("button", { name: "Save for offline" });
    fireEvent.click(btn);
    await waitFor(() => expect(saveArticle).toHaveBeenCalledWith(PATH));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Remove offline copy" })).toBeTruthy(),
    );
  });

  it("click when saved evicts", async () => {
    isSaved.mockResolvedValue(true);
    render(<SaveOffline articlePath={PATH} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Remove offline copy" })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove offline copy" }));
    await waitFor(() => expect(evictArticle).toHaveBeenCalledWith(PATH));
  });
});
