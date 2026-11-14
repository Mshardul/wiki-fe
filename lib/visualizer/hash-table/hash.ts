import type { Cell, Scheme } from "./trace";

export const SECOND_MOD = 7;

export const homeOf = (key: number, size: number): number => key % size;

export const secondOf = (key: number): number => 1 + (key % SECOND_MOD);

// The slot tried on the i-th probe of a walk; i = 0 is the home slot.
export function slotAt(scheme: Scheme, key: number, size: number, i: number): number {
  const home = homeOf(key, size);
  if (scheme === "linear") return (home + i) % size;
  if (scheme === "quadratic") return (home + i * i) % size;
  return (home + i * secondOf(key)) % size;
}

// How far the i-th probe is from the home slot before wrapping; the arc label.
export function offsetOf(scheme: Scheme, key: number, i: number): number {
  if (scheme === "linear") return i;
  if (scheme === "quadratic") return i * i;
  return i * secondOf(key);
}

export const mathsOf = (key: number, size: number): string =>
  `${key} mod ${size} = ${homeOf(key, size)}`;

export const secondLine = (key: number): string =>
  `1 + ${key} mod ${SECOND_MOD} = ${secondOf(key)}`;

// Runs of three or more consecutive occupied slots; a run that wraps is two runs.
export function runsOf(cells: Cell[]): { from: number; to: number }[] {
  const runs: { from: number; to: number }[] = [];
  let from = -1;
  cells.forEach((c, i) => {
    if (c.state !== "empty") {
      if (from < 0) from = i;
    } else if (from >= 0) {
      if (i - from >= 3) runs.push({ from, to: i - 1 });
      from = -1;
    }
  });
  if (from >= 0 && cells.length - from >= 3) runs.push({ from, to: cells.length - 1 });
  return runs;
}
