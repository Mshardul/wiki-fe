"use client";

import { useEffect } from "react";

const LAST_LANG_KEY = "tabs-last-lang";

function langOf(pre: HTMLElement): string {
  const cls = pre.querySelector("code")?.className.match(/language-(\w+)/);
  return cls ? (cls[1] ?? "text") : "text";
}

// Builds a tab widget over the .tabbed-code wrapper emitted by remarkTabbedCode.
// Ported from js/content/formatting.js _buildTabWidget + addTabbedCodeBlocks.
export function TabbedCode() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".markdown-body");
    if (!root) return;

    const rebuilt: Array<{
      widget: HTMLElement;
      wrapper: HTMLElement;
      pres: HTMLElement[];
      onBarClick: (e: MouseEvent) => void;
      bar: HTMLElement;
    }> = [];

    for (const wrapper of root.querySelectorAll<HTMLElement>("div.tabbed-code[data-tabs-id]")) {
      const groupId = wrapper.dataset.tabsId ?? "";
      const title = wrapper.dataset.tabsTitle ?? null;
      const pres = [...wrapper.querySelectorAll<HTMLElement>("pre")];
      if (pres.length < 2) continue;

      const langs = pres.map(langOf);
      const counts = langs.reduce<Record<string, number>>((a, l) => {
        a[l] = (a[l] ?? 0) + 1;
        return a;
      }, {});
      const labels = langs.map((l, i) => ((counts[l] ?? 0) > 1 ? `${l}-${i + 1}` : l));

      let activeIdx = langs.indexOf(sessionStorage.getItem(LAST_LANG_KEY) ?? "");
      if (activeIdx === -1) activeIdx = 0;

      const widget = document.createElement("div");
      widget.className = "code-tabs";
      widget.dataset.tabsId = groupId;
      const header = document.createElement("div");
      header.className = "code-tabs-header";
      if (title) {
        const t = document.createElement("span");
        t.className = "code-tabs-title";
        t.textContent = title;
        header.appendChild(t);
      }
      const bar = document.createElement("div");
      bar.className = "code-tabs-bar";
      bar.setAttribute("role", "tablist");
      const panels = document.createElement("div");
      panels.className = "code-tabs-panels";

      pres.forEach((pre, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `code-tab${i === activeIdx ? " active" : ""}`;
        btn.setAttribute("role", "tab");
        btn.dataset.lang = langs[i];
        btn.dataset.panel = String(i);
        btn.textContent = labels[i] ?? langs[i] ?? "";
        bar.appendChild(btn);

        const panel = document.createElement("div");
        panel.className = `code-tab-panel${i === activeIdx ? " active" : ""}`;
        panel.dataset.panel = String(i);
        panel.hidden = i !== activeIdx;
        panel.appendChild(pre);
        panels.appendChild(panel);
      });

      header.appendChild(bar);
      widget.append(header, panels);

      // remember original order so an unmount (e.g. StrictMode) can rebuild the wrapper
      const orderedPres = pres.slice();
      const onBarClick = (e: MouseEvent) => {
        const btn = (e.target as HTMLElement).closest<HTMLElement>(".code-tab");
        if (!btn) return;
        const idx = Number.parseInt(btn.dataset.panel ?? "0", 10);
        for (const b of bar.querySelectorAll(".code-tab")) b.classList.remove("active");
        for (const p of panels.querySelectorAll<HTMLElement>(".code-tab-panel")) {
          p.classList.remove("active");
          p.hidden = true;
        }
        btn.classList.add("active");
        const active = panels.querySelector<HTMLElement>(`.code-tab-panel[data-panel="${idx}"]`);
        if (active) {
          active.classList.add("active");
          active.hidden = false;
        }
        if (btn.dataset.lang) sessionStorage.setItem(LAST_LANG_KEY, btn.dataset.lang);
      };
      bar.addEventListener("click", onBarClick);

      wrapper.replaceWith(widget);
      rebuilt.push({ widget, wrapper, pres: orderedPres, onBarClick, bar });
    }

    return () => {
      for (const { widget, wrapper, pres, onBarClick, bar } of rebuilt) {
        bar.removeEventListener("click", onBarClick);
        for (const pre of pres) {
          pre.hidden = false;
          wrapper.appendChild(pre);
        }
        widget.replaceWith(wrapper);
      }
    };
  }, []);

  return null;
}
