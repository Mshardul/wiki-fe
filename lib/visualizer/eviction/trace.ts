import { mulberry32 } from "../core/rng";
import type { Pattern } from "./types";

const KEYS = "ABCDEFGHIJKL";
const keyAt = (i: number): string => KEYS.charAt(i);

export function generateTrace(
  pattern: Pattern,
  length: number,
  seed: number,
  capacity: number,
): string[] {
  const rand = mulberry32(seed);
  const n = Math.max(0, length);
  switch (pattern) {
    case "hot":
      return Array.from({ length: n }, () =>
        rand() < 0.6 ? keyAt(Math.floor(rand() * 2)) : keyAt(2 + Math.floor(rand() * 6)),
      );
    case "scan":
      return Array.from({ length: n }, (_, i) =>
        i < 4 || i >= n - 2 ? keyAt(i % 2) : keyAt(2 + ((i - 4) % 10)),
      );
    case "loop":
      return Array.from({ length: n }, (_, i) => keyAt(i % (capacity + 1)));
    case "uniform":
      return Array.from({ length: n }, () => keyAt(Math.floor(rand() * 8)));
  }
}
