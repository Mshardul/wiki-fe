import { describe, expect, it } from "vitest";
import { richText } from "@/lib/visualizer/core/rich";
import { gilModule, runGil } from "./module";

describe("python GIL module", () => {
  it("has the four scenarios and their frame counts", () => {
    const counts = Object.fromEntries(
      ["happy", "cpu", "convoy", "race"].map((id) => [id, runGil({ scenario: id }).frames.length]),
    );
    expect(counts).toEqual({ happy: 8, cpu: 8, convoy: 7, race: 8 });
  });

  it("copies the happy-path question, takeaway, and first step", () => {
    const run = runGil({ scenario: "happy" });
    expect(run.info.heading.startsWith("I/O-bound threads interleave")).toBe(true);
    expect(run.info.about).toContainEqual([
      "Takeaway",
      "The GIL serializes Python bytecode, not waiting. Threads are a valid tool for blocking I/O.",
    ]);
    const first = run.frames[0];
    expect(first?.label).toBe("T1 runs");
    expect(first?.model.kind).toBe("schedule");
    if (first?.model.kind === "schedule") expect(first.model.now).toBe(3);
  });

  it("moves the clock forward on every step", () => {
    for (const id of ["happy", "cpu", "convoy", "race"]) {
      const nows = runGil({ scenario: id }).frames.map((f) =>
        f.model.kind === "schedule" ? f.model.now : Number.NaN,
      );
      const sameTrace = id === "race" ? [nows.slice(0, 4), nows.slice(4)] : [nows];
      for (const run of sameTrace) {
        expect(run.every((t, i) => i === 0 || t > (run[i - 1] ?? 0))).toBe(true);
      }
    }
  });

  it("marks only the last race step as bad", () => {
    const frames = runGil({ scenario: "race" }).frames;
    expect(frames.slice(0, -1).every((f) => f.outcome === "good")).toBe(true);
    expect(frames.at(-1)?.outcome).toBe("bad");
  });

  it("maps the CPU scenario onto rows, the lock holder, timers, requests and checkpoints", () => {
    const m = runGil({ scenario: "cpu" }).frames[0]?.model;
    expect(m?.kind).toBe("schedule");
    if (m?.kind !== "schedule") return;
    expect(m.rows.map((r) => r.id)).toEqual(["T1", "T2"]);
    expect(m.rows[0]?.segments[0]).toEqual({
      from: 0,
      to: 5.2,
      style: "solid",
      label: "pure-Python loop",
    });
    expect(m.rows[0]?.segments[1]).toMatchObject({ style: "hatch" });
    expect(m.summary?.label).toBe("GIL");
    expect(m.summary?.segments).toContainEqual({
      from: 5.2,
      to: 10.4,
      style: "solid",
      label: "T2",
    });
    expect(m.meters.at(-1)).toMatchObject({ row: "T1", from: 15.6, to: 20 });
    expect(m.arrows[0]).toEqual({ at: 5, from: "T2", to: "T1", label: "drop request" });
    expect(m.pins[0]).toEqual({ at: 5.2, row: "T1" });
    expect(m.values).toBeNull();
    expect(m.marksEvery).toBe(0.5);
    expect(m.share).toEqual({ lead: "GIL held at", idle: "free" });
    expect(m.note).toBeNull();
  });

  it("gives each scenario trace its own glide track", () => {
    const tracks = runGil({ scenario: "race" }).frames.map((f) =>
      f.model.kind === "schedule" ? f.model.track : "",
    );
    expect(new Set(tracks)).toEqual(new Set(["race:A", "race:B"]));
    const groups = runGil({ scenario: "race" }).frames.map((f) => f.group);
    expect(groups.slice(0, 4).every((g) => g === "Version A · counter += 1")).toBe(true);
    expect(groups.slice(4).every((g) => g === "Version B · counter += one()")).toBe(true);
    expect(runGil({ scenario: "happy" }).frames.every((f) => f.group === undefined)).toBe(true);
    expect(runGil({ scenario: "happy" }).frames[0]?.model).toMatchObject({ track: "happy:main" });
  });

  it("switches race traces and carries the counter", () => {
    const frames = runGil({ scenario: "race" }).frames;
    const a = frames[0]?.model;
    const last = frames.at(-1)?.model;
    if (a?.kind !== "schedule" || last?.kind !== "schedule") throw new Error("not a schedule");
    expect(a.unit).toBeNull();
    expect(a.tickEvery).toBe(2);
    expect(a.axisLabel).toContain("Version A");
    expect(last.axisLabel).toContain("Version B");
    expect(last.values?.label).toBe("counter");
    expect(last.values?.points.at(-1)).toEqual({ at: 13, text: "101 · 499 lost", bad: true });
    expect(last.pins[0]).toEqual({ at: 3, row: "T1", label: "RESUME in one()" });
    expect(last.share).toBeNull();
    expect(last.note).toContain("Checkpoints in 3.12");
  });

  it("keeps code in the step body as rich text", () => {
    const body = runGil({ scenario: "happy" }).frames[0]?.lines[0] ?? [];
    expect(richText(body)).toContain("recv()");
  });

  it("is the registered module shape", () => {
    expect(gilModule.slug).toBe("python-gil");
    expect(gilModule.revision).toBeUndefined();
    expect(gilModule.defaults()).toEqual({ scenario: "happy" });
  });
});
