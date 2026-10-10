import {
  allFields,
  clampInt,
  type FieldSection,
  type InputValues,
  joinSequence,
  parseSequenceField,
  SEED_MAX,
} from "./fields";

export type ViewMode = "single" | "revision";

export interface ViewState {
  frame: number;
  rotated: boolean;
  view: ViewMode;
}

export type ViewInput = Omit<ViewState, "view"> & { view?: ViewMode };

export function encodeState(
  sections: FieldSection[],
  values: InputValues,
  view: ViewInput,
): string {
  const q = new URLSearchParams();
  for (const f of allFields(sections)) {
    const v = values[f.key];
    if (v === null || v === undefined) continue;
    if (f.kind === "seed" && typeof v === "number") q.set(f.param, v.toString(16));
    else if (f.kind === "sequence" && Array.isArray(v)) q.set(f.param, joinSequence(f, v));
    else q.set(f.param, String(v));
  }
  q.set("i", String(view.frame + 1));
  if (view.rotated) q.set("rot", "1");
  if (view.view === "revision") q.set("view", "revision");
  return `?${q.toString()}`;
}

export function parseState(
  search: string,
  sections: FieldSection[],
  defaults: InputValues,
): { values: InputValues; view: ViewState } {
  const q = new URLSearchParams(search);
  const values: InputValues = { ...defaults };
  for (const f of allFields(sections)) {
    const raw = q.get(f.param);
    if (raw === null) continue;
    if (f.kind === "chips") {
      if (f.options.some((o) => o.value === raw)) values[f.key] = raw;
    } else if (f.kind === "slider") {
      const n = Number(raw);
      if (Number.isFinite(n)) values[f.key] = clampInt(n, f.min, f.max);
    } else if (f.kind === "seed") {
      const n = Number.parseInt(raw, 16);
      if (Number.isFinite(n)) values[f.key] = clampInt(n, 0, SEED_MAX);
    } else {
      const parsed = parseSequenceField(f, raw);
      values[f.key] = parsed.ok ? parsed.tokens : null;
    }
  }
  const i = Number(q.get("i"));
  return {
    values,
    view: {
      frame: Number.isFinite(i) && i >= 1 ? Math.floor(i) - 1 : 0,
      rotated: q.get("rot") === "1",
      view: q.get("view") === "revision" ? "revision" : "single",
    },
  };
}
