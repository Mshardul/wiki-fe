import { describe, expect, it } from "vitest";
import { parseTicks, TICKS_ERROR_COUNT, TICKS_ERROR_NUMBER, TICKS_ERROR_ORDER } from "./ticks";

describe("parseTicks", () => {
  it("reads whole numbers separated by spaces, commas or underscores", () => {
    expect(parseTicks("4 5 5 6 6 7 7 11")).toEqual({
      ok: true,
      tokens: ["4", "5", "5", "6", "6", "7", "7", "11"],
    });
    expect(parseTicks("4,5_5  6")).toEqual({ ok: true, tokens: ["4", "5", "5", "6"] });
  });

  it("normalises leading zeros", () => {
    expect(parseTicks("04 05")).toEqual({ ok: true, tokens: ["4", "5"] });
  });

  it("accepts the widest axis and nothing past it", () => {
    expect(parseTicks("0 19").ok).toBe(true);
    expect(parseTicks("0 20")).toEqual({ ok: false, error: TICKS_ERROR_NUMBER });
  });

  it("rejects text, decimals and negatives instead of reinterpreting them", () => {
    for (const raw of ["4 5 x", "2.5", "-3", "1e1", "3.0 4"]) {
      expect(parseTicks(raw), raw).toEqual({ ok: false, error: TICKS_ERROR_NUMBER });
    }
  });

  it("rejects ticks that go backwards", () => {
    expect(parseTicks("5 4")).toEqual({ ok: false, error: TICKS_ERROR_ORDER });
  });

  it("rejects an empty field and more than 14 requests", () => {
    expect(parseTicks("")).toEqual({ ok: false, error: TICKS_ERROR_COUNT });
    expect(parseTicks("  , ")).toEqual({ ok: false, error: TICKS_ERROR_COUNT });
    expect(parseTicks(Array.from({ length: 15 }, () => "3").join(" "))).toEqual({
      ok: false,
      error: TICKS_ERROR_COUNT,
    });
    expect(parseTicks(Array.from({ length: 14 }, () => "3").join(" ")).ok).toBe(true);
  });

  it("explains each error in one line", () => {
    expect(TICKS_ERROR_NUMBER).toBe("Ticks must be whole numbers from 0 to 19");
    expect(TICKS_ERROR_ORDER).toBe("Ticks must not go backwards");
    expect(TICKS_ERROR_COUNT).toBe("Use 1 to 14 requests");
  });
});
