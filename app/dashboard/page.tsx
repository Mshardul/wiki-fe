import type { Metadata } from "next";
import { type DashboardCardSpec, DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CANONICAL_BASE } from "@/lib/config";
import { getVerticalIndex } from "@/lib/content";
import { verticalRegistry } from "@/lib/content/verticals";

export const metadata: Metadata = {
  title: "Dashboard",
  alternates: { canonical: `${CANONICAL_BASE}/dashboard/` },
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const cards: DashboardCardSpec[] = [];
  for (const v of verticalRegistry()) {
    const index = await getVerticalIndex(v.id);
    const paths = index.sections.flatMap((s) => s.articles.map((a) => a.path));
    if (!paths.length) continue;
    cards.push({
      label: v.title,
      paths,
      wikiId: v.id,
      href: `/dashboard/${v.id}/`,
    });
  }

  return (
    <DashboardShell
      title="Dashboard"
      subtitle="Your progress across each vertical"
      crumbs={[{ label: "Home", href: "/" }, { label: "Dashboard" }]}
    >
      <DashboardGrid cards={cards} />
    </DashboardShell>
  );
}
