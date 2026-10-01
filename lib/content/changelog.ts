import type { Manifest } from "./types";

const DATE_HEADING_RE = /^##\s+(\d{4}-\d{2}-\d{2})\s*$/;
const ENTRY_RE = /^-\s+(.+)$/;
const FILENAME_RE = /`([^`]+)`/g;

export interface ChangelogEntry {
  text: string;
  filenames: string[];
}

export interface ChangelogGroup {
  date: string;
  entries: ChangelogEntry[];
}

export interface FilenameHit {
  wikiId: string;
  /** Article slug segments under the vertical (for next/link href). */
  slug: string[];
  title: string;
  path: string;
}

export function parseChangelog(markdown: string): ChangelogGroup[] {
  const groups: ChangelogGroup[] = [];
  let current: ChangelogGroup | null = null;

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trimEnd();
    const dateMatch = line.match(DATE_HEADING_RE);
    if (dateMatch) {
      current = { date: dateMatch[1]!, entries: [] };
      groups.push(current);
      continue;
    }
    if (!current) continue;

    const entryMatch = line.match(ENTRY_RE);
    if (!entryMatch) continue;

    const text = entryMatch[1]!;
    const filenames = [...text.matchAll(FILENAME_RE)].map((m) => m[1]!);
    current.entries.push({ text, filenames });
  }

  return groups;
}

/** Basename → first matching article. Basenames are expected unique across the corpus. */
export function buildFilenameIndex(manifest: Manifest): Map<string, FilenameHit> {
  const index = new Map<string, FilenameHit>();
  for (const a of manifest.articles) {
    const basename = a.path.split("/").pop();
    if (!basename || index.has(basename)) continue;
    index.set(basename, {
      wikiId: a.verticalId,
      slug: a.slug,
      title: a.title,
      path: a.path,
    });
  }
  return index;
}

export function resolveFilename(
  filename: string,
  index: Map<string, FilenameHit>,
): FilenameHit | null {
  const basename = filename.split("/").pop() ?? filename;
  return index.get(basename) ?? null;
}
