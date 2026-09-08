"use client";

import { useEffect } from "react";
import { isCompleted, subscribeCompletions } from "@/lib/storage/completions";
import { daysSinceRead, fadeFactorForDaysSinceRead } from "@/lib/storage/read-tracking";

interface IndexCardStatusProps {
  wikiId: string;
}

// Marks index cards read/faded from local state. Ported from js/render/home-index.js completion + _applyFade.
export function IndexCardStatus({ wikiId }: IndexCardStatusProps) {
  useEffect(() => {
    const apply = () => {
      for (const card of document.querySelectorAll<HTMLElement>(".index-card[data-article-path]")) {
        const path = card.dataset.articlePath ?? "";
        const done = isCompleted(wikiId, path);
        card.classList.toggle("index-card--completed", done);
        card.querySelector(".index-card-read-dot")?.classList.toggle("visible", done);
        card.style.setProperty(
          "--fade",
          done ? String(fadeFactorForDaysSinceRead(daysSinceRead(wikiId, path))) : "1",
        );
      }
    };
    apply();
    return subscribeCompletions(wikiId, apply);
  }, [wikiId]);

  return null;
}
