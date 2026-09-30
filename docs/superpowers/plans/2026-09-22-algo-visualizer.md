# Algorithm Visualizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive algorithm visualizer — a dedicated route where users input values, run a real algorithm, and step/play through its execution with array/graph/tree/DP-grid visuals and a debugger-style variables panel.

**Architecture:** A registry of plain-object algo definitions (id, title, vizType, params schema, presets, `run(params, record)`) drives an auto-generated input form. `run()` executes the real algorithm eagerly and records a full snapshot array via `record()`. Playback is index lookups into that array through one shared "set current index" function, feeding a shared playback bar, a shared vars panel, and one of four renderers selected by `vizType`.

**Tech Stack:** Vanilla JS (ES modules), no bundler/TS — matches the rest of `wiki-fe`. SVG for array/tree renderers, existing canvas-based `graph-engine.js` sim for graph, CSS grid for dp-grid. Testing is Playwright + pytest e2e only (`tests/e2e/test_visualizer.py`) — no JS unit test infra exists in this repo for `js/`.

**Spec:** `docs/superpowers/specs/2026-09-22-algo-visualizer-design.md`

## Global Constraints

- No bundler, no TypeScript, no build step — plain ES modules, matches existing `js/` tree.
- Testing is Playwright + pytest, through the UI only — never test JS functions directly (`CONVENTIONS.md`).
- Comments: single line only, no multi-line prose blocks, earn their place only for non-obvious *why*.
- No ticket IDs (`WIKI-xxx` etc.) in code comments or CSS section headers.
- Same-tab dedicated route — no modal, no new tab.
- Bad input: inline warning only, never blocks Run. Runtime failures during `run()` are caught and surfaced as an error snapshot, not a crash.
- `run()` executes eagerly (not a generator) — produces a full `states[]` array up front.
- Never run the full Python e2e suite from a plan step — user runs tests manually.

---

## File Structure

**New:**
- `js/visualizer/registry.js` — aggregates all algo modules, exposes lookup-by-id and group-by-vizType.
- `js/visualizer/algos/bubble-sort.js` — first algo, proves the array vizType end-to-end.
- `js/visualizer/algos/binary-search.js` — second algo, proves the pattern generalizes.
- `js/visualizer/params.js` — param-type → input-widget rendering + per-type parsing/validation (pure functions, DOM-building helpers).
- `js/visualizer/playback.js` — shared playback bar component (prev/next/play/pause/speed/scrub/counter) and the single "set current index" function.
- `js/visualizer/renderers/array-renderer.js` — SVG bar chart renderer.
- `js/visualizer/renderers/graph-renderer.js` — wraps `graph-engine.js`'s `createGraphSim`.
- `js/visualizer/renderers/tree-renderer.js` — SVG tree renderer, consumes `layoutTreePositions` extracted from `structure-viz.js`.
- `js/visualizer/renderers/dp-grid-renderer.js` — CSS grid renderer.
- `js/visualizer/vars-panel.js` — debugger-style vars/error panel.
- `js/render/visualizer-view.js` — `renderVisualizerIndex()`, `renderVisualizerDetail(slug)`; owns the run lifecycle (parse params → call `run()` → hand snapshots to playback + renderer + vars panel).
- `css/view-visualizer.css` — all visualizer styling.
- `tests/e2e/test_visualizer.py` — e2e coverage.

**Modify:**
- `js/content/structure-viz.js` — extract `posOf`/depth/width/height math out of `_renderTree` into an exported pure function `layoutTreePositions(data)`; `_renderTree` calls it internally, behavior unchanged.
- `js/render/router.js` — add `visualizer` branch to `_execRoute`, add `view-visualizer-index`/`view-visualizer-detail` to `VIEW_DEPTH`, import the two render functions.
- `index.html` — add `#view-visualizer-index` and `#view-visualizer-detail` static shells (topbar/hero/main-content-container, matching the `#view-admin` pattern).
- `css/wiki.css` — add `@import "./view-visualizer.css";`.

**Interfaces locked by this structure:**
- `algo.run(params, record)` — `record(snapshot)` pushes one snapshot; `run` returns the final value (unused by playback, useful for e2e assertions).
- `registry.getById(id)`, `registry.groupedByVizType()` — the only two entry points `visualizer-view.js` needs from the registry.
- `renderers[vizType](container, snapshot)` — every renderer has this exact signature; `visualizer-view.js` looks up the renderer by `algo.vizType` and calls it on every index change.
- `playback.create({ states, onIndexChange })` → `{ el, setIndex(i), destroy() }` — the one component all four vizTypes share.

---

## Task 1: Extract tree layout math from `structure-viz.js`

**Files:**
- Modify: `js/content/structure-viz.js`
- Test: `tests/e2e/test_structure_viz.py` (existing file — confirms no regression, add nothing new here since behavior is unchanged)

**Interfaces:**
- Produces: `export function layoutTreePositions(data)` → returns `{ width, height, positions: [{x, y} | null, ...] }`, index-aligned with `data` (null entries for `null`/missing nodes, matching `_renderTree`'s existing `data[i] == null` skip).

- [ ] **Step 1: Read the current `_renderTree` implementation**

Already read above (lines ~33-90 of `js/content/structure-viz.js`). The math to extract: `depth`, `width`, `height` computation, and the `posOf(i)` closure.

- [ ] **Step 2: Extract the math into an exported pure function**

In `js/content/structure-viz.js`, above `_renderTree`, add:

```js
function layoutTreePositions(data) {
  const n = data.length;
  const depth = Math.floor(Math.log2(n || 1)) + 1;
  const width = Math.min(Math.max(2 ** (depth - 1) * NODE_R * 2.5, 120), MAX_VIZ_WIDTH);
  const height = depth * LEVEL_H;
  const posOf = (i) => {
    const level = Math.floor(Math.log2(i + 1));
    const posInLevel = i + 1 - 2 ** level;
    const slots = 2 ** level;
    const x = ((posInLevel + 0.5) / slots) * width + SVG_PAD;
    const y = level * LEVEL_H + NODE_R + SVG_PAD;
    return { x, y };
  };
  const positions = data.map((v, i) => (v == null ? null : posOf(i)));
  return { width, height, positions };
}
```

Then rewrite `_renderTree` to call it instead of duplicating the math:

```js
function _renderTree(data, { heap = false } = {}) {
  const { width, height, positions } = layoutTreePositions(data);
  const n = data.length;

  const svg = _svgEl("svg", {
    viewBox: `0 0 ${width + SVG_PAD * 2} ${height + SVG_PAD * 2}`,
    class: "structure-viz-svg",
    role: "img",
    "aria-label": `${heap ? "Heap" : "Binary tree"} of ${n} nodes`,
  });

  for (let i = 0; i < n; i++) {
    if (!positions[i]) continue;
    const { x, y } = positions[i];
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    [left, right].forEach((child) => {
      if (child < n && positions[child]) {
        const cp = positions[child];
        svg.appendChild(
          _svgEl("line", { x1: x, y1: y, x2: cp.x, y2: cp.y, class: "structure-viz-edge" }),
        );
      }
    });
  }

  for (let i = 0; i < n; i++) {
    if (!positions[i]) continue;
    const { x, y } = positions[i];
    svg.appendChild(_svgEl("circle", { cx: x, cy: y, r: NODE_R, class: "structure-viz-node" }));
    const label = _svgEl("text", { x, y: y + 4, class: "structure-viz-label", "text-anchor": "middle" });
    label.textContent = String(data[i]);
    svg.appendChild(label);
  }

  return svg;
}
```

Add `layoutTreePositions` to the file's `export` line: `export { renderStructureViz, layoutTreePositions };`

- [ ] **Step 3: Manually verify no regression**

Run: `.venv/bin/python3 -m pytest tests/e2e/test_structure_viz.py -v`
Expected: PASS, same as before this change (behavior is unchanged, only the internals were extracted).

- [ ] **Step 4: Commit**

```bash
git add js/content/structure-viz.js
git commit -m "refactor: extract tree layout math into layoutTreePositions"
```

---

## Task 2: Registry, first algo, and param widgets

**Files:**
- Create: `js/visualizer/registry.js`
- Create: `js/visualizer/algos/bubble-sort.js`
- Create: `js/visualizer/params.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `registry.js`: `export function getById(id)`, `export function groupedByVizType()` → `{ array: [algo, ...], graph: [...], tree: [...], "dp-grid": [...] }`.
  - `bubble-sort.js`: `export default { id, title, vizType: "array", params, presets, run(params, record) }` matching the spec's shape exactly.
  - `params.js`: `export function renderParamInput(param, value, onChange)` → returns a DOM element (label + widget + inline warning slot); `export function parseParamValue(param, rawInput)` → `{ value, error }` (error is a string or null, never throws).

- [ ] **Step 1: Write `bubble-sort.js`**

```js
const bubbleSort = {
  id: "bubble-sort",
  title: "Bubble Sort",
  vizType: "array",
  params: [{ name: "nums", type: "array<number>", default: [5, 3, 8, 1, 4] }],
  presets: [
    { label: "Random", values: { nums: [9, 2, 7, 4, 1] } },
    { label: "Worst case (reversed)", values: { nums: [9, 8, 7, 6, 5] } },
  ],
  run(params, record) {
    const nums = [...params.nums];
    for (let i = 0; i < nums.length; i++) {
      for (let j = 0; j < nums.length - i - 1; j++) {
        record({ array: [...nums], highlights: { compare: [j, j + 1] }, vars: { i, j } });
        if (nums[j] > nums[j + 1]) {
          [nums[j], nums[j + 1]] = [nums[j + 1], nums[j]];
          record({ array: [...nums], highlights: { swap: [j, j + 1] }, vars: { i, j } });
        }
      }
    }
    return nums;
  },
};

export default bubbleSort;
```

- [ ] **Step 2: Write `registry.js`**

```js
import bubbleSort from "./algos/bubble-sort.js";

const ALGOS = [bubbleSort];

function getById(id) {
  return ALGOS.find((a) => a.id === id) ?? null;
}

function groupedByVizType() {
  const groups = { array: [], graph: [], tree: [], "dp-grid": [] };
  for (const algo of ALGOS) groups[algo.vizType].push(algo);
  return groups;
}

export { getById, groupedByVizType };
```

- [ ] **Step 3: Write `params.js`**

```js
function parseParamValue(param, rawInput) {
  if (param.type === "number") {
    const n = Number(rawInput);
    return Number.isFinite(n) ? { value: n, error: null } : { value: null, error: "Enter a number" };
  }
  if (param.type === "array<number>") {
    const parts = rawInput.split(",").map((s) => s.trim()).filter(Boolean);
    const nums = parts.map(Number);
    if (nums.some((n) => !Number.isFinite(n))) {
      return { value: null, error: "Comma-separated numbers only, e.g. 5, 3, 8" };
    }
    return { value: nums, error: null };
  }
  if (param.type === "string") {
    return { value: rawInput, error: null };
  }
  if (param.type === "tree") {
    try {
      const arr = JSON.parse(rawInput);
      if (!Array.isArray(arr)) throw new Error();
      return { value: arr, error: null };
    } catch {
      return { value: null, error: "Level-order array, e.g. [5,3,8,1,4]" };
    }
  }
  if (param.type === "graph") {
    const edges = [];
    for (const line of rawInput.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)) {
      const m = line.match(/^(\w+)-(\w+)(?::(\d+(?:\.\d+)?))?$/);
      if (!m) return { value: null, error: "Edge format: A-B or A-B:weight, one per line" };
      edges.push({ from: m[1], to: m[2], weight: m[3] !== undefined ? Number(m[3]) : undefined });
    }
    return { value: edges, error: null };
  }
  return { value: rawInput, error: null };
}

function renderParamInput(param, value, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "viz-param";

  const label = document.createElement("label");
  label.className = "viz-param-label";
  label.textContent = param.name;
  label.htmlFor = `viz-param-${param.name}`;
  wrap.appendChild(label);

  const widget = param.type === "graph" ? document.createElement("textarea") : document.createElement("input");
  widget.id = `viz-param-${param.name}`;
  widget.className = "viz-param-input";
  widget.value = Array.isArray(value) ? value.join(", ") : String(value ?? "");
  if (param.type === "number") widget.type = "number";

  const warning = document.createElement("p");
  warning.className = "viz-param-warning";
  warning.hidden = true;

  widget.addEventListener("input", () => {
    const { value: parsed, error } = parseParamValue(param, widget.value);
    warning.hidden = !error;
    warning.textContent = error || "";
    onChange(parsed, error);
  });

  wrap.appendChild(widget);
  wrap.appendChild(warning);
  return wrap;
}

export { renderParamInput, parseParamValue };
```

- [ ] **Step 4: Manually verify by importing in a scratch check**

Run: `.venv/bin/python3 -c "print('no python entry point yet — verified via e2e in Task 4')"`

There's no runnable JS entry point until Task 3 wires the route, so this task is verified structurally now and behaviorally in Task 4's e2e test. Confirm no syntax errors by checking the files parse:

Run: `node --check js/visualizer/registry.js && node --check js/visualizer/algos/bubble-sort.js && node --check js/visualizer/params.js`
Expected: no output (success).

- [ ] **Step 5: Commit**

```bash
git add js/visualizer/registry.js js/visualizer/algos/bubble-sort.js js/visualizer/params.js
git commit -m "feat: add visualizer registry, bubble sort algo, param widgets"
```

---

## Task 3: Playback bar and vars panel

**Files:**
- Create: `js/visualizer/playback.js`
- Create: `js/visualizer/vars-panel.js`

**Interfaces:**
- Consumes: nothing from earlier tasks directly (pure UI components operating on a `states[]` array passed in).
- Produces:
  - `playback.js`: `export function createPlayback({ states, onIndexChange })` → `{ el, setIndex(i), destroy() }`. `el` is the DOM element to mount; `onIndexChange(index, snapshot)` fires on every prev/next/scrub/autoplay tick.
  - `vars-panel.js`: `export function createVarsPanel()` → `{ el, update(snapshot) }`. `update` renders `snapshot.vars` as name→value rows, or `snapshot.error` if present.

- [ ] **Step 1: Write `playback.js`**

```js
const SPEEDS = [0.5, 1, 2, 4];
const BASE_INTERVAL_MS = 600;

function createPlayback({ states, onIndexChange }) {
  let index = 0;
  let speed = 1;
  let timer = null;

  const el = document.createElement("div");
  el.className = "viz-playback";

  const prevBtn = document.createElement("button");
  prevBtn.className = "viz-playback-btn";
  prevBtn.textContent = "Prev";

  const playBtn = document.createElement("button");
  playBtn.className = "viz-playback-btn";
  playBtn.textContent = "Play";

  const nextBtn = document.createElement("button");
  nextBtn.className = "viz-playback-btn";
  nextBtn.textContent = "Next";

  const speedSelect = document.createElement("select");
  speedSelect.className = "viz-playback-speed";
  for (const s of SPEEDS) {
    const opt = document.createElement("option");
    opt.value = String(s);
    opt.textContent = `${s}x`;
    if (s === 1) opt.selected = true;
    speedSelect.appendChild(opt);
  }

  const scrub = document.createElement("input");
  scrub.type = "range";
  scrub.className = "viz-playback-scrub";
  scrub.min = "0";
  scrub.max = String(Math.max(states.length - 1, 0));
  scrub.value = "0";

  const counter = document.createElement("span");
  counter.className = "viz-playback-counter";

  function render() {
    counter.textContent = `Step ${states.length ? index + 1 : 0} / ${states.length}`;
    scrub.value = String(index);
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index >= states.length - 1;
  }

  function setIndex(i) {
    index = Math.max(0, Math.min(i, states.length - 1));
    render();
    onIndexChange(index, states[index]);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    playBtn.textContent = "Play";
  }

  function play() {
    if (index >= states.length - 1) setIndex(0);
    playBtn.textContent = "Pause";
    timer = setInterval(() => {
      if (index >= states.length - 1) {
        stop();
        return;
      }
      setIndex(index + 1);
    }, BASE_INTERVAL_MS / speed);
  }

  prevBtn.addEventListener("click", () => {
    stop();
    setIndex(index - 1);
  });
  nextBtn.addEventListener("click", () => {
    stop();
    setIndex(index + 1);
  });
  playBtn.addEventListener("click", () => (timer ? stop() : play()));
  speedSelect.addEventListener("change", () => {
    speed = Number(speedSelect.value);
    if (timer) {
      stop();
      play();
    }
  });
  scrub.addEventListener("input", () => {
    stop();
    setIndex(Number(scrub.value));
  });

  el.append(prevBtn, playBtn, nextBtn, speedSelect, scrub, counter);

  function destroy() {
    stop();
  }

  if (states.length) setIndex(0);
  else render();

  return { el, setIndex, destroy };
}

export { createPlayback };
```

- [ ] **Step 2: Write `vars-panel.js`**

```js
function createVarsPanel() {
  const el = document.createElement("div");
  el.className = "viz-vars-panel";

  function update(snapshot) {
    el.replaceChildren();
    if (!snapshot) return;
    if (snapshot.error) {
      const err = document.createElement("p");
      err.className = "viz-vars-error";
      err.textContent = snapshot.error;
      el.appendChild(err);
      return;
    }
    for (const [name, value] of Object.entries(snapshot.vars || {})) {
      const row = document.createElement("div");
      row.className = "viz-vars-row";
      const nameEl = document.createElement("span");
      nameEl.className = "viz-vars-name";
      nameEl.textContent = name;
      const valEl = document.createElement("span");
      valEl.className = "viz-vars-value";
      valEl.textContent = JSON.stringify(value);
      row.append(nameEl, valEl);
      el.appendChild(row);
    }
  }

  return { el, update };
}

export { createVarsPanel };
```

- [ ] **Step 3: Verify files parse**

Run: `node --check js/visualizer/playback.js && node --check js/visualizer/vars-panel.js`
Expected: no output (success).

- [ ] **Step 4: Commit**

```bash
git add js/visualizer/playback.js js/visualizer/vars-panel.js
git commit -m "feat: add visualizer playback bar and vars panel"
```

---

## Task 4: Array renderer, visualizer-view, router wiring, HTML/CSS shells — end-to-end for bubble sort

**Files:**
- Create: `js/visualizer/renderers/array-renderer.js`
- Create: `js/render/visualizer-view.js`
- Create: `css/view-visualizer.css`
- Modify: `js/render/router.js`
- Modify: `index.html`
- Modify: `css/wiki.css`
- Test: `tests/e2e/test_visualizer.py`

**Interfaces:**
- Consumes: `registry.getById`/`groupedByVizType` (Task 2), `renderParamInput`/`parseParamValue` (Task 2), `createPlayback` (Task 3), `createVarsPanel` (Task 3).
- Produces: `array-renderer.js`: `export function renderArray(container, snapshot)` — clears and redraws `container` as an SVG bar chart for the given snapshot. `visualizer-view.js`: `export function renderVisualizerIndex()`, `export function renderVisualizerDetail(slug)`.

- [ ] **Step 1: Write `array-renderer.js`**

```js
const BAR_GAP = 8;
const BAR_MAX_HEIGHT = 200;
const SVG_PAD = 20;

function _svgEl(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function renderArray(container, snapshot) {
  container.replaceChildren();
  if (!snapshot || !snapshot.array) return;

  const { array, highlights = {} } = snapshot;
  const max = Math.max(...array, 1);
  const barWidth = 32;
  const width = array.length * (barWidth + BAR_GAP) + SVG_PAD * 2;
  const height = BAR_MAX_HEIGHT + SVG_PAD * 2;

  const svg = _svgEl("svg", {
    viewBox: `0 0 ${width} ${height}`,
    class: "viz-array-svg",
    role: "img",
    "aria-label": `Array of ${array.length} values`,
  });

  const highlightClassFor = (i) => {
    for (const [key, indices] of Object.entries(highlights)) {
      if (Array.isArray(indices) && indices.includes(i)) return `viz-array-bar-${key}`;
    }
    return "";
  };

  array.forEach((val, i) => {
    const barHeight = (val / max) * BAR_MAX_HEIGHT;
    const x = SVG_PAD + i * (barWidth + BAR_GAP);
    const y = SVG_PAD + (BAR_MAX_HEIGHT - barHeight);
    const cls = `viz-array-bar ${highlightClassFor(i)}`.trim();
    svg.appendChild(_svgEl("rect", { x, y, width: barWidth, height: barHeight, class: cls }));

    const label = _svgEl("text", {
      x: x + barWidth / 2,
      y: SVG_PAD + BAR_MAX_HEIGHT + 16,
      class: "viz-array-label",
      "text-anchor": "middle",
    });
    label.textContent = String(val);
    svg.appendChild(label);
  });

  container.appendChild(svg);
}

export { renderArray };
```

- [ ] **Step 2: Write `visualizer-view.js`**

```js
import { getById, groupedByVizType } from "../visualizer/registry.js";
import { renderParamInput } from "../visualizer/params.js";
import { createPlayback } from "../visualizer/playback.js";
import { createVarsPanel } from "../visualizer/vars-panel.js";
import { renderArray } from "../visualizer/renderers/array-renderer.js";
import { navigate } from "./router.js";

const RENDERERS = { array: renderArray };

function renderVisualizerIndex() {
  const container = document.getElementById("visualizer-index-content");
  container.replaceChildren();

  const groups = groupedByVizType();
  const titles = { array: "Array", graph: "Graph", tree: "Tree", "dp-grid": "DP Grid" };

  for (const [vizType, algos] of Object.entries(groups)) {
    if (!algos.length) continue;
    const section = document.createElement("section");
    section.className = "viz-index-section";

    const heading = document.createElement("h2");
    heading.textContent = titles[vizType];
    section.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "viz-index-grid";
    for (const algo of algos) {
      const card = document.createElement("button");
      card.className = "viz-index-card";
      card.textContent = algo.title;
      card.addEventListener("click", () => navigate(`visualizer/${algo.id}`));
      grid.appendChild(card);
    }
    section.appendChild(grid);
    container.appendChild(section);
  }
}

function renderVisualizerDetail(slug) {
  const container = document.getElementById("visualizer-detail-content");
  container.replaceChildren();

  const algo = getById(slug);
  if (!algo) {
    const notFound = document.createElement("p");
    notFound.textContent = `Algorithm not found: "${slug}"`;
    container.appendChild(notFound);
    return;
  }

  document.getElementById("visualizer-detail-title").textContent = algo.title;

  const values = {};
  const errors = {};
  for (const param of algo.params) values[param.name] = param.default;

  const form = document.createElement("div");
  form.className = "viz-param-form";
  for (const param of algo.params) {
    form.appendChild(
      renderParamInput(param, values[param.name], (value, error) => {
        values[param.name] = value;
        errors[param.name] = error;
      }),
    );
  }

  const presetRow = document.createElement("div");
  presetRow.className = "viz-preset-row";
  for (const preset of algo.presets || []) {
    const btn = document.createElement("button");
    btn.className = "viz-preset-btn";
    btn.textContent = preset.label;
    btn.addEventListener("click", () => {
      Object.assign(values, preset.values);
      renderVisualizerDetail(slug);
    });
    presetRow.appendChild(btn);
  }

  const runBtn = document.createElement("button");
  runBtn.className = "viz-run-btn";
  runBtn.textContent = "Run";

  const canvas = document.createElement("div");
  canvas.className = "viz-canvas";

  const playbackMount = document.createElement("div");
  const varsPanel = createVarsPanel();

  let playback = null;

  runBtn.addEventListener("click", () => {
    if (playback) playback.destroy();
    playbackMount.replaceChildren();
    canvas.replaceChildren();

    const states = [];
    const record = (snapshot) => states.push(snapshot);
    try {
      algo.run(values, record);
    } catch (err) {
      states.push({ error: err.message });
    }

    const renderer = RENDERERS[algo.vizType];
    playback = createPlayback({
      states,
      onIndexChange: (index, snapshot) => {
        renderer(canvas, snapshot);
        varsPanel.update(snapshot);
      },
    });
    playbackMount.appendChild(playback.el);
  });

  container.append(form, presetRow, runBtn, canvas, playbackMount, varsPanel.el);
}

export { renderVisualizerIndex, renderVisualizerDetail };
```

- [ ] **Step 3: Wire the route in `js/render/router.js`**

Add import near the other view imports:

```js
import { renderVisualizerIndex, renderVisualizerDetail } from "./visualizer-view.js";
```

Add to `VIEW_DEPTH`:

```js
"view-visualizer-index": 1,
"view-visualizer-detail": 2,
```

Add a branch in `_execRoute`, alongside the `admin`/`dashboard` branches:

```js
if (wikiId === "visualizer") {
  if (parts.length === 1) {
    updatePageTitle("Algorithm Visualizer");
    showView("view-visualizer-index");
    renderVisualizerIndex();
    return;
  }
  updatePageTitle("Algorithm Visualizer");
  showView("view-visualizer-detail");
  renderVisualizerDetail(parts[1]);
  return;
}
```

- [ ] **Step 4: Add static view shells to `index.html`**

Insert after the `#view-admin` block (before the distraction-free-exit button), matching that block's topbar/hero/main structure:

```html
<div id="view-visualizer-index" class="view">
  <div class="page-topbar">
    <div class="topbar-inner">
      <button class="back-btn" data-action="wiki-home">
        <svg class="icon"><use href="#icon-chevron-left"></use></svg>
        Home
      </button>
    </div>
  </div>
  <div class="page-hero">
    <div class="page-hero-inner">
      <h1 class="page-title">Algorithm Visualizer</h1>
      <p class="page-subtitle">Run algorithms step by step with your own input</p>
    </div>
  </div>
  <main class="viz-index-main">
    <div id="visualizer-index-content"></div>
  </main>
</div>

<div id="view-visualizer-detail" class="view">
  <div class="page-topbar">
    <div class="topbar-inner">
      <button class="back-btn" data-action="visualizer-index">
        <svg class="icon"><use href="#icon-chevron-left"></use></svg>
        Visualizer
      </button>
    </div>
  </div>
  <div class="page-hero">
    <div class="page-hero-inner">
      <h1 id="visualizer-detail-title" class="page-title"></h1>
    </div>
  </div>
  <main class="viz-detail-main">
    <div id="visualizer-detail-content"></div>
  </main>
</div>
```

Note: `data-action="visualizer-index"` on the back button needs a click-delegation handler. Check `js/app.js`'s `data-action` dispatch table (the same mechanism `data-action="wiki-home"` uses) and add a case that calls `navigate('visualizer')`.

- [ ] **Step 5: Register the new CSS file**

In `css/wiki.css`, add after `@import "./view-admin.css";`:

```css
@import "./view-visualizer.css";
```

- [ ] **Step 6: Write `css/view-visualizer.css`**

```css
.viz-index-section {
  margin-bottom: 2rem;
}

.viz-index-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}

.viz-index-card {
  padding: 1rem;
  border: 1px solid var(--border-color, #ccc);
  border-radius: 8px;
  background: var(--surface-color, #fff);
  cursor: pointer;
  text-align: left;
}

.viz-param-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.viz-param-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.viz-param-input {
  width: 100%;
  padding: 0.5rem;
}

.viz-param-warning {
  color: var(--error-color, #c0392b);
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.viz-preset-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.viz-canvas {
  min-height: 260px;
  margin: 1rem 0;
}

.viz-array-bar {
  fill: var(--accent-color, #3498db);
}

.viz-array-bar-compare {
  fill: var(--warning-color, #f39c12);
}

.viz-array-bar-swap {
  fill: var(--error-color, #c0392b);
}

.viz-array-label {
  font-size: 12px;
}

.viz-playback {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.viz-playback-scrub {
  flex: 1;
}

.viz-vars-panel {
  border: 1px solid var(--border-color, #ccc);
  border-radius: 8px;
  padding: 0.75rem;
  margin-top: 1rem;
}

.viz-vars-row {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
}

.viz-vars-error {
  color: var(--error-color, #c0392b);
}
```

Use the project's actual CSS custom property names from `css/tokens.css` in place of the `var(--x, fallback)` placeholders above — check `css/tokens.css` for the real token names before finalizing (this file uses generic fallback names since it wasn't read as part of this plan).

- [ ] **Step 7: Write the e2e test**

```python
"""E2E coverage for the algorithm visualizer."""
import re
from playwright.sync_api import Page, expect


def test_visualizer_index_lists_bubble_sort(page: Page, base_url: str):
    page.goto(f"{base_url}#visualizer")
    expect(page.get_by_text("Bubble Sort")).to_be_visible()


def test_visualizer_run_bubble_sort_steps_through(page: Page, base_url: str):
    page.goto(f"{base_url}#visualizer/bubble-sort")
    page.get_by_role("button", name="Run").click()
    expect(page.locator(".viz-array-svg")).to_be_visible()
    counter = page.locator(".viz-playback-counter")
    expect(counter).to_have_text(re.compile(r"Step 1 / \d+"))
    page.get_by_role("button", name="Next").click()
    expect(counter).to_have_text(re.compile(r"Step 2 / \d+"))


def test_visualizer_invalid_input_warns_but_run_still_works(page: Page, base_url: str):
    page.goto(f"{base_url}#visualizer/bubble-sort")
    page.locator(".viz-param-input").fill("not, numbers")
    expect(page.locator(".viz-param-warning")).to_be_visible()
    run_btn = page.get_by_role("button", name="Run")
    expect(run_btn).to_be_enabled()
```

Match this file's fixture usage (`page`, `base_url`) to whatever `tests/conftest.py` actually defines — read it before finalizing, per `CONVENTIONS.md`'s "read conftest.py before writing any test" rule, and adjust fixture names/signatures to match exactly.

- [ ] **Step 8: Manually verify files parse**

Run: `node --check js/visualizer/renderers/array-renderer.js && node --check js/render/visualizer-view.js`
Expected: no output (success).

- [ ] **Step 9: Run the new e2e test**

Do not run this yourself — hand off to the user per the "never run the tests" convention. State which command they should run:

`.venv/bin/python3 -m pytest tests/e2e/test_visualizer.py -v`

- [ ] **Step 10: Commit**

```bash
git add js/visualizer/renderers/array-renderer.js js/render/visualizer-view.js js/render/router.js index.html css/view-visualizer.css css/wiki.css tests/e2e/test_visualizer.py
git commit -m "feat: wire up algorithm visualizer route, array renderer, bubble sort e2e"
```

---

## Follow-on work (not in this plan)

Per the spec's "Open scope" section, the following are separate future passes, each producing working software on its own once this plan lands:

- **Graph renderer** — `js/visualizer/renderers/graph-renderer.js` wrapping `graph-engine.js`'s `createGraphSim`, plus a first graph algo (e.g. BFS).
- **Tree renderer** — `js/visualizer/renderers/tree-renderer.js` consuming `layoutTreePositions` (already extracted in Task 1), plus a first tree algo (e.g. in-order traversal).
- **DP-grid renderer** — `js/visualizer/renderers/dp-grid-renderer.js`, plus a first DP algo (e.g. edit distance).
- **"Visualize" links on DSA articles** — linking relevant content pages to their visualizer route.
- Additional array algos beyond bubble sort / binary search (selection, insertion, merge, quick, heap, two-pointer, sliding window, prefix sum/Kadane's — full list from the brainstorm).

Binary search (listed in Task 2's file structure as a second algo to prove the pattern generalizes) was deferred out of this plan to keep Task 2 scoped to one algo per the "each task ships working software" rule — add it as a small follow-up task using the same pattern as `bubble-sort.js` once Task 4 is verified working end-to-end.

---

## Self-Review Notes

- **Spec coverage:** routing (Task 4 step 3-4) ✓, algo registry & data shape (Task 2) ✓, input form generation (Task 2 params.js + Task 4 wiring) ✓, landing page (Task 4 step 2) ✓, playback controls (Task 3) ✓, debugger/vars panel (Task 3) ✓, array renderer (Task 4 step 1) ✓, error handling — inline warning non-blocking (Task 2 params.js) and runtime catch (Task 4 visualizer-view.js run handler) ✓, testing (Task 4 step 7) ✓. Graph/tree/dp-grid renderers explicitly deferred to follow-on work per the spec's own "open scope" section — tree's shared dependency (`layoutTreePositions`) is extracted now (Task 1) so it's ready when that follow-on lands.
- **Placeholder scan:** CSS token names in Task 4 step 6 are flagged as generic fallbacks needing a real check against `css/tokens.css` before finalizing — this is a genuine open item, not a placeholder being hidden; it's called out explicitly as a step to complete during implementation, not deferred silently. Test fixture names in Task 4 step 7 are flagged the same way against `tests/conftest.py`.
- **Type consistency:** `algo.run(params, record)` used consistently across the spec, `bubble-sort.js`, and `visualizer-view.js`. `renderer(container, snapshot)` signature consistent between `array-renderer.js` and its call site in `visualizer-view.js`. `createPlayback({states, onIndexChange})` and `createVarsPanel()` signatures consistent between Task 3 and their Task 4 call sites.
