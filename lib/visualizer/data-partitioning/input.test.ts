import { describe, expect, it } from "vitest";
import { applyChange } from "../core/fields";
import { encodeState, parseState } from "../core/url-state";
import { DEFAULT_KEYS } from "./defaults";
import {
  addAction,
  aliveAfter,
  eventStep,
  linkEvents,
  removeAction,
  shapeOf,
  startOf,
  toPartitionInput,
} from "./input";
import { PARTITION_SECTIONS, partitionModule } from "./module";

const base = () => ({ ...partitionModule.defaults(), seed: 7 });

describe("starting count and events", () => {
  it("the slider reads the count after every event, so the default starts at 3", () => {
    expect(startOf({ nodes: 4, events: ["+"] })).toBe(3);
    expect(startOf({ nodes: 3, events: ["-B"] })).toBe(4);
    expect(startOf({ nodes: 5, events: [] })).toBe(5);
  });

  it("falls back to 3 nodes and one Add when the events and the slider disagree", () => {
    expect(shapeOf({ nodes: 1, events: ["+"] })).toEqual({ start: 3, events: ["+"] });
    expect(shapeOf({ nodes: 6, events: ["-A"] })).toEqual({ start: 3, events: ["+"] });
    expect(shapeOf({ nodes: 6, events: ["+", "+"] })).toEqual({ start: 4, events: ["+", "+"] });
    expect(shapeOf({ nodes: 3, events: ["-Z"] })).toEqual({ start: 3, events: ["+"] });
  });

  it("falls back when there are more than four events", () => {
    expect(shapeOf({ nodes: 3, events: ["+", "+", "+", "+", "+"] }).events).toEqual(["+"]);
  });

  it("names the nodes alive after the events", () => {
    expect(aliveAfter(3, ["+", "-B"])).toEqual(["A", "C", "D"]);
    expect(aliveAfter(3, ["-B", "+"])).toEqual(["A", "C", "D"]);
  });
});

describe("Add and Remove", () => {
  it("Add extends the events, moves the slider and lands on the new event step", () => {
    const out = addAction({ ...base(), nodes: 3, events: [] });
    expect(out.values).toMatchObject({ nodes: 4, events: ["+"] });
    expect(out.step).toBe(8);
  });

  it("a second Add lands after the first event's re-checks: 8 + 1 + 8 = step 17", () => {
    const out = addAction(base());
    expect(out.values).toMatchObject({ nodes: 5, events: ["+", "+"] });
    expect(out.step).toBe(17);
    expect(eventStep(8, 1)).toBe(17);
  });

  it("Remove writes the picked letter into the event and is the same for one seed", () => {
    const a = removeAction({ ...base(), nodes: 3, events: [] });
    const b = removeAction({ ...base(), nodes: 3, events: [] });
    expect(a).toEqual(b);
    const events = a.values.events as string[];
    expect(events).toHaveLength(1);
    expect(events[0]).toMatch(/^-[ABC]$/);
    expect(a.values.nodes).toBe(2);
    expect(a.step).toBe(8);
  });

  it("Remove only picks a node that is alive at that point", () => {
    for (let seed = 0; seed < 30; seed++) {
      const out = removeAction({ ...base(), seed, nodes: 2, events: ["-A"] });
      expect((out.values.events as string[])[1]).toMatch(/^-[BC]$/);
    }
  });

  it("a removed node's letter is never reused by a later Add", () => {
    const afterRemove = removeAction({ ...base(), nodes: 3, events: [] }).values;
    const input = toPartitionInput(addAction(afterRemove).values);
    expect(aliveAfter(input.start, input.events)).not.toContain(
      (afterRemove.events as string[])[0]?.slice(1),
    );
  });
});

describe("the slider and the Events field", () => {
  it("dragging the slider sets a new starting count and clears the events", () => {
    const next = applyChange(PARTITION_SECTIONS, base(), "nodes", 5);
    expect(next.events).toEqual([]);
    expect(toPartitionInput(next).start).toBe(5);
    expect(partitionModule.run(next).frames).toHaveLength(8);
  });

  it("editing Events keeps the starting count and moves the slider", () => {
    const next = linkEvents(base(), ["+", "+"]);
    expect(next).toMatchObject({ events: ["+", "+"], nodes: 5 });
    expect(toPartitionInput(next).start).toBe(3);
  });

  it("deleting the default + leaves 3 nodes and no events", () => {
    expect(linkEvents(base(), [])).toMatchObject({ events: [], nodes: 3 });
  });

  it("the Events field rejects a running count outside 1 to 6 and a removal of a missing node", () => {
    const events = PARTITION_SECTIONS.flatMap((s) => s.fields).find((f) => f.key === "events");
    if (events?.kind !== "sequence" || !events.parse) throw new Error("no events field");
    expect(events.parse("+ + + +", { nodes: 4, events: ["+"] })).toEqual({
      ok: false,
      error: "Node count must stay between 1 and 6",
    });
    expect(events.parse("-Z", base())).toEqual({
      ok: false,
      error: "Events are + or -X (X a node letter)",
    });
    expect(events.parse("-D", base())).toEqual({
      ok: false,
      error: "Can't remove D: it isn't there at that point",
    });
  });
});

describe("availability", () => {
  const at = (v: object) => partitionModule.availability?.({ ...base(), ...v }) ?? {};

  it("disables Add at six nodes and Remove at one", () => {
    expect(at({ nodes: 6, events: [] }).add?.disabled).toBe(true);
    expect(at({ nodes: 5, events: [] }).add?.disabled).toBeUndefined();
    expect(at({ nodes: 1, events: [] }).remove?.disabled).toBe(true);
    expect(at({ nodes: 2, events: [] }).remove?.disabled).toBeUndefined();
  });

  it("disables both at four events", () => {
    const a = at({ nodes: 3, events: ["+", "-A", "+", "-B"] });
    expect(a.add?.disabled).toBe(true);
    expect(a.remove?.disabled).toBe(true);
  });

  it("offers virtual nodes on the hash ring only", () => {
    expect(at({ scheme: "ring" }).vnodes?.disabled).toBeUndefined();
    for (const s of ["mod-n", "range", "directory", "rendezvous"]) {
      expect(at({ scheme: s }).vnodes?.disabled).toBe(true);
    }
  });
});

describe("keys", () => {
  it("uses the hand-picked keys by default and generates from the workload once reset", () => {
    expect(toPartitionInput(base()).tokens).toEqual(DEFAULT_KEYS);
    const reset = applyChange(
      PARTITION_SECTIONS,
      { ...base(), workload: "sequential" },
      "workload",
      "sequential",
    );
    const keys = toPartitionInput(reset).tokens.map(Number);
    expect(keys).toHaveLength(8);
    expect(keys[7]).toBe((keys[0] ?? 0) + 7);
  });

  it("one seed gives one key set under every variant", () => {
    const reset = applyChange(PARTITION_SECTIONS, base(), "seed", 99);
    const sets = ["mod-n", "range", "ring", "directory", "rendezvous"].map(
      (scheme) => toPartitionInput({ ...reset, scheme }).tokens,
    );
    expect(new Set(sets.map((s) => s.join(","))).size).toBe(1);
  });

  it("a Hot key workload marks exactly one key", () => {
    const reset = applyChange(PARTITION_SECTIONS, { ...base(), workload: "hot" }, "seed", 5);
    expect(toPartitionInput(reset).tokens.filter((t) => t.endsWith("*"))).toHaveLength(1);
  });
});

describe("URL", () => {
  it("round-trips keys with a hot key and events", () => {
    const values = {
      ...base(),
      keys: ["12", "18", "61*", "65"],
      nodes: 3,
      events: ["+", "-B"],
      scheme: "ring",
      vnodes: "8",
    };
    const search = encodeState(PARTITION_SECTIONS, values, { frame: 4, rotated: false });
    expect(search).toContain("k=12_18_61*_65");
    expect(search).toContain("e=%2B_-B");
    const back = parseState(search, PARTITION_SECTIONS, partitionModule.defaults());
    expect(back.values).toMatchObject({
      keys: values.keys,
      events: values.events,
      nodes: 3,
      scheme: "ring",
      vnodes: "8",
    });
    expect(back.view.frame).toBe(4);
  });

  it("round-trips an empty event list", () => {
    const search = encodeState(
      PARTITION_SECTIONS,
      { ...base(), nodes: 3, events: [] },
      { frame: 0, rotated: false },
    );
    expect(
      parseState(search, PARTITION_SECTIONS, partitionModule.defaults()).values.events,
    ).toEqual([]);
  });

  it("junk keys or events fall back to the defaults", () => {
    const d = partitionModule.defaults();
    const junk = parseState("?k=abc_999&e=zzz&n=40&p=nope", PARTITION_SECTIONS, d);
    const input = toPartitionInput(junk.values);
    expect(input.scheme).toBe("mod-n");
    expect(input.events).toEqual(["+"]);
    expect(input.tokens.length).toBeGreaterThan(0);
    expect(() => partitionModule.run(junk.values)).not.toThrow();
  });

  it("a frame index past the run is clamped by the player, not thrown by the module", () => {
    const parsed = parseState("?i=999", PARTITION_SECTIONS, partitionModule.defaults());
    expect(parsed.view.frame).toBe(998);
  });
});
