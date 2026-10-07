import { type CSSProperties, useState } from "react";
import type { RankingModel } from "@/lib/visualizer/core/shapes";

const MIN_SCALE = 5;

const vars = (v: Record<string, number>): CSSProperties => v;

export function RankingShape({ model, subject }: { model: RankingModel; subject: string }) {
  // Each new frame replays the glow and "+1": bump a counter when the model object changes.
  const [seen, setSeen] = useState(model);
  const [pulse, setPulse] = useState(0);
  if (seen !== model) {
    setSeen(model);
    setPulse((p) => p + 1);
  }

  const slots = Math.max(model.capacity, model.rows.length);
  const max = Math.max(MIN_SCALE, ...model.rows.map((r) => r.count));
  // Fixed DOM order (by key) so a reorder is a CSS move, not a re-mount.
  const stable = [...model.rows].sort((a, b) => a.key.localeCompare(b.key));
  const keys = model.rows.map((r) => r.key);

  return (
    <div
      className="viz-rank"
      role="img"
      aria-label={`${subject}: ${keys.join(", ")}`}
      style={vars({ "--n": slots })}
    >
      {Array.from({ length: slots }, (_, i) => (
        <div
          // Slots are positional guides.
          key={i}
          className={`viz-rank__slot${i >= model.rows.length ? " is-empty" : ""}`}
          style={vars({ "--rank": i })}
        >
          <span className="viz-rank__no">{i + 1}</span>
        </div>
      ))}
      {stable.map((r) => {
        const rank = model.rows.indexOf(r);
        const active = r.key === model.active;
        const tone = active ? ` viz-rank__row--${model.tone ?? "new"}` : "";
        const isNext = r.key === model.next;
        return (
          <div
            key={r.key}
            className={`viz-rank__row${tone}${isNext ? " viz-rank__row--next" : ""}`}
            style={vars({ "--rank": rank, "--fill": (Math.min(r.count, max) / max) * 100 })}
          >
            {active && <span key={`glow-${pulse}`} className="viz-rank__glow" aria-hidden="true" />}
            <span className="viz-rank__key">{r.key}</span>
            <span className="viz-rank__meter">
              <span className="viz-rank__fill" />
            </span>
            <span className="viz-rank__count">{r.count}×</span>
            {active && model.tone === "hit" && (
              <span key={`plus-${pulse}`} className="viz-rank__plus">
                +1
              </span>
            )}
            {isNext && <span className="viz-rank__flag">next out</span>}
          </div>
        );
      })}
      {model.evicted !== null && (
        <div
          key={`out-${model.evicted}-${pulse}`}
          className="viz-rank__row viz-rank__row--out"
          style={vars({ "--rank": slots - 1 })}
        >
          <span className="viz-rank__key">{model.evicted}</span>
        </div>
      )}
    </div>
  );
}
