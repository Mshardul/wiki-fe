"use client";

import { useEffect, useState } from "react";
import { toggleCompletion } from "@/lib/reader/completion";
import { isCompleted, subscribeCompletions } from "@/lib/storage/completions";

interface CompleteButtonProps {
  wikiId: string;
  path: string;
}

export function CompleteButton({ wikiId, path }: CompleteButtonProps) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const sync = () => setDone(isCompleted(wikiId, path));
    sync();
    return subscribeCompletions(wikiId, sync);
  }, [wikiId, path]);

  return (
    <div className="complete-bar">
      <button
        type="button"
        className={`complete-btn${done ? " complete-btn--done" : ""}`}
        aria-pressed={done}
        onClick={() => toggleCompletion(wikiId, path)}
      >
        <span className="complete-btn-check" aria-hidden="true">
          {done ? "✓" : ""}
        </span>
        Mark as completed
      </button>
    </div>
  );
}
