"use client";

import { useEffect } from "react";
import { saveScrollPosition } from "@/lib/storage/scroll-collapse";

interface ScrollRestoreProps {
  wikiId: string;
  articlePath: string;
}

export function ScrollRestore({ wikiId, articlePath }: ScrollRestoreProps) {
  useEffect(() => {
    // No silent auto-scroll: the saved offset is surfaced by ResumeChip so the user chooses to jump.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => saveScrollPosition(wikiId, articlePath, window.scrollY), 250);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      saveScrollPosition(wikiId, articlePath, window.scrollY);
    };
  }, [wikiId, articlePath]);

  return null;
}
