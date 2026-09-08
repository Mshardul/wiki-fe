import Link from "next/link";
import { getRelated } from "@/lib/content";
import type { RelatedRef } from "@/lib/content/types";

interface RelatedArticlesProps {
  vertical: string;
  slug: string[];
}

// Same-section "More in …" ranking. Server-rendered (no client state).
// Ported from js/render/related-articles.js renderRelatedArticles.
export function RelatedArticles({ vertical, slug }: RelatedArticlesProps) {
  const related: RelatedRef[] = getRelated(vertical, slug);
  if (!related.length) return null;

  return (
    <div id="related-articles" className="related-articles">
      <div className="related-header">
        <span className="related-label">Related</span>
      </div>
      <div className="related-grid">
        {related.map((r) => (
          <Link
            key={r.path}
            href={`/${vertical}/${r.slug.join("/")}/`}
            className="related-card"
            data-related-path={`${vertical}/${r.slug.join("/")}`}
          >
            <span className="chip-status" aria-hidden="true" />
            <span className="related-card-title">{r.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
