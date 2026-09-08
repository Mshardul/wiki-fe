"use client";

import { useEffect } from "react";

// Client-island render for pre.mermaid[data-mermaid-src] (spike fallback, mermaid-spike-result.md).
// Reads --diagram-* tokens for theme, renders on mount, re-renders on theme change — no build-time render.

function readThemeVariables(): Record<string, string> {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    background: v("--diagram-bg"),
    primaryColor: v("--diagram-node-fill"),
    primaryTextColor: v("--diagram-text"),
    primaryBorderColor: v("--diagram-node-stroke"),
    lineColor: v("--diagram-edge"),
    secondaryColor: v("--diagram-cluster-fill"),
    tertiaryColor: v("--diagram-cluster-stroke"),
    textColor: v("--diagram-text"),
  };
}

export function MermaidDiagrams() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".markdown-body");
    if (!root) return;
    const blocks = [...root.querySelectorAll<HTMLElement>("pre.mermaid[data-mermaid-src]")];
    if (!blocks.length) return;

    let cancelled = false;
    let mermaidMod: typeof import("mermaid").default | null = null;

    async function paint() {
      const mermaid = mermaidMod ?? (mermaidMod = (await import("mermaid")).default);
      if (cancelled) return;
      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        themeVariables: readThemeVariables(),
        securityLevel: "strict",
      });
      for (const pre of blocks) {
        pre.removeAttribute("data-processed");
        pre.textContent = pre.dataset.mermaidSrc ?? "";
      }
      try {
        await mermaid.run({ nodes: blocks });
      } catch {
        // per-block errors are handled by mermaid; leave the raw source visible
      }
    }

    void paint();

    const onThemeChange = () => {
      void paint();
    };
    document.addEventListener("wiki:theme-changed", onThemeChange);
    document.addEventListener("wiki:diagram-relayout", onThemeChange);

    return () => {
      cancelled = true;
      document.removeEventListener("wiki:theme-changed", onThemeChange);
      document.removeEventListener("wiki:diagram-relayout", onThemeChange);
    };
  }, []);

  return null;
}
