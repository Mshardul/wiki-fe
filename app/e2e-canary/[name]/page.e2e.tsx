import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/reader/ArticleView";
import { canaryNames, getCanary } from "@/lib/content/canary";

// Test-only route: next.config only treats page.e2e.tsx as a page when the build sets WIKI_E2E=1.
export const dynamicParams = false;

export const metadata: Metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  return canaryNames().map((name) => ({ name }));
}

export default async function CanaryPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const article = await getCanary(name);
  if (!article) notFound();
  return <ArticleView article={article} backHref="/dsa/" />;
}
