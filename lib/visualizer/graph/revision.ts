import { richText } from "../core/rich";
import type { RevisionCard } from "../core/types";
import { COPY } from "./copy";
import { toFrames } from "./frames";
import { MINIS } from "./graphs";
import { GRAPH_IDS, type GraphDef, type GraphId } from "./types";

export function graphRevision(defs: Record<GraphId, GraphDef>): RevisionCard[] {
  return GRAPH_IDS.map((id) => {
    const def = defs[id];
    const copy = COPY[id];
    const mini = MINIS[id];
    const steps = def.steps(
      { algo: id, preset: "small", start: mini.start, seed: 0 },
      { world: mini, compact: true },
    );
    const frames = toFrames(def, steps);
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
