import { mulberry32 } from "../core/rng";
import { KEYS, type Workload } from "./types";

const READ_SHARE: Record<Workload, number> = {
  read: 0.85,
  mixed: 0.6,
  write: 0.35,
  race: 0.65,
  crash: 0.6,
};
const RACE_SHARE = 0.35;
const CRASH_AT = 0.7;

// Independent of the strategy, so one seed gives one sequence under every strategy.
export function generateSequence(
  workload: Workload,
  length: number,
  keys: number,
  seed: number,
): string[] {
  const rand = mulberry32(seed);
  const n = Math.max(0, length);
  const nk = Math.min(KEYS.length, Math.max(1, keys));
  const out = Array.from({ length: n }, () => {
    const key = KEYS.charAt(Math.floor(rand() * nk));
    const isRead = rand() < READ_SHARE[workload];
    const racing = rand() < RACE_SHARE;
    if (!isRead) return `W${key}`;
    return workload === "race" && racing ? `X${key}` : `R${key}`;
  });
  if (workload === "crash" && n > 0) out[Math.floor(n * CRASH_AT)] = "!";
  return out;
}
