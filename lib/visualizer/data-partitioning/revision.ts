import { richText } from "../core/rich";
import type { RevisionCard } from "../core/types";
import { COPY } from "./copy";
import { partitionFrames } from "./frames";
import { toKeyItems } from "./keys";
import { SCHEME_IDS } from "./types";

// Every card plays the same mini run, so the cards differ only in the scheme.
const MINI_KEYS = ["12", "18", "29", "61", "65", "66"];

export function partitionRevision(): RevisionCard[] {
  return SCHEME_IDS.map((id) => {
    const copy = COPY[id];
    const frames = partitionFrames({
      scheme: id,
      start: 3,
      vnodes: 1,
      keys: toKeyItems(MINI_KEYS),
      events: ["+"],
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
      glossaryTerm: copy.glossaryTerm,
      differs: copy.differs,
    };
  });
}
