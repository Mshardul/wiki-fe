import { memo } from "react";
import type { Experiment, VizFrame } from "@/lib/visualizer/core/types";
import { RichText } from "../ui/RichText";
import { VarsTable } from "../ui/VarsTable";

type LineState = "now" | "ran" | "todo" | "skip";

function lineState(frame: VizFrame, line: number, sub: number): LineState {
  const pos = frame.path.indexOf(line);
  if (pos === -1) return "skip";
  const at = Math.min(sub, frame.path.length - 1);
  if (pos === at) return "now";
  return pos < at ? "ran" : "todo";
}

interface StepTabProps {
  frame: VizFrame;
  prev: VizFrame | null;
  sub: number;
  unit: string;
}

export function StepTab({ frame, prev, sub, unit }: StepTabProps) {
  return (
    <>
      <h4 className="viz-info__label">Each {unit} runs</h4>
      <div className="viz-steps">
        <p className="viz-steps__head">
          for each {unit} → <span className="viz-rich viz-rich--key">{frame.label}</span>
        </p>
        <ol className="viz-steps__list">
          {frame.lines.map((line, i) => {
            const state = lineState(frame, i, sub);
            return (
              // Lines are a fixed template, so position is the identity.
              <li
                key={i}
                className={`viz-steps__line viz-steps__line--${state}`}
                aria-current={state === "now" ? "step" : undefined}
              >
                {/* One grid cell: bare text/chips would each become their own grid item. */}
                <span>
                  <RichText value={line} />
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <h4 className="viz-info__label">Variables</h4>
      <VarsTable now={frame.vars} before={prev?.vars ?? null} />
    </>
  );
}

interface LogTabProps {
  frames: VizFrame[];
  current: number;
  onSeek: (i: number) => void;
}

export function LogTab({ frames, current, onSeek }: LogTabProps) {
  return (
    <ol className="viz-log">
      {frames.slice(0, current + 1).map((f) => (
        <li key={f.index}>
          <button
            type="button"
            className={`viz-log__row${f.index === current ? " is-current" : ""}`}
            onClick={() => onSeek(f.index)}
          >
            <span className="viz-log__n">#{f.index + 1}</span>
            <span className="viz-rich viz-rich--key">{f.label}</span>
            <span className={`viz-badge viz-badge--${f.outcome}`}>{f.badge}</span>
            <span className="viz-log__note">
              <RichText value={f.logNote} />
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

export const AboutTab = memo(function AboutTab({ about }: { about: [string, string][] }) {
  return (
    <dl className="viz-about">
      {about.map(([term, detail]) => (
        <div key={term} className="viz-about__row">
          <dt>{term}</dt>
          <dd>{detail}</dd>
        </div>
      ))}
    </dl>
  );
});

interface TryTabProps {
  tries: Experiment[];
  onTry: (e: Experiment) => void;
}

export const TryTab = memo(function TryTab({ tries, onTry }: TryTabProps) {
  return (
    <>
      <h4 className="viz-info__label">Guided experiments — sets the inputs for you</h4>
      {tries.map((t) => (
        <div key={t.title} className="viz-try">
          <h5 className="viz-try__title">{t.title}</h5>
          <p className="viz-try__blurb">{t.blurb}</p>
          <button type="button" className="viz-btn" onClick={() => onTry(t)}>
            Run <span aria-hidden="true">▶</span>
          </button>
        </div>
      ))}
    </>
  );
});
