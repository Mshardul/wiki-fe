"use client";

import type { VerticalIndex } from "@/lib/content/types";
import { BookmarksStrip } from "./BookmarksStrip";
import { IndexCardStatus } from "./IndexCardStatus";
import { IndexCardSwipe } from "./IndexCardSwipe";
import { KeyNav } from "./KeyNav";
import { LearningPathBars } from "./LearningPathBars";
import { PullToRefresh } from "./PullToRefresh";
import { RecentsStrip } from "./RecentsStrip";

interface IndexIslandsProps {
  wikiId: string;
  tracks: VerticalIndex["learningPaths"];
}

// Client wrapper composing the vertical-index interactivity. The RSC page renders the card grid;
// these enhance it and render the strips.
export function IndexIslands({ wikiId, tracks }: IndexIslandsProps) {
  return (
    <>
      <RecentsStrip wikiId={wikiId} />
      <BookmarksStrip wikiId={wikiId} />
      <LearningPathBars wikiId={wikiId} tracks={tracks} />
      <IndexCardStatus wikiId={wikiId} />
      <KeyNav />
      <IndexCardSwipe wikiId={wikiId} />
      <PullToRefresh />
    </>
  );
}
