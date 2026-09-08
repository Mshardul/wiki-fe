"use client";

import { useEffect } from "react";

const SELECTOR = ".topbar-icon-btn";
const SHOW_DELAY_MS = 300;

// Custom short-delay tooltip for topbar icon buttons; keeps the native `title` as an a11y / no-JS fallback.
// Ported from js/app/icon-tooltip.js.
export function IconTooltip() {
  useEffect(() => {
    const tip = document.createElement("div");
    tip.id = "icon-tooltip";
    tip.setAttribute("role", "tooltip");
    document.body.appendChild(tip);

    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let pending: HTMLElement | null = null;

    function position(btn: HTMLElement) {
      const r = btn.getBoundingClientRect();
      tip.style.left = `${r.left + r.width / 2}px`;
      tip.style.top = `${r.bottom + 6}px`;
    }

    function show(btn: HTMLElement, stripTitle = true) {
      const label = btn.dataset.tooltipLabel || btn.getAttribute("title");
      if (!label) return;
      btn.dataset.tooltipLabel = label;
      if (stripTitle) btn.removeAttribute("title");
      tip.textContent = label;
      position(btn);
      tip.classList.add("visible");
    }

    // Always restores the native title, even on a leave that never reached the show delay.
    function release(btn: HTMLElement | null) {
      clearTimeout(showTimer);
      tip.classList.remove("visible");
      if (btn?.dataset.tooltipLabel) {
        btn.setAttribute("title", btn.dataset.tooltipLabel);
        delete btn.dataset.tooltipLabel;
      }
      pending = null;
    }

    function arm(btn: HTMLElement | null, immediate: boolean) {
      if (!btn || btn === pending) return;
      const title = btn.getAttribute("title");
      if (title) btn.dataset.tooltipLabel = title;
      else if (!btn.dataset.tooltipLabel) return;
      pending = btn;
      clearTimeout(showTimer);
      if (immediate) show(btn, false);
      else showTimer = setTimeout(() => show(btn), SHOW_DELAY_MS);
    }

    const onOver = (e: Event) =>
      arm((e.target as HTMLElement).closest<HTMLElement>(SELECTOR), false);
    const onOut = (e: Event) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>(SELECTOR);
      if (!btn || btn.contains((e as MouseEvent).relatedTarget as Node)) return;
      release(btn);
    };
    const onClick = (e: Event) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>(SELECTOR);
      if (btn) release(btn);
    };
    const onFocusIn = (e: Event) =>
      arm((e.target as HTMLElement).closest<HTMLElement>(SELECTOR), true);
    const onFocusOut = (e: Event) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>(SELECTOR);
      if (btn) release(btn);
    };

    document.body.addEventListener("mouseover", onOver);
    document.body.addEventListener("mouseout", onOut);
    document.body.addEventListener("click", onClick, true);
    document.body.addEventListener("focusin", onFocusIn, true);
    document.body.addEventListener("focusout", onFocusOut, true);

    return () => {
      clearTimeout(showTimer);
      document.body.removeEventListener("mouseover", onOver);
      document.body.removeEventListener("mouseout", onOut);
      document.body.removeEventListener("click", onClick, true);
      document.body.removeEventListener("focusin", onFocusIn, true);
      document.body.removeEventListener("focusout", onFocusOut, true);
      tip.remove();
    };
  }, []);

  return null;
}
