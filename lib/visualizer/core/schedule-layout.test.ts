import { describe, expect, it } from "vitest";
import { scheduleLayout } from "./geometry";
import type { ScheduleModel } from "./shapes";

const rows = (n: number): ScheduleModel["rows"] =>
  Array.from({ length: n }, (_, i) => ({ id: `r${i}`, label: `R${i}`, segments: [] }));

describe("schedule layout", () => {
  it("maps 0 and end to the plot edges and clamps outside times", () => {
    const L = scheduleLayout({ end: 20, rows: rows(2), summary: null, values: null });
    expect(L.x(0)).toBe(L.left);
    expect(L.x(20)).toBe(L.right);
    expect(L.x(20.6)).toBe(L.right);
    expect(L.x(-1)).toBe(L.left);
    expect(L.x(10)).toBeCloseTo((L.left + L.right) / 2);
  });

  it("stacks rows below the summary row and grows for more rows and a values row", () => {
    const summary = { label: "S", segments: [] };
    const two = scheduleLayout({ end: 10, rows: rows(2), summary, values: null });
    expect(two.rowY(0)).toBeGreaterThan(two.summaryY + two.summaryH);
    expect(two.rowY(1)).toBeGreaterThan(two.rowY(0) + two.laneH);
    const three = scheduleLayout({ end: 10, rows: rows(3), summary, values: null });
    expect(three.height).toBeGreaterThan(two.height);
    const valued = scheduleLayout({
      end: 10,
      rows: rows(2),
      summary,
      values: { label: "v", points: [] },
    });
    expect(valued.valuesY).toBeGreaterThan(valued.rowY(1) + valued.laneH);
    expect(valued.height).toBeGreaterThan(two.height);
  });

  it("fills the given width and narrows the label column on a phone", () => {
    const wide = scheduleLayout({ end: 20, rows: rows(2), summary: null, values: null }, 1200);
    expect(wide.width).toBe(1200);
    expect(wide.right).toBeGreaterThan(1150);
    const phone = scheduleLayout({ end: 20, rows: rows(2), summary: null, values: null }, 340);
    expect(phone.width).toBe(340);
    expect(phone.left).toBeLessThan(wide.left);
    expect(scheduleLayout({ end: 20, rows: rows(1), summary: null, values: null }, 100).width).toBe(
      280,
    );
  });

  it("starts rows higher without a summary row", () => {
    const withSummary = scheduleLayout({
      end: 10,
      rows: rows(1),
      summary: { label: "S", segments: [] },
      values: null,
    });
    const without = scheduleLayout({ end: 10, rows: rows(1), summary: null, values: null });
    expect(without.rowY(0)).toBeLessThan(withSummary.rowY(0));
  });
});
