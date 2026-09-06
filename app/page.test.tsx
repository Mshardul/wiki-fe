import { describe, expect, it } from "vitest";
import { getVerticals } from "@/lib/content";

describe("home data", () => {
  it("has both verticals with derived counts", () => {
    const vs = getVerticals();
    expect(vs.map((v) => v.id).sort()).toEqual(["dsa", "system-design"]);
    for (const v of vs) expect(v.articleCount).toBeGreaterThan(0);
  });
});
