import Link from "next/link";

interface VizHeaderProps {
  title: string;
  subtitle: string;
  articleHref: string;
  onCopyLink: () => void;
}

export function VizHeader({ title, subtitle, articleHref, onCopyLink }: VizHeaderProps) {
  return (
    <header className="viz-head">
      <div className="viz-head__text">
        <h1 className="viz-head__title">{title}</h1>
        <p className="viz-head__sub">{subtitle}</p>
      </div>
      <div className="viz-head__actions">
        <div className="viz-choice viz-choice--segmented" role="group" aria-label="View">
          <button type="button" className="viz-choice__btn is-on" aria-pressed="true">
            Single
          </button>
          <button
            type="button"
            className="viz-choice__btn"
            aria-pressed="false"
            disabled
            title="Compare — coming soon"
          >
            Compare
          </button>
        </div>
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
