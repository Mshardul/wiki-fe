import { describe, expect, it } from "vitest";
import { CANONICAL_BASE } from "@/lib/config";
import { getVerticals } from "@/lib/content";
import { metadata } from "./page";

describe("home data", () => {
  it("has both verticals with derived counts", () => {
    const vs = getVerticals();
    expect(vs.map((v) => v.id).sort()).toEqual(["dsa", "system-design"]);
    for (const v of vs) expect(v.articleCount).toBeGreaterThan(0);
  });

  it("metadata: absolute title, canonical, no-index", () => {
    expect(metadata.title).toEqual({ absolute: "Wiki — System Design & DSA" });
    expect(metadata.alternates?.canonical).toBe(`${CANONICAL_BASE}/`);
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
