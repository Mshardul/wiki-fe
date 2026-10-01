"use client";

import { useEffect, useRef, useState } from "react";
import { isCollapsed, setCollapsed } from "@/lib/storage/collapse";
import { PREFIXES } from "@/lib/storage/keys";
import { Notes } from "@/lib/storage/notes";

interface NotesScratchpadProps {
  wikiId: string;
  articlePath: string;
}

const SAVE_DEBOUNCE_MS = 300;

export function NotesScratchpad({ wikiId, articlePath }: NotesScratchpadProps) {
  const collapseKey = `${PREFIXES.notesCollapsed}${wikiId}`;
  const [text, setText] = useState(() => Notes.get(wikiId, articlePath));
  const [collapsed, setCollapsedState] = useState(() => isCollapsed(collapseKey));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ wikiId: string; articlePath: string; text: string } | null>(null);

  useEffect(() => {
    // Flush pending save on unmount / hard navigation (pagehide). Soft nav remounts via key on ReaderIslands.
    const flush = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = null;
      if (pending.current) {
        Notes.set(pending.current.wikiId, pending.current.articlePath, pending.current.text);
        pending.current = null;
      }
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  function onInput(value: string): void {
    setText(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    pending.current = { wikiId, articlePath, text: value };
    saveTimer.current = setTimeout(() => {
      Notes.set(wikiId, articlePath, value);
      pending.current = null;
      saveTimer.current = null;
    }, SAVE_DEBOUNCE_MS);
  }

  function onToggle(): void {
    const next = !collapsed;
    setCollapsedState(next);
    setCollapsed(collapseKey, next);
  }

  return (
    <div className={`notes-scratchpad${collapsed ? " notes-scratchpad--collapsed" : ""}`}>
      <div className="notes-scratchpad-header">
        <span className="notes-scratchpad-label">Notes</span>
        <button
          type="button"
          id="notes-scratchpad-toggle"
          className="notes-scratchpad-toggle"
          aria-label={collapsed ? "Expand notes" : "Collapse notes"}
          onClick={onToggle}
        >
          <svg className="icon" aria-hidden="true">
            <use href="#icon-chevron-down" />
          </svg>
        </button>
      </div>
      <div className="notes-scratchpad-body">
        <textarea
          id="notes-scratchpad-input"
          className="notes-scratchpad-input"
          placeholder="Jot something down..."
          value={text}
          onChange={(e) => onInput(e.target.value)}
        />
      </div>
    </div>
  );
}
