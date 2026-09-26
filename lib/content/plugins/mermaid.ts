import type { Code, Html, Root } from "mdast";
import { visit } from "unist-util-visit";

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
