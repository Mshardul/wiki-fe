/* ─── Inline Structure Viz ───
   ```viz
   bst
   [5,3,8,1,4]
   ```
   First line = structure type, second line = JSON array literal.
   Renders a small inline SVG built from the data; falls back to the raw
   literal if the type is unknown or the literal fails to parse. */

const NODE_R = 16;
const LEVEL_H = 56;
const SVG_PAD = 20;

function _parseVizBlock(code) {
  const lines = code
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;
  const type = lines[0].toLowerCase();
  let data;
  try {
    data = JSON.parse(lines[1]);
  } catch {
    return null;
  }
  if (!Array.isArray(data)) return null;
  return { type, data };
}

function _svgEl(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function _renderTree(data, { heap = false } = {}) {
  // Build a binary tree from level-order array data (works for both BST-as-given
  // and heap - both are rendered the same way, level-order).
  const n = data.length;
  const depth = Math.floor(Math.log2(n || 1)) + 1;
  const width = Math.max(2 ** (depth - 1) * NODE_R * 2.5, 120);
  const height = depth * LEVEL_H;

  const svg = _svgEl("svg", {
    viewBox: `0 0 ${width + SVG_PAD * 2} ${height + SVG_PAD * 2}`,
    class: "structure-viz-svg",
    role: "img",
    "aria-label": `${heap ? "Heap" : "Binary tree"} of ${n} nodes`,
  });

  const posOf = (i) => {
    const level = Math.floor(Math.log2(i + 1));
    const posInLevel = i + 1 - 2 ** level;
    const slots = 2 ** level;
    const x = ((posInLevel + 0.5) / slots) * width + SVG_PAD;
    const y = level * LEVEL_H + NODE_R + SVG_PAD;
    return { x, y };
  };

  for (let i = 0; i < n; i++) {
    if (data[i] == null) continue;
    const { x, y } = posOf(i);
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    [left, right].forEach((child) => {
      if (child < n && data[child] != null) {
        const cp = posOf(child);
        svg.appendChild(
          _svgEl("line", {
            x1: x,
            y1: y,
            x2: cp.x,
            y2: cp.y,
            class: "structure-viz-edge",
          }),
        );
      }
    });
  }

  for (let i = 0; i < n; i++) {
    if (data[i] == null) continue;
    const { x, y } = posOf(i);
    svg.appendChild(_svgEl("circle", { cx: x, cy: y, r: NODE_R, class: "structure-viz-node" }));
    const label = _svgEl("text", {
      x,
      y: y + 4,
      class: "structure-viz-label",
      "text-anchor": "middle",
    });
    label.textContent = String(data[i]);
    svg.appendChild(label);
  }

  return svg;
}

function _renderLinkedList(data) {
  const n = data.length;
  const width = n * 60 + SVG_PAD * 2;
  const height = NODE_R * 2 + SVG_PAD * 2;
  const svg = _svgEl("svg", {
    viewBox: `0 0 ${width} ${height}`,
    class: "structure-viz-svg",
    role: "img",
    "aria-label": `Linked list of ${n} nodes`,
  });

  data.forEach((val, i) => {
    const x = SVG_PAD + i * 60 + NODE_R;
    const y = height / 2;
    if (i < n - 1) {
      svg.appendChild(
        _svgEl("line", {
          x1: x + NODE_R,
          y1: y,
          x2: x + 60 - NODE_R,
          y2: y,
          class: "structure-viz-edge",
          "marker-end": "url(#structure-viz-arrow)",
        }),
      );
    }
    svg.appendChild(_svgEl("circle", { cx: x, cy: y, r: NODE_R, class: "structure-viz-node" }));
    const label = _svgEl("text", { x, y: y + 4, class: "structure-viz-label", "text-anchor": "middle" });
    label.textContent = String(val);
    svg.appendChild(label);
  });

  const defs = _svgEl("defs", {});
  const marker = _svgEl("marker", {
    id: "structure-viz-arrow",
    markerWidth: 8,
    markerHeight: 8,
    refX: 6,
    refY: 4,
    orient: "auto",
  });
  const arrowPath = _svgEl("path", { d: "M0,0 L8,4 L0,8 Z", class: "structure-viz-arrowhead" });
  marker.appendChild(arrowPath);
  defs.appendChild(marker);
  svg.insertBefore(defs, svg.firstChild);

  return svg;
}

function _renderArray(data) {
  const n = data.length;
  const cellW = 44;
  const width = n * cellW + SVG_PAD * 2;
  const height = cellW + SVG_PAD * 2;
  const svg = _svgEl("svg", {
    viewBox: `0 0 ${width} ${height}`,
    class: "structure-viz-svg",
    role: "img",
    "aria-label": `Array of ${n} elements`,
  });

  data.forEach((val, i) => {
    const x = SVG_PAD + i * cellW;
    const y = SVG_PAD;
    svg.appendChild(
      _svgEl("rect", { x, y, width: cellW, height: cellW, class: "structure-viz-cell" }),
    );
    const label = _svgEl("text", {
      x: x + cellW / 2,
      y: y + cellW / 2 + 4,
      class: "structure-viz-label",
      "text-anchor": "middle",
    });
    label.textContent = String(val);
    svg.appendChild(label);
    const idx = _svgEl("text", {
      x: x + cellW / 2,
      y: y + cellW + 14,
      class: "structure-viz-index",
      "text-anchor": "middle",
    });
    idx.textContent = String(i);
    svg.appendChild(idx);
  });

  return svg;
}

const RENDERERS = {
  bst: (data) => _renderTree(data),
  heap: (data) => _renderTree(data, { heap: true }),
  "linked-list": _renderLinkedList,
  array: _renderArray,
};

function renderStructureViz(contentEl) {
  const blocks = contentEl.querySelectorAll("pre code.language-viz");
  blocks.forEach((block) => {
    const pre = block.parentElement;
    const parsed = _parseVizBlock(block.textContent);
    const renderer = parsed && RENDERERS[parsed.type];
    if (!renderer) return; // unknown type / bad literal - leave raw code block as fallback

    let svg;
    try {
      svg = renderer(parsed.data);
    } catch {
      return; // renderer failure - leave raw code block as fallback
    }

    const wrapper = document.createElement("div");
    wrapper.className = "structure-viz";
    wrapper.dataset.vizType = parsed.type;
    wrapper.appendChild(svg);
    pre.replaceWith(wrapper);
  });
}

export { renderStructureViz };
