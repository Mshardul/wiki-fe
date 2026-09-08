import { beforeEach, describe, expect, it } from "vitest";
import {
  daysSinceRead,
  fadeFactorForDaysSinceRead,
  getLastOpened,
  getRevealCount,
  recordOpened,
  recordReveal,
} from "./read-tracking";

describe("lib/storage/read-tracking", () => {
  beforeEach(() => localStorage.clear());

  it("records and reads a visit timestamp per wiki", () => {
    recordOpened("dsa", "content/dsa/patterns/sliding-window.md");
    expect(getLastOpened("dsa", "content/dsa/patterns/sliding-window.md")).toMatch(/^\d{4}-/);
    expect(getLastOpened("system-design", "content/dsa/patterns/sliding-window.md")).toBeNull();
  });

  it("computes days since read", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString();
    localStorage.setItem("wiki-read-dates-dsa", JSON.stringify({ "x.md": tenDaysAgo }));
    expect(daysSinceRead("dsa", "x.md")).toBeCloseTo(10, 0);
    expect(daysSinceRead("dsa", "never.md")).toBeNull();
  });

  it("fades from 1.0 to the 0.4 floor over 70 days", () => {
    expect(fadeFactorForDaysSinceRead(0)).toBe(1);
    expect(fadeFactorForDaysSinceRead(null)).toBe(1);
    expect(fadeFactorForDaysSinceRead(35)).toBeCloseTo(0.7, 1);
    expect(fadeFactorForDaysSinceRead(200)).toBe(0.4);
  });

  it("increments reveal counts", () => {
    recordReveal("dsa", "x.md");
    recordReveal("dsa", "x.md");
    expect(getRevealCount("dsa", "x.md")).toBe(2);
  });
});
