import { toggleCompletion } from "./reader/completion";
import { toggleBookmark } from "./storage/bookmarks";
import { getSettings, updateSettings } from "./storage/settings";

function isTyping(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  return (
    node?.tagName === "INPUT" || node?.tagName === "TEXTAREA" || Boolean(node?.isContentEditable)
  );
}

interface HotkeyContext {
  isArticle: boolean;
  article?: { verticalId: string; path: string; title: string };
  anyModalOpen?: () => boolean;
  wikiSwitcherOpen?: () => boolean;
}

const SIZES: Array<"S" | "M" | "L"> = ["S", "M", "L"];

export function bindHotkeys(getContext: () => HotkeyContext): () => void {
  const onKey = (e: KeyboardEvent) => {
    const typing = isTyping(e.target);
    const mod = e.metaKey || e.ctrlKey;
    const ctx = getContext();

    if (mod && e.key.toLowerCase() === "k") {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("wiki:open-search"));
      return;
    }
    if (mod && e.key.toLowerCase() === "b") {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("wiki:open-bookmarks"));
      return;
    }
    if (!typing && e.key === "?") {
      e.preventDefault();
      document.dispatchEvent(
        new CustomEvent("wiki:open-settings", { detail: { tab: "keyboard" } }),
      );
      return;
    }
    if (!typing && e.key === ",") {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("wiki:open-settings", { detail: { tab: "general" } }));
      return;
    }
    if (!typing && (e.key === "w" || e.key === "W")) {
      // wiki-switcher toggles itself, so only block opening it on top of a *different* open modal.
      if (ctx.anyModalOpen?.() && !ctx.wikiSwitcherOpen?.()) return;
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("wiki:open-wiki-switcher"));
      return;
    }

    if (!ctx.isArticle || typing || mod) return;

    if (e.key === "b" || e.key === "B") {
      e.preventDefault();
      if (ctx.article) toggleBookmark(ctx.article.verticalId, ctx.article.path, ctx.article.title);
    } else if (e.key === "c" || e.key === "C") {
      // Stubs and index pages have no #markdown-body, so there is nothing to complete.
      if (ctx.article && document.getElementById("markdown-body")) {
        e.preventDefault();
        toggleCompletion(ctx.article.verticalId, ctx.article.path);
      }
    } else if (e.key === "/") {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("wiki:open-article-find"));
    } else if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("wiki:toggle-focus-mode"));
    } else if (e.key === "d" || e.key === "D") {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("wiki:toggle-distraction-free"));
    } else if (e.key === "t" || e.key === "T") {
      const first = document.querySelector<HTMLElement>("#toc-nav .toc-item");
      if (first) {
        e.preventDefault();
        first.focus();
      }
    } else if (e.key === "=" || e.key === "+") {
      const cur = getSettings().fontSize;
      const next = SIZES[Math.min(SIZES.indexOf(cur) + 1, 2)];
      if (next && next !== cur) {
        e.preventDefault();
        updateSettings({ fontSize: next });
      }
    } else if (e.key === "-") {
      const cur = getSettings().fontSize;
      const next = SIZES[Math.max(SIZES.indexOf(cur) - 1, 0)];
      if (next && next !== cur) {
        e.preventDefault();
        updateSettings({ fontSize: next });
      }
    }
  };

  document.addEventListener("keydown", onKey);
  return () => document.removeEventListener("keydown", onKey);
}
