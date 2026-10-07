import type { RingSlot } from "../../core/shapes";
import type { PolicyDef } from "../types";

export interface ClockState {
  capacity: number;
  slots: (RingSlot | null)[];
  hand: number;
  turns: number;
  cleared: number[];
  at: number;
}

export const clock: PolicyDef<ClockState> = {
  id: "clock",
  name: "CLOCK",
  chip: "Ring",
  rule: "Second chance: sweep the ring, spare anything used since the last pass.",
  hitCaption: "bit set to 1",
  lines: {
    check: "Is {key} in the cache?",
    hit: "Yes → hit. Set {key}'s bit to 1.",
    missAny: "No → miss. Sweep: bit 1 → clear and skip, bit 0 → remove.",
    evict: "No → miss. Hand cleared {skipped}; removed {victim}.",
    room: "No → miss. Empty slot, nothing removed.",
    insert: "Place {key} with bit 1.",
  },
  about: [
    ["Cost", "O(1) amortised — a ring and one bit per slot"],
    ["Wins", "near-LRU hit rate without moving anything on a hit"],
    ["Loses", "a full sweep when every bit is 1"],
    ["Seen in", "OS page replacement, PostgreSQL buffer pool"],
  ],
  tries: [
    {
      title: "Every key gets a second chance",
      blurb: "Hot set: watch the hand clear bits before it evicts.",
      patch: { pattern: "hot", capacity: 4, sequence: null },
    },
    {
      title: "Loop trap again",
      blurb: "5 keys looping through 4 slots.",
      patch: { pattern: "loop", capacity: 4, sequence: null },
    },
  ],
  anchor: "clock-second-chance",
  init: (capacity) => ({
    capacity,
    slots: Array.from({ length: capacity }, () => null),
    hand: 0,
    turns: 0,
    cleared: [],
    at: -1,
  }),
  step(state, key) {
    const slots = [...state.slots];
    const found = slots.findIndex((s) => s?.key === key);
    if (found >= 0) {
      slots[found] = { key, bit: 1 };
      return { state: { ...state, slots, cleared: [], at: found }, hit: true, evicted: null };
    }
    const empty = slots.findIndex((s) => s === null);
    if (empty >= 0) {
      slots[empty] = { key, bit: 1 };
      return { state: { ...state, slots, cleared: [], at: empty }, hit: false, evicted: null };
    }
    let { hand, turns } = state;
    const cleared: number[] = [];
    // One pass clears every bit, so two passes always find a 0.
    for (let guard = 0; guard < state.capacity * 2; guard++) {
      const s = slots[hand];
      if (!s || s.bit === 0) break;
      slots[hand] = { key: s.key, bit: 0 };
      cleared.push(hand);
      hand = (hand + 1) % state.capacity;
      turns++;
    }
    const evicted = slots[hand]?.key ?? null;
    slots[hand] = { key, bit: 1 };
    const at = hand;
    hand = (hand + 1) % state.capacity;
    turns++;
    const skipped = cleared
      .map((i) => state.slots[i]?.key)
      .filter((k): k is string => typeof k === "string");
    return {
      state: { capacity: state.capacity, slots, hand, turns, cleared, at },
      hit: false,
      evicted,
      notes: { skipped: skipped.length ? skipped.join(", ") : "no bits" },
    };
  },
  model(state, _key, hit) {
    return {
      kind: "ring",
      slots: state.slots,
      hand: state.hand,
      turns: state.turns,
      cleared: state.cleared,
      active: state.at >= 0 ? state.at : null,
      tone: hit ? "hit" : "new",
    };
  },
  vars(state) {
    return [
      { name: "hand at", value: `slot ${state.hand + 1}` },
      { name: "bits", value: state.slots.map((s) => (s ? `${s.key}${s.bit}` : "·")).join(" ") },
    ];
  },
};
