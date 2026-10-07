import type { Axis, HistogramModel } from "@/lib/visualizer/core/shapes";

const MIN_SCALE = 5;

interface HistogramShapeProps {
  model: HistogramModel;
  axis: Axis;
  subject: string;
}

export function HistogramShape({ model, axis, subject }: HistogramShapeProps) {
  const max = Math.max(MIN_SCALE, ...model.slots.map((s) => s?.count ?? 0));
  const keys = model.slots.flatMap((s) => (s ? [s.key] : []));
  return (
    <div
      className={`viz-hist viz-hist--${axis}`}
      role="img"
      aria-label={`${subject}: ${keys.join(", ")}`}
    >
      {model.slots.map((s, i) => {
        const pct = s ? `${(Math.min(s.count, max) / max) * 100}%` : "0%";
        const isNext = s !== null && s.key === model.next;
        const tone = s && s.key === model.active ? ` viz-hist__col--${model.tone ?? "new"}` : "";
        return (
          // Slot position is the bar's identity: a replaced key reuses its slot.
          <div key={i} className={`viz-hist__col${tone}${isNext ? " viz-hist__col--next" : ""}`}>
            {isNext && <span className="viz-hist__flag">next out</span>}
            <div className="viz-hist__track">
              <div
                className="viz-hist__bar"
                style={axis === "vertical" ? { height: pct } : { width: pct }}
              >
                <span className="viz-hist__count">{s ? `${s.count}×` : ""}</span>
              </div>
            </div>
            <span className="viz-hist__key">{s?.key ?? ""}</span>
          </div>
        );
      })}
    </div>
  );
}
