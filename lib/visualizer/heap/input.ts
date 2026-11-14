import { clampInt, type InputValues } from "../core/fields";
import type { HeapItem } from "./engine";
import { HEAP_IDS, type HeapInput, MAX_K, MAX_VALUES, MIN_K, VALUE_MAX, VALUE_MIN } from "./types";

export { parseValues, SEQUENCE_ERROR } from "../sorting/input";

export const DEFAULT_SEQUENCE = ["5", "3", "8", "1", "4", "7"];

const DEFAULT_VALUES = DEFAULT_SEQUENCE.map(Number);

const num = (x: unknown, fallback: number): number =>
  typeof x === "number" && Number.isFinite(x) ? x : fallback;

export function toHeapInput(v: InputValues): HeapInput {
  const nums = Array.isArray(v.sequence)
    ? v.sequence.map(Number).filter((n) => Number.isFinite(n))
    : [];
  const values = nums.slice(0, MAX_VALUES).map((n) => clampInt(n, VALUE_MIN, VALUE_MAX));
  return {
    op: HEAP_IDS.find((id) => id === v.op) ?? "insert",
    order: v.order === "max" ? "max" : "min",
    k: clampInt(num(v.k, 3), MIN_K, MAX_K),
    values: values.length >= 2 ? values : DEFAULT_VALUES,
  };
}

export const asItems = (values: number[]): HeapItem[] => values.map((value) => ({ value }));
