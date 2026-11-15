import { RUN_CELL_H, RUN_PAD, runsLayout } from "@/lib/visualizer/core/runs-layout";
import { type RunsModel } from "@/lib/visualizer/core/shapes";
import { FitBox } from "./FitBox";

const BRACE_DROP = 8;

export function RunsShape({ model, subject }: { model: RunsModel; subject: string }) {
  const layout = runsLayout(model);
  const top = RUN_PAD;
  const braceY = top + RUN_CELL_H + 6;
  const label = model.braces.map((b) => `${b.label} ${b.detail}, ${b.note}`).join("; ");
  return (
    <div className="viz-runs" role="img" aria-label={`${subject}: ${label}`}>
      <FitBox className="viz-runs__fit">
        <svg
          className="viz-runs__svg"
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          aria-hidden="true"
        >
          {model.braces.map((b, i) => {
            const at = layout.braces[i];
            if (!at) return null;
            const mid = at.x + at.w / 2;
            return (
              <g
                // Braces are positional: they follow the run they sit under.
                key={i}
                className={`viz-runs__brace viz-hue-${b.hue}${b.state ? ` viz-runs__brace--${b.state}` : ""}`}
              >
                {b.from > b.to && (
                  <rect
                    className="viz-runs__hole"
                    x={at.x}
                    y={top}
                    width={at.w}
                    height={RUN_CELL_H}
                    rx={5}
                  />
                )}
                <path d={`M ${at.x} ${braceY} v ${BRACE_DROP} h ${at.w} v -${BRACE_DROP}`} />
                <text
                  className="viz-runs__owner"
                  x={mid}
                  y={braceY + BRACE_DROP + 14}
                  textAnchor="middle"
                >
                  {b.label}
                </text>
                <text
                  className="viz-runs__range"
                  x={mid}
                  y={braceY + BRACE_DROP + 27}
                  textAnchor="middle"
                >
                  {b.detail}
                </text>
                <text
                  className="viz-runs__note"
                  x={mid}
                  y={braceY + BRACE_DROP + 40}
                  textAnchor="middle"
                >
                  {b.note}
                </text>
              </g>
            );
          })}
          {model.cells.map((c, i) => {
            const at = layout.cells[i];
            if (!at) return null;
            const cls = [
              "viz-runs__cell",
              `viz-hue-${c.hue}`,
              c.changed && "viz-runs__cell--changed",
              c.pending && "viz-runs__cell--pending",
              c.active && "viz-runs__cell--active",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <g key={c.id} className={cls} style={{ transform: `translate(${at.x}px, ${top}px)` }}>
                <rect width={at.w} height={RUN_CELL_H} rx={5} />
                <text x={at.w / 2} y={RUN_CELL_H / 2} textAnchor="middle" dy="0.35em">
                  {c.label}
                </text>
              </g>
            );
          })}
        </svg>
      </FitBox>
    </div>
  );
}
