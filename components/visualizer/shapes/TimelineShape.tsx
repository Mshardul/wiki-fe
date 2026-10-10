import { useId, useRef } from "react";
import { type Size, timelineLayout } from "@/lib/visualizer/core/geometry";
import { type TimelineMark, type TimelineModel, timelineLabel } from "@/lib/visualizer/core/shapes";
import { useFollowScroll } from "../hooks/useFollowScroll";

interface TimelineShapeProps {
  model: TimelineModel;
  size: Size;
  subject: string;
  dense?: boolean;
}

function Mark({ mark, x, y, r }: { mark: TimelineMark; x: number; y: number; r: number }) {
  const a = r * 0.4;
  return (
    <g className={`viz-tl__mark viz-tl__mark--${mark.tone}`}>
      {mark.current && <circle className="viz-tl__ring" cx={x} cy={y} r={r + 4} />}
      <circle className="viz-tl__dot" cx={x} cy={y} r={r} />
      {mark.tone === "bad" && (
        <path
          className="viz-tl__cross"
          d={`M${x - a} ${y - a}l${2 * a} ${2 * a}m0 ${-2 * a}l${-2 * a} ${2 * a}`}
        />
      )}
    </g>
  );
}

function groupByTick(marks: TimelineMark[]): [number, TimelineMark[]][] {
  const groups = new Map<number, TimelineMark[]>();
  for (const m of marks) groups.set(m.at, [...(groups.get(m.at) ?? []), m]);
  return [...groups.entries()];
}

export function TimelineShape({ model, size, subject, dense }: TimelineShapeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const patternId = useId();
  const L = timelineLayout(
    size,
    {
      ticks: model.ticks,
      rows: model.rows.length,
      stack: model.stack,
      lanes: model.lanes,
      labeled: model.rows.some((r) => r.label !== ""),
    },
    dense,
  );
  useFollowScroll(wrapRef, model.now);
  const full = L.rung === "full";
  const cap = Math.max(1, model.stack);
  const plotH = L.axisY - L.bandTop;
  const labelled = model.spans.filter((s) => s.label !== "");
  return (
    <div className="viz-tl" ref={wrapRef}>
      <div className="viz-tl__inner" style={{ width: L.width, height: L.height }}>
        <svg
          className="viz-tl__svg"
          width={L.width}
          height={L.height}
          role="img"
          aria-label={timelineLabel(model, subject)}
        >
          <defs>
            <pattern
              id={patternId}
              width={6}
              height={6}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect className="viz-tl__hatch" width={3} height={6} />
            </pattern>
          </defs>
          {model.bands.map((b, i) => (
            <g key={`band-${b.from}`}>
              <rect
                className={`viz-tl__band viz-tl__band--${i % 2}`}
                x={L.x(b.from)}
                y={L.bandTop}
                width={(b.to - b.from + 1) * L.pitch}
                height={plotH}
                rx={6}
              />
              <text className="viz-tl__bandlabel" x={L.x(b.from) + 8} y={L.bandTop + 14}>
                {full ? b.label : (b.short ?? b.label)}
              </text>
            </g>
          ))}
          {model.spans
            .filter((s) => s.style !== "alert")
            .map((s) => (
              <rect
                key={`span-${s.style}-${s.from}-${s.to}`}
                className={`viz-tl__span viz-tl__span--${s.style}`}
                x={L.x(s.from)}
                y={L.bandTop}
                width={(s.to - s.from + 1) * L.pitch}
                height={plotH}
                rx={6}
                fill={s.style === "hatch" ? `url(#${patternId})` : undefined}
              />
            ))}
          {model.boundaries.map((b) => (
            <line
              key={`boundary-${b}`}
              className="viz-tl__boundary"
              x1={L.x(b)}
              x2={L.x(b)}
              y1={L.bandTop}
              y2={L.axisY}
            />
          ))}
          {model.rows.map((row, r) => (
            <g key={`row-${row.label || r}`}>
              {row.label !== "" && (
                <text className="viz-tl__rowlabel" x={L.x(0)} y={L.rowTop(r) + L.labelH - 3}>
                  {row.label}
                </text>
              )}
              {groupByTick(row.marks).map(([at, group]) => {
                const shown = group.length > cap ? group.slice(0, cap - 1) : group;
                const hidden = group.length - shown.length;
                const base = L.rowBase(r);
                return (
                  <g key={`tick-${at}`}>
                    {shown.map((m, k) => (
                      <Mark
                        key={`${at}-${k}`}
                        mark={m}
                        x={L.cx(at)}
                        y={base - k * L.stackPitch}
                        r={L.markR}
                      />
                    ))}
                    {hidden > 0 && (
                      <g
                        className={`viz-tl__more${group.some((m) => m.current) ? " is-current" : ""}`}
                      >
                        <rect
                          x={L.cx(at) - 12}
                          y={base - shown.length * L.stackPitch - 7}
                          width={24}
                          height={14}
                          rx={7}
                        />
                        <text
                          x={L.cx(at)}
                          y={base - shown.length * L.stackPitch + 4}
                          textAnchor="middle"
                        >
                          +{hidden}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          ))}
          <line
            className="viz-tl__axis"
            x1={L.x(0)}
            x2={L.x(model.ticks)}
            y1={L.axisY}
            y2={L.axisY}
          />
          {Array.from({ length: model.ticks }, (_, t) => t)
            .filter((t) => t % L.labelEvery === 0)
            .map((t) => (
              <text
                key={`tick-${t}`}
                className="viz-tl__tick"
                x={L.cx(t)}
                y={L.axisY + 14}
                textAnchor="middle"
              >
                {t}
              </text>
            ))}
          {labelled.map((s, lane) => {
            const y = L.spanTop + lane * L.laneH;
            const text = full ? s.label : (s.short ?? s.label);
            const x1 = L.x(s.from) + 4;
            const w = Math.max(0, (s.to - s.from + 1) * L.pitch - 8);
            return (
              <g key={`label-${s.style}-${s.from}-${s.to}`}>
                {s.style === "alert" && (
                  <path className="viz-tl__bracket" d={`M${x1} ${y - 12}v5h${w}v-5`} />
                )}
                <text
                  className={`viz-tl__spanlabel viz-tl__spanlabel--${s.style}`}
                  x={s.style === "alert" ? x1 + w / 2 : x1}
                  y={s.style === "alert" ? y + 6 : y}
                  textAnchor={s.style === "alert" ? "middle" : "start"}
                >
                  {text}
                </text>
              </g>
            );
          })}
          <path
            className="viz-tl__now"
            d={`M-5 ${L.bandTop - 2}h10l-5 7z`}
            style={{ transform: `translateX(${L.cx(model.now)}px)` }}
          />
        </svg>
        <span
          className="viz-tl__anchor"
          data-index={model.now}
          style={{ left: L.x(model.now), width: L.pitch }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
