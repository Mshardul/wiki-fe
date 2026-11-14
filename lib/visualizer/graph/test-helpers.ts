import { expect } from "vitest";
import { PRESETS } from "./graphs";
import type { GraphData, TraceEvent } from "./trace";

export const small = PRESETS.small.data;
export const weighted = PRESETS.weighted.data;
export const dag = PRESETS.dag.data;
export const dagCycle = PRESETS["dag-cycle"].data;
export const ringEven = PRESETS["ring-even"].data;
export const ringOdd = PRESETS["ring-odd"].data;

// Badge words from a compact fixture string; blocks are split by bars for readability.
export const words = (s: string): string[] => s.replace(/\|/g, " ").trim().split(/\s+/);

export const badges = (events: TraceEvent[]): string[] => events.map((e) => e.badge);

export const graphOf = (
  nodes: string,
  edges: [string, string, number?][],
  directed = false,
): GraphData => ({
  nodes: nodes.split(""),
  edges: edges.map(([from, to, weight]) =>
    weight === undefined ? { from, to } : { from, to, weight },
  ),
  directed,
});

// Everything a picture could differ by, so repeated events show up.
const picture = (e: TraceEvent): string =>
  JSON.stringify([e.nodes, e.edges, e.work, e.pq, e.popped, e.node, e.other, e.order, e.note]);

// No two adjacent events draw the same picture, except within the last `tail` events.
export function expectNoRepeats(events: TraceEvent[], tail = 1): void {
  events.forEach((e, i) => {
    if (i === 0 || i >= events.length - tail) return;
    expect(picture(e)).not.toBe(picture(events[i - 1] as TraceEvent));
  });
}

export const lastOf = (events: TraceEvent[]): TraceEvent => {
  const e = events[events.length - 1];
  if (!e) throw new Error("no events");
  return e;
};

export const edgesIn = (e: TraceEvent, state: string): string[] =>
  Object.entries(e.edges)
    .filter(([, s]) => s === state)
    .map(([k]) => k)
    .sort();
