"use client";

import { useEffect } from "react";

function positionPopover(pop: HTMLElement, anchor: HTMLElement) {
  const rect = anchor.getBoundingClientRect();
  const gap = 8;
  pop.style.visibility = "hidden";
  pop.style.display = "block";
  const pw = pop.offsetWidth;
  const ph = pop.offsetHeight;
  pop.style.display = "";
  pop.style.visibility = "";

  let left = rect.left + window.scrollX;
  let top = rect.bottom + gap + window.scrollY;
  if (left + pw > window.innerWidth - 12) left = window.innerWidth - pw - 12;
  if (left < 8) left = 8;
  if (rect.bottom + gap + ph > window.innerHeight) top = rect.top - ph - gap + window.scrollY;
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}

// Hover/focus popover + click-to-expand for .glossary-term (emitted by rehypeGlossaryCaveatMarkers).
// Ported from js/content/glossary-caveats.js addGlossaryTerms + addInlineGlossaryExpand.
export function GlossaryPopover() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".markdown-body");
    if (!root) return;
    const terms = [...root.querySelectorAll<HTMLElement>(".glossary-term")];
    if (!terms.length) return;

    const pop = document.createElement("div");
    pop.className = "glossary-popover";
    pop.setAttribute("role", "tooltip");
    document.body.appendChild(pop);

    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const hideNow = () => {
      clearTimeout(hideTimer);
      pop.classList.remove("glossary-popover--visible");
    };
    const hide = () => {
      hideTimer = setTimeout(hideNow, 120);
    };
    const defOf = (t: HTMLElement) => t.nextElementSibling?.textContent ?? "";
    const show = (t: HTMLElement) => {
      if (t.getAttribute("aria-expanded") === "true") return;
      clearTimeout(hideTimer);
      pop.textContent = defOf(t);
      positionPopover(pop, t);
      pop.classList.add("glossary-popover--visible");
    };

    const toggle = (t: HTMLElement) => {
      const open = t.getAttribute("aria-expanded") === "true";
      t.setAttribute("aria-expanded", String(!open));
      const def = t.nextElementSibling;
      def?.setAttribute("aria-hidden", String(open));
      def?.classList.toggle("glossary-inline-def--open", !open);
      if (!open) hideNow();
    };

    const perTerm: Array<() => void> = [];
    for (const t of terms) {
      const onEnter = () => show(t);
      const onLeave = hide;
      const onClick = (e: Event) => {
        e.stopPropagation();
        toggle(t);
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle(t);
        }
      };
      t.addEventListener("mouseenter", onEnter);
      t.addEventListener("focus", onEnter);
      t.addEventListener("mouseleave", onLeave);
      t.addEventListener("blur", onLeave);
      t.addEventListener("click", onClick);
      t.addEventListener("keydown", onKey);
      perTerm.push(() => {
        t.removeEventListener("mouseenter", onEnter);
        t.removeEventListener("focus", onEnter);
        t.removeEventListener("mouseleave", onLeave);
        t.removeEventListener("blur", onLeave);
        t.removeEventListener("click", onClick);
        t.removeEventListener("keydown", onKey);
      });
    }

    const onDocClick = (e: MouseEvent) => {
      for (const t of terms) {
        if (t.getAttribute("aria-expanded") !== "true") continue;
        const def = t.nextElementSibling;
        if (!t.contains(e.target as Node) && !def?.contains(e.target as Node)) toggle(t);
      }
    };
    document.addEventListener("click", onDocClick, { passive: true });

    return () => {
      for (const c of perTerm) c();
      document.removeEventListener("click", onDocClick);
      pop.remove();
    };
  }, []);

  return null;
}
