"use client";

import { useEffect } from "react";
import { writeToClipboard } from "@/lib/clipboard";
import { showToast } from "@/lib/toast";

const ICONS =
  '<svg class="icon copy-btn-icon-copy" aria-hidden="true"><use href="#icon-copy"></use></svg>' +
  '<svg class="icon copy-btn-icon-check" aria-hidden="true"><use href="#icon-check"></use></svg>';

// Wires the .copy-btn emitted by rehypeCodeHeader to copy the block's code.
// Ported from js/content/code-blocks.js addCodeBlockHeader copy half.
export function CodeCopy() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".markdown-body");
    if (!root) return;

    const cleanups: Array<() => void> = [];
    for (const btn of root.querySelectorAll<HTMLButtonElement>("pre .copy-btn")) {
      if (!btn.querySelector("svg")) btn.innerHTML = ICONS;
      const pre = btn.closest("pre");
      const onClick = () => {
        const text = pre?.querySelector("code")?.textContent ?? pre?.textContent ?? "";
        writeToClipboard(text)
          .then(() => {
            btn.classList.add("copied");
            setTimeout(() => btn.classList.remove("copied"), 2000);
          })
          .catch(() => showToast("Couldn't copy to clipboard", { variant: "error" }));
      };
      btn.addEventListener("click", onClick);
      cleanups.push(() => btn.removeEventListener("click", onClick));
    }

    return () => {
      for (const c of cleanups) c();
    };
  }, []);

  return null;
}
