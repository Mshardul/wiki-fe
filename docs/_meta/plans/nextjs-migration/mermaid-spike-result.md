# Mermaid CSS-Variable Theming Spike — Result

**Date:** 2026-09-01
**Phase:** `content-foundation.md` Phase 1 (the spec §7 gate)
**Decision: NOT CLEANLY GREEN → client-island fallback (pre-authorised, not a failure)**

---

## What was tested

Can `rehype-mermaid` (`strategy: "inline-svg"`, `theme: "base"` + a `themeCSS` block referencing `var(--diagram-*)` tokens) produce build-time SVGs that fully re-theme with the app on a light/dark switch, with **no diagram JavaScript**?

- **Versions:** `mermaid` 11.17.2, `rehype-mermaid` 3.0.0 (`mermaid-isomorphic` 3.1.0), `playwright` 1.62.1 (Chromium headless-shell 1234).
- **Corpus:** 32 mermaid blocks across 25 files, 4 distinct types — **flowchart 26, sequence 3, xychart-beta 2, gantt 1**.
- One diagram of each type rendered with the `themeCSS` under test, then embedded twice (light token set / dark token set) and screenshotted in both.

## Result per type

| Type | Count | Build-time SVG re-themes cleanly? | Why |
| --- | --- | --- | --- |
| flowchart | 26 | **Yes** | node fills, node strokes, edge lines, edge labels, node text all pick up `var(--diagram-*)` — the base-theme hex in the `<style>` block is overridden by the appended `themeCSS` cascade. Dark render is fully readable. |
| sequence | 3 | **No** | actor-box labels render with `fill="#333"` / `fill="#eaeaea"` as **presentation attributes on the text/rect elements** — no themeable class hook. Dark render: actor names ("Order", "Inventory", "Payment") are near-invisible dark-on-dark; lifelines faint. |
| gantt | 1 | **No** | task bars + task text + grid ticks carry `fill="#000"` / `fill:#003163` inline. Dark render: the entire chart is unreadable (black bars/text on the dark ground). |
| xychart-beta | 2 | **No** | every plot element + the title + axis tick labels carry `fill="#333"` / `stroke="#333"` as attributes; xychart emits no CSS classes the `themeCSS` can target. Dark render: title invisible, axis labels barely visible. |

`themeVariables` (mermaid's own `primaryColor` / `lineColor` / `textColor` system) was not a path either — those substitute **concrete values at render time**, so build-time output cannot carry `var()` through them; it would bake one theme.

**3 of 4 diagram types fail dark mode with `themeCSS` alone.** The theming requirement is hard (spec §7) and build-time SVG does not meet it for sequence / gantt / xychart.

## Decision — client-island fallback (overview.md "Mermaid", spec §7)

**Repo-wide shared `mermaid.js` client island:**

- `mermaid` (ESM build, ~500 KB) added to the app-shell precache — one-time download, cached after the first diagram page, works offline thereafter.
- Diagram code blocks are emitted by the pipeline as ` <pre class="mermaid">…</pre> ` (raw source, not SVG) — a **markup-only** remark plugin (`content-foundation.md` Phase 4), no browser at build time.
- A `components/reader/MermaidDiagrams.tsx` island (`cutover.md` Phase 3) runs `mermaid.run()` on mount with `theme: "base"` + `themeVariables` computed from the live `--diagram-*` CSS custom properties (read via `getComputedStyle`), and **re-runs on theme change** (subscribe to the same theme-change signal the rest of the app uses). Re-render swaps the SVG cleanly — the spec's "instant, no reload" bar is met this way.
- Diagram bodies are **not** in the pre-rendered HTML. Acceptable — the site is not public (overview.md "wiki is a personal tool"), so the build-time path's crawlability benefit does not apply.

## Consequences for later phase files

- **`content-foundation.md`:**
  - Phase 1 (this) — done. No build-time mermaid plugin.
  - Phase 4 — the mermaid plugin is **markup-only**: ` ```mermaid ` fence → `<pre class="mermaid" data-mermaid-src="…">` (keep the raw source as text content; escape it). No Chromium, no `rehype-mermaid`.
  - Phase 7 Step 15 — the **per-diagram SVG content-hash cache is NOT needed** (no build-time render). Drop that step or mark it N/A.
  - `rehype-mermaid`, `playwright`, `mermaid-isomorphic` — **not** runtime deps of the content build. `mermaid` itself becomes a **client** dependency (app bundle / precache), added in `cutover.md`.
- **`app-skeleton.md`:**
  - Phase 3 — still add the `--diagram-*` tokens to `tokens.css` (the island reads them via `getComputedStyle`). Add a light **and** dark value block — the island needs both resolved.
  - Phase 5 (Serwist) — add `mermaid`'s hashed chunk to the precache list (it is shell, not per-article). ~500 KB one-time.
  - Phase 6/7 — the CI `build` job does **not** need `playwright install chromium`. Drop that block. Build-time benchmark (Phase 7) no longer has a Chromium cost to measure — note "N/A, client-island path".
  - Phase 4 Step 11 visual check — diagrams will show a placeholder / raw source until the `cutover.md` island lands (expected).
- **`cutover.md`:**
  - Phase 3 — add `MermaidDiagrams.tsx` to the reader islands: `mermaid.run()` on mount, re-run on theme change, `themeVariables` from `getComputedStyle` of `--diagram-*`. This is new island work (was implicit in the spec's fallback).
  - Phase 10 `ViewportHandler` — the "re-render Mermaid on width change if client-island path" branch **is** the live branch now.
- **`overview.md` risk table** — "Mermaid SVG can't be CSS-variable-themed" → **realised**; mitigation (client island) taken. "Mermaid render fails in CI" → **moot** (no CI render).

## Artifacts

Spike directory `lib/content/mermaid-spike/` is **deleted** (per Phase 1 Step 7). The rendered SVGs + the visual screenshot lived there; this document is the kept record. The `themeCSS` string tried (for reference, not used):

```css
.node rect, .node circle, .node polygon, .node path { fill: var(--diagram-node-fill); stroke: var(--diagram-node-stroke); }
.edgePath .path, .flowchart-link { stroke: var(--diagram-edge); }
.edgeLabel, .edgeLabel rect { background-color: var(--diagram-bg); fill: var(--diagram-bg); color: var(--diagram-text); }
text, .nodeLabel, .label { fill: var(--diagram-text); color: var(--diagram-text); }
.cluster rect { fill: var(--diagram-cluster-fill); stroke: var(--diagram-cluster-stroke); }
.actor { fill: var(--diagram-node-fill); stroke: var(--diagram-node-stroke); }
.messageText, .loopText, .noteText, .labelText { fill: var(--diagram-text); }
```
Sufficient for flowchart, insufficient for sequence / gantt / xychart (baked presentation attributes).
