import type { LinearState, PolicyDef } from "../types";

export const fifo: PolicyDef<LinearState> = {
  id: "fifo",
  name: "FIFO",
  chip: "Queue",
  rule: "Throw out whatever came in first. Hits don't matter.",
  hitCaption: "queue doesn't move",
  lines: {
    check: "Is {key} in the cache?",
    hit: "Yes → hit. Nothing moves.",
    missAny: "No → miss. If full, pop the oldest.",
    evict: "No → miss. Full → pop {victim}, the oldest.",
    room: "No → miss. Space left, nothing removed.",
    insert: "Push {key} in at the front.",
  },
  about: [
    ["Cost", "O(1) per request — just a queue"],
    ["Wins", "dead simple, no bookkeeping on hits"],
    ["Loses", "throws out hot keys just because they're old"],
    ["Seen in", "simple buffers, some CDN tiers"],
  ],
  tries: [
    {
      title: "Hot key thrown out anyway",
      blurb: "Watch a hot key get evicted even though it keeps being used.",
      patch: { pattern: "hot", capacity: 4, sequence: null },
    },
    {
      title: "Same loop trap",
      blurb: "5 keys looping through a cache of 4.",
      patch: { pattern: "loop", capacity: 4, sequence: null },
    },
  ],
  anchor: "fifo--segmented-variants",
  init: (capacity) => ({ capacity, order: [] }),
  step(state, key) {
    if (state.order.includes(key)) return { state, hit: true, evicted: null };
    const order = [...state.order];
    const evicted = order.length >= state.capacity ? (order.pop() ?? null) : null;
    return { state: { capacity: state.capacity, order: [key, ...order] }, hit: false, evicted };
  },
  model(state, key, hit, evicted) {
    const full = state.order.length >= state.capacity;
    return {
      kind: "linear",
      items: state.order,
      capacity: state.capacity,
      next: full ? (state.order[state.order.length - 1] ?? null) : null,
      active: key,
      tone: hit ? "hit" : "new",
      evicted,
      labels: { entry: "in", exit: "out" },
      defaultAxis: "horizontal",
    };
  },
};
