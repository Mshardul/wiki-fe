import { describe, expect, it } from "vitest";
import { richText } from "../core/rich";
import { buildFrames } from "./frames";
import { ALGORITHM_IDS, paramsOf } from "./types";

const DEFAULT = [4, 5, 5, 6, 6, 7, 7, 11];
const P = paramsOf(3, 2);
const run = (id: (typeof ALGORITHM_IDS)[number], compact = false) =>
  buildFrames(id, P, DEFAULT, { compact });

describe("frames", () => {
  it("builds one frame per request, the same count under every algorithm", () => {
    for (const id of ALGORITHM_IDS) expect(run(id).frames, id).toHaveLength(8);
  });

  it("fixed window: badges, strip outcomes and the peak so far", () => {
    const { frames } = run("fixed-window");
    expect(frames.map((f) => f.badge)).toEqual([
      "ALLOWED",
      "ALLOWED",
      "ALLOWED",
      "ALLOWED",
      "ALLOWED",
      "ALLOWED",
      "REJECTED",
      "REJECTED",
    ]);
    expect(frames.map((f) => f.outcome)).toEqual([
      "good",
      "good",
      "good",
      "good",
      "good",
      "good",
      "bad",
      "bad",
    ]);
    expect(frames.map((f) => f.metric)).toEqual(["1", "2", "3", "4", "5", "6", "6", "6"]);
    expect(frames.map((f) => f.label)).toEqual(["t4", "t5", "t5", "t6", "t6", "t7", "t7", "t11"]);
  });

  it("peak so far under the sliding log and the leaky bucket", () => {
    expect(run("sliding-log").frames.map((f) => f.metric)).toEqual([
      "1",
      "2",
      "3",
      "3",
      "3",
      "3",
      "3",
      "3",
    ]);
    expect(run("leaky-bucket").frames.map((f) => f.metric)).toEqual([
      "1",
      "2",
      "3",
      "3",
      "3",
      "3",
      "3",
      "3",
    ]);
  });

  it("the leaky bucket says queued and dropped", () => {
    const { frames } = run("leaky-bucket");
    expect(frames.map((f) => f.badge)).toEqual([
      "QUEUED",
      "QUEUED",
      "QUEUED",
      "QUEUED",
      "DROPPED",
      "DROPPED",
      "DROPPED",
      "QUEUED",
    ]);
  });

  it("the caption leads with the gap effect, then tick, outcome and the decision", () => {
    const { frames } = run("fixed-window");
    expect(richText(frames[3]?.caption ?? [])).toBe(
      "new window, counter reset · tick 6 allowed — window 1 now 1/3",
    );
    expect(richText(frames[0]?.caption ?? [])).toBe("tick 4 allowed — window 0 now 1/3");
  });

  it("the leaky caption says how long a queued request waits", () => {
    expect(richText(run("leaky-bucket").frames[3]?.caption ?? [])).toBe(
      "1 processed while waiting · tick 6 queued — joins the queue at position 3, leaves at tick 12",
    );
  });

  it("step lines and the executed path follow the outcome", () => {
    const { frames } = run("fixed-window");
    expect(richText(frames[0]?.lines[0] ?? [])).toBe(
      "Move to tick 4; if a new window began, reset the count.",
    );
    expect(frames[0]?.path).toEqual([0, 1]);
    expect(frames[6]?.path).toEqual([0, 2]);
    expect(run("sliding-counter").frames[4]?.path).toEqual([0, 1, 3]);
  });

  it("variables keep the same names on every frame of a run", () => {
    for (const id of ALGORITHM_IDS) {
      const { frames } = run(id);
      const names = frames[0]?.vars.map((v) => v.name);
      for (const f of frames)
        expect(
          f.vars.map((v) => v.name),
          id,
        ).toEqual(names);
    }
  });

  it("variables show the numbers of the algorithm", () => {
    const val = (id: (typeof ALGORITHM_IDS)[number], i: number, name: string) =>
      run(id).frames[i]?.vars.find((v) => v.name === name)?.value;
    expect(val("fixed-window", 5, "count in window")).toBe("3");
    expect(val("sliding-counter", 4, "estimate")).toBe("3.5");
    expect(val("sliding-counter", 4, "weight")).toBe("5/6");
    expect(val("sliding-log", 7, "oldest kept")).toBe("11");
    expect(val("token-bucket", 3, "next refill in")).toBe("2");
    expect(val("leaky-bucket", 3, "waits (ticks)")).toBe("6 (leaves 12)");
    expect(val("leaky-bucket", 4, "waits (ticks)")).toBe("—");
    expect(val("fixed-window", 0, "ticks since last")).toBe("—");
    expect(val("fixed-window", 3, "ticks since last")).toBe("1");
  });

  it("each frame carries a model of the right kind for its algorithm", () => {
    const kinds = ALGORITHM_IDS.map((id) => run(id).frames[3]?.model.kind);
    expect(kinds).toEqual(["timeline", "composite", "timeline", "composite", "composite"]);
  });

  it("builds an empty start state for Revision", () => {
    for (const id of ALGORITHM_IDS) {
      const m = run(id).empty;
      const marks =
        m.kind === "timeline"
          ? m.rows.flatMap((r) => r.marks)
          : m.kind === "composite"
            ? m.parts.flatMap((p) => (p.kind === "timeline" ? p.rows.flatMap((r) => r.marks) : []))
            : [];
      expect(marks, id).toEqual([]);
    }
  });

  it("is deterministic", () => {
    expect(run("token-bucket").frames).toEqual(run("token-bucket").frames);
  });
});
