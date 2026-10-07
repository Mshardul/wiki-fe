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
export interface SequenceField extends FieldBase {
  kind: "sequence";
  maxLen: number;
  hint: string;
  resetBy: string[];
}
export interface SeedField extends FieldBase {
  kind: "seed";
}
export type FieldSpec = ChipsField | SliderField | SequenceField | SeedField;
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

export function clampInt(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(v)));
}
