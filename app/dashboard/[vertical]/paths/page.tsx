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
    title: v ? `Learning Paths · ${v.title}` : "Learning Paths",
    alternates: { canonical: `${CANONICAL_BASE}/dashboard/${vertical}/paths/` },
    robots: { index: false, follow: false },
  };
}

export default async function DashboardPathsPage({ params }: Props) {
  const { vertical } = await params;
  const v = verticalRegistry().find((x) => x.id === vertical);
  if (!v) notFound();

  const index = await getVerticalIndex(vertical);
  const cards: DashboardCardSpec[] = index.learningPaths
    .map((t) => {
      const paths = trackArticlePaths(vertical, t);
      if (!paths.length) return null;
      return { label: t.track, paths, wikiId: vertical };
    })
    .filter((c): c is DashboardCardSpec => c != null);

  return (
    <DashboardShell
      title="Learning Paths"
      subtitle={`${v.title} progress by path`}
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Dashboard", href: "/dashboard/" },
        { label: v.title, href: `/dashboard/${vertical}/` },
        { label: "Learning Paths" },
      ]}
    >
      <DashboardGrid cards={cards} emptyMessage="No learning paths yet." />
    </DashboardShell>
  );
}
