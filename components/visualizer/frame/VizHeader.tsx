import Link from "next/link";
import type { ViewMode } from "@/lib/visualizer/core/url-state";

interface VizHeaderProps {
  title: string;
  subtitle: string;
  articleHref: string;
  onCopyLink: () => void;
  view?: { value: ViewMode; onChange: (v: ViewMode) => void };
}

export function VizHeader({ title, subtitle, articleHref, onCopyLink, view }: VizHeaderProps) {
  return (
    <header className="viz-head">
      <div className="viz-head__text">
        <h1 className="viz-head__title">{title}</h1>
        <p className="viz-head__sub">{subtitle}</p>
      </div>
      <div className="viz-head__actions">
        {view && (
          <div className="viz-choice viz-choice--segmented" role="group" aria-label="View">
            <button
              type="button"
              className={`viz-choice__btn${view.value === "single" ? " is-on" : ""}`}
              aria-pressed={view.value === "single"}
              onClick={() => view.onChange("single")}
            >
              Single
            </button>
            <button
              type="button"
              className={`viz-choice__btn${view.value === "revision" ? " is-on" : ""}`}
              aria-pressed={view.value === "revision"}
              onClick={() => view.onChange("revision")}
            >
              Revision
            </button>
          </div>
        )}
        <Link className="viz-btn" href={articleHref}>
          <span aria-hidden="true">↗ </span>Read article
        </Link>
        <button type="button" className="viz-btn" onClick={onCopyLink}>
          <span aria-hidden="true">⧉ </span>Copy link
        </button>
      </div>
    </header>
  );
}
