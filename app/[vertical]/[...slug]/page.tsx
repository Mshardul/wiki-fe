import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
    <main className="content-layout">
      <div className="content-main">
        {/* article.html is build-time output from lib/content: git-authored markdown, no user input, no runtime sanitiser */}
        <article className="markdown-body" dangerouslySetInnerHTML={{ __html: article.html }} />
      </div>
    </main>
  );
}
