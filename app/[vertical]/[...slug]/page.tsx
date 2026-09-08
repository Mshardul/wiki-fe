import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReaderTopbar } from "@/components/chrome/ReaderTopbar";
import { MentionedBy } from "@/components/reader/MentionedBy";
import { ReaderIslands } from "@/components/reader/ReaderIslands";
import { RelatedArticles } from "@/components/reader/RelatedArticles";
import { CANONICAL_BASE } from "@/lib/config";
import { getArticle, getArticleSlugs } from "@/lib/content";

export function generateStaticParams() {
  return getArticleSlugs();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vertical: string; slug: string[] }>;
}): Promise<Metadata> {
  const { vertical, slug } = await params;
  const article = await getArticle(vertical, slug);
  if (!article) return {};
  const path = `/${vertical}/${slug.join("/")}/`;
  return {
    title: article.title,
    description: article.excerpt || undefined,
    alternates: { canonical: `${CANONICAL_BASE}${path}` },
  };
}

export default async function Article({
  params,
}: {
  params: Promise<{ vertical: string; slug: string[] }>;
}) {
  const { vertical, slug } = await params;
  const article = await getArticle(vertical, slug);
  if (!article) notFound();

  return (
    <>
      <ReaderTopbar leafTitle={article.title} backHref={`/${vertical}/`} />
      <main className="content-layout">
        <div className="content-main">
          <div className="article-hero">
            {!article.isStub && (
              <span className="read-time-badge">{article.readingTimeMin} min read</span>
            )}
          </div>

          {article.isStub ? (
            <div className="content-stub">
              <div className="content-stub-icon">✦</div>
              <h1 className="content-stub-title">{article.title}</h1>
              <p className="content-stub-msg">This article hasn&apos;t been written yet.</p>
            </div>
          ) : (
            // article.html is build-time output from lib/content: git-authored markdown, no user input, no runtime sanitiser
            <article
              id="markdown-body"
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: article.html }}
            />
          )}

          <RelatedArticles vertical={vertical} slug={slug} />
          <MentionedBy articlePath={article.path} />
        </div>

        <ReaderIslands
          article={{
            headings: article.headings,
            verticalId: article.verticalId,
            slug: article.slug,
            path: article.path,
            title: article.title,
            isStub: article.isStub,
          }}
        />
      </main>
    </>
  );
}
