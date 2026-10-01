import type { VerticalIndex } from "@/lib/content/types";

export interface ProgressCounts {
  completed: number;
  total: number;
  pct: number;
}

export function progressCounts(completedCount: number, total: number): ProgressCounts {
  const pct = total ? Math.round((completedCount / total) * 100) : 0;
  return { completed: completedCount, total, pct };
}

export function countCompleted(paths: string[], completed: ReadonlySet<string>): number {
  return paths.filter((p) => completed.has(p)).length;
}

/** Article paths for a learning-path track (resolvable rows only). */
export function trackArticlePaths(
  wikiId: string,
  track: VerticalIndex["learningPaths"][number],
): string[] {
  return track.rows
    .filter((r): r is { title: string; slug: string[] } => r.slug != null)
    .map((r) => `content/${wikiId}/${r.slug.join("/")}.md`);
}

export function assembleWikiOverview(
  index: VerticalIndex,
  completed: ReadonlySet<string>,
): ProgressCounts {
  const paths = index.sections.flatMap((s) => s.articles.map((a) => a.path));
  return progressCounts(countCompleted(paths, completed), paths.length);
}

export type SectionBar = { label: string; counts: ProgressCounts; href?: string };

export function assembleSectionBars(
  index: VerticalIndex,
  wikiId: string,
  completed: ReadonlySet<string>,
): SectionBar[] {
  const bars: SectionBar[] = index.sections
    .map((s) => {
      const paths = s.articles.map((a) => a.path);
      if (!paths.length) return null;
      return {
        label: s.heading,
        counts: progressCounts(countCompleted(paths, completed), paths.length),
      };
    })
    .filter((b): b is NonNullable<typeof b> => b != null);

  const lpPaths = index.learningPaths.flatMap((t) => trackArticlePaths(wikiId, t));
  if (lpPaths.length) {
    bars.push({
      label: "Learning Paths",
      counts: progressCounts(countCompleted(lpPaths, completed), lpPaths.length),
      href: `/dashboard/${wikiId}/paths/`,
    });
  }

  return bars;
}

export function assemblePathBars(
  index: VerticalIndex,
  wikiId: string,
  completed: ReadonlySet<string>,
): { label: string; counts: ProgressCounts }[] {
  return index.learningPaths
    .map((t) => {
      const paths = trackArticlePaths(wikiId, t);
      if (!paths.length) return null;
      return {
        label: t.track,
        counts: progressCounts(countCompleted(paths, completed), paths.length),
      };
    })
    .filter((b): b is NonNullable<typeof b> => b != null);
}
