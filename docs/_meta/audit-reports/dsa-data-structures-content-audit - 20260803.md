# Data Structures Content Audit (wiki-fe)

**Date:** 2026-08-03
**Scope:** `content/dsa/data-structures/*.md` (30 articles)
**Rubric:** `docs/_meta/ai-instructions/dsa-rater.md` + `dsa-writer.md` (publish gate: gated param ≤8 → NO-SHIP)
**Mode:** read-only critique; no content edits in this pass
**Related:** practice-problems sections previously audited in `practice-problems-audit-ds-only - 20260731.md` (U6 not re-litigated except when SHIP-blocking)

## Executive summary

- **SHIP:** 9 / 30
- **NO-SHIP:** 21 / 30
- **Hub articles:** 1 (`balanced-bst.md`) — scored on hub rubric; **SHIP**
- **Unpublished skeletons:** 2 (`hash-set.md`, `segment-tree.md`) — template residue; treat as P0 fill-or-unpublish
- **Mean score (all):** 80.6/100
- **Mean score (SHIP only):** 91.7/100
- **Mean score (NO-SHIP excl. stubs):** 83.2/100

### Scoreboard

| Article | Score | Gate | Kind |
|---|---:|---|---|
| `array.md` | 93/100 | **SHIP** | specific |
| `avl-tree.md` | 78/100 | **NO-SHIP** | specific |
| `b-plus-tree.md` | 88/100 | **NO-SHIP** | specific |
| `b-tree.md` | 74/100 | **NO-SHIP** | specific |
| `balanced-bst.md` | 91/100 | **SHIP** | hub |
| `binary-search-tree.md` | 85/100 | **NO-SHIP** | specific |
| `binary-tree.md` | 87/100 | **NO-SHIP** | specific |
| `bloom-filter.md` | 89/100 | **SHIP** | specific |
| `circular-buffer.md` | 75/100 | **NO-SHIP** | specific |
| `deque.md` | 85/100 | **NO-SHIP** | specific |
| `dynamic-array.md` | 90/100 | **SHIP** | specific |
| `fenwick-tree.md` | 90/100 | **SHIP** | specific |
| `graph.md` | 76/100 | **NO-SHIP** | specific |
| `hash-set.md` | 6/100 | **NO-SHIP** | stub |
| `hash-table.md` | 84/100 | **NO-SHIP** | specific |
| `heap.md` | 87/100 | **NO-SHIP** | specific |
| `interval-tree.md` | 83/100 | **NO-SHIP** | specific |
| `lfu-cache.md` | 85/100 | **NO-SHIP** | specific |
| `linked-list.md` | 92/100 | **NO-SHIP** | specific |
| `lru-cache.md` | 86/100 | **NO-SHIP** | specific |
| `queue.md` | 94/100 | **SHIP** | specific |
| `red-black-tree.md` | 72/100 | **NO-SHIP** | specific |
| `segment-tree.md` | 8/100 | **NO-SHIP** | stub |
| `skip-list.md` | 88/100 | **NO-SHIP** | specific |
| `stack.md` | 87/100 | **NO-SHIP** | specific |
| `string.md` | 89/100 | **SHIP** | specific |
| `suffix-tree.md` | 95/100 | **SHIP** | specific |
| `treap.md` | 94/100 | **SHIP** | specific |
| `trie.md` | 86/100 | **NO-SHIP** | specific |
| `union-find.md` | 82/100 | **NO-SHIP** | specific |

### SHIP list

- `array.md` — 93/100
- `balanced-bst.md` — 91/100
- `bloom-filter.md` — 89/100
- `dynamic-array.md` — 90/100
- `fenwick-tree.md` — 90/100
- `queue.md` — 94/100
- `string.md` — 89/100
- `suffix-tree.md` — 95/100
- `treap.md` — 94/100

## Systemic findings (P0 → P3)

### P0 — Unpublishable / empty inventory

1. **`hash-set.md` and `segment-tree.md` are still the DS skeleton template** (HTML authoring comments, literal `<Family heading>`, empty DS param placeholders). They appear in the wiki inventory as real pages but teach nothing. Prior practice-problems audit skipped them as stubs. **Fix type:** fill full Hash-based / Tree-range spines from `dsa-writer.md`, or remove from the index until filled.
2. **Several “finished” tree articles use Algorithm heading spines inside the DS folder** (`avl-tree.md`, `b-tree.md`, `red-black-tree.md`): Intuition / Correctness / Complexity derivation instead of Operations / Complexity summary / Gotchas. Publish gate fails on U7 + missing DS2/DS3/DS7 even when local content is strong.

### P1 — Recurring gate failures across otherwise strong articles

1. **DS7 at-scale trap missing** in Gotchas on multiple high-traffic pages (`heap`, `lfu-cache`, `avl-tree`, `b-tree`, `binary-search-tree`). Interviewers ask “what breaks at 10⁷?” — articles stop at micro gotchas.
2. **DS9a / FB amortized accounting not shown on-page** for Linear/Hash pages that claim O(1) amortized (`deque`, `stack`, `hash-table`, `lru-cache`). Linking to `dynamic-array.md` is not enough when the gate requires an accounting argument in-article.
3. **DS8 comparison tables lack crossover thresholds** (`binary-tree`, `trie`, `graph`, parts of others). “Vs hash table: slower” without *when* the rival wins fails the senior selection bar.
4. **`circular-buffer.md` is thin vs peers** (~222 lines): missing `## Comparison` (gated DS8), thin/stub practice section, incomplete senior depth — NO-SHIP at 75.
5. **Correctness/V-check blockers:** `interval-tree.md` claims O(log n) on an unbalanced BST implementation + overlap convention inconsistency; several tree pages fail V6 (invariant inductive sketch missing).

### P2 — Interview-prep portfolio gaps (advisory but systemic)

1. **DS9 `## What the interviewer probes for` missing on 19 specific articles** (hub exempt). Highest-traffic missing: array, hash-table, heap, stack, queue, graph, linked-list, trie, LRU/LFU. This is the section that converts encyclopedia articles into interview prep.
2. **Stale “not yet written” HTML comments** still claim `linked-list`, `hash-table`, `balanced-bst`, `suffix-tree`, etc. do not exist — link hygiene / reader trust issue once those pages shipped.
3. **U5 pseudocode gaps** on otherwise SHIP-adjacent pages (`linked-list` missing append/insert-after CLRS forms).
4. **Graph family FB:** `union-find.md` missing `## Representations` (or equivalent Graph family block); `graph.md` missing gated `## CP-primitives`.

### P3 — Coverage / polish

1. No dedicated **sparse-table** or **matrix-as-DS** page (optional senior/CP). Worse than missing: listing **hash-set** and **segment-tree** while empty.
2. Practice-problem remediations from 2026-07-31 DS-only audit still apply for U6 duplicates/topic-fit on several pages — track via that report; only SHIP-blocking U6 issues re-flagged here (e.g. `b-tree` missing Duplicate problems line; `circular-buffer`/`hash-set`/`segment-tree` empty).

## Content-backlog candidates

| Priority | Article | Fix type | Blocker summary |
|---|---|---|---|
| P0 | `hash-set.md` | fill stub | Unfilled skeleton — all gated params fail |
| P0 | `segment-tree.md` | fill stub | Unfilled skeleton — all gated params fail |
| P0 | `red-black-tree.md` | restructure to DS spine | Algorithm headings; missing Operations/Complexity summary/Gotchas |
| P0 | `avl-tree.md` | restructure + DS2/DS7/V6 | Algo spine; no Operations table; no at-scale trap; weak invariant proof |
| P0 | `b-tree.md` | restructure + U6/DS2/DS7/V6 | Algo spine; no Operations; no duplicate-problems; no at-scale; V6 |
| P1 | `circular-buffer.md` | complete thin article | Missing Comparison; stub practice; deepen when-not / DS1 |
| P1 | `graph.md` | CP + DS8 + V9 | Missing CP-primitives; weak crossover rows; DFS stack space |
| P1 | `union-find.md` | FB Representations | Graph family block missing |
| P1 | `hash-table.md` | DS9a + FB amortized | Resize accounting not derived on-page |
| P1 | `deque.md` | DS9a amortized proof | Must show aggregate-method accounting inline |
| P1 | `stack.md` | FB + DS9a | Inline amortized push accounting |
| P1 | `heap.md` | DS7 at-scale | Add cache-miss / large-n trap in Gotchas |
| P1 | `lfu-cache.md` | DS7 at-scale | 3× map overhead at capacity trap |
| P1 | `binary-search-tree.md` | DS7 at-scale | Skewed chain / recursion-limit trap |
| P1 | `binary-tree.md` | DS8 crossover | Concrete when-rival-wins thresholds |
| P1 | `trie.md` | DS8 crossover | Comparison crossover thresholds |
| P1 | `b-plus-tree.md` | V6 invariant proof | Leaf-split inductive sketch |
| P1 | `interval-tree.md` | V1/V2 correctness | O(log n) vs unbalanced impl; overlap convention |
| P1 | `lru-cache.md` | U6 + FB + DS9a | Duplicates line; hashing depth; rehash accounting |
| P1 | `linked-list.md` | U5 pseudocode | Append + insert-after CLRS forms |
| P1 | `skip-list.md` | DS2 + V6 | Space column; expand invariant proof |
| P2 | `(portfolio)` | add DS9 sections | Add interviewer probes to ~17 articles missing the section |
| P2 | `array.md / dynamic-array.md / hash-table.md / trie.md` | stale comments | Remove or convert “not yet written” comments for pages that now exist |

## Portfolio signals (pre-rate)

- Stubs with skeleton marker: `hash-set.md`, `segment-tree.md`
- Hub marker present: `balanced-bst.md`
- Missing `## Comparison`: `circular-buffer.md`
- Missing DS9 interviewer probes: see P2 list above
- `dsa-check.sh`: script present at `docs/_meta/ai-instructions/scripts/dsa-check.sh`; agents reported U8/U11/U12 clean on sampled non-stub chunks (stubs fail structure, not filename convention)

## Per-article ratings

One score table per article. Chunk rollup summaries, ranked FIXES lists, and interview-critique blurbs were removed — they duplicated the executive scoreboard / blockers. Use the content-backlog prompt to turn candidates above into backlog rows.

### `array.md` — 93/100 — SHIP [section: DS, family: Linear]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         9/10    1    gate   lockers analogy + fixed-vs-dynamic layer split at senior depth
U2 complexity stated          9/10    1    gate   ops table + best/avg/worst summary; space O(n)/O(capacity) named
U3 when to use / when not     9/10    1    gate   ≥3 alternatives with trade-offs (list, hash, BST); rule of thumb present
U4 Python present/idiomatic   9/10    1    gate   DynamicArray + bisect/Counter velocity block; type hints throughout
U5 pseudocode present/≠py     9/10    2    gate   CLRS ARRAY-APPEND/GET; for-loops, ▷ comments, explicit indices
U6 practice problems          9/10    1    gate   4 distinct techniques; duplicate-problems on all 4 entries
U7 format spine               9/10    1    gate   # Title → Prerequisites → TOC → body; no YAML
U8 title ↔ filename           10/10  0.5   gate   script PASS — H1 "Array" → array.md
U9 prerequisites format       8/10   0.5   adv    Big-O HTML-comment pending link ok; tiers correct; no third tier
U10 TOC                       9/10   0.5   adv    reflects all major headings incl. CP subsections
U11 filename convention       10/10  0.5   gate   script PASS
U12 links resolve             10/10  1     gate   script PASS — dynamic-array, circular-buffer live
U13 soundbite                 9/10   0.5   adv    blockquote takeaway under What it is
U14 section layering          9/10   0.5   adv    How it works opens at address arithmetic, not re-definition
U17 real-world + at-scale     9/10   0.5   adv    language lists/NumPy in when-to-use; index overflow + resize spike in gotchas
U18 cache behavior            9/10   0.5   adv    cache lines + prefetch vs linked-list misses in Memory layout
U20 misconceptions            8/10   0.5   adv    fixed-vs-dynamic + negative-index abstraction; rest are gotchas not beliefs
DS1 how it works + diagram    9/10    1    gate   ASCII index/address + insert-shift traces
DS2 operations table          9/10    1    gate   all ops with individual O(); amortized footnote on append
DS3 complexity summary        9/10    1    gate   best/avg/worst table + space footnote
DS4 when-to-use vs rivals     9/10    1    gate   prose in When to use; names linked-list/hash/BST trades
DS5 variants                  9/10    1    adv    dynamic array, ring buffer, 2D, CP shapes w/ CP deferral
DS8 comparison table          9/10    1    gate   5 rivals; Pick-it-when crossovers (cache, ordering, key lookup)
DS6 implementation            9/10    1    gate   pseudocode + idiomatic DynamicArray class
CP cp-primitives              9/10    1    cond   Linear → gated; 3 tools (prefix/diff/freq) each w/ why-for-CP
DS7 gotchas / edge cases      9/10    1    gate   ≥2 traps + CP (off-by-one, row-major traversal) + at-scale (index type, resize OOM)
DS9 interviewer probes        3/10    1    adv    section missing entirely — WRITE IT (scale + design-choice probes)
DS9a amortized proof          n/a     -     -     fixed primitive; doubling argument defers to dynamic-array.md (justified)
FB memory layout              9/10    2    gate   contiguous vs ptr, 64B cache lines, geometric resize series 1+2+4+…≈2n, row/column-major trap
AL1–AL10                      n/a     -     -     DS article — algorithm section params not applicable
PA1–PA11                      n/a     -     -     DS article — pattern section params not applicable
V1 complexity re-derivation   9/10    2    gate   access = 1 arithmetic O(1); mid insert shift n−i → O(n); skim-clean on headline claims
V2 pseudocode correctness     9/10    2    gate   traced ARRAY-APPEND on cap=1→2: resize copies size elems, append at [size]; bounds on GET correct
V3 worked example fidelity    9/10   0.5   adv    trap() two-pointer trace on [0,1,0,2,…]: shorter-side binding logic holds
V4 comparison table accuracy  9/10   0.5   adv    hash O(1) avg, BST O(log n) ordered — rival Big-Os checked, no false worst-case hash claims
V5 edge case coverage         9/10   0.5   adv    empty/single via bounds; sorted vs unsorted search rows match family
V6 invariant inductive proof  n/a     -     -     no correctness/invariant section on this DS article
V7 diagram-text agreement     9/10   0.5   adv    address(3)=1012 matches 4-byte stride diagram
V8 terminology precision      9/10   0.5   adv    amortized vs worst-case resize distinguished; "fixed" vs "dynamic" consistent
V9 recursion stack honesty    9/10    2    gate   iterative search/append; no false O(1) space on recursive paths
V10 duplicate-problems rel.   9/10   0.5   adv    Container↔Trapping same two-pointer mechanic; Kadane duplicates on-target
V11 prerequisite necessity    8/10   0.5   adv    Big-O must-read correct; memory-model should-read is adjacency not hard dependency
V12 cross-article consistency n/a     -     -     flag: fixed-array amortization also on dynamic-array.md — spot-check sibling for overlap, not contradiction
V13 probe answer correctness  n/a     -     -     DS9 section absent — nothing to verify
V14 general factual accuracy  9/10   0.5   adv    residual sweep: binary-search-on-sorted-array precondition correct; no confident errors
--------------------------------------------------------------------------------

GATE: SHIP — all gated params ≥9.

BLOCKERS (gated, score ≤8 - fix before publish):
- (none)

### `avl-tree.md` — 78/100 — NO-SHIP [section: DS, family: Tree/heap]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         9/10    1    gate   strictest inspector analogy; 1.44 log n bound stated up front
U2 complexity stated          9/10    1    gate   table w/ O(log n) worst-case + O(log n) recursion space
U3 when to use / when not     9/10    1    gate   read-heavy vs RB/B-tree/hash/array alternatives named
U4 Python present/idiomatic   9/10    1    gate   dataclass Node, typed Optional, full insert w/ 4 cases
U5 pseudocode present/≠py     9/10    2    gate   AVL-INSERT CLRS form; case labels LL/RR/LR/RL
U6 practice problems          8/10    1    gate   4 problems w/ duplicates on 1–3; #4 lacks Duplicate problems line (floor met)
U7 format spine               7/10    1    gate   Prerequisites/TOC ok but body uses algorithm headings (Intuition, Correctness) — DS spine broken - BLOCKER
U8 title ↔ filename           10/10  0.5   gate   script PASS
U9 prerequisites format       9/10   0.5   adv    balanced-bst/BST/binary-tree tiers correct
U10 TOC                       8/10   0.5   adv    lists algorithm sections not in DS headings list
U11 filename convention       10/10  0.5   gate   script PASS
U12 links resolve             10/10  1     gate   script PASS
U13 soundbite                 9/10   0.5   adv    takeaway blockquote present
U14 section layering          8/10   0.5   adv    Intuition overlaps What it is balance-factor intro slightly
U17 real-world + at-scale     8/10   0.5   adv    MySQL MEMORY mention; no explicit n≫10⁷ failure mode
U18 cache behavior            5/10   0.5   adv    pointer-tree cache hostility not stated — real gap for Tree/heap family
U20 misconceptions            6/10   0.5   adv    edge-case bugs listed; no explicit wrong-belief bullets
DS1 how it works + diagram    9/10    1    gate   four rotation ASCII cases + delete retrace prose
DS2 operations table          2/10    1    gate   `## Operations` table missing — only inline complexity table - BLOCKER
DS3 complexity summary        8/10    1    gate   content in `## Complexity derivation` not `## Complexity summary` heading
DS4 when-to-use vs rivals     9/10    1    gate   prose in When to use section
DS5 variants                  3/10    1    adv    no Variants section (treap etc. deferred ok but section absent)
DS8 comparison table          9/10    1    gate   AVL vs RB/BST/B-tree w/ rotation/write crossover column
DS6 implementation            9/10    1    gate   pseudocode + Python insert/rotate
CP cp-primitives              n/a     -     -     Tree/heap → advisory only; section absent (acceptable n/a w/ note)
DS7 gotchas / edge cases      6/10    1    gate   Edge cases present but no at-scale trap (pointer-chasing / rebalance at n≫10⁷) - BLOCKER
DS9 interviewer probes        9/10    1    adv    4 Q+A sketches incl. 1.44 derivation + insert-vs-delete rotation count
DS9a amortized proof          n/a     -     -     AVL ops are worst-case O(log n), not amortized — justified n/a
FB traversal & invariant      9/10    2    gate   balance factor, in-order sorted, rotation cases tied to binary-tree invariant
AL1–AL10                      n/a     -     -     DS article — AL params n/a (article borrows AL headings erroneously)
PA1–PA11                      n/a     -     -     DS article — pattern params not applicable
V1 complexity re-derivation   9/10    2    gate   N(h)=1+N(h−1)+N(h−2)→φ^h→h≈1.44 log₂ n re-derived; matches table
V2 pseudocode correctness     9/10    2    gate   insert [10,20,30]: bf at 10 hits −2, k>left.key → RR left-rotate → root 20 — trace matches Python
V3 worked example fidelity    9/10   0.5   adv    problem 1 RR/LR examples match rotation diagrams
V4 comparison table accuracy  9/10   0.5   adv    RB ≤2 log n, AVL ≤1.44 log n — checked against known bounds
V5 edge case coverage         8/10   0.5   adv    LL-vs-LR child bf inspection covered; missing duplicate-key policy depth in V5 scope
V6 invariant inductive proof  8/10    2    gate   insert-one-rotation argument sketched but no explicit base case (empty tree) + inductive step formalized - BLOCKER
V7 diagram-text agreement     9/10   0.5   adv    LL diagram nodes T1–T4 align with prose
V8 terminology precision      9/10   0.5   adv    "strict" balance vs RB "loose" used consistently; worst-case not amortized
V9 recursion stack honesty    9/10    2    gate   complexity table states O(log n) recursion space; matches AVL height bound
V10 duplicate-problems rel.   9/10   0.5   adv    LC 1382 ↔ insert rebalance same mechanic
V11 prerequisite necessity    9/10   0.5   adv    balanced-bst hub + BST are genuine dependencies
V12 cross-article consistency 9/10   0.5   manual checked vs balanced-bst.md + binary-search-tree.md — height/rotation claims align; no contradiction
V13 probe answer correctness  9/10   0.5   adv    "one rotation insert / many delete" answers factually correct
V14 general factual accuracy  9/10   0.5   adv    1.44 factor and Fibonacci link correct on residual sweep
--------------------------------------------------------------------------------

GATE: NO-SHIP — 4 gated params below 9 (U7, DS2, DS7, V6).

BLOCKERS (gated, score ≤8 - fix before publish):
- U7: rename/reorder body to DS heading spine — drop or fold Intuition/Correctness/Complexity derivation into How it works / Complexity summary / Gotchas
- DS2: add `## Operations` table (search/insert/delete/min-max) with per-op time + space
- DS7: add at-scale trap bullet (pointer-chasing cache misses at large n, or rebalancing churn under sustained inserts)
- V6: add explicit invariant proof skeleton — base: empty tree balanced; step: one insert violates only lowest ancestor, rotation restores height

### `b-plus-tree.md` — 88/100 — NO-SHIP [section: DS, family: Tree/heap]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         9/10    1    gate   index→data-section analogy; copy-up vs move-up distinction upfront
U2 complexity stated          9/10    1    gate   ops table + best/avg/worst; O(log_m n + k/m) range explicit
U3 when to use / when not     9/10    1    gate   range/sequential/disk vs hash/RB; hot-spot + latch at-scale in when-not
U4 Python present/idiomatic   9/10    1    gate   full BPlusTree class: search, range, insert, delete, merge/borrow
U5 pseudocode present/≠py     9/10    2    gate   CLRS B+Tree-Search/Insert/Split/Delete/Fix-Underflow; ≠ Python
U6 practice problems          8/10    1    gate   3 problems (minimum); all have Duplicate problems lines
U7 format spine               9/10    1    gate   standard DS heading order followed
U8 title ↔ filename           10/10  0.5   gate   script PASS
U9 prerequisites format       9/10   0.5   adv    b-tree/balanced-bst must-read; linked-list should-read
U10 TOC                       9/10   0.5   adv    complete
U11 filename convention       10/10  0.5   gate   script PASS
U12 links resolve             10/10  1     gate   script PASS (skip-list.md resolves)
U13 soundbite                 9/10   0.5   adv    blockquote takeaway under What it is
U14 section layering          9/10   0.5   adv    How it works dives into node types without re-defining B+ tree
U17 real-world + at-scale     9/10   0.5   adv    InnoDB/Postgres; latch contention + monotonic-PK hot-spot at 10⁵ ins/s
U18 cache behavior            9/10   0.5   adv    top 2–3 levels buffer-pool hot; leaf I/O cold — in Complexity summary
U20 misconceptions            7/10   0.5   adv    gotchas strong; routing-key-after-delete is quasi-misconception but framed as bug
DS1 how it works + diagram    9/10    1    gate   order-5 ASCII + insert/delete walkthroughs
DS2 operations table          9/10    1    gate   point/range/insert/delete/min-max/full-scan w/ notes column
DS3 complexity summary        9/10    1    gate   best/avg/worst + fan-out derivation inline
DS4 when-to-use vs rivals     9/10    1    gate   prose contrasts B-tree/hash/RB with crossover thresholds
DS5 variants                  9/10    1    adv    B-link, clustered/unclustered, fractal tree — structural one-liners
DS8 comparison table          9/10    1    gate   5 rivals; B-tree range O(k log n) vs B+ O(log_m n + k/m) crossover stated
DS6 implementation            9/10    1    gate   pseudocode + ~180-line Python w/ split/borrow/merge
CP cp-primitives              n/a     -     -     Tree/heap → CP advisory; no section (acceptable for disk-index topic)
DS7 gotchas / edge cases      9/10    1    gate   copy-vs-move, routing-key retention, duplicates, concurrency, write-amplification at scale
DS9 interviewer probes        3/10    1    adv    section missing — add scale + B-tree-vs-B+ design probes
DS9a amortized proof          n/a     -     -     B+ splits are worst-case O(log_m n) per op, not amortized aggregate — justified
FB traversal & invariant      9/10    2    gate   five invariants + violation symptom table + copy-up rationale at depth
AL1–AL10                      n/a     -     -     DS article
PA1–PA11                      n/a     -     -     DS article
V1 complexity re-derivation   9/10    2    gate   h≤log_t(n/2)+1 from fan-out t inverted; range k/m leaf reads counted — matches claims
V2 pseudocode correctness     9/10    2    gate   leaf split t=2: [10,20,30]+25 → copy-up 30, left [10,20,25] — hand-traced against Python assert block
V3 worked example fidelity    9/10   0.5   adv    problem 3 copy-up trace matches Implementation _split_child
V4 comparison table accuracy  9/10   0.5   adv    B-tree range backtrack vs linked-leaf scan — accurate distinction
V5 edge case coverage         9/10   0.5   adv    duplicate-key corruption + range boundary off-by-one covered for family
V6 invariant inductive proof  8/10    2    gate   invariants listed + failure table strong, but no base case + inductive step for routing invariant preservation on split - BLOCKER
V7 diagram-text agreement     9/10   0.5   adv    order-5 tree keys [30|60] match search prose
V8 terminology precision      9/10   0.5   adv    copy-up vs move-up consistently distinguished from B-tree
V9 recursion stack honesty    9/10    2    gate   iterative search/range; space O(1) per op — no hidden recursion stack
V10 duplicate-problems rel.   9/10   0.5   adv    LC 34 ↔ leaf descent + boundary walk
V11 prerequisite necessity    9/10   0.5   adv    b-tree.md is genuine dependency for copy-up contrast
V12 cross-article consistency 9/10   0.5   manual vs b-tree.md: range-scan cost + leaf-link claims consistent
V13 probe answer correctness  n/a     -     -     DS9 absent
V14 general factual accuracy  9/10   0.5   adv    trillion rows / h≈4 at t=500 arithmetic checks out
--------------------------------------------------------------------------------

GATE: NO-SHIP — 1 gated param below 9 (V6).

BLOCKERS (gated, score ≤8 - fix before publish):
- V6: under Traversal & invariant, add proof sketch — base: empty tree satisfies 5 invariants; inductive step: leaf split preserves routing partition + equal depth

### `b-tree.md` — 74/100 — NO-SHIP [section: DS, family: Tree/heap]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         9/10    1    gate   multi-level index signpost; seek-cost motivation upfront
U2 complexity stated          9/10    1    gate   block-read table; CPU factors separated from disk reads
U3 when to use / when not     9/10    1    gate   disk vs RAM BST/hash/LSM alternatives w/ trades
U4 Python present/idiomatic   8/10    1    gate   search+insert+split present; delete borrow/merge deferred ("DB owns this") — shallow on full DS6
U5 pseudocode present/≠py     8/10    2    gate   SEARCH + SPLIT-CHILD contracts present; delete only summarized — incomplete for non-trivial delete logic
U6 practice problems          5/10    1    gate   5 problems but zero `**Duplicate problems:**` lines anywhere — duplicate-problems gate caps at 5 - BLOCKER
U7 format spine               7/10    1    gate   algorithm headings (Intuition, Correctness, Complexity derivation, Edge cases) — DS spine broken - BLOCKER
U8 title ↔ filename           10/10  0.5   gate   script PASS
U9 prerequisites format       8/10   0.5   adv    "Memory hierarchy" plain bold, not `[Title](./path.md) [tier]` link format
U10 TOC                       8/10   0.5   adv    reflects algorithm-leaning structure
U11 filename convention       10/10  0.5   gate   script PASS
U12 links resolve             10/10  1     gate   script PASS
U13 soundbite                 9/10   0.5   adv    blockquote takeaway present
U14 section layering          8/10   0.5   adv    Intuition repeats seek argument from What it is opening
U17 real-world + at-scale     9/10   0.5   adv    every RDBMS + NTFS/ext4; LSM write path mentioned
U18 cache behavior            7/10   0.5   adv    block-read framing implies cache but no explicit friendly/hostile sentence
U20 misconceptions            6/10   0.5   adv    B-vs-B+ confusion in edge cases, not framed as misconception bullets
DS1 how it works + diagram    9/10    1    gate   order-5 ASCII + split walkthrough
DS2 operations table          2/10    1    gate   no `## Operations` table — only inline complexity derivation - BLOCKER
DS3 complexity summary        8/10    1    gate   content under Complexity derivation, not Complexity summary heading
DS4 when-to-use vs rivals     9/10    1    gate   prose in When to use
DS5 variants                  3/10    1    adv    no Variants section (B+ variant only mentioned in comparison/edge cases)
DS8 comparison table          8/10    1    gate   5 rows w/ pick-when; B+ range crossover present but shallow on in-RAM RB crossover — borderline 8
DS6 implementation            7/10    1    gate   insert+search only; delete intentionally omitted — incomplete core ops for DS6
CP cp-primitives              n/a     -     -     Tree/heap advisory; absent ok
DS7 gotchas / edge cases      7/10    1    gate   Edge cases ≥2 but no explicit at-scale failure (e.g. height growth when page size mis-sized, or matrix-style memory wall N/A here) — weak at-scale - BLOCKER
DS9 interviewer probes        9/10    1    adv    4 Q+A: RB vs B-tree, order sizing, B+ distinction, balance-without-rotations
DS9a amortized proof          n/a     -     -     B-tree splits worst-case O(log_t n), not amortized O(1) — justified
FB traversal & invariant      9/10    2    gate   in-order walk, fill bounds, equal-depth via root split/merge — senior depth
AL1–AL10                      n/a     -     -     DS article (uses AL headings)
PA1–PA11                      n/a     -     -     DS article
V1 complexity re-derivation   9/10    2    gate   n≥2t^(h−1) → h=O(log_t n); log_t n seeks vs log₂ n binary — re-derived, matches
V2 pseudocode correctness     8/10    2    gate   insert t=2 [10,20,30,40]: median 20 up, left [10] right [30,40] — matches prose; search loop 1-based indexing in pseudocode vs 0-based Python — minor but traceable
V3 worked example fidelity    9/10   0.5   adv    problem 3 page-size arithmetic 256 order / 4 levels checks out
V4 comparison table accuracy  9/10   0.5   adv    AVL 1.44 log n, RB 2 log n rows verified
V5 edge case coverage         8/10   0.5   adv    root split/shrink + underflow cascade covered
V6 invariant inductive proof  8/10    2    gate   fill + equal-depth invariants stated; no explicit base/inductive proof for "split preserves ordering" - BLOCKER
V7 diagram-text agreement     9/10   0.5   adv    search-50 trace: root→middle child→found matches diagram
V8 terminology precision      9/10   0.5   adv    order m vs min degree t used consistently
V9 recursion stack honesty    9/10    2    gate   recursive search O(h)=O(log_t n) space acknowledged implicitly via height
V10 duplicate-problems rel.   n/a     -     -     no Duplicate problems entries to verify
V11 prerequisite necessity    8/10   0.5   adv    memory-hierarchy prereq is format-violation not link; BST deps correct
V12 cross-article consistency 9/10   0.5   manual vs b-plus-tree.md + balanced-bst.md — fan-out/seek claims align
V13 probe answer correctness  9/10   0.5   adv    "balance without rotations" answer correct
V14 general factual accuracy  9/10   0.5   adv    log₄₀₀(10⁹)≈4 arithmetic correct
--------------------------------------------------------------------------------

GATE: NO-SHIP — 6 gated params below 9 (U6, U7, DS2, DS6, DS7, V6).

BLOCKERS (gated, score ≤8 - fix before publish):
- U6: add `**Duplicate problems:**` on ≥1 practice problem (e.g. problem 2 ↔ LC 700-style multi-way search)
- U7: restructure to DS heading spine; fold Intuition/Correctness into How it works / Traversal & invariant
- DS2: add Operations table (search/insert/delete w/ block-read column)
- DS6: expand Implementation or explicitly scope delete w/ pseudocode stub for borrow/merge
- DS7: add at-scale trap (mis-sized order → extra levels → seek storm; or root latch under concurrent load)
- V6: add ordering-preservation proof on split (base 1-key node; step median-up partitions ranges)

### `balanced-bst.md` — 91/100 — SHIP [section: DS, family: n/a (hub)]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         9/10    1    gate   family-level definition + building-inspector analogy; read-vs-write trade named
H1 member list                9/10    1    gate   AVL, RB, B-tree each 2–3 sentences + working .md links
H2 decision layer             9/10    1    gate   Comparison table + Which one when prose w/ workload cues
H3 shared theory              8/10    1    adv    rotations shared mechanic + degenerate-chain problem; no unified lower-bound proof
U7 format spine               9/10    1    gate   hub marker blockquote present; Prerequisites→TOC→body
U8 title ↔ filename           10/10  0.5   gate   script PASS
U9 prerequisites format       8/10   0.5   adv    Big-O HTML-comment ok; BST must-read tier correct
U10 TOC                       9/10   0.5   adv    reflects hub sections
U11 filename convention       10/10  0.5   gate   script PASS
U12 links resolve             10/10  1     gate   script PASS — all member links live
U13 soundbite                 9/10   0.5   adv    dedicated Interview soundbite section
U2–U6, U14, U17, U18, U20     n/a     -     -     hub article — covered on member pages
DS1–DS9, DS9a, CP, FB         n/a     -     -     hub article — per-section structure exempt
AL1–AL10, PA1–PA11            n/a     -     -     hub article
V1–V14                        n/a     -     -     hub article — content verification not scored
--------------------------------------------------------------------------------

GATE: SHIP — all gated hub params ≥9.

BLOCKERS (gated, score ≤8 - fix before publish):
- (none)

### `binary-search-tree.md` — 85/100 — NO-SHIP [section: DS, family: Tree/heap]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         9/10    1    gate   "binary search frozen into structure" + halving descent
U2 complexity stated          9/10    1    gate   ops table balanced vs skewed; space O(h) explicit
U3 when to use / when not     9/10    1    gate   hash/array/heap alternatives w/ order trade-off
U4 Python present/idiomatic   9/10    1    gate   search/insert/delete w/ type hints; sortedcontainers velocity note
U5 pseudocode present/≠py     9/10    2    gate   BST-SEARCH/INSERT/DELETE CLRS contracts; ≠ Python
U6 practice problems          8/10    1    gate   6 distinct techniques; duplicate-problems on #2 and #3 only (floor met)
U7 format spine               9/10    1    gate   full DS heading order
U8 title ↔ filename           10/10  0.5   gate   script PASS
U9 prerequisites format       8/10   0.5   adv    Big-O HTML-comment pending; binary-tree must-read correct
U10 TOC                       9/10   0.5   adv    complete incl. 6 practice subsections
U11 filename convention       10/10  0.5   gate   script PASS
U12 links resolve             10/10  1     gate   script PASS
U13 soundbite                 9/10   0.5   adv    blockquote takeaway
U14 section layering          9/10   0.5   adv    How it works traces search on concrete tree, not re-defining BST
U17 real-world + at-scale     8/10   0.5   adv    TreeMap/B-tree indexes named; no explicit n≫10⁷ skew failure sentence in when-to-use
U18 cache behavior            5/10   0.5   adv    pointer-tree cache hostility not stated — gap for Tree/heap
U20 misconceptions            7/10   0.5   adv    in-order-sorted assumption bullet is quasi-misconception; mostly gotchas
DS1 how it works + diagram    9/10    1    gate   ASCII tree + search/insert traces
DS2 operations table          9/10    1    gate   search/insert/delete/min/range w/ balanced vs skewed columns
DS3 complexity summary        9/10    1    gate   best/avg/worst + skew caveat paragraph
DS4 when-to-use vs rivals     9/10    1    gate   prose w/ hash/array/heap/BST-balanced routing
DS5 variants                  9/10    1    adv    balanced BST, treap, B-tree, order-statistic pointers
DS8 comparison table          9/10    1    gate   5 rivals; "static sorted array" crossover for insert-heavy called out
DS6 implementation            9/10    1    gate   full search/insert/delete Python + pseudocode
CP cp-primitives              8/10    1    adv    Tree/heap → advisory; 2 entries (successor/range, stdlib map) w/ why-for-CP
DS7 gotchas / edge cases      7/10    1    gate   skew/validation/delete traps strong; missing at-scale trap (pointer-chasing / Python recursion limit at adversarial n) - BLOCKER
DS9 interviewer probes        3/10    1    adv    section missing
DS9a amortized proof          n/a     -     -     plain BST has no amortized ops — justified
FB traversal & invariant      9/10    2    gate   global invariant, in-order=sorted, skew diagram + balance pointer to hub
AL1–AL10                      n/a     -     -     DS article
PA1–PA11                      n/a     -     -     DS article
V1 complexity re-derivation   9/10    2    gate   O(height): balanced log n vs skewed n — re-derived from insertion-order examples; matches tables
V2 pseudocode correctness     9/10    2    gate   delete two-child: successor=leftmost of right subtree, copy key, delete successor — traced on problem 6 tree
V3 worked example fidelity    9/10   0.5   adv    validate BST (5,1,4,null,null,3,6) false case matches global-interval logic
V4 comparison table accuracy  9/10   0.5   adv    heap min O(1) peek, hash no order — checked
V5 edge case coverage         9/10   0.5   adv    local-vs-global validation, duplicate policy, recursion depth — family-relevant
V6 invariant inductive proof  n/a     -     -     no correctness/invariant section — BST ordering explained but no proof param target
V7 diagram-text agreement     9/10   0.5   adv    search-7 path 8→3→6→7 matches diagram
V8 terminology precision      9/10   0.5   adv    "balanced" vs "plain/skewed" consistent; in-order requires valid BST
V9 recursion stack honesty    9/10    2    gate   O(h) space on recursive insert/delete stated; iterative search alternative shown
V10 duplicate-problems rel.   9/10   0.5   adv    LC 173 ↔ kth-smallest same iterative in-order stack
V11 prerequisite necessity    9/10   0.5   adv    binary-tree + binary-search are real dependencies
V12 cross-article consistency 9/10   0.5   manual vs balanced-bst.md + avl-tree.md — skew/degenerate claims align
V13 probe answer correctness  n/a     -     -     DS9 absent
V14 general factual accuracy  9/10   0.5   adv    successor/predecessor definitions correct on residual sweep
--------------------------------------------------------------------------------

GATE: NO-SHIP — 1 gated param below 9 (DS7).

BLOCKERS (gated, score ≤8 - fix before publish):
- DS7: add at-scale trap — e.g. "n≈10⁶ skewed chain → Python recursion limit / cache-miss per hop on pointer tree; fix = balanced BST or iterative"

### `binary-tree.md` — 87/100 — NO-SHIP [section: DS, family: Tree/heap]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         9/10    1    gate   one-liner + org-chart analogy; self-similarity / balance trade named
U2 complexity stated          9/10    1    gate   O(n) traverse, O(h) stack, BST O(h) with skew called out
U3 when to use / when not     9/10    1    gate   vs hash table, array, balanced BST with order-vs-speed trade
U4 Python present/idiomatic   9/10    1    gate   dataclass TreeNode, deque BFS, iterative stack variant
U5 pseudocode present/≠py     9/10    2    gate   CLRS INORDER-TRAVERSE + LEVEL-ORDER; distinct from Python
U6 practice problems          9/10    1    gate   5 full entries; duplicate-problems on all 5 (advisory depth met)
U7 format spine               9/10    1    gate   Title → Prerequisites → TOC → body; no YAML
U8 title ↔ filename           10/10  0.5   gate   script PASS — H1 "Binary Tree" → binary-tree.md
U9 prerequisites format       8/10   0.5   adv    Big-O HTML-comment pending ok; tiers correct; queue/stack adjacency-only Should-read
U10 TOC                       9/10   0.5   adv    reflects headings including nested traversal subsections
U11 filename convention       10/10  0.5   gate   script PASS
U12 links resolve             10/10  0.5   gate   script PASS — all .md links resolve
U13 soundbite                 9/10   0.5   adv    blockquote takeaway present and speakable
U14 section layering          9/10   0.5   adv    How it works opens at node/pointer mechanism, not re-definition
U17 real-world + at-scale     8/10   0.5   adv    DOM/B-trees named; skew/stack overflow mentioned but no crisp n>10⁷ production failure line
U18 cache behavior            8/10   0.5   adv    pointer-scattered layout vs heap array noted in comparison; not one dedicated cache sentence in FB
U20 misconceptions            6/10   0.5   adv    in-order-on-non-BST is misconception-shaped but folded into gotchas, not U20 bullets
DS1 how it works + diagram    9/10    1    gate   ASCII tree diagram matches prose; height/depth defined
DS2 operations table          9/10    1    gate   all ops have time + space; BST vs plain distinguished
DS3 complexity summary        9/10    1    gate   best/avg/worst for skew; Morris O(1) space noted
DS4 when-to-use vs alts       9/10    1    gate   prose decision cues vs hash/BST/heap/trie
DS5 variants                  9/10    1    adv    BST, balanced, heap, trie, segment tree one-liners with links
DS8 comparison table          8/10    1    gate   table present but several "Pick it when…" cells lack concrete crossover thresholds (e.g. plain tree row) — BLOCKER
DS6 implementation            9/10    1    gate   pseudocode + Python traversals; from-scratch (no bisect)
CP cp-primitives              9/10    1    adv    Tree/heap family → advisory; tree DP + array-embedded tree with why-for-CP
DS7 gotchas / edge cases      9/10    1    gate   empty/skew/recursion overflow + Morris; at-scale stack on skew
DS9 interviewer probes        2/10    1    adv    section missing entirely (writer: WRITE IT)
DS9a amortized proof          n/a     -     -     plain binary tree — no amortized ops; fixed pointer structure
FB traversal & invariant      9/10    2    gate   pre/in/post, level-order, full/complete/balanced; heap array tie-in
AL1–AL10 / PA1–PA11           n/a     -     -     DS article — algorithm/pattern params not applicable
V1 complexity re-derivation   9/10    2    gate   traverse: each of n nodes visited once → O(n); recursion depth ≤ h → O(h) space — matches claims
V2 pseudocode correctness     9/10    2    gate   hand-traced inorder on diagram tree → 4,2,5,1,3; level-order groups [1],[2,3],[4,5,6]
V3 worked example fidelity    9/10   0.5   adv    traversal walkthrough matches diagram node values
V4 comparison table accuracy  8/10   0.5   adv    heap search O(n) and hash O(1) avg checked — correct; trie O(L) ok
V5 edge case coverage         8/10   0.5   adv    empty/single/skew covered; family-appropriate set
V6 invariant inductive proof  n/a     -     -     no stated loop/amortized invariant section to verify
V7 diagram-text agreement     9/10   0.5   adv    ASCII nodes 1–6 match traversal examples
V8 terminology precision      9/10   0.5   adv    height vs depth conventions flagged; in-place N/A
V9 recursion stack honesty    9/10    2    gate   O(h) stack explicit in ops table and complexity; Morris alternative named
V10 duplicate-problems rel.   9/10   0.5   adv    LC duplicates share core mechanics (post-order, BFS, tree DP, bubble-up)
V11 prerequisite necessity    8/10   0.5   adv    linked list Must-read justified; queue/stack helpful not load-bearing
V12 cross-article consistency n/a     -     -     spot-check vs heap.md/BST siblings — no contradiction found on O(h) claims
V13 probe answer correctness  n/a     -     -     no interviewer-probes section present
V14 general factual accuracy  9/10   0.5   adv    residual sweep — no confident errors in shape-invariant prose
--------------------------------------------------------------------------------

GATE: NO-SHIP — 1 gated param below 9 (DS8).

BLOCKERS (gated, score ≤8):
- DS8: add concrete crossover thresholds per rival row (e.g. when hash table wins despite O(log n) tree — unordered lookup at any n; when heap beats tree — only min/max not order)

### `bloom-filter.md` — 89/100 — SHIP [section: DS, family: Hash-based]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         9/10    1    gate   probabilistic membership + fingerprint analogy; FN/FN asymmetry clear
U2 complexity stated          9/10    1    gate   O(k) ops; O(m) space; no false amortization claim
U3 when to use / when not     9/10    1    gate   vs hash set/cuckoo with memory crossover at 10⁸ scale
U4 Python present/idiomatic   9/10    1    gate   typed BloomFilter, mmh3 + CP hash fallback
U5 pseudocode present/≠py     9/10    2    gate   CLRS Insert/Query loops; not valid Python
U6 practice problems          9/10    1    gate   3 full entries; duplicate-problems on all 3
U7 format spine               9/10    1    gate   correct spine
U8 title ↔ filename           10/10  0.5   gate   script PASS
U9 prerequisites format       9/10   0.5   adv    hash-table/array Must-read; tiers correct
U10 TOC                       9/10   0.5   adv    complete
U11 filename convention       10/10  0.5   gate   script PASS
U12 links resolve             10/10  0.5   gate   script PASS
U13 soundbite                 9/10   0.5   adv    blockquote present
U14 section layering          9/10   0.5   adv    How it works opens at bit-array mechanism
U17 real-world + at-scale     9/10   0.5   adv    BigTable/Cassandra; 10⁸ URL memory math; large-m cache miss trap
U18 cache behavior            9/10   0.5   adv    small-m friendly vs multi-GB random probes; blocked BF named
U20 misconceptions            7/10   0.5   adv    deletion/can't-enumerate in gotchas; not labeled misconceptions
DS1 how it works + diagram    9/10    1    gate   ASCII bit-array trace with FP example (carol)
DS2 operations table          9/10    1    gate   insert/query/delete N/A; space note
DS3 complexity summary        9/10    1    gate   FP rate dimension included
DS4 when-to-use vs alts       9/10    1    gate   prose vs hash set/cuckoo/counting BF
DS5 variants                  9/10    1    adv    counting, cuckoo, scalable, blocked — structural one-liners
DS8 comparison table          9/10    1    gate   rivals + crossover ("n fits in memory", "deletions needed")
DS6 implementation            9/10    1    gate   pseudocode + sizing helpers + bit ops
CP cp-primitives              3/10    1    adv    Hash-based → advisory; section absent (no contest primitives block)
DS7 gotchas / edge cases      9/10    1    gate   FP drift, no delete, hash quality, at-scale cache, CP hash salt
DS9 interviewer probes        9/10    1    adv    4 Q+A sketches incl. scale and hash-set comparison
DS9a amortized proof          n/a     -     -     fixed bit array — no amortized resize; worst-case O(k) every call stated
FB hashing & collisions       10/10   2    gate   double hashing, FP derivation, k_opt, sizing table, cache at scale
AL1–AL10 / PA1–PA11           n/a     -     -     DS article
V1 complexity re-derivation   9/10    2    gate   P(bit=0)≈(1-1/m)^(kn)≈e^(-kn/m); p≈(1-e^(-kn/m))^k; k_opt=(m/n)ln2 — matches article
V2 pseudocode correctness     9/10    2    gate   traced insert alice/bob + query carol/dave on m=14 diagram — outputs match
V3 worked example fidelity    9/10   0.5   adv    crawler sizing example arithmetic consistent
V4 comparison table accuracy  9/10   0.5   adv    hash set O(1) avg, sorted array roles checked
V5 edge case coverage         9/10   0.5   adv    overfill FP, delete impossibility, counter overflow — distribution-appropriate
V6 invariant inductive proof  n/a     -     -     no amortized/loop invariant param
V7 diagram-text agreement     9/10   0.5   adv    bit positions 1,5,9 / 3,5,11 match prose
V8 terminology precision      9/10   0.5   adv    false negative never claim correct; load-factor analogy precise
V9 recursion stack honesty    n/a     -     -     no recursive algorithms
V10 duplicate-problems rel.   9/10   0.5   adv    crawler duplicates share sizing/mechanic
V11 prerequisite necessity    9/10   0.5   adv    hash table + array are genuine dependencies
V12 cross-article consistency n/a     -     -     vs hash-table.md — FP/load-factor story consistent
V13 probe answer correctness  9/10   0.5   adv    delete/10× overfill/k_opt answers factually sound
V14 general factual accuracy  9/10   0.5   adv    no residual errors
--------------------------------------------------------------------------------

GATE: SHIP — all gated params ≥9.

BLOCKERS (gated, score ≤8):
- (none)

### `circular-buffer.md` — 75/100 — NO-SHIP [section: DS, family: Linear]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         9/10    1    gate   ring + sushi-belt analogy; head/tail defined
U2 complexity stated          9/10    1    gate   O(1) core ops; no hidden amortization mislabeled
U3 when to use / when not     8/10    1    gate   vs dynamic array/linked list present but crossover prose thin — BLOCKER
U4 Python present/idiomatic   9/10    1    gate   Generic CircularBuffer, OverflowError, GC release
U5 pseudocode present/≠py     9/10    2    gate   CLRS CIRCULAR-ENQUEUE/DEQUEUE
U6 practice problems          3/10    1    gate   stub bullet list only — no statements/examples/constraints/code; no duplicate-problems — BLOCKER
U7 format spine               7/10    1    gate   Prerequisites present but TOC omits Prerequisites/TOC entries — BLOCKER
U8 title ↔ filename           10/10  0.5   gate   script PASS
U9 prerequisites format       6/10   0.5   adv    "Modular arithmetic" bold text without link/HTML-comment canonical form
U10 TOC                       7/10   0.5   adv    incomplete vs actual headings (missing Comparison, CP-primitives when added)
U11 filename convention       10/10  0.5   gate   script PASS
U12 links resolve             10/10  0.5   gate   script PASS
U13 soundbite                 9/10   0.5   adv    blockquote present
U14 section layering          8/10   0.5   adv    minor overlap U1→How it works on wrap concept
U17 real-world + at-scale     5/10   0.5   adv    real-time/audio mentioned as use case; no named system; no at-scale failure sentence
U18 cache behavior            8/10   0.5   adv    contiguous + one wrap jump in Memory layout
U20 misconceptions            4/10   0.5   adv    gotchas only; no wrong-mental-model bullets
DS1 how it works + diagram    8/10    1    gate   ASCII ring states good; no mermaid — adequate but shallow on senior traps — BLOCKER
DS2 operations table          9/10    1    gate   complete with search O(n)
DS3 complexity summary        9/10    1    gate   explicit no amortization split
DS4 when-to-use vs alts       8/10    1    gate   prose ok; rivals named; less depth than DS8 would need — BLOCKER
DS5 variants                  8/10    1    adv    overwriting, power-of-two, SPSC, deque-on-ring
DS8 comparison table          2/10    1    gate   ## Comparison section missing entirely — BLOCKER (cap ≤2 placeholder rule)
DS6 implementation            9/10    1    gate   pseudocode + Python + collections.deque callout
CP cp-primitives              2/10    1    gate   Linear family → gated; section missing — BLOCKER (cap ≤5)
DS7 gotchas / edge cases      7/10    1    gate   5 traps but no explicit at-scale production failure (Linear requires) — BLOCKER
DS9 interviewer probes        0/10    1    adv    section missing
DS9a amortized proof          n/a     -     -     fixed capacity — true O(1) worst-case; no amortized behavior
FB memory layout              8/10    2    gate   contiguous/fixed/no-resize good; lacks explicit cache-line / bitmask senior constant — BLOCKER
AL1–AL10 / PA1–PA11           n/a     -     -     DS article
V1 complexity re-derivation   9/10    2    gate   enqueue/dequeue: 1 index write + modulo → O(1); matches table
V2 pseudocode correctness     9/10    2    gate   traced enqueue D at tail=4 → tail=5; count increments — consistent
V3 worked example fidelity    n/a     -     -     no worked example section beyond inline diagram
V4 comparison table accuracy  n/a     -     -     no comparison table
V5 edge case coverage         7/10   0.5   adv    full/empty ambiguity strong; missing overwrite-policy edge at scale
V6 invariant inductive proof  n/a     -     -     no invariant proof section
V7 diagram-text agreement     9/10   0.5   adv    capacity-6 diagram indices match prose
V8 terminology precision      9/10   0.5   adv    head/tail roles consistent
V9 recursion stack honesty    n/a     -     -     iterative only
V10 duplicate-problems rel.   n/a     -     -     no duplicate-problems lines (no full U6 entries)
V11 prerequisite necessity    8/10   0.5   adv    array Must-read ok; modular arithmetic reasonable
V12 cross-article consistency n/a     -     -     vs queue.md/deque.md — O(1) FIFO claims align
V13 probe answer correctness  n/a     -     -     no probes section
V14 general factual accuracy  8/10   0.5   adv    no confident factual errors
--------------------------------------------------------------------------------

GATE: NO-SHIP — 9 gated params below 9.

BLOCKERS (gated, score ≤8):
- U3: deepen when-not prose with named crossover vs dynamic array (latency spike) and deque (both ends)
- U6: replace stub bullets with ≥3 full worked entries + ≥1 duplicate-problems line
- U7: fix TOC to include Prerequisites and Table of Contents anchors
- DS1: add senior trap layer (overwrite policy, SPSC visibility) to diagram section
- DS4: expand rival reasoning ahead of comparison table
- DS8: add ## Comparison table with rivals (dynamic array, queue, deque) and crossover column
- CP: add ≥2 Linear CP primitives (e.g. fixed-window telemetry ring, power-of-two mask indexing)
- DS7: add explicit at-scale trap (e.g. multi-producer lost wakeups / cache-line false sharing on head/tail)
- FB: add cache-line / `& (cap-1)` bitmask constant-factor detail per Linear family bar

### `deque.md` — 85/100 — NO-SHIP [section: DS, family: Linear]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         9/10    1    gate   deck analogy; both-ends O(1) defined
U2 complexity stated          9/10    1    gate   ring O(n) resize spike vs block-linked O(1) worst-case distinguished
U3 when to use / when not     9/10    1    gate   vs queue/stack/array/heap with clear triggers
U4 Python present/idiomatic   9/10    1    gate   CircularDeque + collections.deque contest block
U5 pseudocode present/≠py     9/10    2    gate   CLRS PUSH-FRONT/BACK/POP-* ; distinct from Python
U6 practice problems          9/10    1    gate   4 full entries; duplicate-problems on 3/4 (gated floor met)
U7 format spine               9/10    1    gate   correct spine
U8 title ↔ filename           10/10  0.5   gate   script PASS
U9 prerequisites format       8/10   0.5   adv    Big-O HTML-comment pending; circular-buffer Should-read justified
U10 TOC                       9/10   0.5   adv    complete
U11 filename convention       10/10  0.5   gate   script PASS
U12 links resolve             10/10  0.5   gate   script PASS
U13 soundbite                 9/10   0.5   adv    blockquote present
U14 section layering          9/10   0.5   adv    How it works opens at four-end API, not re-definition
U17 real-world + at-scale     9/10   0.5   adv    ForkJoinPool/work-stealing; rate limiters
U18 cache behavior            9/10   0.5   adv    ring contiguous vs block pointer hops explicit
U20 misconceptions            8/10   0.5   adv    deque-vs-heap for median in gotchas; could be U20 bullet
DS1 how it works + diagram    8/10    1    gate   ASCII ends diagram good; lacks step trace on concrete push/pop — BLOCKER
DS2 operations table          9/10    1    gate   dq[i] O(n) warning included
DS3 complexity summary        9/10    1    gate   amortized vs worst-case ring resize senior paragraph
DS4 when-to-use vs alts       9/10    1    gate   strong prose vs queue/stack/array/heap
DS5 variants                  9/10    1    adv    ring, DLL, block-linked, maxlen, monotonic discipline
DS8 comparison table          9/10    1    gate   crossover column present (random access, priority order)
DS6 implementation            9/10    1    gate   ring deque from scratch + stdlib velocity
CP cp-primitives              9/10    1    gate   Linear → gated; monotonic deque + 0/1-BFS with why-for-CP
DS7 gotchas / edge cases      9/10    1    gate   index O(n), maxlen eviction, monotonic ≤, ring full/empty + CP trap
DS9 interviewer probes        2/10    1    adv    section missing
DS9a amortized proof          5/10    2    gate   Linear → gated; ring resize asserts amortized O(1) but no accounting math inline — BLOCKER
FB memory layout              9/10    2    gate   ring vs block-linked; resize spike vs block alloc; cache trade named
AL1–AL10 / PA1–PA11           n/a     -     -     DS article
V1 complexity re-derivation   9/10    2    gate   monotonic deque: each index pushed/popped ≤1 → O(n); matches claim
V2 pseudocode correctness     9/10    2    gate   push_front on front=4,size=3,cap=6 → front=3,data[3]=x; back slot (front+size)%cap — correct
V3 worked example fidelity    9/10   0.5   adv    sliding-window max trace consistent with CP code
V4 comparison table accuracy  9/10   0.5   adv    dynamic array O(1) index, heap O(log n) checked
V5 edge case coverage         8/10   0.5   adv    strong; could add ring-resize spike under concurrent load
V6 invariant inductive proof  n/a     -     -     no formal invariant section (monotonic deque invariant operational only)
V7 diagram-text agreement     9/10   0.5   adv    ring layout indices 4,7,1,9 match size=3 example
V8 terminology precision      9/10   0.5   adv    amortized vs worst-case language precise
V9 recursion stack honesty    n/a     -     -     iterative algorithms
V10 duplicate-problems rel.   9/10   0.5   adv    LC 622/1696/1425 mechanics align
V11 prerequisite necessity    8/10   0.5   adv    queue Must-read; stack Should-read reasonable
V12 cross-article consistency n/a     -     -     vs circular-buffer.md — shared empty/full size-count pattern consistent
V13 probe answer correctness  n/a     -     -     no probes section
V14 general factual accuracy  9/10   0.5   adv    0/1-BFS deque ordering claim sound
--------------------------------------------------------------------------------

GATE: NO-SHIP — 2 gated params below 9 (DS1, DS9a).

BLOCKERS (gated, score ≤8):
- DS1: add concrete step trace (push_front/back sequence on numbered ring) matching diagram
- DS9a: inline aggregate-method resize proof in Memory layout (geometric series or explicit 2n−1 copy bound — must show accounting, not link-only)

### `dynamic-array.md` — 90/100 — SHIP [section: DS, family: Linear]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         9/10    1    gate   parking-lot analogy; doubling defined
U2 complexity stated          9/10    1    gate   amortized vs worst-case append explicit
U3 when to use / when not     9/10    1    gate   vs circular buffer/linked list with latency crossover
U4 Python present/idiomatic   9/10    1    gate   Generic DynamicArray; bisect in CP not implementation
U5 pseudocode present/≠py     9/10    2    gate   CLRS APPEND/POP with shrink at 1/4
U6 practice problems          9/10    1    gate   7 distinct entries; duplicate-problems on 4/7 (floor met)
U7 format spine               9/10    1    gate   correct spine
U8 title ↔ filename           10/10  0.5   gate   script PASS
U9 prerequisites format       8/10   0.5   adv    Big-O HTML-comment pending
U10 TOC                       9/10   0.5   adv    complete incl. nested CP entries
U11 filename convention       10/10  0.5   gate   script PASS
U12 links resolve             10/10  0.5   gate   script PASS
U13 soundbite                 9/10   0.5   adv    blockquote with amortized claim
U14 section layering          9/10   0.5   adv    How it works opens at size/capacity mechanism
U17 real-world + at-scale     9/10   0.5   adv    Python list/vector; resize OOM spike at ceiling
U18 cache behavior            9/10   0.5   adv    contiguous cache-friendly in Memory layout
U20 misconceptions            7/10   0.5   adv    "append is O(1)" trap in gotchas; not U20-labeled
DS1 how it works + diagram    9/10    1    gate   resize ASCII trace with before/after capacities
DS2 operations table          9/10    1    gate   amortized vs worst-case rows
DS3 complexity summary        9/10    1    gate   best/avg/worst incl. shrink
DS4 when-to-use vs alts       9/10    1    gate   real-time → ring buffer crossover
DS5 variants                  9/10    1    adv    growth factors + golden-ratio allocator insight
DS8 comparison table          9/10    1    gate   crossover column (worst-case append, FIFO shape)
DS6 implementation            9/10    1    gate   from-scratch Python matches pseudocode
CP cp-primitives              9/10    1    gate   Linear → gated; stack/bisect/growable-result with why-for-CP
DS7 gotchas / edge cases      9/10    1    gate   amortized vs worst-case, 2× memory spike, 1/4 shrink, iterator invalidation
DS9 interviewer probes        2/10    1    adv    section missing
DS9a amortized proof          10/10   2    gate   geometric series 1+2+4+…=2n−1 in Memory layout; worst-case single resize O(n) named
FB memory layout              10/10   2    gate   contiguous layout, cache, resize accounting math, 50% slack trade
AL1–AL10 / PA1–PA11           n/a     -     -     DS article
V1 complexity re-derivation   9/10    2    gate   aggregate copies Σ2^i < 2n → amortized O(1) append; fixed +k → O(n²) — matches
V2 pseudocode correctness     9/10    2    gate   append when full: resize then write at size index; pop shrink at size≤cap/4 — trace ok
V3 worked example fidelity    9/10   0.5   adv    problem 3 simulation n=10 → 15 copies matches formula
V4 comparison table accuracy  9/10   0.5   adv    linked list O(1) splice with node ref correct
V5 edge case coverage         9/10   0.5   adv    shrink thrashing, overflow on capacity — family-fit
V6 invariant inductive proof  9/10    2    gate   aggregate method: after k resizes total copies < 2n → amortized O(1); base n=1, inductive on doubling steps
V7 diagram-text agreement     9/10   0.5   adv    capacity 4→8 diagram matches append(99) narrative
V8 terminology precision      9/10   0.5   adv    amortized vs average-case distinguished
V9 recursion stack honesty    n/a     -     -     iterative only
V10 duplicate-problems rel.   9/10   0.5   adv    ArrayList/Vector duplicate accurate
V11 prerequisite necessity    9/10   0.5   adv    array + Big-O genuine
V12 cross-article consistency n/a     -     -     vs circular-buffer.md — resize spike crossover consistent
V13 probe answer correctness  n/a     -     -     no probes section
V14 general factual accuracy  9/10   0.5   adv    golden-ratio reuse claim standard; no errors flagged
--------------------------------------------------------------------------------

GATE: SHIP — all gated params ≥9.

BLOCKERS (gated, score ≤8):
- (none)

### `fenwick-tree.md` — 90/100 — SHIP [section: DS, family: Tree/heap]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         9/10    1    gate   implicit tree in array; i&-i mental model
U2 complexity stated          9/10    1    gate   hard O(log n); no false amortization
U3 when to use / when not     9/10    1    gate   vs prefix sum/segment tree with q·log n crossover
U4 Python present/idiomatic   9/10    1    gate   FenwickTree class, from_array O(n) build
U5 pseudocode present/≠py     9/10    2    gate   CLRS FENWICK-ADD/QUERY/RANGE
U6 practice problems          9/10    1    gate   3 full entries; duplicate-problems on all 3
U7 format spine               9/10    1    gate   correct spine
U8 title ↔ filename           10/10  0.5   gate   script PASS
U9 prerequisites format       8/10   0.5   adv    Big-O HTML-comment pending; segment-tree Should-read ok
U10 TOC                       9/10   0.5   adv    nested traversal subsections listed
U11 filename convention       10/10  0.5   gate   script PASS
U12 links resolve             10/10  0.5   gate   script PASS
U13 soundbite                 9/10   0.5   adv    blockquote present
U14 section layering          9/10   0.5   adv    How it works opens at 1-indexed array mechanism
U17 real-world + at-scale     9/10   0.5   adv    leaderboards; coordinate-range OOM failure
U18 cache behavior            8/10   0.5   adv    non-sequential i&-i jumps at n>10⁷ in gotchas; could be one line in FB
U20 misconceptions            8/10   0.5   adv    max-in-BIT misconception in gotchas
DS1 how it works + diagram    9/10    1    gate   mermaid implicit tree + 1-indexed table
DS2 operations table          9/10    1    gate   build/update/query variants covered
DS3 complexity summary        9/10    1    gate   no amortization — deterministic log
DS4 when-to-use vs alts       9/10    1    gate   sum-only vs segtree; static → prefix sum
DS5 variants                  9/10    1    adv    2D BIT, order-statistics, two-BIT tricks as one-liners
DS8 comparison table          9/10    1    gate   crossover: static → prefix sum; min/max → segtree
DS6 implementation            9/10    1    gate   from_array linear build + add/query
CP cp-primitives              9/10    1    adv    Tree/heap → advisory; 3 primitives with why-for-CP
DS7 gotchas / edge cases      9/10    1    gate   1-indexing, overflow, compression, sum-only, at-scale cache
DS9 interviewer probes        9/10    1    adv    4 Q+A incl. prefix-sum crossover and 2D
DS9a amortized proof          n/a     -     -     article explicitly states no amortized behavior; hard O(log n)
FB traversal & invariant      9/10    2    gate   i&-i trick, query(13) decomposition, update climb; family stretch noted but depth real
AL1–AL10 / PA1–PA11           n/a     -     -     DS article
V1 complexity re-derivation   9/10    2    gate   query strips ≤log₂(i) bits; update adds ≤log₂(n) — O(log n) each; matches
V2 pseudocode correctness     9/10    2    gate   query(13): tree[13]+tree[12]+tree[8] tiles [1..13] per lowbit walk — correct
V3 worked example fidelity    9/10   0.5   adv    NumArray update delta pattern consistent
V4 comparison table accuracy  9/10   0.5   adv    prefix sum O(1) query/O(n) update; segtree O(4n) space — ok
V5 edge case coverage         9/10   0.5   adv    i=0 trap, overflow, coordinate compression — family-fit
V6 invariant inductive proof  9/10    2    gate   invariant tree[i]=sum of lowbit(i) elems; query(13) constructive proof tiles [1,13] without gap/overlap
V7 diagram-text agreement     9/10   0.5   adv    mermaid tree[8] decomposition matches index table
V8 terminology precision      9/10   0.5   adv    1-indexed load-bearing; invertible-op limit for min stated
V9 recursion stack honesty    n/a     -     -     iterative only
V10 duplicate-problems rel.   9/10   0.5   adv    RSQ mutable / inversion / range-update duplicates align
V11 prerequisite necessity    9/10   0.5   adv    prefix-sum Must-read; bit-manipulation Should-read for i&-i
V12 cross-article consistency n/a     -     -     vs segment-tree.md — BIT sum-only / half memory story consistent
V13 probe answer correctness  9/10   0.5   adv    prefix-sum crossover and lazy-segtree boundary correct
V14 general factual accuracy  9/10   0.5   adv    two-BIT range-update algebra standard; no errors
--------------------------------------------------------------------------------

GATE: SHIP — all gated params ≥9.

BLOCKERS (gated, score ≤8):
- (none)

### `graph.md` — 76/100 — NO-SHIP [section: DS, family: Graph]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         9/10    1    gate   road-map analogy + soundbite; senior depth on taxonomy
U2 complexity stated          8/10    1    gate   V+E throughout ops/summary; no standalone U2 line; DFS stack space omitted (see V9)
U3 when-to-use / when not     9/10    1    gate   list vs matrix prose with E≈V² crossover; names tree/array/hash alternatives
U4 Python present             9/10    1    gate   type hints, deque, build_graph/bfs/dfs/matrix; idiomatic
U5 pseudocode ≠ Python        8/10    2    gate   CLRS BUILD-GRAPH + BFS present; DFS only in Python — minor gap on non-trivial traversal op
U6 practice problems          9/10    1    gate   4 worked entries, distinct techniques; all 4 have Duplicate problems lists
U7 format spine               9/10    1    gate   title → prereqs → TOC → body; no YAML
U8 title ↔ filename           9/10   0.5   gate   script PASS — H1 "Graph" → graph.md
U9 prerequisites format         8/10   0.5   adv    live links + tiers; all [Must read] — linked-list not listed though array is (minor tier judgment)
U10 TOC                       9/10   0.5   adv    reflects headings; missing CP-primitives / DS9 entries (sections absent)
U11 filename convention       9/10   0.5   gate   script PASS
U12 links resolve             9/10    1    gate   script PASS
U13 soundbite                 9/10   0.5   adv    blockquote under What it is — spoken compression present
U14 section layering          9/10   0.5   adv    What it is → How it works opens at G=(V,E) mechanism, not re-definition
U17 real-world + at-scale     9/10   0.5   adv    OS DAGs, Google Maps routing; matrix memory wall at scale in complexity summary
U18 cache behavior            8/10   0.5   adv    Graph family → advisory; pointer-chasing vs matrix sequential implied in Representations, not one explicit U18 sentence
U20 misconceptions            8/10   0.5   adv    directed vs undirected cycle detection in gotchas — mixes gotcha + misconception well
DS1 how it works + diagram    9/10    1    gate   ASCII taxonomy + adjacency layouts; real diagrams
DS2 operations table          9/10    1    gate   list vs matrix ops with individual O(); space column present
DS3 complexity summary        9/10    1    gate   V,E variables; best/avg/worst where relevant; tipping E>V log V stated
DS4 when-to-use prose         9/10    1    gate   prose complements DS8; names tree/array/hash map
DS5 variants                  9/10    1    adv    DAG, weighted, bipartite, implicit, complete — ≥1 real variants
DS8 comparison table          5/10    1    gate   table present but "Best for" lacks per-row crossover thresholds — BLOCKER (cap per rater)
DS6 implementation            9/10    1    gate   pseudocode + Python for list and matrix builds
CP cp-primitives              0/10    1    gate   Graph family → gated; section entirely missing — BLOCKER (need ≥2: DSU-on-graph, Euler tour, weighted-adj trick)
FB representations          9/10    2    gate   matrix vs list with E≈V² density crossover, edge-list for Kruskal, visited-state notes
DS7 gotchas / edge cases      9/10    1    gate   disconnected, self-loops, 3-color directed cycles, grid implicit graphs, overflow
DS9 interviewer probes        3/10    1    adv    section missing entirely
DS9a amortized proof          n/a     -     -     Graph family → n/a; fixed representation choice, no amortized structure behavior
V1 complexity re-derivation   9/10    2    gate   BFS: each vertex enqueued once, each edge examined once → O(V+E); Dijkstra O(E log V) matches heap claim; skim-clean on standard traversals
V2 pseudocode correctness     9/10    2    gate   traced BFS on 4-node graph: dist[source]=0, neighbors relax correctly; BUILD-GRAPH bidirectional edge wiring correct
V6 invariant inductive proof  n/a     -     -     Graph FB is Representations, not loop/recurrence invariant — no invariant param to verify
V9 recursion stack honesty      6/10    2    gate   recursive dfs() shown but never states O(V) call-stack space; U2 omits stack term — BLOCKER
V3 worked example fidelity      9/10   0.5   adv    Islands BFS trace matches code; Course Schedule 3-color logic consistent
V4 comparison table accuracy    8/10   0.5   adv    incidence matrix O(V·E) space checks; edge-list O(E) lookup correct
V5 edge case coverage           9/10   0.5   adv    disconnected, directed vs undirected cycles — family-relevant, not copy-paste
V7 diagram-text agreement       9/10   0.5   adv    adjacency list example indices align with prose
V8 terminology precision        9/10   0.5   adv    directed/undirected, weighted distinctions precise
V10 duplicate-problems relevance  9/10   0.5   adv    Flood Fill / Max Area share component-marking mechanic with Islands
V11 prerequisite necessity        8/10   0.5   adv    array/hash-table justified; binary-tree Must-read is light dependency for pure graph reps
V13 probe answer correctness      n/a     -     -     DS9 section absent — nothing to verify
V14 general factual accuracy      9/10   0.5   adv    no confident errors in residual sweep beyond V9 gap
V12 cross-article consistency     n/a     -     -     sole Graph-family member article — not checked
--------------------------------------------------------------------------------

GATE: NO-SHIP — 4 gated params below 9 (CP, DS8, V9, U5 borderline).

BLOCKERS (gated, score ≤8):
- CP: add ## CP-primitives with ≥2 tools (adjacency-list-with-weights, DSU-on-graph, Euler tour for LCA/subtree)
- DS8: add "Pick it when…" crossover per rival row (e.g. matrix wins when E > V log V or V ≤ few thousand)
- V9: state DFS space O(V) including recursion stack in Complexity summary or Operations; or note iterative DFS O(V) explicit stack

### `hash-set.md` — 6/100 — NO-SHIP [section: DS, family: Hash-based]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         0/10    1    gate   skeleton HTML comment only — no content
U2 complexity stated          0/10    1    gate   absent
U3 when-to-use / when not     0/10    1    gate   absent
U4 Python present             0/10    1    gate   absent
U5 pseudocode ≠ Python        0/10    2    gate   absent — no trivial-op justification
U6 practice problems          0/10    1    gate   absent — no worked entries, no Duplicate problems
U7 format spine               3/10    1    gate   H1 + section headings exist but body is comments/TODOs
U8 title ↔ filename           9/10   0.5   gate   script PASS
U9 prerequisites format         0/10   0.5   adv    comment placeholder only
U10 TOC                       0/10   0.5   adv    comment placeholder only
U11 filename convention       9/10   0.5   gate   script PASS
U12 links resolve             9/10    1    gate   script PASS (no live body links)
U13 soundbite                 0/10   0.5   adv    absent
U14 section layering          0/10   0.5   adv    no layered content
U17 real-world + at-scale     0/10   0.5   adv    absent
U18 cache behavior            0/10   0.5   adv    absent
U20 misconceptions            0/10   0.5   adv    absent
DS1 how it works + diagram    0/10    1    gate   <!-- diagram --> placeholder comment — scores ≤2
DS2 operations table          1/10    1    gate   empty table shell, no O() cells filled
DS3 complexity summary        0/10    1    gate   absent
DS4 when-to-use prose         0/10    1    gate   absent
DS5 variants                  0/10    1    adv    absent
DS8 comparison table          0/10    1    gate   absent — not even empty table
DS6 implementation            0/10    1    gate   absent
CP cp-primitives              0/10    1    adv    Hash-based → advisory; section comment only
FB hashing & collisions       0/10    2    gate   family heading is literal "<Family heading>" placeholder
DS7 gotchas / edge cases      0/10    1    gate   absent
DS9 interviewer probes        0/10    1    adv    absent
DS9a amortized proof          0/10    2    cond    Hash-based → gated when written; no n/a justification on empty article
V1 complexity re-derivation   n/a     -     -     no claims to verify — unfilled skeleton
V2 pseudocode correctness     n/a     -     -     no pseudocode/code
V6 invariant inductive proof  n/a     -     -     no invariant section
V9 recursion stack honesty      n/a     -     -     no recursive algorithms stated
V3 worked example fidelity      n/a     -     -     no worked examples
V4 comparison table accuracy    n/a     -     -     no comparison table
V5 edge case coverage           n/a     -     -     no edge cases listed
V7 diagram-text agreement       n/a     -     -     no diagram
V8 terminology precision        n/a     -     -     no prose to check
V10 duplicate-problems relevance n/a    -     -     no practice problems
V11 prerequisite necessity        n/a     -     -     no prerequisites listed
V13 probe answer correctness      n/a     -     -     no probes
V14 general factual accuracy      n/a     -     -     skeleton only
V12 cross-article consistency     n/a     -     -     hash-table.md is the sibling — contradictions not applicable on empty page
--------------------------------------------------------------------------------

GATE: NO-SHIP — entire gated surface ≤8 (expected unfilled skeleton).

BLOCKERS (gated, score ≤8):
- All universal + DS + FB gated params — fill from dsa-writer.md Hash-based spine
- U5: even hash-set membership may skip trivial pseudocode, but must justify inline in NOTE
- DS9a: on publish, mark n/a with justification (set has no amortized ops) OR cover hash-table resize only by cross-link

### `hash-table.md` — 84/100 — NO-SHIP [section: DS, family: Hash-based]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         9/10    1    gate   coat-check analogy + takeaway soundbite; avalanche property named
U2 complexity stated          9/10    1    gate   avg/worst in ops + summary; amortized insert called out
U3 when-to-use / when not     9/10    1    gate   BST/trie/array alternatives with decision rule of thumb
U4 Python present             9/10    1    gate   HashMap class + collections idioms; type hints throughout
U5 pseudocode ≠ Python        9/10    2    gate   HASH-INSERT/GET in CLRS form (numbered steps, ▷ comments) — not pasteable Python
U6 practice problems          9/10    1    gate   5 distinct techniques; Duplicate problems on 1,2,4,5 (problem 3 omits — floor met)
U7 format spine               9/10    1    gate   correct spine
U8 title ↔ filename           9/10   0.5   gate   script PASS
U9 prerequisites format         7/10   0.5   adv    Big-O entry lacks `[Title](./path.md)` link — bold + HTML comment only; format violation
U10 TOC                       9/10   0.5   adv    reflects headings including nested hashing subsections
U11 filename convention       9/10   0.5   gate   script PASS
U12 links resolve             9/10    1    gate   script PASS
U13 soundbite                 9/10   0.5   adv    "Takeaway (say this out loud)" blockquote
U14 section layering          9/10   0.5   adv    How it works opens at bucket-array mechanism, not re-defining hash table
U17 real-world + at-scale     9/10   0.5   adv    DB indexes, Redis, compilers; rehash stall mentioned in gotchas
U18 cache behavior            9/10   0.5   adv    chaining pointer-chasing vs open-addressing inline locality contrast
U20 misconceptions            9/10   0.5   adv    "O(1) worst-case", iteration order ≠ sorted, ==/hash contract — plausible wrong beliefs
DS1 how it works + diagram    9/10    1    gate   ASCII bucket diagram; three-piece layout explained
DS2 operations table          9/10    1    gate   insert/lookup/delete/membership/iterate with avg+worst+space
DS3 complexity summary        9/10    1    gate   best/avg/worst table; space O(n)+slack explicit
DS4 when-to-use prose         9/10    1    gate   prose vs BST/sorted array/trie/direct array
DS5 variants                  9/10    1    adv    hash-set pointer, multimap, Counter, ordered map, concurrent, consistent hashing
DS8 comparison table          9/10    1    gate   Pick-it-when column with bounded-integer → direct array crossover
DS6 implementation            9/10    1    gate   separate-chaining HashMap + contest velocity block
CP cp-primitives              9/10    1    adv    Hash-based → advisory; 3 primitives with why-for-CP lines
FB hashing & collisions       8/10    2    gate   chaining + open addressing + load factors 0.75/0.66; resize described but amortized accounting deferred to dynamic-array link — shallow for weight-2 FB
DS7 gotchas / edge cases      9/10    1    gate   mutable keys, hash flooding, resize spike, ==/hash, float/NaN; rehash stall at-scale
DS9 interviewer probes        3/10    1    adv    section missing
DS9a amortized proof          6/10    2    cond    Hash-based → gated; asserts geometric amortization + links dynamic-array but no accounting math on-page — BLOCKER (cap ≤5 rule applies)
V1 complexity re-derivation   9/10    2    gate   O(1) avg: α<1 ⇒ O(1) bucket ops; worst O(n) all-collide; resize sum 1+2+4+…n = O(n) over n inserts
V2 pseudocode correctness     9/10    2    gate   traced HASH-GET on colliding keys: index via mod, chain walk finds match
V6 invariant inductive proof  n/a     -     -     no loop invariant param; collision resolution is procedural not inductive
V9 recursion stack honesty      9/10    2    gate   no recursive algorithms in core ops — n/a justified
V3 worked example fidelity      9/10   0.5   adv    Two Sum seen-map trace matches code; prefix-sum hashmap logic consistent
V4 comparison table accuracy    9/10   0.5   adv    BST O(log n) ordered ops; trie O(L) checked
V5 edge case coverage           9/10   0.5   adv    adversarial clustering, mutable keys — hash-family relevant
V7 diagram-text agreement       9/10   0.5   adv    bucket diagram indices align
V8 terminology precision        9/10   0.5   adv    amortized vs worst-case distinguished in gotchas
V10 duplicate-problems relevance  9/10   0.5   adv    4Sum II shares complement-lookup mechanic with Two Sum
V11 prerequisite necessity        8/10   0.5   adv    array Must-read solid; linked-list Should-read for chaining — fair
V13 probe answer correctness      n/a     -     -     DS9 absent
V14 general factual accuracy      9/10   0.5   adv    birthday paradox / pigeonhole claims standard and correct
V12 cross-article consistency     n/a     -     -     hash-set.md empty — no contradiction to flag
--------------------------------------------------------------------------------

GATE: NO-SHIP — 2 gated params below 9 (FB, DS9a).

BLOCKERS (gated, score ≤8):
- DS9a: add on-page accounting — n inserts trigger resizes at sizes 8,16,…,n costing 8+16+…+n = O(n) total ⇒ O(1) amortized; state worst single insert O(n)
- FB: same amortized derivation inside ## Hashing & collisions (don't only link dynamic-array)

### `heap.md` — 87/100 — NO-SHIP [section: DS, family: Tree/heap]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         9/10    1    gate   corporate hierarchy analogy; not-sorted distinction explicit
U2 complexity stated          9/10    1    gate   inline + ops table + summary; push amortized nuance noted
U3 when-to-use / when not     9/10    1    gate   BST/sorted array alternatives; repeated min/max rule of thumb
U4 Python present             9/10    1    gate   heapq idioms + from-scratch sift; type hints
U5 pseudocode ≠ Python        9/10    2    gate   MAX-HEAPIFY/BUILD-MAX-HEAP CLRS form with ←, ▷, swap — not Python
U6 practice problems          9/10    1    gate   5 distinct techniques; all 5 have Duplicate problems lists
U7 format spine               9/10    1    gate   correct spine
U8 title ↔ filename           9/10   0.5   gate   script PASS
U9 prerequisites format         7/10   0.5   adv    Big-O same broken link pattern as hash-table (bold + comment, no path)
U10 TOC                       9/10   0.5   adv    reflects headings including practice sub-entries
U11 filename convention       9/10   0.5   gate   script PASS
U12 links resolve             9/10    1    gate   script PASS
U13 soundbite                 9/10   0.5   adv    takeaway blockquote present
U14 section layering          9/10   0.5   adv    How it works opens at array index arithmetic, not re-defining heap
U17 real-world + at-scale     8/10   0.5   adv    schedulers, Dijkstra named; no explicit n>10⁷ failure sentence
U18 cache behavior            8/10   0.5   adv    flat-array layout noted cache-friendly in Variants; not one dedicated U18 sentence
U20 misconceptions            9/10   0.5   adv    "NOT sorted" as first gotcha — classic misconception targeted
DS1 how it works + diagram    9/10    1    gate   mermaid tree + array layout; index formulas shown
DS2 operations table          9/10    1    gate   peek/push/pop/build/decrease-key with times
DS3 complexity summary        9/10    1    gate   push best/avg/worst; build-heap O(n) highlighted
DS4 when-to-use prose         9/10    1    gate   prose vs BST/sorted array
DS5 variants                  9/10    1    adv    d-ary, Fibonacci, indexed heap, min vs max
DS8 comparison table          9/10    1    gate   crossover hints (d-ary for decrease-key-heavy Dijkstra)
DS6 implementation            9/10    1    gate   pseudocode + heapq + sift from scratch
CP cp-primitives              9/10    1    adv    Tree/heap → advisory; 4 primitives with why-for-CP
FB traversal & invariant      9/10    2    gate   heap invariant; build-heap Σ h/2^h = O(n) with convergence shown
DS7 gotchas / edge cases      7/10    1    gate   strong CP traps (max-heap negation, lazy deletion) but no at-scale trap (cache miss growth at large n) — BLOCKER for Tree/heap family
DS9 interviewer probes        3/10    1    adv    section missing
DS9a amortized proof          9/10    2    adv    Tree/heap → advisory; push amortized + build-heap O(n) proof present at senior depth
V1 complexity re-derivation   9/10    2    gate   build-heap: Σ_{h=0}^{log n} (n/2^{h+1})·h = O(n); sift height O(log n) — matches claims
V2 pseudocode correctness     9/10    2    gate   MAX-HEAPIFY on [3,1,4,2]: largest child selection and swap path correct
V6 invariant inductive proof  9/10    2    gate   heap property maintained by sift-down local fix; build-heap bottom-up inductive structure shown via height sum
V9 recursion stack honesty      9/10    2    gate   MAX-HEAPIFY pseudocode recurses but Python sift is iterative; space O(n) array stated — n/a for iterative implementation
V3 worked example fidelity      9/10   0.5   adv    K-way merge heap trace matches LC 23 code structure
V4 comparison table accuracy    9/10   0.5   adv    Fibonacci heap theoretical bounds correct
V5 edge case coverage           9/10   0.5   adv    empty heap, tuple tiebreaker — heap-relevant
V7 diagram-text agreement       9/10   0.5   adv    mermaid node values match array [9,7,8,3,6,5,2]
V8 terminology precision        9/10   0.5   adv    "amortized" push vs worst O(log n) distinguished
V10 duplicate-problems relevance  9/10   0.5   adv    K Closest Points shares size-K heap mechanic
V11 prerequisite necessity        9/10   0.5   adv    array Must-read for index layout — genuine dependency
V13 probe answer correctness      n/a     -     -     DS9 absent
V14 general factual accuracy      9/10   0.5   adv    lazy deletion description accurate for heapq
V12 cross-article consistency     n/a     -     -     interval-tree is different member — heap FB consistent with writer Tree/heap block
--------------------------------------------------------------------------------

GATE: NO-SHIP — 1 gated param below 9 (DS7).

BLOCKERS (gated, score ≤8):
- DS7: add at-scale trap in Gotchas — e.g. at n>10⁷ flat-array heap still O(log n) but 2i+1 child indices drift out of cache lines, pointer-free yet cache-miss rate climbs

### `interval-tree.md` — 83/100 — NO-SHIP [section: DS, family: Tree/heap]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         9/10    1    gate   augmented BST + "loudest deadline" analogy; soundbite present
U2 complexity stated          8/10    1    gate   ops table states O(log n) without caveat that impl is unbalanced BST
U3 when-to-use / when not     9/10    1    gate   static sorted array, segment tree, brute-force, sortedcontainers CP note
U4 Python present             9/10    1    gate   dataclass INode + IntervalTree; type hints, idiomatic
U5 pseudocode ≠ Python        9/10    2    gate   IntervalInsert/OverlapSearch CLRS-style; Overlaps predicate separate
U6 practice problems          9/10    1    gate   3 problems, distinct mechanics; all 3 have Duplicate problems
U7 format spine               9/10    1    gate   correct spine
U8 title ↔ filename           9/10   0.5   gate   script PASS
U9 prerequisites format         8/10   0.5   adv    balanced-bst commented not linked; BST/binary-tree linked with tiers
U10 TOC                       9/10   0.5   adv    reflects headings including probes section
U11 filename convention       9/10   0.5   gate   script PASS
U12 links resolve             9/10    1    gate   script PASS
U13 soundbite                 9/10   0.5   adv    takeaway blockquote under What it is
U14 section layering          9/10   0.5   adv    How it works opens at node fields + max propagation, not re-defining interval tree
U17 real-world + at-scale     9/10   0.5   adv    scheduling, PostgreSQL GiST, collision detection
U18 cache behavior            9/10   0.5   adv    explicit cache-hostile pointer BST note in How it works + gotchas
U20 misconceptions            8/10   0.5   adv    touching vs overlapping convention in gotchas — more gotcha than misconception
DS1 how it works + diagram    9/10    1    gate   ASCII tree with max_hi propagation walkthrough
DS2 operations table          8/10    1    gate   all ops listed but states O(log n) without "balanced" assumption footnote
DS3 complexity summary        8/10    1    gate   k=n worst case noted; insert/delete O(log n) omits unbalanced O(n) worst
DS4 when-to-use prose         9/10    1    gate   segment tree vs static sort vs CP sortedcontainers
DS5 variants                  9/10    1    adv    centered tree, 2D, augmented AVL/RB named
DS8 comparison table          9/10    1    gate   explicit Crossover conditions subsection — strong
DS6 implementation            8/10    1    gate   full Python but unbalanced BST — matches article gap on balance
CP cp-primitives              n/a     -     -     Tree/heap → advisory; no section (acceptable)
FB traversal & invariant      9/10    2    gate   dual invariant + overlap pruning proof; DS9a n/a justified inline
DS7 gotchas / edge cases      9/10    1    gate   open/closed overlap, max fixup on rotation, overflow, pointer cache at n>10⁶
DS9 interviewer probes        9/10    1    adv    4 probes with answer sketches — scale, max vs min endpoint, delete frequency, duplicates
DS9a amortized proof          n/a     -     -     explicitly n/a — no amortized behavior; justified in Traversal section
V1 complexity re-derivation   7/10    2    gate   query O(log n+k) correct for balanced tree; presented code is unbalanced BST → insert/search worst O(n) not disclosed in ops table — BLOCKER
V2 pseudocode correctness     8/10    2    gate   overlap_search logic sound; My Calendar practice uses half-open overlap but main impl uses closed intervals — inconsistency on touching intervals (V14)
V6 invariant inductive proof  9/10    2    gate   pruning proof: left.max < q_lo ⇒ all b ≤ left.max < q_lo ⇒ no overlap — base + skip argument shown
V9 recursion stack honesty      9/10    2    gate   iterative overlap_search; recursive all_overlaps depth O(log n) implicit — space O(k) output noted
V3 worked example fidelity      9/10   0.5   adv    ConflictFinder query trace matches max_hi pruning prose
V4 comparison table accuracy    9/10   0.5   adv    sorted array static update O(n) correct
V5 edge case coverage           9/10   0.5   adv    coordinate overflow CP trap — relevant to timestamp endpoints
V7 diagram-text agreement       9/10   0.5   adv    max_hi values in diagram match propagation arithmetic
V8 terminology precision        9/10   0.5   adv    stabbing vs range overlap distinguished
V10 duplicate-problems relevance  9/10   0.5   adv    Merge Intervals is static-array equivalent of free-time sweep
V11 prerequisite necessity        9/10   0.5   adv    BST dependency genuine for augmented tree understanding
V13 probe answer correctness      9/10   0.5   adv    "why max not min" answer sketch factually correct
V14 general factual accuracy      7/10   0.5   adv    closed vs half-open overlap mixed between impl and My Calendar — clear error risk
V12 cross-article consistency     n/a     -     -     heap.md sibling — no contradiction on heap invariant
--------------------------------------------------------------------------------

GATE: NO-SHIP — 2 gated params below 9 (V1, V2 borderline).

BLOCKERS (gated, score ≤8):
- V1: footnote Operations/Complexity — O(log n) assumes balanced BST; plain BST implementation is O(n) worst; or upgrade impl to AVL sketch
- V2/V14: unify overlap convention (closed vs half-open) across Implementation and My Calendar practice code

### `lfu-cache.md` — 85/100 — NO-SHIP [section: DS, family: Hash-based / composite]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         9/10    1    gate   leaderboard analogy; LRU tie-break inside freq buckets explicit
U2 complexity stated          9/10    1    gate   O(1) avg/worst table; hash collision worst O(n) noted
U3 when-to-use / when not     9/10    1    gate   LRU, FIFO, heap-LFU, plain dict; pollution → Window-TinyLFU
U4 Python present             9/10    1    gate   OrderedDict LFUCache + AllOne + FreqStack; idiomatic
U5 pseudocode ≠ Python        9/10    2    gate   LFU-CACHE/TOUCH/GET/PUT CLRS form; not pasteable Python
U6 practice problems          8/10    1    gate   4 worked entries; Duplicate on #3,#4 only — #1 canonical LFU omits duplicates (floor met via #3)
U7 format spine               8/10    1    gate   missing Prerequisites/TOC self-links in TOC list (minor); otherwise correct
U8 title ↔ filename           9/10   0.5   gate   script PASS
U9 prerequisites format         7/10   0.5   adv    Big-O bold + comment only — same format gap as hash-table/heap
U10 TOC                       8/10   0.5   adv    omits Prerequisites/TOC anchor entries present in other articles
U11 filename convention       9/10   0.5   gate   script PASS
U12 links resolve             9/10    1    gate   script PASS
U13 soundbite                 9/10   0.5   adv    Soundbite blockquote with min_freq mechanism
U14 section layering          9/10   0.5   adv    How it works opens at bucket-hop mechanism, not re-defining LFU
U17 real-world + at-scale     9/10   0.5   adv    Redis allkeys-lfu, CDN, Caffeine; caching SD cross-link
U18 cache behavior            9/10   0.5   adv    Memory layout: pointer-chasing vs Count-Min Sketch contiguous trade explicit
U20 misconceptions            9/10   0.5   adv    pollution trap as wrong mental model (stale winners never evicted)
DS1 how it works + diagram    9/10    1    gate   freq bucket ASCII diagram with min_freq pointer
DS2 operations table          9/10    1    gate   get/put/evict/contains with avg time + space; evict subtlety noted
DS3 complexity summary        9/10    1    gate   explicitly no amortization on cache ops; hash worst-case separated
DS4 when-to-use prose         9/10    1    gate   vs LRU, heap-LFU, plain hash table with policy rationale
DS5 variants                  9/10    1    adv    aging, Window-TinyLFU, LFRU, Redis aged counter, LIRS
DS8 comparison table          9/10    1    gate   crossover: heap-LFU ~10 lines vs bucket LFU for O(1) requirement
DS6 implementation            9/10    1    gate   pseudocode + OrderedDict reference + DLL note
CP cp-primitives              9/10    1    adv    Hash-based/composite → advisory; 2 primitives with recognition cues
FB memory layout              9/10    2    gate   three heap regions diagram; 2× pointer work vs LRU; sketch vs exact counts; resize on hash maps
DS7 gotchas / edge cases      7/10    1    gate   excellent min_freq correctness traps; missing explicit at-scale trap in Gotchas (3× memory vs LRU at multi-GB capacity) — BLOCKER
DS9 interviewer probes        3/10    1    adv    section missing
DS9a amortized proof          n/a     -     -     LFU cache ops strictly O(1) worst — n/a justified in Complexity summary; hash map resize amortization referenced in Memory layout
V1 complexity re-derivation   9/10    2    gate   touch = 2 bucket splices O(1); min_freq increment/reset only — no scan; matches O(1) claim
V2 pseudocode correctness     9/10    2    gate   traced put when full: evict BACK(min_freq), insert freq 1, min_freq←1 — matches Python
V6 invariant inductive proof  n/a     -     -     no loop invariant — bucket-hop is procedural invariant on min_freq non-emptiness
V9 recursion stack honesty      9/10    2    gate   no recursion in core ops
V3 worked example fidelity      9/10   0.5   adv    LFU trace (evict key 2 then key 1) matches LC 460 narrative
V4 comparison table accuracy    9/10   0.5   adv    heap-LFU O(log n) row correct
V5 edge case coverage           9/10   0.5   adv    capacity 0, update-is-use, empty bucket removal
V7 diagram-text agreement       9/10   0.5   adv    bucket diagram matches get(E)/put(X) walkthrough
V8 terminology precision        9/10   0.5   adv    amortized vs strict O(1) for LFU ops distinguished from hash maps
V10 duplicate-problems relevance  9/10   0.5   adv    Top K Frequent Words shares bucket-by-frequency sweep
V11 prerequisite necessity        9/10   0.5   adv    LRU + hash-table dependencies load-bearing
V13 probe answer correctness      n/a     -     -     DS9 absent
V14 general factual accuracy      9/10   0.5   adv    Window-TinyLFU / Caffeine attribution correct
V12 cross-article consistency     n/a     -     -     lru-cache.md sibling — memory layout cross-links consistent
--------------------------------------------------------------------------------

GATE: NO-SHIP — 1 gated param below 9 (DS7).

BLOCKERS (gated, score ≤8):
- DS7: add at-scale trap bullet — e.g. at capacity 10⁷ keys, three hash maps + per-freq OrderedDict headers dominate RAM (~3× LRU); distinct-frequency bucket map grows with access diversity

### `linked-list.md` — 92/100 — NO-SHIP [section: DS, family: Linear]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         10/10   1    gate   treasure-hunt analogy + O(1)-splice trade stated crisply
U2 complexity stated          10/10   1    gate   per-op + summary tables; space includes pointer overhead
U3 when to use / when not     10/10   1    gate   array/dynamic-array rivals named with concrete cues
U4 Python present/idiomatic   10/10   1    gate   dataclass Node, Generic, deque contest shortcut
U5 pseudocode present/≠py      8/10   2    gate   CLRS push-front + delete-value solid; append/insert-after missing from pseudocode - BLOCKER
U6 practice problems           9/10   1    gate   4 distinct techniques; duplicate-problems on all 4 (advisory 3–5 met)
U7 format spine               10/10   1    gate   title → prereqs → TOC → body; no YAML
U8 title ↔ filename           10/10  0.5   gate   script PASS
U9 prerequisites format        9/10  0.5   adv    Big-O HTML-comment + memory plain-text pending; tiers correct
U10 TOC                        9/10  0.5   adv    reflects headings; omits DS9 (section absent)
U11 filename convention       10/10  0.5   gate   script PASS
U12 links resolve             10/10   1    gate   script PASS
U13 soundbite                 10/10  0.5   adv    blockquote takeaway present
U14 section layering           9/10  0.5   adv    How it works opens at mechanism (nodes/pointers), not re-definition
U17 real-world + at-scale      9/10  0.5   adv    LRU/free-lists/graph adjacency; resize-spike contrast in memory layout
U18 cache behavior            10/10  0.5   adv    cache-line / prefetch / miss per hop explicit in Memory layout
U20 misconceptions             7/10  0.5   adv    gotchas are mostly bugs; no explicit wrong-belief bullets
DS1 how it works + diagram    10/10   1    gate   ASCII layout + insert splice trace
DS2 operations table          10/10   1    gate   all ops with time + space; singly-delete trap called out
DS3 complexity summary        10/10   1    gate   best/avg/worst + space overhead sentence
DS4 when-to-use prose          9/10   1    gate   array vs list reasoning; complements DS8
DS5 variants                   9/10   1    adv    singly/doubly/circular/sentinel/XOR/skip-list pointer
DS6 implementation            10/10   1    gate   full Python class + pseudocode contract
DS7 gotchas / edge cases       9/10   1    gate   ≥2 traps + cache/at-scale senior trap present
DS8 comparison table           9/10   1    gate   rivals with crossover ("front-insert only when n small enough…")
DS9 interviewer probes         3/10   1    adv    section missing entirely (advisory but real gap)
CP cp-primitives              10/10   1    gate   Linear → gated; dummy-head, reversal, fast/slow (≥2 + why-for-CP)
FB memory layout              10/10   2    gate   contiguous vs scatter, cache miss, allocator header, no-resize win
DS9a amortized proof           n/a    -     cond   n/a — fixed linked list has no aggregate amortized op (per-insert O(1) literal)
AL10 constraints & approach    n/a    -     -     DS article
PA1 recognition signals        n/a    -     -     not a pattern article
V1 complexity re-derivation     10/10   2    gate   access = walk i hops → O(n); splice = 2 ptr writes → O(1); matches tables
V2 pseudocode correctness     10/10   2    gate   traced DELETE-VALUE on head/middle/miss: prev/head/tail updates correct
V6 invariant inductive proof   n/a    -     -     n/a — no loop/recurrence invariant section on this DS article
V9 recursion stack honesty     n/a    -     -     n/a — no recursive algorithm with space claim
V3 worked example fidelity       9/10  0.5   adv    insert-55 diagram matches prose
V4 comparison table accuracy    10/10  0.5   adv    rival Big-O checked: hash O(1) avg, array O(1) access — correct
V5 edge case coverage            9/10  0.5   adv    family-relevant: head/dummy/cycle/cache; no amortized edges needed
V7 diagram-text agreement       10/10  0.5   adv    node values 42/17/99/8 consistent across diagrams
V8 terminology precision        10/10  0.5   adv    "held node" vs position-i insert distinction precise
V10 duplicate-problems relevance 9/10  0.5   adv    LC 92/287/88 share core mechanics with anchors
V11 prerequisite necessity       8/10  0.5   adv    array Must-read justified; memory model Should-read is adjacency-light
V12 cross-article consistency    -     -     -     checked vs array.md: cache-friendly array claim consistent; no contradiction
V13 probe answer correctness     n/a    -     -     n/a — DS9 section absent
V14 general factual accuracy    10/10  0.5   adv    no residual errors in prose sweep
--------------------------------------------------------------------------------

GATE: NO-SHIP — 1 gated param below 9 (U5 pseudocode incomplete for append).

BLOCKERS (gated, score ≤8):
- U5: add CLRS pseudocode for LIST-APPEND (tail-pointer) and insert-after-held-node; currently only push-front + delete-value

### `lru-cache.md` — 86/100 — NO-SHIP [section: DS, family: Hash-based]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         10/10   1    gate   plate-stack analogy + map+DLL composition clear
U2 complexity stated          10/10   1    gate   avg/worst hash collision called out; O(capacity) space
U3 when to use / when not     10/10   1    gate   LFU/FIFO/TTL/plain-hash alternatives named
U4 Python present/idiomatic   10/10   1    gate   __slots__, walrus, OrderedDict shortcut
U5 pseudocode present/≠py     10/10   2    gate   CLRS GET/PUT/ADD-FRONT/UNLINK; not pasteable Python
U6 practice problems           5/10   1    gate   3 strong entries but ZERO Duplicate problems lines on any — cap 5 - BLOCKER
U7 format spine               10/10   1    gate   correct spine
U8 title ↔ filename           10/10  0.5   gate   script PASS
U9 prerequisites format        9/10  0.5   adv    Big-O HTML-comment pending; hash-table + DLL tiers correct
U10 TOC                        8/10  0.5   adv    missing DS9 heading (section absent)
U11 filename convention       10/10  0.5   gate   script PASS
U12 links resolve             10/10   1    gate   script PASS
U13 soundbite                 10/10  0.5   adv    blockquote soundbite present
U14 section layering          10/10  0.5   adv    How it works opens at map→node mechanism, not re-definition
U17 real-world + at-scale      9/10  0.5   adv    OS page cache, Guava, caching.md cross-link; scan pollution noted
U18 cache behavior             9/10  0.5   adv    pointer-chasing per get; array-indexed intrusive list contrast
U20 misconceptions             8/10  0.5   adv    update-is-use, contains-must-not-reorder are belief-corrections in gotchas
DS1 how it works + diagram    10/10   1    gate   sentinel diagram + splice walkthrough
DS2 operations table          10/10   1    gate   get/put/evict/contains with time+space
DS3 complexity summary        10/10   1    gate   best/avg/worst + collision path
DS4 when-to-use prose         10/10   1    gate   temporal locality vs LFU/FIFO/TTL
DS5 variants                   9/10   1    adv    LFU, functools, OrderedDict, TTL, LRU-K/ARC
DS6 implementation            10/10   1    gate   scratch + OrderedDict versions
DS7 gotchas / edge cases      10/10   1    gate   node-stores-key, capacity-0, thread-safety at-scale trap
DS8 comparison table           9/10   1    gate   rivals + crossover (FIFO evicts by age not use)
DS9 interviewer probes         3/10   1    adv    section missing
CP cp-primitives               8/10   1    adv    Hash-based → advisory; 2 primitives (intrusive array, map→node)
FB hashing & collisions        8/10   2    gate   composite article uses Memory layout not Hashing heading; covers layout+resize引用 but NOT load-factor/chaining/open-addressing depth required of hash-based FB - BLOCKER
DS9a amortized proof           5/10   2    cond   Hash-based → gated; asserts hash resize "amortized tax" without accounting/potential-function derivation - BLOCKER
AL10 constraints & approach    n/a    -     -     DS article
PA1 recognition signals        n/a    -     -     not a pattern article
V1 complexity re-derivation     10/10   2    gate   get = map O(1) + 2 splices O(1) → O((1); matches ops table
V2 pseudocode correctness       10/10   2    gate   traced PUT full-capacity: evict tail.prev, del map[lru.key] — correct
V6 invariant inductive proof     n/a    -     -     n/a — no loop invariant section; composite DS
V9 recursion stack honesty       n/a    -     -     n/a — iterative only
V3 worked example fidelity       9/10  0.5   adv    diagram splice matches get(A) prose
V4 comparison table accuracy    10/10  0.5   adv    FIFO O(1), BST O(log n) — correct
V5 edge case coverage           10/10  0.5   adv    capacity-0, update-reorders, eviction key leak
V7 diagram-text agreement       10/10  0.5   adv    HEAD⇄C⇄A⇄B⇄TAIL matches text
V8 terminology precision        10/10  0.5   adv    "contains does not count as use" precise
V10 duplicate-problems relevance n/a    -     -     n/a — no duplicate-problems lines exist
V11 prerequisite necessity        9/10  0.5   adv    hash-table + DLL Must-read justified
V12 cross-article consistency     -     -     -     DLL O(1) unlink consistent with linked-list.md; no contradiction
V13 probe answer correctness      n/a    -     -     n/a — DS9 absent
V14 general factual accuracy     10/10  0.5   adv    scan-resistant policies described correctly
--------------------------------------------------------------------------------

GATE: NO-SHIP — 3 gated params below 9 (U6, FB, DS9a).

BLOCKERS (gated, score ≤8):
- U6: add Duplicate problems line to ≥1 worked problem (e.g. LRU Cache LC 146 duplicates on Design LinkedHashMap variants)
- FB: add Hashing & collisions depth OR retitle/reframe family block — load factor threshold, chaining vs open-addressing, rehash amortized accounting (composite still hash-gated)
- DS9a: show potential-function or aggregate accounting for map resize during fill-to-capacity

### `queue.md` — 94/100 — SHIP [section: DS, family: Linear]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         10/10   1    gate   checkout-line FIFO analogy + BFS link
U2 complexity stated          10/10   1    gate   pop(0) trap explicit; BFS frontier space noted
U3 when to use / when not     10/10   1    gate   stack/heap/deque/array alternatives
U4 Python present/idiomatic   10/10   1    gate   CircularQueue + deque velocity
U5 pseudocode present/≠py     10/10   2    gate   ENQUEUE/DEQUEUE with mod wrap; CLRS form
U6 practice problems          10/10   1    gate   5 distinct techniques; duplicate-problems on 4/5
U7 format spine               10/10   1    gate   correct spine
U8 title ↔ filename           10/10  0.5   gate   script PASS
U9 prerequisites format        9/10  0.5   adv    Big-O HTML-comment pending; array Must-read correct
U10 TOC                       10/10  0.5   adv    complete
U11 filename convention       10/10  0.5   gate   script PASS
U12 links resolve             10/10   1    gate   script PASS
U13 soundbite                 10/10  0.5   adv    blockquote takeaway
U14 section layering          10/10  0.5   adv    How it works opens at two-ended access trap, not re-definition
U17 real-world + at-scale      9/10  0.5   adv    Kafka/message-queues, OS run queues; BFS O(width) frontier
U18 cache behavior            10/10  0.5   adv    ring contiguous vs linked pointer-chasing contrast
U20 misconceptions             7/10  0.5   adv    gotchas dominate; no explicit misconception bullets
DS1 how it works + diagram    10/10   1    gate   FIFO ASCII + naive-array trap
DS2 operations table          10/10   1    gate   all ops time+space; pop(0) warning
DS3 complexity summary        10/10   1    gate   best/avg/worst incl resize row
DS4 when-to-use prose         10/10   1    gate   fairness/BFS vs heap/stack
DS5 variants                   9/10   1    adv    ring, linked, deque, priority, monotonic deque
DS6 implementation            10/10   1    gate   ring buffer Python + deque shortcut
DS7 gotchas / edge cases      10/10   1    gate   pop(0), empty/full ambiguity, BFS visited-on-enqueue
DS8 comparison table           9/10   1    gate   crossover per row (deque both-ends, heap when urgent)
DS9 interviewer probes         3/10   1    adv    section missing
CP cp-primitives              10/10   1    gate   Linear → gated; deque, monotonic deque, 0/1-BFS (≥2 + why)
FB memory layout              10/10   2    gate   naive O(n) dequeue, ring mod arithmetic, linked overhead
DS9a amortized proof           n/a    -     cond   n/a — ring resize defers to dynamic-array article; queue ops themselves not amortized
AL10 constraints & approach    n/a    -     -     DS article
PA1 recognition signals        n/a    -     -     not a pattern article
V1 complexity re-derivation     10/10   2    gate   ring: enqueue 1 write + mod → O(1); dequeue 1 read + front advance → O(1)
V2 pseudocode correctness     10/10   2    gate   traced DEQUEUE on front=2,size=3,cap=6: returns data[2], front→3
V6 invariant inductive proof     n/a    -     -     n/a — no invariant proof section
V9 recursion stack honesty       n/a    -     -     n/a — iterative BFS only; space O(frontier) stated
V3 worked example fidelity      10/10  0.5   adv    enqueue/dequeue ASCII matches
V4 comparison table accuracy    10/10  0.5   adv    heap O(log n), deque O(1) both ends — correct
V5 edge case coverage           10/10  0.5   adv    family-fit: FIFO/BFS/monotonic-deque traps
V7 diagram-text agreement       10/10  0.5   adv    ring indices 3,7,2 consistent
V8 terminology precision        10/10  0.5   adv    priority queue ≠ queue called out
V10 duplicate-problems relevance 9/10  0.5   adv    LC 225/862/542 genuinely same mechanics
V11 prerequisite necessity       9/10  0.5   adv    stack Should-read reasonable for two-stack queue
V12 cross-article consistency    -     -     -     checked vs stack.md pattern: deque vs list consistent
V13 probe answer correctness      n/a    -     -     n/a — DS9 absent
V14 general factual accuracy     10/10  0.5   adv    0/1-BFS appendleft logic correct
--------------------------------------------------------------------------------

GATE: SHIP — all gated params ≥9.

BLOCKERS (gated, score ≤8): none

### `red-black-tree.md` — 72/100 — NO-SHIP [section: DS, family: Tree/heap]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         10/10   1    gate   pragmatic balanced BST framing + library default
U2 complexity stated           9/10   1    gate   O(log n) + rotation bounds; space includes stack
U3 when to use / when not     10/10   1    gate   AVL/B-tree/hash alternatives
U4 Python present/idiomatic    9/10   1    gate   insert+fixup solid; delete not fully implemented (stated)
U5 pseudocode present/≠py     10/10   2    gate   RB-INSERT-FIXUP CLRS with cases; not Python
U6 practice problems           8/10   1    gate   4 entries; duplicate-problems on 2/4; problem 1 reasoning-only acceptable
U7 format spine                6/10   1    gate   uses Algorithm spine (Intuition, Correctness, Complexity derivation) not DS spine — BLOCKER
U8 title ↔ filename           10/10  0.5   gate   script PASS
U9 prerequisites format       10/10  0.5   adv    balanced BST/BST Must-read, AVL Should-read — correct tiers
U10 TOC                        7/10  0.5   adv    reflects AL-style headings; missing DS sections
U11 filename convention       10/10  0.5   gate   script PASS
U12 links resolve             10/10   1    gate   script PASS
U13 soundbite                 10/10  0.5   adv    takeaway blockquote
U14 section layering           9/10  0.5   adv    Intuition (B-tree encoding) layers under What it is
U17 real-world + at-scale      9/10  0.5   adv    std::map, Linux CFS, kernel VMA
U18 cache behavior             8/10  0.5   adv    pointer-chasing implied via BST; not explicit one-liner in Traversal
U20 misconceptions             7/10  0.5   adv    edge cases mix bugs and concepts
DS1 how it works + diagram    10/10   1    gate   color rules + insert/delete case ASCII
DS2 operations table           2/10   1    gate   ## Operations section absent — BLOCKER
DS3 complexity summary         2/10   1    gate   ## Complexity summary absent (has AL Complexity derivation) — BLOCKER
DS4 when-to-use prose          9/10   1    gate   present under When to use
DS5 variants                   2/10   1    adv    ## Variants section missing
DS6 implementation             9/10   1    gate   insert path complete; delete deferred (acceptable note)
DS7 gotchas / edge cases         7/10   1    gate   ## Edge cases present not Gotchas; at-scale pointer-chasing trap thin — BLOCKER
DS8 comparison table           10/10   1    gate   AVL/BST/B-tree rows with crossover
DS9 interviewer probes          10/10   1    adv    5 Q+A sketches incl scale/design
CP cp-primitives               n/a    -     -     n/a — Tree/heap advisory; section absent (acceptable n/a)
FB traversal & invariant      10/10   2    gate   color rules, black-height, B-tree encoding at depth
DS9a amortized proof           n/a    -     cond   n/a — RB-tree ops are worst-case O(log n), not amortized
AL10 constraints & approach    n/a    -     -     DS article
PA1 recognition signals        n/a    -     -     not a pattern article
V1 complexity re-derivation     10/10   2    gate   h≤2log(n+1): b≥h/2, n≥2^b−1 → h≤2log(n+1); matches claim
V2 pseudocode correctness      9/10   2    gate   traced Case 1 recolor on red uncle: colors flip, z climbs — correct
V6 invariant inductive proof    9/10   2    gate   rules 4+5 → longest≤2×shortest; fixup terminates climbing O(log n) levels
V9 recursion stack honesty       9/10   2    gate   search/insert O(log n) stack stated in complexity table
V3 worked example fidelity       8/10  0.5   adv    insert case diagrams match prose
V4 comparison table accuracy    10/10  0.5   adv    AVL 1.44 log n height — correct
V5 edge case coverage            8/10  0.5   adv    double-black, nil sentinel; missing concurrency at-scale
V7 diagram-text agreement       10/10  0.5   adv    Case 1/3 node colors match
V8 terminology precision        10/10  0.5   adv    "self-balancing" vs plain BST precise
V10 duplicate-problems relevance  9/10  0.5   adv    LC 110/315 genuinely related
V11 prerequisite necessity       10/10  0.5   adv    BST + balanced BST genuine dependencies
V12 cross-article consistency     -     -     -     AVL height bounds consistent with avl-tree.md claims
V13 probe answer correctness     10/10  0.5   adv    library-default rationale factually sound
V14 general factual accuracy     10/10  0.5   adv    B-tree encoding claim correct
--------------------------------------------------------------------------------

GATE: NO-SHIP — 5 gated params below 9 (U7, DS2, DS3, DS7, plus structural spine).

BLOCKERS (gated, score ≤8):
- U7/DS spine: restructure to DS headings list (Operations, Complexity summary, Variants, Gotchas, CP-primitives advisory)
- DS2: add ## Operations table (search/insert/delete min/rotations)
- DS3: add ## Complexity summary best/avg/worst (migrate content from Complexity derivation)
- DS7: rename/reframe Edge cases → Gotchas; add explicit at-scale pointer-chasing trap

### `segment-tree.md` — 8/100 — NO-SHIP [section: DS, family: Tree/heap (intended)]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model          0/10   1    gate   HTML comment placeholder only — BLOCKER
U2 complexity stated           0/10   1    gate   absent — BLOCKER
U3 when to use / when not      0/10   1    gate   absent — BLOCKER
U4 Python present/idiomatic    0/10   1    gate   absent — BLOCKER
U5 pseudocode present/≠py      0/10   2    gate   absent — BLOCKER
U6 practice problems           0/10   1    gate   absent — BLOCKER
U7 format spine                4/10   1    gate   title/prereqs/TOC exist but body is template comments — BLOCKER
U8 title ↔ filename           10/10  0.5   gate   script PASS
U9 prerequisites format        2/10  0.5   adv    empty comment stub
U10 TOC                        2/10  0.5   adv    empty comment stub
U11 filename convention       10/10  0.5   gate   script PASS
U12 links resolve             10/10   1    gate   script PASS (no live body links)
U13 soundbite                  0/10  0.5   adv    absent
U14 section layering           0/10  0.5   adv    no body sections
U17 real-world + at-scale      0/10  0.5   adv    absent
U18 cache behavior             0/10  0.5   adv    absent
U20 misconceptions             0/10  0.5   adv    absent
DS1 how it works + diagram     0/10   1    gate   placeholder comment — BLOCKER
DS2 operations table           0/10   1    gate   empty table shell — BLOCKER
DS3 complexity summary         0/10   1    gate   absent — BLOCKER
DS4 when-to-use prose          0/10   1    gate   absent — BLOCKER
DS5 variants                   0/10   1    adv    absent
DS6 implementation             0/10   1    gate   absent — BLOCKER
DS7 gotchas / edge cases       0/10   1    gate   absent — BLOCKER
DS8 comparison table           0/10   1    gate   absent — BLOCKER
DS9 interviewer probes         0/10   1    adv    absent
CP cp-primitives               0/10   1    adv    Tree/heap → advisory; absent
FB traversal & invariant       0/10   2    gate   family heading is literal "<Family heading>" comment — BLOCKER
DS9a amortized proof           n/a    -     cond   n/a — unfilled article
AL10 constraints & approach    n/a    -     -     DS article
PA1 recognition signals        n/a    -     -     not a pattern article
V1 complexity re-derivation      0/10   2    gate   nothing to verify — BLOCKER
V2 pseudocode correctness        0/10   2    gate   nothing to trace — BLOCKER
V6 invariant inductive proof     0/10   2    gate   nothing to prove — BLOCKER
V9 recursion stack honesty       n/a    -     -     n/a — no algorithms stated
V3 worked example fidelity       0/10  0.5   adv    unfilled
V4 comparison table accuracy     0/10  0.5   adv    unfilled
V5 edge case coverage            0/10  0.5   adv    unfilled
V7 diagram-text agreement        0/10  0.5   adv    unfilled
V8 terminology precision         0/10  0.5   adv    unfilled
V10 duplicate-problems relevance  0/10  0.5   adv    unfilled
V11 prerequisite necessity       0/10  0.5   adv    unfilled
V12 cross-article consistency    -     -     -     not checked — skeleton only
V13 probe answer correctness     0/10  0.5   adv    unfilled
V14 general factual accuracy     0/10  0.5   adv    unfilled
--------------------------------------------------------------------------------

GATE: NO-SHIP — unfilled skeleton template; all structural gated params at 0–4.

BLOCKERS (gated, score ≤8): all applicable gated params

### `skip-list.md` — 88/100 — NO-SHIP [section: DS, family: Tree/heap]

PARAM                         SCORE   W    GATE   NOTE
--------------------------------------------------------------------------------
U1 def + mental model         10/10   1    gate   express-train analogy + randomized towers
U2 complexity stated          10/10   1    gate   expected vs worst case explicit; space O(n) not O(n log n)
U3 when to use / when not     10/10   1    gate   RB/AVL/array rivals with concurrency angle
U4 Python present/idiomatic   10/10   1    gate   full SkipList class with delete shrink-level
U5 pseudocode present/≠py     10/10   2    gate   SKIP-LIST-SEARCH/INSERT CLRS; RANDOM-LEVEL noted
U6 practice problems           9/10   1    gate   3 distinct techniques; duplicate-problems on all 3
U7 format spine               10/10   1    gate   correct DS spine
U8 title ↔ filename           10/10  0.5   gate   script PASS
U9 prerequisites format        9/10  0.5   adv    Big-O HTML-comment pending; linked-list Must-read correct
U10 TOC                       10/10  0.5   adv    complete
U11 filename convention       10/10  0.5   gate   script PASS
U12 links resolve             10/10   1    gate   script PASS
U13 soundbite                 10/10  0.5   adv    interview soundbite blockquote
U14 section layering          10/10  0.5   adv    How it works opens at tower mechanics
U17 real-world + at-scale      9/10  0.5   adv    Redis ZSET, LevelDB memtable; p-tuning at billions
U18 cache behavior            10/10  0.5   adv    pointer-chasing + tower overhead explicit
U20 misconceptions            10/10  0.5   adv    two explicit misconception bullets (guarantee vs expect; space O(n log n))
DS1 how it works + diagram    10/10   1    gate   mermaid 3-level trace for search(7)
DS2 operations table           7/10   1    gate   has avg/worst/notes but no per-op Space column — BLOCKER
DS3 complexity summary        10/10   1    gate   expected/worst time + O(n) space argument
DS4 when-to-use prose         10/10   1    gate   concurrency + no-hard-guarantee reasoning
DS5 variants                  10/10   1    adv    indexable/span, deterministic, lock-free
DS6 implementation            10/10   1    gate   search/insert/delete complete
DS7 gotchas / edge cases      10/10   1    gate   worst-case real, MAX_LEVEL tuning, FP key trap, at-scale memory
DS8 comparison table           10/10   1    gate   crossover: beats sorted array when inserts frequent; RB when single-threaded guarantee needed
DS9 interviewer probes        10/10   1    adv    3 probes with correct answers (RB choice, worst case, rank)
CP cp-primitives               8/10   1    adv    Tree/heap → advisory; span + mergeable sets (light on diagrams)
FB traversal & invariant      10/10   2    gate   search invariant + geometric layer-count E[levels]=O(log n)
DS9a amortized proof           n/a    -     cond   n/a — probabilistic expectation, not amortized aggregate
AL10 constraints & approach    n/a    -     -     DS article
PA1 recognition signals        n/a    -     -     not a pattern article
V1 complexity re-derivation     10/10   2    gate   E[nodes at level k]=n·p^k; levels=log_{1/p}n; O(log n) expected — matches
V2 pseudocode correctness      10/10   2    gate   traced SEARCH(7) on diagram: 3→6→7 in 4 hops — matches mermaid
V6 invariant inductive proof     8/10   2    gate   search invariant stated; layer-count is expectation not full induction on invariant — shallow for weight-2 - BLOCKER
V9 recursion stack honesty       n/a    -     -     n/a — iterative search only
V3 worked example fidelity      10/10  0.5   adv    search(7) trace matches diagram
V4 comparison table accuracy    10/10  0.5   adv    AVL/RB worst O(log n) — correct
V5 edge case coverage           10/10  0.5   adv    degenerate tower, MAX_LEVEL, FP equality
V7 diagram-text agreement       10/10  0.5   adv    keys 1,3,6,7,9 at levels match prose
V8 terminology precision        10/10  0.5   adv    expected vs worst-case distinguished throughout
V10 duplicate-problems relevance  9/10  0.5   adv    LC 1206/315/1244 legitimately related
V11 prerequisite necessity        9/10  0.5   adv    linked-list Must-read; balanced BST Should-read reasonable
V12 cross-article consistency     -     -     -     RB worst-case vs skip expected consistent with red-black-tree.md
V13 probe answer correctness     10/10  0.5   adv    concurrency and span answers correct
V14 general factual accuracy     10/10  0.5   adv    Redis ZSET hash+skiplist composition accurate
--------------------------------------------------------------------------------

GATE: NO-SHIP — 2 gated params below 9 (DS2, V6).

BLOCKERS (gated, score ≤8):
- DS2: add Space column per operation (search/insert/delete: O(1) aux expected)
- V6: expand search invariant to explicit base case (empty list) + inductive step ("advance preserves invariant")

### `stack.md` — 87/100 — NO-SHIP [section: DS, family: Linear]

| PARAM | SCORE | W | GATE | NOTE |
|-------|-------|---|------|------|
| U1 def + mental model | 9/10 | 1 | gate | LIFO + plate analogy; soundbite blockquote present |
| U2 complexity stated | 9/10 | 1 | gate | per-op + space; call-stack hidden cost named |
| U3 when to use / when not | 9/10 | 1 | gate | queue/array/heap alternatives with crisp cues |
| U4 Python present + idiomatic | 9/10 | 1 | gate | Generic Stack class + contest `list` velocity block |
| U5 pseudocode ≠ Python | 9/10 | 2 | gate | CLRS STACK-PUSH/POP/EMPTY; distinct from Python |
| U6 practice problems | 8/10 | 1 | adv | 5 full entries, 4 distinct techniques; #4 RPN lacks Duplicate problems line |
| U7 format spine | 10/10 | 1 | gate | Title → Prerequisites → TOC → body; no YAML |
| U8 title ↔ filename | 10/10 | 0.5 | gate | script PASS — H1 Stack → stack.md |
| U9 prerequisites format | 8/10 | 0.5 | adv | Big-O HTML-comment only; array/linked-list tiers correct |
| U10 TOC | 9/10 | 0.5 | adv | reflects headings including CP subsections |
| U11 filename convention | 10/10 | 0.5 | gate | script PASS |
| U12 links resolve | 10/10 | 1 | gate | script PASS — all .md links resolve |
| U13 soundbite | 9/10 | 0.5 | adv | blockquote takeaway under What it is |
| U14 section layering | 9/10 | 0.5 | adv | How it works opens at mechanism (backings), not re-definition |
| U17 real-world + at-scale | 9/10 | 0.5 | adv | call stack, JVM/CPython operand stack; overflow at depth |
| U18 cache behavior | 9/10 | 0.5 | adv | array-backed cache-friendly vs linked-list pointer-chasing in Memory layout |
| U20 misconceptions | 6/10 | 0.5 | adv | gotchas are bugs/traps; no wrong-mental-model bullets |
| DS1 how it works + diagram | 9/10 | 1 | gate | ASCII push/pop/peek trace diagram |
| DS2 operations table | 9/10 | 1 | gate | all ops with time/space; search O(n) noted |
| DS3 complexity summary | 9/10 | 1 | gate | best/avg/worst; array resize worst on push |
| DS4 when-to-use prose | 9/10 | 1 | gate | LIFO vs FIFO/index/priority narrative |
| DS5 variants | 9/10 | 1 | adv | min-stack, two-stack queue, monotonic → CP pointer |
| DS8 comparison table | 9/10 | 1 | gate | 5 rivals + Pick-it-when crossover cues (queue for BFS, heap for top-K) |
| DS6 implementation | 9/10 | 1 | gate | pseudocode + from-scratch Python class |
| CP cp-primitives | 9/10 | 1 | gate | Linear → gated; 3 tools (monotonic, paren, flatten recursion) each with why-for-CP |
| DS7 gotchas / edge cases | 9/10 | 1 | gate | underflow, monotonic strictness, recursion-depth at-scale trap |
| DS9 interviewer probes | 2/10 | 1 | adv | section missing entirely |
| DS9a amortized proof | 7/10 | 2 | cond | Linear → gated; names amortized push but defers doubling accounting to dynamic-array link only — no inline aggregate |
| FB memory layout | 8/10 | 2 | gate | cache + resize spike named; amortized vs worst-case stated but no shown 1+2+…+n or potential accounting on stack push |
| AL10 constraints & approach | n/a | — | — | DS article — AL10 algorithms/patterns only |
| PA1 recognition signals | n/a | — | — | not a pattern article |
| V1 complexity re-derivation | 9/10 | 2 | gate | pop/peek O(1) per op; n pushes with doubling → Σ copies ≤ 2n → amortized O(1) push — matches claim |
| V2 pseudocode/code correctness | 9/10 | 2 | gate | traced STACK-PUSH/POP on empty stack (top=-1): push 3,7,2 then pop→2 matches diagram |
| V3 worked example fidelity | 9/10 | 0.5 | adv | ASCII op sequence consistent with prose |
| V4 comparison table accuracy | 9/10 | 0.5 | adv | rival Big-O checked — queue/deque O(1) ends, heap O(log n) correct |
| V5 edge case coverage | 9/10 | 0.5 | adv | empty stack, leftover opens, monotonic index-vs-value covered |
| V6 invariant inductive proof | n/a | — | — | no loop/recurrence invariant section — fixed LIFO ops, not applicable |
| V7 diagram-text agreement | 9/10 | 0.5 | adv | push/pop diagram values [3,7,2] match walkthrough |
| V8 terminology precision | 9/10 | 0.5 | adv | LIFO vs FIFO vs heap priority distinguished correctly |
| V9 recursion stack honesty | n/a | — | — | core DS iterative; explicit-stack DFS notes heap O(depth) trade |
| V10 duplicate-problems relevance | 9/10 | 0.5 | adv | LC 1047/1249, NGE I, Max Stack, LC 85 duplicates share mechanics |
| V11 prerequisite necessity | 8/10 | 0.5 | adv | array Must-read genuine; linked-list Should-read is enrichment not hard dep |
| V12 cross-article consistency | n/a | — | — | checked queue.md/array.md cues — no contradiction on LIFO vs FIFO split |
| V13 probe answer correctness | n/a | — | — | no DS9 section to verify |
| V14 general factual accuracy | 9/10 | 0.5 | adv | residual sweep clean — stack=recursion framing accurate |

**GATE:** NO-SHIP — 2 gated params below 9 (FB, DS9a).

**BLOCKERS (gated ≤8):**
- **FB:** add inline doubling accounting for array-backed push (aggregate copy cost over n pushes), not only a link to dynamic-array
- **DS9a:** same fix — show potential/accounting on stack's amortized push in Memory layout

### `string.md` — 89/100 — SHIP [section: DS, family: Linear]

| PARAM | SCORE | W | GATE | NOTE |
|-------|-------|---|------|------|
| U1 def + mental model | 9/10 | 1 | gate | immutable char-array + locker analogy |
| U2 complexity stated | 9/10 | 1 | gate | index O(1), += O(n²), join O(n), search bounds |
| U3 when to use / when not | 9/10 | 1 | gate | trie/hash/mutable buffer alternatives named |
| U4 Python present + idiomatic | 9/10 | 1 | gate | build_correct vs build_wrong + stdlib toolkit |
| U5 pseudocode ≠ Python | 9/10 | 2 | gate | BUILD-STRING CLRS with MUTABLE-ARRAY/APPEND/JOIN |
| U6 practice problems | 5/10 | 1 | adv | only 2 worked entries (writer asks ≥3); both have Duplicate problems — floor met but thin |
| U7 format spine | 10/10 | 1 | gate | correct spine |
| U8 title ↔ filename | 10/10 | 0.5 | gate | script PASS |
| U9 prerequisites format | 8/10 | 0.5 | adv | Big-O commented; array Must-read, dynamic-array Should-read |
| U10 TOC | 9/10 | 0.5 | adv | complete |
| U11 filename convention | 10/10 | 0.5 | gate | script PASS |
| U12 links resolve | 10/10 | 1 | gate | script PASS |
| U13 soundbite | 9/10 | 0.5 | adv | blockquote under What it is |
| U14 section layering | 9/10 | 0.5 | adv | How it works opens at encoding/immutability mechanism |
| U17 real-world + at-scale | 9/10 | 0.5 | adv | grep, compilers, full-text search; O(n²) build churn at scale |
| U18 cache behavior | 9/10 | 0.5 | adv | contiguous = cache-friendly in Memory layout |
| U20 misconceptions | 7/10 | 0.5 | adv | `is` vs `==` in gotchas; no dedicated misconception bullets |
| DS1 how it works + diagram | 9/10 | 1 | gate | index diagram + += copy chain |
| DS2 operations table | 9/10 | 1 | gate | slice/concat/build rows with space |
| DS3 complexity summary | 9/10 | 1 | gate | best/avg/worst including += trap |
| DS4 when-to-use prose | 9/10 | 1 | gate | trie vs hash vs list-and-join reasoning |
| DS5 variants | 9/10 | 1 | adv | rope, suffix structures, interned strings |
| DS8 comparison table | 9/10 | 1 | gate | 5 rows; crossover in Pick-it-when (trie for prefix, hash for whole-key) |
| DS6 implementation | 8/10 | 1 | gate | primitive string — shows build pattern not full DS (acceptable framing) |
| CP cp-primitives | 9/10 | 1 | gate | Linear gated; count array, Rabin–Karp, sliding window — all with why-for-CP |
| DS7 gotchas / edge cases | 9/10 | 1 | gate | += O(n²), Unicode, encoding, bounds — includes build-at-scale trap |
| DS9 interviewer probes | 2/10 | 1 | adv | section missing |
| DS9a amortized proof | n/a | 2 | cond | immutable string has no amortized structure ops; += trap is worst-case quadratic not amortized — justified |
| FB memory layout | 9/10 | 2 | gate | encoding width, immutability copy chain, 1+2+…+n += accounting, join→dynamic-array amortization |
| AL10 constraints & approach | n/a | — | — | DS article — AL10 algorithms/patterns only |
| PA1 recognition signals | n/a | — | — | not a pattern article |
| V1 complexity re-derivation | 9/10 | 2 | gate | loop += copies 1+2+…+n = n(n+1)/2 → O(n²); list append amortized + join O(n) — matches |
| V2 pseudocode/code correctness | 9/10 | 2 | gate | BUILD-STRING traced on parts ["a","b","c"] → append thrice, join once — correct |
| V3 worked example fidelity | 9/10 | 0.5 | adv | anagram + Rabin–Karp examples match code paths |
| V4 comparison table accuracy | 9/10 | 0.5 | adv | trie O(L), hash O(L) hash independent of n — correct |
| V5 edge case coverage | 9/10 | 0.5 | adv | +=, slicing alloc, Unicode, bounds |
| V6 invariant inductive proof | n/a | — | — | no loop invariant section |
| V7 diagram-text agreement | 9/10 | 0.5 | adv | "hello" index diagram matches |
| V8 terminology precision | 9/10 | 0.5 | adv | code point vs glyph called out |
| V9 recursion stack honesty | n/a | — | — | no recursive algorithms in core |
| V10 duplicate-problems relevance | 9/10 | 0.5 | adv | LC 383, LC 187 share count/hash mechanics |
| V11 prerequisite necessity | 9/10 | 0.5 | adv | array dependency real for layout |
| V12 cross-article consistency | n/a | — | — | trie.md string cross-links align on prefix vs whole-key |
| V13 probe answer correctness | n/a | — | — | no DS9 section |
| V14 general factual accuracy | 9/10 | 0.5 | adv | factual sweep clean |

**GATE:** SHIP — all gated params ≥9.

**BLOCKERS:** none.

### `suffix-tree.md` — 95/100 — SHIP [section: DS, family: Tree/heap]

| PARAM | SCORE | W | GATE | NOTE |
|-------|-------|---|------|------|
| U1 def + mental model | 10/10 | 1 | gate | compressed trie of all suffixes + vacuum-seal analogy; senior memory trade |
| U2 complexity stated | 9/10 | 1 | gate | build/search/space; naive vs Ukkonen distinguished |
| U3 when to use / when not | 10/10 | 1 | gate | suffix array crossover with genome-scale failure named |
| U4 Python present + idiomatic | 9/10 | 1 | gate | naive builder + SA/LCP/search — typed, readable |
| U5 pseudocode ≠ Python | 9/10 | 2 | gate | EXTEND-SUFFIX-TREE CLRS conceptual; distinct from Python |
| U6 practice problems | 9/10 | 1 | adv | 3 full entries + array alternatives; all have Duplicate problems |
| U7 format spine | 10/10 | 1 | gate | correct spine |
| U8 title ↔ filename | 10/10 | 0.5 | gate | script PASS |
| U9 prerequisites format | 9/10 | 0.5 | adv | trie/array Must-read; binary-search/string Should-read — tiers sensible |
| U10 TOC | 9/10 | 0.5 | adv | includes SA variant + probes |
| U11 filename convention | 10/10 | 0.5 | gate | script PASS |
| U12 links resolve | 10/10 | 1 | gate | script PASS |
| U13 soundbite | 10/10 | 0.5 | adv | O(m) search vs 30–40 B/node cost in takeaway |
| U14 section layering | 9/10 | 0.5 | adv | How it works = compression mechanism, not re-definition |
| U17 real-world + at-scale | 10/10 | 0.5 | adv | bioinformatics; human genome 60–120 GB tree infeasible → FM-index |
| U18 cache behavior | 9/10 | 0.5 | adv | pointer-chasing tree vs contiguous SA in "when array beats tree" |
| U20 misconceptions | 8/10 | 0.5 | adv | SA-vs-tree trade implicit; no explicit misconception bullets |
| DS1 how it works + diagram | 9/10 | 1 | gate | banana$ diagram, ops table, complexity, when-not prose — all strong |
| DS2 operations table | 9/10 | 1 | gate | build/search/count/LRS/LCS rows with notes |
| DS3 complexity summary | 9/10 | 1 | gate | naive vs Ukkonen; space per node |
| DS4 when-to-use prose | 9/10 | 1 | gate | SA dominates production — honest |
| DS5 variants | 9/10 | 1 | adv | generalized, Ukkonen, SA+LCP offline, succinct |
| DS8 comparison table | 10/10 | 1 | gate | 5 rivals with memory crossover + query-volume threshold in prose |
| DS6 implementation | 9/10 | 1 | gate | naive O(n²) builder acknowledged; O(m) search shown |
| CP cp-primitives | 9/10 | 1 | adv | Tree/heap → advisory; 4 techniques with why-for-CP |
| DS7 gotchas / edge cases | 9/10 | 1 | gate | sentinel, edge-label storage O(n²), at-scale pointer-chasing, LCP indexing |
| DS9 interviewer probes | 9/10 | 1 | adv | 3 probes: SA vs tree, Ukkonen amortized, k-string LCS |
| DS9a amortized proof | 9/10 | 2 | adv | Tree/heap → advisory; suffix-link active-point O(n) total-move accounting shown |
| FB traversal & invariant | 10/10 | 2 | gate | compression invariant, suffix links, amortized construction argument |
| AL10 constraints & approach | n/a | — | — | DS article |
| PA1 recognition signals | n/a | — | — | not a pattern article |
| V1 complexity re-derivation | 9/10 | 2 | gate | pattern walk consumes ≤|P| chars/edge → O(m); uncompressed trie O(n²) edges reasoned — matches |
| V2 pseudocode/code correctness | 9/10 | 2 | gate | search("ana") on naive tree for "banana" → True; smoke test consistent |
| V3 worked example fidelity | 9/10 | 0.5 | adv | LRS "ana" via max(LCP) and deepest-node tree paths agree |
| V4 comparison table accuracy | 9/10 | 0.5 | adv | SA O(m log n), KMP O(n+m), trie O(m) — independent check OK |
| V5 edge case coverage | 9/10 | 0.5 | adv | sentinel, edge storage, recursion depth, LCP off-by-one |
| V6 invariant inductive proof | 9/10 | 2 | gate | compression invariant (≥2 children) + suffix-link amortized bound with total O(n) pointer movement sketched |
| V7 diagram-text agreement | 8/10 | 0.5 | adv | banana$ tree ASCII is illustrative not full; acceptable for teaching |
| V8 terminology precision | 9/10 | 0.5 | adv | suffix tree vs trie vs SA distinguished |
| V9 recursion stack honesty | 9/10 | 2 | gate | DFS build warns O(n) recursion depth; iterative alternative noted in gotchas |
| V10 duplicate-problems relevance | 9/10 | 0.5 | adv | LC 1044, DISUBSTR, k=2 LCS variants share mechanics |
| V11 prerequisite necessity | 9/10 | 0.5 | adv | trie dependency real |
| V12 cross-article consistency | n/a | — | — | trie.md suffix-tree pointer aligns |
| V13 probe answer correctness | 9/10 | 0.5 | adv | SA memory 4–8 B/char vs 30–40 B/node — factually sound |
| V14 general factual accuracy | 9/10 | 0.5 | adv | clean |

**GATE:** SHIP — all gated params ≥9.

**BLOCKERS:** none.

### `treap.md` — 94/100 — SHIP [section: DS, family: Tree/heap]

| PARAM | SCORE | W | GATE | NOTE |
|-------|-------|---|------|------|
| U1 def + mental model | 9/10 | 1 | gate | BST+heap lottery ticket analogy |
| U2 complexity stated | 9/10 | 1 | gate | expected vs worst; call-stack space explicit |
| U3 when to use / when not | 9/10 | 1 | gate | vs AVL/RB/stdlib map; adversarial RNG case |
| U4 Python present + idiomatic | 9/10 | 1 | gate | typed TreapNode, random.random(), implicit treap |
| U5 pseudocode ≠ Python | 9/10 | 2 | gate | Treap-Insert + Rotate CLRS; ≠ Python |
| U6 practice problems | 9/10 | 1 | adv | 3 entries, distinct techniques, all Duplicate problems |
| U7 format spine | 10/10 | 1 | gate | correct spine |
| U8 title ↔ filename | 10/10 | 0.5 | gate | script PASS |
| U9 prerequisites format | 9/10 | 0.5 | adv | BST/heap Must-read; balanced-BST Should-read |
| U10 TOC | 9/10 | 0.5 | adv | complete |
| U11 filename convention | 10/10 | 0.5 | gate | script PASS |
| U12 links resolve | 10/10 | 1 | gate | script PASS |
| U13 soundbite | 9/10 | 0.5 | adv | blockquote takeaway |
| U14 section layering | 9/10 | 0.5 | adv | How it works = insert trace, not re-definition |
| U17 real-world + at-scale | 9/10 | 0.5 | adv | implicit treap/CRDTs; pointer-chasing at n>10⁷ |
| U18 cache behavior | 9/10 | 0.5 | adv | pointer-chasing at scale in When to use |
| U20 misconceptions | 8/10 | 0.5 | adv | split/merge misconception bullet in gotchas |
| DS1 how it works + diagram | 9/10 | 1 | gate | insert-with-priorities ASCII trace |
| DS2 operations table | 9/10 | 1 | gate | search/insert/delete/split/merge with expected/worst |
| DS3 complexity summary | 9/10 | 1 | gate | height + stack space called out |
| DS4 when-to-use prose | 9/10 | 1 | gate | split/merge vs deterministic BSTs |
| DS5 variants | 9/10 | 1 | adv | implicit, persistent, duplicate keys |
| DS8 comparison table | 9/10 | 1 | gate | AVL/RB/treap/skip-list + adversarial crossover |
| DS6 implementation | 9/10 | 1 | gate | insert/delete pseudocode + Python |
| CP cp-primitives | 9/10 | 1 | adv | split/merge + implicit treap — why-for-CP present |
| DS7 gotchas / edge cases | 9/10 | 1 | gate | priority collision, RNG attack, recursion depth |
| DS9 interviewer probes | 9/10 | 1 | adv | vs RB, RNG failure, implicit treap range reverse |
| DS9a amortized proof | n/a | 2 | adv | no amortized ops — article explicitly distinguishes expected vs amortized |
| FB traversal & invariant | 9/10 | 2 | gate | dual BST+heap invariant; rotation restore; expected height via random BST |
| AL10 constraints & approach | n/a | — | — | DS article |
| PA1 recognition signals | n/a | — | — | not a pattern article |
| V1 complexity re-derivation | 9/10 | 2 | gate | expected height O(log n) from random priority ↔ random BST — matches |
| V2 pseudocode/code correctness | 9/10 | 2 | gate | insert (3,p=80) rotates above (5,p=50) per diagram — correct |
| V3 worked example fidelity | 9/10 | 0.5 | adv | implicit treap reverse examples match code |
| V4 comparison table accuracy | 9/10 | 0.5 | adv | AVL/RB O(log n) worst, treap expected — correct |
| V5 edge case coverage | 9/10 | 0.5 | adv | priority collision, RNG, recursion depth |
| V6 invariant inductive proof | 9/10 | 2 | gate | dual invariant stated; rotation restores heap on insert path — base (leaf) + inductive rotate-up step |
| V7 diagram-text agreement | 9/10 | 0.5 | adv | insert trace priorities match prose |
| V8 terminology precision | 9/10 | 0.5 | adv | expected vs worst vs amortized distinguished |
| V9 recursion stack honesty | 9/10 | 2 | gate | Complexity summary: O(log n) call-stack; iterative noted |
| V10 duplicate-problems relevance | 9/10 | 0.5 | adv | LC 315, rope — share augmented-BST / split-merge mechanics |
| V11 prerequisite necessity | 9/10 | 0.5 | adv | BST+heap deps real |
| V12 cross-article consistency | n/a | — | — | balanced-bst.md rotation cues align |
| V13 probe answer correctness | 9/10 | 0.5 | adv | RB vs treap, implicit treap answers sound |
| V14 general factual accuracy | 9/10 | 0.5 | adv | clean |

**GATE:** SHIP — all gated params ≥9.

**BLOCKERS:** none.

### `trie.md` — 86/100 — NO-SHIP [section: DS, family: Tree/heap]

| PARAM | SCORE | W | GATE | NOTE |
|-------|-------|---|------|------|
| U1 def + mental model | 9/10 | 1 | gate | prefix tree + phone-menu analogy |
| U2 complexity stated | 9/10 | 1 | gate | O(L) ops; space trade explicit |
| U3 when to use / when not | 9/10 | 1 | gate | hash vs trie prefix rule of thumb |
| U4 Python present + idiomatic | 9/10 | 1 | gate | dataclass TrieNode, dict children |
| U5 pseudocode ≠ Python | 9/10 | 2 | gate | TRIE-INSERT/SEARCH/STARTS-WITH/WALK CLRS |
| U6 practice problems | 8/10 | 1 | adv | 5 entries, 3 dup lists (#2,#3 missing); distinct techniques |
| U7 format spine | 10/10 | 1 | gate | correct spine |
| U8 title ↔ filename | 10/10 | 0.5 | gate | script PASS |
| U9 prerequisites format | 8/10 | 0.5 | adv | Big-O commented |
| U10 TOC | 9/10 | 0.5 | adv | complete |
| U11 filename convention | 10/10 | 0.5 | gate | script PASS |
| U12 links resolve | 10/10 | 1 | gate | script PASS |
| U13 soundbite | 9/10 | 0.5 | adv | blockquote |
| U14 section layering | 9/10 | 0.5 | adv | mechanism-first How it works |
| U17 real-world + at-scale | 9/10 | 0.5 | adv | autocomplete, IP routing, T9 |
| U18 cache behavior | 8/10 | 0.5 | adv | pointer-chasing implied via memory blowup; no explicit cache-friendly/hostile sentence |
| U20 misconceptions | 6/10 | 0.5 | adv | is_end confusion in gotchas not framed as misconceptions |
| DS1 how it works + diagram | 9/10 | 1 | gate | cat/car/card/dog ASCII tree |
| DS2 operations table | 9/10 | 1 | gate | prefix query row present |
| DS3 complexity summary | 9/10 | 1 | gate | space catch documented |
| DS4 when-to-use prose | 9/10 | 1 | gate | "trie = I need prefixes" |
| DS5 variants | 9/10 | 1 | adv | radix, ternary, bitwise, suffix |
| DS8 comparison table | 6/10 | 1 | gate | 4 rivals but Pick-it-when lacks concrete crossover thresholds (no n/L/density numbers) — cap per rater |
| DS6 implementation | 9/10 | 1 | gate | full Trie class |
| CP cp-primitives | 9/10 | 1 | adv | prefix-count + bitwise XOR — why-for-CP |
| DS7 gotchas / edge cases | 8/10 | 1 | gate | is_end, memory blowup; at-scale trap thin (alphabet overhead named but no n>10⁷ framing) |
| DS9 interviewer probes | 2/10 | 1 | adv | section missing |
| DS9a amortized proof | n/a | 2 | adv | trie ops are worst-case O(L), no amortized structure |
| FB traversal & invariant | 9/10 | 2 | gate | structural invariant + pre-order sorted traversal |
| AL10 constraints & approach | n/a | — | — | DS article |
| PA1 recognition signals | n/a | — | — | not a pattern article |
| V1 complexity re-derivation | 9/10 | 2 | gate | walk L edges → O(L) independent of n — matches |
| V2 pseudocode/code correctness | 9/10 | 2 | gate | insert cat/car/card; search("app") false, startsWith true — matches Implementation |
| V3 worked example fidelity | 9/10 | 0.5 | adv | Word Search II / max XOR examples consistent |
| V4 comparison table accuracy | 9/10 | 0.5 | adv | hash O(L) hash, trie O(L) walk — correct |
| V5 edge case coverage | 9/10 | 0.5 | adv | is_end, empty string, Unicode alphabet |
| V6 invariant inductive proof | n/a | — | — | structural invariant, not loop-induction shape |
| V7 diagram-text agreement | 9/10 | 0.5 | adv | cat/car/card/dog paths match prose |
| V8 terminology precision | 9/10 | 0.5 | adv | prefix vs word distinguished via is_end |
| V9 recursion stack honesty | 9/10 | 2 | gate | Word Search II DFS — depth bounded by word length; grid DFS stack O(L) |
| V10 duplicate-problems relevance | 9/10 | 0.5 | adv | LC 677, 720, 1707 share trie mechanics |
| V11 prerequisite necessity | 9/10 | 0.5 | adv | string Must-read real |
| V12 cross-article consistency | n/a | — | — | string.md trie pointer aligns |
| V13 probe answer correctness | n/a | — | — | no DS9 section |
| V14 general factual accuracy | 9/10 | 0.5 | adv | clean |

**GATE:** NO-SHIP — 1 gated param below 9 (DS8).

**BLOCKERS (gated ≤8):**
- **DS8:** add crossover conditions per rival row (e.g. hash wins when only whole-key lookup and L·n small; compressed trie when memory-bound; BST when need ordered range over keys not prefixes)

### `union-find.md` — 82/100 — NO-SHIP [section: DS, family: Graph]

| PARAM | SCORE | W | GATE | NOTE |
|-------|-------|---|------|------|
| U1 def + mental model | 9/10 | 1 | gate | chip-bags analogy + takeaway |
| U2 complexity stated | 9/10 | 1 | gate | α(n) in opener + ops table |
| U3 when to use / when not | 9/10 | 1 | gate | Kruskal, cycles, no-undo limit |
| U4 Python present + idiomatic | 9/10 | 1 | gate | DSU class + iterative find |
| U5 pseudocode ≠ Python | 9/10 | 2 | gate | MAKE-SET/FIND/UNION/CONNECTED CLRS |
| U6 practice problems | 8/10 | 1 | adv | 5 entries; #5 lacks Duplicate problems; #1 missing **Problem.** header |
| U7 format spine | 10/10 | 1 | gate | correct spine |
| U8 title ↔ filename | 10/10 | 0.5 | gate | script PASS |
| U9 prerequisites format | 8/10 | 0.5 | adv | MST prereq commented out |
| U10 TOC | 9/10 | 0.5 | adv | complete |
| U11 filename convention | 10/10 | 0.5 | gate | script PASS |
| U12 links resolve | 10/10 | 1 | gate | script PASS |
| U13 soundbite | 9/10 | 0.5 | adv | blockquote in What it is |
| U14 section layering | 9/10 | 0.5 | adv | How it works = parent-array trace |
| U17 real-world + at-scale | 9/10 | 0.5 | adv | network partition, image segmentation, alias analysis |
| U18 cache behavior | 8/10 | 0.5 | adv | Graph advisory — cache miss trap in gotchas; folded not in DS8 |
| U20 misconceptions | 7/10 | 0.5 | adv | rank-vs-size conflation in gotchas; no dedicated misconception section |
| DS1 how it works + diagram | 9/10 | 1 | gate | mermaid + parent-array traces |
| DS2 operations table | 9/10 | 1 | gate | find/union/connected/make_set |
| DS3 complexity summary | 9/10 | 1 | gate | with/without each optimization |
| DS4 when-to-use prose | 9/10 | 1 | gate | dynamic connectivity vs BFS/path |
| DS5 variants | 9/10 | 1 | adv | size, weighted, rollback, parallel |
| DS8 comparison table | 9/10 | 1 | gate | BFS/matrix/link-cut crossover with n threshold |
| DS6 implementation | 9/10 | 1 | gate | rank + size variants |
| CP cp-primitives | 9/10 | 1 | gate | Graph gated; 4 tools (Kruskal, cycle, component count, rollback) with why-for-CP |
| DS7 gotchas / edge cases | 9/10 | 1 | gate | find-in-union, 0/1-index, rollback no compression, cache at n>10⁸ |
| DS9 interviewer probes | 9/10 | 1 | adv | 5 Q&A pairs including rollback probe |
| DS9a amortized proof | n/a | 2 | cond | Graph family → n/a; α(n) amortized proof lives in FB/Traversal (not DS9a heading) |
| FB representations | 4/10 | 2 | gate | **Graph family block missing** — article uses Tree/heap heading "Traversal & invariant" instead of Graph "Representations" (matrix vs adjacency list, directed/weighted) |
| AL10 constraints & approach | n/a | — | — | DS article |
| PA1 recognition signals | n/a | — | — | not a pattern article |
| V1 complexity re-derivation | 9/10 | 2 | gate | log* grouping sketch → O(α(n)) amortized; matches Traversal section |
| V2 pseudocode/code correctness | 9/10 | 2 | gate | union(0,1),(2,3),(0,2) then find(3) compresses 3→0 — matches trace |
| V3 worked example fidelity | 9/10 | 0.5 | adv | Kruskal MST trace weights 1+2+3=6 correct |
| V4 comparison table accuracy | 9/10 | 0.5 | adv | BFS O(V+E), matrix O(1) lookup — correct |
| V5 edge case coverage | 9/10 | 0.5 | adv | self-loop, 0/1-index, rollback |
| V6 invariant inductive proof | 9/10 | 2 | gate | forest invariant + rank monotonicity + amortized log*/α sketch with potential-style group argument |
| V7 diagram-text agreement | 9/10 | 0.5 | adv | parent arrays after unions match mermaid |
| V8 terminology precision | 9/10 | 0.5 | adv | rank vs size vs height distinguished |
| V9 recursion stack honesty | 9/10 | 2 | gate | recursive find O(depth) noted; iterative find provided; Python limit warned |
| V10 duplicate-problems relevance | 9/10 | 0.5 | adv | LC 547, 200, 1584 duplicates share DSU mechanics |
| V11 prerequisite necessity | 9/10 | 0.5 | adv | graph Must-read real |
| V12 cross-article consistency | n/a | — | — | graph.md representation cues not contradicted |
| V13 probe answer correctness | 9/10 | 0.5 | adv | rollback/no-compression answer correct |
| V14 general factual accuracy | 9/10 | 0.5 | adv | clean |

**GATE:** NO-SHIP — 1 gated param below 9 (FB).

**BLOCKERS (gated ≤8):**
- **FB:** add `## Representations` (Graph family) — parent-array forest vs adjacency-list BFS for connectivity; when matrix O(1) lookup wins; state representation assumptions for DSU-on-graph problems
