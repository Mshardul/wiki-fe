import { describe, expect, it } from "vitest";
import { type FieldSection, joinSequence, type SequenceField } from "./fields";
import { encodeState, parseState } from "./url-state";

const numbers = (raw: string) => ({
  ok: true as const,
  tokens: raw.split(/[\s,_]+/).filter((s) => s !== ""),
});

const field = (join?: string): SequenceField => ({
  kind: "sequence",
  key: "sequence",
  label: "Sequence",
  param: "q",
  maxLen: 14,
  hint: "",
  resetBy: [],
  parse: numbers,
  ...(join === undefined ? {} : { join }),
});

describe("joinSequence", () => {
  it("concatenates tokens by default", () => {
    expect(joinSequence(field(), ["RA", "WB"])).toBe("RAWB");
  });

  it("uses the field's separator when it has one", () => {
    expect(joinSequence(field("_"), ["4", "11"])).toBe("4_11");
  });
});

describe("url round trip with a separator", () => {
  const sections: FieldSection[] = [{ title: "", fields: [field("_")] }];

  it("keeps multi-digit tokens apart", () => {
    const search = encodeState(
      sections,
      { sequence: ["4", "5", "11"] },
      { frame: 0, rotated: false },
    );
    expect(search).toBe("?q=4_5_11&i=1");
    expect(parseState(search, sections, { sequence: null }).values.sequence).toEqual([
      "4",
      "5",
      "11",
    ]);
  });
});
