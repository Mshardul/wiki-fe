import Link from "next/link";
import { getBacklinks } from "@/lib/content";

interface MentionedByProps {
  articlePath: string;
}

function slugFromPath(fromPath: string, verticalId: string): string {
  return fromPath
    .replace(/^\.?\//, "")
    .replace(new RegExp(`^content/${verticalId}/`), "")
    .replace(/\.md$/, "");
}

// The "Mentioned by" backlink spine — a text panel, not a graph (kept, spec §9). Server-rendered.
// Ported from js/render/related-articles.js renderBacklinks.
export function MentionedBy({ articlePath }: MentionedByProps) {
  const sources = getBacklinks(articlePath);
  if (!sources.length) return null;

  return (
    <div id="backlink-spine" className="backlink-spine">
      <div className="related-header">
        <span className="related-label">Mentioned by</span>
      </div>
      <div className="related-grid">
        {sources.map((s) => (
          <Link
            key={s.fromPath}
            href={`/${s.fromVerticalId}/${slugFromPath(s.fromPath, s.fromVerticalId)}/`}
            className="related-card"
            data-related-path={`${s.fromVerticalId}/${slugFromPath(s.fromPath, s.fromVerticalId)}`}
          >
            <span className="chip-status" aria-hidden="true" />
            <span className="related-card-title">{s.fromTitle}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
