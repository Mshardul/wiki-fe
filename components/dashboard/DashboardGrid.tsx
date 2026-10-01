"use client";

import { useEffect, useState } from "react";
import { countCompleted, progressCounts } from "@/lib/dashboard/progress";
import { listCompletions, subscribeCompletions } from "@/lib/storage/completions";
import { ProgressBar } from "./ProgressBar";

export interface DashboardCardSpec {
  label: string;
  /** Article paths checked against this wiki's completions set. */
  paths: string[];
  wikiId: string;
  href?: string;
}

interface DashboardGridProps {
  cards: DashboardCardSpec[];
  emptyMessage?: string;
}

export function DashboardGrid({ cards, emptyMessage = "No content yet." }: DashboardGridProps) {
  const [byWiki, setByWiki] = useState<Record<string, Set<string>>>({});
  const cardsKey = cards.map((c) => `${c.wikiId}:${c.label}:${c.paths.length}`).join("|");

  useEffect(() => {
    const ids = [...new Set(cards.map((c) => c.wikiId))];
    const refresh = () => {
      const next: Record<string, Set<string>> = {};
      for (const id of ids) next[id] = new Set(listCompletions(id));
      setByWiki(next);
    };
    refresh();
    const unsubs = ids.map((id) => subscribeCompletions(id, refresh));
    return () => unsubs.forEach((u) => u());
  }, [cards, cardsKey]);

  if (!cards.length) {
    return <p className="dashboard-empty">{emptyMessage}</p>;
  }

  return (
    <div id="dashboard-cards" className="dashboard-cards">
      {cards.map((card) => {
        const completed = byWiki[card.wikiId] ?? new Set();
        const counts = progressCounts(countCompleted(card.paths, completed), card.paths.length);
        return (
          <ProgressBar
            key={`${card.wikiId}-${card.label}`}
            label={card.label}
            completed={counts.completed}
            total={counts.total}
            href={card.href}
          />
        );
      })}
    </div>
  );
}
