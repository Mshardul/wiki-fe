"use client";

import { useEffect } from "react";
import { isCompleted, subscribeCompletions } from "@/lib/storage/completions";

interface CardCompletionProps {
  wikiId: string;
}

// Marks server-rendered related / mentioned-by cards done from local completion state.
export function CardCompletion({ wikiId }: CardCompletionProps) {
  useEffect(() => {
    const apply = () => {
      for (const card of document.querySelectorAll<HTMLElement>(
        ".related-card[data-related-path], .backlink-spine .related-card[data-related-path]",
      )) {
        const done = isCompleted(wikiId, `content/${card.dataset.relatedPath}.md`);
        card.classList.toggle("related-card--done", done);
        card.querySelector(".chip-status")?.classList.toggle("chip-status--done", done);
      }
    };
    apply();
    return subscribeCompletions(wikiId, apply);
  }, [wikiId]);

  return null;
}
