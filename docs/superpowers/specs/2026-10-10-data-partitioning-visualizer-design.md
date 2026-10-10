# Visualizer — Data Partitioning — Design

Section-wide principles and rules live in `docs/_meta/visualizer/README.md`; layering rules (generic shapes vs per-visualizer adapters) live in `CONVENTIONS.md` under Visualizer. This spec is the detail for this visualizer. It builds on the frame from `2026-10-07-cache-visualizer-design.md`, the variants and Revision contract from `2026-10-09-visualizer-variants-and-revision-design.md`, and the Composite shape from `2026-10-09-rate-limiting-visualizer-design.md`.

## Purpose

Let a student place one set of keys on a set of nodes under seven partitioning schemes, change the node count, and watch which keys move. The articles explain the trade-offs; this makes the cost of a node change visible key by key.

Success: after one run a student can say that Mod-N moves about (N−1)/N of the keys when N changes; that Range keeps neighbouring keys together but turns sequential keys into a hot range; that Directory moves only what its balancer chooses, at the cost of a lookup hop; that a ring moves about 1/N but gives nodes uneven shares; that virtual nodes even the shares out; that bounded-load caps how many keys a node holds at the cost of some keys leaving their natural node; that rendezvous gets the ring's 1/N with no ring at O(N) per lookup; and that no hashing scheme can split a single hot key.

Audience: the author plus a small known circle. Inherits the wiki theme; works offline.

## Scope

- Route `/visualizer/data-partitioning/`, slug `data-partitioning`, title "Data Partitioning", subtitle "Sharding, consistent hashing and rebalancing", registered in `registry.ts` and `modules.ts`; the landing card and home count follow.
- Schemes, in variant order (increasing difficulty): **Mod-N, Range, Directory, Ring, Virtual nodes, Bounded-load, Rendezvous**.
- Single view and Revision view (seven looping cards).
- New generic shapes: **Bins**, **Scale** (line and circle layouts) and **Table**. Ranking and Composite are reused; Composite gains a side-by-side layout.
- Generic frame changes: a `neutral` outcome, an `action` field kind (buttons), and Composite `layout` (see Frame changes).
- `data/glossary.json`: six new entries (see Revision).

Non-goals: no replication, no replica placement, no data-copy timing, no key salting or splitting a hot key, no per-request traffic simulation, no backend, no new runtime dependencies.

## Step model

One step is one **key placement** or one **node event**. A run is:

1. **Place phase:** one step per key, in sequence order, onto the starting nodes.
2. **Per event** (Add node or Remove node, at most four, in order): one **event step** (the node appears or disappears; Range splits or merges; Directory's balancer acts), then a **re-check phase** with one step per key, in sequence order, where the key is looked up again under the new nodes and either stays or moves.

Steps per run = K + E × (1 + K), at most 12 + 4 × 13 = 64. Every scheme gives the same count for the same keys and events, so switching scheme keeps the step.

Outcomes: place and event steps are `neutral`; a re-check where the key stays is `good`; a re-check where it moves is `bad` (data has to be copied). The strip therefore shows the cost of each event: mostly red under Mod-N, mostly green under the ring schemes.

During a re-check phase, keys not yet re-checked are drawn on their pre-event node; keys already re-checked are on their new node. The moved key's chip flies from its old bin to its new one (see Views).

## Hashing

- **Keys** are whole numbers 0–99. **Key hash** `h(k) = (37k + 11) mod 100`. 37 and 100 are coprime, so h is a bijection on 0–99: no two keys share a position, and every hash can be checked by mental arithmetic.
- **Nodes** are letters A–J. Node `i` (A = 1 … J = 10) sits at `h(i)` on the ring: A 48, B 85, C 22, D 59, E 96, F 33, G 70, H 7, I 44, J 81. The starting nodes are A onwards; **Add node** creates the next letter never used in this run, so a removed node is never resurrected at its old position. At most 6 nodes exist at once and at most 10 letters are used in a run (6 starting + 4 adds).
- **Virtual nodes** come from a fixed, visible table (position r = 0 is the node's own `h(i)`, so one virtual node is the plain ring):

| Node | r = 0 … 7 |
|---|---|
| A | 48 88 1 45 94 35 73 13 |
| B | 85 90 20 62 76 38 56 32 |
| C | 22 11 47 80 63 31 98 37 |
| D | 59 87 26 97 52 82 68 4 |
| E | 96 66 8 34 16 71 21 86 |
| F | 33 12 65 28 55 41 74 51 |
| G | 70 0 42 39 46 19 25 29 |
| H | 7 58 91 10 17 79 43 3 |
| I | 44 18 49 72 84 77 5 53 |
| J | 81 40 99 69 75 78 92 54 |

  All 80 positions are distinct. The table was chosen so that, for every starting count from 2 to 7 nodes, the spread between the largest and smallest ring share shrinks at each step of 1 → 2 → 4 → 8 virtual nodes (for 3 nodes: 26/37/37, 29/39/32, 38/30/32, 33/33/34 percent). A formula of the form `h(i) + r·(a·i + b)` cannot do this in a 100-position space (either the shares sometimes worsen as virtual nodes are added, or the virtual nodes bunch up and change nothing), so a table is used and the About tab says so, along with the real-world figure of 100–200 virtual nodes per node.
- **Ring ownership:** a key belongs to the first node position at or clockwise after `h(k)`, wrapping past 99 to 0. A key exactly on a node position belongs to that node.
- **Rendezvous score** `s(k, i) = (h(k) × (2i + 1) + 7i) mod 100`; the highest score wins, ties go to the earlier letter. Two nodes can tie only when `h(k)` is 9, 34, 59 or 84 and the nodes are 4 or 8 letters apart; the tie rule is tested.

## Schemes

Let K be the number of keys, N the number of nodes alive, w(k) the key's weight (5 for the hot key, otherwise 1), and the load of a node the sum of its keys' weights.

| Scheme | Place | Add node | Remove node |
|---|---|---|---|
| Mod-N | alive nodes in letter order; node index = `h(k) mod N` | re-check every key with the new N | re-check every key with the new N; the remaining nodes keep letter order |
| Range | raw key value k (not h) against contiguous ranges; N starting nodes split 0–99 equally: node j gets `⌊100j/N⌋ … ⌊100(j+1)/N⌋ − 1` | the fullest range (most keys; ties: lowest range) splits at its median key m (the key at index ⌊count/2⌋ of its sorted keys): the old node keeps `lo … m − 1`, the new node takes `m … hi` and is inserted next to it; if m = lo the split falls at `⌊(lo + hi)/2⌋ + 1`; a one-value range cannot split and the next fullest is used | the removed node's range merges into its lower neighbour (the upper one if it was first) |
| Directory | each key, in order, goes to the least-loaded node (ties: earlier letter); the directory records it | the balancer repeats: scan the old nodes from most to least loaded (ties: earlier letter) and move the first node's most recently assigned key k for which `load(node) − load(new) ≥ 2·w(k)`; stop when no node has such a key | the removed node's keys, in their assignment order, each go to the least-loaded remaining node |
| Ring | ring ownership over one position per node | re-check every key | re-check every key |
| Virtual nodes | ring ownership over V positions per node (V from the table) | re-check every key | re-check every key |
| Bounded-load | cap = ⌈c × K / N⌉ keys; keys in sequence order walk clockwise from `h(k)` and take the first node (one position each) holding fewer than cap keys | recompute cap; re-place every key in sequence order | recompute cap; re-place every key in sequence order |
| Rendezvous | highest score among the alive nodes | re-check every key | re-check every key |

Directory balances by load, not count, so under the Hot key workload the hot key's node receives no further keys until the others catch up: Directory is the one scheme that can isolate a hot key. Bounded-load caps key **count**, so a hot key's weight still lands whole on one node.

## Parameters

| Group | Field | Kind | Values | Default | Notes |
|---|---|---|---|---|---|
| Scheme | Scheme | chips | the seven schemes | Mod-N | the variants field; Prev/Next and Shift+←/→ come from the frame |
| Nodes | Nodes | slider | 1–6 | 4 (3 starting + one Add) | shows the node count after the last event; dragging it sets a new starting count and clears the events |
| Nodes | Add node | action | | | appends `+`; disabled at 6 nodes or 4 events |
| Nodes | Remove node | action | | | appends `−X`, X picked from the nodes alive at that point by the seeded rng; disabled at 1 node or 4 events |
| Nodes | Events | sequence | `+` and `−X` tokens | `+` | editable; `resetBy: ["nodes"]` |
| Nodes | Virtual nodes | chips | 1 · 2 · 4 · 8 | 4 | enabled for Virtual nodes only |
| Nodes | Cap factor c | chips | 1.0 · 1.25 · 1.5 · 2.0 | 1.25 | enabled for Bounded-load only; hint shows the live cap ("cap = 4 keys per node") |
| Keys | Workload | chips | Random · Sequential · Hot key | Random | regenerates Keys |
| Keys | Keys | sequence | 1–12 keys | hand-picked (below) | `resetBy: ["workload"]` |
| (none) | Seed | seed | | random | drives the workloads and Remove's pick |

- The starting node count is `slider − (adds − removes)`. Pressing Add or Remove moves the slider with the event and jumps playback to the new event step (see the `action` field under Frame changes). Dragging the slider sets the starting count to the new value and clears the events (Events lists `nodes` in its `resetBy`). Editing the Events field directly keeps the slider and recomputes the starting count; an edit that would need a starting count outside 1–6 is the error "Node count must stay between 1 and 6".
- The Remove pick is decided when the button is pressed and written into the event token, so the URL replays exactly and the Events field shows which node went.
- **Keys grammar:** whole numbers 0–99 separated by spaces, commas or underscores, each at most once, 1–12 of them; at most one key may carry a `*` suffix (the hot key, weight 5). Errors: "Keys must be whole numbers from 0 to 99", "Each key can appear once", "Use 1 to 12 keys", "Only one key can be hot (*)". URL: joined with `_` (`k=12_18_29_61*_65`).
- **Events grammar:** `+` or `-` followed by a node letter, separated like keys, at most 4. Errors: "Events are + or −X (X a node letter)", "At most 4 events", "Node count must stay between 1 and 6", "Can't remove X: it isn't there at that point". URL: joined with `_` (`e=+_-B`).
- **Hints** through `availability`: Nodes says "Add and Remove change this; dragging starts over"; Cap factor shows the live cap; Virtual nodes says "Positions from a fixed table; real systems use 100–200".

**Defaults, chosen for this visualizer:** scheme Mod-N, 3 starting nodes and one Add (slider 4), Virtual nodes 4, Cap factor 1.25, workload Random, random seed, and the hand-picked keys `12 18 29 61 65 66 79 97`. 17 steps (8 + 1 + 8). The same keys and event are the default for every scheme, and switching the scheme chip keeps the current step (`restartOnSwitch` off), so a student who pauses after the event can flip schemes and watch "Keys moved" change in place.

Why these keys (hashes 55, 77, 84, 68, 16, 53, 34, 0): adding D moves exactly 6/8 under Mod-N, which is (N−1)/N, and exactly 2/8 under Ring, which is 1/N. The plain ring starts lopsided (A 1, B 5, C 2 keys), virtual nodes at 4 end even (2/2/2/2), and Bounded-load overflows at the start (cap 4: key 66's natural node B is full, so it walks on to C). Results under each scheme, start → after Add D:

| Scheme | Start (3 nodes) | After Add D | Moved |
|---|---|---|---|
| Mod-N | A 29 97 · B 12 65 79 · C 18 61 66 | A 29 61 65 97 · B 18 66 · C 79 · D 12 | 6/8: 12 18 61 65 66 79 |
| Range | A[0–32] 12 18 29 · B[33–65] 61 65 · C[66–99] 66 79 97 | A[0–17] 12 · D[18–32] 18 29 · B 61 65 · C 66 79 97 | 2/8: 18 29 |
| Directory | A 12 61 79 · B 18 65 97 · C 29 66 | A 12 61 · B 18 65 · C 29 66 · D 79 97 | 2/8: 79 97 |
| Ring | A 79 · B 12 18 29 61 66 · C 65 97 | A 79 · B 18 29 61 · C 65 97 · D 12 66 | 2/8: 12 66 |
| Virtual nodes (4) | A 79 97 · B 12 29 65 66 · C 18 61 | A 79 97 · B 29 65 · C 18 61 · D 12 66 | 2/8: 12 66 |
| Bounded-load (1.25) | cap 4 · A 79 · B 12 18 29 61 · C 65 66 97 | cap 3 · A 79 · B 18 29 61 · C 65 97 · D 12 66 | 2/8: 12 66 |
| Rendezvous | A 29 · B 12 18 65 79 · C 61 66 97 | A — · B 12 18 65 79 · C 61 66 · D 29 97 | 2/8: 29 97 |

These values come from simulating the rules in this spec; the headline ones (all hashes, both Mod-N placements, the ring before and after, Directory's two balancer moves, Rendezvous for 12, 29 and 97, Bounded-load's start cap and overflow, Virtual nodes after the add) were also checked by hand. The tests must pin them against hand-checked frames, not copy them from the implementation.

## Workload generator

Seeded with `core/rng`, independent of the scheme, so one seed gives one key set under every scheme. Each chip generates 8 keys.

| Chip | Keys |
|---|---|
| Random | 8 distinct keys drawn from 0–99 |
| Sequential | 8 consecutive keys starting at a seeded value from 60 to 92 (recent IDs): Range piles them into one range, every hash scheme scatters them |
| Hot key | as Random, with one seeded key marked hot (`*`) |

## Metric and variables

Corner metric **Keys moved**: for the latest event so far, moved / K (e.g. "6/8"); "—" before the first event step.

Step tab variables (now vs before, changes marked). Common rows: key, phase (place / event / re-check), node now, node before (re-check only), moved this event, fewest possible (Add: K / N after the add, rounded; Remove: the removed node's key count). Per scheme:

| Scheme | Rows |
|---|---|
| Mod-N | h(k), N, h(k) mod N |
| Range | k, owning range |
| Directory | directory entry, loads |
| Ring | h(k), first node clockwise, shares |
| Virtual nodes | h(k), virtual node hit (e.g. "B·3 at 62"), shares |
| Bounded-load | h(k), cap, natural node, nodes skipped (full) |
| Rendezvous | scores (all nodes), winner, runner-up |

"Shares" is each node's percentage of the ring. It is the quantity virtual nodes actually even out; key counts follow only on average, and with 8 keys they stay noisy.

## Views

Each view is a model built by the adapter and drawn by generic shapes. Decided from browser mockups.

| Scheme | View | Shapes |
|---|---|---|
| Mod-N | node bins with key chips; caption shows the arithmetic with N filled in, e.g. `h(92) = 15 → 15 mod 4 = 3 → D · was A` | Bins |
| Range | a 0–99 ruler of raw key values with range bands and key marks, above the bins; **bins follow key-space order**, so a split's new node sits next to the range it came from | Composite: Scale (line) + Bins |
| Directory | the directory table (`key → node`) beside the bins; a balancer move rewrites one row | Composite (side): Table + Bins |
| Ring | ring with node points labelled by letter, key points, owner arcs, and the current key's clockwise walk highlighted, beside the bins; each bin header shows its ring share | Composite (side): Scale (circle) + Bins |
| Virtual nodes | as Ring, with V points per node labelled `A·0 … A·7` | Composite (side): Scale (circle) + Bins |
| Bounded-load | as Ring, plus a dashed cap line in every bin and the walk passing full nodes | Composite (side): Scale (circle) + Bins |
| Rendezvous | the current key's scores as a ranking of nodes (winner on top) beside the bins | Composite (side): Ranking + Bins |

- **Moved key:** on a re-check step where the key moves, its chip flies from the old bin to the new one along an arrow; the arrowhead travels with the chip and arrives with it (nothing appears at the destination first). Moved chips keep a moved tint in their new bin for the rest of the event, so the moved count builds up visibly. Only the current step's key animates, so at most one arrow is on screen. Uses `--viz-move`; under `prefers-reduced-motion` the chip is drawn in place with a static arrow.
- **Event step:** an added node enters (bin and ring point, enter animation); a removed node's bin and point are marked removed and stay until its re-check phase ends; a Range split or merge redraws the bands. Every new shape element gets an enter animation using `--viz-move`, off under reduced motion.
- **Hot key:** when a key is hot, every bin shows a load bar on one shared scale with a dashed average line, and the hot key's chip reads `61 ×5`. Without a hot key the load bars are hidden (load would equal the chip count).
- **Narrow stages:** side-by-side Composites stack vertically when the stage is narrower than the two parts' natural widths (Ring at 320px: ring above bins, about 290px tall, inside the 380px narrow stage). Six 40px bins fit 320px.
- **Caption:** one line: the decision with its arithmetic, plus "was X" on a moved re-check.

## Generic layer

Vocabulary-neutral, per CONVENTIONS: no "key", "node", "shard" or "hash" in generic code; the adapter supplies every label. Lives in `core/shapes.ts`, `core/geometry.ts` and `components/visualizer/shapes/`, picked by `Shape.tsx`.

```ts
type ItemTone = "changed" | "heavy";
interface BinItem { id: string; text: string; tone?: ItemTone }
interface Bin { id: string; label: string; items: BinItem[]; state?: "new" | "removed"; meter?: number }
interface BinsModel {
  kind: "bins";
  bins: Bin[];
  active: string | null;
  move: { item: string; from: string; to: string } | null;
  limit: number | null;
  meter: { max: number; mark: number } | null;
  slots: number;
}

interface ScaleSegment { from: number; to: number; owner: string; label: string; state?: "new" | "removed" }
interface ScaleAnchor { at: number; label: string; owner: string; state?: "new" | "removed" }
interface ScalePoint { at: number; label: string; tone?: ItemTone; active?: boolean }
interface ScaleModel {
  kind: "scale";
  layout: "line" | "circle";
  size: number;
  segments: ScaleSegment[];
  anchors: ScaleAnchor[];
  points: ScalePoint[];
  walk: { from: number; to: number } | null;
  ticks: number[];
}

interface TableModel {
  kind: "table";
  head: [string, string];
  rows: { cells: [string, string]; tone?: "changed" }[];
  active: number | null;
}

interface CompositeModel {
  kind: "composite";
  layout?: "stack" | "side";
  parts: LeafModel[];
}
```

- **Bins** draws labelled columns of chips in the given order. `slots` is the run-wide tallest bin so the stage keeps one height. `limit` draws a dashed line after that many chips. `meter` draws a bar per bin on one shared scale with a dashed line at `mark`. `move` animates one chip from bin to bin with a travelling arrow. The screen-reader label lists bins and their items in order.
- **Scale** draws positions `0 … size − 1` as a line or a circle (0 at the top, clockwise). Segments are owner arcs or bands; anchors are labelled points (letters drawn next to them); points are item marks; `walk` highlights the clockwise path from an item to its owner. Close points are offset outward so labels stay legible. No axis, so Rotate is hidden.
- **Table** draws two-column rows with an active row and changed rows.
- **Ranking** is reused for rendezvous scores: rows are the alive nodes by score, `capacity` is set above the row count so no row is flagged.
- **Composite** gains `layout: "side"`: parts sit in a row and fall back to a stack when the measured width is too small; the default stays `"stack"`, so existing modules are unchanged.
- Considered and rejected: Lanes for the bins (Lanes means actors exchanging numbered messages; a partitioned dataset has no messages, so the shape would mislead), the existing Ring for the hash ring (it is evenly spaced slots with a hand; this needs arbitrary positions and owner arcs), and Timeline for the key ruler (its axis is ticks of time, capped at 20).

## Frame changes

1. **`neutral` outcome.** `Outcome` becomes `"good" | "bad" | "neutral"`. Strip and log draw neutral cells and rows with the slot colours; existing modules never emit it.
2. **`action` field kind.** `{ kind: "action"; key; label; apply: (values) => { values: InputValues; step?: number } }`, rendered as a button in its section. Pressing it replaces the values wholesale (no `resetBy` is applied, so Add can move the slider without clearing the events it just extended), rewrites the URL, re-runs, and seeks to `step` when given, otherwise step 1. Here `step` is the new event's step (K + E_before × (1 + K)), so the student watches the event and its re-check instead of replaying the placements. Disabled and hint come from `availability` like any field. No URL param of its own.
3. **Composite `layout`** as above.
4. **Variants:** `variants: { key: "scheme" }`, `restartOnSwitch` off. Equal frame counts across schemes hold by construction, and a test enforces it.
5. **Revision:** the module supplies seven cards.

A module that does not use these is unaffected.

## Revision

Seven cards, in variant order. Each runs the real scheme over the fixed mini-run **keys `12 18 29 61 65 66`, 3 starting nodes, one Add**, and plays its 13 steps by drawing the Single-view model at each step (`render(0)` is the empty start), at the 200px card stage. The legend is not shown (it belongs to flow-diagram cards only). Ring-based cards use Composite `side` with at most 4 bins of 34px, which fits the 250px minimum card width. Virtual nodes uses V = 4; Bounded-load uses c = 1.25. Cards are independent of the inputs. Each supplies `steps`, `render`, `stepsText` (one screen-reader line per step, unique, e.g. "Re-check 66: moves from B to D"), `summary`, `glossaryTerm` and `differs`.

Mini-run results (start → after Add D, moved): Mod-N 5/6 · Range 2/6 · Directory 1/6 · Ring 2/6 (B starts with 5 of 6) · Virtual nodes 2/6 · Bounded-load 2/6 (cap 3 at the start pushes 61 and 66 from B to C) · Rendezvous 1/6.

| Card | glossaryTerm | summary | differs |
|---|---|---|---|
| Mod-N | `modulo hashing` | Node = hash mod N. | Even and simple, but changing N moves most keys. |
| Range | `range partitioning` | Each node owns a contiguous key range. | Range scans stay on one node, but sequential keys pile onto one range. |
| Directory | `directory-based sharding` | A lookup table maps each key to a node. | Moves only what the balancer picks, but every lookup adds a hop. |
| Ring | `consistent hashing` | Walk clockwise from the key's hash to the first node. | A node change moves about 1/N of keys, but shares are uneven. |
| Virtual nodes | `virtual node` | Each node sits at many ring positions. | Shares even out as positions are added, at the cost of a bigger ring. |
| Bounded-load | `bounded-load consistent hashing` | A full node passes the key clockwise to the next. | Caps keys per node, but some keys leave their natural node. |
| Rendezvous | `rendezvous hashing` | Score the key against every node; highest wins. | Moves about 1/N like the ring, with no ring, but lookup is O(N). |

`consistent hashing` exists in `data/glossary.json`; the other six are added (keys lowercase and singular).

## Module content

- **Step tab:** two to four plain-English lines per scheme with the executed line highlighted.

| Scheme | Lines |
|---|---|
| Mod-N | Hash the key · Divide by the node count; the remainder picks the node · After a node change, check again with the new count |
| Range | Find the range that holds the key · That range's node owns it · Add splits the fullest range at its middle key; remove merges into a neighbour |
| Directory | Look the key up in the directory · A new key goes to the least-loaded node · Add moves recent keys off the fullest nodes until even; remove hands its keys to the least loaded |
| Ring | Hash the key to a point on the ring · Walk clockwise to the first node · That node owns the key |
| Virtual nodes | Hash the key to a point on the ring · Walk clockwise to the first virtual node · Its physical node owns the key |
| Bounded-load | Hash and walk clockwise · Node already at the cap: keep walking · The first node under the cap owns the key |
| Rendezvous | Score the key against every node · The highest score wins; a tie goes to the earlier letter |

- **About tab:** lookup cost, wins, loses, seen in, per scheme. Lookup: Mod-N O(1); Range O(log N); Directory O(1) plus a network hop; Ring O(log N); Virtual nodes O(log NV); Bounded-load O(log N) plus the walk; Rendezvous O(N). Seen in: Mod-N, simple client-side cache sharding; Range, Bigtable, HBase, CockroachDB; Directory, MongoDB's chunk map, Vitess lookup tables; Ring, Dynamo, Cassandra; Virtual nodes, Cassandra tokens, Riak; Bounded-load, HAProxy's balance factor; Rendezvous, GitHub's GLB load balancer, Apache Ignite. Virtual nodes' About states that its positions come from a fixed table chosen to show the trend and that real systems use 100–200 per node.
- **Try tab:** two presets per scheme. Every preset patches keys, nodes, events and the scheme's own chip together, so it shows its point whatever the inputs were. A test per preset first moves the inputs away from the defaults, then applies the preset and pins the outcome.

| Scheme | Preset | Keys | Start nodes · events | Pinned result |
|---|---|---|---|---|
| Mod-N | Add one node, most keys move | default | 3 · `+` | 6/8 moved |
| Mod-N | Remove a node, still a reshuffle | default | 4 · `-B` | 5/8 moved; B held only 2 (18 66) |
| Range | Sequential keys, one hot range | `90 … 97` | 3 · none | all 8 on C [66–99]; A and B empty |
| Range | Split the hot range | `90 … 97` | 3 · `+` | C[66–93] 90–93 · D[94–99] 94–97; 4/8 moved |
| Directory | Add moves only the fair share | default | 3 · `+` | 2/8 moved: 79 97 |
| Directory | Give the hot key its own node | default with `61*` | 3 · `+` | start A 12 61* (load 6); after: A holds only 61*, D 12 79; 2/8 moved |
| Ring | Add takes one arc | default | 3 · `+` | 2/8 moved, both into D from B |
| Ring | Remove sends everything to one neighbour | default | 3 · `-B` | 5/8 moved, all to C |
| Virtual nodes | More positions, even shares | default, V = 8 | 3 · none | shares 33/33/34 (V = 1 gives 26/37/37) |
| Virtual nodes | Remove spreads over the survivors | default, V = 4 | 3 · `-B` | B's 4 keys split: 29 to A; 12 65 66 to C |
| Bounded-load | c = 1.0 forces even counts | default, c = 1.0 | 3 · `+` | start cap 3: A 79 97 · B 12 18 29 · C 61 65 66; after cap 2: 2 per node |
| Bounded-load | The cap can't split a hot key | default with `29*`, c = 1.25 | 3 · `+` | key cap holds (3 after the add) but B's load is 7 against an average of 3 |
| Rendezvous | Add moves only what the new node wins | default | 3 · `+` | 2/8 moved: 29 97 |
| Rendezvous | Remove spreads the lost node's keys | default | 3 · `-B` | 4/8 moved, only B's: 12 65 to A; 18 79 to C |

**Article links:** one per scheme, each a deep link that a content test asserts exists:

| Scheme | Link |
|---|---|
| Mod-N | `/system-design/algorithms/consistent-hashing/#the-problem--why-modulo-hashing-breaks` |
| Range | `/system-design/algorithms/sharding-strategies/#range-sharding` |
| Directory | `/system-design/algorithms/sharding-strategies/#directory-based-lookup-table-sharding` |
| Ring | `/system-design/algorithms/consistent-hashing/#the-ring` |
| Virtual nodes | `/system-design/algorithms/consistent-hashing/#virtual-nodes` |
| Bounded-load | `/system-design/algorithms/consistent-hashing/#bounded-load-consistent-hashing` |
| Rendezvous | `/system-design/algorithms/consistent-hashing/#often-confused-with` |

## Files

`lib/visualizer/data-partitioning/`: `module.ts`, `types.ts`, `hash.ts` (h, the virtual-node table, rendezvous score, shares), `schemes/{mod-n,range,directory,ring,virtual-nodes,bounded-load,rendezvous}.ts` (each implementing one interface: place, add, remove), `engine.ts` (phases → steps, moved counts), `keys.ts` (keys and events grammar), `trace.ts` (workloads, Remove pick), `view.ts` (state → Bins / Scale / Table / Ranking / Composite models; split per scheme if it nears 400 lines), `frames.ts`, `revision.ts`, `copy.ts`.

Also: `core/types.ts` (`neutral`), `core/fields.ts` (`action`), `core/shapes.ts`, `core/geometry.ts`, `components/visualizer/shapes/{BinsShape,ScaleShape,TableShape}.tsx`, `CompositeShape.tsx` (`side`), `Shape.tsx`, `components/visualizer/frame/{ConfigFields,TimelineStrip}.tsx` and the log row, CSS in `css/view-visualizer/stage.css` (and `ui.css` for the action button) with `--viz-*` tokens only and breakpoints only in `css/responsive.css`, `data/glossary.json`, `registry.ts`, `modules.ts`, the README (Bins, Scale and Table in the shape table; Ring's reuse note corrected; roadmap), `docs/_meta/visualizer/backlog.md` (topic removed) and the CLAUDE.md FILE MAP (`lib/visualizer/data-partitioning/`, new shapes).

## Testing

Vitest, fixture-first, against hand-checked frames:

- `hash`: h for every default key; the table's 80 distinct positions and r = 0 equal to h(i); the shares spread shrinking across 1 → 2 → 4 → 8 for 2 to 7 nodes; a rendezvous tie resolved to the earlier letter.
- One file per scheme over scripted keys: place, add, remove; Range's median split, the m = lo fallback, the one-value range skipped, merge into the lower and the upper neighbour; Directory's load-based placement and balancer stop rule, including the hot key; Bounded-load's cap and walk past full nodes, for each c; ring wrap past 99 and a key exactly on a node position.
- Engine: step count K + E(1 + K), outcomes per phase, the moved count and fewest-possible per event, equal frame counts across schemes for one input, letters never reused after a remove.
- Grammar and errors for keys and events; the Remove pick deterministic per seed and written into the token; the slider and events interplay (Add moves the slider; dragging clears events); Add/Remove disabled at their limits.
- Generator determinism per seed, independence from the scheme, each chip's shape.
- The default keys under every scheme (the table above) and every Try preset, each run after moving the inputs away from the defaults.
- Revision: seven cards in order, 13 steps each, unique `stepsText`, the finished state held; every `glossaryTerm` exists in `data/glossary.json`.
- Shapes: Bins (order, slots, limit line, meter scale and mark, move animation and its reduced-motion form, removed and new bins), Scale (line and circle geometry, wrap, offset of close points, walk arc, anchor labels), Table, Composite `side` and its fallback at narrow widths; a component test for every new component; the `neutral` strip cell and log row; the action field.
- URL round trip with keys, hot key and events; the article-anchor content test.
- One browser e2e check for the new page.

## Decisions and notes

- **Step = one key or one event**, with a re-check phase per event, so the strip itself shows the remap cost and switching scheme can keep the step.
- **Visible hash** `37k + 11 mod 100`, so every placement can be checked by hand; Mod-N's caption shows the arithmetic with N filled in.
- **Add and Remove are buttons** that append events and move the slider; up to four events, so a student can add, add and remove and watch movement accumulate. Remove picks a seeded random node and records it.
- **Default slider shows 4,** not 3: the default run includes one Add so the first view shows the remap, and the slider reports the count after events. The starting count is 3.
- **Range bins follow key-space order;** a split's new node sits next to its source range.
- **Range splits at the median key,** as real range-sharded systems split a hot range; a value midpoint would hand a sequential burst to the new node whole.
- **Directory balances by load,** which is what lets it isolate a hot key.
- **Bounded-load caps key count** and uses one position per node, isolating the cap's effect from virtual nodes; c is chips because with at most 12 keys many slider positions would give the same cap.
- **Virtual-node positions come from a curated table** (see Hashing), and ring-based bins show shares, the quantity virtual nodes actually fix.
- **Moved keys fly with a travelling arrowhead,** one at a time, chosen over a ghost chip or before/after rows; one key per step means arrows never tangle.
- **New shapes rather than bent ones:** Bins, Scale and Table, for the reasons under Generic layer.
