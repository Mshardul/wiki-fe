import type { SequenceParse } from "../core/fields";
import { MAX_REQUESTS, MAX_TICK } from "./types";

export const TICKS_ERROR_NUMBER = `Ticks must be whole numbers from 0 to ${MAX_TICK}`;
export const TICKS_ERROR_ORDER = "Ticks must not go backwards";
export const TICKS_ERROR_COUNT = `Use 1 to ${MAX_REQUESTS} requests`;

// Dots and minus signs are not separators, so "2.5" and "-3" fail loudly instead of becoming ticks.
export function parseTicks(raw: string): SequenceParse {
  const parts = raw.split(/[\s,_]+/).filter((p) => p !== "");
  if (parts.length === 0) return { ok: false, error: TICKS_ERROR_COUNT };
  const nums: number[] = [];
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return { ok: false, error: TICKS_ERROR_NUMBER };
    const n = Number(p);
    if (n > MAX_TICK) return { ok: false, error: TICKS_ERROR_NUMBER };
    nums.push(n);
  }
  if (nums.some((n, i) => i > 0 && n < (nums[i - 1] ?? 0))) {
    return { ok: false, error: TICKS_ERROR_ORDER };
  }
  if (nums.length > MAX_REQUESTS) return { ok: false, error: TICKS_ERROR_COUNT };
  return { ok: true, tokens: nums.map(String) };
}
