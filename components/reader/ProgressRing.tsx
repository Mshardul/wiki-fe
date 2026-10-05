"use client";

import { useScrollProgress } from "@/components/common/useScrollProgress";

export function ProgressRing() {
  const pct = useScrollProgress();
  return (
    // Only mounted in the reader, so always shown; the CSS hides .reading-progress without .visible.
    <div
      id="reading-progress"
      className="reading-progress visible"
      style={{ width: `${pct * 100}%` }}
    />
  );
}
