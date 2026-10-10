import { describe, expect, it } from "vitest";
import type { FieldSection, InputValues } from "./fields";
import { encodeState, parseState } from "./url-state";

const SECTIONS: FieldSection[] = [
  {
    title: "Policy",
    fields: [
      {
        kind: "chips",
        key: "policy",
        label: "Policy",
        param: "p",
        options: [
          { value: "lru", label: "LRU" },
          { value: "fifo", label: "FIFO" },
        ],
      },
    ],
  },
  {
    title: "Input",
    fields: [
      { kind: "slider", key: "capacity", label: "Cache size", param: "c", min: 2, max: 8 },
      {
        kind: "sequence",
        key: "sequence",
        label: "Sequence",
        param: "q",
        maxLen: 40,
        hint: "",
        resetBy: [],
      },
    ],
  },
  { title: "", fields: [{ kind: "seed", key: "seed", label: "Seed", param: "s" }] },
];
const DEFAULTS: InputValues = { policy: "lru", capacity: 4, sequence: null, seed: 1 };

describe("url-state", () => {
  it("round-trips values and view", () => {
    const values: InputValues = { policy: "fifo", capacity: 6, sequence: ["A", "B"], seed: 0x7f3a };
    const search = encodeState(SECTIONS, values, { frame: 7, rotated: true });
    expect(search).toBe("?p=fifo&c=6&q=AB&s=7f3a&i=8&rot=1");
    expect(parseState(search, SECTIONS, DEFAULTS)).toEqual({
      values,
      view: { frame: 7, rotated: true, view: "single" },
    });
  });

  it("omits a null sequence and rotation when off", () => {
    expect(encodeState(SECTIONS, DEFAULTS, { frame: 0, rotated: false })).toBe(
      "?p=lru&c=4&s=1&i=1",
    );
  });

  it("falls back to defaults on junk and clamps numbers", () => {
    const { values, view } = parseState("?p=xyz&c=-5&s=zz&q=123&i=abc&rot=yes", SECTIONS, DEFAULTS);
    expect(values).toEqual({ policy: "lru", capacity: 2, sequence: null, seed: 1 });
    expect(view).toEqual({ frame: 0, rotated: false, view: "single" });
  });

  it("clamps an out-of-range seed and keeps a huge frame for playback to clamp", () => {
    const { values, view } = parseState("?s=fffffff&i=999", SECTIONS, DEFAULTS);
    expect(values.seed).toBe(0xffff);
    expect(view.frame).toBe(998);
  });

  it("empty search returns the defaults untouched", () => {
    expect(parseState("", SECTIONS, DEFAULTS)).toEqual({
      values: DEFAULTS,
      view: { frame: 0, rotated: false, view: "single" },
    });
  });

  it("writes view=revision only for the revision view and reads it back", () => {
    expect(encodeState(SECTIONS, DEFAULTS, { frame: 0, rotated: false })).not.toContain("view=");
    expect(
      encodeState(SECTIONS, DEFAULTS, { frame: 0, rotated: false, view: "single" }),
    ).not.toContain("view=");
    const search = encodeState(SECTIONS, DEFAULTS, { frame: 0, rotated: false, view: "revision" });
    expect(search).toContain("view=revision");
    expect(parseState(search, SECTIONS, DEFAULTS).view.view).toBe("revision");
  });

  it("an unknown view value falls back to single", () => {
    expect(parseState("?view=zzz", SECTIONS, DEFAULTS).view.view).toBe("single");
  });
});
