"use client";

import { useEffect } from "react";
import { recordOpened } from "@/lib/storage/read-tracking";
import { addToRecents } from "@/lib/storage/recents";

interface ReadTrackerProps {
  wikiId: string;
  path: string;
  title: string;
  slug: string[];
}

const DWELL_MS = 4000;

export function ReadTracker({ wikiId, path, title, slug }: ReadTrackerProps) {
  useEffect(() => {
    let done = false;
    const mark = () => {
      if (done) return;
      done = true;
      recordOpened(wikiId, path);
      addToRecents({ wikiId, path, title, slug });
    };
    const timer = setTimeout(mark, DWELL_MS);
    const onScroll = () => {
      if (window.scrollY > 400) mark();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [wikiId, path, title, slug]);

  return null;
}
