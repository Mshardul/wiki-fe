"use client";

import { useEffect, useState } from "react";
import type { VerticalIndex } from "@/lib/content/types";
import { listCompletions, subscribeCompletions } from "@/lib/storage/completions";

interface LearningPathBarsProps {
  wikiId: string;
  tracks: VerticalIndex["learningPaths"];
}

// Per-track completion bar from local completions. Ported from js/render/learning-paths.js.
export function LearningPathBars({ wikiId, tracks }: LearningPathBarsProps) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    const refresh = () => setCompleted(new Set(listCompletions(wikiId)));
    refresh();
    return subscribeCompletions(wikiId, refresh);
  }, [wikiId]);

  if (!tracks.length) return null;

  return (
    <div className="learning-path-bars">
      {tracks.map((t) => {
        const rows = t.rows.filter((r) => r.slug != null);
        const done = rows.filter((r) =>
          completed.has(`content/${wikiId}/${(r.slug ?? []).join("/")}.md`),
        ).length;
        const pct = rows.length ? Math.round((done / rows.length) * 100) : 0;
        return (
          <div className="learning-path-bar" key={t.track}>
            <div className="learning-path-bar-head">
              <span className="learning-path-bar-track">{t.track}</span>
              <span className="learning-path-bar-count">
                {done}/{rows.length}
              </span>
            </div>
            <div className="learning-path-bar-track-rail">
              <div className="learning-path-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
