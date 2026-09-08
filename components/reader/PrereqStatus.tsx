"use client";

import { useEffect } from "react";
import { isCompleted, subscribeCompletions } from "@/lib/storage/completions";

interface PrereqStatusProps {
  wikiId: string;
}

// Marks .prereq-chip elements (emitted by rehypePrerequisites) done from local completion state.
// Ported from js/content/formatting.js renderPrerequisites completion half.
export function PrereqStatus({ wikiId }: PrereqStatusProps) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".markdown-body");
    if (!root) return;

    const apply = () => {
      for (const chip of root.querySelectorAll<HTMLElement>(".prereq-chip[data-prereq-path]")) {
        const done = isCompleted(wikiId, chip.dataset.prereqPath ?? "");
        chip.classList.toggle("prereq-chip--done", done);
        chip.querySelector(".chip-status")?.classList.toggle("chip-status--done", done);
      }
    };
    apply();
    return subscribeCompletions(wikiId, apply);
  }, [wikiId]);

  return null;
}
