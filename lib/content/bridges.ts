import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";

// Ports scripts/validate_bridges.py - validate-only, the file is hand-authored and never regenerated.
const BRIDGES_FILE = "content/bridges.json";
const PATH_RE = /^\.\/content\/.+\.md$/;

const bridgePairSchema = z
  .object({ a: z.string().regex(PATH_RE), b: z.string().regex(PATH_RE) })
  .strict();
const bridgesSchema = z.array(bridgePairSchema);

export type BridgePair = z.infer<typeof bridgePairSchema>;

export interface BridgeValidation {
  bridges: BridgePair[];
  errors: string[];
}

export function validateBridges(): BridgeValidation {
  const raw: unknown = JSON.parse(readFileSync(BRIDGES_FILE, "utf8"));
  const parsed = bridgesSchema.safeParse(raw);
  if (!parsed.success) {
    return { bridges: [], errors: [`${BRIDGES_FILE} failed schema validation`] };
  }

  const errors: string[] = [];
  parsed.data.forEach((pair, i) => {
    for (const side of ["a", "b"] as const) {
      if (!existsSync(pair[side].replace(/^\.\//, ""))) {
        errors.push(`${BRIDGES_FILE}[${i}].${side} points at a nonexistent file: ${pair[side]}`);
      }
    }
    if (pair.a === pair.b) {
      errors.push(`${BRIDGES_FILE}[${i}] links an article to itself: ${pair.a}`);
    }
  });

  return { bridges: parsed.data, errors };
}
