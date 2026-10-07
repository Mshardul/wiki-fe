import { describe, expect, it } from "vitest";
import { applyChange, clampInt, type FieldSection, parseSequence } from "./fields";

const SECTIONS: FieldSection[] = [
  {
    title: "Input",
    fields: [
      { kind: "slider", key: "capacity", label: "Cache size", param: "c", min: 2, max: 8 },
      {
        kind: "chips",
        key: "pattern",
        label: "Pattern",
        param: "pat",
        options: [
          { value: "hot", label: "Hot set" },
          { value: "scan", label: "Scan" },
        ],
      },
      {
        kind: "sequence",
        key: "sequence",
        label: "Sequence",
        param: "q",
        maxLen: 40,
        hint: "edit keys",
        resetBy: ["pattern"],
      },
    ],
  },
];

describe("fields", () => {
  it("applyChange discards a custom sequence when a resetBy field changes", () => {
    const next = applyChange(SECTIONS, { pattern: "hot", sequence: ["A", "B"] }, "pattern", "scan");
    expect(next).toEqual({ pattern: "scan", sequence: null });
  });

  it("applyChange keeps the custom sequence for other fields", () => {
    const next = applyChange(SECTIONS, { capacity: 4, sequence: ["A"] }, "capacity", 6);
    expect(next).toEqual({ capacity: 6, sequence: ["A"] });
  });

  it("parseSequence uppercases, strips non-letters and caps length", () => {
    expect(parseSequence("a b, c1d", 40)).toEqual(["A", "B", "C", "D"]);
    expect(parseSequence("abcdef", 3)).toEqual(["A", "B", "C"]);
  });

  it("parseSequence returns null when nothing usable is left", () => {
    expect(parseSequence("123 !!", 40)).toBeNull();
  });

  it("clampInt rounds and clamps", () => {
    expect(clampInt(9.6, 2, 8)).toBe(8);
    expect(clampInt(-3, 2, 8)).toBe(2);
    expect(clampInt(4.4, 2, 8)).toBe(4);
  });
});
