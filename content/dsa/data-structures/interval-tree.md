# Interval Tree

## Prerequisites

- [Binary Search Tree (BST)](./binary-search-tree.md) [Must read]
- [Binary Tree](./binary-tree.md) [Must read]
- [Balanced BST](./balanced-bst.md) [Should read]

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

An **interval tree** is a BST keyed on interval start points, augmented so every node also stores the **maximum endpoint in its entire subtree** - enabling O(log n + k) stabbing and overlap queries that would cost O(n) on a sorted list.

Mental model: **a BST where each node shouts the loudest deadline in its subtree.** When searching for overlaps, you look left only if that branch's maximum could still overlap your query; otherwise you skip it entirely - same discipline as BST descent, but the pruning uses the extra max annotation.

> **Takeaway (say this out loud):** "An interval tree is an augmented BST - each node stores the max endpoint in its subtree so you can prune non-overlapping branches and find all overlaps in O(log n + k) instead of scanning every interval."

## How it works

Each node stores: the interval `[lo, hi]`, the `max` endpoint across the entire subtree rooted here, and the usual left/right pointers. The BST key is the **low endpoint** `lo`.

```
Intervals: [1,4], [2,6], [3,5], [7,9], [8,10]  - BST keyed on lo

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
- This finds **one** overlap; to find **all k** overlaps, collect matches and don't prune on found-one - O(log n + k).

**Overlap query for range [q_lo, q_hi]:** two intervals `[a,b]` and `[c,d]` overlap iff `a ≤ d` and `c ≤ b`. At each node, check that condition, then use `left.max ≥ q_lo` to decide whether to descend left (right is always explored if the node doesn't match).

**Max maintenance on insert/delete:** when a node is inserted or a rotation occurs, `max` is recomputed bottom-up along the path from the mutation point to the root: `node.max = max(node.hi, left.max if left else -∞, right.max if right else -∞)`. This adds O(1) work per node on that path, so the total extra cost is proportional to the path length - O(log n) on a balanced tree, O(n) on a degenerate one (see the balancing caveat below).

> ⚠️ **Warning / Gotcha**
> **Every O(log n) claim on this page assumes a balanced tree - the plain BST insert/delete shown in [Implementation](#implementation) does not balance itself.** A vanilla BST degrades to a linked list (O(n) per operation) on sorted or adversarial insertion order, exactly like an unbalanced [BST](./binary-search-tree.md). To actually guarantee O(log n), augment an AVL or Red-Black tree with the `max` field and a `max` fixup on every rotation (see [Variants](#variants)) - this is what "interval tree" means in production (CLRS presents it as an augmented Red-Black tree, not a plain BST). The pseudocode and Python below show the augmentation logic on a plain BST for clarity; treat the O(log n) bounds throughout this page as conditional on pairing that logic with a real self-balancing tree.

Cache note: interval trees are pointer-based BSTs - each node lookup is a pointer hop, so access is **cache-hostile**. At n > 10⁶ intervals the cache-miss rate is measurable; a sorted-array + binary-search hybrid can outperform for single-query workloads despite worse Big-O.

## Operations

All times below assume a **balanced** tree (AVL/Red-Black augmentation - see the balancing warning in [How it works](#how-it-works)). On the plain, unbalanced BST shown in [Implementation](#implementation), every O(log n) entry degrades to O(n) worst-case.

| Operation | Time (balanced) | Time (unbalanced, worst-case) | Space |
|-----------|------|------|-------|
| Insert interval | O(log n) | O(n) | O(1) |
| Delete interval | O(log n) | O(n) | O(1) |
| Stabbing query (one result) | O(log n) | O(n) | O(1) |
| Stabbing query (all k results) | O(log n + k) | O(n + k) | O(k) |
| Range overlap query (all k results) | O(log n + k) | O(n + k) | O(k) |
| Build from n intervals | O(n log n) | O(n²) | O(n) |
| Space total | - | - | O(n) |

## Complexity summary

Balanced-tree bounds (plain unbalanced BST worst-case in parentheses):

| | Time | Space |
|--|------|-------|
| Best | O(log n) query, no overlap (O(1), root matches) | O(n) |
| Average | O(log n + k) (BST insert order random) | O(n) |
| Worst | O(n) query if all intervals overlap, k = n (O(n) per op if the tree is degenerate - sorted insertion order with no rebalancing) | O(n) |

When k = n (every interval overlaps) on a balanced tree, the query is forced to visit every node - no pruning helps. This is the inherent lower bound of the query itself, not a failure of the structure. The unbalanced-tree worst case is a separate, avoidable failure: a degenerate (linked-list-shaped) tree from adversarial insertion order, fixed by using a self-balancing variant.

## When to use / when not

**Reach for an interval tree when:**
- You need **repeated overlap queries** against a dynamic set of intervals (insertions and deletions happen between queries).
- You need all overlapping intervals, not just whether any exist.
- Query + update mix is the workload: O(log n) per op is better than rebuilding a sorted structure.

**Don't reach for an interval tree when:**
- Intervals are **static** (no inserts/deletes after build): sort by start and binary-search for the first candidate, then scan. Simpler and cache-friendlier.
- You need **range aggregate** (sum, min, max of values over a numeric range): use a [segment tree](./segment-tree.md) - it's built for exactly that.
- Only one overlap check ever: brute-force scan is O(n) and simpler to code.
- **Coordinate-compressed** interval queries in CP: a segment tree with lazy propagation is often easier to implement under contest conditions.
- **Contest Python:** a hand-rolled BST interval tree is rarely worth the implementation cost under time pressure. Reach for `sortedcontainers.SortedList` (O(log n) insert, delete, bisect) for dynamic interval management - it gives the same asymptotic guarantees with ~10 lines instead of ~60.

**Real-world workhorse:** scheduling systems (calendar overlap detection, resource booking), database query planners (partition pruning - "which shards contain rows in this timestamp range?"), and computational geometry (sweep-line collision detection). Database interval-indexing is often a PostgreSQL GiST index, which wraps an interval-tree-like structure.

## Comparison

| Structure | Overlap query (one) | Overlap query (all k) | Update | Best when |
|-----------|--------------------|-----------------------|--------|-----------|
| **Interval tree** (balanced) | O(log n) | O(log n + k) | O(log n) | Dynamic intervals, repeated queries |
| Sorted array + scan | O(log n) start, O(k) scan | O(log n + k) | O(n) | Static intervals, simple implementation |
| Segment tree (coordinate-compressed) | O(log n) | O(log n + k) | O(log n) | Integer/discretizable endpoints, range aggregates needed |
| Brute-force scan | O(n) | O(n) | O(1) append | n ≤ 1000, one-off query, no preprocessing budget |
| Augmented skip list | O(log n) expected | O(log n + k) expected | O(log n) expected | Concurrent writes (easier lock striping than BST rotations) |

**Crossover conditions:**
- Sorted array beats interval tree when the set is **static and n is large** - no rotation overhead, and sequential scan has better cache behavior once the binary-search narrows the start candidate.
- Segment tree beats interval tree in **CP** because coordinate compression + array-based segment tree is faster to implement correctly under time pressure, especially when range-update/range-query is also needed.
- Brute-force wins only when n < ~1000 and queries are infrequent - the constant factor of the tree structure dominates at small n.

See the [Data Structure Selection cheatsheet](../cheatsheets/data-structure-selection.md) for the full cross-structure comparison.

## Variants

- **Centered interval tree:** partition intervals around a center point; store intervals crossing the center sorted by left endpoint (for left queries) and right endpoint (for right queries). Two sorted lists per node - simpler overlap logic, but harder to balance dynamically.
- **Segment tree for intervals (coordinate compression):** discretize endpoints, build a standard [segment tree](./segment-tree.md), mark covered nodes. Handles range-coverage counting - a general segment-tree preprocessing trick, not specific to one worked example there.
- **2D interval tree:** nest one interval tree inside another - outer on x-axis intervals, inner on y-axis. O(log² n + k) 2D rectangle stabbing; used in 2D collision detection.
- **Augmented AVL / Red-Black tree:** the production form. Most language standard libraries don't ship interval trees natively; you build one by augmenting an AVL or RB tree with the `max` field and fixup on rotations.

## Traversal & invariant

### The augmented BST invariant

An interval tree maintains **two simultaneous <abbr>invariant</abbr>s**:

1. **BST order on low endpoints:** `left subtree lo < node.lo ≤ right subtree lo` (standard BST).
2. **Max-endpoint annotation:** `node.max = max(node.hi, left.max, right.max)` at every node.

Invariant 2 is what makes the structure useful. It holds after every insert/delete by recomputing `max` bottom-up along the insertion/deletion path - O(path length) extra work, absorbed into the BST mutation cost. That's O(log n) on a balanced tree; on the plain unbalanced BST in [Implementation](#implementation) the path (and therefore this work) can reach O(n) - see the balancing warning in [How it works](#how-it-works).

**<abbr>Amortized</abbr> behavior: n/a.** Insert and delete are strictly O(log n) worst-case per operation - no batching, no deferred work, no resize event. There is no amortized argument to make; every operation pays its cost immediately.

### Overlap search correctness

**Claim:** if `left` exists and `left.max < query_lo`, no interval in the left subtree can overlap `[query_lo, query_hi]`, so we safely skip it.

**Proof:** every interval `[a, b]` in the left subtree satisfies `b ≤ left.max < query_lo`. For overlap we need `a ≤ query_hi` AND `query_lo ≤ b`. Since `b < query_lo`, the second condition fails - no overlap. ∎

The symmetric argument for the right subtree doesn't hold - we track `max_hi` (maximum endpoint) but not `min_lo` (minimum start). Without `min_lo`, we can't bound whether the right subtree's intervals start before `query_hi`, so we cannot safely prune right. For single-match search, we descend right whenever left is pruned or exhausted. For all-overlaps, we always recurse both sides (pruned only by `max_hi < query_lo` at the base case) - no right-subtree skip.

### In-order traversal and sorted order

In-order traversal visits intervals in **ascending order of low endpoint** (standard BST property). This is useful for collecting all intervals sorted by start - no re-sort needed after a range query.

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
            # lo matches - verify hi too (duplicates with same lo share the key)
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

- **Touching intervals are not overlapping (unless you say so).** `[1, 3]` and `[3, 5]` share only a point. Decide up front whether your overlap condition is `a ≤ d and c ≤ b` (closed, touching = overlap - the convention used throughout this article's main implementation) or `a < d and c < b` (half-open, touching = no overlap - used in [My Calendar I](#1-my-calendar-i---single-booking-conflict-detection-interval-tree-approach) because that's what the problem defines). Mixing conventions **within the same codebase** is the single most common bug - pick one per problem and apply it consistently in every comparison.
- **max_hi fixup after rotation is easy to forget.** If you balance the tree (AVL/RB), every rotation must recompute `max_hi` for both the rotated node and its new parent - bottom-up. Forgetting this silently corrupts all future queries without any obvious error.
- **The "always go right" fallacy.** The standard single-overlap search goes left if `left.max ≥ q_lo`, else right. You cannot skip both subtrees after finding one match - for all-overlaps you must explore both branches, pruned only by `max_hi < q_lo`.
- **CP trap - coordinate overflow.** When endpoints are given as timestamps (Unix epoch in milliseconds), they overflow a 32-bit int. Use `int` (Python arbitrary precision) or `long` in Java/C++; the comparison `node.lo <= q_hi` silently wraps in C++ `int`.
- **At scale: <abbr>pointer chasing</abbr> degrades cache performance.** At n > 10⁶ intervals a pointer-based BST interval tree can be 3–5× slower than a sorted array + sweep for static workloads because of L2/L3 cache misses on every pointer hop. Profile before choosing the tree for read-heavy static data.

## What the interviewer probes for

**"What if all n intervals overlap the query?"**
The query must visit every node - O(n) is unavoidable and correct. The interval tree doesn't degrade incorrectly; it simply has no branches to prune. The real question is whether you pre-screen: if the query is very wide relative to the dataset, you might short-circuit with a cheap count-only mode before collecting results.

**"Why store max endpoint, not min?"**
Min of the right endpoint is not useful for pruning. To prune the left subtree we need to know if any interval there could still start before our query ends - that's covered by `lo` (BST key). What we can prune is "does the left subtree contain any interval that hasn't already ended before our query starts?" That requires `max_hi` of the left subtree ≥ `q_lo`. Min endpoint of the right subtree would tell us where the rightmost intervals start - not the kind of pruning we need.

**"How does this change if intervals can be deleted frequently?"**
With a balanced tree (AVL/RB), delete is O(log n) but requires recomputing `max_hi` along the deletion path and after any rotations. Lazy deletion (mark deleted, rebuild when > 50% are dead) avoids rotation overhead but costs memory and degrades query performance over time. The rebuild threshold is the engineering trade-off.

**"How do you handle duplicate intervals - two entries with the same [lo, hi]?"**
The BST key is `lo`, so duplicates with the same `lo` land in the right subtree. On delete, match both `lo` and `hi` before removing - if `lo` matches but `hi` doesn't, recurse right to find the correct duplicate. This means you can store multiple copies of the same interval and delete them one at a time. A count field per node avoids the right-subtree recursion for exact duplicates, at the cost of one extra field.

## Practice problems

### 1. My Calendar I - single booking conflict detection (interval tree approach)

Design a calendar that rejects a new booking `[start, end)` if it overlaps any existing booking. Implement `book(start, end) → bool`. Up to 10⁹ calls possible in the general case; n ≤ 1000 in the LC version.

**Worked examples:**
- **Example 1**
  - **Input:** book(10, 20) | **Output:** true
  - **Explanation:** the calendar is empty, so no overlap is possible.
- **Example 2**
  - **Input:** book(15, 25) (after book(10, 20) above) | **Output:** false
  - **Explanation:** `[15, 25)` overlaps `[10, 20)` in the range `[15, 20)`, so the booking is rejected.

**Constraints:** `0 ≤ start < end ≤ 10⁹`, up to 1000 calls to `book`.

**Approach:** This is the canonical interval-tree use-case: dynamic inserts with overlap queries. Maintain an interval tree keyed on start. On each `book(start, end)`, run an overlap search for `[start, end)` - if any existing interval overlaps, return `False`; otherwise insert and return `True`. Each call is O(log n) on a balanced tree (see the balancing warning in [How it works](#how-it-works)). For n ≤ 1000 a sorted list + `bisect` suffices, but the interval tree is the correct O(log n) solution for large n.

**Overlap convention note:** the problem defines bookings as **half-open** `[start, end)` - back-to-back meetings like `[10, 20)` and `[20, 30)` do not conflict. This deliberately differs from the rest of this article, which uses the **closed** convention `a ≤ d and c ≤ b` (touching counts as overlap - see [Gotchas](#gotchas--edge-cases)). The code below uses strict `<` for exactly this reason: `node.lo < q_hi and q_lo < node.hi`. Always check which convention a problem statement actually implies before reusing overlap-check code from elsewhere in this article.

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
- My Calendar II (LC 731) - allow double-booking, reject triple; maintain a second interval tree of overlapping pairs and query it before inserting.
- My Calendar III (LC 732) - return maximum k-booking; difference array sweep is simpler here than interval tree.

### 2. Find All Conflicting Meetings - multi-result overlap query

Given a set of booked meetings and a new candidate meeting `[q_lo, q_hi]`, return **every** existing meeting that conflicts with it (not just whether one exists). This is the textbook interval-tree "stabbing query, all results" operation - the one My Calendar I deliberately doesn't need, since it only cares about the first conflict. Up to 10⁵ existing meetings, up to 10³ queries.

**Worked examples:**
- **Example 1**
  - **Input:** meetings = [[1,4],[2,6],[3,5],[7,9],[8,10]], query = [5,8] | **Output:** [[2,6],[3,5],[7,9],[8,10]]
  - **Explanation:** `[1,4]` ends before 5 so it's excluded; the other four all overlap `[5,8]` somewhere.
- **Example 2**
  - **Input:** meetings = [[1,4],[2,6],[3,5],[7,9],[8,10]], query = [11,12] | **Output:** []
  - **Explanation:** no meeting extends past 10, so nothing overlaps a query starting at 11.

**Constraints:** `0 ≤ lo < hi ≤ 10⁹` per meeting, up to `10⁵` meetings, up to `10³` queries.

**Approach:** Build one interval tree from all existing meetings. For each query, recurse from the root: prune the entire left subtree the moment `node.max_hi < q_lo` (nothing there can reach far enough right to overlap), otherwise visit left, test the current node, and only descend right if `node.lo ≤ q_hi` (a right subtree keyed on larger `lo` values can't overlap once the current node's `lo` already exceeds the query). This is `max_hi` pruning doing real work - on a query interval near one end of the dataset, entire subtrees are skipped instead of scanned, unlike My Calendar I's search which stops at the first hit.

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


class ConflictFinder:
    def __init__(self, meetings: list[tuple[int, int]]) -> None:
        self._root: Optional[INode] = None
        for lo, hi in meetings:
            self._root = self._insert(self._root, lo, hi)

    def _insert(self, node: Optional[INode], lo: int, hi: int) -> INode:
        if node is None:
            return INode(lo, hi)
        if lo < node.lo:
            node.left = self._insert(node.left, lo, hi)
        else:
            node.right = self._insert(node.right, lo, hi)
        node._update_max()
        return node

    def conflicts(self, q_lo: int, q_hi: int) -> list[tuple[int, int]]:
        results: list[tuple[int, int]] = []
        self._query(self._root, q_lo, q_hi, results)
        return results

    def _query(
        self, node: Optional[INode], q_lo: int, q_hi: int, results: list[tuple[int, int]]
    ) -> None:
        if node is None or node.max_hi < q_lo:
            return                              # whole subtree ends before query starts
        self._query(node.left, q_lo, q_hi, results)
        if node.lo <= q_hi and q_lo <= node.hi:
            results.append((node.lo, node.hi))
        if node.lo <= q_hi:                     # right subtree could still start in range
            self._query(node.right, q_lo, q_hi, results)
```

**Complexity:** O(log n + k) per query, where k is the number of conflicts returned; O(n) space for the tree.

**Duplicate problems:**
- Remove Interval (LC 1272) - given a sorted list of disjoint intervals and one interval to remove, return the result; same "find everything overlapping a query range" retrieval, but on a static sorted array instead of a tree.
- Minimum Number of Arrows to Burst Balloons (LC 452) - greedy on sorted intervals; needs only overlap detection, no multi-result retrieval.

### 3. Employee Free Time - multi-interval merge via tree sweep

Given each employee's working intervals (unsorted across employees, sorted within each employee), find every gap where **no** employee is working, excluding the gaps before the first and after the last interval. E.g. `[[1,3],[6,7]], [[2,4]], [[2,5],[9,12]]` → `[[5,6],[7,9]]`. Up to 5 × 10⁴ total intervals.

**Worked examples:**
- **Example 1**
  - **Input:** schedule = [[[1,3],[6,7]],[[2,4]],[[2,5],[9,12]]] | **Output:** [[5,6],[7,9]]
  - **Explanation:** merging every interval across all employees gives busy blocks [1,5] and [6,7] and [9,12]; the free gaps between consecutive busy blocks are [5,6] and [7,9].
- **Example 2**
  - **Input:** schedule = [[[1,2],[5,6]],[[1,3]]] | **Output:** [[3,5]]
  - **Explanation:** merged busy blocks are [1,3] and [5,6]; the one gap between them is [3,5].

**Constraints:** total intervals across all employees `≤ 5 × 10⁴`, `0 ≤ lo < hi ≤ 10⁹`.

**Approach:** unlike entry 2's targeted range query, this problem needs **every** interval visited in sorted order to detect gaps between merged clusters - so build the interval tree from all intervals (any employee, flattened), then do an in-order traversal, which yields intervals sorted by `lo` for free (the BST-ordering half of the augmented invariant, not the `max_hi` half). While walking in order, track the current merged cluster's end via `max_hi`-style running max: if the next interval's `lo` falls at or before the running end, it's absorbed into the same cluster; otherwise a gap has been found. This exercises the tree's sorted-traversal property the way entry 2 exercises its pruning - genuinely different tree mechanic, not a copy.

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


def employee_free_time(schedule: list[list[list[int]]]) -> list[list[int]]:
    root: Optional[INode] = None

    def insert(node: Optional[INode], lo: int, hi: int) -> INode:
        if node is None:
            return INode(lo, hi)
        if lo < node.lo:
            node.left = insert(node.left, lo, hi)
        else:
            node.right = insert(node.right, lo, hi)
        node._update_max()
        return node

    for employee in schedule:
        for lo, hi in employee:
            root = insert(root, lo, hi)

    merged: list[list[int]] = []

    def inorder(node: Optional[INode]) -> None:
        if node is None:
            return
        inorder(node.left)
        if merged and node.lo <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], node.hi)   # absorb into current cluster
        else:
            merged.append([node.lo, node.hi])             # start a new cluster
        inorder(node.right)

    inorder(root)
    return [[merged[i - 1][1], merged[i][0]] for i in range(1, len(merged))]
```

**Complexity:** O(n log n) to build the tree, O(n) for the in-order sweep; O(n) space.

**Duplicate problems:**
- Insert Interval (LC 57) - static list, insert one interval and merge; same merge-adjacent-clusters logic, no traversal needed since the input is already sorted.
- Merge Intervals (LC 56) - sort then sweep; the direct array equivalent of this entry's in-order-then-merge approach, without the tree.
