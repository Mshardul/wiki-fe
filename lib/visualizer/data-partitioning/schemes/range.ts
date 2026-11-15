import { KEY_SPACE, type KeyItem, type RangeSeg, type Scheme, type SchemeState } from "../types";
import { nodesAfter } from "./membership";

export const rangeOf = (ranges: RangeSeg[], key: number): RangeSeg => {
  const r = ranges.find((s) => key >= s.lo && key <= s.hi);
  if (!r) throw new Error(`no range holds key ${key}`);
  return r;
};

const ownerOf = (state: SchemeState, item: KeyItem): string => rangeOf(state.ranges, item.key).node;

// The starting nodes split 0 to 99 equally.
function equalRanges(nodes: string[]): RangeSeg[] {
  const n = nodes.length;
  return nodes.map((node, j) => ({
    node,
    lo: Math.floor((KEY_SPACE * j) / n),
    hi: Math.floor((KEY_SPACE * (j + 1)) / n) - 1,
  }));
}

// Splits the fullest range (ties: lowest) at its median key; the new node takes the upper part.
function split(ranges: RangeSeg[], items: KeyItem[], letter: string): RangeSeg[] {
  const held = ranges.map((r) =>
    items
      .map((it) => it.key)
      .filter((k) => k >= r.lo && k <= r.hi)
      .sort((a, b) => a - b),
  );
  const order = ranges
    .map((_, i) => i)
    .filter((i) => (ranges[i] as RangeSeg).hi > (ranges[i] as RangeSeg).lo)
    .sort((a, b) => (held[b] as number[]).length - (held[a] as number[]).length || a - b);
  const at = order[0] as number;
  const r = ranges[at] as RangeSeg;
  const keys = held[at] as number[];
  const median = keys[Math.floor(keys.length / 2)] ?? r.lo;
  const cut = median > r.lo ? median : Math.floor((r.lo + r.hi) / 2) + 1;
  const out = [...ranges];
  out.splice(at, 1, { ...r, hi: cut - 1 }, { node: letter, lo: cut, hi: r.hi });
  return out;
}

// The removed range merges into its lower neighbour, or the upper one when it was first.
function merge(ranges: RangeSeg[], letter: string): RangeSeg[] {
  const at = ranges.findIndex((r) => r.node === letter);
  const gone = ranges[at] as RangeSeg;
  const out = ranges.filter((_, i) => i !== at);
  if (at > 0) (out[at - 1] as RangeSeg).hi = gone.hi;
  else (out[0] as RangeSeg).lo = gone.lo;
  return out.map((r) => ({ ...r }));
}

export const range: Scheme = {
  init: (nodes, vnodes) => ({ nodes, vnodes, ranges: equalRanges(nodes) }),
  place: (state, items, index) => ownerOf(state, items[index] as KeyItem),
  apply(state, event, items) {
    const ranges =
      event.kind === "add"
        ? split(state.ranges, items, event.letter)
        : merge(
            state.ranges.map((r) => ({ ...r })),
            event.letter,
          );
    const next = { ...state, nodes: nodesAfter(state.nodes, event), ranges };
    return { state: next, owners: items.map((it) => ownerOf(next, it)) };
  },
};
