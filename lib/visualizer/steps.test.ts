import { describe, expect, it } from "vitest";
import { skippedEvents } from "./core/schedule";
import type { VisualizerModule } from "./core/types";
import { MODULES } from "./modules";

function variantValues(mod: VisualizerModule): (string | null)[] {
  const key = mod.variants?.key;
  if (!key) return [null];
  const field = mod.sections.flatMap((s) => s.fields).find((f) => f.key === key);
  return field && "options" in field && field.options ? field.options.map((o) => o.value) : [null];
}

describe("visualizer steps", () => {
  it("never pass over a change without stopping on it", () => {
    for (const mod of Object.values(MODULES)) {
      for (const value of variantValues(mod)) {
        const key = mod.variants?.key;
        const values = key && value !== null ? { ...mod.defaults(), [key]: value } : mod.defaults();
        const skipped = skippedEvents(mod.run(values).frames);
        expect({ visualizer: mod.slug, variant: value, skipped }).toEqual({
          visualizer: mod.slug,
          variant: value,
          skipped: [],
        });
      }
    }
  });
});
