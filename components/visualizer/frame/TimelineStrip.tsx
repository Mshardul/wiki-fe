import { useRef } from "react";
import type { VizFrame } from "@/lib/visualizer/core/types";
import { useFollowScroll } from "../hooks/useFollowScroll";

interface TimelineStripProps {
  frames: VizFrame[];
  current: number;
  unit: string;
  onSeek: (i: number) => void;
}

export function TimelineStrip({ frames, current, unit, onSeek }: TimelineStripProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { recenterNow } = useFollowScroll(wrapRef, current);
  const Unit = unit.charAt(0).toUpperCase() + unit.slice(1);
  return (
    <div className="viz-strip" ref={wrapRef}>
      <div className="viz-strip__track">
        {frames.map((f) => {
          const played = f.index < current;
          const state = f.index === current ? " is-current" : played ? ` is-${f.outcome}` : "";
          return (
            <button
              key={f.index}
              type="button"
              data-index={f.index}
              className={`viz-strip__cell${state}`}
              aria-label={`${Unit} ${f.index + 1}: ${f.label}${played ? `, ${f.badge.toLowerCase()}` : ""}`}
              aria-current={f.index === current ? "step" : undefined}
              onClick={() => {
                recenterNow();
                onSeek(f.index);
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
