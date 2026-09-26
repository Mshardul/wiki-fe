import { beforeEach, describe, expect, it } from "vitest";
import { restoreScrollPosition, saveScrollPosition } from "./scroll-collapse";

describe("scroll-collapse", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips a per-article scroll position", () => {
    saveScrollPosition("dsa", "patterns/sliding-window", 1234.7);
    expect(restoreScrollPosition("dsa", "patterns/sliding-window")).toBe(1235);
    expect(restoreScrollPosition("dsa", "other")).toBe(0);
  });
});
