"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { type Bookmark, getBookmarksSnapshot, subscribeBookmarks } from "@/lib/storage/bookmarks";

interface BookmarksStripProps {
  wikiId: string;
}

// The "Bookmarked" strip on a vertical index. Ported from js/storage/bookmarks.js renderBookmarksSection.
export function BookmarksStrip({ wikiId }: BookmarksStripProps) {
  const bookmarks = useSyncExternalStore(
    subscribeBookmarks,
    getBookmarksSnapshot,
    () => [] as Bookmark[],
  );
  const forWiki = bookmarks.filter((b) => b.wikiId === wikiId);
  if (!forWiki.length) return null;

  return (
    <div id="bookmarks-section" className="recents-section">
      <div className="recents-header">
        <span className="recents-label">Bookmarked</span>
      </div>
      <div className="recents-strip">
        {forWiki.map((b) => (
          <Link key={b.path} href={`/${b.wikiId}/${b.slug}/`} className="recent-chip">
            {b.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
