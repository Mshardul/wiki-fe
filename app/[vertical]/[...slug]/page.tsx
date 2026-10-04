import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/reader/ArticleView";
import { MentionedBy } from "@/components/reader/MentionedBy";
import { RelatedArticles } from "@/components/reader/RelatedArticles";
import { CANONICAL_BASE } from "@/lib/config";
import { getArticle, getArticleSlugs, getVertical } from "@/lib/content";

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
  const v = getVertical(vertical);
  return {
    title: v ? `${article.title} · ${v.title}` : article.title,
    description: article.excerpt || undefined,
    alternates: { canonical: `${CANONICAL_BASE}${path}` },
    robots: { index: false, follow: false },
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
    <ArticleView article={article} backHref={`/${vertical}/`}>
      <RelatedArticles vertical={vertical} slug={slug} />
      <MentionedBy articlePath={article.path} />
    </ArticleView>
  );
}
