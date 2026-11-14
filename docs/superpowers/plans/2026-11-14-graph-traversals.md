# Graph Traversals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the generic Graph shape (node-link and layered layouts) and the Graph Traversals visualizer with five variants (BFS, DFS, Dijkstra, Topological sort, Bipartite check), each with a working-structure strip inside the one picture and a looping Revision card.

**Architecture:** Five pure engines under `lib/visualizer/graph/` turn a graph, a start node and a seed into `TraceEvent[]` (full node and edge state per step, the working structure, the visit order). `view.ts` turns one event into one `ShapeModel`: a `GraphModel` stacked with Linear strips (queue, stack, ready list, visited order) or the built Heap shape (Dijkstra's priority queue) inside a Composite. The module is a thin adapter over the engines. The Graph shape knows only nodes, edges, tones and rows; every graph-algorithm word lives in `lib/visualizer/graph/`.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest + Testing Library, pnpm, plain CSS with `--viz-*` tokens.

**Spec:** `docs/superpowers/specs/2026-11-14-backlog-visualizers-design.md` (Graph shape, per-visualizer table, stage layout). Read `docs/_meta/visualizer/README.md` and CONVENTIONS.md § Visualizer and § CSS first. Pattern: `docs/superpowers/plans/2026-11-14-fit-to-stage-and-sorting.md` and `2026-11-14-heap.md`.

**Prerequisite:** the Sorting and Heap plans are executed (checked 2026-11-14): frames no longer carry `aside`, `lib/visualizer/core/fit.ts` and the `FitBox` component (`components/visualizer/shapes/FitBox.tsx`, which scales its children to the box it sits in) exist, `HeapModel` carries `array`, and `core/tree.ts` exists. There is no `useFitScale` hook and no tone legend for compare modules: the module `legend` field is rendered only by the mechanism frame and the Revision footer (fixed line-style swatches). Part A (engines) has no dependency on any of this. This plan was checked against that code: Composite parts are `position: relative` boxes that `FitBox` fills, `Shape.tsx` dispatches by `kind`, `url-state.ts` reserves only `i`, `rot` and `view`, `Stage` hands `Shape` a measured size, and the Heap and Sorting modules are the structure to copy (`types.ts`, `frames.ts`, `defs.ts`, `copy.ts`, `revision.ts`, `module.ts`).

## Global Constraints

- Generic code (`components/visualizer/**`, `lib/visualizer/core/**`) uses structural words only (node, edge, row, tone, badge, strip); graph-algorithm words (queue, stack, relax, in-degree, tree edge as a concept) live under `lib/visualizer/graph/`.
- The stage holds ONE picture that fills it and scales uniformly with it (`FitBox`, capped at `--viz-fit-scale-max`); no right-hand block. Counters, loop variables and maths go to frame `vars` and the corner metric; there is no colour legend (the README drops it for compare modules; the shared colour language is the key).
- Working structures are parts of the picture, stacked with Composite: queue strip (BFS, bipartite), stack strip (DFS), the built Heap shape as the priority queue (Dijkstra), ready list plus output order (topological sort), a visited-order row (BFS, DFS, Dijkstra). Reuse Linear and Heap; no new shape for them.
- Colour language: green done, amber waiting, indigo current, white ring the neighbour being compared, grey not reached. Node tones reuse `ArrayTone` (`good`, `warn`, `accent`, `focus`, `plain`). Colours only via `--viz-*` tokens; new sizes become tokens in `css/tokens.css`; breakpoints only in `css/responsive.css`; nothing breaks at 320px.
- Node states: unseen, frontier, current, done. Edge states: plain, tree, checking, skipped, consumed, flash. Visit order is numbered on each node; a small badge carries the per-node value (in-degree, distance). Bipartite uses a two-colour fill (`side` a or b) and the conflicting edge flashes.
- Every change gets its own step: an enqueue, a dequeue, a pointer move to a neighbour, a discovery, a skip, a relaxation, a pop, a node finishing. The last frame of every run adds `settled` to the picture, so no two adjacent frames ever have identical models.
- First badge "Start", last badge "Done". All five variants set `restartOnSwitch`. Step copy is plain English naming the nodes, 2–4 loop lines per variant, never source code.
- Frames are pure and deterministic from graph, start node and seed. Seed 0 keeps each node's neighbours in declared (alphabetical) order; any other seed shuffles every node's neighbour list once, stably.
- Comments and docstrings are one line. No ticket IDs in code or CSS. No `console.*`. Tests are written together with the code against the hand-checked fixtures below; one full run at the end (Task 13), not per step.
- No git steps anywhere; the user owns version control.

## Review Focus

- Disconnected graph or a start node that cannot reach everything (BFS from C on the DAG; two separate components for bipartite): the run still ends on "Done", unreached nodes stay grey and faded with a "not reached" row in the layered picture, bipartite continues into the next component with a "Next component" step.
- Single node and no edges: every variant completes without errors (BFS, DFS, Dijkstra, bipartite visit it once; topological sort outputs it), and the layered picture has one row.
- Self-loop and duplicate edge: duplicates are dropped before the run (Dijkstra keeps the lower weight); a self-loop is a normal Check then Skip (Keep for Dijkstra), makes topological sort Stuck and bipartite Conflict, and is drawn as a small loop, never a zero-length line.
- Equal-cost ties in Dijkstra: the earlier-pushed entry pops first, an equal-cost route never replaces the first one (strict "shorter"), and equal-distance stale entries are skipped without a repeated frame.
- Cycle in the topological sort input: the run ends on a "Stuck" step naming the nodes that never became ready, then "Done"; no infinite loop; the layered picture puts those nodes in a last row.

## Layout choice per variant

| Variant | Layout | Learning reason |
|---|---|---|
| BFS | layered, rows by hops from the start | "Level" is the point: every node in a row is the same number of hops away, and the outlined row is the queue filling up. |
| DFS | node-link | The order and the path are the point; rows would imply levels DFS does not have. The stack strip carries the path. |
| Dijkstra | node-link | Distance, not hops, is the point; edge weights need room and the cheapest route often has more hops than the direct edge. |
| Topological sort | layered, rows by longest path from the sources | "Everything before me sits in a higher row" is the point; every arrow points down, and a node is ready when its row above is done. |
| Bipartite check | node-link | The cycle shape is the point: the odd ring is recognisable and the flashing edge closes it. |

## Locked decisions

All settled with the user; do not reopen.

- Layouts: BFS and topological sort layered; DFS, Dijkstra and bipartite node-link (table above). One `LAYOUT` table in `lib/visualizer/graph/defs.ts` holds them.
- Dijkstra's priority queue changes in one step per push or pop (the sift is not stepped; `pqPush`/`pqPop` still return their swap lists, unused). Dijkstra uses lazy deletion (a `Stale` step), not decrease-key.
- Six presets: small, weighted, dag, dag-cycle, ring-even, ring-odd (the last two give bipartite and topological sort their second outcome).
- A preset that does not fit a variant falls back to that variant's preset with a field hint (Dijkstra to weighted, topological sort to dag).
- Seed 0 is declared order and is the default; any other seed shuffles neighbour order. Count in-degrees is one step. Every node gets a Finish step.
- Colour legend: none. The README drops it for compare modules (the shared colour language is the key) and the Hash Table plan follows suit, so the earlier idea of a shared `toneLegend` (old Task 7) was removed and nothing outside Graph is touched for it.
- Revision cards use a compact picture: the graph plus the one main working structure (queue, stack, heap, ready list); the visited-order row is left out because the nodes carry their numbers. The card stage is 200px tall and a Linear strip needs 72px.
- Article links: BFS `/dsa/algorithms/bfs/`, DFS `/dsa/algorithms/dfs/`, Dijkstra `/dsa/algorithms/dijkstra/`, topological sort `/dsa/algorithms/topological-sort/`, bipartite `/dsa/patterns/graph-coloring/` (its 2-colouring section).

## Fixtures (hand-checked, used by the engine, view and module tests)

Graphs (all presets are hand-laid; `x`,`y` are cell units, 1 cell = `--viz-graph-pitch`):

- **small** (undirected): nodes A..H; edges A-B, A-C, B-D, B-E, C-F, E-G, F-G, G-H. Coordinates A(0,2) B(1,0.7) C(1,3.3) D(2,0) E(2.3,1.4) F(2.3,3.1) G(3.5,2.3) H(4.7,2.3).
- **weighted** (undirected): nodes A..E; edges A-B 4, A-C 2, B-C 1, B-D 5, C-D 8, C-E 10, D-E 2. Coordinates A(0,2) B(1.5,0) C(1.5,4) D(3.5,0) E(5,4).
- **dag** (directed): nodes A..F; edges A→C, B→C, B→D, C→E, D→E, E→F. Coordinates A(0,1) B(0,3) C(1.6,1) D(1.6,3) E(3.2,2) F(4.8,2).
- **dag-cycle**: dag plus F→C (same coordinates).
- **ring-even** (undirected): nodes A..F, edges A-B, B-C, C-D, D-E, E-F, F-A, on a hexagon A(1.5,0) B(3,0.75) C(3,2.25) D(1.5,3) E(0,2.25) F(0,0.75).
- **ring-odd** (undirected): nodes A..E, edges A-B, B-C, C-D, D-E, E-A, on a pentagon A(1.5,0) B(3,1.1) C(2.4,3) D(0.6,3) E(0,1.1).

Neighbour order is by node declaration order (not edge listing order) at seed 0. Event counts include Start and Done.

**F1 BFS on small from A (51 events).** Visit numbers are given at Dequeue.

```
Start; Enqueue(A)
A: Dequeue; Check B, Discover; Check C, Discover; Finish
B: Dequeue; Check A, Skip; Check D, Discover; Check E, Discover; Finish
C: Dequeue; Check A, Skip; Check F, Discover; Finish
D: Dequeue; Check B, Skip; Finish
E: Dequeue; Check B, Skip; Check G, Discover; Finish
F: Dequeue; Check C, Skip; Check G, Skip; Finish
G: Dequeue; Check E, Skip; Check F, Skip; Check H, Discover; Finish
H: Dequeue; Check G, Skip; Finish
Done
```

Queue (front first) after each Enqueue/Discover/Dequeue: `[A]`, Dequeue A `[]`, `[B]`, `[B C]`, Dequeue B `[C]`, `[C D]`, `[C D E]`, Dequeue C `[D E]`, `[D E F]`, Dequeue D `[E F]`, Dequeue E `[F]`, `[F G]`, Dequeue F `[G]`, Dequeue G `[]`, `[H]`, Dequeue H `[]`. Visit order `A B C D E F G H` numbered 1..8. Hops A0 B1 C1 D2 E2 F2 G3 H4, so layered rows are `[A] [B C] [D E F] [G] [H]`. Final edges: tree A-B A-C B-D B-E C-F E-G G-H; skipped F-G. A Skip back to the node's own parent leaves that edge as `tree`. Counts: 16 Check, 7 Discover, 9 Skip.

**F2 DFS on small from A (43 events).** Visit numbers are given at Push; the stack is shown top first.

```
Start; Push(A)
A: Check B, Push B
B: Check A, Skip; Check D, Push D
D: Check B, Skip; Pop D
B: Check E, Push E
E: Check B, Skip; Check G, Push G
G: Check E, Skip; Check F, Push F
F: Check C, Push C
C: Check A, Skip; Check F, Skip; Pop C
F: Check G, Skip; Pop F
G: Check H, Push H
H: Check G, Skip; Pop H
Pop G; Pop E; Pop B
A: Check C, Skip; Pop A
Done
```

Visit order `A B D E G F C H` numbered 1..8. Stack bottom to top after each Push: `A`, `A B`, `A B D`, (Pop D `A B`), `A B E`, `A B E G`, `A B E G F`, `A B E G F C` (deepest, 6), later `A B E G H`. Final edges: tree A-B B-D B-E E-G G-F F-C G-H; skipped A-C. Counts: 16 Check, 8 Push, 8 Pop, 9 Skip.

**F3 Dijkstra on weighted from A (44 events).** The priority queue is a min-heap of `(dist, node)` ordered by distance, ties by earlier push; shown as the heap array after the step.

```
Start; Push(A,0)                      pq [0A]
Pop A(0)                              pq []
  Check B (0+4 vs ∞), Relax B=4       pq [4B]
  Check C (0+2 vs ∞), Relax C=2       pq [2C 4B]
  Finish A
Pop C(2)                              pq [4B]
  Check A (4 vs 0), Keep
  Check B (3 vs 4), Relax B=3         pq [3B 4B]
  Check D (10 vs ∞), Relax D=10       pq [3B 4B 10D]
  Check E (12 vs ∞), Relax E=12       pq [3B 4B 10D 12E]
  Finish C
Pop B(3)                              pq [4B 12E 10D]
  Check A (7 vs 0), Keep; Check C (4 vs 2), Keep
  Check D (8 vs 10), Relax D=8        pq [4B 8D 10D 12E]
  Finish B
Stale 4B                              pq [8D 12E 10D]
Pop D(8)                              pq [10D 12E]
  Check B (13 vs 3), Keep; Check C (16 vs 2), Keep
  Check E (10 vs 12), Relax E=10      pq [10D 12E 10E]
  Finish D
Stale 10D                             pq [10E 12E]
Pop E(10)                             pq [12E]
  Check C (20 vs 2), Keep; Check D (12 vs 8), Keep
  Finish E
Stale 12E                             pq []
Done
```

Distance badge sequence per node: A 0; B ∞→4→3; C ∞→2; D ∞→10→8; E ∞→12→10. Visit (pop) order `A C B D E` numbered 1..5. Final distances A0 B3 C2 D8 E10; tree edges A-C, C-B, B-D, D-E (a Relax moves a node's tree edge; the replaced one becomes `skipped`). Counts: 5 Pop, 3 Stale, 14 Check, 7 Relax, 7 Keep. Heap capacity for the run is the largest pq size, 4. Tie graph (A-B 1, A-C 1, B-D 1, C-D 1) from A pops A, B, C, D in that order, D's tree edge is B-D, there is no Stale and no second Relax of D.

**F4 Topological sort (Kahn, ready list is a FIFO, out-edges in declared order) on dag (27 events).**

```
Start; Count (A0 B0 C2 D1 E2 F1); Ready(A); Ready(B)
A: Take; Reduce C→1; Finish
B: Take; Reduce C→0; Ready(C); Reduce D→0; Ready(D); Finish
C: Take; Reduce E→1; Finish
D: Take; Reduce E→0; Ready(E); Finish
E: Take; Reduce F→0; Ready(F); Finish
F: Take; Finish
Done
```

Ready list after each step: `[A]`, `[A B]`, Take A `[B]`, Take B `[]`, `[C]`, `[C D]`, Take C `[D]`, Take D `[]`, `[E]`, Take E `[]`, `[F]`, Take F `[]`. Output order `A B C D E F` numbered 1..6 at Take. In-degree badge sequences: C 2→1→0, D 1→0, E 2→1→0, F 1→0, A and B stay 0. Layered rows by longest path `[A B] [C D] [E] [F]`. A Reduce marks its edge `consumed`. On dag-cycle (17 events): `Start; Count (A0 B0 C3 D1 E2 F1); Ready(A); Ready(B); Take A; Reduce C→2; Finish; Take B; Reduce C→1; Reduce D→0; Ready(D); Finish; Take D; Reduce E→1; Finish; Stuck; Done`; output `A B D`, never ready `C E F`, layered rows `[A B] [D] [C E F]` with the last row labelled.

**F5 Bipartite on ring-even from A (39 events).** BFS colouring: start gets side a, a new neighbour gets the opposite side.

```
Start; Colour(A, a)
A: Dequeue; Check B, Colour b; Check F, Colour b; Finish
B: Dequeue; Check A, Fine; Check C, Colour a; Finish
F: Dequeue; Check A, Fine; Check E, Colour a; Finish
C: Dequeue; Check B, Fine; Check D, Colour b; Finish
E: Dequeue; Check D, Fine; Check F, Fine; Finish
D: Dequeue; Check C, Fine; Check E, Fine; Finish
Done
```

Sides: a `A C E`, b `B D F`; result "bipartite". On ring-odd from A (26 events): `Start; Colour(A, a); A: Dequeue; Check B, Colour b; Check E, Colour b; Finish; B: Dequeue; Check A, Fine; Check C, Colour a; Finish; E: Dequeue; Check A, Fine; Check D, Colour a; Finish; C: Dequeue; Check B, Fine; Check D, Conflict; Done`. The Conflict step flashes edge C-D, leaves C current, and the run stops with "not bipartite: A B C D E is an odd ring". A node reached from a second component starts with a "Next component" step (colours it a).

## File structure

Part A (no shared files, new files only under `lib/visualizer/graph/`):

- `trace.ts` engine-local types and `edgeKey`; `graphs.ts` presets, minis, `normalise`, `neighboursOf`; `layers.ts` row computation; `pq.ts` min priority queue; `bfs.ts`, `dfs.ts`, `dijkstra.ts`, `topo.ts`, `bipartite.ts`, each with a `.test.ts`. The only import from outside is `fill` and `Rich` from `../core/rich`.

Part B (shared files):

- `lib/visualizer/core/shapes.ts` (GraphModel, optional heap array), `lib/visualizer/core/geometry.ts` (composite heights), `components/visualizer/shapes/Shape.tsx`, `components/visualizer/shapes/HeapShape.tsx`, `css/tokens.css`, `css/wiki.css`, ; new `components/visualizer/shapes/GraphShape.tsx`, `css/view-visualizer/graph.css`.

Part C (the module): `lib/visualizer/graph/{layout,view,types,input,copy,defs,frames,module,revision}.ts` with tests, `lib/visualizer/registry.ts`, `modules.ts`, `registry.test.ts`.

---

## Part A: engines

### Task 1: Trace types, graphs, rows, priority queue

**Files:** Create `lib/visualizer/graph/trace.ts`, `graphs.ts`, `layers.ts`, `pq.ts`; tests `graphs.test.ts`, `layers.test.ts`, `pq.test.ts`.

**Interfaces:**
- `trace.ts`: `type NodeState = "unseen" | "frontier" | "current" | "done"`; `type EdgeState = "plain" | "tree" | "checking" | "skipped" | "consumed" | "conflict"`; `type TraceBadge = "Start" | "Enqueue" | "Dequeue" | "Check" | "Discover" | "Skip" | "Finish" | "Push" | "Pop" | "Relax" | "Keep" | "Stale" | "Count" | "Ready" | "Take" | "Reduce" | "Colour" | "Fine" | "Conflict" | "Next component" | "Stuck" | "Done"`; `interface GraphData { nodes: string[]; edges: { from: string; to: string; weight?: number }[]; directed: boolean }`; `interface TraceNode { state: NodeState; order?: number; value?: string; side?: "a" | "b" }`; `interface PqEntry { dist: number; node: string; seq: number }`; `interface TraceEvent { badge: TraceBadge; caption: Rich; node: string | null; other: string | null; nodes: Record<string, TraceNode>; edges: Record<string, EdgeState>; work: string[]; pq: PqEntry[]; popped: PqEntry | null; order: string[]; metric: string; note: string | null; unreached: string[] }`; `edgeKey(g: GraphData, a: string, b: string): string` (`"a>b"` when directed, else the two names sorted by node order joined with `"-"`). `work` is the queue (front first), stack (top first) or ready list (front first) of the variant; `order` is the visit or output order so far; `metric` is the corner metric text; `unreached` lists nodes the run never reached (set on the last two events, else empty).
- `graphs.ts`: `PRESET_IDS = ["small","weighted","dag","dag-cycle","ring-even","ring-odd"] as const`; `PRESETS: Record<PresetId, { data: GraphData; coords: Record<string, { x: number; y: number }> }>`; `MINIS: Record<"bfs" | "dfs" | "dijkstra" | "topo" | "bipartite", { data: GraphData; coords: Record<string, { x: number; y: number }>; start: string }>` (the Revision graphs: bfs and dfs A-B, A-C, B-D, C-D at A(0,1) B(1.2,0) C(1.2,2) D(2.4,1); dijkstra A-B 1, B-C 2, A-C 4 at A(0,1.6) B(1.6,0) C(3.2,1.6); topo directed A→C, B→C, C→D at A(0,0) B(0,2) C(1.6,1) D(3.2,1); bipartite the triangle A-B, B-C, C-A at A(1,0) B(2,1.7) C(0,1.7); all start at A); `normalise(g: GraphData): GraphData` (drops duplicate edges, treating a-b and b-a as one when undirected, keeping the lower weight; keeps self-loops); `neighboursOf(g: GraphData, node: string, seed: number): { node: string; weight: number }[]` (out-edges when directed, both ends when undirected, weight defaults 1; seed 0 is node declaration order, else a stable shuffle from `mulberry32` seeded by seed and the node's index; self-loop appears once).
- `layers.ts`: `interface Row { nodes: string[]; label?: "not reached" | "stuck" }`; `hopRows(g: GraphData, start: string): Row[]`; `longestRows(g: GraphData): Row[]`. Nodes inside a row are ordered by the average column of their neighbours in the previous row, ties by declaration order. Unreachable nodes go in a last row labelled "not reached"; nodes Kahn never frees go in a last row labelled "stuck".
- `pq.ts`: `pqPush(items: PqEntry[], entry: PqEntry): { items: PqEntry[]; swaps: [number, number][] }`; `pqPop(items: PqEntry[]): { top: PqEntry; items: PqEntry[]; swaps: [number, number][] }` (min-heap by `dist`, ties by lower `seq`; both return fresh arrays and the index pairs swapped, so a per-swap trace stays possible).

- [x] **Step 1: Tests.** `graphs.test.ts`: `normalise` on `[A-B, B-A, A-B]` undirected leaves one edge; with weights 5 and 3 it keeps 3; a directed `A→B, B→A` keeps both; `neighboursOf(small, "G", 0)` is `E, F, H`; `neighboursOf(dag, "B", 0)` is `C, D` and `neighboursOf(dag, "E", 0)` is `F`; seed 7 gives the same set in a deterministic order, identical on two calls; all presets and minis have every edge endpoint in `nodes` and a coordinate for every node; no preset has two nodes closer than 0.9 cell; no preset has crossing edges (segment intersection on the coordinates, shared endpoints excluded). `layers.test.ts`: `hopRows(small, "A")` is `[A] [B C] [D E F] [G] [H]`; `hopRows(dag, "C")` is `[C] [E] [F] [A B D "not reached"]`; `longestRows(dag)` is `[A B] [C D] [E] [F]`; `longestRows(dag-cycle)` is `[A B] [D] [C E F "stuck"]`; a one-node graph is one row; row order is identical on two calls. `pq.test.ts`: pushing `4B, 2C, 3B` in order gives `[2C 4B 3B]`; popping from the F3 state `[3B 4B 10D 12E]` returns `3B` and leaves `[4B 12E 10D]`; two entries with equal `dist` pop in `seq` order; `swaps` lists the index pairs.
- [x] **Step 2:** Implement the four files; `PRESETS` holds the coordinates and edges from the Fixtures section exactly.

### Task 2: BFS engine

**Files:** Create `lib/visualizer/graph/bfs.ts`, test `bfs.test.ts`.

**Interfaces:** Consumes Task 1. Produces `bfsRun(g: GraphData, start: string, seed: number): TraceEvent[]`. Node state: discovered nodes are `frontier`, the dequeued node `current`, the neighbour being checked is `other`, finished nodes `done`; `order` numbers nodes at Dequeue; `work` is the queue; `metric` is `"visited/total"` such as `"3/8"`. Check sets that edge to `checking` then Discover sets it `tree` or Skip sets it `skipped` (a Skip on the node's own tree edge leaves it `tree`). The last event adds the unreached list.

- [x] **Step 1: Tests.** On F1 (small, A, seed 0): badges equal the F1 sequence (51 events); `work` after each queue-changing event equals the F1 queue list; the final `order` is `A B C D E F G H`; final edge states are tree on A-B A-C B-D B-E C-F E-G G-H and skipped on F-G; metric ends `"8/8"`. On dag from C: visits `C E F`, `unreached` is `A B D`, last badge Done. Single node: `Start, Enqueue, Dequeue, Finish, Done`. Self-loop on A: a Check A then Skip A that does not break the order. No two adjacent events have identical `nodes`, `edges`, `work`, `node` and `other` except the last pair, which differs by badge only (the view adds `settled`).
- [x] **Step 2:** Implement with one queue array; every neighbour produces the pair Check then Discover or Skip; captions name both nodes ("Check B from A: B is new, so queue it.").

### Task 3: DFS engine

**Files:** Create `lib/visualizer/graph/dfs.ts`, test `dfs.test.ts`.

**Interfaces:** Produces `dfsRun(g: GraphData, start: string, seed: number): TraceEvent[]`. Recursive order with an explicit stack: Push marks the node `current` (previous top becomes `frontier`) and numbers it; Pop marks it `done` and the new top `current` again; `work` is the stack, top first; `metric` is `"visited/total"`. Check and Skip behave as in BFS.

- [x] **Step 1: Tests.** On F2: badges equal the F2 sequence (43 events); `work` after each Push and Pop equals the F2 stack list (reversed for top first); final order `A B D E G F C H`; final edges: tree A-B B-D B-E E-G G-F F-C G-H, skipped A-C; maximum `work` length 6. Single node: `Start, Push, Pop, Done`. On a graph with two components, the other component stays `unseen` and is listed in `unreached`. Same adjacent-event rule as BFS.
- [x] **Step 2:** Implement iteratively with a stack of `{ node, next neighbour index }`.

### Task 4: Dijkstra engine

**Files:** Create `lib/visualizer/graph/dijkstra.ts`, test `dijkstra.test.ts`.

**Interfaces:** Consumes `pqPush`, `pqPop`. Produces `dijkstraRun(g: GraphData, start: string, seed: number): TraceEvent[]` with lazy deletion: Relax pushes a new entry (the old one stays and later pops as Stale). Each node's `value` is its tentative distance (`"∞"` until reached); `pq` is the heap array after the step; `popped` is set on Pop and Stale; Pop numbers the node (`order`); `work` is empty; `metric` is the relaxation count as text. A Check event's caption carries the arithmetic ("2 + 1 = 3, shorter than 4"). The route is "shorter" only when strictly less. A neighbour that is already `done` always gets Keep. A Relax sets that edge `tree` and the node's previous tree edge `skipped`. A graph with weights missing uses weight 1.

- [x] **Step 1: Tests.** On F3: badges equal the F3 sequence (44 events); `pq` after every pq-changing event equals the F3 snapshot; distance sequence per node as listed; final distances A0 B3 C2 D8 E10; final tree edges A-C C-B B-D D-E; pop order `A C B D E`; the maximum `pq.length` is 4. Tie graph: pops `A B C D`, D's tree edge is B-D, no Stale. An unreachable node keeps `"∞"` and appears in `unreached`. Self-loop with weight 3: Check then Keep. Duplicate edges with weights 5 and 3: only 3 is used.
- [x] **Step 2:** Implement; captions plain ("Pop C, the closest unfinished node, at distance 2.").

### Task 5: Topological sort engine

**Files:** Create `lib/visualizer/graph/topo.ts`, test `topo.test.ts`.

**Interfaces:** Produces `topoRun(g: GraphData, seed: number): TraceEvent[]` (Kahn). `Count` is one step that gives every node its in-degree as `value` (the only multi-node step: before it nothing is shown); each Ready moves a zero in-degree node to the ready list, in declaration order at the start; Take moves the front of the ready list to `order` and marks it `current`; each Reduce marks the edge `consumed`, lowers the target's `value`, and a target reaching 0 follows with its own Ready; Finish marks the node `done`. When the ready list empties with nodes left, one `Stuck` step names them in `note`, then `Done`. `work` is the ready list, `metric` is `"output/total"`. A directed graph is required; an undirected input is treated as each edge in both directions (which makes every edge a cycle, so the run reports Stuck).

- [x] **Step 1: Tests.** On F4 (dag): badges equal the F4 sequence (27 events); in-degree badge sequences as listed; ready list after each step as listed; output `A B C D E F`. On dag-cycle: the 17-event sequence, `note` of the Stuck step is `C E F`, output `A B D`. Single node: `Start, Count, Ready, Take, Finish, Done`. Self-loop on a node: that node never becomes ready, Stuck. Two sources with the same readiness keep declaration order. Same adjacent-event rule as BFS.
- [x] **Step 2:** Implement; the last event before Done carries the full result ("Order: A, B, C, D, E, F." or "Stuck: C, E, F are in or after a cycle.").

### Task 6: Bipartite engine

**Files:** Create `lib/visualizer/graph/bipartite.ts`, test `bipartite.test.ts`.

**Interfaces:** Produces `bipartiteRun(g: GraphData, start: string, seed: number): TraceEvent[]`, always on the undirected view of the graph. The start node gets side a; Colour gives a new neighbour the opposite side and queues it; Fine is a neighbour already holding the opposite side; Conflict is a neighbour holding the same side: that edge is `conflict`, the current node stays `current`, and the run goes to Done. When the queue empties with uncoloured nodes left, `Next component` colours the first uncoloured node a and continues. `work` is the queue; `metric` is `"coloured/total"`; the last event's `note` is `"bipartite"` or `"not bipartite"`.

- [x] **Step 1: Tests.** On ring-even from A: the 39-event F5 sequence; sides a `A C E`, b `B D F`; note `"bipartite"`. On ring-odd from A: the 26-event sequence, the Conflict event has `node` C, `other` D and edge C-D as `conflict`, note `"not bipartite"`. Two components (A-B and C-D, start A): `Next component` appears once, between the first component's last Finish and the second's first Check, and all four nodes are coloured. Single node: `Start, Colour, Dequeue, Finish, Done`. Self-loop on A: Conflict on A-A. Same adjacent-event rule as BFS.
- [x] **Step 2:** Implement.

---

## Part B: shared shape work

### Task 7: Dropped

The tone legend was dropped (see Locked decisions). The number is kept so later task numbers stay stable.

### Task 8: Graph shape

**Files:** Modify `lib/visualizer/core/shapes.ts` (add `GraphModel` to `LeafModel`, `modelKeys`), `lib/visualizer/core/geometry.ts` (`compositeHeights`), `components/visualizer/shapes/Shape.tsx` (dispatch `graph` before the composite branch; composites already forward leaf parts), `css/tokens.css` (`--viz-graph-node: 34px`, `--viz-graph-pitch: 64px`, `--viz-graph-pad: 28px`), `css/wiki.css` (import). Create `components/visualizer/shapes/GraphShape.tsx`, `css/view-visualizer/graph.css`. Test `components/visualizer/shapes/GraphShape.test.tsx`, additions to `lib/visualizer/core/geometry.test.ts`.

**Interfaces:**
- Produces: `GraphNode { id: string; label: string; x: number; y: number; tone: ArrayTone; faded?: boolean; order?: number; badge?: string; side?: "a" | "b" }`; `GraphEdgeState = "plain" | "tree" | "checking" | "skipped" | "consumed" | "flash"`; `GraphEdge { from: string; to: string; state: GraphEdgeState; directed: boolean; label?: string }`; `GraphRow { y: number; label?: string; outlined?: boolean }`; `GraphModel { kind: "graph"; nodes: GraphNode[]; edges: GraphEdge[]; rows: GraphRow[]; cols: number; height: number; settled: boolean }` (`x`, `y`, `cols`, `height` in cell units: node centres run 0..`cols` and 0..`height`; `rows` is empty for node-link layouts, and a row draws a faint band at its `y`, dashed when `outlined`). `GraphShape({ model, subject }: { model: GraphModel; subject: string })`, with `GRAPH_NODE`, `GRAPH_PITCH`, `GRAPH_PAD` constants mirroring the three tokens (a test keeps them equal, as for the heap tokens).
- Drawing: the natural size is `cols * pitch + 2 * pad` by `height * pitch + 2 * pad`; the SVG sits inside `FitBox`, which scales it to the box Composite gives it. Edge styling: plain `--border-2`; tree `--viz-good`, thick; checking `--viz-compare`, thick; skipped dashed `--text-muted`; consumed 30% opacity; flash `--viz-bad` pulsing (off under `prefers-reduced-motion`). Node tones reuse the heap node rules (good, warn, accent, focus ring, plain); `side` a fills with `--viz-active` and b with `--viz-exit` and overrides the tone fill; `faded` is 35% opacity; `order` is a small number at the node's top-left, `badge` a small pill at its bottom-right.
- `compositeHeights`: constant `GRAPH_STRIP_H = 72`. When a composite has a `graph` part, each `linear` part gets `GRAPH_STRIP_H` and the rest of the budget (budget as today: stage height minus the 80px chrome when the stage is 320px or taller, else the whole height) is shared between the `graph` and `heap` parts 3 : 2, or all to the graph when there is no heap part; the graph's share is `floor(rest * 3 / 5)` and the heap gets the remainder. Composites without a graph part return exactly what they did before.

- [x] **Step 1: Tests.** `GraphShape.test.tsx`: "draws one circle per node with its label and a tone class"; "visit order shows as a small number on the node and a badge as a small pill"; "`side` a and b fill differently and `faded` dims the node"; "draws one line per edge with a state class, an arrowhead only when `directed`, and the weight label at the midpoint"; "`flash` adds the flash class"; "a self-loop edge draws an arc, not a zero-length line"; "rows draw bands, the outlined row gets the outline class, and a labelled row shows its label"; "`settled` adds a modifier on the root"; "the drawing sits inside a FitBox"; "role img label lists the nodes in order with their state words"; "the size constants equal the tokens"; `modelKeys` returns the node labels. `geometry.test.ts`: "on a 520px stage a graph with two linear parts gets 296px and each strip 72px"; "a graph, a heap and a linear part on 520px get 220px, 148px and 72px (the graph gets `floor(rest * 3 / 5)`, the heap the remainder)"; "a 200px card with a graph and one linear part gets 128px and 72px"; "composites without a graph part are unchanged".
- [x] **Step 2:** Implement one inline SVG, edges first then nodes, positions from cell units times the pitch. Add the Shape dispatch and the CSS.

### Task 9: Priority queue as tree only

**Files:** Modify `lib/visualizer/core/shapes.ts` (`HeapModel.array` becomes optional), `components/visualizer/shapes/HeapShape.tsx`, `components/visualizer/shapes/HeapShape.test.tsx`, and the places that read `model.array` as required (`modelKeys` callers, `lib/visualizer/heap/view.ts` consumers; run the typechecker to find them).

**Interfaces:** `HeapModel.array?: ArrayModel`. When absent the shape draws the tree only inside its `FitBox`; every other field behaves as built. The Heap module and heap sort keep passing `array`.

- [x] **Step 1: Tests.** "without `array` the shape draws the tree and no bars"; "with `array` the output is unchanged" (the existing assertions stay green); "layout of a tree-only model depends on `capacity` only".
- [x] **Step 2:** Implement by skipping the `ArrayRows` block when `model.array` is undefined.

---

## Part C: the module

### Task 10: Layout and view

**Files:** Create `lib/visualizer/graph/layout.ts`, `view.ts`; tests `layout.test.ts`, `view.test.ts`.

**Interfaces:**
- `layout.ts`: `type LayoutKind = "node-link" | "layered"`; `interface Placed { pos: Record<string, { x: number; y: number }>; rows: { y: number; label?: string }[]; cols: number; height: number }`; `placeNodeLink(coords: Record<string, { x: number; y: number }>): Placed` (rows empty, `cols` and `height` the largest coordinates); `placeLayered(rows: Row[]): Placed` (row index is `y`, each row centred across the widest row at one cell spacing, a labelled row keeps its label). Positions come from structure and the graph only, never from the run, so nodes never move between frames.
- `view.ts`: `toneOf(state: NodeState, isOther: boolean): ArrayTone` (unseen `plain`, frontier `warn`, current `accent`, done `good`, and the checked neighbour `focus`); `graphModelOf(ev: TraceEvent, g: GraphData, placed: Placed, opts: { layered: boolean; outlineRow: number | null; settled: boolean }): GraphModel` (unseen nodes are `faded` only when layered; `value` becomes `badge`; `order` is copied; sides map through; trace edge `conflict` becomes `flash`); `pictureOf(variant: GraphId, ev: TraceEvent, ctx: ViewCtx, compact?: boolean): ShapeModel` where `ViewCtx` holds the graph, placed layout and, for Dijkstra, the pq capacity (the run's largest `pq.length`). The picture is a Composite of `[graph, strips…]` per variant: BFS `[graph, queue, order]`, DFS `[graph, stack, order]`, Dijkstra `[graph, heap, order]`, topological sort `[graph, ready, output]`, bipartite `[graph, queue]`; `compact` (Revision cards) keeps only the graph and the first strip: queue, stack, heap, ready, queue. Strips are `LinearModel` with node labels as items, `capacity` the node count, `defaultAxis: "horizontal"`, labels queue `in`/`out`, stack `push`/`pop` (top item first), ready `in`/`take`, order `visited`/`""`, output `output`/`""`; the item just added is `active` with tone `new`. The Dijkstra heap part is a `HeapModel` with `HeapItem { value: dist, tag: node }`, no `array`, `leaving` set on Pop and Stale, the just-pushed node `accent`, `capacity` fixed for the run. `outlineRow(variant, ev, hops)`: BFS outlines the row of the current node plus one (row 0 on Enqueue, none on Done), other variants none.
- Layout per variant comes from one table `LAYOUT: Record<GraphId, LayoutKind>` in `defs.ts`: bfs and topo `layered`, the rest `node-link`.

- [x] **Step 1: Tests.** `layout.test.ts`: `placeLayered` of the F1 rows gives `y` 0..4 and the three-node row spread across the width with the one-node rows centred; no two nodes in a row share `x`; `placeNodeLink` returns the given coordinates; positions are identical across two calls. `view.test.ts`: on F1 the BFS graph part at the Check B event has A `accent`, B `focus`, edge A-B `checking`, row 1 outlined; at Dequeue D row 3 is outlined; unseen nodes are `faded` in BFS and not in DFS; on F3 the Dijkstra graph shows `badge` `"∞"` then `"4"` then `"3"` on B across the events and the heap part's node values are the F3 pq snapshots, with a `leaving` ghost on Pop A and on Stale 4B, and no `array`; on F4 the in-degree badges follow the F4 sequence and a Reduce marks its edge `consumed`; on F5 sides are set as in the fixture and the Conflict event's edge C-D is `flash`; node positions are identical in every frame of every run; the last event's model has `settled: true` and no other has; with `compact` every picture has exactly two parts and the first is the graph; for every variant on every fixture no two adjacent models are identical.
- [x] **Step 2:** Implement; the stack strip reverses `work` so the top sits at the exit end.

### Task 11: Module, input, copy

**Files:** Create under `lib/visualizer/graph/`: `types.ts`, `input.ts`, `copy.ts`, `defs.ts`, `frames.ts`, `module.ts`; tests `input.test.ts`, `module.test.ts`, `steps.test.ts`. Modify `lib/visualizer/registry.ts`, `lib/visualizer/modules.ts`, `lib/visualizer/registry.test.ts`.

**Interfaces:**
- `types.ts`: `GRAPH_IDS = ["bfs","dfs","dijkstra","topo","bipartite"] as const` (chip order); `GraphId`; `GraphInput { algo: GraphId; preset: PresetId; start: string; seed: number }`; `GraphStep { badge: string; caption: Rich; model: ShapeModel; metric: string; outcome: Outcome; vars: VarRow[]; path: number[] }`; `GraphDef { id; name; chip; rule; lines: string[]; about: [string, string][]; tries: Experiment[]; articleHref: string; metricLabel: string; steps(input: GraphInput): GraphStep[] }`.
- `input.ts`: `toGraphInput(v: InputValues): GraphInput` (junk algo falls back to bfs, junk preset to small, a start that is not a node of the effective graph to its first node, seed clamped 0..`SEED_MAX`); `effectivePreset(algo: GraphId, preset: PresetId): PresetId` (Dijkstra only runs on `weighted`, topological sort only on `dag` or `dag-cycle`, falling back to `weighted` and `dag`; BFS, DFS and bipartite take every preset, following arrows on a directed one except bipartite, which ignores direction).
- `frames.ts`: `toFrames(def: GraphDef, steps: GraphStep[]): VizFrame[]`, same shape as `heap/frames.ts`, `metric` from the step.
- `module.ts`: `graphModule: VisualizerModule` (slug `graph-traversals`, title `Graph Traversals`, `variants: { key: "algo", restartOnSwitch: true }`, `subject: "Graph"`, unit `"step"`). Sections: variant chips (`algo`, param `g`); Input: graph chips (`preset`, param `gr`), start-node chips A..H (`start`, param `st`); seed (`seed`, param `s`). `availability` disables `start` for topological sort (hint "Starts from every node with no incoming arrow."), and puts a hint on `preset` when the effective preset differs ("Dijkstra runs on the weighted graph.") or on `start` when the node does not exist. `defaults()`: bfs, small, A, seed 0 (declared order, hand-picked so the first view matches F1). `run` returns `metricLabel` from the def (BFS and DFS "Visited", Dijkstra "Relaxations", topological sort "In output", bipartite "Coloured") and `sequence` the visit order. Registry entry: slug `graph-traversals`, title `Graph Traversals`, icon `🕸️`, kind `compare`, description naming the five variants.
- `defs.ts`: `DEFS` and the `LAYOUT` table; frame `vars` per variant: BFS current node, its hops, queue length; DFS current node, stack depth; Dijkstra the popped distance, pq length, and on Check the candidate ("via C: 2 + 1 = 3 vs 4"); topological sort ready length, output length, and on Reduce the target's new in-degree; bipartite the current node's side and the two side lists ("side a: A C E"). `path` per badge: BFS Enqueue→2, Dequeue→0, Check/Skip→1, Discover→2, Finish→3; DFS Push→0, Check/Skip→1, Pop→2; Dijkstra Pop→0, Check/Keep→1, Relax→2, Push→2, Stale→3; topological sort Count→0, first Ready→1, Take/Reduce→2, later Ready→3; bipartite Colour→0 or 1, Check/Fine→1, Conflict→2; Start, Done and Finish where unlisted→none. Outcome is "good" when the step changes the structure (Enqueue, Dequeue, Discover, Push, Pop, Relax, Take, Reduce, Ready, Colour, Finish, Start, Done), "bad" when it only inspects (Check, Skip, Keep, Stale, Fine, Conflict, Stuck).
- `copy.ts` (plain English, per variant `rule`, 2–4 `lines`, `about` cost/wins/loses/seen-in, 2–3 `tries`): BFS rule "Visit the nearest nodes first, level by level." lines "Take the node at the front of the queue.", "Look at each of its neighbours.", "Queue every neighbour not seen yet.", "Repeat until the queue is empty."; tries "Start in the middle" `{start: "E"}`, "Follow arrows" `{preset: "dag", start: "C"}` (A, B and D are never reached). DFS rule "Go as deep as you can, then back up." lines "Visit a node and put it on the stack.", "Go to its first neighbour not seen yet.", "When none is left, pop the node and go back."; tries "Other start" `{start: "H"}`, "Shuffle neighbours" `{seed: 7}`. Dijkstra rule "Always finish the closest unfinished node, then try routes through it." lines "Pop the closest unfinished node.", "For each neighbour, try the route through this node.", "If it is shorter, update the distance and push it.", "Skip entries that are out of date."; tries "Shuffle neighbours" `{seed: 7}`, "Start at E" `{start: "E"}`. Topological sort rule "Take a node only after everything it depends on is taken." lines "Count the arrows pointing into each node.", "Nodes with none go in the ready list.", "Take one, add it to the output and remove its arrows.", "A node that reaches zero becomes ready."; tries "Add a cycle" `{preset: "dag-cycle"}`. Bipartite rule "Colour a node, then give every neighbour the opposite colour." lines "Give the start node a colour.", "Give each unseen neighbour the opposite colour.", "If a neighbour has the same colour, stop: no two-colouring exists."; tries "Odd ring" `{preset: "ring-odd"}`, "Even ring" `{preset: "ring-even"}`. `articleHref` per the Locked decisions.

- [x] **Step 1: Tests.** `input.test.ts`: junk fields fall back as listed; `effectivePreset("dijkstra", "small")` is `weighted`; `effectivePreset("topo", "ring-odd")` is `dag`; `effectivePreset("bfs", "ring-odd")` is `ring-odd`; a start `"Z"` falls back to the first node. `module.test.ts`: defaults valid; field keys `algo, preset, start, seed`; `variants` equals `{ key: "algo", restartOnSwitch: true }`; default run of every variant goes `Start` to `Done`; the default BFS run matches F1 (51 frames, last badge Done); every frame has `vars`; `articleHref` of each variant equals the Locked decisions list; availability disables `start` for topo and hints a fallback preset. `steps.test.ts`: for every variant on its fixture, a single node, a disconnected graph, a graph with a self-loop, and seeds 0, 7 and 4242, no two adjacent frames have identical `model` JSON, every `path` index is inside `lines`, `lines.length` is 2–4, the last frame has `settled`, and the same seed gives the same frames. `registry.test.ts`: `graph-traversals` is `compare` and titled `Graph Traversals`.
- [x] **Step 2:** Implement the files; wire `graphModule` into `modules.ts` and the entry into `registry.ts`.

### Task 12: Revision cards

**Files:** Create `lib/visualizer/graph/revision.ts`; test `revision.test.ts`. Modify `lib/visualizer/graph/module.ts` (wire `revision`).

**Interfaces:** `graphRevision(defs: Record<GraphId, GraphDef>): RevisionCard[]`, one looping card per variant in chip order on the `MINIS` graph of that variant (Task 1), run through the same engines and view with `compact` set, `render` returns the frame's picture, `stepsText` from the captions, plus `summary` and `differs` copy (BFS: "Level by level, so the first time it reaches a node is by the fewest hops."; DFS: "Dives down one path, then backs up; the order depends on which neighbour comes first."; Dijkstra: "Like BFS but ordered by total cost, so a longer path can win."; topological sort: "Only for arrows with no cycle; it stops when nothing is ready."; bipartite: "A BFS that colours; one same-colour edge proves an odd cycle.").

- [x] **Step 1: Tests.** Five cards in chip order; each `steps` equals its frame count and `stepsText` length matches; `render(0)` is the first frame's picture and `render(steps)` the last (`settled`); summary and differs are non-empty; the bipartite card ends on a flashing edge; every card picture has two parts and the graph part keeps the same node positions at every lit step.
- [x] **Step 2:** Implement; the minis need no special cases.

### Task 13: Docs, browser check and full verification

**Files:** Modify `docs/_meta/visualizer/README.md` (add a Graph row to the Shape library table: nodes and edges in node-link or layered layout, tones, visit numbers and badges, two-colour fill, flashing edge, rows with an outlined queue row; used by Graph Traversals; reuse candidates: tries, dependency graphs, network topologies; update the backlog roadmap line to say Graph Traversals is built), `docs/_meta/visualizer/backlog.md` (remove the Graph Traversals row), `tests/e2e/test_visualizer.py` (existing).

- [ ] **Step 1:** Add one e2e test: open `/visualizer/graph-traversals/`, assert the stage shows the layered graph with a queue strip, no second block beside it, step to "Done", switch to DFS and see step 1 with the stack strip; collapse both side panels and assert the figure grows; at a 320px viewport assert the document has no horizontal scroll; open `/visualizer/graph-traversals/?g=topo&gr=dag-cycle` and see "Stuck". Run only this test after `pnpm build:e2e`, and only if the user agrees.
- [x] **Step 2:** Run once: `pnpm typecheck && pnpm lint && pnpm test:all`. Expected: all pass. Fix anything that fails at its cause (including failures in files this plan did not touch).
