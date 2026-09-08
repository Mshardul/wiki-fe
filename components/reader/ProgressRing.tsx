"use client";

import { useScrollProgress } from "@/components/common/useScrollProgress";

// The top #reading-progress bar (article view only). The scroll-top-btn ring shares useScrollProgress.
// Ported from js/app/reading-progress.js.
export function ProgressRing() {
  const pct = useScrollProgress();
  return (
    <div id="reading-progress" className="reading-progress" style={{ width: `${pct * 100}%` }} />
  );
}
