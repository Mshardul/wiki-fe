import type { Experiment } from "../core/types";
import type { PolicyId } from "./types";

export interface PolicyCopy {
  name: string;
  chip: string;
  rule: string;
  // Arrival, the policy's rule, landing, finishing, failure: path indexes point here.
  lines: string[];
  about: [string, string][];
  tries: Experiment[];
  articleHref: string;
  summary: string;
  differs: string;
}

const ARTICLE = "/system-design/components/load-balancer-algorithms/";
export const DEFAULT_DURATIONS = ["9", "2", "2", "6", "2", "2", "8"];
export const EVEN_DURATIONS = ["3", "3", "3", "3", "3", "3", "3"];

export const COPY: Record<PolicyId, PolicyCopy> = {
  "round-robin": {
    name: "Round robin",
    chip: "Turn",
    rule: "Servers take turns in order; the load on each is never looked at.",
    lines: [
      "A request arrives at the balancer.",
      "The balancer gives it to the server whose turn it is.",
      "The request joins that server and the turn moves on.",
      "A request ends when its time runs out.",
      "A server that is down is skipped.",
    ],
    about: [
      ["Decision", "One counter: O(1), no per-server state."],
      ["Wins", "Simple, and fair when every request costs about the same."],
      ["Loses", "Long requests pile up on whichever server drew them; load is never checked."],
      ["Seen in", "HAProxy and nginx defaults."],
    ],
    tries: [
      {
        title: "Long requests pile up",
        blurb:
          "r1, r4 and r7 are the long ones and all fall on S1 while S2 and S3 sit nearly idle.",
        patch: { durations: DEFAULT_DURATIONS, servers: 3, failure: "none" },
      },
      {
        title: "Lose a server",
        blurb:
          "S1 fails before r5 while running r1 and r4: both move, and the turn skips S1 from then on.",
        patch: { durations: DEFAULT_DURATIONS, servers: 3, failure: "1" },
      },
    ],
    articleHref: `${ARTICLE}#round-robin--weighted-round-robin`,
    summary: "Servers take turns.",
    differs: "Fair in count, blind to load: long requests pile up on one server.",
  },
  weighted: {
    name: "Weighted round robin",
    chip: "Weights",
    rule: "Servers take turns, but each takes as many requests as its weight before the turn moves on.",
    lines: [
      "A request arrives at the balancer.",
      "The balancer gives it to the next server that still has credits.",
      "The request joins that server and uses one credit; at zero the turn moves on, and when every credit is spent all are refilled.",
      "A request ends when its time runs out.",
      "A server that is down is skipped.",
    ],
    about: [
      ["Decision", "A pointer and one credit counter per server: O(1)."],
      ["Wins", "A bigger machine gets a proportionally bigger share."],
      ["Loses", "Still ignores how busy a server is right now."],
      ["Seen in", "Envoy and nginx with weight settings."],
    ],
    tries: [
      {
        title: "Bigger server, bigger share",
        blurb:
          "With equal requests S1 (weight 3) takes three in a row, S2 two, S3 one, then all refill.",
        patch: { durations: EVEN_DURATIONS, servers: 3, failure: "none" },
      },
      {
        title: "A long request on the big server",
        blurb:
          "Weights do not see time: r1 is long and still sits on S1 while it takes r2 and r3 as well.",
        patch: { durations: DEFAULT_DURATIONS, servers: 3, failure: "none" },
      },
    ],
    articleHref: `${ARTICLE}#round-robin--weighted-round-robin`,
    summary: "Turns, in proportion to weight.",
    differs: "Fits unequal machines, but still blind to current load.",
  },
  "least-connections": {
    name: "Least connections",
    chip: "Load",
    rule: "Each request goes to the server with the fewest connections open right now.",
    lines: [
      "A request arrives at the balancer.",
      "The balancer compares every server's open connections; the fewest wins, a tie goes to the earlier server.",
      "The request joins that server and its count goes up by one.",
      "A request ends when its time runs out, and the count goes down.",
      "A server that is down is left out of the comparison.",
    ],
    about: [
      ["Decision", "Compare N counters: O(N), or O(log N) with a heap."],
      ["Wins", "Adapts to uneven request lengths: a busy server stops getting more."],
      ["Loses", "Needs a live connection count per server; a new server gets a burst."],
      ["Seen in", "HAProxy leastconn and nginx least_conn."],
    ],
    tries: [
      {
        title: "An idle server wins",
        blurb:
          "At r7, S1 holds two requests, S2 one, and S3 has just finished its last: r7 goes to S3.",
        patch: { durations: DEFAULT_DURATIONS, servers: 3, failure: "none" },
      },
      {
        title: "Equal requests behave like round robin",
        blurb: "When every request lasts the same, counts stay level and the choice rotates.",
        patch: { durations: EVEN_DURATIONS, servers: 3, failure: "none" },
      },
    ],
    articleHref: `${ARTICLE}#least-connections--weighted-least-connections`,
    summary: "Fewest open connections wins.",
    differs: "Sees the load round robin ignores, at the cost of counting connections.",
  },
  "ip-hash": {
    name: "IP hash",
    chip: "Hash",
    rule: "The client's address picks the server, so the same client always reaches the same one.",
    lines: [
      "A request arrives at the balancer.",
      "The balancer takes the last number of the client address and divides by the servers that are up; the remainder picks the server.",
      "The request joins that server.",
      "A request ends when its time runs out.",
      "When a server goes down the divisor changes, so clients move servers.",
    ],
    about: [
      ["Decision", "One hash and one remainder: O(1), no per-server state."],
      ["Wins", "A client keeps landing on the same server, so its session data stays put."],
      ["Loses", "Load is never checked, and changing the server count remaps most clients."],
      ["Seen in", "nginx ip_hash and HAProxy source balancing."],
    ],
    tries: [
      {
        title: "Same client, same server",
        blurb: "10.0.0.4 always reaches S2 and 10.0.0.9 always reaches S1, however busy they are.",
        patch: { durations: DEFAULT_DURATIONS, servers: 3, failure: "none" },
      },
      {
        title: "A server dies, clients remap",
        blurb:
          "With S2 down the remainder is taken over two servers, so r1 and every later client land somewhere new.",
        patch: { durations: DEFAULT_DURATIONS, servers: 3, failure: "2" },
      },
    ],
    articleHref: `${ARTICLE}#deterministic-ip-hashing`,
    summary: "Client address picks the server.",
    differs: "Keeps clients on one server, but ignores load and reshuffles when the pool changes.",
  },
};
