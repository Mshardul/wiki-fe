import { readFileSync } from "node:fs";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ChangelogFilter,
  type ChangelogGroupView,
  type EntryPart,
} from "@/components/changelog/ChangelogFilter";
import { Topbar } from "@/components/chrome/Topbar";
import { CANONICAL_BASE } from "@/lib/config";
import { buildFilenameIndex, parseChangelog, resolveFilename } from "@/lib/content/changelog";
import { getManifest } from "@/lib/content/manifest";

export const metadata: Metadata = {
  title: "Changelog",
  alternates: { canonical: `${CANONICAL_BASE}/changelog/` },
  robots: { index: false, follow: false },
};

function splitEntryParts(
  text: string,
  filenames: string[],
  index: ReturnType<typeof buildFilenameIndex>,
): EntryPart[] {
  if (!filenames.length) return [{ type: "text", value: text }];

  const parts: EntryPart[] = [];
  let cursor = 0;
  const re = /`([^`]+)`/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > cursor) {
      parts.push({ type: "text", value: text.slice(cursor, match.index) });
    }
    const filename = match[1]!;
    const hit = resolveFilename(filename, index);
    if (hit) {
      parts.push({
        type: "link",
        filename,
        href: `/${hit.wikiId}/${hit.slug.join("/")}/`,
      });
    } else {
      parts.push({ type: "code", filename });
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parts.push({ type: "text", value: text.slice(cursor) });
  return parts;
}

export default async function ChangelogPage() {
  const markdown = readFileSync("content/CHANGELOG.md", "utf8");
  const groups = parseChangelog(markdown);
  const index = buildFilenameIndex(await getManifest());

  const viewGroups: ChangelogGroupView[] = groups.map((g) => ({
    date: g.date,
    entries: g.entries.map((e) => ({
      text: e.text,
      filenames: e.filenames,
      parts: splitEntryParts(e.text, e.filenames, index),
    })),
  }));

  return (
    <>
      <Topbar
        variant="content"
        back={
          <Link className="back-btn" href="/">
            <svg className="icon" aria-hidden="true">
              <use href="#icon-chevron-left" />
            </svg>
            <span className="back-btn-label">Home</span>
          </Link>
        }
        breadcrumb={
          <nav className="breadcrumb" aria-label="Breadcrumb" id="changelog-breadcrumb">
            <Link href="/">Home</Link>
            <span className="breadcrumb-sep" aria-hidden="true">
              /
            </span>
            <span>Changelog</span>
          </nav>
        }
      />
      <main className="changelog-main" id="view-changelog">
        <h1 className="visually-hidden">Changelog</h1>
        <ChangelogFilter groups={viewGroups} />
      </main>
    </>
  );
}
