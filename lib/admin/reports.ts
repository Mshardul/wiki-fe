import { getBacklinks } from "@/lib/content/backlinks";
import type { BrokenLinks } from "@/lib/content/broken-links";
import type { Manifest } from "@/lib/content/types";

export interface BrokenLinkRow {
  title: string;
  target: string;
  sourcePath: string;
}

export interface OrphanRow {
  title: string;
  path: string;
}

export interface SiteHealthReports {
  brokenLinks: BrokenLinkRow[];
  orphans: OrphanRow[];
}

/** Flatten broken-links.json `{ sourcePath: [{title,target}] }` → row list. */
export function flattenBrokenLinks(broken: BrokenLinks): BrokenLinkRow[] {
  return Object.entries(broken).flatMap(([sourcePath, links]) =>
    links.map((link) => ({ sourcePath, title: link.title, target: link.target })),
  );
}

/** Articles with no inbound backlinks (walk manifest, check getBacklinks). */
export function findOrphanPages(manifest: Manifest): OrphanRow[] {
  return manifest.articles
    .filter((a) => getBacklinks(a.path).length === 0)
    .map((a) => ({ title: a.title, path: a.path }));
}

export function assembleSiteHealth(broken: BrokenLinks, manifest: Manifest): SiteHealthReports {
  return {
    brokenLinks: flattenBrokenLinks(broken),
    orphans: findOrphanPages(manifest),
  };
}
