import { useId, useLayoutEffect, useRef, useState } from "react";
import { scheduleLayout } from "@/lib/visualizer/core/geometry";
import { prefersReducedMotion } from "@/lib/visualizer/core/motion";
import type { ScheduleModel, ScheduleSegment } from "@/lib/visualizer/core/shapes";
import { useElementSize } from "../hooks/useElementSize";

// Glyph width of --text-xs in the mono font, in px.
const CHAR_W = 7;
const TICK_LABEL_MIN_GAP = 48;
const LABEL_MAX_W = 200;
const EPS = 1e-4;

const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);

function useGlide(target: number, track: string, end: number): number {
  const [shown, setShown] = useState(target);
  const last = useRef({ track, t: target });
  useLayoutEffect(() => {
    const from = last.current.track === track ? last.current.t : 0;
    const settle = (t: number) => {
      last.current = { track, t };
      setShown(t);
    };
    if (prefersReducedMotion() || Math.abs(target - from) < EPS) {
      settle(target);
      return;
    }
    const duration = Math.min(1100, 350 + (Math.abs(target - from) / end) * 1400);
    const start = performance.now();
    let raf = 0;
    const step = (at: number) => {
      const p = Math.min((at - start) / duration, 1);
      settle(from + (target - from) * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    settle(from);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, track, end]);
  return shown;
}

function marks(from: number, to: number, every: number): number[] {
  const out: number[] = [];
  for (let k = Math.ceil(from / every - EPS); k * every < to - EPS; k++) {
    if (k * every > from + 0.05) out.push(k * every);
  }
  return out;
}

const fmt = (t: number) => t.toFixed(1);

function Share({ model, now }: { model: ScheduleModel; now: number }) {
  if (model.share && model.unit !== null) {
    const unit = model.unit;
    const held = model.rows.map((r) => ({
      label: r.label,
      t: revealed(r.segments, now)
        .filter((s) => s.style === "solid")
        .reduce((sum, s) => sum + s.cut - s.from, 0),
    }));
    const idle = Math.max(now - held.reduce((sum, h) => sum + h.t, 0), 0);
    const pct = (t: number) => (now > 0 ? Math.round((t / now) * 100) : 0);
    return (
      <p className="viz-sched__share">
        <span>
          {model.share.lead} {fmt(now)} {unit}:
        </span>
        {held.map((h) => (
          <span key={h.label}>
            {h.label}{" "}
            <b>
              {fmt(h.t)} {unit}
            </b>{" "}
            ({pct(h.t)}%)
          </span>
        ))}
        <span>
          {model.share.idle}{" "}
          <b>
            {fmt(idle)} {unit}
          </b>
        </span>
      </p>
    );
  }
  return model.note ? <p className="viz-sched__share">{model.note}</p> : null;
}

interface Box {
  x0: number;
  x1: number;
  y: number;
}

const fits = (label: string, w: number) => w >= Math.min(label.length * CHAR_W + 10, LABEL_MAX_W);

function revealed(segments: ScheduleSegment[], now: number) {
  return segments.filter((s) => s.from < now).map((s) => ({ ...s, cut: Math.min(s.to, now) }));
}

function heldSpans(segments: ScheduleSegment[], now: number) {
  const spans: { from: number; cut: number; label?: string }[] = [];
  for (const s of revealed(segments, now).sort((a, b) => a.from - b.from)) {
    const prev = spans.at(-1);
    if (prev && prev.label === s.label && Math.abs(prev.cut - s.from) < EPS) prev.cut = s.cut;
    else spans.push({ from: s.from, cut: s.cut, ...(s.label ? { label: s.label } : {}) });
  }
  return spans;
}

function axisTicks(end: number, every: number): number[] {
  const n = Math.floor(end / every + EPS);
  return Array.from({ length: n + 1 }, (_, i) => Number((i * every).toFixed(3)));
}

function describe(model: ScheduleModel, subject: string, now: number): string {
  const rows = model.rows.map((r) => {
    const parts = revealed(r.segments, now).map(
      (s) => `${s.label ? `${s.label} ` : ""}${s.from}–${s.cut}`,
    );
    return `${r.label}: ${parts.join(", ") || "nothing yet"}`;
  });
  return `${subject} at ${now}${model.unit ?? ""}: ${rows.join("; ")}`;
}

export function ScheduleShape({ model, subject }: { model: ScheduleModel; subject: string }) {
  const hatchId = useId();
  const arrowId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(wrapRef);
  const L = scheduleLayout(model, size.w > 0 ? size.w : undefined);
  const target = Math.min(Math.max(model.now, 0), model.end);
  const now = useGlide(target, model.track, model.end);
  const seen = (t: number) => t <= now + EPS;
  const index = new Map(model.rows.map((r, i) => [r.id, i]));
  const tickPitch = L.x(model.tickEvery) - L.x(0);
  const tickLabelEvery = Math.max(1, Math.ceil(TICK_LABEL_MIN_GAP / Math.max(tickPitch, 1)));
  const overlaps = (a: Box, b: Box) =>
    Math.abs(a.y - b.y) < 10 && a.x0 < b.x1 + 4 && b.x0 < a.x1 + 4;
  const arrows = model.arrows.flatMap((a) => {
    const from = index.get(a.from);
    const to = index.get(a.to);
    if (from === undefined || to === undefined) return [];
    const up = from > to;
    const y1 = up ? L.rowY(from) - 12 : L.rowY(from) + L.laneH + 3;
    const y2 = up ? L.rowY(to) + L.laneH + 3 : L.rowY(to) - 3;
    return [{ ...a, x: L.x(a.at), y1, y2 }];
  });
  return (
    <div className="viz-sched" ref={wrapRef}>
      {model.unit === null && <p className="viz-sched__axislabel">{model.axisLabel}</p>}
      <svg
        className="viz-sched__svg"
        viewBox={`0 0 ${L.width} ${L.height}`}
        width={L.width}
        height={L.height}
        role="img"
        aria-label={describe(model, subject, target)}
      >
        <defs>
          <pattern
            id={hatchId}
            width={6}
            height={6}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect className="viz-sched__hatch-bg" width={6} height={6} />
            <line className="viz-sched__hatch-line" x1={0} y1={0} x2={0} y2={6} />
          </pattern>
          <marker
            id={arrowId}
            viewBox="0 0 10 10"
            refX={8}
            refY={5}
            markerWidth={7}
            markerHeight={7}
            orient="auto-start-reverse"
          >
            <path className="viz-sched__arrowhead" d="M0,0 L10,5 L0,10 z" />
          </marker>
        </defs>

        <line className="viz-sched__axis" x1={L.left} y1={L.axisY} x2={L.right} y2={L.axisY} />
        {axisTicks(model.end, model.tickEvery).map((v, k) => (
          <g key={`tick-${v}`}>
            <line
              className="viz-sched__tick"
              x1={L.x(v)}
              y1={L.axisY - 3}
              x2={L.x(v)}
              y2={L.axisY + 3}
            />
            {k % tickLabelEvery === 0 && (
              <text
                className="viz-sched__ticklabel"
                x={L.x(v)}
                y={L.axisY - 8}
                textAnchor={v === 0 ? "start" : "middle"}
              >
                {v === 0 && model.unit ? `${v} ${model.unit}` : v}
              </text>
            )}
          </g>
        ))}

        {model.summary && (
          <g className="viz-sched__summary">
            <text
              className="viz-sched__rowlabel"
              x={L.left - 10}
              y={L.summaryY + L.summaryH / 2 + 4}
              textAnchor="end"
            >
              {model.summary.label}
            </text>
            <rect
              className="viz-sched__track"
              x={L.left}
              y={L.summaryY}
              width={L.right - L.left}
              height={L.summaryH}
              rx={3}
            />
            {heldSpans(model.summary.segments, now).map((s) => {
              const w = Math.max(L.x(s.cut) - L.x(s.from), 0.5);
              return (
                <g key={`sum-${s.from}`}>
                  <rect
                    className="viz-sched__held"
                    x={L.x(s.from)}
                    y={L.summaryY}
                    width={w}
                    height={L.summaryH}
                  />
                  {s.label && w > 22 && (
                    <text
                      className="viz-sched__heldlabel"
                      x={L.x(s.from) + w / 2}
                      y={L.summaryY + 12}
                      textAnchor="middle"
                    >
                      {s.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {model.rows.map((row, i) => {
          const y = L.rowY(i);
          const underBoxes: Box[] = [];
          return (
            <g key={row.id} className="viz-sched__row">
              <text
                className="viz-sched__rowlabel"
                x={L.left - 10}
                y={y + L.laneH / 2 + 4}
                textAnchor="end"
              >
                {row.label}
              </text>
              <line
                className="viz-sched__guide"
                x1={L.left}
                y1={y + L.laneH / 2}
                x2={L.right}
                y2={y + L.laneH / 2}
              />
              {revealed(row.segments, now).map((s, k, shown) => {
                const x0 = L.x(s.from);
                const w = Math.max(L.x(s.cut) - x0, 0.5);
                const full = L.x(s.to) - x0;
                const next = shown[k + 1];
                const room = (next ? L.x(next.from) : L.right) - (x0 + w);
                const inside = Boolean(s.label) && fits(s.label ?? "", w);
                // Beside the bar while the lane ahead is empty; under it once the next bar closes in.
                const beside =
                  Boolean(s.label) && !inside && room >= (s.label ?? "").length * CHAR_W + 8;
                const underX = x0 + full / 2;
                const underBox: Box = {
                  x0: underX - ((s.label?.length ?? 0) * CHAR_W) / 2,
                  x1: underX + ((s.label?.length ?? 0) * CHAR_W) / 2,
                  y: y + L.laneH + 12,
                };
                const under =
                  Boolean(s.label) &&
                  !inside &&
                  !beside &&
                  !fits(s.label ?? "", full) &&
                  !underBoxes.some((b) => overlaps(b, underBox));
                if (under) underBoxes.push(underBox);
                return (
                  <g key={`seg-${s.from}`}>
                    <rect
                      className={`viz-sched__seg viz-sched__seg--${s.style}`}
                      x={x0}
                      y={y}
                      width={w}
                      height={L.laneH}
                      rx={2}
                      fill={s.style === "hatch" ? `url(#${hatchId})` : undefined}
                    />
                    {s.label && inside && (
                      <text
                        className={`viz-sched__seglabel viz-sched__seglabel--${s.style}`}
                        x={x0 + w / 2}
                        y={y + L.laneH / 2 + 4}
                        textAnchor="middle"
                      >
                        {s.label}
                      </text>
                    )}
                    {s.label && beside && (
                      <text
                        className={`viz-sched__seglabel viz-sched__seglabel--${s.style} viz-sched__seglabel--out`}
                        x={x0 + w + 6}
                        y={y + L.laneH / 2 + 4}
                      >
                        {s.label}
                      </text>
                    )}
                    {s.label && under && (
                      <text
                        className={`viz-sched__seglabel viz-sched__seglabel--${s.style} viz-sched__seglabel--out`}
                        x={x0 + full / 2}
                        y={y + L.laneH + 12}
                        textAnchor="middle"
                      >
                        {s.label}
                      </text>
                    )}
                  </g>
                );
              })}
              {model.marksEvery !== null &&
                revealed(row.segments, now)
                  .filter((s) => s.style === "solid")
                  .flatMap((s) => marks(s.from, s.cut, model.marksEvery ?? 1))
                  .map((v) => (
                    <line
                      key={`mark-${v}`}
                      className="viz-sched__mark"
                      x1={L.x(v)}
                      y1={y + L.laneH - 5}
                      x2={L.x(v)}
                      y2={y + L.laneH}
                    />
                  ))}
            </g>
          );
        })}

        {model.meters.map((m) => {
          const r = index.get(m.row);
          if (r === undefined || m.from >= now) return null;
          const y = L.rowY(r) - 9;
          const w = L.x(m.to) - L.x(m.from);
          return (
            <g key={`meter-${m.row}-${m.from}`} className="viz-sched__meter">
              <rect
                className="viz-sched__meter-track"
                x={L.x(m.from)}
                y={y}
                width={w}
                height={4}
                rx={2}
              />
              <rect
                className="viz-sched__meter-fill"
                x={L.x(m.from)}
                y={y}
                width={Math.max(L.x(Math.min(now, m.to)) - L.x(m.from), 0.5)}
                height={4}
                rx={2}
              />
              {m.label && fits(m.label, w) && (
                <text className="viz-sched__note" x={L.x(m.from) + 2} y={y - 3}>
                  {m.label}
                </text>
              )}
            </g>
          );
        })}

        {model.pins.map((p) => {
          const r = index.get(p.row);
          if (r === undefined || !seen(p.at)) return null;
          const y = L.rowY(r);
          return (
            <g key={`pin-${p.row}-${p.at}`} className="viz-sched__pin">
              <line x1={L.x(p.at)} y1={y - 4} x2={L.x(p.at)} y2={y + L.laneH + 4} />
              {p.label && (
                <text className="viz-sched__pinlabel" x={L.x(p.at) + 5} y={y - 6}>
                  {p.label}
                </text>
              )}
            </g>
          );
        })}

        {arrows
          .filter((a) => seen(a.at))
          .map((a) => (
            <g key={`arrow-${a.from}-${a.at}`} className="viz-sched__arrow">
              <line x1={a.x} y1={a.y1} x2={a.x} y2={a.y2} markerEnd={`url(#${arrowId})`} />
            </g>
          ))}

        {model.values && (
          <g className="viz-sched__values">
            <text
              className="viz-sched__rowlabel"
              x={L.left - 10}
              y={L.valuesY + 18}
              textAnchor="end"
            >
              {model.values.label}
            </text>
            <line
              className="viz-sched__guide"
              x1={L.left}
              y1={L.valuesY + 14}
              x2={L.right}
              y2={L.valuesY + 14}
            />
            {model.values.points
              .filter((p) => seen(p.at))
              .map((p, k, shown) => {
                const x = L.x(p.at);
                const end = k === shown.length - 1 && x + 6 + p.text.length * CHAR_W > L.right + 8;
                const tone = p.bad ? " is-bad" : "";
                return (
                  <g key={`value-${p.at}`} className={`viz-sched__value${tone}`}>
                    <circle cx={x} cy={L.valuesY + 14} r={3.5} />
                    <text
                      className="viz-sched__valuetext"
                      x={end ? x - 6 : x + 6}
                      // Alternate lines so neighbouring values never overprint.
                      y={L.valuesY + (k % 2 === 0 ? 30 : 44)}
                      textAnchor={end ? "end" : "start"}
                    >
                      {p.text}
                    </text>
                    {p.note && (
                      <text className="viz-sched__note" x={x + 6} y={L.valuesY + 8}>
                        {p.note}
                      </text>
                    )}
                  </g>
                );
              })}
          </g>
        )}

        <line
          className="viz-sched__now"
          x1={L.x(now)}
          y1={L.axisY}
          x2={L.x(now)}
          y2={L.height - 4}
        />
      </svg>
      <Share model={model} now={now} />
    </div>
  );
}
