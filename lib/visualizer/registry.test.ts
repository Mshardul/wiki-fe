import { describe, expect, it } from "vitest";
import { MODULES } from "./modules";
import { getVisualizer, VISUALIZERS } from "./registry";

describe("visualizer registry", () => {
  it("every registry entry has a module with the same title", () => {
    for (const v of VISUALIZERS) {
      expect(MODULES[v.slug]?.title).toBe(v.title);
      expect(MODULES[v.slug]?.slug).toBe(v.slug);
    }
  });

  it("every module is listed in the registry", () => {
    expect(Object.keys(MODULES).sort()).toEqual(VISUALIZERS.map((v) => v.slug).sort());
  });

  it("getVisualizer finds by slug", () => {
    expect(getVisualizer("eviction-policies")?.title).toBe("Eviction policies");
    expect(getVisualizer("nope")).toBeUndefined();
  });

  it("compare visualizers stay compare, and the GIL is a mechanism", () => {
    expect(getVisualizer("eviction-policies")?.kind).toBe("compare");
    expect(getVisualizer("caching-strategies")?.kind).toBe("compare");
    expect(getVisualizer("rate-limiting")?.kind).toBe("compare");
    expect(getVisualizer("inside-the-python-gil")).toMatchObject({
      kind: "mechanism",
      title: "Inside the Python GIL",
      description:
        "Step through who holds the lock, then the cases where a CPU thread, a convoy, or a checkpoint breaks it.",
    });
    expect(getVisualizer("inside-the-asyncio-event-loop")).toMatchObject({
      kind: "mechanism",
      title: "Inside the asyncio Event Loop",
    });
    expect(getVisualizer("inside-redis-single-thread")).toMatchObject({
      kind: "mechanism",
      title: "Inside Redis's Single Thread",
    });
    expect(getVisualizer("inside-the-go-scheduler")).toMatchObject({
      kind: "mechanism",
      title: "Inside the Go Scheduler",
    });
    expect(getVisualizer("inside-postgres-mvcc")).toMatchObject({
      kind: "mechanism",
      title: "Inside Postgres MVCC",
    });
    expect(getVisualizer("inside-a-b-tree-index")).toMatchObject({
      kind: "mechanism",
      title: "Inside a B-tree Index",
    });
    expect(getVisualizer("inside-the-postgres-wal")).toMatchObject({
      kind: "mechanism",
      title: "Inside the Postgres WAL",
    });
    expect(getVisualizer("inside-an-http-request")).toMatchObject({
      kind: "mechanism",
      title: "Inside an HTTP Request",
    });
  });
});
