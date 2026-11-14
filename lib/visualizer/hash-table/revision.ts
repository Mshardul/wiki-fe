import { richText } from "../core/rich";
import type { RevisionCard } from "../core/types";
import { COPY } from "./copy";
import { toFrames } from "./frames";
import { tokensToOps } from "./input";
import { HASH_IDS, type HashDef, type HashId } from "./types";

export function hashRevision(defs: Record<HashId, HashDef>): RevisionCard[] {
  return HASH_IDS.map((id) => {
    const def = defs[id];
    const copy = COPY[id];
    const { size, threshold, tokens } = copy.mini;
    const frames = toFrames(
      def,
      def.steps({ algo: id, size, threshold, ops: tokensToOps(tokens), tokens }),
    );
    const model = (at: number) => {
      const frame = frames[Math.min(Math.max(at, 1), frames.length) - 1];
      if (!frame) throw new Error(`no frame for ${id}`);
      return frame.model;
    };
    return {
      id,
      name: def.name,
      steps: frames.length,
      render: (lit) => ({ kind: "shape", model: model(lit) }),
      stepsText: frames.map((f) => `${f.badge}. ${richText(f.caption)}`),
      summary: copy.summary,
      differs: copy.differs,
    };
  });
}
