import type { Code, Html, Root } from "mdast";
import { visit } from "unist-util-visit";

// Faithful port of js/content/structure-viz.js: a ```viz fence (line 1 = type,
// line 2 = JSON array) becomes an inline SVG in a .structure-viz wrapper. A parse
// failure or unknown type leaves the raw code block as fallback. Deterministic —
// no client behaviour.

const NODE_R = 16;
const LEVEL_H = 56;
const SVG_PAD = 20;
const MAX_VIZ_NODES = 64;
const MAX_VIZ_WIDTH = 2400;

type VizData = (number | string | null)[];

function parseVizBlock(code: string): { type: string; data: VizData } | null {
  const lines = code
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;
  const type = (lines[0] ?? "").toLowerCase();
  let data: unknown;
  try {
    data = JSON.parse(lines[1] ?? "") as unknown;
  } catch {
    return null;
  }
  if (!Array.isArray(data)) return null;
  const arr = data as VizData;
  return { type, data: arr.length > MAX_VIZ_NODES ? arr.slice(0, MAX_VIZ_NODES) : arr };
}

function attrs(map: Record<string, string | number>): string {
  return Object.entries(map)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
}

function svgOpen(map: Record<string, string | number>): string {
  return `<svg ${attrs(map)}>`;
}

function renderTree(data: VizData, heap: boolean): string {
  const n = data.length;
  const depth = Math.floor(Math.log2(n || 1)) + 1;
  const width = Math.min(Math.max(2 ** (depth - 1) * NODE_R * 2.5, 120), MAX_VIZ_WIDTH);
  const height = depth * LEVEL_H;
  const posOf = (i: number) => {
    const level = Math.floor(Math.log2(i + 1));
    const posInLevel = i + 1 - 2 ** level;
    const slots = 2 ** level;
    return {
      x: ((posInLevel + 0.5) / slots) * width + SVG_PAD,
      y: level * LEVEL_H + NODE_R + SVG_PAD,
    };
  };
  const parts: string[] = [
    svgOpen({
      viewBox: `0 0 ${width + SVG_PAD * 2} ${height + SVG_PAD * 2}`,
      class: "structure-viz-svg",
      role: "img",
      "aria-label": `${heap ? "Heap" : "Binary tree"} of ${n} nodes`,
    }),
  ];
  for (let i = 0; i < n; i++) {
    if (data[i] == null) continue;
    const { x, y } = posOf(i);
    for (const child of [2 * i + 1, 2 * i + 2]) {
      if (child < n && data[child] != null) {
        const cp = posOf(child);
        parts.push(
          `<line ${attrs({ x1: x, y1: y, x2: cp.x, y2: cp.y, class: "structure-viz-edge" })} />`,
        );
      }
    }
  }
  for (let i = 0; i < n; i++) {
    if (data[i] == null) continue;
    const { x, y } = posOf(i);
    parts.push(`<circle ${attrs({ cx: x, cy: y, r: NODE_R, class: "structure-viz-node" })} />`);
    parts.push(
      `<text ${attrs({ x, y: y + 4, class: "structure-viz-label", "text-anchor": "middle" })}>${data[i]}</text>`,
    );
  }
  parts.push("</svg>");
  return parts.join("");
}

function renderLinkedList(data: VizData): string {
  const n = data.length;
  const width = Math.min(n * 60 + SVG_PAD * 2, MAX_VIZ_WIDTH);
  const height = NODE_R * 2 + SVG_PAD * 2;
  const parts: string[] = [
    svgOpen({
      viewBox: `0 0 ${width} ${height}`,
      class: "structure-viz-svg",
      role: "img",
      "aria-label": `Linked list of ${n} nodes`,
    }),
    `<defs><marker ${attrs({ id: "structure-viz-arrow", markerWidth: 8, markerHeight: 8, refX: 6, refY: 4, orient: "auto" })}><path ${attrs({ d: "M0,0 L8,4 L0,8 Z", class: "structure-viz-arrowhead" })} /></marker></defs>`,
  ];
  data.forEach((val, i) => {
    const x = SVG_PAD + i * 60 + NODE_R;
    const y = height / 2;
    if (i < n - 1) {
      parts.push(
        `<line ${attrs({ x1: x + NODE_R, y1: y, x2: x + 60 - NODE_R, y2: y, class: "structure-viz-edge", "marker-end": "url(#structure-viz-arrow)" })} />`,
      );
    }
    parts.push(`<circle ${attrs({ cx: x, cy: y, r: NODE_R, class: "structure-viz-node" })} />`);
    parts.push(
      `<text ${attrs({ x, y: y + 4, class: "structure-viz-label", "text-anchor": "middle" })}>${val}</text>`,
    );
  });
  parts.push("</svg>");
  return parts.join("");
}

function renderArray(data: VizData): string {
  const n = data.length;
  const cellW = 44;
  const width = Math.min(n * cellW + SVG_PAD * 2, MAX_VIZ_WIDTH);
  const height = cellW + SVG_PAD * 2;
  const parts: string[] = [
    svgOpen({
      viewBox: `0 0 ${width} ${height}`,
      class: "structure-viz-svg",
      role: "img",
      "aria-label": `Array of ${n} elements`,
    }),
  ];
  data.forEach((val, i) => {
    const x = SVG_PAD + i * cellW;
    const y = SVG_PAD;
    parts.push(
      `<rect ${attrs({ x, y, width: cellW, height: cellW, class: "structure-viz-cell" })} />`,
    );
    parts.push(
      `<text ${attrs({ x: x + cellW / 2, y: y + cellW / 2 + 4, class: "structure-viz-label", "text-anchor": "middle" })}>${val}</text>`,
    );
    parts.push(
      `<text ${attrs({ x: x + cellW / 2, y: y + cellW + 14, class: "structure-viz-index", "text-anchor": "middle" })}>${i}</text>`,
    );
  });
  parts.push("</svg>");
  return parts.join("");
}

const RENDERERS: Record<string, (data: VizData) => string> = {
  bst: (data) => renderTree(data, false),
  heap: (data) => renderTree(data, true),
  "linked-list": renderLinkedList,
  array: renderArray,
};

export function remarkViz() {
  return (tree: Root): void => {
    visit(tree, "code", (node: Code, index, parent) => {
      if (node.lang !== "viz" || !parent || typeof index !== "number") return;
      const parsed = parseVizBlock(node.value);
      const renderer = parsed && RENDERERS[parsed.type];
      if (!parsed || !renderer) return;
      let svg: string;
      try {
        svg = renderer(parsed.data);
      } catch {
        return;
      }
      const html: Html = {
        type: "html",
        value: `<div class="structure-viz" data-viz-type="${parsed.type}">${svg}</div>`,
      };
      parent.children.splice(index, 1, html);
    });
  };
}
