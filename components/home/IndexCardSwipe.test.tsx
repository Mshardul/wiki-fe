import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  api: { bookmarks: { add: vi.fn().mockResolvedValue(undefined), remove: vi.fn() } },
}));
vi.mock("@/lib/storage/session", () => ({ getSession: () => ({ user: null, status: "out" }) }));
vi.mock("@/lib/toast", () => ({ showToast: vi.fn() }));

import { getBookmarks } from "@/lib/storage/bookmarks";
import { IndexCardSwipe } from "./IndexCardSwipe";

function touch(x: number, y: number) {
  return { clientX: x, clientY: y } as Touch;
}

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "innerWidth", { value: 400, configurable: true });
  document.body.innerHTML = `
    <div class="index-sections">
      <a class="index-card" data-article-path="content/dsa/patterns/sliding-window.md">
        <span class="index-card-title">Sliding Window</span>
      </a>
    </div>`;
});

describe("IndexCardSwipe", () => {
  it("swipe-right on a card toggles its bookmark", () => {
    render(<IndexCardSwipe wikiId="dsa" />);
    const container = document.querySelector(".index-sections") as HTMLElement;
    const card = document.querySelector(".index-card") as HTMLElement;

    fireEvent.touchStart(card, { touches: [touch(20, 100)] });
    fireEvent.touchMove(container, { touches: [touch(90, 102)] });
    fireEvent.touchEnd(container, { changedTouches: [touch(120, 102)] });

    expect(getBookmarks()[0]?.title).toBe("Sliding Window");
  });

  it("is inert above the mobile breakpoint", () => {
    Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true });
    render(<IndexCardSwipe wikiId="dsa" />);
    const container = document.querySelector(".index-sections") as HTMLElement;
    const card = document.querySelector(".index-card") as HTMLElement;
    fireEvent.touchStart(card, { touches: [touch(20, 100)] });
    fireEvent.touchMove(container, { touches: [touch(90, 102)] });
    fireEvent.touchEnd(container, { changedTouches: [touch(120, 102)] });
    expect(getBookmarks()).toHaveLength(0);
  });
});
