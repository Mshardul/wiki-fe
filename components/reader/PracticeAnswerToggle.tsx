"use client";

import { useEffect } from "react";

const EYE_OFF = '<svg class="icon" aria-hidden="true"><use href="#icon-eye-off"></use></svg>';
const EYE = '<svg class="icon" aria-hidden="true"><use href="#icon-eye"></use></svg>';

// Adds an eye toggle to each .problem-answer (emitted by rehypePracticeAnswer).
// Ported from js/content/practice-toggle.js _wireProblem / _setAnswerHidden.
export function PracticeAnswerToggle() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".markdown-body");
    if (!root) return;

    const cleanups: Array<() => void> = [];

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

      const render = () => {
        btn.innerHTML = answer.hidden ? EYE_OFF : EYE;
        btn.setAttribute("aria-pressed", String(!answer.hidden));
      };
      const onClick = (e: MouseEvent) => {
        e.stopPropagation();
        answer.hidden = !answer.hidden;
        render();
      };
      answer.hidden = true;
      render();
      btn.addEventListener("click", onClick);
      cleanups.push(() => {
        btn.removeEventListener("click", onClick);
        btn.remove();
      });
    }

    return () => {
      for (const c of cleanups) c();
    };
  }, []);

  return null;
}
