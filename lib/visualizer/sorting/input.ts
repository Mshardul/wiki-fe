import { clampInt, type InputValues, SEED_MAX, type SequenceParse } from "../core/fields";
import { mulberry32 } from "../core/rng";
import {
  type Item,
  MAX_SIZE,
  MIN_SIZE,
  PRESETS,
  type Preset,
  SORT_IDS,
  type SortId,
  type SortInput,
} from "./types";

export interface Domain {
  min: number;
  max: number;
}

export const DEFAULT_SEQUENCE = ["5", "2", "4", "6", "1", "3"];

export const SEQUENCE_ERROR = `Use ${MIN_SIZE} to ${MAX_SIZE} whole numbers, like 5 2 4 6`;

export function domainOf(algo: SortId): Domain {
  return algo === "radix" ? { min: 10, max: 99 } : { min: 1, max: 9 };
}

const randomIn = (rng: () => number, d: Domain): number =>
  d.min + Math.floor(rng() * (d.max - d.min + 1));

export function makeValues(preset: Preset, size: number, seed: number, domain: Domain): number[] {
  const rng = mulberry32(seed);
  if (preset === "duplicates") {
    const pool = Array.from({ length: 3 }, () => randomIn(rng, domain));
    return Array.from({ length: size }, () => pool[Math.floor(rng() * pool.length)] ?? domain.min);
  }
  const values = Array.from({ length: size }, () => randomIn(rng, domain));
  if (preset === "random") return values;
  values.sort((a, b) => a - b);
  if (preset === "reversed") return values.reverse();
  const swaps = Math.ceil(size / 6);
  for (let k = 0; k < swaps; k++) {
    const at = Math.floor(rng() * (size - 1));
    const a = values[at] ?? 0;
    values[at] = values[at + 1] ?? 0;
    values[at + 1] = a;
  }
  return values;
}

export function tagItems(values: number[], stable: boolean): Item[] {
  const seen = new Map<number, number>();
  const total = new Map<number, number>();
  for (const v of values) total.set(v, (total.get(v) ?? 0) + 1);
  return values.map((value) => {
    if (!stable || (total.get(value) ?? 0) < 2) return { value };
    const n = seen.get(value) ?? 0;
    seen.set(value, n + 1);
    return { value, tag: String.fromCharCode(97 + n) };
  });
}

export function parseValues(raw: string): SequenceParse {
  const parts = raw.split(/[\s,_]+/).filter((p) => p !== "");
  if (parts.length < 2 || parts.length > MAX_SIZE) return { ok: false, error: SEQUENCE_ERROR };
  if (parts.some((p) => !/^\d{1,3}$/.test(p))) return { ok: false, error: SEQUENCE_ERROR };
  return { ok: true, tokens: parts };
}

const num = (x: unknown, fallback: number): number =>
  typeof x === "number" && Number.isFinite(x) ? x : fallback;

export function toSortInput(v: InputValues): SortInput {
  const algo = SORT_IDS.find((a) => a === v.algo) ?? "insertion";
  const domain = domainOf(algo);
  const nums = Array.isArray(v.sequence)
    ? v.sequence.map(Number).filter((n) => Number.isFinite(n))
    : [];
  const values = nums.slice(0, MAX_SIZE).map((n) => clampInt(n, domain.min, domain.max));
  return {
    algo,
    preset: PRESETS.find((p) => p === v.preset) ?? "random",
    size: clampInt(num(v.size, 6), MIN_SIZE, MAX_SIZE),
    seed: clampInt(num(v.seed, 0), 0, SEED_MAX),
    stable: v.stable === "on",
    values: values.length >= 2 ? values : null,
  };
}
