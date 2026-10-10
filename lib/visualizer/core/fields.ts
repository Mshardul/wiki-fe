export type FieldValue = string | number | string[] | null;
export type InputValues = Record<string, FieldValue>;

interface FieldBase {
  key: string;
  label: string;
  param: string;
  hideLabel?: boolean;
}
export interface ChipsField extends FieldBase {
  kind: "chips";
  options: { value: string; label: string }[];
}
export interface SliderField extends FieldBase {
  kind: "slider";
  min: number;
  max: number;
}
export type SequenceParse = { ok: true; tokens: string[] } | { ok: false; error: string };
export interface SequenceField extends FieldBase {
  kind: "sequence";
  maxLen: number;
  hint: string;
  resetBy: string[];
  // A module with its own token grammar supplies this; the default reads letters A–Z.
  parse?: (raw: string) => SequenceParse;
  // Separator between tokens in the URL; tokens that can run together (numbers) need one.
  join?: string;
}
export interface SeedField extends FieldBase {
  kind: "seed";
}
export type FieldSpec = ChipsField | SliderField | SequenceField | SeedField;
export interface FieldAvailability {
  disabled?: boolean;
  hint?: string;
}
export interface FieldSection {
  title: string;
  fields: FieldSpec[];
}

export const SEED_MAX = 0xffff;

export function allFields(sections: FieldSection[]): FieldSpec[] {
  return sections.flatMap((s) => s.fields);
}

export function applyChange(
  sections: FieldSection[],
  values: InputValues,
  key: string,
  value: FieldValue,
): InputValues {
  const next: InputValues = { ...values, [key]: value };
  for (const f of allFields(sections)) {
    if (f.kind === "sequence" && f.resetBy.includes(key)) next[f.key] = null;
  }
  return next;
}

export function parseSequence(raw: string, maxLen: number): string[] | null {
  const keys = raw
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .slice(0, maxLen);
  return keys.length ? keys : null;
}

export function parseSequenceField(field: SequenceField, raw: string): SequenceParse {
  if (field.parse) return field.parse(raw);
  const keys = parseSequence(raw, field.maxLen);
  return keys ? { ok: true, tokens: keys } : { ok: false, error: "Use letters A–Z" };
}

export function joinSequence(field: SequenceField, tokens: string[]): string {
  return tokens.join(field.join ?? "");
}

export function clampInt(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(v)));
}
