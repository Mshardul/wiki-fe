import { describe, expect, it } from "vitest";
import { applyChange, type FieldSection, parseSequenceField, type SequenceField } from "./fields";
import { encodeState, parseState } from "./url-state";

const events: SequenceField = {
  kind: "sequence",
  key: "events",
  label: "Events",
  param: "e",
  maxLen: 4,
  hint: "",
  resetBy: ["nodes"],
  resetEmpty: true,
  parse: (raw, values) => {
    const start = Number(values.nodes);
    const tokens = raw.split(/[\s_]+/).filter(Boolean);
    return start >= 1 && tokens.length <= 2
      ? { ok: true, tokens }
      : { ok: false, error: "bad events" };
  },
};
const sections: FieldSection[] = [
  {
    title: "",
    fields: [
      { kind: "slider", key: "nodes", label: "Nodes", param: "n", min: 1, max: 6 },
      { kind: "action", key: "add", label: "Add", apply: (v) => ({ values: v, step: 3 }) },
      events,
    ],
  },
];

describe("value-aware sequence parsing", () => {
  it("hands the other inputs to the field's parser", () => {
    expect(parseSequenceField(events, "+ -B", { nodes: 3 })).toEqual({
      ok: true,
      tokens: ["+", "-B"],
    });
    expect(parseSequenceField(events, "+", {})).toEqual({ ok: false, error: "bad events" });
  });

  it("reads the URL with the slider parsed before the events field", () => {
    const parsed = parseState("?n=4&e=%2B_-B", sections, { nodes: 3, events: ["+"] });
    expect(parsed.values.events).toEqual(["+", "-B"]);
  });
});

describe("resetEmpty", () => {
  it("clears the field to an empty list when a resetBy field changes", () => {
    const next = applyChange(sections, { nodes: 3, events: ["+"] }, "nodes", 5);
    expect(next.events).toEqual([]);
  });

  it("round-trips an empty list through the URL", () => {
    const search = encodeState(sections, { nodes: 3, events: [] }, { frame: 0, rotated: false });
    expect(search).toContain("e=");
    const back = parseState(search, sections, { nodes: 3, events: ["+"] });
    expect(back.values.events).toEqual([]);
  });
});

describe("action fields", () => {
  it("have no URL param of their own", () => {
    const search = encodeState(
      sections,
      { nodes: 3, events: ["+"], add: null },
      { frame: 0, rotated: false },
    );
    expect(search).not.toContain("add");
    expect(parseState("?add=1", sections, { nodes: 3, events: ["+"] }).values.add).toBeUndefined();
  });
});
