import { describe, expect, it } from "vitest";
import { richText } from "@/lib/visualizer/core/rich";
import { asyncioModule, runAsyncio } from "./module";

describe("asyncio event loop module", () => {
  it("has the four scenarios and their frame counts", () => {
    const counts = Object.fromEntries(
      ["happy", "blocking", "cpu", "fastapi"].map((id) => [
        id,
        runAsyncio({ scenario: id }).frames.length,
      ]),
    );
    expect(counts).toEqual({ happy: 7, blocking: 9, cpu: 20, fastapi: 24 });
  });

  it("copies the happy-path question, takeaway, and first step", () => {
    const run = runAsyncio({ scenario: "happy" });
    expect(run.info.heading).toBe("Three 10 ms requests finish in 12 ms on a single thread");
    expect(run.info.about).toContainEqual([
      "Takeaway",
      "Async concurrency comes from waiting together, not running together. It only works if every handler yields at its waits.",
    ]);
    const first = run.frames[0];
    expect(first?.label).toBe("A runs until its await");
    expect(first?.model.kind).toBe("schedule");
    if (first?.model.kind === "schedule") expect(first.model.now).toBe(1);
  });

  it("moves the clock forward on every step within a trace", () => {
    for (const id of ["happy", "blocking", "cpu", "fastapi"]) {
      const frames = runAsyncio({ scenario: id }).frames;
      const byTrack = new Map<string, number[]>();
      for (const f of frames) {
        if (f.model.kind !== "schedule") continue;
        const t = f.model.now;
        const list = byTrack.get(f.model.track) ?? [];
        list.push(t);
        byTrack.set(f.model.track, list);
      }
      for (const run of byTrack.values()) {
        expect(run.every((t, i) => i === 0 || t > (run[i - 1] ?? 0))).toBe(true);
      }
    }
  });

  it("maps lanes and the loop summary row", () => {
    const m = runAsyncio({ scenario: "happy" }).frames[0]?.model;
    expect(m?.kind).toBe("schedule");
    if (m?.kind !== "schedule") return;
    expect(m.rows.map((r) => r.id)).toEqual(["A", "B", "C"]);
    expect(m.summary?.label).toBe("Loop");
    expect(m.share).toEqual({ lead: "Loop thread at", idle: "idle" });
  });

  it("uses thread segments in the FastAPI scenario", () => {
    const m = runAsyncio({ scenario: "fastapi" }).frames[0]?.model;
    if (m?.kind !== "schedule") throw new Error("not schedule");
    expect(m.rows[0]?.segments.some((s) => s.style === "thread")).toBe(true);
  });

  it("groups multi-trace scenarios", () => {
    const groups = runAsyncio({ scenario: "cpu" }).frames.map((f) => f.group);
    expect(groups.slice(0, 9).every((g) => g === "No yields")).toBe(true);
    expect(groups.slice(9).every((g) => g === "await asyncio.sleep(0) every chunk")).toBe(true);
  });

  it("keeps code in the step body as rich text", () => {
    const body = runAsyncio({ scenario: "blocking" }).frames[2]?.lines[0] ?? [];
    expect(richText(body)).toContain("requests.get()");
  });

  it("is the registered module shape", () => {
    expect(asyncioModule.slug).toBe("inside-the-asyncio-event-loop");
    expect(asyncioModule.revision).toBeUndefined();
    expect(asyncioModule.defaults()).toEqual({ scenario: "happy" });
  });
});
