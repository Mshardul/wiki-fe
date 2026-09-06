import type { Element, Root, Text } from "hast";
import { visit } from "unist-util-visit";
import type { RenderContext } from "../types";

// Faithful port of the markup half of js/content/glossary-caveats.js: [?text]
// inline becomes a .caveat-marker with a hidden .caveat-body; an <abbr> whose
// text matches a glossary key becomes an expandable .glossary-term with a hidden
// .glossary-inline-def. Popover positioning and reveal handlers are cutover.md
// islands — this emits markup + ARIA state only.

const CAVEAT_RE = /\[\\?\?([^\]]+)\]/g;
const SKIP_TAGS = new Set(["code", "pre", "script", "style"]);

function caveatMarker(body: string): Element {
  return {
    type: "element",
    tagName: "span",
    properties: {
      className: ["caveat-marker"],
      role: "button",
      tabindex: "0",
      "aria-expanded": "false",
    },
    children: [
      {
        type: "element",
        tagName: "span",
        properties: { className: ["caveat-body"], "aria-hidden": "true" },
        children: [{ type: "text", value: body }],
      },
    ],
  };
}

export function rehypeGlossaryCaveatMarkers(ctx: RenderContext) {
  const glossary = Object.fromEntries(
    Object.entries(ctx.glossary).map(([k, v]) => [k.toLowerCase(), v]),
  );

  return (tree: Root): void => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (
        !parent ||
        typeof index !== "number" ||
        (parent.type === "element" && SKIP_TAGS.has(parent.tagName)) ||
        !CAVEAT_RE.test(node.value)
      ) {
        return;
      }
      CAVEAT_RE.lastIndex = 0;
      const out: (Text | Element)[] = [];
      let last = 0;
      let m: RegExpExecArray | null = CAVEAT_RE.exec(node.value);
      while (m !== null) {
        if (m.index > last) out.push({ type: "text", value: node.value.slice(last, m.index) });
        out.push(caveatMarker(m[1] ?? ""));
        last = m.index + m[0].length;
        m = CAVEAT_RE.exec(node.value);
      }
      if (last < node.value.length) out.push({ type: "text", value: node.value.slice(last) });
      parent.children.splice(index, 1, ...out);
      return index + out.length;
    });

    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "abbr" || !parent || typeof index !== "number") return;
      const label = node.children
        .map((c) => (c.type === "text" ? c.value : ""))
        .join("")
        .trim()
        .toLowerCase();
      const def = glossary[label];
      if (!def) return;
      node.properties = node.properties ?? {};
      const cn = node.properties.className;
      node.properties.className = Array.isArray(cn)
        ? [...cn, "glossary-term", "glossary-term--expandable"]
        : ["glossary-term", "glossary-term--expandable"];
      node.properties.role = "button";
      node.properties.tabindex = "0";
      node.properties["aria-expanded"] = "false";
      const inlineDef: Element = {
        type: "element",
        tagName: "span",
        properties: { className: ["glossary-inline-def"], "aria-hidden": "true" },
        children: [{ type: "text", value: def }],
      };
      parent.children.splice(index + 1, 0, inlineDef);
      return index + 2;
    });
  };
}
