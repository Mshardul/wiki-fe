import type { Experiment } from "../core/types";
import { DEFAULT_KEYS } from "./defaults";
import type { SchemeId } from "./types";

export interface SchemeCopy {
  name: string;
  chip: string;
  rule: string;
  lines: string[];
  about: [string, string][];
  tries: Experiment[];
  articleHref: string;
  summary: string;
  differs: string;
  glossaryTerm: string;
}

const CONSISTENT = "/system-design/algorithms/consistent-hashing/";
const SHARDING = "/system-design/algorithms/sharding-strategies/";
const SEQUENTIAL = ["90", "91", "92", "93", "94", "95", "96", "97"];

export const COPY: Record<SchemeId, SchemeCopy> = {
  "mod-n": {
    name: "Mod-N",
    chip: "Buckets",
    rule: "Node = hash of the key, remainder after dividing by the node count.",
    lines: [
      "Hash the key: h(k) = 37k + 11 mod 100.",
      "Divide by the node count; the remainder picks the node.",
      "After a node change, check every key again with the new count.",
    ],
    about: [
      ["Lookup", "One hash and one remainder: O(1)."],
      ["Wins", "Even spread and almost no state to keep."],
      ["Loses", "Changing the node count changes the remainder for most keys, so most keys move."],
      ["Seen in", "Simple client-side cache sharding."],
    ],
    tries: [
      {
        title: "Add one node, most keys move",
        blurb: "Going from 3 to 4 nodes changes the remainder for 6 of the 8 keys.",
        patch: { keys: DEFAULT_KEYS, nodes: 4, events: ["+"] },
      },
      {
        title: "Remove a node, still a reshuffle",
        blurb: "Take B out of 4 nodes: B only held 2 keys, yet 5 of the 8 keys move.",
        patch: { keys: DEFAULT_KEYS, nodes: 3, events: ["-B"] },
      },
    ],
    articleHref: `${CONSISTENT}#the-problem---why-modulo-hashing-breaks`,
    summary: "Node = hash mod N.",
    differs: "Even and simple, but changing N moves most keys.",
    glossaryTerm: "modulo hashing",
  },
  range: {
    name: "Range",
    chip: "Runs",
    rule: "Each node owns one contiguous range of key values.",
    lines: [
      "Find the range that holds the key.",
      "That range's node owns it.",
      "Add splits the fullest range at its middle key; remove merges into a neighbour.",
    ],
    about: [
      ["Lookup", "Search the sorted range list: O(log N)."],
      ["Wins", "Neighbouring keys stay together, so range scans hit one node."],
      ["Loses", "Sequential keys all land in the last range, which becomes a hot spot."],
      ["Seen in", "Bigtable, HBase and CockroachDB."],
    ],
    tries: [
      {
        title: "Sequential keys, one hot range",
        blurb: "Keys 90 to 97 all fall in C's range; A and B stay empty.",
        patch: { keys: SEQUENTIAL, nodes: 3, events: [] },
      },
      {
        title: "Split the hot range",
        blurb: "Adding a node splits C at its middle key, so half the burst moves to D.",
        patch: { keys: SEQUENTIAL, nodes: 4, events: ["+"] },
      },
    ],
    articleHref: `${SHARDING}#range-sharding`,
    summary: "Each node owns a contiguous key range.",
    differs: "Range scans stay on one node, but sequential keys pile onto one range.",
    glossaryTerm: "range partitioning",
  },
  ring: {
    name: "Hash ring",
    chip: "Ring",
    rule: "Walk clockwise from the key's hash to the first node position.",
    lines: [
      "Hash the key to a point on the ring.",
      "Walk clockwise to the first node position.",
      "That node owns the key.",
      "A node change moves only the keys in the arcs it gains or loses.",
    ],
    about: [
      ["Lookup", "Binary search over the ring positions: O(log N)."],
      ["Wins", "A node change moves about 1 / N of the keys."],
      ["Loses", "With one position per node the arcs, and so the shares, are uneven."],
      [
        "Virtual nodes",
        "More positions per node even the shares out; the positions here come from a fixed table, real systems use 100 to 200 per node.",
      ],
      ["Seen in", "Dynamo, Cassandra and Riak."],
    ],
    tries: [
      {
        title: "More positions, even shares",
        blurb:
          "With 8 positions each, three nodes own 33, 33 and 34 percent of the ring (1 position gives 26, 37, 37).",
        patch: { keys: DEFAULT_KEYS, nodes: 3, events: [], vnodes: "8" },
      },
      {
        title: "Add takes one arc",
        blurb: "Adding D only takes keys from the arc just before it: 2 of the 8 keys move.",
        patch: { keys: DEFAULT_KEYS, nodes: 4, events: ["+"], vnodes: "1" },
      },
    ],
    articleHref: `${CONSISTENT}#the-ring`,
    summary: "Walk clockwise from the key's hash to the first node.",
    differs:
      "A node change moves about 1/N of the keys, but shares are uneven until nodes get more positions.",
    glossaryTerm: "consistent hashing",
  },
  directory: {
    name: "Directory",
    chip: "Lookup",
    rule: "A lookup table maps each key to its node.",
    lines: [
      "Look the key up in the directory.",
      "A new key goes to the least-loaded node.",
      "Add moves recent keys off the fullest nodes until load is even; remove hands its keys to the least loaded.",
    ],
    about: [
      ["Lookup", "One table read: O(1) plus a network hop to reach the directory."],
      ["Wins", "Moves only what the balancer picks, and can isolate a hot key on its own node."],
      ["Loses", "The directory is one more thing to store, keep correct and query."],
      ["Seen in", "MongoDB's chunk map and Vitess lookup tables."],
    ],
    tries: [
      {
        title: "Add moves only the fair share",
        blurb: "Adding D hands it 79 and 97 and nothing else: 2 of the 8 keys move.",
        patch: { keys: DEFAULT_KEYS, nodes: 4, events: ["+"] },
      },
      {
        title: "Give the hot key its own node",
        blurb: "61 weighs 5. After the add, A holds only 61 while lighter keys move to D.",
        patch: { keys: ["12", "18", "29", "61*", "65", "66", "79", "97"], nodes: 4, events: ["+"] },
      },
    ],
    articleHref: `${SHARDING}#directory-based-lookup-table-sharding`,
    summary: "A lookup table maps each key to a node.",
    differs: "Moves only what the balancer picks, but every lookup adds a hop.",
    glossaryTerm: "directory-based sharding",
  },
  rendezvous: {
    name: "Rendezvous",
    chip: "Scores",
    rule: "Score the key against every node; the highest score wins.",
    lines: [
      "Score the key against every node.",
      "The highest score wins; a tie goes to the earlier letter.",
      "A node change moves only keys whose top score changes hands.",
    ],
    about: [
      ["Lookup", "Score every node: O(N)."],
      ["Wins", "Moves about 1 / N of the keys like the ring, with no ring to maintain."],
      ["Loses", "Every lookup scores every node."],
      ["Seen in", "GitHub's GLB load balancer and Apache Ignite."],
    ],
    tries: [
      {
        title: "Add moves only what the new node wins",
        blurb: "D wins 29 and 97 and nothing else: 2 of the 8 keys move.",
        patch: { keys: DEFAULT_KEYS, nodes: 4, events: ["+"] },
      },
      {
        title: "Remove spreads the lost node's keys",
        blurb: "B's 4 keys go to their runner-up: 12 and 65 to A, 18 and 79 to C.",
        patch: { keys: DEFAULT_KEYS, nodes: 2, events: ["-B"] },
      },
    ],
    articleHref: `${CONSISTENT}#often-confused-with`,
    summary: "Score the key against every node; highest wins.",
    differs: "Moves about 1/N like the ring, with no ring, but lookup is O(N).",
    glossaryTerm: "rendezvous hashing",
  },
};
