"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { getRecentsSnapshot, type Recent, subscribeRecents } from "@/lib/storage/recents";

interface RecentsStripProps {
  wikiId: string;
}

// The "Recently visited" strip on a vertical index. Ported from js/storage/recents.js renderRecentsSection.
export function RecentsStrip({ wikiId }: RecentsStripProps) {
  const recents = useSyncExternalStore(subscribeRecents, getRecentsSnapshot, () => [] as Recent[]);
  const forWiki = recents.filter((r) => r.wikiId === wikiId);
  if (!forWiki.length) return null;

  return (
    <div id="recents-section" className="recents-section">
      <div className="recents-header">
        <span className="recents-label">Recently visited</span>
      </div>
      <div className="recents-strip">
        {forWiki.map((r) => (
          <Link key={r.path} href={`/${r.wikiId}/${r.slug.join("/")}/`} className="recent-chip">
            {r.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
