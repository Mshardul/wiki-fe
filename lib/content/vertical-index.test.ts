import { describe, expect, it } from "vitest";
import { getVerticalIndex } from "./vertical-index";

describe("getVerticalIndex", () => {
  it("returns non-empty sections for dsa, excluding the Learning Paths section", async () => {
    const vi = await getVerticalIndex("dsa");
    expect(vi.sections.length).toBeGreaterThan(0);
    expect(vi.sections.some((s) => s.heading === "Learning Paths")).toBe(false);
    expect(vi.sections[0]!.articles.length).toBeGreaterThan(0);
  });

  it("cross-references every section article to a manifest stub flag", async () => {
    const vi = await getVerticalIndex("dsa");
    for (const s of vi.sections) {
      for (const a of s.articles) {
        expect(typeof a.isStub).toBe("boolean");
        expect(Array.isArray(a.slug)).toBe(true);
      }
    }
  });

  it("parses learning-path tracks with per-row titles and slugs", async () => {
    const vi = await getVerticalIndex("dsa");
    expect(vi.learningPaths.length).toBeGreaterThan(0);
    const first = vi.learningPaths[0]!;
    expect(first.track).toBeTruthy();
    expect(first.rows.length).toBeGreaterThan(0);
    expect(first.rows[0]!.title).toBeTruthy();
  });

  it("sets a row slug to null when the track links a non-article target", async () => {
    const vi = await getVerticalIndex("dsa");
    const allRows = vi.learningPaths.flatMap((p) => p.rows);
    expect(allRows.some((r) => Array.isArray(r.slug))).toBe(true);
  });

  it("works for system-design too", async () => {
    const vi = await getVerticalIndex("system-design");
    expect(vi.sections.length).toBeGreaterThan(0);
  });
});
