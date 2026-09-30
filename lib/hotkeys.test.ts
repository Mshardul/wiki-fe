import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { toggleBookmark } = vi.hoisted(() => ({ toggleBookmark: vi.fn() }));
vi.mock("./storage/bookmarks", () => ({ toggleBookmark }));
vi.mock("./storage/settings", () => ({
  getSettings: () => ({ fontSize: "M" }),
  updateSettings: vi.fn(),
}));

import { bindHotkeys } from "./hotkeys";

let unbind: () => void;
const events: string[] = [];
const listener = (e: Event) => events.push(e.type);
const WIKI_EVENTS = [
  "wiki:open-search",
  "wiki:open-bookmarks",
  "wiki:open-settings",
  "wiki:open-wiki-switcher",
  "wiki:open-article-find",
  "wiki:toggle-focus-mode",
  "wiki:toggle-distraction-free",
];

beforeEach(() => {
  events.length = 0;
  toggleBookmark.mockClear();
  for (const t of WIKI_EVENTS) document.addEventListener(t, listener);
  document.body.innerHTML = "";
});
afterEach(() => {
  unbind?.();
  for (const t of WIKI_EVENTS) document.removeEventListener(t, listener);
});

function key(init: KeyboardEventInit, onArticle = false) {
  unbind = bindHotkeys(() =>
    onArticle
      ? { isArticle: true, article: { verticalId: "dsa", path: "content/dsa/x.md", title: "X" } }
      : { isArticle: false },
  );
  document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, ...init }));
}

describe("bindHotkeys", () => {
  it("⌘K opens search", () => {
    key({ key: "k", metaKey: true });
    expect(events).toContain("wiki:open-search");
  });
  it("⌘B opens bookmarks", () => {
    key({ key: "b", metaKey: true });
    expect(events).toContain("wiki:open-bookmarks");
  });
  it("? opens settings on the keyboard tab", () => {
    key({ key: "?" });
    expect(events).toContain("wiki:open-settings");
  });
  it(", opens settings", () => {
    key({ key: "," });
    expect(events).toContain("wiki:open-settings");
  });
  it("W opens the wiki switcher", () => {
    key({ key: "w" });
    expect(events).toContain("wiki:open-wiki-switcher");
  });
  it("W does not stack the wiki switcher on top of another open modal", () => {
    unbind = bindHotkeys(() => ({ isArticle: false, anyModalOpen: () => true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "w" }));
    expect(events).not.toContain("wiki:open-wiki-switcher");
  });
  it("W still toggles when the open modal is the wiki switcher itself", () => {
    unbind = bindHotkeys(() => ({
      isArticle: false,
      anyModalOpen: () => true,
      wikiSwitcherOpen: () => true,
    }));
    document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "w" }));
    expect(events).toContain("wiki:open-wiki-switcher");
  });
  it("article-only: b toggles the bookmark", () => {
    key({ key: "b" }, true);
    expect(toggleBookmark).toHaveBeenCalledWith("dsa", "content/dsa/x.md", "X");
  });
  it("article-only: f toggles focus mode, d distraction-free, / find", () => {
    key({ key: "f" }, true);
    key({ key: "d" }, true);
    key({ key: "/" }, true);
    expect(events).toEqual(
      expect.arrayContaining([
        "wiki:toggle-focus-mode",
        "wiki:toggle-distraction-free",
        "wiki:open-article-find",
      ]),
    );
  });
  it("ignores article shortcuts while typing", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    unbind = bindHotkeys(() => ({
      isArticle: true,
      article: { verticalId: "dsa", path: "content/dsa/x.md", title: "X" },
    }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "f", bubbles: true }));
    expect(events).not.toContain("wiki:toggle-focus-mode");
  });
});
