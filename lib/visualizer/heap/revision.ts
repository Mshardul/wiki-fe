import { richText } from "../core/rich";
import type { RevisionCard } from "../core/types";
import { COPY } from "./copy";
import { toFrames } from "./frames";
import { HEAP_IDS, type HeapDef, type HeapId } from "./types";

export function heapRevision(defs: Record<HeapId, HeapDef>): RevisionCard[] {
  return HEAP_IDS.map((id) => {
    const def = defs[id];
    const copy = COPY[id];
    const frames = toFrames(def, def.steps({ op: id, order: "min", k: 3, values: copy.mini }));
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
