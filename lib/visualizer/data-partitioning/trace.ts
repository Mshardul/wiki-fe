import { mulberry32 } from "../core/rng";
import { DEFAULT_KEY_COUNT, MAX_KEY, type Workload } from "./types";

// Eight keys per workload; the seed alone decides them, never the scheme.
export function generateKeys(
  workload: Workload,
  seed: number,
  count = DEFAULT_KEY_COUNT,
): string[] {
  const rng = mulberry32(seed);
  if (workload === "sequential") {
    const first = 60 + Math.floor(rng() * 33);
    return Array.from({ length: count }, (_, i) => String(first + i));
  }
  const keys = new Set<number>();
  while (keys.size < count) keys.add(Math.floor(rng() * (MAX_KEY + 1)));
  const out = [...keys].map(String);
  if (workload === "hot") {
    const at = Math.floor(rng() * out.length);
    out[at] = `${out[at]}*`;
  }
  return out;
}

// The node a Remove press takes out, written into the event token so the URL replays it.
export function pickRemoval(alive: string[], seed: number, eventIndex: number): string {
  const rng = mulberry32(seed + 1 + eventIndex);
  return alive[Math.floor(rng() * alive.length)] as string;
}
