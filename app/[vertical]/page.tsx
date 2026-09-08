import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IndexIslands } from "@/components/home/IndexIslands";
import { CANONICAL_BASE } from "@/lib/config";
import { getVertical, getVerticalIndex, getVerticals } from "@/lib/content";

export function generateStaticParams() {
  return getVerticals().map((v) => ({ vertical: v.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vertical: string }>;
}): Promise<Metadata> {
  const { vertical } = await params;
  const v = getVertical(vertical);
  if (!v) return {};
  return {
    title: v.title,
    description: v.description,
    alternates: { canonical: `${CANONICAL_BASE}/${v.id}/` },
  };
}

export default async function VerticalIndex({ params }: { params: Promise<{ vertical: string }> }) {
  const { vertical } = await params;
  const v = getVertical(vertical);
  if (!v) notFound();
  const index = await getVerticalIndex(vertical);
  return (
    <main className="index-main">
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="page-title">{v.title}</h1>
          <p className="page-subtitle">{v.description}</p>
        </div>
      </div>

      <IndexIslands wikiId={vertical} tracks={index.learningPaths} />

      <div className="index-sections">
        {index.sections.map((s) => (
          <section key={s.heading} className="index-section">
            <div className="section-header">
              <h2 className="section-title">{s.heading}</h2>
              <span className="section-count">{s.articles.length}</span>
            </div>
            <div className="index-card-grid">
              {s.articles.map((a) => {
                const articlePath = `content/${vertical}/${a.slug.join("/")}.md`;
                return (
                  <Link
                    key={a.path}
                    href={`/${vertical}/${a.slug.join("/")}/`}
                    className={a.isStub ? "index-card index-card--unavailable" : "index-card"}
                    data-article-path={articlePath}
                  >
                    <div className="index-card-header">
                      <span className="index-card-title">
                        {a.title}
                        <span className="index-card-read-dot" aria-hidden="true" />
                      </span>
                      <span className="index-card-arrow">→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
