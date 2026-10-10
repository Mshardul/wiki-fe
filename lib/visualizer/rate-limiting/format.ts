export function formatEstimate(scaled: number, window: number): string {
  const v = scaled / window;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

export const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;
