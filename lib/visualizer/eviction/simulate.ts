import { badText, fill, goodText, keyText, mutedText, type Rich, warnText } from "../core/rich";
import { modelKeys } from "../core/shapes";
import type { Outcome, VarRow, VizFrame } from "../core/types";
import type { PolicyDef } from "./types";

const HIT_PATH = [0, 1];
const MISS_PATH = [0, 2, 3];

function caption(hitCaption: string, key: string, hit: boolean, evicted: string | null): Rich {
  if (hit) return [keyText(key), " ", goodText("hit"), ` — ${hitCaption}`];
  const base: Rich = [keyText(key), " ", badText("miss"), " — added"];
  return evicted ? [...base, " · ", keyText(evicted), " ", warnText("out")] : base;
}

export function simulate<S>(def: PolicyDef<S>, capacity: number, trace: string[]): VizFrame[] {
  let state = def.init(capacity);
  let hits = 0;
  return trace.map((key, t) => {
    const out = def.step(state, key, t);
    state = out.state;
    if (out.hit) hits++;
    const rate = `${Math.round((hits / (t + 1)) * 100)}%`;
    const model = def.model(state, key, out.hit, out.evicted);
    const tv = { key, victim: out.evicted ?? "", ...out.notes };
    const missLine = out.hit ? def.lines.missAny : out.evicted ? def.lines.evict : def.lines.room;
    const outcome: Outcome = out.hit ? "good" : "bad";
    const vars: VarRow[] = [
      { name: "request #", value: String(t + 1) },
      { name: "key", value: key },
      { name: "in cache?", value: out.hit ? "yes" : "no" },
      { name: "removed", value: out.evicted ?? "—" },
      { name: "cache", value: `[${modelKeys(model).join(" ")}]` },
      ...(def.vars?.(state, key) ?? []),
      { name: "hits", value: String(hits) },
      { name: "misses", value: String(t + 1 - hits) },
      { name: "hit rate", value: rate },
    ];
    return {
      index: t,
      label: key,
      outcome,
      badge: out.hit ? "HIT" : "MISS",
      caption: caption(def.hitCaption, key, out.hit, out.evicted),
      lines: [
        fill(def.lines.check, tv),
        fill(def.lines.hit, tv),
        fill(missLine, tv),
        fill(def.lines.insert, tv),
      ],
      path: out.hit ? HIT_PATH : MISS_PATH,
      vars,
      logNote: out.evicted ? ["removed ", keyText(out.evicted)] : [mutedText("—")],
      metric: rate,
      model,
    };
  });
}
