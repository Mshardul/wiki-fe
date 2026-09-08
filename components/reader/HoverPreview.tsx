"use client";

import { useEffect } from "react";
import { loadDataJson } from "@/lib/storage/data-json";

const DELAY_MS = 400;

// Positions a preview card on internal-link hover, from the build-time previews.json.
// Ported from js/render/content-view.js hover-preview wiring.
export function HoverPreview() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".markdown-body");
    if (!root) return;

    const card = document.createElement("div");
    card.id = "hover-preview";
    card.className = "hover-preview hidden";
    document.body.appendChild(card);

    let previews: Record<string, { title: string; excerpt: string }> = {};
    void loadDataJson("previews").then((p) => {
      previews = p;
    });

    let showTimer: ReturnType<typeof setTimeout> | undefined;

    const position = (anchor: HTMLElement) => {
      const r = anchor.getBoundingClientRect();
      card.style.left = `${r.left + window.scrollX}px`;
      card.style.top = `${r.bottom + window.scrollY + 6}px`;
    };
    const hide = () => {
      clearTimeout(showTimer);
      card.classList.remove("visible");
      card.classList.add("hidden");
    };
    const show = (anchor: HTMLElement) => {
      const key = anchor.dataset.internalLink;
      const p = key ? previews[key] : undefined;
      if (!p) return;
      card.classList.remove("hidden");
      card.replaceChildren();
      const h = document.createElement("p");
      h.className = "hover-preview-title";
      h.textContent = p.title;
      const body = document.createElement("p");
      body.textContent = p.excerpt;
      card.append(h, body);
      position(anchor);
      requestAnimationFrame(() => card.classList.add("visible"));
    };

    const onOver = (e: Event) => {
      const link = (e.target as HTMLElement).closest<HTMLElement>("a[data-internal-link]");
      if (!link || !root.contains(link)) return;
      clearTimeout(showTimer);
      showTimer = setTimeout(() => show(link), DELAY_MS);
    };
    const onOut = (e: Event) => {
      const link = (e.target as HTMLElement).closest<HTMLElement>("a[data-internal-link]");
      if (link) hide();
    };
    root.addEventListener("mouseover", onOver);
    root.addEventListener("mouseout", onOut);
    window.addEventListener("scroll", hide, { passive: true });

    return () => {
      clearTimeout(showTimer);
      root.removeEventListener("mouseover", onOver);
      root.removeEventListener("mouseout", onOut);
      window.removeEventListener("scroll", hide);
      card.remove();
    };
  }, []);

  return null;
}
