import type { Experiment } from "../core/types";
import type { HashId } from "./types";

export interface HashCopy {
  name: string;
  chip: string;
  rule: string;
  lines: string[];
  about: [string, string][];
  tries: Experiment[];
  articleHref: string;
  metricLabel: string;
  // Mini run for the Revision card; it brings its own size and limit.
  mini: { size: number; threshold: number; tokens: string[] };
  summary: string;
  differs: string;
}

const seq = (...n: (number | string)[]): string[] => n.map(String);
const HREF = "/dsa/data-structures/hash-table/";

export const COPY: Record<HashId, HashCopy> = {
  chaining: {
    name: "Chaining",
    chip: "Lists",
    rule: "Colliding keys share a slot by hanging in a list.",
    lines: [
      "Hash the key to a slot.",
      "Walk the list in that slot.",
      "Add the key at the end if it is not there.",
    ],
    about: [
      [
        "Cost",
        "One step per item in the list: short when keys spread out, long when they pile up.",
      ],
      ["Wins", "Never fills up; a delete just unlinks one item."],
      ["Loses", "Every item costs a pointer, and a bad spread turns a slot into a long list."],
      ["Seen in", "Language dictionaries and sets, and caches with many keys per slot."],
    ],
    tries: [
      {
        title: "Everything collides",
        blurb: "Every key hashes to slot 0, so one list holds them all.",
        patch: { sequence: seq(0, 8, 16, 24, 32) },
      },
      {
        title: "Delete from the middle",
        blurb: "Unlink 8 and the neighbours join up; the lookup after it still works.",
        patch: { sequence: seq(16, 8, 24, "-8", "?24") },
      },
    ],
    articleHref: HREF,
    metricLabel: "Nodes walked",
    mini: { size: 8, threshold: 0.75, tokens: seq(16, 8, 24, 32) },
    summary: "Collisions pile up in a list, so the table never fills.",
    differs: "Unlike probing, a collision never moves a key to another slot.",
  },
  linear: {
    name: "Linear probing",
    chip: "Next slot",
    rule: "If the slot is taken, try the next one.",
    lines: [
      "Hash the key to a slot.",
      "While the slot is taken, move to the next one.",
      "Put the key in the first empty slot.",
    ],
    about: [
      ["Cost", "One probe per slot visited; long runs of full slots make every walk longer."],
      ["Wins", "Plain array, great cache behaviour, no extra pointers."],
      ["Loses", "Clusters: a full run grows every time a key lands in or next to it."],
      ["Seen in", "Fast in-memory tables where keys are small."],
    ],
    tries: [
      {
        title: "Delete leaves a marker",
        blurb: "Deleting 8 leaves a marker, and the lookup for 24 steps over it.",
        patch: { sequence: seq(16, 8, 24, 5, "-8", "?24") },
      },
      {
        title: "Clusters grow",
        blurb: "Keys in a row make one long run, and the next key must walk all of it.",
        patch: { sequence: seq(0, 1, 2, 3, 4, 5) },
      },
    ],
    articleHref: HREF,
    metricLabel: "Probes",
    mini: { size: 8, threshold: 0.75, tokens: seq(16, 8, 24, 32) },
    summary: "Collisions spill into the next slot, so runs of full slots grow.",
    differs: "Unlike chaining, every key lives in the array itself.",
  },
  quadratic: {
    name: "Quadratic probing",
    chip: "Jump 1, 4, 9",
    rule: "If the slot is taken, jump 1, 4, 9 slots from the start.",
    lines: [
      "Hash the key to a slot.",
      "While the slot is taken, jump by the next square from the start slot.",
      "Put the key in the first empty slot.",
    ],
    about: [
      ["Cost", "One probe per slot tried; the jumps spread keys out so runs stay short."],
      ["Wins", "Breaks up the clusters that linear probing builds."],
      ["Loses", "The jumps can revisit the same few slots and miss free ones entirely."],
      ["Seen in", "Open-addressing tables that want fewer clusters without a second hash."],
    ],
    tries: [
      {
        title: "No way out",
        blurb: "The jumps from slot 0 only reach 0, 1 and 4, so 32 is stuck while slots are free.",
        patch: { sequence: seq(16, 8, 24, 32) },
      },
      {
        title: "Jumps 1, 4, 9",
        blurb: "In a bigger table 48 jumps 1, then 4, then 9 before it finds a slot.",
        patch: { size: 12, sequence: seq(12, 24, 36, 48) },
      },
    ],
    articleHref: HREF,
    metricLabel: "Probes",
    mini: { size: 8, threshold: 0.75, tokens: seq(16, 8, 24, 5) },
    summary: "Jumps 1, 4, 9 break up runs but can miss free slots.",
    differs: "Unlike linear probing, the gap grows with each probe.",
  },
  double: {
    name: "Double hashing",
    chip: "Second hash",
    rule: "If the slot is taken, step by a second hash of the key.",
    lines: [
      "Hash the key to a slot.",
      "Hash it again to get a step, then move on by that step while the slot is taken.",
      "Put the key in the first empty slot.",
    ],
    about: [
      ["Cost", "One probe per slot tried; keys that collide first usually part ways at once."],
      ["Wins", "Almost no clustering, because the step depends on the key."],
      ["Loses", "A step that shares a factor with the table size only reaches some slots."],
      ["Seen in", "Open-addressing tables that need an even spread."],
    ],
    tries: [
      {
        title: "Even step cycles",
        blurb:
          "64 has an even step, so it only visits slots 0, 2, 4, 6 and gets stuck with odd slots free.",
        patch: { sequence: seq(8, 24, 40, 2, 64) },
      },
      {
        title: "Step equals the size",
        blurb: "Every step is 7, so each later key stays on slot 6 and gets stuck.",
        patch: { size: 7, sequence: seq(6, 13, 20) },
      },
    ],
    articleHref: HREF,
    metricLabel: "Probes",
    mini: { size: 8, threshold: 0.75, tokens: seq(16, 8, 24, 5, 32) },
    summary: "The step comes from the key, so keys that collide at the start part ways.",
    differs:
      "Unlike quadratic probing, two keys with the same start can still take different paths.",
  },
  resize: {
    name: "Resize",
    chip: "Grow",
    rule: "When the table gets too full, build one twice as big and re-place every key.",
    lines: [
      "Insert as in linear probing.",
      "If the load goes above the limit, build a bigger table.",
      "Re-place every key with the new size.",
    ],
    about: [
      [
        "Cost",
        "A rehash touches every key, but it happens rarely, so inserts stay cheap on average.",
      ],
      ["Wins", "Keeps walks short by never letting the table get crowded."],
      ["Loses", "One insert occasionally pays for the whole rebuild."],
      ["Seen in", "Every growable hash table in a standard library."],
    ],
    tries: [
      {
        title: "Limit 0.5",
        blurb: "A lower limit grows sooner: fewer collisions, more empty space.",
        patch: { threshold: "0.5" },
      },
      {
        title: "Limit 0.9",
        blurb: "A higher limit waits longer: more collisions before the table grows.",
        patch: { threshold: "0.9" },
      },
    ],
    articleHref: HREF,
    metricLabel: "Probes",
    mini: { size: 4, threshold: 0.75, tokens: seq(5, 9, 2, 6) },
    summary: "A table that fills past the limit is rebuilt twice as big.",
    differs: "The other variants never change the table size; this one re-places every key.",
  },
};
