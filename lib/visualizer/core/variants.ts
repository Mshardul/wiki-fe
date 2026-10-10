import { allFields, type FieldSection } from "./fields";

export function variantOptions(
  sections: FieldSection[],
  key: string,
): { value: string; label: string }[] {
  const field = allFields(sections).find((f) => f.kind === "chips" && f.key === key);
  return field?.kind === "chips" ? field.options : [];
}

export function stepVariant(ids: string[], current: string, delta: number): string {
  if (ids.length === 0) return current;
  const at = Math.max(0, ids.indexOf(current));
  const next = (((at + delta) % ids.length) + ids.length) % ids.length;
  return ids[next] ?? current;
}
