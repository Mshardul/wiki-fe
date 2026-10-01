import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { type DashboardCardSpec, DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CANONICAL_BASE } from "@/lib/config";
import { getVerticalIndex } from "@/lib/content";
import { verticalRegistry } from "@/lib/content/verticals";
import { trackArticlePaths } from "@/lib/dashboard/progress";

interface Props {
  params: Promise<{ vertical: string }>;
}

export function generateStaticParams() {
  return verticalRegistry().map((v) => ({ vertical: v.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vertical } = await params;
  const v = verticalRegistry().find((x) => x.id === vertical);
  return {
    title: v ? `${v.title} · Dashboard` : "Dashboard",
    alternates: { canonical: `${CANONICAL_BASE}/dashboard/${vertical}/` },
    robots: { index: false, follow: false },
  };
}

export default async function DashboardWikiPage({ params }: Props) {
  const { vertical } = await params;
  const v = verticalRegistry().find((x) => x.id === vertical);
  if (!v) notFound();

  const index = await getVerticalIndex(vertical);
  const cards: DashboardCardSpec[] = index.sections
    .map((s) => {
      const paths = s.articles.map((a) => a.path);
      if (!paths.length) return null;
      return { label: s.heading, paths, wikiId: vertical };
    })
    .filter((c): c is DashboardCardSpec => c != null);

  const lpPaths = index.learningPaths.flatMap((t) => trackArticlePaths(vertical, t));
  if (lpPaths.length) {
    cards.push({
      label: "Learning Paths",
      paths: lpPaths,
      wikiId: vertical,
      href: `/dashboard/${vertical}/paths/`,
    });
  }

  return (
    <DashboardShell
      title={v.title}
      subtitle="Progress by section"
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Dashboard", href: "/dashboard/" },
        { label: v.title },
      ]}
    >
      <DashboardGrid cards={cards} />
    </DashboardShell>
  );
}
