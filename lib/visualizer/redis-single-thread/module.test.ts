import { describe, expect, it } from "vitest";
import { richText } from "@/lib/visualizer/core/rich";
import { redisSingleThreadModule, runRedisSingleThread } from "./module";

describe("redis single-thread module", () => {
  it("has the four scenarios", () => {
    expect(
      ["happy", "slow", "iothreads", "fork"].map(
        (id) => runRedisSingleThread({ scenario: id }).frames.length,
      ),
    ).toEqual([11, 39, 19, 21]);
  });

  it("maps the Main summary row", () => {
    const m = runRedisSingleThread({ scenario: "happy" }).frames[2]?.model;
    expect(m?.kind).toBe("schedule");
    if (m?.kind !== "schedule") return;
    expect(m.summary?.label).toBe("Main");
    expect(m.share?.lead).toBe("Main thread at");
    expect(m.unit).toBe("µs");
  });

  it("marks the THP fork step as bad", () => {
    const frames = runRedisSingleThread({ scenario: "fork" }).frames;
    expect(frames.filter((f) => f.outcome === "bad")).toHaveLength(1);
    expect(frames.find((f) => f.outcome === "bad")?.label).toBe("With transparent huge pages");
  });

  it("shows memory info above the step body", () => {
    const frame = runRedisSingleThread({ scenario: "fork" }).frames.find(
      (f) => f.label === "Before the save",
    );
    expect(richText(frame?.lines[0] ?? [])).toMatch(/memory:/);
    expect(richText(frame?.lines[1] ?? [])).toContain("BGSAVE");
  });

  it("is registered", () => {
    expect(redisSingleThreadModule.slug).toBe("inside-redis-single-thread");
  });
});
