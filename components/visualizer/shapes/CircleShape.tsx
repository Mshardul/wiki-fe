import { arcPath, layerPoints, polar } from "@/lib/visualizer/core/circle-geometry";
import { type CircleModel } from "@/lib/visualizer/core/shapes";
import { FitBox } from "./FitBox";

export const CIRCLE_R = 118;
const RING_W = 12;
const ANCHOR_R = CIRCLE_R + 34;
const BADGE_R = CIRCLE_R + 74;
const SIDE = 2 * (BADGE_R + 20);
export const CIRCLE_C = SIDE / 2;
const C = CIRCLE_C;
const POINT_R = 10;
const BAR_W = 36;
const MIN_GAP = 5;
export const CIRCLE_LAYER_STEP = 20;
const LAYER_STEP = CIRCLE_LAYER_STEP;

export function CircleShape({ model, subject }: { model: CircleModel; subject: string }) {
  const { size } = model;
  const layers = layerPoints(
    model.points.map((p) => p.at),
    size,
    MIN_GAP,
  );
  const ticks = [0, 1, 2, 3].map((q) => Math.round((q * size) / 4));
  const label = model.anchors
    .map((a) => `${a.label} at ${a.at}, ${a.count}`)
    .concat(model.points.map((p) => `${p.label} at ${p.at}`))
    .join("; ");
  return (
    <div className="viz-circle" role="img" aria-label={`${subject}: ${label}`}>
      <FitBox className="viz-circle__fit">
        <svg
          className="viz-circle__svg"
          width={SIDE}
          height={SIDE}
          viewBox={`0 0 ${SIDE} ${SIDE}`}
          aria-hidden="true"
        >
          <circle className="viz-circle__track" cx={C} cy={C} r={CIRCLE_R} strokeWidth={RING_W} />
          {model.arcs.map((a) => (
            <path
              key={`${a.from}-${a.to}`}
              className={`viz-circle__arc viz-hue-${a.hue}`}
              d={arcPath(C, C, CIRCLE_R, a.from, a.to, size)}
              strokeWidth={RING_W}
            />
          ))}
          {ticks.map((t) => {
            const p = polar(C, C, CIRCLE_R - 24, t, size);
            return (
              <text
                key={t}
                className="viz-circle__tick"
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dy="0.35em"
              >
                {t}
              </text>
            );
          })}
          {model.walk && (
            <path
              className="viz-circle__walk"
              d={arcPath(C, C, CIRCLE_R - 10, model.walk.from, model.walk.to, size)}
            />
          )}
          {model.anchors.map((a) => {
            const ring = polar(C, C, CIRCLE_R, a.at, size);
            const mark = polar(C, C, ANCHOR_R, a.at, size);
            const badge = polar(C, C, BADGE_R, a.at, size);
            const fill = Math.min(1, a.load / (model.loadMax || 1));
            const tick = Math.min(1, model.ideal / (model.loadMax || 1));
            return (
              <g
                key={a.id}
                className={`viz-circle__anchor viz-hue-${a.hue}${a.state ? ` viz-circle__anchor--${a.state}` : ""}${a.hot ? " viz-circle__anchor--hot" : ""}`}
              >
                {a.extra.map((at) => {
                  const e = polar(C, C, CIRCLE_R, at, size);
                  return <circle key={at} className="viz-circle__extra" cx={e.x} cy={e.y} r={4} />;
                })}
                <line
                  className="viz-circle__stem"
                  x1={ring.x}
                  y1={ring.y}
                  x2={mark.x}
                  y2={mark.y}
                />
                {a.hot && <circle className="viz-circle__hot" cx={mark.x} cy={mark.y} r={17} />}
                <circle className="viz-circle__marker" cx={mark.x} cy={mark.y} r={12} />
                <text
                  className="viz-circle__name"
                  x={mark.x}
                  y={mark.y}
                  textAnchor="middle"
                  dy="0.35em"
                >
                  {a.label}
                </text>
                <g transform={`translate(${badge.x - BAR_W / 2} ${badge.y - 10})`}>
                  <text className="viz-circle__count" x={BAR_W / 2} y={8} textAnchor="middle">
                    {a.count}
                  </text>
                  <rect
                    className="viz-circle__bar-track"
                    x={0}
                    y={14}
                    width={BAR_W}
                    height={5}
                    rx={2}
                  />
                  <rect
                    className="viz-circle__bar-fill"
                    x={0}
                    y={14}
                    width={BAR_W * fill}
                    height={5}
                    rx={2}
                  />
                  <line
                    className="viz-circle__ideal"
                    x1={BAR_W * tick}
                    x2={BAR_W * tick}
                    y1={11}
                    y2={22}
                  />
                </g>
              </g>
            );
          })}
          {model.points.map((p, i) => {
            const pos = polar(C, C, CIRCLE_R + (layers[i] ?? 0) * LAYER_STEP, p.at, size);
            const cls = [
              "viz-circle__point",
              `viz-hue-${p.hue}`,
              p.changed && "viz-circle__point--changed",
              p.pending && "viz-circle__point--pending",
              model.active === p.id && "viz-circle__point--active",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <g
                key={p.id}
                className={cls}
                style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
              >
                <circle r={p.heavy ? POINT_R + 4 : POINT_R} />
                <text textAnchor="middle" dy="0.35em">
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </FitBox>
    </div>
  );
}
