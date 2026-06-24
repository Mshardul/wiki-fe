# Interval Tree

## Prerequisites

- [Binary Search Tree (BST)](./binary-search-tree.md) [Must read] - an interval tree is an augmented BST; all BST search, insert, and delete logic carries over directly.
- [Binary Tree](./binary-tree.md) [Must read] - the traversal mechanics and recursive structure are identical.
- <!-- [Balanced BST](./balanced-bst.md) [Should read] - in practice interval trees are balanced (AVL/Red-Black); understanding balancing explains the O(log n) guarantees. -->

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)
- [How it works](#how-it-works)
- [Operations](#operations)
- [Complexity summary](#complexity-summary)
- [When to use / when not](#when-to-use--when-not)
- [Comparison](#comparison)
- [Variants](#variants)
- [Traversal & invariant](#traversal--invariant)
- [Implementation](#implementation)
- [Gotchas / edge cases](#gotchas--edge-cases)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)

## What it is

An **interval tree** is a BST keyed on interval start points, augmented so every node also stores the **maximum endpoint in its entire subtree** — enabling O(log n + k) stabbing and overlap queries that would cost O(n) on a sorted list.

Mental model: **a BST where each node shouts the loudest deadline in its subtree.** When searching for overlaps, you look left only if that branch's maximum could still overlap your query; otherwise you skip it entirely — same discipline as BST descent, but the pruning uses the extra max annotation.

> **Takeaway (say this out loud):** "An interval tree is an augmented BST — each node stores the max endpoint in its subtree so you can prune non-overlapping branches and find all overlaps in O(log n + k) instead of scanning every interval."

## How it works

Each node stores: the interval `[lo, hi]`, the `max` endpoint across the entire subtree rooted here, and the usual left/right pointers. The BST key is the **low endpoint** `lo`.

```
Intervals: [1,4], [2,6], [3,5], [7,9], [8,10]  — BST keyed on lo

              [3,5]   max=10
             /              \
         [1,4]              [7,9]
         max=6              max=10
            \               /
           [2,6]         [8,10]
           max=6         max=10

max_hi propagation (bottom-up):
  [2,6]:  max = 6           (leaf)
  [8,10]: max = 10          (leaf)
  [1,4]:  max = max(4, 6)   = 6    ← child [2,6].max=6
  [7,9]:  max = max(9, 10)  = 10   ← child [8,10].max=10
  [3,5]:  max = max(5, 6, 10) = 10 ← both children
```

**Overlap query for point p (stabbing query):** at each node check if `node.lo ≤ p ≤ node.hi`. Then:
- If `left` exists and `left.max ≥ p` → descend left (the left subtree might contain overlapping intervals).
- Otherwise descend right.
- This finds **one** overlap; to find **all k** overlaps, collect matches and don't prune on found-one — O(log n + k).

**Overlap query for range [q_lo, q_hi]:** two intervals `[a,b]` and `[c,d]` overlap iff `a ≤ d` and `c ≤ b`. At each node, check that condition, then use `left.max ≥ q_lo` to decide whether to descend left (right is always explored if the node doesn't match).

**Max maintenance on insert/delete:** when a node is inserted or a rotation occurs, `max` is recomputed bottom-up: `node.max = max(node.hi, left.max if left else -∞, right.max if right else -∞)`. This is the O(log n) extra work per mutation.

Cache note: interval trees are pointer-based BSTs — each node lookup is a pointer hop, so access is **cache-hostile**. At n > 10⁶ intervals the cache-miss rate is measurable; a sorted-array + binary-search hybrid can outperform for single-query workloads despite worse Big-O.

## Operations

| Operation | Time | Space |
|-----------|------|-------|
| Insert interval | O(log n) | O(1) |
| Delete interval | O(log n) | O(1) |
| Stabbing query (one result) | O(log n) | O(1) |
| Stabbing query (all k results) | O(log n + k) | O(k) |
| Range overlap query (all k results) | O(log n + k) | O(k) |
| Build from n intervals | O(n log n) | O(n) |
| Space total | — | O(n) |

## Complexity summary

| | Time | Space |
|--|------|-------|
| Best | O(log n) query (no overlap) | O(n) |
| Average | O(log n + k) | O(n) |
| Worst | O(n) query if all intervals overlap (k = n) | O(n) |

When k = n (every interval overlaps), the query is forced to visit every node — no pruning helps. This is the inherent lower bound, not a failure of the structure.

## When to use / when not

**Reach for an interval tree when:**
- You need **repeated overlap queries** against a dynamic set of intervals (insertions and deletions happen between queries).
- You need all overlapping intervals, not just whether any exist.
- Query + update mix is the workload: O(log n) per op is better than rebuilding a sorted structure.

**Don't reach for an interval tree when:**
- Intervals are **static** (no inserts/deletes after build): sort by start and binary-search for the first candidate, then scan. Simpler and cache-friendlier.
- You need **range aggregate** (sum, min, max of values over a numeric range): use a [segment tree](./segment-tree.md) — it's built for exactly that.
- Only one overlap check ever: brute-force scan is O(n) and simpler to code.
- **Coordinate-compressed** interval queries in CP: a segment tree with lazy propagation is often easier to implement under contest conditions.
- **Contest Python:** a hand-rolled BST interval tree is rarely worth the implementation cost under time pressure. Reach for `sortedcontainers.SortedList` (O(log n) insert, delete, bisect) for dynamic interval management — it gives the same asymptotic guarantees with ~10 lines instead of ~60.

**Real-world workhorse:** scheduling systems (calendar overlap detection, resource booking), database query planners (partition pruning — "which shards contain rows in this timestamp range?"), and computational geometry (sweep-line collision detection). Database interval-indexing is often a PostgreSQL GiST index, which wraps an interval-tree-like structure.

## Comparison

| Structure | Overlap query (one) | Overlap query (all k) | Update | Best when |
|-----------|--------------------|-----------------------|--------|-----------|
| **Interval tree** | O(log n) | O(log n + k) | O(log n) | Dynamic intervals, repeated queries |
| Sorted array + scan | O(log n) start, O(k) scan | O(log n + k) | O(n) | Static intervals, simple implementation |
| Segment tree (coordinate-compressed) | O(log n) | O(log n + k) | O(log n) | Integer/discretizable endpoints, range aggregates needed |
| Brute-force scan | O(n) | O(n) | O(1) append | n ≤ 1000, one-off query, no preprocessing budget |
| Augmented skip list | O(log n) expected | O(log n + k) expected | O(log n) expected | Concurrent writes (easier lock striping than BST rotations) |

**Crossover conditions:**
- Sorted array beats interval tree when the set is **static and n is large** — no rotation overhead, and sequential scan has better cache behavior once the binary-search narrows the start candidate.
- Segment tree beats interval tree in **CP** because coordinate compression + array-based segment tree is faster to implement correctly under time pressure, especially when range-update/range-query is also needed.
- Brute-force wins only when n < ~1000 and queries are infrequent — the constant factor of the tree structure dominates at small n.

## Variants

- **Centered interval tree:** partition intervals around a center point; store intervals crossing the center sorted by left endpoint (for left queries) and right endpoint (for right queries). Two sorted lists per node — simpler overlap logic, but harder to balance dynamically.
- **Segment tree for intervals (coordinate compression):** discretize endpoints, build a standard segment tree, mark covered nodes. Handles range-coverage counting; see CP-primitives of [segment tree](./segment-tree.md).
- **2D interval tree:** nest one interval tree inside another — outer on x-axis intervals, inner on y-axis. O(log² n + k) 2D rectangle stabbing; used in 2D collision detection.
- **Augmented AVL / Red-Black tree:** the production form. Most language standard libraries don't ship interval trees natively; you build one by augmenting an AVL or RB tree with the `max` field and fixup on rotations.

## Traversal & invariant

### The augmented BST invariant

An interval tree maintains **two simultaneous invariants**:

1. **BST order on low endpoints:** `left subtree lo < node.lo ≤ right subtree lo` (standard BST).
2. **Max-endpoint annotation:** `node.max = max(node.hi, left.max, right.max)` at every node.

Invariant 2 is what makes the structure useful. It holds after every insert/delete by recomputing `max` bottom-up along the insertion/deletion path — O(log n) extra work, absorbed into the BST mutation cost.

**Amortized behavior: n/a.** Insert and delete are strictly O(log n) worst-case per operation — no batching, no deferred work, no resize event. There is no amortized argument to make; every operation pays its cost immediately.

### Overlap search correctness

**Claim:** if `left` exists and `left.max < query_lo`, no interval in the left subtree can overlap `[query_lo, query_hi]`, so we safely skip it.

**Proof:** every interval `[a, b]` in the left subtree satisfies `b ≤ left.max < query_lo`. For overlap we need `a ≤ query_hi` AND `query_lo ≤ b`. Since `b < query_lo`, the second condition fails — no overlap. ∎

The symmetric argument for the right subtree doesn't hold — we track `max_hi` (maximum endpoint) but not `min_lo` (minimum start). Without `min_lo`, we can't bound whether the right subtree's intervals start before `query_hi`, so we cannot safely prune right. For single-match search, we descend right whenever left is pruned or exhausted. For all-overlaps, we always recurse both sides (pruned only by `max_hi < query_lo` at the base case) — no right-subtree skip.

### In-order traversal and sorted order

In-order traversal visits intervals in **ascending order of low endpoint** (standard BST property). This is useful for collecting all intervals sorted by start — no re-sort needed after a range query.

## Implementation

**Pseudocode (CLRS style):**

```
IntervalInsert(T, interval [lo, hi]):
    node ← new node with key = lo, hi = hi, max = hi
    BSTInsert(T, node)                      ▷ standard BST insert by lo
    p ← node.parent
    while p ≠ nil
        if hi > p.max
            p.max ← hi
        p ← p.parent                        ▷ propagate max upward

OverlapSearch(T, query [q_lo, q_hi]) → node or nil:
    x ← T.root
    while x ≠ nil
        if Overlaps(x.interval, [q_lo, q_hi])
            return x
        if x.left ≠ nil and x.left.max ≥ q_lo
            x ← x.left                      ▷ left might have an overlap
        else
            x ← x.right                     ▷ skip left subtree entirely
    return nil

Overlaps([a, b], [c, d]) → bool:
    return a ≤ d and c ≤ b

IntervalDelete(T, interval [lo, hi]):
    node ← BSTDelete(T, key=lo, hi=hi)   ▷ standard BST delete matching both lo and hi
    ▷ if deleted node had two children, replace with in-order successor
    ▷ propagate max upward along deletion path:
    p ← parent of deleted position
    while p ≠ nil
        p.max ← max(p.hi,
                    p.left.max  if p.left  ≠ nil else -∞,
                    p.right.max if p.right ≠ nil else -∞)
        p ← p.parent
```

**Python (idiomatic):**

```python
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class INode:
    lo: int
    hi: int
    max_hi: int = field(init=False)
    left: Optional["INode"] = field(default=None, repr=False)
    right: Optional["INode"] = field(default=None, repr=False)

    def __post_init__(self) -> None:
        self.max_hi = self.hi

    def _update_max(self) -> None:
        self.max_hi = self.hi
        if self.left:
            self.max_hi = max(self.max_hi, self.left.max_hi)
        if self.right:
            self.max_hi = max(self.max_hi, self.right.max_hi)


class IntervalTree:
    def __init__(self) -> None:
        self.root: Optional[INode] = None

    # --- insert ---
    def insert(self, lo: int, hi: int) -> None:
        self.root = self._insert(self.root, lo, hi)

    def _insert(self, node: Optional[INode], lo: int, hi: int) -> INode:
        if node is None:
            return INode(lo, hi)
        if lo < node.lo:
            node.left = self._insert(node.left, lo, hi)
        else:
            node.right = self._insert(node.right, lo, hi)
        node._update_max()
        return node

    # --- overlap search (first match) ---
    def overlap_search(self, q_lo: int, q_hi: int) -> Optional[tuple[int, int]]:
        node = self.root
        while node:
            if node.lo <= q_hi and q_lo <= node.hi:   # overlap condition
                return (node.lo, node.hi)
            if node.left and node.left.max_hi >= q_lo:
                node = node.left
            else:
                node = node.right
        return None

    # --- all overlapping intervals ---
    def all_overlaps(self, q_lo: int, q_hi: int) -> list[tuple[int, int]]:
        results: list[tuple[int, int]] = []
        self._all_overlaps(self.root, q_lo, q_hi, results)
        return results

    def _all_overlaps(
        self, node: Optional[INode], q_lo: int, q_hi: int,
        results: list[tuple[int, int]]
    ) -> None:
        if node is None or node.max_hi < q_lo:
            return                            # entire subtree ends before query starts
        if node.lo <= q_hi and q_lo <= node.hi:
            results.append((node.lo, node.hi))
        self._all_overlaps(node.left, q_lo, q_hi, results)
        self._all_overlaps(node.right, q_lo, q_hi, results)  # right pruned by base case only

    # --- delete ---
    def delete(self, lo: int, hi: int) -> None:
        self.root = self._delete(self.root, lo, hi)

    def _delete(self, node: Optional[INode], lo: int, hi: int) -> Optional[INode]:
        if node is None:
            return None
        if lo < node.lo:
            node.left = self._delete(node.left, lo, hi)
        elif lo > node.lo:
            node.right = self._delete(node.right, lo, hi)
        else:
            # lo matches — verify hi too (duplicates with same lo share the key)
            if node.hi != hi:
                node.right = self._delete(node.right, lo, hi)
            elif node.left is None:
                return node.right
            elif node.right is None:
                return node.left
            else:
                # replace with in-order successor (min of right subtree)
                successor = self._min_node(node.right)
                node.lo, node.hi = successor.lo, successor.hi
                node.right = self._delete(node.right, successor.lo, successor.hi)
        node._update_max()
        return node

    def _min_node(self, node: INode) -> INode:
        while node.left:
            node = node.left
        return node
```

## Gotchas / edge cases

- **Touching intervals are not overlapping (unless you say so).** `[1, 3]` and `[3, 5]` share only a point. Decide up front whether your overlap condition is `a ≤ d and c ≤ b` (closed, touching = overlap) or `a < d and c < b` (open, touching = no overlap). Mixing conventions is the single most common bug.
- **max_hi fixup after rotation is easy to forget.** If you balance the tree (AVL/RB), every rotation must recompute `max_hi` for both the rotated node and its new parent — bottom-up. Forgetting this silently corrupts all future queries without any obvious error.
- **The "always go right" fallacy.** The standard single-overlap search goes left if `left.max ≥ q_lo`, else right. You cannot skip both subtrees after finding one match — for all-overlaps you must explore both branches, pruned only by `max_hi < q_lo`.
- **CP trap — coordinate overflow.** When endpoints are given as timestamps (Unix epoch in milliseconds), they overflow a 32-bit int. Use `int` (Python arbitrary precision) or `long` in Java/C++; the comparison `node.lo <= q_hi` silently wraps in C++ `int`.
- **At scale: pointer chasing degrades cache performance.** At n > 10⁶ intervals a pointer-based BST interval tree can be 3–5× slower than a sorted array + sweep for static workloads because of L2/L3 cache misses on every pointer hop. Profile before choosing the tree for read-heavy static data.

## What the interviewer probes for

**"What if all n intervals overlap the query?"**
The query must visit every node — O(n) is unavoidable and correct. The interval tree doesn't degrade incorrectly; it simply has no branches to prune. The real question is whether you pre-screen: if the query is very wide relative to the dataset, you might short-circuit with a cheap count-only mode before collecting results.

**"Why store max endpoint, not min?"**
Min of the right endpoint is not useful for pruning. To prune the left subtree we need to know if any interval there could still start before our query ends — that's covered by `lo` (BST key). What we can prune is "does the left subtree contain any interval that hasn't already ended before our query starts?" That requires `max_hi` of the left subtree ≥ `q_lo`. Min endpoint of the right subtree would tell us where the rightmost intervals start — not the kind of pruning we need.

**"How does this change if intervals can be deleted frequently?"**
With a balanced tree (AVL/RB), delete is O(log n) but requires recomputing `max_hi` along the deletion path and after any rotations. Lazy deletion (mark deleted, rebuild when > 50% are dead) avoids rotation overhead but costs memory and degrades query performance over time. The rebuild threshold is the engineering trade-off.

**"How do you handle duplicate intervals — two entries with the same [lo, hi]?"**
The BST key is `lo`, so duplicates with the same `lo` land in the right subtree. On delete, match both `lo` and `hi` before removing — if `lo` matches but `hi` doesn't, recurse right to find the correct duplicate. This means you can store multiple copies of the same interval and delete them one at a time. A count field per node avoids the right-subtree recursion for exact duplicates, at the cost of one extra field.

## Practice problems

### 1. My Calendar I — single booking conflict detection (interval tree approach)

Design a calendar that rejects a new booking `[start, end)` if it overlaps any existing booking. Implement `book(start, end) → bool`. Up to 10⁹ calls possible in the general case; n ≤ 1000 in the LC version.

**Approach:** This is the canonical interval-tree use-case: dynamic inserts with overlap queries. Maintain an interval tree keyed on start. On each `book(start, end)`, run an overlap search for `[start, end)` — if any existing interval overlaps, return `False`; otherwise insert and return `True`. Each call is O(log n). For n ≤ 1000 a sorted list + `bisect` suffices, but the interval tree is the correct O(log n) solution for large n.

```python
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class INode:
    lo: int
    hi: int
    max_hi: int = field(init=False)
    left: Optional["INode"] = field(default=None, repr=False)
    right: Optional["INode"] = field(default=None, repr=False)

    def __post_init__(self) -> None:
        self.max_hi = self.hi

    def _update_max(self) -> None:
        self.max_hi = self.hi
        if self.left:
            self.max_hi = max(self.max_hi, self.left.max_hi)
        if self.right:
            self.max_hi = max(self.max_hi, self.right.max_hi)


class MyCalendar:
    def __init__(self) -> None:
        self._root: Optional[INode] = None

    def book(self, start: int, end: int) -> bool:
        if self._overlap_search(self._root, start, end):
            return False
        self._root = self._insert(self._root, start, end)
        return True

    def _overlap_search(self, node: Optional[INode], q_lo: int, q_hi: int) -> bool:
        while node:
            if node.lo < q_hi and q_lo < node.hi:   # half-open overlap
                return True
            if node.left and node.left.max_hi > q_lo:
                node = node.left
            else:
                node = node.right
        return False

    def _insert(self, node: Optional[INode], lo: int, hi: int) -> INode:
        if node is None:
            return INode(lo, hi)
        if lo < node.lo:
            node.left = self._insert(node.left, lo, hi)
        else:
            node.right = self._insert(node.right, lo, hi)
        node._update_max()
        return node
```

**Complexity:** O(log n) per `book` (balanced tree), O(n) space.

**Duplicate problems:**
- My Calendar II (LC 731) — allow double-booking, reject triple; maintain a second interval tree of overlapping pairs and query it before inserting.
- My Calendar III (LC 732) — return maximum k-booking; difference array sweep is simpler here than interval tree.

### 2. Interval List Intersections (LC 986) — all-overlaps between two sorted lists

Given two lists of closed intervals `A` and `B` (each sorted, non-overlapping within the list), return all intersecting pairs. For example, `A = [[0,2],[5,10],[13,23]]`, `B = [[1,5],[8,12],[15,24]]` → `[[1,2],[5,5],[8,10],[15,23]]`. n, m ≤ 1000.

**Approach:** at n, m ≤ 1000 the two-pointer sweep is optimal (O(n + m)), but the interval tree shows the all-overlaps retrieval pattern. Build an interval tree from A; for each interval in B, call `all_overlaps(b.lo, b.hi)` and clip each result to the intersection. This directly exercises the O(log n + k) all-overlaps query — each B interval retrieves exactly its k matches. For large n with a dynamic A, the tree wins over the two-pointer which requires A to stay sorted.

```python
from typing import List

def intervalIntersection(A: List[List[int]], B: List[List[int]]) -> List[List[int]]:
    result: List[List[int]] = []
    i = j = 0
    while i < len(A) and j < len(B):
        lo = max(A[i][0], B[j][0])
        hi = min(A[i][1], B[j][1])
        if lo <= hi:
            result.append([lo, hi])
        if A[i][1] < B[j][1]:   # A exhausted first, advance A
            i += 1
        else:
            j += 1
    return result
```

**Complexity:** O(n + m) time (two-pointer), O(1) space (output excluded). With interval tree on A: O((n + m) log n) — worse here, but optimal when A is dynamic.

**Duplicate problems:**
- Remove Interval (LC 1272) — given a sorted list of disjoint intervals and one interval to remove, return the result; same clip-to-intersection logic.
- Minimum Number of Arrows to Burst Balloons (LC 452) — greedy on sorted intervals; overlap detection but no retrieval needed.

### 3. Data Stream as Disjoint Intervals — dynamic interval merging

Receive integers one at a time via `addNum(val)`. After each add, return all current intervals as a sorted list of disjoint intervals. At any time, `getIntervals()` should return the merged set (e.g. adding 1, 3, 7, 2, 6 yields `[[1,3],[6,7]]`). n ≤ 5 × 10⁴.

**Approach:** maintain a sorted set of disjoint intervals keyed by start. On `addNum(v)`, insert `[v, v]` and merge with any overlapping neighbors — check the predecessor (its end ≥ v − 1) and successor (its start ≤ v + 1). This is the interval-tree use-case: dynamic inserts with overlap resolution. Python's `sortedcontainers.SortedList` gives O(log n) insert and neighbor lookup without a hand-rolled BST.

```python
from sortedcontainers import SortedList
from typing import List

class SummaryRanges:
    def __init__(self) -> None:
        self.intervals: SortedList[tuple[int, int]] = SortedList(key=lambda x: x[0])

    def addNum(self, val: int) -> None:
        new_lo, new_hi = val, val
        to_remove: list[tuple[int, int]] = []

        # find predecessor: the largest start ≤ val
        i = self.intervals.bisect_right((val, val)) - 1
        if i >= 0:
            lo, hi = self.intervals[i]
            if hi >= val - 1:             # adjacent or overlapping
                new_lo = min(new_lo, lo)
                new_hi = max(new_hi, hi)
                to_remove.append((lo, hi))

        # find successor: smallest start > val
        j = self.intervals.bisect_left((val + 1, 0))
        if j < len(self.intervals):
            lo, hi = self.intervals[j]
            if lo <= val + 1:             # adjacent or overlapping
                new_lo = min(new_lo, lo)
                new_hi = max(new_hi, hi)
                to_remove.append((lo, hi))

        for iv in to_remove:
            self.intervals.remove(iv)
        self.intervals.add((new_lo, new_hi))

    def getIntervals(self) -> List[List[int]]:
        return [[lo, hi] for lo, hi in self.intervals]
```

**Complexity:** O(log n) per `addNum`, O(n) for `getIntervals`.

**Duplicate problems:**
- Insert Interval (LC 57) — static list, insert one interval and merge; same merge logic, no dynamic structure needed.
- Merge Intervals (LC 56) — sort then sweep; the static batch version of this problem.
