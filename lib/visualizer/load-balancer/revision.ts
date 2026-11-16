import { richText } from "../core/rich";
import type { RevisionCard } from "../core/types";
import { COPY } from "./copy";
import { balancerFrames } from "./frames";
import { POLICY_IDS } from "./types";

const MINI_DURATIONS = [6, 2, 2, 6, 2];

export function balancerRevision(): RevisionCard[] {
  return POLICY_IDS.map((id) => {
    const copy = COPY[id];
    const frames = balancerFrames({
      policy: id,
      servers: 3,
      durations: MINI_DURATIONS,
      failure: null,
    });
    return {
      id,
      name: copy.name,
      steps: frames.length,
      render: (lit) => {
        const frame = frames[Math.min(Math.max(lit, 1), frames.length) - 1];
        if (!frame) throw new Error(`no frame for ${id}`);
        return { kind: "shape", model: frame.model };
      },
      stepsText: frames.map((f) => `${f.badge} ${f.label}. ${richText(f.caption)}`),
      summary: copy.summary,
      differs: copy.differs,
    };
  });
}
