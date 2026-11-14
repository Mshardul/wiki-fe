import { richText } from "../core/rich";
import type { RevisionCard } from "../core/types";
import { COPY } from "./copy";
import { cardModelOf } from "./frames";
import { tagItems } from "./input";
import { SORT_IDS, type SortDef, type SortId } from "./types";

export function sortingRevision(defs: Record<SortId, SortDef>): RevisionCard[] {
  return SORT_IDS.map((id) => {
    const def = defs[id];
    const copy = COPY[id];
    const steps = def.steps(tagItems(copy.mini, false));
    const model = (at: number) => {
      const step = steps[Math.min(Math.max(at, 1), steps.length) - 1];
      if (!step) throw new Error(`no step for ${id}`);
      return cardModelOf(step);
    };
    return {
      id,
      name: def.name,
      steps: steps.length,
      render: (lit) => ({ kind: "shape", model: model(lit) }),
      stepsText: steps.map((s) => `${s.badge}. ${richText(s.caption)}`),
      summary: copy.summary,
      differs: copy.differs,
    };
  });
}
