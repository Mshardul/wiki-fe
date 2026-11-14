import { clampInt, type InputValues, SEED_MAX, type SequenceParse } from "../core/fields";
import { mulberry32 } from "../core/rng";
import type { Op } from "./trace";
import {
  DEFAULT_SIZE,
  DEFAULT_THRESHOLD,
  HASH_IDS,
  type HashId,
  type HashInput,
  KEY_MAX,
  MAX_SIZE,
  MAX_TOKENS,
  MIN_SIZE,
  THRESHOLDS,
} from "./types";

// Hand-picked keys per variant, chosen so its defining behaviour shows in the first few steps.
export const PICKED: Record<HashId, string[]> = {
  chaining: ["16", "8", "24", "5", "32"],
  linear: ["16", "8", "24", "5", "32"],
  quadratic: ["16", "8", "24", "5", "13"],
  double: ["16", "8", "24", "5", "32"],
  resize: ["16", "8", "24", "5", "32", "13", "21"],
};

export const KEYS_ERROR = "Whole numbers 0–99, like 16 8 24 · -8 deletes · ?24 looks up";

const TOKEN = /^([-?]?)(\d{1,2})$/;

export function parseKeys(raw: string): SequenceParse {
  const parts = raw.split(/[\s,_]+/).filter((p) => p !== "");
  if (parts.length < 1 || parts.some((p) => !TOKEN.test(p))) {
    return { ok: false, error: KEYS_ERROR };
  }
  return { ok: true, tokens: parts.slice(0, MAX_TOKENS) };
}

export function tokensToOps(tokens: string[]): Op[] {
  return tokens.flatMap((t): Op[] => {
    const m = TOKEN.exec(t);
    if (!m) return [];
    const key = Math.min(KEY_MAX, Number(m[2]));
    return [{ kind: m[1] === "-" ? "delete" : m[1] === "?" ? "lookup" : "insert", key }];
  });
}

// Distinct keys from the seed, so a re-roll gives a new table to look at.
export function randomKeys(seed: number, count: number): string[] {
  const rng = mulberry32(seed);
  const out = new Set<number>();
  while (out.size < count) out.add(1 + Math.floor(rng() * KEY_MAX));
  return [...out].map(String);
}

const num = (x: unknown, fallback: number): number =>
  typeof x === "number" && Number.isFinite(x) ? x : fallback;

export function toHashInput(v: InputValues): HashInput {
  const algo = HASH_IDS.find((a) => a === v.algo) ?? "chaining";
  const seed = clampInt(num(v.seed, 0), 0, SEED_MAX);
  const given = Array.isArray(v.sequence) ? v.sequence.filter((t) => TOKEN.test(t)) : [];
  const fallback = v.keys === "random" ? randomKeys(seed, PICKED[algo].length) : PICKED[algo];
  const tokens = (given.length > 0 ? given : fallback).slice(0, MAX_TOKENS);
  const threshold = THRESHOLDS.find((t) => t === String(v.threshold));
  return {
    algo,
    size: clampInt(num(v.size, DEFAULT_SIZE), MIN_SIZE, MAX_SIZE),
    threshold: threshold ? Number(threshold) : DEFAULT_THRESHOLD,
    ops: tokensToOps(tokens),
    tokens,
  };
}
