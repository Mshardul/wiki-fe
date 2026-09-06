import type { Element, ElementContent, Properties, Root } from "hast";
import { visit } from "unist-util-visit";
import type { RenderContext } from "../types";

// Faithful port of the markup half of js/content/code-blocks.js: each <pre> gets a
// .code-header (traffic lights, language label, copy-button placeholder), a
// data-code-origin string, and — for 3+ line blocks — .code-line spans plus a
// has-line-numbers class. Copy-to-clipboard wiring is a cutover.md island.
// Runs AFTER Shiki (addLanguageClass:true), which emits `class` as a plain string.

function classList(props: Properties | undefined): string[] {
  const c = props?.className ?? props?.class;
  if (Array.isArray(c)) return c.map(String);
  if (typeof c === "string") return c.split(/\s+/).filter(Boolean);
  return [];
}

function setClasses(node: Element, classes: string[]): void {
  node.properties = node.properties ?? {};
  delete node.properties.class;
  node.properties.className = classes;
}

function firstCode(pre: Element): Element | undefined {
  return pre.children.find((c): c is Element => c.type === "element" && c.tagName === "code");
}

function isMermaid(pre: Element): boolean {
  return classList(pre.properties).includes("mermaid");
}

function langOf(code: Element): string | null {
  for (const c of classList(code.properties)) {
    const m = c.match(/^language-(\w+)/);
    if (m) return m[1] ?? null;
  }
  return null;
}

function originString(ctx: RenderContext): string {
  const title = ctx.articleTitle;
  if (!title) return "wiki";
  return ctx.verticalTitle ? `${title} · ${ctx.verticalTitle} wiki` : `${title} · wiki`;
}

function trafficLights(): Element {
  return {
    type: "element",
    tagName: "div",
    properties: { className: ["code-traffic-lights"], "aria-hidden": "true" },
    children: ["tl-red", "tl-yellow", "tl-green"].map((cls) => ({
      type: "element" as const,
      tagName: "span",
      properties: { className: ["tl", cls] },
      children: [],
    })),
  };
}

function copyButton(): Element {
  return {
    type: "element",
    tagName: "button",
    properties: {
      className: ["copy-btn"],
      type: "button",
      title: "Copy code",
      "aria-label": "Copy code",
      "data-copy-target": "",
    },
    children: [],
  };
}

function wrapLines(code: Element): boolean {
  const lineNodes = code.children.filter(
    (c): c is Element =>
      c.type === "element" && c.tagName === "span" && classList(c.properties).includes("line"),
  );
  if (lineNodes.length < 3) return false;
  for (const line of lineNodes) {
    const classes = classList(line.properties);
    if (!classes.includes("code-line")) classes.push("code-line");
    setClasses(line, classes);
  }
  return true;
}

export function rehypeCodeHeader(ctx: RenderContext) {
  const origin = originString(ctx);
  return (tree: Root): void => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "pre" || isMermaid(node)) return;
      const code = firstCode(node);
      const lang = code ? langOf(code) : null;

      const header: Element = {
        type: "element",
        tagName: "div",
        properties: { className: ["code-header"] },
        children: [trafficLights()],
      };

      const preClasses = classList(node.properties);
      if (lang && lang !== "mermaid" && lang !== "text") {
        header.children.push({
          type: "element",
          tagName: "span",
          properties: { className: ["code-lang-label"] },
          children: [{ type: "text", value: lang }],
        });
        preClasses.push("has-lang-label");
      }

      if (code && wrapLines(code)) preClasses.push("has-line-numbers");
      setClasses(node, preClasses);
      node.properties["data-code-origin"] = origin;

      const rest: ElementContent[] = node.children;
      node.children = [header, ...rest, copyButton()];
    });
  };
}
