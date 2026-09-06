import { describe, it, expect } from "vitest";
import { buildManifest } from "../../lib/content/manifest";
import { manifestSchema } from "../../lib/content/manifest.schema";

describe("manifest schema", () => {
  it("buildManifest output parses cleanly against manifestSchema", async () => {
    const m = await buildManifest();
    expect(() => manifestSchema.parse(m)).not.toThrow();
  });
});
