import { STAMPEDE_LEGEND } from "@/lib/visualizer/cache-stampede/diagram";
import type { CacheStampedeModel } from "@/lib/visualizer/core/shapes";
import { mechanismClockLabel } from "@/lib/visualizer/mechanism/clock-label";
import { TrustedScenarioHtml } from "@/lib/visualizer/mechanism/trusted-scenario-html";

export function CacheStampedeShape({ model }: { model: CacheStampedeModel; subject: string }) {
  const legend = STAMPEDE_LEGEND[model.view];
  return (
    <div className="viz-stampede" role="img" aria-label="Cache stampede timeline">
      <div className="viz-stampede__meta">
        <span className="viz-stampede__clock">{mechanismClockLabel(model.clock)}</span>
        {model.badge ? (
          <span
            className={`viz-stampede__badge${model.badgeBad ? " viz-stampede__badge--bad" : ""}`}
          >
            {model.badge}
          </span>
        ) : null}
      </div>
      {model.term ? <pre className="viz-stampede__term">{model.term}</pre> : null}
      <TrustedScenarioHtml className="viz-stampede__tlwrap" html={model.diagramSvg} />
      <TrustedScenarioHtml className="viz-stampede__sum" html={model.summaryHtml} />
      <ul className="viz-stampede__legend">
        {legend.map((row) => (
          <li key={row.label}>
            <span
              className="viz-stampede__sw"
              style={{
                background: row.swatch,
                border: row.stroke ? `1.5px solid ${row.stroke}` : undefined,
              }}
            />
            {row.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
