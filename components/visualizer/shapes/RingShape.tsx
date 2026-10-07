import type { RingModel } from "@/lib/visualizer/core/shapes";

const C = 150;
const R = 100;
const SLOT_R = 32;

export function RingShape({ model, subject }: { model: RingModel; subject: string }) {
  const n = Math.max(1, model.slots.length);
  const at = (i: number) => {
    const a = ((i * 360) / n - 90) * (Math.PI / 180);
    return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) };
  };
  const keys = model.slots.flatMap((s) => (s ? [s.key] : []));
  return (
    <svg
      className="viz-ring"
      viewBox="0 0 300 300"
      role="img"
      aria-label={`${subject}: ${keys.join(", ")}`}
    >
      <circle className="viz-ring__track" cx={C} cy={C} r={R} />
      {model.slots.map((s, i) => {
        const p = at(i);
        const state =
          i === model.active
            ? ` viz-ring__slot--${model.tone ?? "new"}`
            : model.cleared.includes(i)
              ? " viz-ring__slot--cleared"
              : "";
        return (
          // Slot position is the identity on a ring.
          <g key={i}>
            <circle className={`viz-ring__slot${state}`} cx={p.x} cy={p.y} r={SLOT_R} />
            {s && (
              <>
                <text className="viz-ring__key" x={p.x} y={p.y + 7} textAnchor="middle">
                  {s.key}
                </text>
                <circle
                  className={`viz-ring__bit viz-ring__bit--${s.bit}`}
                  cx={p.x + 28}
                  cy={p.y - 24}
                  r={7}
                />
                <text className="viz-ring__bitval" x={p.x + 39} y={p.y - 20}>
                  {s.bit}
                </text>
              </>
            )}
          </g>
        );
      })}
      {/* Cumulative turns keep the hand spinning forward across full sweeps. */}
      <g className="viz-ring__hand" style={{ transform: `rotate(${(model.turns * 360) / n}deg)` }}>
        <line x1={C} y1={C} x2={C} y2={C - 58} />
      </g>
      <circle className="viz-ring__hub" cx={C} cy={C} r={7} />
    </svg>
  );
}
