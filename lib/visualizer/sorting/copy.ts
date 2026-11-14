import type { Experiment } from "../core/types";
import type { SortId } from "./types";

export interface SortCopy {
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
const ALREADY = { sequence: seq(1, 2, 3, 4, 5, 6) };
const REVERSED = { preset: "reversed", sequence: null };

export const COPY: Record<SortId, SortCopy> = {
  insertion: {
    name: "Insertion sort",
    chip: "Comparison",
    rule: "Take the next item and slide it left until it meets a smaller one.",
    lines: [
      "Take the next item from the unsorted part.",
      "Compare it with the item on its left.",
      "If the left one is bigger, swap them and keep moving left.",
      "Otherwise it is in place, so take the next item.",
    ],
    about: [
      [
        "Cost",
        "Fast on almost-sorted data, quadratic on scrambled data: each item may travel the whole sorted part.",
      ],
      ["Wins", "Tiny arrays and nearly sorted input. Stable, and needs no extra space."],
      ["Loses", "Large scrambled or reversed input, where every item moves all the way left."],
      ["Seen in", "The small-array step inside many library sorts, and sorting a hand of cards."],
    ],
    tries: [
      {
        title: "Already sorted",
        blurb: "One compare per item and no swaps: the best case.",
        patch: ALREADY,
      },
      {
        title: "Reversed",
        blurb: "Every item travels all the way left: the worst case.",
        patch: REVERSED,
      },
      {
        title: "Stability on",
        blurb: "Equal items never pass each other, so a and b stay in order.",
        patch: { stable: "on", sequence: seq(2, 2, 1, 3, 3, 1) },
      },
    ],
    articleHref: "/dsa/algorithms/insertion-sort/",
    mini: [4, 2, 5, 1, 3],
    summary:
      "Grow a sorted prefix: each new item slides left past every bigger item until it fits.",
    differs:
      "Unlike selection sort it stops early when the item is already in place, so sorted input is nearly free.",
  },
  selection: {
    name: "Selection sort",
    chip: "Comparison",
    rule: "Find the smallest item in the unsorted part and swap it to the front.",
    lines: [
      "Scan the unsorted part for the smallest item.",
      "Remember the smallest one seen so far.",
      "Swap it into the first unsorted spot, then repeat.",
    ],
    about: [
      [
        "Cost",
        "Always about n²/2 comparisons, whatever the input looks like, but at most n swaps.",
      ],
      ["Wins", "Almost no writes, which matters when moving an item is expensive."],
      ["Loses", "Never speeds up on sorted input, and the long-distance swaps are not stable."],
      ["Seen in", "Teaching, and tiny devices where writes to memory are costly."],
    ],
    tries: [
      {
        title: "Already sorted",
        blurb: "It still scans every item: the compare count does not drop.",
        patch: ALREADY,
      },
      { title: "Reversed", blurb: "Same number of compares as any other input.", patch: REVERSED },
      {
        title: "Stability on",
        blurb: "A long swap carries an item past its equal twin, so b lands before a.",
        patch: { stable: "on", sequence: seq(2, 2, 1, 3) },
      },
    ],
    articleHref: "/dsa/algorithms/selection-sort/",
    mini: [4, 2, 5, 1, 3],
    summary: "Repeatedly pick the smallest remaining item and swap it into the next open spot.",
    differs:
      "Unlike insertion sort it does the same work on every input, but it only ever swaps once per round.",
  },
  merge: {
    name: "Merge sort",
    chip: "Comparison",
    rule: "Split in half until single items, then merge sorted halves back together.",
    lines: [
      "Split the range in half until each piece has one item.",
      "Compare the front items of the two sorted halves.",
      "Take the smaller one into the merged row.",
      "Copy the merged row back.",
    ],
    about: [
      ["Cost", "About n log n compares on every input, plus n extra space for the merged row."],
      [
        "Wins",
        "Predictable speed and stable. Works well on linked lists and data too big for memory.",
      ],
      ["Loses", "Needs the extra row, and is slower than insertion sort on tiny arrays."],
      ["Seen in", "Stable library sorts and external sorting of huge files."],
    ],
    tries: [
      {
        title: "Already sorted",
        blurb: "Same splits and merges: the work barely changes.",
        patch: ALREADY,
      },
      { title: "Reversed", blurb: "Still n log n: no input is a worst case.", patch: REVERSED },
      {
        title: "Stability on",
        blurb: "Ties take the left item first, so equal items keep their order.",
        patch: { stable: "on", sequence: seq(3, 1, 3, 2, 1, 2) },
      },
    ],
    articleHref: "/dsa/algorithms/merge-sort/",
    mini: [4, 2, 5, 1, 3],
    summary:
      "Divide until trivial, then merge sorted halves using a second row to hold the result.",
    differs:
      "The only comparison sort here that needs a second row, and the only one with the same cost on every input.",
  },
  quick: {
    name: "Quick sort",
    chip: "Comparison",
    rule: "Pick a pivot, push smaller items before it, then repeat on each side.",
    lines: [
      "Pick the last item as the pivot.",
      "Walk through the range; items smaller than the pivot move to the front.",
      "Put the pivot between the smaller and larger items.",
      "Repeat the same on the left and right parts.",
    ],
    about: [
      ["Cost", "About n log n on average, but n² when the pivot keeps landing at an end."],
      ["Wins", "Fast in practice, in place, and friendly to the CPU cache."],
      ["Loses", "Sorted or all-equal input with a last-item pivot; not stable."],
      ["Seen in", "Default sorts in many standard libraries, usually with a smarter pivot."],
    ],
    tries: [
      {
        title: "Already sorted",
        blurb: "The pivot is always the biggest, so one side is empty each time.",
        patch: ALREADY,
      },
      {
        title: "All equal",
        blurb: "Nothing is smaller than the pivot, so the pivot lands at the front every time.",
        patch: { sequence: seq(3, 3, 3, 3, 3, 3) },
      },
      {
        title: "Reversed",
        blurb: "The pivot is the smallest each time: another lopsided run.",
        patch: REVERSED,
      },
    ],
    articleHref: "/dsa/algorithms/quicksort/",
    mini: [4, 2, 5, 1, 3],
    summary:
      "Partition around a pivot so it lands in its final spot, then sort each side the same way.",
    differs: "Unlike merge sort it works in place, but a bad pivot choice makes it quadratic.",
  },
  heap: {
    name: "Heap sort",
    chip: "Comparison",
    rule: "Build a max-heap, then keep swapping the biggest item to the back and repairing the heap.",
    lines: [
      "Arrange the items into a max-heap so the biggest is at the top.",
      "Swap the top with the last heap item; that item is now final.",
      "Sift the new top down until the heap order holds again.",
      "Repeat until one item is left.",
    ],
    about: [
      ["Cost", "Always n log n and in place: the heap shrinks by one each round."],
      ["Wins", "A guaranteed bound with no extra array."],
      [
        "Loses",
        "Not stable, and slower than quick sort in practice because it jumps around memory.",
      ],
      ["Seen in", "Introsort fallbacks and memory-tight systems."],
    ],
    tries: [
      {
        title: "Stability on",
        blurb: "Equal items can swap places: heap sort is not stable.",
        patch: { stable: "on", sequence: seq(2, 2, 1, 3, 3, 1) },
      },
      {
        title: "Already sorted",
        blurb: "No early exit: it still builds the heap and pulls every item out.",
        patch: ALREADY,
      },
      {
        title: "Reversed",
        blurb: "Costs about the same as any other input.",
        patch: REVERSED,
      },
    ],
    articleHref: "/dsa/algorithms/heapsort/",
    mini: [4, 2, 5, 1, 3],
    summary: "Turn the array into a heap, then peel the biggest off into a sorted tail.",
    differs:
      "Unlike quick sort its worst case stays n log n, and unlike merge sort it needs no extra array.",
  },
  counting: {
    name: "Counting sort",
    chip: "Non-comparison",
    rule: "Count each value, turn counts into start spots, then place every item.",
    lines: [
      "Count how many times each value appears.",
      "Turn the counts into starting spots.",
      "Place each item at its spot, in input order.",
    ],
    about: [
      ["Cost", "n plus the number of possible values: no comparisons at all."],
      ["Wins", "Small value ranges, where it beats every comparison sort. Stable."],
      ["Loses", "Wide value ranges: the counts row grows with the range, not the item count."],
      ["Seen in", "Sorting by age, grade or small keys, and as the inner step of radix sort."],
    ],
    tries: [
      {
        title: "Duplicates",
        blurb: "Repeated values just raise one tally.",
        patch: { preset: "duplicates", sequence: null },
      },
      {
        title: "Stability on",
        blurb: "Equal values come out in the order they went in.",
        patch: { stable: "on", sequence: seq(2, 1, 2, 3, 1) },
      },
      {
        title: "Reversed",
        blurb: "The order of the input makes no difference to the work.",
        patch: REVERSED,
      },
    ],
    articleHref: "/dsa/algorithms/counting-sort/",
    mini: [2, 1, 2, 3, 1],
    summary: "Tally each value, convert tallies to start spots, then drop each item into its spot.",
    differs:
      "Never compares two items; it reads the answer from the counts, so it is limited to small whole-number ranges.",
  },
  radix: {
    name: "Radix sort",
    chip: "Non-comparison",
    rule: "Sort by one digit at a time, ones digit first, keeping earlier order on ties.",
    lines: [
      "Look at one digit of every item, starting from the ones digit.",
      "Drop each item into the bucket for that digit.",
      "Collect the buckets in order, then move to the next digit.",
    ],
    about: [
      ["Cost", "n times the number of digits: two passes for two-digit numbers."],
      ["Wins", "Many fixed-length numbers or strings. Stable on every pass."],
      ["Loses", "Items with very many digits, or keys that are not digits at all."],
      ["Seen in", "Sorting IDs, phone numbers, fixed-width records and integer keys."],
    ],
    tries: [
      {
        title: "Same tens digit",
        blurb: "The first pass does all the work; the second pass changes nothing.",
        patch: { sequence: seq(25, 21, 27, 23, 29, 22) },
      },
      {
        title: "Stability on",
        blurb:
          "Each pass keeps the earlier order of equal digits, which is why the result is right.",
        patch: { stable: "on", sequence: seq(31, 12, 31, 24, 12, 45) },
      },
      {
        title: "Reversed",
        blurb: "Order does not matter: it is always the same two passes.",
        patch: REVERSED,
      },
    ],
    articleHref: "/dsa/algorithms/radix-sort/",
    mini: [31, 12, 23, 14],
    summary: "Bucket by the ones digit, collect, then bucket by the tens digit and collect again.",
    differs:
      "Sorts whole numbers digit by digit using buckets, so it needs no comparisons but does need stable passes.",
  },
  bucket: {
    name: "Bucket sort",
    chip: "Non-comparison",
    rule: "Drop items into value ranges, sort each small bucket, then join them.",
    lines: [
      "Split the value range into buckets.",
      "Drop each item into its bucket.",
      "Sort each bucket on its own.",
      "Collect the buckets in order.",
    ],
    about: [
      ["Cost", "Close to n when items spread evenly; quadratic if they all land in one bucket."],
      ["Wins", "Evenly spread numbers, like random decimals between 0 and 1."],
      ["Loses", "Clumped data: one crowded bucket does all the work."],
      ["Seen in", "Sorting uniformly random values and as a building block of distributed sorts."],
    ],
    tries: [
      {
        title: "Evenly spread",
        blurb: "Each bucket gets about the same number: the happy case.",
        patch: { sequence: seq(2, 5, 8, 1, 4, 7) },
      },
      {
        title: "All in one bucket",
        blurb: "One bucket holds everything, so the bucketing bought nothing.",
        patch: { sequence: seq(1, 2, 3, 2, 1, 3) },
      },
      {
        title: "Reversed",
        blurb: "Input order only changes the order inside each bucket.",
        patch: REVERSED,
      },
    ],
    articleHref: "/dsa/algorithms/bucket-sort/",
    mini: [4, 2, 5, 1, 3],
    summary:
      "Spread items over value ranges, sort the few items in each range, then read the ranges in order.",
    differs:
      "Works well only when values spread evenly; counting sort buckets by exact value, bucket sort by range.",
  },
};
