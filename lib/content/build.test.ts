import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildContent } from "./build";
import { manifestSchema } from "./manifest.schema";

describe("buildContent", () => {
  it("emits all seven generated JSON files and validates links + bridges", async () => {
    const paths = await buildContent();
    for (const p of Object.values(paths)) {
      expect(existsSync(p)).toBe(true);
    }
    const manifest = JSON.parse(readFileSync(paths.manifest, "utf8"));
    expect(() => manifestSchema.parse(manifest)).not.toThrow();
    expect(manifest.articles.length).toBeGreaterThan(150);

    const previews = JSON.parse(readFileSync(paths.previews, "utf8"));
    expect(Object.keys(previews).length).toBeGreaterThan(100);

    const complexity = JSON.parse(readFileSync(paths.complexityTables, "utf8"));
    expect(complexity["data-structures/hash-table"]).toBeDefined();
  });
});
