import { richText } from "../core/rich";
import type { RevisionCard } from "../core/types";
import { ALGORITHM_META } from "./copy";
import { buildFrames } from "./frames";
import { ALGORITHM_IDS, paramsOf } from "./types";

export const MINI_TICKS = [4, 5, 5, 6, 6, 7, 7, 11];
export const MINI_PARAMS = paramsOf(3, 2);

export function rateLimitingRevision(): RevisionCard[] {
  return ALGORITHM_IDS.map((id) => {
    const meta = ALGORITHM_META[id];
    const run = buildFrames(id, MINI_PARAMS, MINI_TICKS, { compact: true });
    return {
      id,
      name: meta.name,
      steps: run.frames.length,
      render: (lit) => {
        if (lit <= 0) return { kind: "shape", model: run.empty };
        const model = run.frames[Math.min(lit, run.frames.length) - 1]?.model;
        if (!model) throw new Error(`no frame for ${id}`);
        return { kind: "shape", model };
      },
      stepsText: run.frames.map(
        (f) => `Request ${f.label}: ${f.badge.toLowerCase()}. ${richText(f.caption)}`,
      ),
      summary: meta.summary,
      glossaryTerm: meta.glossaryTerm,
      differs: meta.differs,
    };
  });
}
