import { IconButton } from "../ui/IconButton";

interface RevisionFooterProps {
  legend: boolean;
  running: boolean;
  reduced: boolean;
  onToggle: () => void;
  onReset: () => void;
}

const LEGEND = [
  { style: "solid", label: "Synchronous" },
  { style: "dashed", label: "Asynchronous or background" },
  { style: "dotted", label: "Conditional or fallback" },
] as const;

export function RevisionFooter({
  legend,
  running,
  reduced,
  onToggle,
  onReset,
}: RevisionFooterProps) {
  return (
    <div className="viz-foot viz-rev__foot">
      {legend ? (
        <ul className="viz-legend" aria-label="Legend">
          {LEGEND.map((l) => (
            <li key={l.style} className="viz-legend__item">
              <svg className="viz-legend__swatch" width="28" height="8" aria-hidden="true">
                <line
                  x1="1"
                  x2="27"
                  y1="4"
                  y2="4"
                  className={`viz-legend__line viz-legend__line--${l.style}`}
                />
              </svg>
              <span>{l.label}</span>
            </li>
          ))}
          <li className="viz-legend__item">
            <span className="viz-legend__badge" aria-hidden="true">
              1
            </span>
            <span>Step order</span>
          </li>
        </ul>
      ) : (
        <span />
      )}
      <div className="viz-rev__controls">
        <button type="button" className="viz-btn" onClick={onReset}>
          Reset order
        </button>
        {!reduced && (
          <IconButton
            label={running ? "Pause loop" : "Play loop"}
            onClick={onToggle}
            variant="primary"
          >
            {running ? "⏸" : "▶"}
          </IconButton>
        )}
      </div>
    </div>
  );
}
