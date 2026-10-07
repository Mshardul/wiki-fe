"use client";

import { useEffect } from "react";
import { restoreScrollPosition, saveScrollPosition } from "@/lib/storage/scroll-collapse";

interface ScrollRestoreProps {
  wikiId: string;
  articlePath: string;
}

export function ScrollRestore({ wikiId, articlePath }: ScrollRestoreProps) {
  useEffect(() => {
    // ?a= deep links (AnchorScroll) take priority — don't fight them
    if (!new URL(location.href).searchParams.has("a")) {
      const y = restoreScrollPosition(wikiId, articlePath);
      if (y > 0) requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" }));
    }

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
