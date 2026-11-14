# Backlog visualizers: shapes and stage layout

Date: 2026-11-14. Status: awaiting review.

## Goal

Build the six locked backlog visualizers (Sorting, Heap, Graph Traversals, Hash Table, Data Partitioning, Load Balancer Algorithms) so that each makes a complex scenario simpler for a student to follow. Every shape choice below was made by looking at browser mockups with real data and the real theme colours, from the student's point of view. The mockups are throwaway reference, kept outside the repo in `wiki/.superpowers/brainstorm/`.

The topics and the animations each one must cover are in `docs/_meta/visualizer/backlog.md`; that list stays the scope. This document decides how each one looks and how the shared stage changes. Existing rules in `docs/_meta/visualizer/README.md` (shape follows structure, no jumps between steps, defaults per visualizer, generic code stays generic, tests first) all still apply.

## Non-goals

- No quizzes or "predict the next step", per the README.
- No source-code view; steps stay plain-English lines.
- No SEO or sharing concerns; this is a personal tool for a small circle.
- Side-by-side compare mode stays dropped. "See them differ" is done with Revision cards.

## Stage layout

- The stage spans the full page width and holds one picture. There is no second block: the picture fills the whole stage.
- New shapes scale uniformly (aspect ratio kept) to fit the stage. The shape computes one scale from its own natural width and height and the stage size it already receives (`Stage` measures it), capped at a sensible maximum so a small figure never balloons. The figure therefore grows when the left and right side panels are collapsed and shrinks when they are open, and it is recomputed on resize. At 320px it shrinks to fit; the page never scrolls sideways.
- Information that used to sit beside the picture goes to one of two places: the picture itself (when it is part of what the student should look at) or the frame `vars` shown in the Step tab (counters, loop variables, maths). The one main counter can stay in the existing corner metric. The colour legend is dropped where the colours are self-evident (compare modules have no footer legend; only mechanism pages do).
- Colour language shared by every new shape: green is done or smaller, amber is waiting or larger-or-equal, indigo is the current item or pivot, a white ring means being compared right now, grey means untouched or not reached yet. Partitioning and load balancer instead give each node its own colour and keep it everywhere. All colours stay `--viz-*` tokens.

The 19 shipped visualizers keep working unchanged; only the new shapes use fit-to-stage scaling.

## Shapes

Six new generic shapes. Each is a component under `components/visualizer/shapes/` plus a model type in `lib/visualizer/core/shapes.ts`, with no visualizer-specific words; the module adapter supplies domain copy. Queue and stack strips reuse Linear; stacking uses Composite.

### Array (bars)

Bars where height is the value, with index labels. Overlays: pointers with labels (i, j, pivot, L, R, lo, mid, hi), shaded zones with a label under the bars (smaller than pivot, larger or equal, not looked at yet), the pair being compared ringed in white, swap motion, a "next swap" arrow, and faded already-taken bars. Extra rows can sit under the main one: an aux row for merge sort ("merged so far", empty dashed slots with the next slot outlined), a counts row for counting, radix and bucket sort (one bar per value, the one being bumped ringed with "+1"), and an output row. Items can carry an identity tag (5a, 5b) with distinct hues so stability is visible; tags only appear when the Stability input is on. Bars were chosen over number cells; number cells were rejected. Look, as approved from the polished mockup: opaque solid fills (no see-through colours), a ground line under the bars, the value as a number above each bar, an index row, pointer tags under the bars with a small arrow up at their bar (only real pointers get a tag, no empty spacer pills), and a white glow on the bar being compared.

### Heap (tree plus array)

Complete binary tree, root on top, with the array drawn underneath as bars, both lit in sync for the node being sifted and the node it is compared with. Level bands (L0, L1, ...) under the array show which array slots belong to which tree level. The tree position maths is generic complete-binary layout so a later BST or segment tree can reuse it. The array bars with level bands sit under the tree inside the Heap shape, so tree and array are one picture. The parent-index maths for the highlighted node (parent of 3 is (3-1)/2 = 1) goes to Step-tab vars. Heap sort adds a divider between heap region and sorted region. Top-K adds a stream queue (Linear) feeding a small min-heap and shows the evicted element leaving.

### Graph (two layouts)

One shape, two layouts, picked per visualizer at build time:

- Node-link: hand-laid presets (small graph, weighted graph, DAG, bipartite candidate), edges drawn between nodes.
- Layered, root on top: rows by hops from the start (BFS, Dijkstra) or by longest path from the sources (topological sort), computed per run. The row currently being filled is outlined as the queue. Not-yet-reached nodes are faded.

Node states: unseen, in frontier, current, done. Edge states: tree edge, being checked, skipped because already seen, consumed (faded). Visit order is numbered on each node. Small badges carry per-node values: in-degree for topological sort, distance for Dijkstra. Two-colour fill for bipartite, with the conflicting edge flashing. The working structure is required for Graph Traversals and always sits at the bottom of the stage, under the graph (same place every step, never to the side), stacked with Composite and scaled with the picture: a queue strip (BFS), a stack strip (DFS), a Heap-shape priority queue (Dijkstra), a ready list plus output order (topological sort), and a visited-order row. The grid maze was considered and rejected.

### Table (vertical slots)

Slots 0 to m-1 as a vertical list. Open addressing: occupied, empty and tombstone slots, hop arcs down the side for each probe, and a dashed amber outline over a cluster run. Chaining: a short slot cell with chain nodes growing to the right, visited nodes outlined. The key being inserted appears as a chip with a dashed line to its first slot. The hash maths (`32 mod 8 = 0`), probe count or chain length and the load factor go to Step-tab vars; a load factor meter with the resize threshold marked is drawn as part of the table picture. (Not designed in detail yet.) Quadratic probing shows jumps of 1, 4, 9; double hashing shows the second hash as the step; delete shows a tombstone; resize shows the old table fading while a larger one fills. The same Table shape draws the directory in Data Partitioning and the score table for rendezvous hashing. Default 8 slots (my call, so the clustering demo stays readable).

### Keyspace (ring or line) and Bins

Keyspace draws one hash space either as a ring (consistent hashing, virtual nodes as extra small markers in the node's colour) or unrolled as a straight line (range partitions). Arcs or segments are coloured by owning node, keys are dots in their owner's colour, node markers sit outside the ring, and keys that just changed owner get a white ring. On a ring a key goes clockwise to the next node. Bins draw one column per node holding the keys it owns, used for mod-N and hot-key skew. Keys per node (the busiest one flagged hot) show as bars that are part of the keyspace picture, and the "keys moved" readout against the ideal of 1/N goes to Step-tab vars. (Not designed in detail yet.) Add node and remove node animate the moved keys. The Revision cards pair mod-N with the ring on the same added node: mod-N moves about three times as many keys.

### Flow cards (load balancer)

Incoming request, then the balancer, then one card per server with a large connection count and the in-flight requests as chips; each chip has a bar showing time left that drains as the request finishes. The chosen route is highlighted and the arriving request appears as a dashed ghost chip in the chosen server. Request durations are uneven so long requests visibly pile up. The decision panel is the key learning element and stays on screen inside the picture; it differs per policy: whose turn it is (round robin), the weights and credits (weighted), the connection counts side by side with the lowest picked (least connections), the hash maths (IP hash). A failed server turns hatched and its requests re-route with dotted arrows. Time is abstract ticks, not milliseconds.

## Per visualizer

| Visualizer | Variants (default order, easier first) | Main inputs | Shape |
|---|---|---|---|
| Sorting | Insertion, Selection, Merge, Quick, Heap, Counting, Radix, Bucket | input preset (random, nearly sorted, reversed, duplicates), size, stability tags | Array, Heap for heap sort |
| Heap | Insert, Extract, Build-heap vs n inserts, Heapsort, Top-K | values, min or max heap | Heap, Array row, Linear for the stream |
| Graph Traversals | BFS, DFS, Dijkstra, Topological sort, Bipartite check | graph preset, start node | Graph, Linear, Heap |
| Hash Table | Chaining, Linear probing, Quadratic probing, Double hashing, Resize | keys, table size, load factor threshold | Table |
| Data Partitioning | Mod-N, Range, Consistent hashing with virtual nodes, Directory, Rendezvous | node count, operation (add, remove, hot key) | Keyspace, Bins, Table |
| Load Balancer | Round robin, Weighted round robin, Least connections, IP hash | server count, request durations, server failure | Flow cards |

Each module picks its own learning-first defaults, with a hand-picked starting sequence where one fits, never copied from another. Sorting shows the comparisons and writes counters in its `vars` and corner metric. Every change gets its own step (a swap, a pointer move, a probe, a hop, a dequeue); no step skips over a change, and the existing step-rule test is extended to the new shapes where it can be. Each visualizer gets Revision cards, one looping card per variant.

## Build order

1. Sorting (builds Array).
2. Heap (reuses the Array row, builds Heap; also needed by heap sort and Dijkstra).
3. Graph Traversals (builds Graph, reuses Heap for Dijkstra).
4. Hash Table (builds Table).
5. Data Partitioning (reuses Table, builds Keyspace and Bins).
6. Load Balancer (builds Flow cards).

Fit-to-stage scaling is built first, as part of the Sorting work (Array shape), since every later shape follows the same rule.

## Left to the builder

- Exact slot, bar and node sizes and spacing, within the fit-to-stage rule (the scale cap is a token in `css/tokens.css`); map the approved bar look onto the theme tokens and check it in every theme preset.
- Which Graph layout each graph visualizer uses, decided as each is built from what its teaching point needs (levels or the queue).
- Model field names, adapter code, scenario data, copy for steps, About and Try tabs.
- How resize is drawn in detail.
- What each visualizer's frame `vars` hold. The rule is: whatever extra information helps the student understand what that visualizer is showing (for Sorting that likely includes the loop variables now versus before and the comparison and write counters, but each algorithm decides). The colour legend is dropped; the shared colour language below explains it.
