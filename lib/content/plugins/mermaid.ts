import type { Code, Html, Root } from "mdast";
import { visit } from "unist-util-visit";

// Spike-fallback path (mermaid-spike-result.md): a ```mermaid fence becomes a
// <pre class="mermaid" data-mermaid-src="..."> with the raw source in both the
// attribute and the body. No build-time render — MermaidDiagrams.tsx (cutover.md)
// runs mermaid.run() on mount and re-runs on theme change.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function remarkMermaid() {
  return (tree: Root): void => {
    visit(tree, "code", (node: Code, index, parent) => {
      if (node.lang !== "mermaid" || !parent || typeof index !== "number") return;
      const src = escapeHtml(node.value);
      const html: Html = {
        type: "html",
        value: `<pre class="mermaid" data-mermaid-src="${src}">${src}</pre>`,
      };
      parent.children.splice(index, 1, html);
    });
  };
}
