import { describe, expect, it } from "vitest";
import { MAX_REQUESTS, opsOf, parseCachingSequence, SEQUENCE_ERROR } from "./tokens";

describe("parseCachingSequence", () => {
  it("reads spaced, lowercase and URL-joined forms the same way", () => {
    const want = { ok: true, tokens: ["RA", "WB", "XC", "!"] };
    expect(parseCachingSequence("ra wb xc !")).toEqual(want);
    expect(parseCachingSequence("RAWBXC!")).toEqual(want);
    expect(parseCachingSequence("RA, WB, XC, !")).toEqual(want);
  });

  it("accepts consecutive crashes", () => {
    expect(parseCachingSequence("!!")).toEqual({ ok: true, tokens: ["!", "!"] });
  });

  it("rejects unknown operations, missing keys and keys past E", () => {
    for (const bad of ["Q1", "R", "RF", "A", "RA Z", ""]) {
      expect(parseCachingSequence(bad), bad).toEqual({ ok: false, error: SEQUENCE_ERROR });
    }
  });

  it("caps the run length", () => {
    const parsed = parseCachingSequence("RA".repeat(MAX_REQUESTS + 20));
    expect(parsed.ok && parsed.tokens.length).toBe(MAX_REQUESTS);
  });
});

describe("opsOf", () => {
  it("splits a token into operation and key, and treats ! as keyless", () => {
    expect(opsOf(["RA", "WB", "XC", "!"])).toEqual([
      { kind: "R", key: "A" },
      { kind: "W", key: "B" },
      { kind: "X", key: "C" },
      { kind: "!", key: "" },
    ]);
  });
});
