import { describe, expect, it } from "vitest";
import { type FieldSection, parseSequenceField, type SequenceField } from "./fields";
import { encodeState, parseState } from "./url-state";

const plain: SequenceField = {
  kind: "sequence",
  key: "sequence",
  label: "Sequence",
  param: "q",
  maxLen: 40,
  hint: "",
  resetBy: [],
};
const custom: SequenceField = {
  ...plain,
  parse: (raw) =>
    raw.toLowerCase() === "ok" ? { ok: true, tokens: ["OK"] } : { ok: false, error: "nope" },
};

describe("parseSequenceField", () => {
  it("uses A–Z parsing by default", () => {
    expect(parseSequenceField(plain, "ab c")).toEqual({ ok: true, tokens: ["A", "B", "C"] });
    expect(parseSequenceField(plain, "123")).toEqual({ ok: false, error: "Use letters A–Z" });
  });

  it("uses the field's own parser when it has one", () => {
    expect(parseSequenceField(custom, "ok")).toEqual({ ok: true, tokens: ["OK"] });
    expect(parseSequenceField(custom, "zz")).toEqual({ ok: false, error: "nope" });
  });
});

describe("url state with a custom sequence parser", () => {
  const sections: FieldSection[] = [{ title: "", fields: [custom] }];

  it("round-trips tokens the parser accepts", () => {
    const search = encodeState(sections, { sequence: ["OK"] }, { frame: 0, rotated: false });
    expect(search).toBe("?q=OK&i=1");
    expect(parseState(search, sections, { sequence: null }).values.sequence).toEqual(["OK"]);
  });

  it("falls back to the default when the parser rejects the value", () => {
    expect(parseState("?q=zz", sections, { sequence: null }).values.sequence).toBeNull();
  });
});
