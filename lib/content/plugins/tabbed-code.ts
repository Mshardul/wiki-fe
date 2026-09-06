import type { Code, Html, Root, RootContent } from "mdast";

// Faithful port of js/state.js tabsExtension + js/content/formatting.js
// addTabbedCodeBlocks: a <!-- tabs id="x" title="y" --> ... <!-- /tabs id="x" -->
// pair wraps its fenced blocks in a .tabbed-code container. The leading
// `# id="x"` / `// id="x"` marker line is stripped from each block. Tab switching
// is a cutover.md island — markup only here. A run with fewer than 2 blocks is
// left ungrouped (matches the pres.length < 2 guard).

const OPEN_RE = /^<!--\s*tabs\s+id="([^"]+)"(?:\s+title="([^"]*)")?\s*-->$/;
const CLOSE_RE = /^<!--\s*\/tabs\s+id="([^"]+)"\s*-->$/;
const MARKER_RE = /^(?:#|\/\/)\s*id="[^"]+"\n?/;

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export function remarkTabbedCode() {
  return (tree: Root): void => {
    const kids = tree.children;
    for (let i = 0; i < kids.length; i++) {
      const node = kids[i];
      const open = node?.type === "html" ? node.value.trim().match(OPEN_RE) : null;
      if (!open) continue;
      const id = open[1] ?? "";
      const title = open[2] ?? null;

      let close = -1;
      for (let j = i + 1; j < kids.length; j++) {
        const cand = kids[j];
        if (cand?.type === "html" && CLOSE_RE.test(cand.value.trim())) {
          close = j;
          break;
        }
      }
      if (close === -1) continue;

      const inner = kids.slice(i + 1, close);
      const codeBlocks = inner.filter((n): n is Code => n.type === "code");
      for (const block of codeBlocks) block.value = block.value.replace(MARKER_RE, "");

      if (codeBlocks.length < 2) {
        kids.splice(close, 1);
        kids.splice(i, 1);
        i -= 1;
        continue;
      }

      const openHtml: Html = {
        type: "html",
        value:
          `<div class="tabbed-code" data-tabs-id="${escapeAttr(id)}"` +
          (title ? ` data-tabs-title="${escapeAttr(title)}"` : "") +
          ">",
      };
      const closeHtml: Html = { type: "html", value: "</div>" };
      const replacement: RootContent[] = [openHtml, ...inner, closeHtml];
      kids.splice(i, close - i + 1, ...replacement);
      i += replacement.length - 1;
    }
  };
}
