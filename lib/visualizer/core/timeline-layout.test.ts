import { describe, expect, it } from "vitest";
import { compositeHeights, linearLayout, timelineLayout } from "./geometry";
import type { LinearModel, TimelineModel } from "./shapes";

const sizing = (ticks: number) => ({ ticks, rows: 1, stack: 2, lanes: 1, labeled: false });

describe("timelineLayout rungs", () => {
  it("full labels on a roomy stage", () => {
    const L = timelineLayout({ w: 800, h: 500 }, sizing(12));
    expect(L.rung).toBe("full");
    expect(L.labelEvery).toBe(1);
    expect(L.pitch).toBeLessThanOrEqual(56);
    expect(L.width).toBe(800);
  });

  it("thins labels on a 320px stage with the default axis", () => {
    const L = timelineLayout({ w: 320, h: 380 }, sizing(12));
    expect(L.rung).toBe("thin");
    expect(L.labelEvery).toBe(2);
    expect(L.width).toBe(320);
  });

  it("stays thin inside a 250px revision card", () => {
    expect(timelineLayout({ w: 250, h: 200 }, sizing(12)).rung).toBe("thin");
  });

  it("scrolls only when even thin labels cannot fit", () => {
    expect(timelineLayout({ w: 320, h: 380 }, sizing(20)).rung).toBe("thin");
    const L = timelineLayout({ w: 250, h: 200 }, sizing(20));
    expect(L.rung).toBe("scroll");
    expect(L.width).toBeGreaterThan(250);
  });

  it("places ticks left to right inside the width", () => {
    const L = timelineLayout({ w: 800, h: 500 }, sizing(12));
    expect(L.x(1)).toBeGreaterThan(L.x(0));
    expect(L.cx(0)).toBeCloseTo(L.x(0) + L.pitch / 2);
    expect(L.x(12)).toBeLessThanOrEqual(800);
  });

  it("grows taller with more stacked marks, rows and span lanes, never shorter", () => {
    const base = timelineLayout({ w: 800, h: 500 }, sizing(12));
    expect(timelineLayout({ w: 800, h: 500 }, { ...sizing(12), stack: 4 }).height).toBeGreaterThan(
      base.height,
    );
    expect(timelineLayout({ w: 800, h: 500 }, { ...sizing(12), rows: 2 }).height).toBeGreaterThan(
      base.height,
    );
    expect(timelineLayout({ w: 800, h: 500 }, { ...sizing(12), lanes: 2 }).height).toBeGreaterThan(
      base.height,
    );
  });
});

const timeline = (rows: number, stack: number): TimelineModel => ({
  kind: "timeline",
  ticks: 12,
  now: 0,
  stack,
  lanes: 1,
  rows: Array.from({ length: rows }, () => ({ label: "", marks: [] })),
  bands: [],
  spans: [],
  boundaries: [],
});
const linear: LinearModel = {
  kind: "linear",
  items: [],
  capacity: 3,
  next: null,
  active: null,
  tone: null,
  removed: null,
  labels: { entry: "in", exit: "out" },
  defaultAxis: "horizontal",
};

describe("compositeHeights", () => {
  it("gives a timeline its natural height and the rest to the other parts", () => {
    const size = { w: 800, h: 560 };
    const [a, b] = compositeHeights(size, [linear, timeline(1, 2)]);
    expect(b).toBe(timelineLayout(size, sizing(12)).height);
    expect(a).toBeGreaterThanOrEqual(96);
    expect((a ?? 0) + (b ?? 0)).toBeLessThanOrEqual(560);
  });

  it("caps a flexible part on a tall stage and lets a short card use all its height", () => {
    const tall = compositeHeights({ w: 800, h: 560 }, [linear])[0] ?? 0;
    const card = compositeHeights({ w: 250, h: 200 }, [linear])[0] ?? 0;
    expect(tall).toBe(180);
    expect(card).toBe(200);
  });
});

describe("linearLayout on a short stage", () => {
  it("keeps the horizontal labels inside the stage", () => {
    const L = linearLayout({ w: 600, h: 120 }, 3, "horizontal");
    expect(L.entryLabel.y).toBeGreaterThanOrEqual(0);
    expect(L.frame.y + L.frame.h).toBeLessThanOrEqual(120);
  });

  it("leaves a tall stage's layout unchanged", () => {
    const L = linearLayout({ w: 800, h: 400 }, 4, "horizontal");
    expect(L.block.h).toBe(76);
    expect(L.slot(0).y).toBeCloseTo(400 / 2 - 76 / 2 - 16);
  });
});

describe("dense timeline in a revision card", () => {
  const card = { w: 250, h: 200 };
  const logTimeline: TimelineModel = { ...timeline(1, 2), lanes: 1 };

  it("packs shorter than the single-view layout", () => {
    const dense = timelineLayout(card, sizing(12));
    const roomy = timelineLayout({ w: 250, h: 500 }, sizing(12));
    expect(dense.height).toBeLessThan(roomy.height);
  });

  it("lets a timeline plus a linear part fit inside the 200px card", () => {
    const heights = compositeHeights(card, [logTimeline, linear]);
    expect(heights.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(200);
    const wide = compositeHeights({ w: 640, h: 200 }, [linear, logTimeline]);
    expect(wide.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(200);
  });

  it("two labelled rows still fit alone in the card", () => {
    const two = timelineLayout(card, { ...sizing(12), rows: 2, lanes: 0, labeled: true });
    expect(two.height).toBeLessThanOrEqual(200);
  });
});
