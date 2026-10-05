"use client";

import { useEffect } from "react";
import { getSettings, subscribeSettings } from "@/lib/storage/settings";

const EYE_OFF = '<svg class="icon" aria-hidden="true"><use href="#icon-eye-off"></use></svg>';
const EYE = '<svg class="icon" aria-hidden="true"><use href="#icon-eye"></use></svg>';

export function PracticeAnswerToggle() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".markdown-body");
    if (!root) return;

    const cleanups: Array<() => void> = [];
    const setters: Array<(hidden: boolean) => void> = [];
    let prefHidden = getSettings().practiceAnswersHidden;

    for (const answer of root.querySelectorAll<HTMLElement>(".problem-answer")) {
      const h3 = answer
        .closest(".subsection")
        ?.querySelector<HTMLElement>(".subsection-title > h3");
      if (!h3 || h3.querySelector(".practice-eye-btn")) continue;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "practice-eye-btn";
      btn.setAttribute("aria-label", "Toggle answer visibility");
      h3.appendChild(btn);

      const setHidden = (hidden: boolean) => {
        answer.hidden = hidden;
        btn.innerHTML = hidden ? EYE_OFF : EYE;
        btn.setAttribute("aria-pressed", String(!hidden));
      };
      const onClick = (e: MouseEvent) => {
        e.stopPropagation();
        setHidden(!answer.hidden);
      };
      setHidden(prefHidden);
      setters.push(setHidden);
      btn.addEventListener("click", onClick);
      cleanups.push(() => {
        btn.removeEventListener("click", onClick);
        btn.remove();
      });
    }

    // Only a change to this preference resyncs answers; other settings writes must not undo per-problem reveals.
    const unsubscribe = subscribeSettings(() => {
      const next = getSettings().practiceAnswersHidden;
      if (next === prefHidden) return;
      prefHidden = next;
      for (const set of setters) set(next);
    });
    cleanups.push(unsubscribe);

    return () => {
      for (const c of cleanups) c();
    };
  }, []);

  return null;
}
