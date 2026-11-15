import { describe, expect, it } from "vitest";
import {
  EVENTS_COUNT_ERROR,
  EVENTS_RANGE_ERROR,
  EVENTS_TOKEN_ERROR,
  KEYS_COUNT_ERROR,
  KEYS_HOT_ERROR,
  KEYS_NUMBER_ERROR,
  KEYS_ONCE_ERROR,
  parseEvents,
  parseKeys,
  resolveEvents,
  toKeyItems,
  tokenOf,
} from "./keys";

const bad = (r: ReturnType<typeof parseKeys>) => (r.ok ? "ok" : r.error);

describe("parseKeys", () => {
  it("reads numbers split by spaces, commas or underscores", () => {
    expect(parseKeys("12 18,29_61*")).toEqual({ ok: true, tokens: ["12", "18", "29", "61*"] });
  });
  it("rejects each bad input with its message", () => {
    expect(bad(parseKeys("12 x"))).toBe(KEYS_NUMBER_ERROR);
    expect(bad(parseKeys("12 100"))).toBe(KEYS_NUMBER_ERROR);
    expect(bad(parseKeys("12 12"))).toBe(KEYS_ONCE_ERROR);
    expect(bad(parseKeys(""))).toBe(KEYS_COUNT_ERROR);
    expect(bad(parseKeys("1 2 3 4 5 6 7 8 9 10 11 12 13"))).toBe(KEYS_COUNT_ERROR);
    expect(bad(parseKeys("1* 2*"))).toBe(KEYS_HOT_ERROR);
  });
  it("accepts 0 and exactly 12 keys", () => {
    expect(parseKeys("0").ok).toBe(true);
    expect(parseKeys("1 2 3 4 5 6 7 8 9 10 11 12").ok).toBe(true);
  });
  it("round-trips items and tokens", () => {
    const items = toKeyItems(["12", "61*"]);
    expect(items).toEqual([
      { key: 12, hot: false },
      { key: 61, hot: true },
    ]);
    expect(items.map(tokenOf)).toEqual(["12", "61*"]);
  });
});

describe("parseEvents", () => {
  it("reads add and remove tokens, upper-casing letters and accepting the Unicode minus", () => {
    expect(parseEvents("+ -b −C", 4)).toEqual({ ok: true, tokens: ["+", "-B", "-C"] });
  });
  it("rejects bad tokens, too many events and a count outside 1 to 6", () => {
    const err = (r: ReturnType<typeof parseEvents>) => (r.ok ? "ok" : r.error);
    expect(err(parseEvents("x", 3))).toBe(EVENTS_TOKEN_ERROR);
    expect(err(parseEvents("+B", 3))).toBe(EVENTS_TOKEN_ERROR);
    expect(err(parseEvents("+ + + + +", 1))).toBe(EVENTS_COUNT_ERROR);
    expect(err(parseEvents("+", 6))).toBe(EVENTS_RANGE_ERROR);
    expect(err(parseEvents("-A", 1))).toBe(EVENTS_RANGE_ERROR);
    expect(err(parseEvents("-B -B", 3))).toBe("Can't remove B: it isn't there at that point");
    expect(err(parseEvents("-D", 3))).toBe("Can't remove D: it isn't there at that point");
  });
  it("accepts an empty list", () => {
    expect(parseEvents("", 3)).toEqual({ ok: true, tokens: [] });
  });
});

describe("resolveEvents", () => {
  it("never reuses a removed letter", () => {
    // start A B C: remove B, add takes D, remove D, add takes E
    const r = resolveEvents(3, ["-B", "+", "-D", "+"]);
    expect(r).toEqual({
      ok: true,
      events: [
        { kind: "remove", letter: "B" },
        { kind: "add", letter: "D" },
        { kind: "remove", letter: "D" },
        { kind: "add", letter: "E" },
      ],
    });
  });
});
