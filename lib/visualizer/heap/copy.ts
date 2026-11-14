import type { Experiment } from "../core/types";
import type { HeapId } from "./types";

export interface HeapCopy {
  name: string;
  chip: string;
  rule: string;
  lines: string[];
  about: [string, string][];
  tries: Experiment[];
  articleHref: string;
  // Mini input for the Revision card, hand-picked to show the defining behaviour.
  mini: number[];
  summary: string;
  differs: string;
}

const seq = (...n: number[]): string[] => n.map(String);
const MAX = { order: "max" };

export const COPY: Record<HeapId, HeapCopy> = {
  insert: {
    name: "Insert",
    chip: "Sift up",
    rule: "Add the value at the bottom, then swap it upward while it beats its parent.",
    lines: [
      "Add the new value in the next free spot at the bottom.",
      "Compare it with its parent.",
      "If it belongs higher, swap them and repeat.",
      "Otherwise it is in place and the heap order holds.",
    ],
    about: [
      ["Cost", "At most one swap per level, so O(log n) per insert."],
      ["Wins", "Adding items one at a time while always knowing the smallest or biggest."],
      ["Loses", "Building a whole heap from scratch: n inserts cost more than one build-heap."],
      ["Seen in", "Priority queues, schedulers and event simulations."],
    ],
    tries: [
      {
        title: "Max heap",
        blurb: "Flip the rule: the biggest value rises to the top.",
        patch: MAX,
      },
      {
        title: "Already sorted",
        blurb: "Each new value is bigger than its parent, so nothing moves.",
        patch: { sequence: seq(1, 2, 3, 4, 5, 6) },
      },
      {
        title: "Reversed",
        blurb: "Every new value climbs all the way to the top: the worst case.",
        patch: { sequence: seq(6, 5, 4, 3, 2, 1) },
      },
    ],
    articleHref: "/dsa/data-structures/heap/",
    mini: [4, 2, 5, 1, 3],
    summary: "Each new value enters at the bottom and swaps upward until its parent beats it.",
    differs: "Unlike extract, the work happens at the bottom and moves up.",
  },
  extract: {
    name: "Extract",
    chip: "Sift down",
    rule: "Take the top item, move the last item to the top, then swap it down.",
    lines: [
      "Take the top item out.",
      "Move the last item to the top to fill the gap.",
      "Pick the child that belongs higher and compare.",
      "Swap them if the child wins, and repeat until the item is in place.",
    ],
    about: [
      ["Cost", "At most two compares per level, so O(log n) per extract."],
      ["Wins", "Always getting the smallest or biggest item next, without sorting everything."],
      ["Loses", "Finding an arbitrary item: only the top is easy to reach."],
      ["Seen in", "Dijkstra's algorithm, task schedulers and merging sorted streams."],
    ],
    tries: [
      { title: "Max heap", blurb: "The biggest value is taken first.", patch: MAX },
      {
        title: "Two values",
        blurb: "The last item moves up and there is nothing to sift.",
        patch: { sequence: seq(1, 2) },
      },
    ],
    articleHref: "/dsa/data-structures/heap/",
    mini: [1, 2, 3, 4, 5],
    summary: "The top leaves, the last item takes its place, then sinks below its better child.",
    differs: "Unlike insert, the work starts at the top and moves down.",
  },
  build: {
    name: "Build-heap vs n inserts",
    chip: "Bottom-up",
    rule: "Sift every parent down, from the last one back to the root.",
    lines: [
      "Start at the last item that has children.",
      "Sift it down: pick the better child, compare, swap if the child wins.",
      "Move one step back toward the root and repeat.",
    ],
    about: [
      ["Cost", "O(n) in total: most nodes sit near the bottom and barely move."],
      ["Wins", "Making a heap out of data you already have."],
      ["Loses", "Nothing here: n separate inserts always do at least as much work."],
      ["Seen in", "The first phase of heap sort and heapify calls in libraries."],
    ],
    tries: [
      {
        title: "Reversed",
        blurb: "The worst case for one-by-one inserts; build-heap does far fewer swaps.",
        patch: { sequence: seq(9, 8, 7, 6, 5, 4, 3, 2, 1), order: "min" },
      },
      {
        title: "Already a heap",
        blurb: "Nothing needs to swap, but every parent is still checked.",
        patch: { sequence: seq(1, 2, 3, 4, 5, 6, 7) },
      },
    ],
    articleHref: "/dsa/data-structures/heap/",
    mini: [5, 4, 3, 2, 1],
    summary: "Fix the heap from the bottom up so most nodes need no work at all.",
    differs: "Unlike n inserts it never moves an item up, so the total work stays linear.",
  },
  heapsort: {
    name: "Heap sort",
    chip: "Sorting",
    rule: "Build a heap, then keep swapping the top to the back and repairing the heap.",
    lines: [
      "Build a heap from the whole array.",
      "Swap the top with the last heap item; it is now final.",
      "Sift the new top down to repair the heap.",
      "Repeat until one item is left.",
    ],
    about: [
      ["Cost", "O(n log n) always, in place, with no extra array."],
      ["Wins", "A guaranteed bound with no extra space."],
      ["Loses", "Not stable, and jumpy memory access makes it slower than quick sort in practice."],
      ["Seen in", "Introsort fallbacks and embedded systems."],
    ],
    tries: [
      {
        title: "Max heap",
        blurb: "The biggest goes to the back each time, so the array ends ascending.",
        patch: MAX,
      },
      {
        title: "Min heap",
        blurb: "The smallest goes to the back, so the array ends largest first.",
        patch: { order: "min" },
      },
    ],
    articleHref: "/dsa/algorithms/heapsort/",
    mini: [2, 1, 3, 5, 4],
    summary: "Build a heap once, then peel the top off into a sorted tail.",
    differs:
      "Unlike merge sort it sorts in place; unlike quick sort its worst case is still n log n.",
  },
  topk: {
    name: "Top-K",
    chip: "Streaming",
    rule: "Keep a small heap of K items and let each new value fight the root.",
    lines: [
      "Read the next value from the stream.",
      "If the heap has room, add it.",
      "Otherwise compare it with the root; skip it unless it beats the root.",
      "If it wins, evict the root, place it there and sift down.",
    ],
    about: [
      ["Cost", "O(n log k): each value touches a heap that never grows past K."],
      ["Wins", "A huge or endless stream: memory stays at K items."],
      ["Loses", "Needing the full sorted order, not just the best K."],
      ["Seen in", "Leaderboards, trending lists and nearest-neighbour search."],
    ],
    tries: [
      {
        title: "Smallest K",
        blurb: "Switch to a max heap and keep the K smallest values.",
        patch: MAX,
      },
      {
        title: "Bigger K",
        blurb: "With K close to the stream length almost nothing is evicted.",
        patch: { k: 5 },
      },
    ],
    articleHref: "/dsa/data-structures/heap/",
    mini: [5, 3, 8, 1, 4, 7],
    summary: "A K-sized heap whose root is the weakest keeper; only a better value gets in.",
    differs: "Unlike heap sort it never holds the whole input, only K items.",
  },
};
