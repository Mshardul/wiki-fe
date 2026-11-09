import { useRef } from "react";
import type { VizFrame } from "@/lib/visualizer/core/types";
import { useFollowScroll } from "../hooks/useFollowScroll";

interface TimelineStripProps {
  frames: VizFrame[];
  current: number;
  unit: string;
  onSeek: (i: number) => void;
  // Cells show the step number instead of the label, for labels too long to fit a cell.
  numbered?: boolean;
}

function runsOf(frames: VizFrame[]): { label: string | null; frames: VizFrame[] }[] {
  const runs: { label: string | null; frames: VizFrame[] }[] = [];
  for (const frame of frames) {
    const label = frame.group ?? null;
    const last = runs.at(-1);
    if (last && last.label === label) last.frames.push(frame);
    else runs.push({ label, frames: [frame] });
  }
  return runs;
}

export function TimelineStrip({ frames, current, unit, onSeek, numbered }: TimelineStripProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { recenterNow } = useFollowScroll(wrapRef, current);
  const Unit = unit.charAt(0).toUpperCase() + unit.slice(1);
  const runs = runsOf(frames);
  const grouped = runs.some((run) => run.label !== null);
  const cell = (f: VizFrame) => {
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
        title={numbered ? f.label : undefined}
        onClick={() => {
          recenterNow();
          onSeek(f.index);
        }}
      >
        {numbered ? f.index + 1 : f.label}
      </button>
    );
  };
  return (
    <div className="viz-strip" ref={wrapRef}>
      <div className="viz-strip__track">
        {grouped
          ? runs.map((run) => (
              <div
                key={run.frames[0]?.index}
                className="viz-strip__group"
                role="group"
                aria-label={run.label ?? undefined}
              >
                {run.label && <p className="viz-strip__grouplabel">{run.label}</p>}
                <div className="viz-strip__groupcells">{run.frames.map(cell)}</div>
              </div>
            ))
          : frames.map(cell)}
      </div>
    </div>
  );
}
