---
role: plan
created: 2026-11-14
last_updated: 2026-11-15
status: in-progress
---

# Data Partitioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Data Partitioning visualizer at `/visualizer/data-partitioning/` with five variants (Mod-N, Range, Consistent hashing with a virtual-nodes input, Directory, Rendezvous), each with a looping Revision card, plus the generic shapes it needs.

**Architecture:** Pure engines under `lib/visualizer/data-partitioning/` place keys on nodes, apply add-node and remove-node events, and emit one step per placement, per event and per key re-check. A view adapter turns each step into a generic shape model: Bins (Mod-N), Circle (the ring), Runs (Range) and Table (Directory and Rendezvous). Every stage holds one picture.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest + Testing Library, pnpm, plain CSS with `--viz-*` tokens.

**Specs:** `docs/superpowers/specs/2026-11-14-backlog-visualizers-design.md` (stage layout, shapes, "Data Partitioning decisions") is the authority. `docs/superpowers/specs/2026-10-10-data-partitioning-visualizer-design.md` supplies the engine rules (hashing, schemes, parameters, workloads, step model, metric, vars, copy, article links) and is used only where the table below says so. Read `docs/_meta/visualizer/README.md` and CONVENTIONS.md § Visualizer, § CSS and § Testing first. Pattern to follow: `2026-11-14-hash-table.md` (engines, view, module, revision, docs).

**Prerequisite:** none for Part A (new files only). Part B edits shared files that other plans also touch.

## What is taken from the old spec

| Old spec section | Use |
|---|---|
| Step model | Kept (see Review items 1). |
| Hashing: `h(k) = (37k + 11) mod 100`, node positions, the virtual-node table, ring ownership, rendezvous score | Kept as written. Keys 0 to 99 and a 0 to 99 hash space match the decision. |
| Schemes table | Kept for Mod-N, Range, Directory, Ring, Virtual nodes, Rendezvous. Bounded-load is dropped (not in the backlog topic). |
| Parameters, workload generator, grammar and errors | Kept; the Cap factor row goes. The Virtual nodes chip applies to the Ring variant (see Task 1). |
| Metric and variables | Kept; the Bounded-load row goes. |
| Frame changes 1, 2, 4, 5, 6, 7, 8 | Kept (Task 3). Composite `side` (3) and Ranking suffix (9) are dropped. |
| Views, Generic layer (Bins, Scale, Table, Composite side) | Superseded by the shapes below. |
| Revision | Kept: the mini-run, the card table and the glossary terms for the five variants; five cards. |
| Module content, Try presets, article links | Kept for the five variants; Bounded-load rows go. Ring and Virtual nodes become one variant, so its presets are rewritten around the input. |

## Global Constraints

- Generic code (`components/visualizer/**`, `lib/visualizer/core/**`) uses structural words only (bin, item, point, arc, anchor, run, brace, walk, row, meter, mark, new, removed, changed); key, node, hash, shard, scheme, ring and rendezvous live under `lib/visualizer/data-partitioning/`.
- Shapes are chosen for what teaches the student best: extend an existing shape when one fits, otherwise write a new one.
- The stage holds ONE picture that fills it and scales uniformly with it (`FitBox` / `fitScale`, capped at `--viz-fit-scale-max`); no second block beside it. Counters go to the corner metric and frame `vars`. No colour legend.
- Every node has its own colour and keeps it in every picture. Colours only via `--viz-*` tokens, checked in every theme preset. White ring on a key that changed owner.
- Every change gets its own step: a placement, an event, a re-check. No step skips a change.
- Frames are pure and deterministic from the inputs and the seed. Comments and docstrings are one line. No ticket IDs in code or CSS. No `console.*`. Step copy is plain English, never source code.
- Tests are written with the code, fixture-first against hand-checked values, never against the implementation's output. Run the whole suite once at the end (Task 9). No git steps anywhere; the user owns version control.

## Fixtures (hand-checked in the old spec; re-check by hand before pinning)

Keys `12 18 29 61 65 66 79 97`, three starting nodes A B C, one Add (D). Hashes are `55 77 84 68 16 53 34 0`.

| Variant | Start | After Add D | Moved |
|---|---|---|---|
| Mod-N | A 29 97 · B 12 65 79 · C 18 61 66 | A 29 61 65 97 · B 18 66 · C 79 · D 12 | 6/8: 12 18 61 65 66 79 |
| Range | A[0–32] 12 18 29 · B[33–65] 61 65 · C[66–99] 66 79 97 | A[0–17] 12 · D[18–32] 18 29 · B 61 65 · C 66 79 97 | 2/8: 18 29 |
| Directory | A 12 61 79 · B 18 65 97 · C 29 66 | A 12 61 · B 18 65 · C 29 66 · D 79 97 | 2/8: 79 97 |
| Ring (1 virtual node) | A 79 · B 12 18 29 61 66 · C 65 97 | A 79 · B 18 29 61 · C 65 97 · D 12 66 | 2/8: 12 66 |
| Ring (4 virtual nodes) | A 79 97 · B 12 29 65 66 · C 18 61 | A 79 97 · B 29 65 · C 18 61 · D 12 66 | 2/8: 12 66 |
| Rendezvous | A 29 · B 12 18 65 79 · C 61 66 97 | A — · B 12 18 65 79 · C 61 66 · D 29 97 | 2/8: 29 97 |

Step count per run is K + E × (1 + K): 17 for the default (8 + 1 + 8). Ring shares for three nodes at 1, 2, 4, 8 virtual nodes: 26/37/37, 29/39/32, 38/30/32, 33/33/34 percent.

## Review items (all eight decided: the suggestion under each was accepted)

1. **Step granularity.** The old spec re-checks every key one step at a time after an event. The new spec says only "add node and remove node animate the moved keys". Suggest keeping the per-key re-check: the README rule says every change gets its own step, and it shows which keys move one by one. Touches Task 2 and Task 5.
2. **Directory picture.** A Table of key → node rows, each row in its node's colour, changed rows white-ringed. Suggest adding a small per-node load badge row under the table so the balancer's goal (even load) is visible. Touches Task 4 and Task 5.
3. **Rendezvous picture.** A Table with one row per node showing that node's score for the key being checked, the winner highlighted. Where the other keys currently live then shows only in Step-tab vars. Suggest this, since the score table is the lesson; the alternative is Bins with a score line, which hides the scores. Touches Task 5.
4. **Virtual nodes on the circle.** Up to six nodes with eight virtual nodes each is 48 small markers. Suggest label only the physical nodes and show virtual ones as small unlabelled markers in the node's colour. Touches Task 4.
5. **Hot key.** Weight 5 as a double-width chip in Bins and a double-width cell in Runs. Hot key is offered only on Mod-N, Range and Ring. Touches Tasks 4 and 5.
6. **Shape names.** The spec calls the ring shape Keyspace; generic code may not use domain words, so the plan names the generic shapes Circle, Runs and Bins. The spec text should be updated to match once agreed.
7. **Node colours.** Eight tokens `--viz-node-a` to `--viz-node-h` (letters A to H are used in one run), aliasing the existing palette; distinguishable in every theme preset including colour-blind use. Touches Task 4.
8. **Add and Remove buttons.** The old spec's `action` field kind. Suggest keeping it: pressing Add jumps playback to the event step. The alternative is editing the Events field only. Touches Task 3.

## Part A: engines (new files only)

### Task 1: Types, hashing, grammar, workloads

**Files:** Create `lib/visualizer/data-partitioning/types.ts`, `hash.ts`, `keys.ts`, `trace.ts`, `test-helpers.ts`; tests `hash.test.ts`, `keys.test.ts`, `trace.test.ts`.

**Interfaces:**
- `types.ts`: `SCHEME_IDS = ["mod-n","range","ring","directory","rendezvous"] as const` (chip order, easier first); node letters A to J; limits 1 to 6 nodes, at most 4 events, 1 to 12 keys, 8 letters per run.
- `hash.ts`: `hashKey(k)`; `nodeNumber(letter)`; `VNODE_TABLE` (the 80 positions in the old spec); `ringPoints(nodes, v)`; `clockwiseIndex`; `ringShares`; `rendezvousScore(k, i)`.
- `keys.ts`: `parseKeys` (numbers 0 to 99 separated by spaces, commas or underscores, once each, at most one `*` hot key of weight 5) and `parseEvents` (`+`, `-X`, Unicode minus accepted, value-aware so the node count stays 1 to 6), with the exact error strings from the old spec.
- `trace.ts`: seeded workloads Random, Sequential (8 consecutive keys from a seeded start 60 to 92) and Hot key; the Remove pick, decided when the button is pressed and written into the token.

- [ ] **Step 1: Tests.** `hash.test.ts`: `hashKey` of every default key (`55 77 84 68 16 53 34 0`); the table's 80 positions are distinct and `r = 0` equals `hashKey` of the node; shares spread shrinks across 1, 2, 4, 8 for starting sets of 2 to 6 nodes; a rendezvous tie goes to the earlier letter; a key exactly on a node position belongs to that node; wrap past 99. `keys.test.ts`: every error string; duplicates; the hot-key rule; URL form `12_18_29_61*_65` and `e=%2B_-B`. `trace.test.ts`: determinism per seed, independence from the variant, each workload's shape, a removed letter never reused.
- [ ] **Step 2:** Implement.

### Task 2: Variants and the engine

**Files:** Create `lib/visualizer/data-partitioning/schemes/{membership,mod-n,range,directory,ring,rendezvous,index}.ts` and `engine.ts`; one test file per scheme plus `engine.test.ts`.

**Interfaces:** each scheme implements `init`, `place`, `add`, `remove`, `order` over the shared node-list world in `membership.ts`; `ring.ts` serves one or many virtual nodes. `engine.ts` turns keys and events into steps (place, event, re-check) with outcomes (`neutral` for place and event steps, `good` for a key that stays, `bad` for a key that moves), the moved count and the fewest possible per event.

- [ ] **Step 1: Tests** on the Fixtures: the start and after-add table for each variant and for the Ring at 1 and 4 virtual nodes; Range's median split, the `m = lo` fallback, a one-value range that cannot split, merge into the lower neighbour and into the upper one if the removed range was first; Directory's load-based placement, the balancer's stop rule and the hot key staying put; ring wrap and exact-on-node; step count `K + E(1 + K)` and equal frame counts across variants for the same input; moved against fewest possible; letters never reused.
- [ ] **Step 2:** Implement.

## Part B: shared work

### Task 3: Frame changes

**Files:** Modify `lib/visualizer/core/{types,fields,url-state}.ts`, `components/visualizer/frame/{ConfigFields,ConfigPanel,VisualizerApp}.tsx`, `components/visualizer/ui/ChoiceGroup.tsx`, the strip, badge and log CSS under `css/view-visualizer/`.

**Interfaces (from the old spec's Frame changes):** `Outcome` gains `"neutral"` (existing modules never emit it); `action` field kind `{ kind: "action"; key; label; apply: (values) => { values; step? } }` rendered as a button, replacing values wholesale without `resetBy`, rewriting the URL and seeking to `step` (a 0-based frame index) or the first frame; `SequenceField.parse` receives the current values; `SequenceField.resetEmpty`; `SequenceField.link`; `RunResult.sequences` per field; chips honour `availability.disabled`.

- [ ] **Step 1: Tests** for each: neutral strip cell and log row, the action button including disabled and hint, URL round trip, `resetEmpty` round trip of `[]`, `link` runs for a direct edit but not for a `resetBy` clear or an action, per-field sequences, disabled chips.
- [ ] **Step 2:** Implement. Existing visualizers must behave unchanged.

### Task 4: Shapes

**Files:** Create `components/visualizer/shapes/{BinsShape,CircleShape,RunsShape}.tsx` and tests; extend `TableShape.tsx` and its test; modify `lib/visualizer/core/shapes.ts`, `components/visualizer/shapes/Shape.tsx`, `css/tokens.css` (the node hue tokens, the scale caps), new `css/view-visualizer/{bins,circle,runs}.css`, `css/responsive.css` (breakpoints only).

**Interfaces and looks:**
- Bins: one column per bin, items as numbered dots stacked from the bottom, count and name in the header, pending items faded after settled ones, a heavy item spanning two cells, removed and new bins, moved items white-ringed, the move drawn with `--viz-move` and a reduced-motion form.
- Circle: positions 0 to 99 around a circle, arcs in the owner's colour, points for items on the ring, small unlabelled markers for extra positions of one owner, labelled anchors outside with a badge carrying the count and a bar against an ideal tick, the busiest anchor flagged, white ring on moved points, a walk arc from a point to its owner. Approved from the browser mockup (Option 1).
- Runs: a sorted row of equal cells in the owner's colour, a brace under each owner's consecutive run carrying its range and count, a heavy cell double width, moved cells white-ringed, a cut shown by a new brace. Approved from the browser mockup (R2).
- Table: add a per-row hue so rows can take an owner's colour, and a score row form (name, number, winner highlight), only as far as Directory and Rendezvous need.

- [ ] **Step 1: Tests** (a component test per shape): rows and cells by identity, moved ring, pending order, heavy item, hue per owner, geometry for positions 0 and 99 and for two close points, empty bin and empty run, fit at 320px with no sideways scroll, positions unchanged between frames.
- [ ] **Step 2:** Implement one inline SVG per shape, scaled by `FitBox`; check every theme preset.

## Part C: the module

### Task 5: View, vars, copy, frames

**Files:** Create `lib/visualizer/data-partitioning/{view,frames,copy,defs}.ts`; tests `view.test.ts`, `steps.test.ts`.

**Interfaces:** `view.ts` turns an engine step into Bins, Circle, Runs or Table models for the active variant; the corner metric is "Keys moved" (moved / K for the latest event, "—" before the first); `vars` rows per variant from the old spec (Mod-N: `h(k)`, N, `h(k) mod N`; Range: key, owning range; Ring: `h(k)`, first node clockwise, shares, virtual node hit; Directory: directory entry, loads; Rendezvous: all scores, winner, runner-up) plus the common rows (phase, node now, node before, moved this event, fewest possible); step lines per variant from the old spec's Module content.

- [ ] **Step 1: Tests** on the Fixtures: the model at the first, event and a re-check step for each variant; the white ring on exactly the moved keys; vars values hand-derived; no two adjacent frames identical.
- [ ] **Step 2:** Implement.

### Task 6: Module, input, registry

**Files:** Create `lib/visualizer/data-partitioning/module.ts`, `input.ts`; tests `input.test.ts`, `module.test.ts`; modify `lib/visualizer/registry.ts` and `modules.ts`.

**Interfaces:** the fields of the old spec's Parameters table without Cap factor, with Virtual nodes (1, 2, 4, 8) enabled for the Ring only and the Add and Remove actions; slug `data-partitioning`, `variants: { key: "scheme" }`, `restartOnSwitch` off so switching keeps the step; defaults are the Fixtures keys, three starting nodes, one Add, Virtual nodes 4.

- [ ] **Step 1: Tests** for the slider and events interplay (Add moves the slider and seeks to the event step; dragging the slider clears events; editing Events keeps the starting count; a running count outside 1 to 6 is rejected; Add and Remove disabled at their limits), the URL round trip, the Try presets each run after moving the inputs away from the defaults, and the default under every variant.
- [ ] **Step 2:** Implement; write the five Try-preset pairs from the old spec for Mod-N, Range, Directory and Rendezvous, and for the Ring the presets "More positions, even shares" and "Add takes one arc".

### Task 7: Revision cards

**Files:** Create `lib/visualizer/data-partitioning/revision.ts`; test `revision.test.ts`.

**Interfaces:** five cards in variant order, each playing the mini-run (keys `12 18 29 61 65 66`, three starting nodes, one Add, 13 steps) by drawing the Single model at each step; results Mod-N 5/6, Range 2/6, Ring 2/6, Directory 1/6, Rendezvous 1/6 (re-derive by hand before pinning); `summary` and `differs` from the old spec's card table; glossary terms added to `data/glossary.json`.

- [ ] **Step 1: Tests:** five cards in order, 13 steps each, unique `stepsText`, the finished state held, every glossary term exists.
- [ ] **Step 2:** Implement.

### Task 8: Article links and e2e

**Files:** Modify the module's info; create a content test for the five deep links; add one browser e2e check for the page.

- [ ] **Step 1:** Assert each article anchor exists; one e2e test loads the page, presses Add and sees the moved keys ringed.

### Task 9: Docs and one full verification

**Files:** Modify `docs/_meta/visualizer/README.md` (shape table: Bins, Circle, Runs, Table reuse note; roadmap), `docs/_meta/visualizer/backlog.md` (remove the topic), the spec's shape names, and the CLAUDE.md FILE MAP.

- [ ] **Step 1:** Update the docs.
- [ ] **Step 2:** Run the full suite once (`pnpm typecheck`, `pnpm lint`, `pnpm test:all`) and one build; open the page in the browser at desktop and 320px, in every theme preset, with the side panels open and collapsed, and report what was seen.

## Review Focus

- Remove down to one node and add up to six; the node count never leaves 1 to 6 and Add and Remove disable at the limits.
- A removed node's letter is never reused; its colour is never given to a later node.
- Range with sequential keys: all keys in one run, other nodes empty, the braces still readable; a one-value range cannot split.
- Directory with a hot key: the hot key stays and lighter keys move.
- A key exactly on a node position and a key past the last position (wrap).
- Ring at 1 and 8 virtual nodes with six nodes: the markers stay readable and the figure fits at 320px.
- A URL with junk keys or events falls back to the default; a frame index past the new run falls back to step 1.
- Switching variant keeps the step; every variant gives the same frame count for the same input.
