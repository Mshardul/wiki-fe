import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLastOpened } from "@/lib/storage/read-tracking";
import { getRecents } from "@/lib/storage/recents";
import { ReadTracker } from "./ReadTracker";

const PROPS = {
  wikiId: "dsa",
  path: "content/dsa/patterns/sliding-window.md",
  title: "Sliding Window",
  slug: ["patterns", "sliding-window"],
};

describe("ReadTracker", () => {
  beforeEach(() => localStorage.clear());

  it("records a visit after the dwell time", () => {
    vi.useFakeTimers();
    render(<ReadTracker {...PROPS} />);
    expect(getLastOpened("dsa", PROPS.path)).toBeNull();
    vi.advanceTimersByTime(4500);
    expect(getLastOpened("dsa", PROPS.path)).toMatch(/^\d{4}-/);
    expect(getRecents()[0]?.title).toBe("Sliding Window");
    vi.useRealTimers();
  });

  it("records a visit on scrolling past the threshold, only once", () => {
    render(<ReadTracker {...PROPS} />);
    Object.defineProperty(window, "scrollY", { value: 500, configurable: true });
    fireEvent.scroll(window);
    const first = getLastOpened("dsa", PROPS.path);
    expect(first).toMatch(/^\d{4}-/);
    fireEvent.scroll(window);
    expect(getLastOpened("dsa", PROPS.path)).toBe(first);
    expect(getRecents().length).toBe(1);
  });
});
