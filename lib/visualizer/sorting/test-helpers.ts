import type { Item, SortStep } from "./types";

export const items = (values: number[], tagged = false): Item[] => {
  if (!tagged) return values.map((value) => ({ value }));
  const seen = new Map<number, number>();
  const total = new Map<number, number>();
  for (const v of values) total.set(v, (total.get(v) ?? 0) + 1);
  return values.map((value) => {
    if ((total.get(value) ?? 0) < 2) return { value };
    const n = seen.get(value) ?? 0;
    seen.set(value, n + 1);
    return { value, tag: String.fromCharCode(97 + n) };
  });
};

export const badges = (steps: SortStep[]): string[] => steps.map((s) => s.badge);

// The row holding the sorted result: the one labelled output when present, else the first.
export function resultOf(step: SortStep): string[] {
  const row = step.array.rows.find((r) => r.label === "output") ?? step.array.rows[0];
  return (row?.bars ?? []).flatMap((b) => (b ? [`${b.value}${b.tag ?? ""}`] : []));
}

export const counterOf = (step: SortStep, label: string): string | undefined =>
  step.counters.find((c) => c.label === label)?.value;

export const last = (steps: SortStep[]): SortStep => {
  const s = steps[steps.length - 1];
  if (!s) throw new Error("no steps");
  return s;
};
