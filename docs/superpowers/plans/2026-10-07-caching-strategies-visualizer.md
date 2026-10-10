# Caching Strategies Visualizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/visualizer/caching-strategies/` page: six caching strategies drawn as App / Cache / DB lanes, driven by a seeded workload with races and crashes, compatible with compare mode.

**Architecture:** A new generic **Lanes** shape (model + geometry + SVG component) in the shared visualizer core. A `lib/visualizer/caching/` module where each strategy is one small file turning a request into hops plus a state change, and one shared driver assembles frames. Three small generic frame additions: a module-owned sequence parser, a per-field availability hook, and the Lanes shape wiring.

**Tech Stack:** Next.js App Router (static export), React, TypeScript (`strict`, `noUncheckedIndexedAccess`), Vitest + Testing Library, plain CSS with `--viz-*` tokens, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-07-caching-strategies-visualizer-design.md` (read it first; also `docs/_meta/visualizer/README.md` and `docs/superpowers/specs/2026-10-07-visualizer-compare-mode-design.md`).

## Global Constraints

- Git is the owner's: no `git add`, `commit` or `push` anywhere in this plan; do not add them.
- Comments are one line only (JS and CSS), never multi-line prose blocks, including in tests.
- No ticket or backlog IDs (`WIKI-…`, `DSA-…`, `SD-…`) in code comments or CSS section headers.
- No `console.*` in committed code; no new runtime dependencies.
- `lib/visualizer/core/` and `components/visualizer/` stay generic: no caching words, strategy names or cache copy there.
- Frames are pure and deterministic: the same inputs and seed always give the same frames. Use `mulberry32` from `core/rng`.
- CSS: tokens only (`--viz-*` aliases and existing wiki tokens), `viz-*` class names, breakpoints only in `css/responsive.css`, no hard-coded colours.
- TypeScript: `noUncheckedIndexedAccess` is on, so every array or record index may be `undefined`; handle it, never use `!` or `as` to silence it.
- Markdown files: one line per paragraph or list item, no hard wrapping.
- Run one test file with `pnpm vitest run --project unit <path>`. Before reporting a task done also run `pnpm typecheck` and `pnpm lint`. Never run the full e2e suite unprompted.
- Compare mode is already in the working tree (`core/compare.ts`, `CompareControl`, `url-state.ts` variants). Re-read any file before editing it; do not undo or restructure compare code.
- The caching article path is `/system-design/components/caching/`; the constant `CACHING_ARTICLE` already exists in `lib/visualizer/eviction/module.ts`.

## Review Focus

- A typed sequence uses a key beyond the Keys slider (`E` with 3 keys): the engine must add that key to the DB and the cards without breaking the reserved card height.
- Crash edge cases: `!` as the first request, two crashes in a row, and a crash with an empty buffer (no lost writes, outcome good).
- Flush every larger than the run length (no flush happens) and Entry lifetime at its minimum of 2 (refresh threshold must stay at least 1).
- A junk URL sequence (`?q=RA!!XZ`) must fall back to a generated sequence, never throw.
- An empty or invalid `sequence` value in `run` (`[]`, `["ZZ"]`) must fall back to the generated sequence, never produce zero frames.

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/visualizer/core/shapes.ts` (modify) | `LanesModel` and its parts; `defaultAxis` and `modelKeys` learn the new kind |
| `lib/visualizer/core/geometry.ts` (modify) | `lanesLayout`, `sectionRows`, lane constants |
| `lib/visualizer/core/fields.ts` (modify) | `SequenceParse`, optional `parse` on the sequence field, `parseSequenceField`, `FieldAvailability` |
| `lib/visualizer/core/url-state.ts` (modify) | use `parseSequenceField` |
| `lib/visualizer/core/types.ts` (modify) | optional `availability` on `VisualizerModule` |
| `components/visualizer/shapes/LanesShape.tsx` (create) | draws lanes, state cards and hops |
| `components/visualizer/shapes/Shape.tsx` (modify) | routes `kind: "lanes"` |
| `components/visualizer/frame/ConfigFields.tsx`, `ConfigPanel.tsx`, `VisualizerApp.tsx` (modify) | module sequence parser, dimmed sliders |
| `css/view-visualizer/stage.css`, `panels.css` (modify) | lanes styles, disabled field |
| `lib/visualizer/caching/types.ts` | ids, token and world types, `StrategyDef` |
| `lib/visualizer/caching/tokens.ts` | sequence parser, token to op |
| `lib/visualizer/caching/trace.ts` | seeded workload generator |
| `lib/visualizer/caching/copy.ts` | per-strategy names, lines, about, tries, anchors |
| `lib/visualizer/caching/strategies/shared.ts` | hop helpers, read and write building blocks, `runOp` |
| `lib/visualizer/caching/strategies/*.ts` | one file per strategy, plus `index.ts` |
| `lib/visualizer/caching/lanes.ts` | world to `LanesModel` |
| `lib/visualizer/caching/engine.ts` | `simulate`: ops to `VizFrame[]` |
| `lib/visualizer/caching/module.ts` | sections, defaults, `run`, `availability` |
| `lib/visualizer/registry.ts`, `modules.ts` (modify) | register the visualizer |

---

### Task 1: Lanes model and geometry (core)

**Files:**
- Modify: `lib/visualizer/core/shapes.ts`
- Modify: `lib/visualizer/core/geometry.ts`
- Test: `lib/visualizer/core/lanes.test.ts` (create)

**Interfaces:**
- Produces: `LaneTone`, `CardItem`, `CardSection`, `Lane`, `Hop`, `LanesModel` (exported from `core/shapes.ts`); `LANES_W`, `CHIPS_PER_ROW`, `CARD_ROW_H`, `sectionRows(s: CardSection): number`, `lanesLayout(laneCount: number, slots: number, cardRows: number): LanesLayout` (exported from `core/geometry.ts`).

- [ ] **Step 1: Write the failing test**

Create `lib/visualizer/core/lanes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CHIPS_PER_ROW, lanesLayout, sectionRows } from "./geometry";
import { defaultAxis, type LanesModel, modelKeys, resolveAxis } from "./shapes";

const model: LanesModel = {
  kind: "lanes",
  lanes: [{ id: "app", name: "App", sections: [] }],
  hops: [],
  slots: 1,
  cardRows: 0,
};

describe("lanes model", () => {
  it("has no axis and no keys", () => {
    expect(defaultAxis(model)).toBeNull();
    expect(resolveAxis(model, true)).toBeNull();
    expect(modelKeys(model)).toEqual([]);
  });
});

describe("sectionRows", () => {
  it("counts a title row plus one row per item for rows", () => {
    const items = [{ text: "A" }, { text: "B" }, { text: "C" }];
    expect(sectionRows({ title: "Entries", layout: "rows", items })).toBe(4);
  });

  it("packs chips into rows of CHIPS_PER_ROW", () => {
    const items = Array.from({ length: CHIPS_PER_ROW + 1 }, (_, i) => ({ text: String(i) }));
    expect(sectionRows({ title: "Buffer", layout: "chips", items })).toBe(3);
    expect(sectionRows({ title: "Buffer", layout: "chips", items: [] })).toBe(1);
  });
});

describe("lanesLayout", () => {
  it("spaces lanes evenly across the width", () => {
    const l = lanesLayout(3, 4, 6);
    expect([0, 1, 2].map((i) => Math.round(l.laneX(i)))).toEqual([107, 320, 533]);
    expect(l.width).toBe(640);
  });

  it("reserves card height from cardRows and places hops below the card", () => {
    const l = lanesLayout(3, 4, 6);
    expect(l.cardW).toBe(190);
    expect(l.cardH).toBe(106);
    expect(l.lifeTop).toBe(162);
    expect(l.hopY(0)).toBe(192);
    expect(l.hopY(1)).toBe(228);
    expect(l.lifeBottom).toBe(336);
    expect(l.height).toBe(366);
  });

  it("collapses the card area when no card rows are reserved", () => {
    const l = lanesLayout(3, 4, 0);
    expect(l.cardH).toBe(0);
    expect(l.lifeTop).toBe(56);
    expect(l.hopY(0)).toBe(86);
  });

  it("grows with the number of hop slots and never goes below one", () => {
    expect(lanesLayout(3, 7, 6).height).toBeGreaterThan(lanesLayout(3, 2, 6).height);
    expect(lanesLayout(3, 0, 6).height).toBe(lanesLayout(3, 1, 6).height);
  });

  it("caps the card width on narrow lane counts", () => {
    expect(lanesLayout(2, 1, 1).cardW).toBe(190);
    expect(lanesLayout(4, 1, 1).cardW).toBe(140);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit lib/visualizer/core/lanes.test.ts`
Expected: FAIL (`lanesLayout` / `LanesModel` not exported).

- [ ] **Step 3: Add the model to `core/shapes.ts`**

Replace the `ShapeModel` union line and the `defaultAxis` / `modelKeys` functions, and add the new types above them. The final bottom half of the file becomes:

```ts
export type LaneTone = "changed" | "stale" | "lost" | "muted";
export interface CardItem {
  text: string;
  tone?: LaneTone;
  bar?: { value: number; max: number };
}
export interface CardSection {
  title: string;
  layout: "rows" | "chips";
  items: CardItem[];
}
export interface Lane {
  id: string;
  name: string;
  dead?: boolean;
  sections: CardSection[];
}
export interface Hop {
  from: string;
  to: string;
  label: string;
  thread: 0 | 1;
  reply?: boolean;
  flag?: boolean;
}
// Hops are drawn top to bottom and numbered by position; slots and cardRows are run-wide so the stage keeps one height.
export interface LanesModel {
  kind: "lanes";
  lanes: Lane[];
  hops: Hop[];
  slots: number;
  cardRows: number;
  note?: string;
}

export type ShapeModel = LinearModel | HistogramModel | RankingModel | RingModel | LanesModel;

export function defaultAxis(model: ShapeModel): Axis | null {
  return model.kind === "ring" || model.kind === "ranking" || model.kind === "lanes"
    ? null
    : model.defaultAxis;
}

export function resolveAxis(model: ShapeModel, rotated: boolean): Axis | null {
  const axis = defaultAxis(model);
  if (axis === null || !rotated) return axis;
  return axis === "vertical" ? "horizontal" : "vertical";
}

export function modelKeys(model: ShapeModel): string[] {
  if (model.kind === "linear") return model.items;
  if (model.kind === "ranking") return model.rows.map((r) => r.key);
  if (model.kind === "lanes") return [];
  return model.slots.flatMap((s) => (s ? [s.key] : []));
}
```

- [ ] **Step 4: Add the geometry to `core/geometry.ts`**

Change the type import at the top to `import type { Axis, CardSection } from "./shapes";` and append at the end of the file:

```ts
export const LANES_W = 640;
export const CHIPS_PER_ROW = 3;
export const CARD_ROW_H = 15;
const CARD_PAD = 8;
const CARD_Y = 48;
const CARD_MAX_W = 190;
const HOP_PITCH = 36;
const HOP_GAP = 30;
const LANES_FOOT = 30;

export function sectionRows(s: CardSection): number {
  return 1 + (s.layout === "rows" ? s.items.length : Math.ceil(s.items.length / CHIPS_PER_ROW));
}

export interface LanesLayout {
  width: number;
  height: number;
  laneX: (i: number) => number;
  cardW: number;
  cardY: number;
  cardH: number;
  lifeTop: number;
  hopY: (i: number) => number;
  lifeBottom: number;
}

export function lanesLayout(laneCount: number, slots: number, cardRows: number): LanesLayout {
  const n = Math.max(1, laneCount);
  const cardH = cardRows > 0 ? CARD_PAD * 2 + cardRows * CARD_ROW_H : 0;
  const lifeTop = CARD_Y + cardH + 8;
  const firstHop = lifeTop + HOP_GAP;
  const lifeBottom = firstHop + Math.max(1, slots) * HOP_PITCH;
  return {
    width: LANES_W,
    height: lifeBottom + LANES_FOOT,
    laneX: (i) => (LANES_W * (i + 0.5)) / n,
    cardW: Math.min(CARD_MAX_W, LANES_W / n - 20),
    cardY: CARD_Y,
    cardH,
    lifeTop,
    hopY: (i) => firstHop + i * HOP_PITCH,
    lifeBottom,
  };
}
```

- [ ] **Step 5: Run the test, then typecheck**

Run: `pnpm vitest run --project unit lib/visualizer/core/lanes.test.ts`
Expected: PASS.

Run: `pnpm typecheck`
Expected: PASS (no other file switches exhaustively over `ShapeModel`; if a `switch` or narrowing now errors, add the `lanes` case there).

---

### Task 2: LanesShape component and styles

**Files:**
- Create: `components/visualizer/shapes/LanesShape.tsx`
- Modify: `components/visualizer/shapes/Shape.tsx`
- Modify: `css/view-visualizer/stage.css`
- Test: `components/visualizer/shapes/LanesShape.test.tsx` (create)

**Interfaces:**
- Consumes: `LanesModel`, `CardSection`, `CardItem` from `core/shapes`; `lanesLayout`, `CARD_ROW_H`, `CHIPS_PER_ROW` from `core/geometry`.
- Produces: `LanesShape({ model, subject })`; `Shape` renders it for `model.kind === "lanes"`.

- [ ] **Step 1: Write the failing test**

Create `components/visualizer/shapes/LanesShape.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LanesModel } from "@/lib/visualizer/core/shapes";
import { LanesShape } from "./LanesShape";
import { Shape } from "./Shape";

const model: LanesModel = {
  kind: "lanes",
  lanes: [
    { id: "app", name: "App", sections: [] },
    {
      id: "cache",
      name: "Cache",
      dead: true,
      sections: [
        {
          title: "Entries",
          layout: "rows",
          items: [
            { text: "A = v2", tone: "stale", bar: { value: 2, max: 5 } },
            { text: "— wiped —", tone: "muted" },
          ],
        },
        { title: "Write buffer", layout: "chips", items: [{ text: "C = v2", tone: "lost" }] },
      ],
    },
    {
      id: "db",
      name: "DB",
      sections: [
        { title: "Rows", layout: "rows", items: [{ text: "A = v1", tone: "changed" }] },
      ],
    },
  ],
  hops: [
    { from: "app", to: "cache", label: "get A", thread: 0 },
    { from: "cache", to: "app", label: "v2 · stale", thread: 0, reply: true, flag: true },
    { from: "cache", to: "db", label: "flush A = v2", thread: 1 },
  ],
  slots: 3,
  cardRows: 7,
  note: "node down",
};

describe("LanesShape", () => {
  it("names the hops in order for screen readers", () => {
    render(<LanesShape model={model} subject="Cache" />);
    expect(
      screen.getByRole("img", {
        name: "Cache: App to Cache get A, Cache to App v2 · stale, Cache to DB flush A = v2",
      }),
    ).toBeTruthy();
  });

  it("falls back to a no-messages label when there are no hops", () => {
    render(<LanesShape model={{ ...model, hops: [] }} subject="Cache" />);
    expect(screen.getByRole("img", { name: "Cache: no messages" })).toBeTruthy();
  });

  it("draws a header per lane and marks the dead one", () => {
    const { container } = render(<LanesShape model={model} subject="Cache" />);
    expect(container.querySelectorAll(".viz-lanes__head")).toHaveLength(3);
    const dead = container.querySelectorAll(".viz-lanes__head.is-dead");
    expect(dead).toHaveLength(1);
    expect(dead[0]?.textContent).toBe("Cache ✕");
  });

  it("draws one numbered hop per message with thread, reply and flag classes", () => {
    const { container } = render(<LanesShape model={model} subject="Cache" />);
    expect(container.querySelectorAll(".viz-lanes__hop")).toHaveLength(3);
    expect(container.querySelectorAll(".viz-lanes__hop--t1")).toHaveLength(1);
    expect(container.querySelectorAll(".viz-lanes__hop.is-reply")).toHaveLength(1);
    expect(container.querySelectorAll(".viz-lanes__hop.is-flag")).toHaveLength(1);
    const nums = [...container.querySelectorAll(".viz-lanes__num")].map((n) => n.textContent);
    expect(nums).toEqual(["1", "2", "3"]);
  });

  it("tones card items, draws chips and an expiry bar", () => {
    const { container } = render(<LanesShape model={model} subject="Cache" />);
    expect(container.querySelector(".viz-lanes__item--stale")?.textContent).toBe("A = v2");
    expect(container.querySelector(".viz-lanes__item--changed")?.textContent).toBe("A = v1");
    expect(container.querySelector(".viz-lanes__chip--lost")).toBeTruthy();
    expect(container.querySelector(".viz-lanes__bar-fill")?.getAttribute("width")).toBe("17.6");
  });

  it("shows the note and the Shape router picks lanes", () => {
    const { container } = render(
      <Shape model={model} rotated={false} size={{ w: 800, h: 600 }} subject="Cache" />,
    );
    expect(container.querySelector(".viz-lanes")).toBeTruthy();
    expect(container.querySelector(".viz-lanes__note")?.textContent).toBe("node down");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit components/visualizer/shapes/LanesShape.test.tsx`
Expected: FAIL (module `./LanesShape` not found).

- [ ] **Step 3: Create `LanesShape.tsx`**

```tsx
import type { ReactNode } from "react";
import { CARD_ROW_H, CHIPS_PER_ROW, lanesLayout } from "@/lib/visualizer/core/geometry";
import type { CardItem, CardSection, LanesModel } from "@/lib/visualizer/core/shapes";

const HEAD_W = 92;
const HEAD_H = 30;
const HEAD_Y = 10;
const CHIP_W = 50;
const CHIP_H = 14;
const CHIP_GAP = 4;
const BAR_W = 44;
const PAD_X = 10;

const itemClass = (base: string, item: CardItem): string => `${base} ${base}--${item.tone ?? "plain"}`;

function cardNodes(sections: CardSection[], cx: number, top: number, w: number): ReactNode[] {
  const nodes: ReactNode[] = [];
  const left = cx - w / 2 + PAD_X;
  const baseline = (row: number): number => top + 8 + (row + 1) * CARD_ROW_H - 3;
  let row = 0;
  for (const s of sections) {
    nodes.push(
      <text key={`${s.title}-title`} className="viz-lanes__title" x={left} y={baseline(row)}>
        {s.title}
      </text>,
    );
    row += 1;
    if (s.layout === "rows") {
      s.items.forEach((item, i) => {
        const y = baseline(row + i);
        nodes.push(
          <text key={`${s.title}-${i}`} className={itemClass("viz-lanes__item", item)} x={left} y={y}>
            {item.text}
          </text>,
        );
        if (item.bar && item.bar.max > 0) {
          const bx = cx + w / 2 - PAD_X - BAR_W;
          nodes.push(
            <g key={`${s.title}-${i}-bar`} className="viz-lanes__bar">
              <rect className="viz-lanes__bar-track" x={bx} y={y - 7} width={BAR_W} height={5} rx={2} />
              <rect
                className="viz-lanes__bar-fill"
                x={bx}
                y={y - 7}
                width={(BAR_W * item.bar.value) / item.bar.max}
                height={5}
                rx={2}
              />
            </g>,
          );
        }
      });
      row += s.items.length;
    } else {
      s.items.forEach((item, i) => {
        const x = left + (i % CHIPS_PER_ROW) * (CHIP_W + CHIP_GAP);
        const y = baseline(row + Math.floor(i / CHIPS_PER_ROW)) - 11;
        nodes.push(
          <g key={`${s.title}-${i}`}>
            <rect className={itemClass("viz-lanes__chip", item)} x={x} y={y} width={CHIP_W} height={CHIP_H} rx={4} />
            <text
              className={itemClass("viz-lanes__chip-text", item)}
              x={x + CHIP_W / 2}
              y={y + 10.5}
              textAnchor="middle"
            >
              {item.text}
            </text>
          </g>,
        );
      });
      row += Math.ceil(s.items.length / CHIPS_PER_ROW);
    }
  }
  return nodes;
}

export function LanesShape({ model, subject }: { model: LanesModel; subject: string }) {
  const layout = lanesLayout(model.lanes.length, model.slots, model.cardRows);
  const xOf = new Map(model.lanes.map((l, i) => [l.id, layout.laneX(i)]));
  const nameOf = new Map(model.lanes.map((l) => [l.id, l.name]));
  const spoken = model.hops.map(
    (h) => `${nameOf.get(h.from) ?? h.from} to ${nameOf.get(h.to) ?? h.to} ${h.label}`,
  );
  return (
    <svg
      className="viz-lanes"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label={`${subject}: ${spoken.join(", ") || "no messages"}`}
    >
      {model.lanes.map((lane, i) => {
        const x = layout.laneX(i);
        const dead = lane.dead ? " is-dead" : "";
        return (
          <g key={lane.id}>
            <g className={`viz-lanes__head${dead}`}>
              <rect x={x - HEAD_W / 2} y={HEAD_Y} width={HEAD_W} height={HEAD_H} rx={9} />
              <text x={x} y={HEAD_Y + 20}>
                {lane.dead ? `${lane.name} ✕` : lane.name}
              </text>
            </g>
            {lane.sections.length > 0 && layout.cardH > 0 && (
              <g className={`viz-lanes__card${dead}`}>
                <rect x={x - layout.cardW / 2} y={layout.cardY} width={layout.cardW} height={layout.cardH} rx={8} />
                {cardNodes(lane.sections, x, layout.cardY, layout.cardW)}
              </g>
            )}
            <line className={`viz-lanes__life${dead}`} x1={x} y1={layout.lifeTop} x2={x} y2={layout.lifeBottom} />
          </g>
        );
      })}
      {model.hops.map((h, i) => {
        const x1 = xOf.get(h.from) ?? 0;
        const x2 = xOf.get(h.to) ?? 0;
        const dir = x2 >= x1 ? 1 : -1;
        const y = layout.hopY(i);
        const base = x2 - dir * 10;
        const cls = [
          "viz-lanes__hop",
          `viz-lanes__hop--t${h.thread}`,
          h.reply && "is-reply",
          h.flag && "is-flag",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <g
            key={`${i}-${h.from}-${h.to}-${h.label}`}
            className={cls}
            style={{ animationDelay: `${i * 0.45}s` }}
          >
            <line x1={x1 + dir * 2} y1={y} x2={base} y2={y} />
            <path className="viz-lanes__tip" d={`M${x2 - dir * 4},${y} L${base},${y - 5} L${base},${y + 5} Z`} />
            <text className="viz-lanes__label" x={(x1 + x2) / 2} y={y - 7} textAnchor="middle">
              {h.label}
            </text>
            <circle className="viz-lanes__badge" cx={x1 + dir * 14} cy={y} r={8.5} />
            <text className="viz-lanes__num" x={x1 + dir * 14} y={y + 0.5} textAnchor="middle" dominantBaseline="central">
              {i + 1}
            </text>
          </g>
        );
      })}
      {model.note && (
        <text className="viz-lanes__note" x={layout.width / 2} y={layout.lifeBottom - 12} textAnchor="middle">
          {model.note}
        </text>
      )}
    </svg>
  );
}
```

- [ ] **Step 4: Route it in `Shape.tsx`**

Add the import `import { LanesShape } from "./LanesShape";` (keep imports alphabetical: after `HistogramShape`, before `LinearShape`) and, directly after the ranking line, add:

```tsx
  if (model.kind === "lanes") return <LanesShape model={model} subject={subject} />;
```

- [ ] **Step 5: Add the styles to `css/view-visualizer/stage.css`**

First run `grep -n "prefers-reduced-motion" css/view-visualizer/*.css css/*.css` and match the existing pattern for the motion rule below. Then append to `stage.css`:

```css
/* ═══════════════════════════════════════════════
   VISUALIZER — LANES SHAPE (actors, state cards, messages)
   ═══════════════════════════════════════════════ */
.viz-lanes {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.viz-lanes__head rect,
.viz-lanes__card rect {
  fill: var(--viz-slot-bg);
  stroke: var(--viz-slot-border);
}
.viz-lanes__head.is-dead rect,
.viz-lanes__card.is-dead rect {
  fill: var(--viz-miss-bg);
  stroke: var(--viz-miss);
}
.viz-lanes__head text {
  fill: var(--text-heading);
  font-size: 13px;
  font-weight: var(--fw-extrabold);
  text-anchor: middle;
}
.viz-lanes__life {
  stroke: var(--border-2);
  stroke-dasharray: 4 5;
}
.viz-lanes__life.is-dead {
  stroke: var(--viz-miss);
}
.viz-lanes__title {
  fill: var(--text-muted);
  font-size: 9.5px;
  letter-spacing: var(--viz-tracking);
  text-transform: uppercase;
}
.viz-lanes__item,
.viz-lanes__chip-text {
  fill: var(--text-body);
  font-family: var(--font-mono);
  font-size: 11.5px;
}
.viz-lanes__chip-text {
  font-size: 10px;
}
.viz-lanes__item--changed,
.viz-lanes__chip-text--changed {
  fill: var(--viz-evict);
  font-weight: 700;
}
.viz-lanes__item--stale {
  fill: var(--viz-miss);
  font-weight: 700;
}
.viz-lanes__item--lost,
.viz-lanes__chip-text--lost {
  fill: var(--viz-miss);
  text-decoration: line-through;
}
.viz-lanes__item--muted,
.viz-lanes__chip-text--muted {
  fill: var(--text-muted);
}
.viz-lanes__chip {
  fill: var(--viz-slot-bg);
  stroke: var(--viz-slot-border);
}
.viz-lanes__chip--changed {
  fill: var(--viz-evict-bg);
  stroke: var(--viz-evict);
}
.viz-lanes__chip--lost {
  fill: var(--viz-miss-bg);
  stroke: var(--viz-miss);
}
.viz-lanes__bar-track {
  fill: var(--border-2);
}
.viz-lanes__bar-fill {
  fill: var(--viz-active);
}
.viz-lanes__hop {
  animation: viz-hop-in 0.5s ease both;
}
@keyframes viz-hop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.viz-lanes__hop line {
  stroke: var(--viz-active);
  stroke-width: 2;
}
.viz-lanes__hop.is-reply line {
  stroke-dasharray: 6 4;
}
.viz-lanes__tip,
.viz-lanes__badge {
  fill: var(--viz-active);
}
.viz-lanes__num {
  fill: var(--viz-on-accent);
  font-size: 10px;
  font-weight: 700;
}
.viz-lanes__label {
  fill: var(--text-body);
  font-family: var(--font-mono);
  font-size: 11px;
}
.viz-lanes__hop--t1 line {
  stroke: var(--viz-evict);
}
.viz-lanes__hop--t1 .viz-lanes__tip,
.viz-lanes__hop--t1 .viz-lanes__badge {
  fill: var(--viz-evict);
}
.viz-lanes__hop--t1 .viz-lanes__num {
  fill: var(--bg);
}
.viz-lanes__hop.is-flag line {
  stroke: var(--viz-miss);
}
.viz-lanes__hop.is-flag .viz-lanes__tip {
  fill: var(--viz-miss);
}
.viz-lanes__hop.is-flag .viz-lanes__label {
  fill: var(--viz-miss);
  font-weight: 700;
}
.viz-lanes__note {
  fill: var(--viz-miss);
  font-size: 12px;
  font-weight: 700;
}
@media (prefers-reduced-motion: reduce) {
  .viz-lanes__hop {
    animation: none;
  }
}
```

- [ ] **Step 6: Run the tests, typecheck and lint**

Run: `pnpm vitest run --project unit components/visualizer/shapes`
Expected: PASS (new tests plus the existing shape tests).

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

---

### Task 3: Module-owned sequence parser

**Files:**
- Modify: `lib/visualizer/core/fields.ts`
- Modify: `lib/visualizer/core/url-state.ts`
- Modify: `components/visualizer/frame/ConfigFields.tsx`
- Test: `lib/visualizer/core/sequence-parse.test.ts` (create), `components/visualizer/frame/sequence-field.test.tsx` (create)

**Interfaces:**
- Produces: `SequenceParse` (`{ ok: true; tokens: string[] } | { ok: false; error: string }`), optional `parse?: (raw: string) => SequenceParse` on `SequenceField`, `parseSequenceField(field: SequenceField, raw: string): SequenceParse`. Eviction behaviour is unchanged (default A–Z parsing, error text "Use letters A–Z").

- [ ] **Step 1: Write the failing tests**

Create `lib/visualizer/core/sequence-parse.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { type FieldSection, parseSequenceField, type SequenceField } from "./fields";
import { encodeState, parseState } from "./url-state";

const plain: SequenceField = {
  kind: "sequence",
  key: "sequence",
  label: "Sequence",
  param: "q",
  maxLen: 40,
  hint: "",
  resetBy: [],
};
const custom: SequenceField = {
  ...plain,
  parse: (raw) =>
    raw.toLowerCase() === "ok" ? { ok: true, tokens: ["OK"] } : { ok: false, error: "nope" },
};

describe("parseSequenceField", () => {
  it("uses A–Z parsing by default", () => {
    expect(parseSequenceField(plain, "ab c")).toEqual({ ok: true, tokens: ["A", "B", "C"] });
    expect(parseSequenceField(plain, "123")).toEqual({ ok: false, error: "Use letters A–Z" });
  });

  it("uses the field's own parser when it has one", () => {
    expect(parseSequenceField(custom, "ok")).toEqual({ ok: true, tokens: ["OK"] });
    expect(parseSequenceField(custom, "zz")).toEqual({ ok: false, error: "nope" });
  });
});

describe("url state with a custom sequence parser", () => {
  const sections: FieldSection[] = [{ title: "", fields: [custom] }];

  it("round-trips tokens the parser accepts", () => {
    const search = encodeState(sections, { sequence: ["OK"] }, { frame: 0, rotated: false });
    expect(search).toBe("?q=OK&i=1");
    expect(parseState(search, sections, { sequence: null }).values.sequence).toEqual(["OK"]);
  });

  it("falls back to the default when the parser rejects the value", () => {
    expect(parseState("?q=zz", sections, { sequence: null }).values.sequence).toBeNull();
  });
});
```

Create `components/visualizer/frame/sequence-field.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SequenceField } from "@/lib/visualizer/core/fields";
import { ConfigField } from "./ConfigFields";

const field: SequenceField = {
  kind: "sequence",
  key: "sequence",
  label: "Sequence",
  param: "q",
  maxLen: 40,
  hint: "Type tokens, press Enter",
  resetBy: [],
  parse: (raw) =>
    raw.trim().toUpperCase() === "GO"
      ? { ok: true, tokens: ["GO"] }
      : { ok: false, error: "Only GO works" },
};

describe("sequence field with a module parser", () => {
  it("shows the parser's error and does not apply a rejected draft", () => {
    const onChange = vi.fn();
    render(<ConfigField field={field} value={null} sequence={["GO"]} onChange={onChange} />);
    const input = screen.getByLabelText("Sequence");
    fireEvent.change(input, { target: { value: "nope" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("Only GO works")).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("applies the parsed tokens on Enter and clears the error on edit", () => {
    const onChange = vi.fn();
    render(<ConfigField field={field} value={null} sequence={["GO"]} onChange={onChange} />);
    const input = screen.getByLabelText("Sequence");
    fireEvent.change(input, { target: { value: "x" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "go" } });
    expect(screen.getByText("Type tokens, press Enter")).toBeTruthy();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["GO"]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run --project unit lib/visualizer/core/sequence-parse.test.ts components/visualizer/frame/sequence-field.test.tsx`
Expected: FAIL (`parseSequenceField` not exported).

- [ ] **Step 3: Extend `core/fields.ts`**

Add `parse` to `SequenceField` and the new exports. Replace the `SequenceField` interface with:

```ts
export type SequenceParse = { ok: true; tokens: string[] } | { ok: false; error: string };
export interface SequenceField extends FieldBase {
  kind: "sequence";
  maxLen: number;
  hint: string;
  resetBy: string[];
  // A module with its own token grammar supplies this; the default reads letters A–Z.
  parse?: (raw: string) => SequenceParse;
}
```

and add after `parseSequence`:

```ts
export function parseSequenceField(field: SequenceField, raw: string): SequenceParse {
  if (field.parse) return field.parse(raw);
  const keys = parseSequence(raw, field.maxLen);
  return keys ? { ok: true, tokens: keys } : { ok: false, error: "Use letters A–Z" };
}
```

- [ ] **Step 4: Use it in `core/url-state.ts`**

Change the import list so `parseSequence` becomes `parseSequenceField`:

```ts
import {
  allFields,
  clampInt,
  type FieldSection,
  type InputValues,
  parseSequenceField,
  SEED_MAX,
} from "./fields";
```

and replace the final `else` branch in `parseState`:

```ts
    } else {
      const parsed = parseSequenceField(f, raw);
      values[f.key] = parsed.ok ? parsed.tokens : null;
    }
```

- [ ] **Step 5: Use it in `ConfigFields.tsx`**

Replace `parseSequence` in the import with `parseSequenceField`, and replace the whole `SequenceInput` function with:

```tsx
// Remounted (keyed by the run) whenever a new sequence arrives, so the draft starts fresh.
function SequenceInput({
  field,
  sequence,
  onChange,
}: FieldProps<SequenceField> & { sequence: string[] }) {
  const id = useId();
  const [draft, setDraft] = useState(() => sequence.join(" "));
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="viz-field">
      <label className="viz-field__label" htmlFor={id}>
        {field.label}
      </label>
      <input
        id={id}
        className="viz-field__seq"
        value={draft}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          const parsed = parseSequenceField(field, draft);
          if (!parsed.ok) {
            setError(parsed.error);
            return;
          }
          setError(null);
          onChange(parsed.tokens);
        }}
      />
      <p className={`viz-field__hint${error ? " is-error" : ""}`}>{error ?? field.hint}</p>
    </div>
  );
}
```

- [ ] **Step 6: Run the tests and the eviction suites**

Run: `pnpm vitest run --project unit lib/visualizer components/visualizer`
Expected: PASS (new tests plus every existing visualizer test, including `config.test.tsx` and `url-state.test.ts`).

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

---

### Task 4: Availability hook (dimmed sliders)

**Files:**
- Modify: `lib/visualizer/core/fields.ts`, `lib/visualizer/core/types.ts`
- Modify: `components/visualizer/frame/ConfigFields.tsx`, `ConfigPanel.tsx`, `VisualizerApp.tsx`
- Modify: `css/view-visualizer/panels.css`
- Test: `components/visualizer/frame/availability.test.tsx` (create)

**Interfaces:**
- Produces: `FieldAvailability` (`{ disabled?: boolean; hint?: string }`) in `core/fields.ts`; `availability?: (values: InputValues, variants: string[]) => Record<string, FieldAvailability>` on `VisualizerModule`; `ConfigPanel` prop `availability?: Record<string, FieldAvailability>`; `ConfigField` prop `availability?: FieldAvailability`.

- [ ] **Step 1: Write the failing test**

Create `components/visualizer/frame/availability.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FieldSection } from "@/lib/visualizer/core/fields";
import { ConfigPanel } from "./ConfigPanel";

const sections: FieldSection[] = [
  {
    title: "Input",
    fields: [
      { kind: "slider", key: "lifetime", label: "Entry lifetime", param: "ttl", min: 2, max: 8 },
      { kind: "slider", key: "flush", label: "Flush every", param: "fl", min: 2, max: 6 },
    ],
  },
];
const values = { lifetime: 5, flush: 3 };

describe("field availability", () => {
  it("dims a slider and shows why", () => {
    render(
      <ConfigPanel
        sections={sections}
        values={values}
        sequence={[]}
        onChange={() => {}}
        availability={{ lifetime: { disabled: true, hint: "Used by read-through." } }}
      />,
    );
    expect((screen.getByLabelText("Entry lifetime") as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText("Used by read-through.")).toBeTruthy();
    expect((screen.getByLabelText("Flush every") as HTMLInputElement).disabled).toBe(false);
  });

  it("leaves everything enabled when no availability is given", () => {
    render(<ConfigPanel sections={sections} values={values} sequence={[]} onChange={() => {}} />);
    expect((screen.getByLabelText("Entry lifetime") as HTMLInputElement).disabled).toBe(false);
  });

  it("still reports changes on an enabled slider", () => {
    const onChange = vi.fn();
    render(
      <ConfigPanel
        sections={sections}
        values={values}
        sequence={[]}
        onChange={onChange}
        availability={{ lifetime: { disabled: true } }}
      />,
    );
    fireEvent.change(screen.getByLabelText("Flush every"), { target: { value: "4" } });
    expect(onChange).toHaveBeenCalledWith("flush", 4);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit components/visualizer/frame/availability.test.tsx`
Expected: FAIL (the disabled assertion fails; `availability` is not a prop yet).

- [ ] **Step 3: Add the type to `core/fields.ts` and the module hook to `core/types.ts`**

In `core/fields.ts`, after the `FieldSection` interface add:

```ts
export interface FieldAvailability {
  disabled?: boolean;
  hint?: string;
}
```

In `core/types.ts`, change the first import to `import type { FieldAvailability, FieldSection, InputValues } from "./fields";` and add to `VisualizerModule`, right after `defaults`:

```ts
  // Per field key, which inputs matter for the current choice; variants is the compare-mode selection (empty in single mode).
  availability?: (values: InputValues, variants: string[]) => Record<string, FieldAvailability>;
```

- [ ] **Step 4: Render it in `ConfigFields.tsx`**

Add `type FieldAvailability` to the `core/fields` import. Replace `SliderInput` with:

```tsx
function SliderInput({
  field,
  value,
  onChange,
  availability,
}: FieldProps<SliderField> & { availability?: FieldAvailability }) {
  const id = useId();
  const v = typeof value === "number" ? value : field.min;
  const disabled = availability?.disabled === true;
  return (
    <div className={`viz-field${disabled ? " is-disabled" : ""}`}>
      <div className="viz-field__row">
        <label className="viz-field__label" htmlFor={id}>
          {field.label}
        </label>
        <b className="viz-field__value">{v}</b>
      </div>
      <input
        id={id}
        className="viz-field__range"
        type="range"
        min={field.min}
        max={field.max}
        value={v}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {disabled && availability?.hint && <p className="viz-field__hint">{availability.hint}</p>}
    </div>
  );
}
```

Add `availability?: FieldAvailability;` to the `ConfigFieldProps` interface, destructure it in `ConfigField`, and pass it to the slider case:

```tsx
    case "slider":
      return (
        <SliderInput field={field} value={value} onChange={onChange} availability={availability} />
      );
```

- [ ] **Step 5: Pass it through `ConfigPanel.tsx` and `VisualizerApp.tsx`**

In `ConfigPanel.tsx` change the first import to `import type { FieldAvailability, FieldSection, FieldValue, InputValues } from "@/lib/visualizer/core/fields";`, add `availability?: Record<string, FieldAvailability>;` to `ConfigPanelProps`, destructure it, and add to the `ConfigField` element: `availability={availability?.[f.key]}`.

In `VisualizerApp.tsx`, directly after the `options` `useMemo`, add:

```tsx
  const availability = useMemo(() => mod.availability?.(values, variants), [mod, values, variants]);
```

and pass `availability={availability}` to the `<ConfigPanel … />` element.

- [ ] **Step 6: Style the disabled field in `css/view-visualizer/panels.css`**

Add after the `.viz-field__range` rule:

```css
.viz-field.is-disabled {
  opacity: 0.45;
}
.viz-field.is-disabled .viz-field__range {
  cursor: not-allowed;
}
```

- [ ] **Step 7: Run the tests, typecheck and lint**

Run: `pnpm vitest run --project unit components/visualizer`
Expected: PASS.

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

---

### Task 5: Caching types, token parser and workload generator

**Files:**
- Create: `lib/visualizer/caching/types.ts`, `lib/visualizer/caching/tokens.ts`, `lib/visualizer/caching/trace.ts`
- Test: `lib/visualizer/caching/tokens.test.ts`, `lib/visualizer/caching/trace.test.ts` (create)

**Interfaces:**
- Consumes: `SequenceParse` (Task 3), `Hop` (Task 1), `mulberry32` from `core/rng`.
- Produces: everything in `types.ts` below; `parseCachingSequence(raw: string): SequenceParse`, `opsOf(tokens: string[]): Op[]`, `SEQUENCE_ERROR`, `MAX_REQUESTS`; `generateSequence(workload: Workload, length: number, keys: number, seed: number): string[]`.

- [ ] **Step 1: Write the failing tests**

Create `lib/visualizer/caching/tokens.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MAX_REQUESTS, opsOf, parseCachingSequence, SEQUENCE_ERROR } from "./tokens";

describe("parseCachingSequence", () => {
  it("reads spaced, lowercase and URL-joined forms the same way", () => {
    const want = { ok: true, tokens: ["RA", "WB", "XC", "!"] };
    expect(parseCachingSequence("ra wb xc !")).toEqual(want);
    expect(parseCachingSequence("RAWBXC!")).toEqual(want);
    expect(parseCachingSequence("RA, WB, XC, !")).toEqual(want);
  });

  it("accepts consecutive crashes", () => {
    expect(parseCachingSequence("!!")).toEqual({ ok: true, tokens: ["!", "!"] });
  });

  it("rejects unknown operations, missing keys and keys past E", () => {
    for (const bad of ["Q1", "R", "RF", "A", "RA Z", ""]) {
      expect(parseCachingSequence(bad), bad).toEqual({ ok: false, error: SEQUENCE_ERROR });
    }
  });

  it("caps the run length", () => {
    const parsed = parseCachingSequence("RA".repeat(MAX_REQUESTS + 20));
    expect(parsed.ok && parsed.tokens.length).toBe(MAX_REQUESTS);
  });
});

describe("opsOf", () => {
  it("splits a token into operation and key, and treats ! as keyless", () => {
    expect(opsOf(["RA", "WB", "XC", "!"])).toEqual([
      { kind: "R", key: "A" },
      { kind: "W", key: "B" },
      { kind: "X", key: "C" },
      { kind: "!", key: "" },
    ]);
  });
});
```

Create `lib/visualizer/caching/trace.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generateSequence } from "./trace";
import { parseCachingSequence } from "./tokens";
import { WORKLOADS } from "./types";

describe("generateSequence", () => {
  it("is deterministic per seed and has the requested length", () => {
    expect(generateSequence("mixed", 12, 3, 0x7f3a)).toEqual(generateSequence("mixed", 12, 3, 0x7f3a));
    expect(generateSequence("mixed", 12, 3, 0x7f3a)).toHaveLength(12);
    expect(generateSequence("mixed", 12, 3, 1)).not.toEqual(generateSequence("mixed", 12, 3, 2));
  });

  it("always produces tokens the parser accepts", () => {
    for (const w of WORKLOADS) {
      const seq = generateSequence(w, 24, 5, 99);
      expect(parseCachingSequence(seq.join(""))).toEqual({ ok: true, tokens: seq });
    }
  });

  it("stays within the requested number of keys", () => {
    const seq = generateSequence("mixed", 24, 2, 5);
    expect(seq.every((t) => t === "!" || "AB".includes(t.charAt(1)))).toBe(true);
  });

  it("puts no race or crash tokens in the plain workloads", () => {
    for (const w of ["read", "mixed", "write"] as const) {
      for (let seed = 0; seed < 20; seed++) {
        expect(generateSequence(w, 24, 3, seed).every((t) => t.startsWith("R") || t.startsWith("W"))).toBe(true);
      }
    }
  });

  it("racing writes produce X tokens and the crash workload exactly one crash", () => {
    const racing = Array.from({ length: 21 }, (_, s) => generateSequence("race", 24, 3, s));
    expect(racing.some((seq) => seq.some((t) => t.startsWith("X")))).toBe(true);
    const crash = generateSequence("crash", 20, 3, 7);
    expect(crash.filter((t) => t === "!")).toHaveLength(1);
    expect(crash[Math.floor(20 * 0.7)]).toBe("!");
  });

  it("read share follows the workload", () => {
    const share = (w: "read" | "write"): number => {
      let reads = 0;
      let total = 0;
      for (let seed = 0; seed < 50; seed++) {
        for (const t of generateSequence(w, 24, 3, seed)) {
          total++;
          if (t.startsWith("R")) reads++;
        }
      }
      return reads / total;
    };
    expect(share("read")).toBeGreaterThan(0.75);
    expect(share("write")).toBeLessThan(0.45);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run --project unit lib/visualizer/caching`
Expected: FAIL (modules not found).

- [ ] **Step 3: Create `types.ts`**

```ts
import type { Rich } from "../core/rich";
import type { Hop } from "../core/shapes";
import type { Experiment, Outcome } from "../core/types";

export const STRATEGY_IDS = [
  "cache-aside",
  "read-through",
  "write-through",
  "write-behind",
  "write-around",
  "refresh-ahead",
] as const;
export type StrategyId = (typeof STRATEGY_IDS)[number];

export const WORKLOADS = ["read", "mixed", "write", "race", "crash"] as const;
export type Workload = (typeof WORKLOADS)[number];

export const KEYS = "ABCDE";

export type LaneId = "app" | "cache" | "db";
export type OpKind = "R" | "W" | "X" | "!";
export interface Op {
  kind: OpKind;
  key: string;
}

export interface Params {
  lifetime: number;
  flushEvery: number;
}

export interface Entry {
  version: number;
  born: number;
}

// One request's view of the system; strategies mutate a private copy and the driver keeps the history.
export interface World {
  tick: number;
  db: Record<string, number>;
  cache: Record<string, Entry>;
  buffer: Record<string, number>;
  stale: number;
  lost: number;
  dbWrites: number;
}

export interface Step {
  hops: Hop[];
  outcome: Outcome;
  badge: string;
  caption: Rich;
  path: number[];
  cost: number;
  note: Rich;
  crashed?: boolean;
  lostKeys?: string[];
}

export interface CachingInput {
  strategy: StrategyId;
  keys: number;
  length: number;
  lifetime: number;
  flushEvery: number;
  workload: Workload;
  seed: number;
  sequence: string[] | null;
}

// Step-line indexes: 0 ask the cache, 1 hit, 2 miss, 3 write, 4 background work.
export interface StrategyMeta {
  id: StrategyId;
  name: string;
  chip: string;
  rule: string;
  lines: string[];
  about: [string, string][];
  tries: Experiment[];
  anchor: string;
  usesLifetime: boolean;
  usesFlush: boolean;
  metricLabel: string;
}

export interface StrategyDef extends StrategyMeta {
  step(w: World, op: Op, p: Params): Step;
}
```

- [ ] **Step 4: Create `tokens.ts`**

```ts
import type { SequenceParse } from "../core/fields";
import { KEYS, type Op, type OpKind } from "./types";

export const SEQUENCE_ERROR = "Use R, W or X plus a key A–E, or !";
export const MAX_REQUESTS = 40;

const KINDS = "RWX";

export function parseCachingSequence(raw: string): SequenceParse {
  const text = raw.toUpperCase().replace(/[\s,]/g, "");
  const tokens: string[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text.charAt(i);
    if (c === "!") {
      tokens.push("!");
      i += 1;
      continue;
    }
    const k = text.charAt(i + 1);
    if (KINDS.includes(c) && k !== "" && KEYS.includes(k)) {
      tokens.push(c + k);
      i += 2;
      continue;
    }
    return { ok: false, error: SEQUENCE_ERROR };
  }
  if (tokens.length === 0) return { ok: false, error: SEQUENCE_ERROR };
  return { ok: true, tokens: tokens.slice(0, MAX_REQUESTS) };
}

export function opsOf(tokens: string[]): Op[] {
  return tokens.map((t): Op => {
    if (t === "!") return { kind: "!", key: "" };
    return { kind: t.charAt(0) as OpKind, key: t.charAt(1) };
  });
}
```

- [ ] **Step 5: Create `trace.ts`**

```ts
import { mulberry32 } from "../core/rng";
import { KEYS, type Workload } from "./types";

const READ_SHARE: Record<Workload, number> = { read: 0.85, mixed: 0.6, write: 0.35, race: 0.65, crash: 0.6 };
const RACE_SHARE = 0.35;
const CRASH_AT = 0.7;

// Independent of the strategy, so one seed gives one sequence under every strategy.
export function generateSequence(
  workload: Workload,
  length: number,
  keys: number,
  seed: number,
): string[] {
  const rand = mulberry32(seed);
  const n = Math.max(0, length);
  const nk = Math.min(KEYS.length, Math.max(1, keys));
  const out = Array.from({ length: n }, () => {
    const key = KEYS.charAt(Math.floor(rand() * nk));
    const isRead = rand() < READ_SHARE[workload];
    const racing = rand() < RACE_SHARE;
    if (!isRead) return `W${key}`;
    return workload === "race" && racing ? `X${key}` : `R${key}`;
  });
  if (workload === "crash" && n > 0) out[Math.floor(n * CRASH_AT)] = "!";
  return out;
}
```

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run --project unit lib/visualizer/caching`
Expected: PASS. If the "read share" or "racing writes" assertions fail for the fixed seeds, the generator constants are wrong: fix the constants, not the tests.

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

---

### Task 6: Strategy copy, shared building blocks, engine, lanes builder, cache-aside

**Files:**
- Create: `lib/visualizer/caching/copy.ts`, `lib/visualizer/caching/strategies/shared.ts`, `lib/visualizer/caching/strategies/cache-aside.ts`, `lib/visualizer/caching/lanes.ts`, `lib/visualizer/caching/engine.ts`, `lib/visualizer/caching/test-helpers.ts`
- Test: `lib/visualizer/caching/strategies/cache-aside.test.ts`, `lib/visualizer/caching/engine.test.ts`, `lib/visualizer/caching/lanes.test.ts` (create)

**Interfaces:**
- Consumes: Task 1 (`LanesModel`, `lanesLayout`-adjacent `CHIPS_PER_ROW`), Task 5 (`types.ts`, `opsOf`).
- Produces: `STRATEGY_META: Record<StrategyId, StrategyMeta>` (`copy.ts`); from `strategies/shared.ts`: `CACHE_RT`, `DB_RT`, `ver`, `hop`, `dbVersion`, `keysOf`, `expireEntries`, `readHit`, `appFillMiss`, `cacheLoadMiss`, `dbOnlyWrite`, `Behaviour`, `runOp`; `cacheAside: StrategyDef`; `buildModel`, `cardRowsFor` (`lanes.ts`); `simulate(def, ops, p, keyCount): VizFrame[]` and `initWorld` (`engine.ts`); test helpers `P`, `run`, `at`, `lanes`, `labels`, `badges`, `metrics`, `varOf`, `section`.

- [ ] **Step 1: Write the test helpers**

Create `lib/visualizer/caching/test-helpers.ts`:

```ts
import type { CardItem, LanesModel } from "../core/shapes";
import type { VizFrame } from "../core/types";
import { simulate } from "./engine";
import { opsOf } from "./tokens";
import type { Params, StrategyDef } from "./types";

export const P: Params = { lifetime: 5, flushEvery: 3 };

export function run(def: StrategyDef, tokens: string, params: Params = P, keys = 3): VizFrame[] {
  return simulate(def, opsOf(tokens.split(" ").filter(Boolean)), params, keys);
}

export function at(frames: VizFrame[], i: number): VizFrame {
  const f = frames[i];
  if (!f) throw new Error(`no frame ${i}`);
  return f;
}

export function lanes(f: VizFrame): LanesModel {
  if (f.model.kind !== "lanes") throw new Error("not a lanes model");
  return f.model;
}

export const labels = (f: VizFrame): string[] => lanes(f).hops.map((h) => h.label);
export const badges = (frames: VizFrame[]): string[] => frames.map((f) => f.badge);
export const metrics = (frames: VizFrame[]): string[] => frames.map((f) => f.metric);
export const varOf = (f: VizFrame, name: string): string | undefined =>
  f.vars.find((v) => v.name === name)?.value;

export function section(f: VizFrame, laneId: string, title: string): CardItem[] {
  const lane = lanes(f).lanes.find((l) => l.id === laneId);
  return lane?.sections.find((s) => s.title === title)?.items ?? [];
}
```

- [ ] **Step 2: Write the failing tests**

Create `lib/visualizer/caching/strategies/cache-aside.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { richText } from "../../core/rich";
import { at, badges, labels, lanes, metrics, run, section, varOf } from "../test-helpers";
import { cacheAside } from "./cache-aside";

describe("cache-aside", () => {
  it("fills on a cold miss, hits next, and invalidates on write", () => {
    const f = run(cacheAside, "RA RA WA RA");
    expect(badges(f)).toEqual(["MISS", "HIT", "WRITE", "MISS"]);
    expect(labels(at(f, 0))).toEqual(["get A", "miss", "read A", "v1", "set A = v1"]);
    expect(labels(at(f, 1))).toEqual(["get A", "v1 · hit"]);
    expect(labels(at(f, 2))).toEqual(["write A = v2", "delete A"]);
    expect(labels(at(f, 3))).toEqual(["get A", "miss", "read A", "v2", "set A = v2"]);
    expect(f.map((x) => x.path)).toEqual([[0, 2], [0, 1], [3], [0, 2]]);
    expect(f.map((x) => varOf(x, "latency (ticks)"))).toEqual(["5", "1", "4", "5"]);
    expect(metrics(f)).toEqual(["0", "0", "0", "0"]);
  });

  it("draws the stale-read race as two threads and counts the stale read that follows", () => {
    const f = run(cacheAside, "XA RA");
    const race = at(f, 0);
    expect(labels(race)).toEqual(["get A", "miss", "read A", "write A = v2", "delete A", "v1", "set A = v1"]);
    const hops = lanes(race).hops;
    expect(hops.map((h) => h.thread)).toEqual([0, 0, 0, 1, 1, 0, 0]);
    expect(hops[6]?.flag).toBe(true);
    expect(race.outcome).toBe("bad");
    expect(race.path).toEqual([0, 2, 3]);
    expect(section(race, "cache", "Entries")).toEqual([{ text: "A = v1", tone: "stale" }]);
    expect(section(race, "db", "Rows")).toContainEqual({ text: "A = v2", tone: "changed" });
    expect(badges(f)).toEqual(["RACE", "STALE HIT"]);
    expect(metrics(f)).toEqual(["0", "1"]);
  });

  it("a later write clears the stale entry", () => {
    const f = run(cacheAside, "XA RA WA RA");
    expect(badges(f)).toEqual(["RACE", "STALE HIT", "WRITE", "MISS"]);
    expect(metrics(f)).toEqual(["0", "1", "1", "1"]);
  });

  it("an X on a key that is already cached says the entry was dropped first", () => {
    const f = run(cacheAside, "RA XA");
    expect(richText(at(f, 1).caption)).toContain("was not in the cache");
    expect(at(f, 1).badge).toBe("RACE");
  });

  it("explains the loop in plain English", () => {
    const f = run(cacheAside, "RA");
    expect(at(f, 0).lines.map(richText)).toEqual([
      "Ask the cache for A.",
      "Hit → return it.",
      "Miss → read the DB, then put it in the cache.",
      "Write → update the DB, then delete the cache key.",
    ]);
  });
});
```

Create `lib/visualizer/caching/engine.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { cacheAside } from "./strategies/cache-aside";
import { at, lanes, P, run, section, varOf } from "./test-helpers";

describe("simulate", () => {
  it("emits one frame per request with its token as the label", () => {
    const f = run(cacheAside, "RA WB XC");
    expect(f.map((x) => x.index)).toEqual([0, 1, 2]);
    expect(f.map((x) => x.label)).toEqual(["R A", "W B", "X C"]);
  });

  it("reserves the run-wide number of hop rows on every frame", () => {
    const f = run(cacheAside, "RA XA");
    expect(f.map((x) => lanes(x).slots)).toEqual([7, 7]);
  });

  it("reports the variables the Step tab shows", () => {
    const f = run(cacheAside, "RA WA");
    expect(f[1]?.vars.map((v) => v.name)).toEqual([
      "request #",
      "request",
      "cache",
      "DB",
      "latency (ticks)",
      "DB writes",
      "stale reads",
    ]);
    expect(varOf(at(f, 1), "DB")).toBe("v2");
    expect(varOf(at(f, 1), "cache")).toBe("—");
    expect(varOf(at(f, 1), "DB writes")).toBe("1");
  });

  it("adds a key past the Keys slider to the DB and the reserved card height", () => {
    const f = run(cacheAside, "RE", P, 3);
    expect(section(at(f, 0), "db", "Rows").map((i) => i.text)).toEqual([
      "A = v1",
      "B = v1",
      "C = v1",
      "E = v1",
    ]);
    expect(lanes(at(f, 0)).cardRows).toBe(5);
  });

  it("is deterministic", () => {
    expect(run(cacheAside, "RA XA RA WA")).toEqual(run(cacheAside, "RA XA RA WA"));
  });
});
```

Create `lib/visualizer/caching/lanes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { sectionRows } from "../core/geometry";
import { cardRowsFor } from "./lanes";
import { cacheAside } from "./strategies/cache-aside";
import { at, lanes, run } from "./test-helpers";

describe("cardRowsFor", () => {
  it("reserves a title plus one row per key, and the buffer section when flushing", () => {
    expect(cardRowsFor(3, false)).toBe(4);
    expect(cardRowsFor(3, true)).toBe(4 + 1 + 1);
    expect(cardRowsFor(5, true)).toBe(6 + 1 + 2);
  });
});

describe("buildModel", () => {
  it("never needs more rows than it reserves", () => {
    const f = run(cacheAside, "RA RB RC XA WB");
    for (const frame of f) {
      const m = lanes(frame);
      for (const lane of m.lanes) {
        const rows = lane.sections.reduce((n, s) => n + sectionRows(s), 0);
        expect(rows).toBeLessThanOrEqual(m.cardRows);
      }
    }
  });

  it("lists App, Cache and DB in order with no card on the App lane", () => {
    const m = lanes(at(run(cacheAside, "RA"), 0));
    expect(m.lanes.map((l) => l.id)).toEqual(["app", "cache", "db"]);
    expect(m.lanes[0]?.sections).toEqual([]);
    expect(m.lanes.every((l) => !l.dead)).toBe(true);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm vitest run --project unit lib/visualizer/caching`
Expected: FAIL (modules not found).

- [ ] **Step 4: Create `copy.ts`**

```ts
import type { StrategyId, StrategyMeta } from "./types";

const ASK = "Ask the cache for {key}.";
const HIT = "Hit → return it.";
const APP_MISS = "Miss → read the DB, then put it in the cache.";
const CACHE_MISS = "Miss → the cache loads it from the DB.";

export const STRATEGY_META: Record<StrategyId, StrategyMeta> = {
  "cache-aside": {
    id: "cache-aside",
    name: "Cache-aside",
    chip: "Lanes",
    rule: "The app checks the cache, and on a miss loads from the DB and fills it.",
    lines: [ASK, HIT, APP_MISS, "Write → update the DB, then delete the cache key."],
    about: [
      ["Cost", "O(1) per request; the app owns the caching code"],
      ["Wins", "simple; the DB stays the source of truth; cache failure degrades to misses"],
      ["Loses", "cold misses hit the DB; a read racing a write can cache an old value"],
      ["Seen in", "Redis or Memcached in front of SQL, most web backends"],
    ],
    tries: [
      {
        title: "Force the stale-read race",
        blurb: "Reads that miss are overlapped by a write — the cache ends up holding the old value.",
        patch: { workload: "race", keys: 3, length: 12, sequence: null },
      },
      {
        title: "A quiet, read-heavy day",
        blurb: "Mostly hits — the cheap path cache-aside is built for.",
        patch: { workload: "read", length: 12, sequence: null },
      },
    ],
    anchor: "cache-aside-lazy-population",
    usesLifetime: false,
    usesFlush: false,
    metricLabel: "Stale reads",
  },
  "read-through": {
    id: "read-through",
    name: "Read-through",
    chip: "Lanes",
    rule: "The cache loads missing keys from the DB itself.",
    lines: [
      "Ask the cache for {key}; the app never talks to the DB.",
      "Hit → the cache returns it.",
      "Miss → the cache loads it from the DB and keeps it.",
      "Write → update the DB only; the cached copy ages out.",
    ],
    about: [
      ["Cost", "O(1) per request; the cache needs a loader"],
      ["Wins", "app code only talks to the cache"],
      ["Loses", "writes bypass the cache, so entries lag until they expire"],
      ["Seen in", "Caffeine, NCache, some Redis client wrappers"],
    ],
    tries: [
      {
        title: "Stale until it expires",
        blurb: "Writes skip the cache, so a cached copy lags until its lifetime ends.",
        patch: { workload: "mixed", lifetime: 6, sequence: null },
      },
      {
        title: "Short lifetime",
        blurb: "A 2-tick lifetime keeps data fresher but sends more reads to the DB.",
        patch: { workload: "mixed", lifetime: 2, sequence: null },
      },
    ],
    anchor: "read-through",
    usesLifetime: true,
    usesFlush: false,
    metricLabel: "Stale reads",
  },
  "write-through": {
    id: "write-through",
    name: "Write-through",
    chip: "Lanes",
    rule: "Every write goes to the cache and the DB before it is acknowledged.",
    lines: [
      ASK,
      HIT,
      CACHE_MISS,
      "Write → update the cache and the DB together, then acknowledge.",
    ],
    about: [
      ["Cost", "writes pay a cache and a DB round trip"],
      ["Wins", "reads always see fresh data"],
      ["Loses", "write latency; every write is cached even if never re-read"],
      ["Seen in", "DynamoDB DAX, ORM second-level caches"],
    ],
    tries: [
      {
        title: "Every write pays twice",
        blurb: "Cache and DB are both written before the acknowledgement — compare latency with write-behind.",
        patch: { workload: "write", sequence: null },
      },
      {
        title: "A crash costs nothing",
        blurb: "The DB already has every write, so losing the cache loses no data.",
        patch: { workload: "crash", sequence: null },
      },
    ],
    anchor: "write-through",
    usesLifetime: false,
    usesFlush: false,
    metricLabel: "Stale reads",
  },
  "write-behind": {
    id: "write-behind",
    name: "Write-behind",
    chip: "Lanes",
    rule: "Acknowledge writes from the cache, flush them to the DB later.",
    lines: [
      ASK,
      HIT,
      CACHE_MISS,
      "Write → update the cache, acknowledge, and queue it for the DB.",
      "Every few requests → flush the queue to the DB in one batch.",
    ],
    about: [
      ["Cost", "writes cost one cache round trip; the DB sees batches"],
      ["Wins", "lowest write latency; repeated writes to a key coalesce"],
      ["Loses", "acknowledged writes are lost if the cache dies before a flush"],
      ["Seen in", "database write buffers, JPA and Hazelcast write-behind stores"],
    ],
    tries: [
      {
        title: "Lose a write",
        blurb: "Crash before the next flush and acknowledged writes vanish.",
        patch: { workload: "crash", flushEvery: 5, sequence: null },
      },
      {
        title: "Fast, batched writes",
        blurb: "Writes cost one cache round trip, and a flush merges repeats into fewer DB writes.",
        patch: { workload: "write", flushEvery: 4, sequence: null },
      },
    ],
    anchor: "write-behind-write-back",
    usesLifetime: false,
    usesFlush: true,
    metricLabel: "Lost writes",
  },
  "write-around": {
    id: "write-around",
    name: "Write-around",
    chip: "Lanes",
    rule: "Writes go to the DB and skip the cache.",
    lines: [ASK, HIT, APP_MISS, "Write → go straight to the DB; the cache is bypassed."],
    about: [
      ["Cost", "writes cost one DB round trip"],
      ["Wins", "write-heavy, rarely re-read data doesn't flood the cache"],
      ["Loses", "a cached copy goes stale after a write until it expires"],
      ["Seen in", "log and event ingestion, bulk loads"],
    ],
    tries: [
      {
        title: "Writes skip the cache",
        blurb: "Writes go straight to the DB, so a cached copy goes stale until it expires.",
        patch: { workload: "mixed", lifetime: 6, sequence: null },
      },
      {
        title: "Write-heavy traffic",
        blurb: "Lots of writes, and the cache is never churned by them.",
        patch: { workload: "write", sequence: null },
      },
    ],
    anchor: "write-around",
    usesLifetime: true,
    usesFlush: false,
    metricLabel: "Stale reads",
  },
  "refresh-ahead": {
    id: "refresh-ahead",
    name: "Refresh-ahead",
    chip: "Lanes",
    rule: "Reload hot entries just before they expire.",
    lines: [
      ASK,
      HIT,
      CACHE_MISS,
      "Write → update the DB only.",
      "Hit on an entry close to expiry → refresh it in the background.",
    ],
    about: [
      ["Cost", "background DB reads for hot keys"],
      ["Wins", "hot keys avoid the miss at expiry"],
      ["Loses", "refreshes keys that may never be read again"],
      ["Seen in", "Caffeine refreshAfterWrite, CDN stale-while-revalidate"],
    ],
    tries: [
      {
        title: "Hot keys never miss",
        blurb: "Reads near expiry refresh the entry in the background.",
        patch: { workload: "read", lifetime: 6, keys: 2, sequence: null },
      },
      {
        title: "Short lifetime, constant refresh",
        blurb: "With a 2-tick lifetime every hit triggers a refresh.",
        patch: { workload: "read", lifetime: 2, sequence: null },
      },
    ],
    anchor: "refresh-ahead",
    usesLifetime: true,
    usesFlush: false,
    metricLabel: "Stale reads",
  },
};
```

- [ ] **Step 5: Create `strategies/shared.ts`**

```ts
import { badText, goodText, keyText, mutedText, type Rich } from "../../core/rich";
import type { Hop } from "../../core/shapes";
import type { LaneId, Op, Params, Step, World } from "../types";

export const CACHE_RT = 1;
export const DB_RT = 3;

export const ver = (n: number): string => `v${n}`;

interface HopOpts {
  reply?: boolean;
  flag?: boolean;
  thread?: 0 | 1;
}

export function hop(from: LaneId, to: LaneId, label: string, o: HopOpts = {}): Hop {
  return { from, to, label, thread: o.thread ?? 0, reply: o.reply ?? false, flag: o.flag ?? false };
}

export const dbVersion = (w: World, key: string): number => w.db[key] ?? 1;

export const keysOf = (rec: Record<string, unknown>): string[] => Object.keys(rec).sort();

export function expireEntries(w: World, p: Params): string[] {
  const gone = keysOf(w.cache).filter((k) => w.tick - (w.cache[k]?.born ?? w.tick) >= p.lifetime);
  for (const k of gone) delete w.cache[k];
  return gone;
}

// Precondition: the cache holds an entry for key.
export function readHit(w: World, key: string, thread: 0 | 1 = 0): Step {
  const have = w.cache[key]?.version ?? 0;
  const db = dbVersion(w, key);
  const stale = have < db;
  if (stale) w.stale++;
  return {
    hops: [
      hop("app", "cache", `get ${key}`, { thread }),
      hop("cache", "app", `${ver(have)} · ${stale ? "stale" : "hit"}`, { reply: true, flag: stale, thread }),
    ],
    outcome: stale ? "bad" : "good",
    badge: stale ? "STALE HIT" : "HIT",
    caption: stale
      ? [keyText(key), " ", badText("stale hit"), " — the cache holds ", keyText(ver(have)), ", the DB has ", keyText(ver(db)), "."]
      : [keyText(key), " ", goodText("hit"), " — answered from the cache."],
    path: [0, 1],
    cost: CACHE_RT,
    note: stale ? [badText("stale")] : [mutedText("—")],
  };
}

// The app reads the DB itself and fills the cache (cache-aside, write-around).
export function appFillMiss(w: World, key: string, thread: 0 | 1 = 0): Step {
  const v = dbVersion(w, key);
  w.cache[key] = { version: v, born: w.tick };
  return {
    hops: [
      hop("app", "cache", `get ${key}`, { thread }),
      hop("cache", "app", "miss", { reply: true, thread }),
      hop("app", "db", `read ${key}`, { thread }),
      hop("db", "app", ver(v), { reply: true, thread }),
      hop("app", "cache", `set ${key} = ${ver(v)}`, { thread }),
    ],
    outcome: "bad",
    badge: "MISS",
    caption: [keyText(key), " ", badText("miss"), " — the app read the DB and filled the cache."],
    path: [0, 2],
    cost: CACHE_RT + DB_RT + CACHE_RT,
    note: ["filled ", keyText(`${key} = ${ver(v)}`)],
  };
}

// The cache loads from the DB itself (read-through and the strategies that pair with it).
export function cacheLoadMiss(w: World, key: string, thread: 0 | 1 = 0): Step {
  const v = dbVersion(w, key);
  w.cache[key] = { version: v, born: w.tick };
  return {
    hops: [
      hop("app", "cache", `get ${key}`, { thread }),
      hop("cache", "db", `load ${key}`, { thread }),
      hop("db", "cache", ver(v), { reply: true, thread }),
      hop("cache", "app", ver(v), { reply: true, thread }),
    ],
    outcome: "bad",
    badge: "MISS",
    caption: [keyText(key), " ", badText("miss"), " — the cache loaded it from the DB."],
    path: [0, 2],
    cost: CACHE_RT + DB_RT,
    note: ["loaded ", keyText(`${key} = ${ver(v)}`)],
  };
}

export const readVia =
  (load: "app" | "cache") =>
  (w: World, key: string): Step =>
    w.cache[key] ? readHit(w, key) : load === "app" ? appFillMiss(w, key) : cacheLoadMiss(w, key);

export function dbOnlyWrite(w: World, key: string, thread: 0 | 1, how: string): Step {
  const n = dbVersion(w, key) + 1;
  w.db[key] = n;
  w.dbWrites++;
  return {
    hops: [hop("app", "db", `write ${key} = ${ver(n)}`, { thread })],
    outcome: "good",
    badge: "WRITE",
    caption: [keyText(key), ` ${how}`],
    path: [3],
    cost: DB_RT,
    note: [keyText(`${key} = ${ver(n)}`)],
  };
}

export interface Behaviour {
  read(w: World, key: string, p: Params): Step;
  write(w: World, key: string, p: Params, thread: 0 | 1): Step;
  race?(w: World, key: string, p: Params): Step;
  after?(w: World, p: Params, step: Step): void;
}

const union = (a: number[], b: number[]): number[] => Array.from(new Set([...a, ...b])).sort((x, y) => x - y);

// A read and a write on one key in one frame, the write drawn as the second thread.
function overlap(b: Behaviour, w: World, key: string, p: Params): Step {
  const r = b.read(w, key, p);
  const wr = b.write(w, key, p, 1);
  return {
    hops: [...r.hops, ...wr.hops],
    outcome: r.outcome,
    badge: "R ∥ W",
    caption: [...r.caption, " A write to the same key overlaps it."],
    path: union(r.path, wr.path),
    cost: r.cost,
    note: wr.note,
  };
}

function crash(w: World): Step {
  const lost = keysOf(w.buffer);
  w.lost += lost.length;
  w.cache = {};
  w.buffer = {};
  const caption: Rich = lost.length
    ? ["Cache node dies. ", badText(`${lost.join(", ")} acknowledged but never flushed`), " — lost."]
    : ["Cache node dies and restarts empty. Nothing lived only in the cache, so ", goodText("nothing is lost"), "."];
  return {
    hops: [],
    outcome: lost.length ? "bad" : "good",
    badge: "CRASH",
    caption,
    path: [],
    cost: 0,
    note: lost.length ? ["lost ", keyText(lost.join(", "))] : [mutedText("—")],
    crashed: true,
    lostKeys: lost,
  };
}

export function runOp(b: Behaviour, w: World, op: Op, p: Params): Step {
  if (op.kind === "!") return crash(w);
  if (w.db[op.key] === undefined) w.db[op.key] = 1;
  let step: Step;
  if (op.kind === "R") step = b.read(w, op.key, p);
  else if (op.kind === "W") step = b.write(w, op.key, p, 0);
  else step = b.race ? b.race(w, op.key, p) : overlap(b, w, op.key, p);
  b.after?.(w, p, step);
  return step;
}
```

- [ ] **Step 6: Create `strategies/cache-aside.ts`**

```ts
import { badText, keyText, type Rich } from "../../core/rich";
import { STRATEGY_META } from "../copy";
import type { StrategyDef } from "../types";
import {
  type Behaviour,
  CACHE_RT,
  DB_RT,
  dbVersion,
  hop,
  readVia,
  runOp,
  ver,
} from "./shared";

const behaviour: Behaviour = {
  read: readVia("app"),
  write(w, key, _p, thread) {
    const n = dbVersion(w, key) + 1;
    w.db[key] = n;
    w.dbWrites++;
    delete w.cache[key];
    return {
      hops: [
        hop("app", "db", `write ${key} = ${ver(n)}`, { thread }),
        hop("app", "cache", `delete ${key}`, { thread }),
      ],
      outcome: "good",
      badge: "WRITE",
      caption: [keyText(key), " written to the DB, then its cache key deleted."],
      path: [3],
      cost: DB_RT + CACHE_RT,
      note: [keyText(`${key} = ${ver(n)}`)],
    };
  },
  // The cache-aside race: the read's old DB answer is cached after the write has already deleted the key.
  race(w, key) {
    const dropped = w.cache[key] !== undefined;
    delete w.cache[key];
    const old = dbVersion(w, key);
    const next = old + 1;
    w.db[key] = next;
    w.dbWrites++;
    w.cache[key] = { version: old, born: w.tick };
    const lead: Rich = dropped ? [keyText(key), " was not in the cache · "] : [];
    return {
      hops: [
        hop("app", "cache", `get ${key}`),
        hop("cache", "app", "miss", { reply: true }),
        hop("app", "db", `read ${key}`),
        hop("app", "db", `write ${key} = ${ver(next)}`, { thread: 1 }),
        hop("app", "cache", `delete ${key}`, { thread: 1 }),
        hop("db", "app", ver(old), { reply: true }),
        hop("app", "cache", `set ${key} = ${ver(old)}`, { flag: true }),
      ],
      outcome: "bad",
      badge: "RACE",
      caption: [
        ...lead,
        "the read's old answer ",
        keyText(ver(old)),
        " is cached after the write's delete; the DB holds ",
        keyText(ver(next)),
        ".",
      ],
      path: [0, 2, 3],
      cost: CACHE_RT + DB_RT + CACHE_RT,
      note: [badText("stale entry cached")],
    };
  },
};

export const cacheAside: StrategyDef = {
  ...STRATEGY_META["cache-aside"],
  step: (w, op, p) => runOp(behaviour, w, op, p),
};
```

- [ ] **Step 7: Create `lanes.ts`**

```ts
import { CHIPS_PER_ROW } from "../core/geometry";
import type { CardItem, Lane, LanesModel } from "../core/shapes";
import { keysOf, ver } from "./strategies/shared";
import type { Params, Step, StrategyDef, World } from "./types";

const text = (key: string, version: number): string => `${key} = ${ver(version)}`;

// A title row plus one row per key, plus the buffer section for strategies that flush.
export function cardRowsFor(distinctKeys: number, usesFlush: boolean): number {
  return 1 + distinctKeys + (usesFlush ? 1 + Math.ceil(distinctKeys / CHIPS_PER_ROW) : 0);
}

function entryItems(def: StrategyDef, before: World, after: World, p: Params, dead: boolean): CardItem[] {
  if (dead) return [{ text: "— wiped —", tone: "muted" }];
  const items: CardItem[] = [];
  for (const k of keysOf(after.cache)) {
    const e = after.cache[k];
    if (!e) continue;
    const item: CardItem = { text: text(k, e.version) };
    if (e.version < (after.db[k] ?? 1)) item.tone = "stale";
    else if (before.cache[k]?.version !== e.version) item.tone = "changed";
    if (def.usesLifetime) item.bar = { value: p.lifetime - (after.tick - e.born), max: p.lifetime };
    items.push(item);
  }
  return items;
}

function bufferItems(before: World, after: World, step: Step): CardItem[] {
  if (step.crashed) {
    return (step.lostKeys ?? []).map((k): CardItem => ({ text: text(k, before.buffer[k] ?? 0), tone: "lost" }));
  }
  return keysOf(after.buffer).map((k) => {
    const item: CardItem = { text: text(k, after.buffer[k] ?? 0) };
    if (before.buffer[k] !== after.buffer[k]) item.tone = "changed";
    return item;
  });
}

function dbItems(before: World, after: World): CardItem[] {
  return keysOf(after.db).map((k) => {
    const item: CardItem = { text: text(k, after.db[k] ?? 1) };
    if (before.db[k] !== after.db[k]) item.tone = "changed";
    return item;
  });
}

export function buildModel(
  def: StrategyDef,
  before: World,
  after: World,
  step: Step,
  p: Params,
  slots: number,
  distinctKeys: number,
): LanesModel {
  const dead = step.crashed === true;
  const cache: Lane = {
    id: "cache",
    name: "Cache",
    dead,
    sections: [{ title: "Entries", layout: "rows", items: entryItems(def, before, after, p, dead) }],
  };
  if (def.usesFlush) {
    cache.sections.push({ title: "Write buffer", layout: "chips", items: bufferItems(before, after, step) });
  }
  const lost = step.lostKeys ?? [];
  return {
    kind: "lanes",
    lanes: [
      { id: "app", name: "App", sections: [] },
      cache,
      { id: "db", name: "DB", sections: [{ title: "Rows", layout: "rows", items: dbItems(before, after) }] },
    ],
    hops: step.hops,
    slots,
    cardRows: cardRowsFor(distinctKeys, def.usesFlush),
    ...(dead
      ? { note: lost.length ? `node down — ${lost.join(", ")} lost` : "node down — restarts empty" }
      : {}),
  };
}
```

- [ ] **Step 8: Create `engine.ts`**

```ts
import { fill, keyText, type Rich } from "../core/rich";
import type { VarRow, VizFrame } from "../core/types";
import { buildModel } from "./lanes";
import { expireEntries, ver } from "./strategies/shared";
import { KEYS, type Op, type Params, type Step, type StrategyDef, type World } from "./types";

export function initWorld(keyNames: string[]): World {
  return {
    tick: 0,
    db: Object.fromEntries(keyNames.map((k) => [k, 1])),
    cache: {},
    buffer: {},
    stale: 0,
    lost: 0,
    dbWrites: 0,
  };
}

const cloneWorld = (w: World): World => JSON.parse(JSON.stringify(w)) as World;

interface Row {
  op: Op;
  i: number;
  before: World;
  after: World;
  step: Step;
  expired: string[];
}

const metricValue = (def: StrategyDef, w: World): number => (def.usesFlush ? w.lost : w.stale);

function toFrame(def: StrategyDef, r: Row, p: Params, slots: number, distinct: number): VizFrame {
  const { op, i, before, after, step, expired } = r;
  const entry = after.cache[op.key];
  const vars: VarRow[] = [
    { name: "request #", value: String(i + 1) },
    { name: "request", value: op.kind === "!" ? "!" : `${op.kind} ${op.key}` },
    { name: "cache", value: entry ? ver(entry.version) : "—" },
    { name: "DB", value: op.key ? ver(after.db[op.key] ?? 1) : "—" },
    { name: "latency (ticks)", value: String(step.cost) },
    { name: "DB writes", value: String(after.dbWrites) },
    ...(def.usesFlush
      ? [{ name: "waiting to flush", value: String(Object.keys(after.buffer).length) }]
      : []),
    { name: def.metricLabel.toLowerCase(), value: String(metricValue(def, after)) },
  ];
  const lead: Rich = expired.length ? [keyText(expired.join(", ")), " expired · "] : [];
  return {
    index: i,
    label: op.kind === "!" ? "!" : `${op.kind} ${op.key}`,
    outcome: step.outcome,
    badge: step.badge,
    caption: [...lead, ...step.caption],
    lines: def.lines.map((l) => fill(l, { key: op.key })),
    path: step.path,
    vars,
    logNote: step.note,
    metric: String(metricValue(def, after)),
    model: buildModel(def, before, after, step, p, slots, distinct),
  };
}

export function simulate(def: StrategyDef, ops: Op[], p: Params, keyCount: number): VizFrame[] {
  const names = KEYS.slice(0, Math.max(1, keyCount)).split("");
  let world = initWorld(names);
  const rows = ops.map((op, i): Row => {
    const before = world;
    const w = cloneWorld(before);
    w.tick = i + 1;
    const expired = def.usesLifetime ? expireEntries(w, p) : [];
    const step = def.step(w, op, p);
    world = w;
    return { op, i, before, after: w, step, expired };
  });
  const distinct = new Set([...names, ...ops.filter((o) => o.key !== "").map((o) => o.key)]).size;
  const slots = Math.max(1, ...rows.map((r) => r.step.hops.length));
  return rows.map((r) => toFrame(def, r, p, slots, distinct));
}
```

- [ ] **Step 9: Run the tests**

Run: `pnpm vitest run --project unit lib/visualizer/caching`
Expected: PASS. If a hand-checked expectation fails, re-derive it from the spec table before changing code; the expectations were traced by hand.

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

---

### Task 7: Read-through, write-through and write-around

**Files:**
- Create: `lib/visualizer/caching/strategies/read-through.ts`, `write-through.ts`, `write-around.ts`
- Test: `lib/visualizer/caching/strategies/read-through.test.ts`, `write-through.test.ts`, `write-around.test.ts` (create)

**Interfaces:**
- Consumes: `Behaviour`, `readVia`, `dbOnlyWrite`, `runOp`, `hop`, `dbVersion`, `ver`, `CACHE_RT`, `DB_RT` from `strategies/shared`; `STRATEGY_META` from `copy`; test helpers from `test-helpers`.
- Produces: `readThrough`, `writeThrough`, `writeAround`: `StrategyDef`.

- [ ] **Step 1: Write the failing tests**

Create `lib/visualizer/caching/strategies/read-through.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { richText } from "../../core/rich";
import { at, badges, labels, lanes, metrics, run, section, varOf } from "../test-helpers";
import { readThrough } from "./read-through";

describe("read-through", () => {
  it("loads through the cache on a miss and serves the next read from it", () => {
    const f = run(readThrough, "RA RA");
    expect(labels(at(f, 0))).toEqual(["get A", "load A", "v1", "v1"]);
    expect(lanes(at(f, 0)).hops.map((h) => `${h.from}>${h.to}`)).toEqual([
      "app>cache",
      "cache>db",
      "db>cache",
      "cache>app",
    ]);
    expect(labels(at(f, 1))).toEqual(["get A", "v1 · hit"]);
    expect(f.map((x) => varOf(x, "latency (ticks)"))).toEqual(["4", "1"]);
  });

  it("writes go to the DB only, so a cached copy stays stale until it expires", () => {
    const f = run(readThrough, "RA WA RA");
    expect(labels(at(f, 1))).toEqual(["write A = v2"]);
    expect(badges(f)).toEqual(["MISS", "WRITE", "STALE HIT"]);
    expect(metrics(f)).toEqual(["0", "0", "1"]);
  });

  it("drops an entry when its lifetime ends and says so", () => {
    const f = run(readThrough, "RA WA RA RA", { lifetime: 2, flushEvery: 3 });
    expect(badges(f)).toEqual(["MISS", "WRITE", "MISS", "HIT"]);
    expect(richText(at(f, 2).caption)).toContain("A expired");
    expect(labels(at(f, 2))).toEqual(["get A", "load A", "v2", "v2"]);
    expect(metrics(f)).toEqual(["0", "0", "0", "0"]);
  });

  it("shows an expiry bar that counts down", () => {
    const f = run(readThrough, "RA RB RA");
    expect(section(at(f, 0), "cache", "Entries")[0]?.bar).toEqual({ value: 5, max: 5 });
    expect(section(at(f, 2), "cache", "Entries").map((i) => i.bar?.value)).toEqual([3, 4]);
  });

  it("runs an overlapped read and write as two threads in one frame", () => {
    const f = run(readThrough, "XA");
    const frame = at(f, 0);
    expect(labels(frame)).toEqual(["get A", "load A", "v1", "v1", "write A = v2"]);
    expect(lanes(frame).hops.map((h) => h.thread)).toEqual([0, 0, 0, 0, 1]);
    expect(frame.badge).toBe("R ∥ W");
    expect(frame.path).toEqual([0, 2, 3]);
  });
});
```

Create `lib/visualizer/caching/strategies/write-through.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { richText } from "../../core/rich";
import { at, badges, labels, lanes, metrics, run, section, varOf } from "../test-helpers";
import { writeThrough } from "./write-through";

describe("write-through", () => {
  it("writes the cache and the DB together before acknowledging", () => {
    const f = run(writeThrough, "WA RA");
    expect(labels(at(f, 0))).toEqual(["set A = v2", "write A = v2", "ok", "ok"]);
    expect(varOf(at(f, 0), "latency (ticks)")).toBe("4");
    expect(varOf(at(f, 0), "DB writes")).toBe("1");
    expect(badges(f)).toEqual(["WRITE", "HIT"]);
    expect(metrics(f)).toEqual(["0", "0"]);
    expect(section(at(f, 0), "cache", "Entries")).toEqual([{ text: "A = v2", tone: "changed" }]);
  });

  it("a crash loses nothing and the next read reloads current data", () => {
    const f = run(writeThrough, "WA WB ! RA");
    const crash = at(f, 2);
    expect(crash.badge).toBe("CRASH");
    expect(crash.outcome).toBe("good");
    expect(richText(crash.caption)).toContain("nothing is lost");
    expect(lanes(crash).lanes[1]?.dead).toBe(true);
    expect(labels(at(f, 3))).toEqual(["get A", "load A", "v2", "v2"]);
    expect(metrics(f)).toEqual(["0", "0", "0", "0"]);
  });
});
```

Create `lib/visualizer/caching/strategies/write-around.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { at, badges, labels, metrics, run, section } from "../test-helpers";
import { writeAround } from "./write-around";

describe("write-around", () => {
  it("fills on the app's own read and bypasses the cache on write", () => {
    const f = run(writeAround, "RA WA RA");
    expect(labels(at(f, 0))).toEqual(["get A", "miss", "read A", "v1", "set A = v1"]);
    expect(labels(at(f, 1))).toEqual(["write A = v2"]);
    expect(badges(f)).toEqual(["MISS", "WRITE", "STALE HIT"]);
    expect(metrics(f)).toEqual(["0", "0", "1"]);
    expect(section(at(f, 1), "cache", "Entries")[0]?.tone).toBe("stale");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run --project unit lib/visualizer/caching/strategies`
Expected: FAIL (strategy modules not found).

- [ ] **Step 3: Create the three strategies**

`strategies/read-through.ts`:

```ts
import { STRATEGY_META } from "../copy";
import type { StrategyDef } from "../types";
import { type Behaviour, dbOnlyWrite, readVia, runOp } from "./shared";

const behaviour: Behaviour = {
  read: readVia("cache"),
  write: (w, key, _p, thread) =>
    dbOnlyWrite(w, key, thread, "written to the DB only; a cached copy keeps its old value until it expires."),
};

export const readThrough: StrategyDef = {
  ...STRATEGY_META["read-through"],
  step: (w, op, p) => runOp(behaviour, w, op, p),
};
```

`strategies/write-around.ts`:

```ts
import { STRATEGY_META } from "../copy";
import type { StrategyDef } from "../types";
import { type Behaviour, dbOnlyWrite, readVia, runOp } from "./shared";

const behaviour: Behaviour = {
  read: readVia("app"),
  write: (w, key, _p, thread) =>
    dbOnlyWrite(w, key, thread, "written straight to the DB, bypassing the cache."),
};

export const writeAround: StrategyDef = {
  ...STRATEGY_META["write-around"],
  step: (w, op, p) => runOp(behaviour, w, op, p),
};
```

`strategies/write-through.ts`:

```ts
import { keyText } from "../../core/rich";
import { STRATEGY_META } from "../copy";
import type { StrategyDef } from "../types";
import { type Behaviour, CACHE_RT, DB_RT, dbVersion, hop, readVia, runOp, ver } from "./shared";

const behaviour: Behaviour = {
  read: readVia("cache"),
  write(w, key, _p, thread) {
    const n = dbVersion(w, key) + 1;
    w.db[key] = n;
    w.dbWrites++;
    w.cache[key] = { version: n, born: w.tick };
    return {
      hops: [
        hop("app", "cache", `set ${key} = ${ver(n)}`, { thread }),
        hop("cache", "db", `write ${key} = ${ver(n)}`, { thread }),
        hop("db", "cache", "ok", { reply: true, thread }),
        hop("cache", "app", "ok", { reply: true, thread }),
      ],
      outcome: "good",
      badge: "WRITE",
      caption: [keyText(key), " written to the cache and the DB together."],
      path: [3],
      cost: CACHE_RT + DB_RT,
      note: [keyText(`${key} = ${ver(n)}`)],
    };
  },
};

export const writeThrough: StrategyDef = {
  ...STRATEGY_META["write-through"],
  step: (w, op, p) => runOp(behaviour, w, op, p),
};
```

- [ ] **Step 4: Run the tests, typecheck and lint**

Run: `pnpm vitest run --project unit lib/visualizer/caching`
Expected: PASS.

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

---

### Task 8: Write-behind (buffer, flush, crash)

**Files:**
- Create: `lib/visualizer/caching/strategies/write-behind.ts`
- Test: `lib/visualizer/caching/strategies/write-behind.test.ts` (create)

**Interfaces:**
- Consumes: `Behaviour` (including the `after` hook), `readVia`, `keysOf`, `dbVersion`, `hop`, `ver`, `CACHE_RT`, `runOp`.
- Produces: `writeBehind: StrategyDef`.

- [ ] **Step 1: Write the failing test**

Create `lib/visualizer/caching/strategies/write-behind.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { richText } from "../../core/rich";
import { at, badges, labels, lanes, metrics, P, run, section, varOf } from "../test-helpers";
import type { Params } from "../types";
import { writeBehind } from "./write-behind";

const wb = (tokens: string, p: Params = P) => run(writeBehind, tokens, p);

describe("write-behind", () => {
  it("acknowledges from the cache and holds the write in the buffer", () => {
    const f = wb("WA");
    expect(labels(at(f, 0))).toEqual(["set A = v2", "ok"]);
    expect(varOf(at(f, 0), "latency (ticks)")).toBe("1");
    expect(section(at(f, 0), "cache", "Write buffer")).toEqual([{ text: "A = v2", tone: "changed" }]);
    expect(section(at(f, 0), "db", "Rows")[0]).toEqual({ text: "A = v1" });
    expect(varOf(at(f, 0), "waiting to flush")).toBe("1");
  });

  it("flushes on every Nth request as a second thread", () => {
    const f = wb("WA WB WA WC !");
    expect(labels(at(f, 2))).toEqual(["set A = v3", "ok", "flush A = v3, B = v2", "ok"]);
    expect(lanes(at(f, 2)).hops.map((h) => h.thread)).toEqual([0, 0, 1, 1]);
    expect(at(f, 2).path).toEqual([3, 4]);
    expect(varOf(at(f, 2), "DB writes")).toBe("2");
    expect(varOf(at(f, 2), "waiting to flush")).toBe("0");
  });

  it("coalesces repeated writes to one key into one DB write", () => {
    const f = wb("WA WA WA");
    expect(labels(at(f, 2))[2]).toBe("flush A = v4");
    expect(varOf(at(f, 2), "DB writes")).toBe("1");
  });

  it("a crash before the next flush loses the buffered write", () => {
    const f = wb("WA WB WA WC !");
    const crash = at(f, 4);
    expect(badges(f)).toEqual(["WRITE", "WRITE", "WRITE", "WRITE", "CRASH"]);
    expect(metrics(f)).toEqual(["0", "0", "0", "0", "1"]);
    expect(crash.outcome).toBe("bad");
    expect(lanes(crash).lanes[1]?.dead).toBe(true);
    expect(lanes(crash).note).toBe("node down — C lost");
    expect(section(crash, "cache", "Entries")).toEqual([{ text: "— wiped —", tone: "muted" }]);
    expect(section(crash, "cache", "Write buffer")).toEqual([{ text: "C = v2", tone: "lost" }]);
    expect(section(crash, "db", "Rows").map((i) => i.text)).toEqual(["A = v3", "B = v2", "C = v1"]);
  });

  it("after a crash the cache is alive but empty, and the lost write stays lost", () => {
    const f = wb("WA WB WA WC ! RC");
    expect(lanes(at(f, 5)).lanes[1]?.dead).toBe(false);
    expect(labels(at(f, 5))).toEqual(["get C", "load C", "v1", "v1"]);
    expect(metrics(f)[5]).toBe("1");
  });

  it("does nothing special when flush-every is longer than the run", () => {
    const f = wb("WA WB WA", { lifetime: 5, flushEvery: 6 });
    expect(f.map((x) => varOf(x, "DB writes"))).toEqual(["0", "0", "0"]);
    expect(varOf(at(f, 2), "waiting to flush")).toBe("2");
    expect(labels(at(f, 2))).toEqual(["set A = v3", "ok"]);
  });

  it("a crash with nothing buffered loses nothing: first request, repeated, or right after a flush", () => {
    const first = wb("! WA");
    expect(at(first, 0).outcome).toBe("good");
    expect(richText(at(first, 0).caption)).toContain("nothing is lost");
    expect(labels(at(first, 1))).toEqual(["set A = v2", "ok"]);
    expect(metrics(first)).toEqual(["0", "0"]);

    const twice = wb("WA ! !");
    expect(metrics(twice)).toEqual(["0", "1", "1"]);
    expect(at(twice, 2).outcome).toBe("good");

    const flushed = wb("WA WA WA !");
    expect(at(flushed, 3).outcome).toBe("good");
    expect(metrics(flushed)).toEqual(["0", "0", "0", "0"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit lib/visualizer/caching/strategies/write-behind.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `strategies/write-behind.ts`**

```ts
import { keyText } from "../../core/rich";
import { STRATEGY_META } from "../copy";
import type { StrategyDef, World } from "../types";
import { type Behaviour, CACHE_RT, dbVersion, hop, keysOf, readVia, runOp, ver } from "./shared";

// The newest version of a key anywhere: DB, buffer or cache.
const latest = (w: World, key: string): number =>
  Math.max(dbVersion(w, key), w.buffer[key] ?? 0, w.cache[key]?.version ?? 0);

const behaviour: Behaviour = {
  read: readVia("cache"),
  write(w, key, _p, thread) {
    const n = latest(w, key) + 1;
    w.cache[key] = { version: n, born: w.tick };
    w.buffer[key] = n;
    return {
      hops: [
        hop("app", "cache", `set ${key} = ${ver(n)}`, { thread }),
        hop("cache", "app", "ok", { reply: true, thread }),
      ],
      outcome: "good",
      badge: "WRITE",
      caption: [keyText(key), " acknowledged from the cache; the DB write is queued."],
      path: [3],
      cost: CACHE_RT,
      note: [keyText(`${key} = ${ver(n)}`)],
    };
  },
  after(w, p, step) {
    const pending = keysOf(w.buffer);
    if (pending.length === 0 || w.tick % p.flushEvery !== 0) return;
    const label = pending.map((k) => `${k} = ${ver(w.buffer[k] ?? 0)}`).join(", ");
    for (const k of pending) w.db[k] = w.buffer[k] ?? dbVersion(w, k);
    w.dbWrites += pending.length;
    w.buffer = {};
    step.hops.push(hop("cache", "db", `flush ${label}`, { thread: 1 }), hop("db", "cache", "ok", { reply: true, thread: 1 }));
    step.path = [...step.path, 4];
    step.caption = [...step.caption, " Flushed ", keyText(pending.join(", ")), " to the DB."];
  },
};

export const writeBehind: StrategyDef = {
  ...STRATEGY_META["write-behind"],
  step: (w, op, p) => runOp(behaviour, w, op, p),
};
```

- [ ] **Step 4: Run the tests, typecheck and lint**

Run: `pnpm vitest run --project unit lib/visualizer/caching`
Expected: PASS.

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

---

### Task 9: Refresh-ahead

**Files:**
- Create: `lib/visualizer/caching/strategies/refresh-ahead.ts`
- Test: `lib/visualizer/caching/strategies/refresh-ahead.test.ts` (create)

**Interfaces:**
- Consumes: `Behaviour`, `readHit`, `cacheLoadMiss`, `dbOnlyWrite`, `dbVersion`, `hop`, `ver`, `runOp`.
- Produces: `refreshAhead: StrategyDef`.

- [ ] **Step 1: Write the failing test**

Create `lib/visualizer/caching/strategies/refresh-ahead.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { richText } from "../../core/rich";
import { at, badges, labels, lanes, metrics, run, section } from "../test-helpers";
import type { Params } from "../types";
import { refreshAhead } from "./refresh-ahead";

const six: Params = { lifetime: 6, flushEvery: 3 };

describe("refresh-ahead", () => {
  it("refreshes a hot key in the last third of its lifetime and never misses again", () => {
    const f = run(refreshAhead, "RA RA RA RA RA RA RA RA RA RA", six);
    expect(f.map((x) => lanes(x).hops.length)).toEqual([4, 2, 2, 2, 4, 2, 2, 2, 4, 2]);
    expect(badges(f)).toEqual(["MISS", ...Array.from({ length: 9 }, () => "HIT")]);
    expect(labels(at(f, 4))).toEqual(["get A", "v1 · hit", "refresh A", "v1"]);
    expect(lanes(at(f, 4)).hops.map((h) => h.thread)).toEqual([0, 0, 1, 1]);
    expect(at(f, 4).path).toEqual([0, 1, 4]);
  });

  it("a refresh brings in the DB's newer value after a write", () => {
    const f = run(refreshAhead, "RA WA RA RA RA RA", six);
    expect(badges(f)).toEqual(["MISS", "WRITE", "STALE HIT", "STALE HIT", "STALE HIT", "HIT"]);
    expect(metrics(f)).toEqual(["0", "0", "1", "2", "3", "3"]);
    expect(labels(at(f, 4))).toEqual(["get A", "v1 · stale", "refresh A", "v2"]);
    expect(section(at(f, 4), "cache", "Entries")).toEqual([
      { text: "A = v2", tone: "changed", bar: { value: 6, max: 6 } },
    ]);
  });

  it("at the minimum lifetime every hit refreshes and the entry never expires while hot", () => {
    const f = run(refreshAhead, "RA RA RA", { lifetime: 2, flushEvery: 3 });
    expect(f.map((x) => lanes(x).hops.length)).toEqual([4, 4, 4]);
    expect(badges(f)).toEqual(["MISS", "HIT", "HIT"]);
  });

  it("an entry nobody reads still expires", () => {
    const f = run(refreshAhead, "RA RB RB RB RB RB RB RA", six);
    expect(at(f, 7).badge).toBe("MISS");
    expect(richText(at(f, 7).caption)).toContain("A expired");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit lib/visualizer/caching/strategies/refresh-ahead.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `strategies/refresh-ahead.ts`**

```ts
import { STRATEGY_META } from "../copy";
import type { StrategyDef } from "../types";
import { type Behaviour, cacheLoadMiss, dbOnlyWrite, dbVersion, hop, readHit, runOp, ver } from "./shared";

// An entry in the last third of its lifetime (at least one tick) is refreshed on a hit.
const refreshWindow = (lifetime: number): number => Math.max(1, Math.ceil(lifetime / 3));

const behaviour: Behaviour = {
  read(w, key, p) {
    const entry = w.cache[key];
    if (!entry) return cacheLoadMiss(w, key);
    const step = readHit(w, key);
    const remaining = p.lifetime - (w.tick - entry.born);
    if (remaining > refreshWindow(p.lifetime)) return step;
    const v = dbVersion(w, key);
    w.cache[key] = { version: v, born: w.tick };
    return {
      ...step,
      hops: [
        ...step.hops,
        hop("cache", "db", `refresh ${key}`, { thread: 1 }),
        hop("db", "cache", ver(v), { reply: true, thread: 1 }),
      ],
      caption: [...step.caption, " Refreshed in the background."],
      path: [...step.path, 4],
    };
  },
  write: (w, key, _p, thread) => dbOnlyWrite(w, key, thread, "written to the DB only."),
};

export const refreshAhead: StrategyDef = {
  ...STRATEGY_META["refresh-ahead"],
  step: (w, op, p) => runOp(behaviour, w, op, p),
};
```

- [ ] **Step 4: Run the tests, typecheck and lint**

Run: `pnpm vitest run --project unit lib/visualizer/caching`
Expected: PASS.

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

---

### Task 10: Strategy index, module, registration and route tests

**Files:**
- Create: `lib/visualizer/caching/strategies/index.ts`, `lib/visualizer/caching/module.ts`
- Modify: `lib/visualizer/registry.ts`, `lib/visualizer/modules.ts`, `app/visualizer.test.tsx`, `tests/content/artifacts.test.ts`
- Test: `lib/visualizer/caching/module.test.ts` (create)

**Interfaces:**
- Consumes: all six strategies (Tasks 6–9), `simulate`, `generateSequence`, `opsOf`, `parseCachingSequence`, `CACHING_ARTICLE` from `eviction/module`, `encodeState`/`parseState` from `core/url-state`.
- Produces: `STRATEGIES: Record<StrategyId, StrategyDef>`; `cachingModule: VisualizerModule`, `CACHING_SECTIONS`, `toCachingInput` (all from `module.ts`).

- [ ] **Step 1: Write the failing module test**

Create `lib/visualizer/caching/module.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { allFields, SEED_MAX } from "../core/fields";
import { encodeState, parseState } from "../core/url-state";
import { CACHING_ARTICLE } from "../eviction/module";
import { CACHING_SECTIONS, cachingModule, toCachingInput } from "./module";
import { STRATEGY_IDS, WORKLOADS } from "./types";

const defaults = (): ReturnType<typeof cachingModule.defaults> => cachingModule.defaults();

describe("caching module", () => {
  it("defaults are valid and the seed is random within range", () => {
    const d = defaults();
    expect(d).toMatchObject({
      strategy: "cache-aside",
      keys: 3,
      length: 12,
      lifetime: 5,
      flushEvery: 3,
      workload: "mixed",
      sequence: null,
    });
    expect(typeof d.seed).toBe("number");
    expect(d.seed as number).toBeLessThanOrEqual(SEED_MAX);
  });

  it("every field key maps onto CachingInput and every strategy and workload has a chip", () => {
    const fields = allFields(CACHING_SECTIONS);
    expect(fields.map((f) => f.key).sort()).toEqual([
      "flushEvery",
      "keys",
      "length",
      "lifetime",
      "seed",
      "sequence",
      "strategy",
      "workload",
    ]);
    const chips = (key: string): string[] => {
      const f = fields.find((x) => x.key === key);
      return f?.kind === "chips" ? f.options.map((o) => o.value) : [];
    };
    expect(chips("strategy")).toEqual([...STRATEGY_IDS]);
    expect(chips("workload")).toEqual([...WORKLOADS]);
  });

  it("runs the selected strategy on a custom sequence", () => {
    const r = cachingModule.run({
      ...defaults(),
      strategy: "write-behind",
      sequence: ["WA", "WA", "WA", "!"],
      flushEvery: 3,
    });
    expect(r.frames).toHaveLength(4);
    expect(r.sequence).toEqual(["WA", "WA", "WA", "!"]);
    expect(r.metricLabel).toBe("Lost writes");
    expect(r.info).toMatchObject({ heading: "Strategy", name: "Write-behind", chip: "Lanes" });
    expect(r.info.articleHref).toBe(`${CACHING_ARTICLE}#write-behind-write-back`);
    expect(r.frames[2]?.vars.find((v) => v.name === "DB writes")?.value).toBe("1");
  });

  it("write-around links to its own article heading", () => {
    const r = cachingModule.run({ ...defaults(), strategy: "write-around", sequence: ["RA"] });
    expect(r.info.articleHref).toBe(`${CACHING_ARTICLE}#write-around`);
    expect(r.metricLabel).toBe("Stale reads");
  });

  it("generates the sequence from workload, length, keys and seed when none is set", () => {
    const v = { ...defaults(), seed: 0x7f3a, length: 20 };
    expect(cachingModule.run(v).sequence).toEqual(cachingModule.run(v).sequence);
    expect(cachingModule.run(v).frames).toHaveLength(20);
  });

  it("falls back to a generated sequence when the given one is empty or invalid", () => {
    expect(cachingModule.run({ ...defaults(), sequence: [] }).frames).toHaveLength(12);
    expect(cachingModule.run({ ...defaults(), sequence: ["ZZ"] }).frames).toHaveLength(12);
  });

  it("toCachingInput falls back on bad values", () => {
    expect(
      toCachingInput({
        strategy: "opt",
        keys: 99,
        length: 0,
        lifetime: "x",
        flushEvery: null,
        workload: "nope",
        seed: -5,
        sequence: ["ZZ"],
      }),
    ).toEqual({
      strategy: "cache-aside",
      keys: 5,
      length: 8,
      lifetime: 5,
      flushEvery: 3,
      workload: "mixed",
      seed: 0,
      sequence: null,
    });
  });

  it("one sequence runs through every strategy with the same frame count and sequence", () => {
    const sequence = ["RA", "WB", "XC", "!", "RA", "XA"];
    const runs = STRATEGY_IDS.map((strategy) => cachingModule.run({ ...defaults(), strategy, sequence }));
    for (const r of runs) {
      expect(r.frames).toHaveLength(6);
      expect(r.sequence).toEqual(sequence);
    }
  });
});

describe("availability", () => {
  const availability = (strategy: string, variants: string[] = []) =>
    cachingModule.availability?.({ ...defaults(), strategy }, variants) ?? {};

  it("dims both time sliders for cache-aside and write-through", () => {
    for (const s of ["cache-aside", "write-through"]) {
      expect(availability(s).lifetime?.disabled).toBe(true);
      expect(availability(s).flushEvery?.disabled).toBe(true);
    }
  });

  it("enables lifetime for read-through, write-around and refresh-ahead only", () => {
    for (const s of ["read-through", "write-around", "refresh-ahead"]) {
      expect(availability(s).lifetime?.disabled).toBeFalsy();
      expect(availability(s).flushEvery?.disabled).toBe(true);
    }
    expect(availability("write-behind").flushEvery?.disabled).toBeFalsy();
    expect(availability("write-behind").lifetime?.disabled).toBe(true);
  });

  it("in compare mode a slider is dimmed only when no selected strategy uses it", () => {
    const both = availability("cache-aside", ["cache-aside", "write-behind"]);
    expect(both.flushEvery?.disabled).toBeFalsy();
    expect(both.lifetime?.disabled).toBe(true);
    const other = availability("cache-aside", ["cache-aside", "refresh-ahead"]);
    expect(other.lifetime?.disabled).toBeFalsy();
  });

  it("explains why a slider is dimmed", () => {
    expect(availability("cache-aside").flushEvery?.hint).toBe("Used by write-behind.");
  });
});

describe("url state", () => {
  const compare = cachingModule.compare;

  it("round-trips a token sequence and the compare selection", () => {
    const values = { ...defaults(), seed: 0x1234, sequence: ["RA", "WB", "XC", "!"] };
    const search = encodeState(
      CACHING_SECTIONS,
      values,
      { frame: 2, rotated: false, variants: ["cache-aside", "write-behind"] },
      compare,
    );
    const back = parseState(search, CACHING_SECTIONS, defaults(), compare);
    expect(back.values.sequence).toEqual(["RA", "WB", "XC", "!"]);
    expect(back.values.seed).toBe(0x1234);
    expect(back.view.variants).toEqual(["cache-aside", "write-behind"]);
    expect(back.view.frame).toBe(2);
  });

  it("a junk sequence in the URL falls back to the default instead of throwing", () => {
    const back = parseState("?q=RA!!XZ", CACHING_SECTIONS, defaults(), compare);
    expect(back.values.sequence).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit lib/visualizer/caching/module.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Create `strategies/index.ts`**

```ts
import type { StrategyDef, StrategyId } from "../types";
import { cacheAside } from "./cache-aside";
import { readThrough } from "./read-through";
import { refreshAhead } from "./refresh-ahead";
import { writeAround } from "./write-around";
import { writeBehind } from "./write-behind";
import { writeThrough } from "./write-through";

export const STRATEGIES: Record<StrategyId, StrategyDef> = {
  "cache-aside": cacheAside,
  "read-through": readThrough,
  "write-through": writeThrough,
  "write-behind": writeBehind,
  "write-around": writeAround,
  "refresh-ahead": refreshAhead,
};
```

- [ ] **Step 4: Create `module.ts`**

```ts
import {
  allFields,
  clampInt,
  type FieldAvailability,
  type FieldSection,
  type InputValues,
  SEED_MAX,
} from "../core/fields";
import { randomSeed } from "../core/rng";
import type { InfoContent, RunResult, VisualizerModule } from "../core/types";
import { CACHING_ARTICLE } from "../eviction/module";
import { simulate } from "./engine";
import { STRATEGIES } from "./strategies";
import { MAX_REQUESTS, opsOf, parseCachingSequence } from "./tokens";
import { generateSequence } from "./trace";
import {
  type CachingInput,
  STRATEGY_IDS,
  type StrategyDef,
  type StrategyId,
  WORKLOADS,
  type Workload,
} from "./types";

const WORKLOAD_LABELS: Record<Workload, string> = {
  read: "Read-heavy",
  mixed: "Mixed",
  write: "Write-heavy",
  race: "Racing writes",
  crash: "Cache crash",
};

export const CACHING_SECTIONS: FieldSection[] = [
  {
    title: "Strategy",
    fields: [
      {
        kind: "chips",
        key: "strategy",
        label: "Strategy",
        param: "st",
        hideLabel: true,
        options: STRATEGY_IDS.map((id) => ({ value: id, label: STRATEGIES[id].name })),
      },
    ],
  },
  {
    title: "Input",
    fields: [
      { kind: "slider", key: "keys", label: "Keys", param: "k", min: 2, max: 5 },
      { kind: "slider", key: "length", label: "Requests", param: "n", min: 8, max: 24 },
      { kind: "slider", key: "lifetime", label: "Entry lifetime", param: "ttl", min: 2, max: 8 },
      { kind: "slider", key: "flushEvery", label: "Flush every", param: "fl", min: 2, max: 6 },
      {
        kind: "chips",
        key: "workload",
        label: "Workload",
        param: "w",
        options: WORKLOADS.map((w) => ({ value: w, label: WORKLOAD_LABELS[w] })),
      },
      {
        kind: "sequence",
        key: "sequence",
        label: "Sequence",
        param: "q",
        maxLen: MAX_REQUESTS,
        hint: "R read · W write · X read ∥ write, then key A–E · ! crash. Enter to apply",
        resetBy: ["workload", "length", "keys", "seed"],
        parse: parseCachingSequence,
      },
    ],
  },
  { title: "", fields: [{ kind: "seed", key: "seed", label: "Seed", param: "s" }] },
];

const num = (x: unknown, fallback: number): number =>
  typeof x === "number" && Number.isFinite(x) ? x : fallback;

function sliderBounds(key: string): { min: number; max: number } {
  const field = allFields(CACHING_SECTIONS).find((f) => f.kind === "slider" && f.key === key);
  if (!field || field.kind !== "slider") throw new Error(`missing slider field: ${key}`);
  return { min: field.min, max: field.max };
}

const KEYS_RANGE = sliderBounds("keys");
const LENGTH_RANGE = sliderBounds("length");
const LIFETIME_RANGE = sliderBounds("lifetime");
const FLUSH_RANGE = sliderBounds("flushEvery");

const clampSlider = (v: unknown, fallback: number, r: { min: number; max: number }): number =>
  clampInt(num(v, fallback), r.min, r.max);

export function toCachingInput(v: InputValues): CachingInput {
  const parsed = Array.isArray(v.sequence) ? parseCachingSequence(v.sequence.join("")) : null;
  return {
    strategy: STRATEGY_IDS.find((s) => s === v.strategy) ?? "cache-aside",
    keys: clampSlider(v.keys, 3, KEYS_RANGE),
    length: clampSlider(v.length, 12, LENGTH_RANGE),
    lifetime: clampSlider(v.lifetime, 5, LIFETIME_RANGE),
    flushEvery: clampSlider(v.flushEvery, 3, FLUSH_RANGE),
    workload: WORKLOADS.find((w) => w === v.workload) ?? "mixed",
    seed: clampInt(num(v.seed, 0), 0, SEED_MAX),
    sequence: parsed?.ok ? parsed.tokens : null,
  };
}

const isStrategy = (s: string): s is StrategyId => STRATEGY_IDS.some((id) => id === s);

function availability(values: InputValues, variants: string[]): Record<string, FieldAvailability> {
  const ids = (variants.length ? variants : [String(values.strategy)]).filter(isStrategy);
  const anyUses = (pick: (d: StrategyDef) => boolean): boolean => ids.some((id) => pick(STRATEGIES[id]));
  return {
    lifetime: anyUses((d) => d.usesLifetime)
      ? {}
      : { disabled: true, hint: "Used by read-through, write-around and refresh-ahead." },
    flushEvery: anyUses((d) => d.usesFlush) ? {} : { disabled: true, hint: "Used by write-behind." },
  };
}

function infoOf(def: StrategyDef): InfoContent {
  return {
    heading: "Strategy",
    name: def.name,
    chip: def.chip,
    rule: def.rule,
    about: def.about,
    tries: def.tries,
    articleHref: `${CACHING_ARTICLE}#${def.anchor}`,
  };
}

export const cachingModule: VisualizerModule = {
  slug: "caching-strategies",
  title: "Caching strategies",
  subtitle: "How data gets into a cache — and what goes wrong.",
  unit: "request",
  subject: "Cache",
  compare: { key: "strategy", max: 3 },
  sections: CACHING_SECTIONS,
  defaults: () => ({
    strategy: "cache-aside",
    keys: 3,
    length: 12,
    lifetime: 5,
    flushEvery: 3,
    workload: "mixed",
    seed: randomSeed(),
    sequence: null,
  }),
  availability,
  run(values): RunResult {
    const input = toCachingInput(values);
    const tokens =
      input.sequence ?? generateSequence(input.workload, input.length, input.keys, input.seed);
    const def = STRATEGIES[input.strategy];
    return {
      frames: simulate(
        def,
        opsOf(tokens),
        { lifetime: input.lifetime, flushEvery: input.flushEvery },
        input.keys,
      ),
      info: infoOf(def),
      metricLabel: def.metricLabel,
      sequence: tokens,
    };
  },
};
```

- [ ] **Step 5: Run the module test**

Run: `pnpm vitest run --project unit lib/visualizer/caching`
Expected: PASS.

- [ ] **Step 6: Register the visualizer**

In `lib/visualizer/registry.ts` append to the `VISUALIZERS` array, after the eviction entry:

```ts
  {
    slug: "caching-strategies",
    title: "Caching strategies",
    description:
      "Cache-aside, read-through, write-through, write-behind, write-around and refresh-ahead — watch each move data and see where it breaks.",
    icon: "⚡",
  },
```

In `lib/visualizer/modules.ts` add the import `import { cachingModule } from "./caching/module";` (keep imports ordered) and the entry `[cachingModule.slug]: cachingModule,` after the eviction entry.

- [ ] **Step 7: Update the route test in `app/visualizer.test.tsx`**

Change the static-params assertion to:

```tsx
    expect(generateStaticParams()).toEqual([
      { slug: "eviction-policies" },
      { slug: "caching-strategies" },
    ]);
```

Add inside the `metadata` test, after the eviction assertions:

```tsx
    const caching = await generateMetadata({ params: Promise.resolve({ slug: "caching-strategies" }) });
    expect(caching.title).toBe("Caching strategies");
    expect(caching.alternates?.canonical).toBe(`${CANONICAL_BASE}/visualizer/caching-strategies/`);
```

Add inside the `landing` test, after the eviction assertions:

```tsx
    expect(html).toMatch(/href="\/visualizer\/caching-strategies\/?"/);
    expect(html).toContain("Caching strategies");
```

Add a new test at the end of the `describe`:

```tsx
  it("the caching page ships the app shell without a baked-in run", async () => {
    const page = await VisualizerPage({ params: Promise.resolve({ slug: "caching-strategies" }) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain("viz-app--loading");
    expect(html).not.toContain("viz-lanes");
  });
```

- [ ] **Step 8: Add the article-anchor check to `tests/content/artifacts.test.ts`**

Add the imports next to the eviction import:

```ts
import { STRATEGIES } from "../../lib/visualizer/caching/strategies";
```

and a new test after the eviction deep-link test:

```ts
  it("caching-strategies visualizer deep links resolve to caching article headings", () => {
    const manifest = manifestSchema.parse(readJson("manifest.json"));
    const article = manifest.articles.find(
      (a) => `/${a.verticalId}/${a.slug.join("/")}/` === CACHING_ARTICLE,
    );
    expect(article, CACHING_ARTICLE).toBeDefined();
    const ids = new Set(article?.headings.map((h) => h.id));
    for (const def of Object.values(STRATEGIES)) expect(ids.has(def.anchor), def.anchor).toBe(true);
  });
```

- [ ] **Step 9: Run the route and content tests**

Run: `pnpm vitest run --project unit app/visualizer.test.tsx`
Expected: PASS. If another test fails because it counts visualizers (search for `VISUALIZERS` or "visualizer" counts in `app/` and `components/home/` tests), update that expectation from 1 to 2.

Run: `pnpm vitest run --project content tests/content/artifacts.test.ts`
Expected: PASS. If an anchor assertion fails, read the real heading id from `lib/content/generated/manifest.json` (the caching article's `headings`) and fix `anchor` in `lib/visualizer/caching/copy.ts`; do not weaken the test.

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

---

### Task 11: End-to-end check, docs and final verification

**Files:**
- Modify: `tests/e2e/test_visualizer.py`, `docs/_meta/visualizer/README.md`, `docs/_meta/visualizer/backlog.md`, `CLAUDE.md`

- [ ] **Step 1: Add the e2e test**

Append to `tests/e2e/test_visualizer.py`:

```python
CACHING = "/visualizer/caching-strategies/"


def test_caching_strategies_dims_unused_sliders_and_switches_the_metric(page, base_url):
    """lifetime and flush-every are dimmed for cache-aside; write-behind enables flush-every and shows lost writes."""
    page.goto(f"{base_url}{CACHING}?st=cache-aside&q=XARA")
    expect(page.get_by_role("heading", level=1, name="Caching strategies")).to_be_visible()
    expect(page.locator(".viz-lanes")).to_be_visible()
    expect(page.get_by_label("Entry lifetime")).to_be_disabled()
    expect(page.get_by_label("Flush every")).to_be_disabled()
    expect(page.locator(".viz-stage__metric-label")).to_have_text("Stale reads")
    page.get_by_role("button", name="Write-behind").click()
    expect(page.get_by_label("Flush every")).to_be_enabled()
    expect(page.locator(".viz-stage__metric-label")).to_have_text("Lost writes")
```

- [ ] **Step 2: Run only the new e2e test**

Run: `pnpm build:e2e` once, then `PLAYWRIGHT_BROWSERS_PATH=$HOME/Library/Caches/ms-playwright .venv/bin/python3 -m pytest tests/e2e/test_visualizer.py -k caching_strategies -q`
Expected: PASS. Do not run the rest of the e2e suite.

- [ ] **Step 3: Update `docs/_meta/visualizer/README.md`**

Re-read the file first (it may have changed). Then, with Edit:
- In the roadmap list, delete the whole bullet beginning `- **Caching strategies** visualizer`.
- In the shape library table, replace the row beginning `| **Lanes** (planned)` with:
  `| **Lanes** | actor lanes (App / Cache / DB) with state cards under each header and numbered messages between them | caching strategies | TCP handshake, consensus rounds, message queues, auth flows |`

- [ ] **Step 4: Update `docs/_meta/visualizer/backlog.md`**

Delete the `| Caching Strategies | … |` row (it has shipped). Leave the other topics.

- [ ] **Step 5: Update the FILE MAP in `CLAUDE.md`**

In the `components/` table, change the `visualizer/shapes/` row text to `Data-structure shapes (`LinearShape`, `RankingShape`, `HistogramShape`, `RingShape`, `LanesShape`) picked by `Shape``. In the `lib/` table, add after the `lib/visualizer/eviction/` row:
`| `lib/visualizer/caching/` | Caching-strategies module: `strategies/*` (one file per strategy), `engine` (frames), `lanes` (world → lanes model), `tokens`, `trace`, `copy` |`

- [ ] **Step 6: Full verification**

Run each and confirm green: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:content`.
Expected: all PASS with no skipped or flaky tests; if any fails, investigate and fix the cause rather than rerunning.

- [ ] **Step 7: Manual browser check**

Run `pnpm dev` and open `/visualizer/caching-strategies/`. Confirm, in both light and dark themes:
- The default run autoplays; each step fades hops in order and the corner label reads "Stale reads".
- Racing writes with cache-aside shows the dashed race step, the red `set` hop and a stale entry card; stepping on to a hit on that key bumps the number.
- Write-behind plus Cache crash shows the dead Cache lane, struck-through buffer chips and "Lost writes" going to 1.
- Entry lifetime and Flush every are dimmed with a hint when unused and active when used.
- Refresh-ahead shows expiry bars shrinking and the two-hop refresh in the second colour.
- Compare mode with three strategies: every tile keeps its own metric label and the same sequence; the lifetime slider is active if any selected strategy uses it.
- Width 320px: nothing overflows. With `prefers-reduced-motion`: no autoplay and no fade.
- Typing `RA WB XC !` into Sequence and pressing Enter applies it; typing `Q1` shows the error text.
Fix any defect found at its cause and add a test for it.
