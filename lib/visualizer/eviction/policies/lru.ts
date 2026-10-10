import type { LinearState, PolicyDef } from "../types";

export const lru: PolicyDef<LinearState> = {
  id: "lru",
  name: "LRU",
  chip: "Stack",
  rule: "Throw out whatever was used longest ago.",
  hitCaption: "moves to the newest end",
  lines: {
    check: "Is {key} in the cache?",
    hit: "Yes → hit. Move {key} to the top.",
    missAny: "No → miss. If full, remove the bottom key.",
    evict: "No → miss. Full → remove {victim} from the bottom.",
    room: "No → miss. Space left, nothing removed.",
    insert: "Put {key} on top.",
  },
  about: [
    ["Cost", "O(1) per request — hashmap + doubly linked list"],
    ["Wins", "recently used keys are likely to be used again"],
    ["Loses", "one big scan pushes every hot key out"],
    ["Seen in", "Redis (approximate LRU), CPU caches, OS page cache"],
  ],
  tries: [
    {
      title: "Scan wipes LRU",
      blurb: "A one-off sweep through many keys pushes the hot ones out.",
      patch: { pattern: "scan", capacity: 4, sequence: null },
    },
    {
      title: "Loop one bigger than the cache",
      blurb: "Cycle through 5 keys with room for 4 — every request misses.",
      patch: { pattern: "loop", capacity: 4, sequence: null },
    },
    {
      title: "Give it more room",
      blurb: "Same hot set, cache of 6 — watch the hit rate climb.",
      patch: { pattern: "hot", capacity: 6, sequence: null },
    },
  ],
  anchor: "lru-least-recently-used",
  init: (capacity) => ({ capacity, order: [] }),
  step(state, key) {
    const hit = state.order.includes(key);
    const rest = state.order.filter((k) => k !== key);
    const evicted = !hit && rest.length >= state.capacity ? (rest.pop() ?? null) : null;
    return { state: { capacity: state.capacity, order: [key, ...rest] }, hit, evicted };
  },
  model(state, key, hit, evicted) {
    const full = state.order.length >= state.capacity;
    return {
      kind: "linear",
      items: state.order,
      capacity: state.capacity,
      next: full ? (state.order[state.order.length - 1] ?? null) : null,
      active: key,
      tone: hit ? "existing" : "new",
      removed: evicted,
      labels: { entry: "newest", exit: "next out" },
      defaultAxis: "vertical",
    };
  },
};
