import type { AlgorithmId, AlgorithmMeta } from "./types";

export const RATE_LIMITING_ARTICLE = "/system-design/algorithms/rate-limiting-algorithms/";

const DEFAULT_SEQ = ["4", "5", "5", "6", "6", "7", "7", "11"];

export const ALGORITHM_META: Record<AlgorithmId, AlgorithmMeta> = {
  "fixed-window": {
    id: "fixed-window",
    name: "Fixed window",
    chip: "Timeline",
    rule: "Count requests in clock-aligned windows and reset the count at each boundary.",
    lines: [
      "Move to tick {tick}; if a new window began, reset the count.",
      "Below the limit → allow and count it.",
      "At the limit → reject.",
    ],
    paths: { ok: [0, 1], bad: [0, 2] },
    okWord: "allowed",
    failWord: "rejected",
    about: [
      ["Cost", "O(1) memory and time per client: one counter"],
      ["Wins", "the cheapest of the five; easy to build on an atomic increment with an expiry"],
      ["Loses", "a burst split across a window boundary can pass twice the limit"],
      ["Seen in", "simple per-minute API quotas"],
      ["Rate", "Limit per window, the same average rate as the other four"],
    ],
    tries: [
      {
        title: "Straddle the boundary",
        blurb:
          "Six requests slip through in four ticks, twice the limit, because the window resets in the middle of the burst.",
        patch: { sequence: DEFAULT_SEQ, limit: 3, pace: "2" },
      },
      {
        title: "Move the burst off the boundary",
        blurb: "The same burst inside one window: only the limit gets through.",
        patch: { sequence: ["1", "2", "2", "3", "3", "4", "4"], limit: 3, pace: "2" },
      },
    ],
    anchor: "fixed-window-counter",
    summary: "Count requests in clock-aligned windows; reset at each boundary.",
    glossaryTerm: "fixed window counter",
    differs: "Cheapest, but a burst split across a boundary gets double the limit.",
  },
  "sliding-log": {
    id: "sliding-log",
    name: "Sliding log",
    chip: "Timeline + list",
    rule: "Keep a timestamp for every allowed request and count the ones in the last window.",
    lines: [
      "Move to tick {tick}; drop timestamps older than the window.",
      "Fewer than the limit kept → allow and keep this tick.",
      "At the limit → reject.",
    ],
    paths: { ok: [0, 1], bad: [0, 2] },
    okWord: "allowed",
    failWord: "rejected",
    about: [
      ["Cost", "O(limit) memory per client, plus pruning on each request"],
      ["Wins", "exact: no boundary spike is possible"],
      ["Loses", "memory grows with the limit, which hurts at high limits and many clients"],
      ["Seen in", "strict limits such as login attempts"],
      ["Rate", "Limit per window, the same average rate as the other four"],
    ],
    tries: [
      {
        title: "Same stream, no spike",
        blurb: "The window slides with now, so the burst can never exceed the limit.",
        patch: { sequence: DEFAULT_SEQ, limit: 3, pace: "2" },
      },
      {
        title: "Memory grows with Limit",
        blurb: "Five allowed requests means five timestamps to keep.",
        patch: { sequence: ["2", "2", "2", "2", "2", "3"], limit: 5, pace: "2" },
      },
    ],
    anchor: "sliding-window-log",
    summary: "Keep a timestamp for every allowed request; count those in the last window.",
    glossaryTerm: "sliding window log",
    differs: "Exact, no spike, but memory grows with the limit.",
  },
  "sliding-counter": {
    id: "sliding-counter",
    name: "Sliding counter",
    chip: "Timeline",
    rule: "Estimate the last window from two counters, weighting the previous window by its overlap.",
    lines: [
      "Move to tick {tick}; if a new window began, the old count becomes the previous one.",
      "Estimate = previous × share still inside the window + current.",
      "Estimate below the limit → allow and count it.",
      "Otherwise → reject.",
    ],
    paths: { ok: [0, 1, 2], bad: [0, 1, 3] },
    okWord: "allowed",
    failWord: "rejected",
    about: [
      ["Cost", "O(1): two counters per client"],
      ["Wins", "close to the log's accuracy for the price of a fixed window"],
      ["Loses", "only an estimate: it assumes the previous window was evenly spread"],
      ["Seen in", "high-volume API gateways"],
      ["Rate", "Limit per window, the same average rate as the other four"],
    ],
    tries: [
      {
        title: "Estimate too generous",
        blurb:
          "Three requests end one window and one more lands just after the boundary: the estimate lets a fourth through where the log would not.",
        patch: { sequence: ["5", "5", "5", "6", "7", "7"], limit: 3, pace: "2" },
      },
      {
        title: "Estimate too strict",
        blurb:
          "The burst was a whole window ago, but the estimate still counts part of it and rejects requests the log would allow.",
        patch: { sequence: ["0", "0", "0", "6", "6", "6"], limit: 3, pace: "2" },
      },
    ],
    anchor: "sliding-window-counter",
    summary: "Weight the previous window's count by how much of it the last window still covers.",
    glossaryTerm: "sliding window counter",
    differs: "Close to the log's accuracy in two counters, but only an estimate.",
  },
  "token-bucket": {
    id: "token-bucket",
    name: "Token bucket",
    chip: "Tokens + timeline",
    rule: "Spend a token per request; tokens refill at a steady pace up to the bucket size.",
    lines: [
      "Move to tick {tick}; add a token for every refill passed, up to the bucket size.",
      "A token is left → spend it and allow.",
      "Empty → reject.",
    ],
    paths: { ok: [0, 1], bad: [0, 2] },
    okWord: "allowed",
    failWord: "rejected",
    about: [
      ["Cost", "O(1): a token count and the time of the last refill"],
      ["Wins", "allows a burst up to the bucket size while holding the long-run rate"],
      ["Loses", "the protected service still sees the bursts"],
      ["Seen in", "API gateways and cloud API quotas"],
      ["Rate", "One token per Pace ticks, the same average rate as the other four"],
    ],
    tries: [
      {
        title: "Idle buys a burst",
        blurb: "A full bucket serves a burst of three at once, then the fourth finds it empty.",
        patch: { sequence: ["10", "10", "10", "10"], limit: 3, pace: "2" },
      },
      {
        title: "Refill is the real limit",
        blurb: "After the burst, one request gets through each time a token refills.",
        patch: { sequence: ["0", "0", "0", "1", "2", "3"], limit: 3, pace: "2" },
      },
    ],
    anchor: "token-bucket",
    summary: "Spend a token per request; tokens refill at a steady pace up to a cap.",
    glossaryTerm: "token bucket",
    differs: "Allows a burst up to the bucket size after idle time.",
  },
  "leaky-bucket": {
    id: "leaky-bucket",
    name: "Leaky bucket",
    chip: "Queue + timeline",
    rule: "Queue requests and release them at a constant pace; drop when the queue is full.",
    lines: [
      "Move to tick {tick}; the queue releases one request every pace.",
      "Room in the queue → join it and wait for your turn.",
      "Queue full → drop.",
    ],
    paths: { ok: [0, 1], bad: [0, 2] },
    okWord: "queued",
    failWord: "dropped",
    about: [
      ["Cost", "O(limit): the queue itself"],
      ["Wins", "a constant output rate that protects a fragile downstream"],
      ["Loses", "requests wait, and the tail of a burst is dropped"],
      ["Seen in", "traffic shaping and payment pipelines"],
      ["Rate", "One request leaves per Pace ticks, the same average rate as the other four"],
    ],
    tries: [
      {
        title: "Smooth output",
        blurb: "However bursty the arrivals, requests leave one every two ticks.",
        patch: { sequence: DEFAULT_SEQ, limit: 3, pace: "2" },
      },
      {
        title: "A full queue drops the tail",
        blurb:
          "Six at once: three queue and three are dropped; the queue then drains at its own pace.",
        patch: { sequence: ["0", "0", "0", "0", "0", "0", "11"], limit: 3, pace: "2" },
      },
    ],
    anchor: "leaky-bucket",
    summary: "Queue requests and release them at a constant pace; drop when the queue is full.",
    glossaryTerm: "leaky bucket",
    differs: "Output is always smooth, but requests wait and a burst's tail is dropped.",
  },
};
