"use client";

import { useEffect, useState } from "react";
import type { Heading } from "@/lib/content/types";
import { getString, setString } from "@/lib/storage/local";
import { restoreScrollPosition } from "@/lib/storage/scroll-collapse";

const DISMISS_KEY = (wikiId: string, articlePath: string) =>
  `wiki-resume-chip-dismissed-${wikiId}-${articlePath.replace(/\//g, "-")}`;

interface ResumeChipProps {
  wikiId: string;
  articlePath: string;
  headings: Heading[];
}

function nearestHeadingAbove(headings: Heading[], y: number): Heading | null {
  if (y <= 0) return null;
  let best: Heading | null = null;
  for (const h of headings) {
    const el = document.getElementById(h.id);
    if (!el) continue;
    const top = el.getBoundingClientRect().top + window.scrollY;
    if (top <= y + 1) best = h;
    else break;
  }
  return best;
}

export function ResumeChip({ wikiId, articlePath, headings }: ResumeChipProps) {
  const [heading, setHeading] = useState<Heading | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = restoreScrollPosition(wikiId, articlePath);
    if (saved <= 0) return;
    if (getString(DISMISS_KEY(wikiId, articlePath)) === "1") return;

    // Defer until the article body is painted so heading offsets are stable.
    let cancelled = false;
    let raf = 0;
    raf = requestAnimationFrame(() => {
      if (cancelled) return;
      const h = nearestHeadingAbove(headings, saved);
      if (h) {
        setHeading(h);
        setVisible(true);
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [wikiId, articlePath, headings]);

  const jump = () => {
    if (!heading) return;
    const el = document.getElementById(heading.id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      const url = new URL(location.href);
      url.searchParams.set("a", heading.id);
      history.replaceState(history.state, "", url.toString());
    }
  };

  const dismiss = () => {
    setString(DISMISS_KEY(wikiId, articlePath), "1");
    setVisible(false);
    setHeading(null);
  };

  if (!visible || !heading) return null;

  return (
    <div className="resume-chip" role="status" aria-live="polite" aria-label="Resume reading">
      <button
        type="button"
        className="resume-chip-jump"
        onClick={jump}
        aria-label={`Jump to ${heading.text}`}
      >
        <span className="resume-chip-label">Resume where you left off</span>
        <span className="resume-chip-heading">{heading.text}</span>
      </button>
      <button
        type="button"
        className="resume-chip-dismiss"
        onClick={dismiss}
        aria-label="Dismiss resume chip"
      >
        <svg className="icon" aria-hidden="true">
          <use href="#icon-x" />
        </svg>
      </button>
    </div>
  );
}
