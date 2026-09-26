"use client";

import { useScrollProgress } from "@/components/common/useScrollProgress";

export function ProgressRing() {
  const pct = useScrollProgress();
  return (
    <div id="reading-progress" className="reading-progress" style={{ width: `${pct * 100}%` }} />
  );
}
