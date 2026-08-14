# Segment Tree

## Prerequisites

- [Big-O Notation](../algorithms/big-o-notation.md) [Must read]
- [Array](./array.md) [Must read]
- [Binary Tree](./binary-tree.md) [Must read]
- [Divide and Conquer](../algorithms/divide-and-conquer.md) [Should read]
- [Prefix Sum](../patterns/prefix-sum.md) [Should read]

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
  - [The coverage invariant](#the-coverage-invariant)
  - [Why query and build are O(log n) / O(n)](#why-query-and-build-are-olog-n--on)
  - [Lazy propagation's correctness argument](#lazy-propagations-correctness-argument)
- [Implementation](#implementation)
- [Gotchas / edge cases](#gotchas--edge-cases)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)

## What it is

A **segment tree** is a binary tree built over an array where every node stores an **aggregate** (sum, min, max, gcd - any associative operation) of a contiguous range, letting both **range queries** and **point/range updates** run in **O(log n)**.

Mental model: **a tournament bracket where every match result is cached.** Leaves are the players (array elements); each internal node is a match whose "winner" is the aggregate of its two children's ranges. Querying `[l, r]` means asking only the O(log n) matches whose combined bracket exactly tiles `[l, r]` - never replaying every game from scratch.

> **Takeaway (say this out loud):** "A segment tree is a binary tree of range aggregates - O(log n) for any associative range query and any point or range update, with lazy propagation the standard trick to keep range updates O(log n) too."

## How it works

Build a binary tree over the array where each node owns a contiguous **range `[lo, hi]`**: leaves own single elements (`lo == hi`), and every internal node owns the union of its two children's ranges, split at the midpoint. The node's stored value is `combine(left_child.value, right_child.value)` for whatever associative `combine` the tree is built for (sum, min, max, gcd, …).

```
Array (1-indexed for the diagram): [2, 5, 1, 4, 9, 3]   combine = sum

                        [1,6]=24
                       /          \
                  [1,3]=8        [4,6]=16
                 /      \         /      \
             [1,2]=7  [3,3]=1 [4,5]=13  [6,6]=3
             /    \                /    \
          [1,1]=2 [2,2]=5     [4,4]=4  [5,5]=9
```

A range query `[l, r]` recursively visits a node: if the node's range is **entirely outside** `[l, r]`, contribute nothing; if it's **entirely inside** `[l, r]`, return its stored value directly (no need to descend further); otherwise it **partially overlaps** - recurse into both children and combine their answers. Because a node's range is only descended into when the query boundary cuts through it, and each boundary can cut through at most O(log n) node ranges per level, the whole query touches O(log n) nodes total.

A point update walks a single root-to-leaf path (O(log n) nodes) fixing the target leaf, then recombines every ancestor on the way back up: `parent.value = combine(left.value, right.value)`.

**Cache behavior.** A segment tree is pointer-based when built with explicit node objects (hostile - each `left`/`right` hop is a scattered heap allocation, a cache miss per level), but the common **array-backed** implementation (`tree[2*node]`, `tree[2*node+1]` as shown below) stores all nodes contiguously, trading <abbr>pointer chasing</abbr> for index arithmetic - friendlier than a pointer tree, though still not sequential like a flat array scan, since parent/child indices jump across the array rather than walking it in order.

## Operations

| Operation                  | Time         | Space |
| --------------------------- | ------------ | ----- |
| Build from array            | O(n)         | O(n)  |
| Point update                | O(log n)     | O(1)  |
| Range query (sum/min/max)   | O(log n)     | O(1)  |
| Range update (lazy prop.)   | O(log n)     | O(1)  |
| Range query with lazy prop. | O(log n)     | O(1)  |

## Complexity summary

| Operation      | Best     | Average  | Worst    |
| -------------- | -------- | -------- | -------- |
| Build          | O(n)     | O(n)     | O(n)     |
| Point update   | O(log n) | O(log n) | O(log n) |
| Range query    | O(log n) | O(log n) | O(log n) |
| Range update (lazy) | O(log n) | O(log n) | O(log n) |
| Space          | O(n)     | O(n)     | O(n)     |

No amortization anywhere - every operation is a **hard O(log n)** in the worst case, deterministically, because the recursion depth is fixed by the tree height, not by accumulated slack. This determinism is part of why it's a CP staple: no surprise cost spikes mid-contest, unlike a resizing structure.

## When to use / when not

**Reach for a segment tree when:**

- You need **range queries over a non-invertible aggregate** - min, max, gcd, or any associative op with no inverse. A [Fenwick tree](./fenwick-tree.md) only works for invertible ops (sum, XOR); segment tree works for anything associative.
- You need **range updates combined with range queries** - "add `x` to every element in `[l, r]`, then query the range sum" - via **lazy propagation** (see the [Range Addition](#3-range-addition) practice problem). A Fenwick tree only reaches this with the two-BIT trick, and only for additive/invertible ops.
- The query changes shape between problems (sum today, min tomorrow) - a segment tree is a **generic template**: swap `combine` and the identity element, everything else stays the same.

**Reach for something else when:**

- The op is a **sum (or other invertible op) with point updates only** → a [Fenwick tree](./fenwick-tree.md) - roughly a third the memory, no recursion, smaller constant factor, ~5x less code for the same asymptotics.
- The array is **static** (no updates after build) → a plain [prefix sum](../patterns/prefix-sum.md) array for sum queries (O(1) query, no tree at all), or a **sparse table** for static range min/max (O(1) query after O(n log n) preprocessing - segment tree's update capability is pure overhead if nothing ever changes).
- You need **overlapping interval storage and stabbing queries** ("which intervals contain point p?") rather than array-range aggregates → an [interval tree](./interval-tree.md) - different problem shape entirely (intervals as data, not array positions).

**Real-world usage:** segment trees back **range-aggregate dashboards** (e.g. "max <abbr>latency</abbr> in the last 5 minutes" over a sliding time-bucketed array) and are the standard tool behind **computational geometry sweep-line** algorithms (rectangle union area, skyline problem) where the sweep needs range-min/max over an active-interval set. At scale, the failure mode is **memory density**: a recursive array-backed segment tree conventionally over-allocates to `4n` nodes to guarantee no out-of-bounds child index, which becomes a real constant-factor cost at `n > 10⁸` - a **iterative/bottom-up segment tree** (array-only, `2n` nodes, no recursion) is the standard fix when memory or call-stack overhead matters at that scale.

## Comparison

| Structure                          | Point update | Range query (any assoc. op) | Range update | Space         | Constant factor | Pick it when…                                                      |
| ----------------------------------- | ------------- | ---------------------------- | ------------- | ------------- | ---------------- | -------------------------------------------------------------------- |
| **Segment tree**                    | O(log n)      | O(log n) - **any op**        | O(log n) (lazy) | O(4n) typical | larger (recursion, node overhead) | need min/max/gcd, or range updates + range queries together |
| [Fenwick tree (BIT)](./fenwick-tree.md) | O(log n)      | O(log n) - **sum/XOR only**  | O(log n) (2-BIT trick, additive only) | O(n)          | small, no recursion | sum-only workload - simplest and fastest to code |
| [Prefix sum array](../patterns/prefix-sum.md) | O(n) rebuild | **O(1)** - sum only          | n/a           | O(n)          | trivial           | array is **static** - no updates after build |
| Sparse table                        | not supported (static) | **O(1)** - min/max/gcd (idempotent ops) | n/a | O(n log n)    | moderate          | static array + repeated range min/max queries, query-heavy workload |

See the [Data Structure Selection cheatsheet](../cheatsheets/data-structure-selection.md) for the full cross-structure comparison.

## Variants

- **Iterative (bottom-up) segment tree.** Store the tree as a flat array of size `2n` with leaves at indices `[n, 2n)` and each parent at `i/2` - no recursion, no pointers, smaller constant factor than the recursive `4n` version. Trades away easy lazy-propagation support (harder to implement correctly) for raw speed on point-update/range-query workloads.
- **Persistent segment tree.** Every update creates O(log n) new nodes instead of mutating in place, sharing the unchanged subtrees with the previous version - lets you query **any historical version** of the array. Used for "k-th smallest in range `[l,r]` as of time `t`" and offline range-rank problems.
- **Merge sort tree.** Each node stores its range as a **sorted list** instead of a scalar aggregate, built via merge sort's merge step. Answers "how many elements ≤ x in range `[l,r]`" in O(log²n) - full treatment in the [Range Frequency Query](#4-range-frequency-query) practice problem.
- **2D segment tree (segment tree of segment trees).** Each node of the outer tree is itself a segment tree over the second dimension - O(log²n) point update / range query over a 2D grid, at O(n log n) space. Used for 2D range-max/range-sum with updates (e.g. live heatmaps).
- **Segment tree beats (Ji Driver tree).** An advanced lazy-propagation variant supporting range chmin/chmax updates (clamp every element in a range to at most/at least x) in <abbr>amortized</abbr> O(log²n) - a competitive-programming specialization, rarely needed outside contests.

## Traversal & invariant

The entire structure rests on one <abbr>invariant</abbr>, maintained at every node: **`node.value == combine(a[node.lo..node.mid], a[node.mid+1..node.hi])`, recursively, all the way to the leaves.**

### The coverage invariant

Every node owns a range `[lo, hi]`; the root owns `[0, n-1]`, and every internal node's range is split at `mid = (lo + hi) / 2` into `[lo, mid]` (left child) and `[mid+1, hi]` (right child). By induction: leaves trivially satisfy the invariant (`combine` of a single element is that element); an internal node satisfies it if both children do, since `node.value = combine(left.value, right.value)` by construction. This invariant is what makes a query correct without visiting every leaf - a node's cached value is *provably* the exact aggregate of its range, so once a query range fully covers a node's range, the query can stop descending and trust the cached value.

### Why query and build are O(log n) / O(n)

**Query correctness + complexity.** A query `[l, r]` on node `[lo, hi]` has exactly three cases: **(1) no overlap** (`hi < l` or `lo > r`) → contribute the identity element, don't recurse; **(2) total overlap** (`l ≤ lo` and `hi ≤ r`) → return `node.value` directly, don't recurse; **(3) partial overlap** → recurse into both children and combine. The complexity argument: at each level of the tree, the query boundary `l` and `r` can each cut through at most one node's range (the node whose range straddles the boundary) - every other node at that level is either total-overlap (O(1), stop) or no-overlap (O(1), stop). So at most **2 nodes per level** trigger a recursive partial-overlap call, across `O(log n)` levels → **O(log n)** total nodes visited.

```
query([1,4]) on the tree above:
  [1,6] partial overlap → recurse both children
  [1,3] partial overlap → recurse both children
    [1,2] total overlap (1≤1,2≤4) → return 7, STOP (don't touch leaves 1,2)
    [3,3] total overlap (1≤3,3≤4) → return 1, STOP
  [4,6] partial overlap → recurse both children
    [4,5] partial overlap → recurse both children
      [4,4] total overlap → return 4, STOP
      [5,5] no overlap (5 > 4) → return identity(0), STOP
    [6,6] no overlap (6 > 4) → return identity(0), STOP
  result = 7 + 1 + 4 + 0 = 12  =  a[1]+a[2]+a[3]+a[4] = 5+1+4+? ...
```

(Using the earlier 1-indexed array `[2,5,1,4,9,3]`, `query([1,4])` visits `[1,2]`, `[3,3]`, `[4,4]`, `[5,5]` - **4 nodes**, not the full range's 4 leaves scanned linearly plus internal bookkeeping; the point is the visited-node count is bounded by `O(log n)` regardless of range width, not that it's smaller than the range itself for a small example.)

**Build correctness + complexity.** Build is a straightforward post-order recursion: recursively build both children first, then set `node.value = combine(left.value, right.value)`. Every node is visited exactly once, and each visit does O(1) work (one combine call) - so build is **O(n)** total (a segment tree over `n` leaves has `~2n` total nodes, each doing O(1) work), not O(n log n) as a naive "call update n times" approach would cost.

**Amortized proof:** n/a - segment tree has **no amortized behavior**; build, query, and update are all hard O(log n) or O(n) in the worst case, deterministically, because the recursion depth is fixed by the tree height, not by accumulated slack or a resize schedule (there is nothing analogous to dynamic array's doubling or hash table's rehash here).

### Lazy propagation's correctness argument

Range update without lazy propagation would need to touch every leaf in `[l, r]` - O(n) worst case, defeating the point. Lazy propagation instead **defers** the update: when a range update `[l, r]` fully covers a node's range, apply the update to that node's aggregate value directly (O(1)) and stash a **pending update marker** on the node instead of pushing it down to children immediately. The correctness argument has two parts: **(1) any read (query or further update) that needs to descend past a node with a pending marker must first "push down" that marker to the children** (apply it to their aggregates, and merge the marker into their own pending markers) **before** using their values - this guarantees no node is ever read with a stale aggregate; **(2) markers compose associatively** for additive updates (`pending += delta` correctly represents "apply delta, then apply the new delta" as one combined delta) - this composition rule is why lazy propagation works cleanly for sum/min/max with additive range-update, and needs a different (more careful) composition rule for range-assignment updates (`set` overwrites rather than composes, so a pending `set` marker must clear any pending `add` marker underneath it, not combine with it).

## Implementation

**Pseudocode (CLRS-style contract):**

```
SEG-BUILD(a, node, lo, hi)
1   if lo == hi
2       tree[node] = a[lo]
3       return
4   mid = ⌊(lo + hi) / 2⌋
5   SEG-BUILD(a, 2·node, lo, mid)
6   SEG-BUILD(a, 2·node + 1, mid + 1, hi)
7   tree[node] = COMBINE(tree[2·node], tree[2·node + 1])

SEG-QUERY(node, lo, hi, l, r)              ▷ query range [l, r]
1   if r < lo or hi < l
2       return IDENTITY                     ▷ no overlap
3   if l ≤ lo and hi ≤ r
4       return tree[node]                   ▷ total overlap
5   mid = ⌊(lo + hi) / 2⌋
6   left_result = SEG-QUERY(2·node, lo, mid, l, r)
7   right_result = SEG-QUERY(2·node + 1, mid + 1, hi, l, r)
8   return COMBINE(left_result, right_result)

SEG-UPDATE(node, lo, hi, i, val)           ▷ point update: set a[i] = val
1   if lo == hi
2       tree[node] = val
3       return
4   mid = ⌊(lo + hi) / 2⌋
5   if i ≤ mid
6       SEG-UPDATE(2·node, lo, mid, i, val)
7   else
8       SEG-UPDATE(2·node + 1, mid + 1, hi, i, val)
9   tree[node] = COMBINE(tree[2·node], tree[2·node + 1])
```

**Python (reference - idiomatic):**

```python
from __future__ import annotations
from typing import Callable, TypeVar

T = TypeVar("T")


class SegmentTree:
    """Recursive segment tree over any associative combine function."""

    def __init__(self, arr: list[T], combine: Callable[[T, T], T], identity: T) -> None:
        self.n = len(arr)
        self.combine = combine
        self.identity = identity
        self.tree: list[T] = [identity] * (4 * self.n)
        if self.n:
            self._build(arr, 1, 0, self.n - 1)

    def _build(self, arr: list[T], node: int, lo: int, hi: int) -> None:
        if lo == hi:
            self.tree[node] = arr[lo]
            return
        mid = (lo + hi) // 2
        self._build(arr, 2 * node, lo, mid)
        self._build(arr, 2 * node + 1, mid + 1, hi)
        self.tree[node] = self.combine(self.tree[2 * node], self.tree[2 * node + 1])

    def query(self, l: int, r: int) -> T:
        """Aggregate of a[l..r], inclusive (0-indexed)."""
        return self._query(1, 0, self.n - 1, l, r)

    def _query(self, node: int, lo: int, hi: int, l: int, r: int) -> T:
        if r < lo or hi < l:
            return self.identity
        if l <= lo and hi <= r:
            return self.tree[node]
        mid = (lo + hi) // 2
        left = self._query(2 * node, lo, mid, l, r)
        right = self._query(2 * node + 1, mid + 1, hi, l, r)
        return self.combine(left, right)

    def update(self, i: int, val: T) -> None:
        """Point update: set a[i] = val (0-indexed)."""
        self._update(1, 0, self.n - 1, i, val)

    def _update(self, node: int, lo: int, hi: int, i: int, val: T) -> None:
        if lo == hi:
            self.tree[node] = val
            return
        mid = (lo + hi) // 2
        if i <= mid:
            self._update(2 * node, lo, mid, i, val)
        else:
            self._update(2 * node + 1, mid + 1, hi, i, val)
        self.tree[node] = self.combine(self.tree[2 * node], self.tree[2 * node + 1])
```

**Contest velocity.** For a static array with no updates, skip the segment tree entirely: use `itertools.accumulate` for sum ranges (O(1) query) or a sparse table for min/max ranges (O(1) query after O(n log n) build). Reach for `SegmentTree` only once an update appears in the problem statement.

## Gotchas / edge cases

- **Off-by-one at `mid` boundaries.** The split `mid = (lo + hi) / 2` gives children `[lo, mid]` and `[mid+1, hi]` - using `[lo, mid]`/`[mid, hi]` (no `+1`) double-counts index `mid` in both children, silently corrupting every aggregate that includes it. Trace one build by hand on a 2-element array to catch this before trusting the code.
- **Array size must round to `4n`, not `2n`, for the recursive array-backed version.** A segment tree over `n` leaves has at most `2n - 1` real nodes, but the recursive indexing scheme (`2·node`, `2·node+1`) can address indices up to roughly `4n` in the worst case (when `n` isn't a power of two) - under-allocating causes an out-of-bounds write that may not crash immediately, corrupting unrelated memory instead.
- **Identity element must match `combine` exactly.** Sum's identity is `0`; min's identity is `+∞`; max's identity is `-∞`; gcd's identity is `0` (since `gcd(x, 0) == x`). Using the wrong identity (e.g. `0` for a min-tree) silently makes every "no overlap" branch return a wrong answer that looks plausible - it often passes small test cases where 0 happens not to be the true minimum, then fails at scale.
- **Overflow on accumulation.** A sum segment tree over `10⁵`-`10⁶` elements at `int32`-range values can overflow 32-bit accumulators well before the query even gets interesting - use 64-bit accumulators (`long` in C++/Java; Python ints are unbounded, which hides this bug until porting to another language).
- **Forgetting to push down lazy markers before reading a child.** The single most common lazy-propagation bug: a query or update descends into a child whose parent has an un-pushed pending marker, reading a stale aggregate. The fix is mechanical but easy to skip - **every** recursive call that goes past a node with children must call push-down first, no exceptions, including inside `query`, not just `update`.
- **At-scale: recursion depth and call-stack overhead.** A recursive segment tree over `n = 10⁷` elements has depth `~24`, which is safe, but the **constant-factor overhead of ~2n to 4n recursive calls per build**, each with Python function-call overhead, makes a recursive Python segment tree noticeably slower than an iterative bottom-up array version at that scale - the iterative variant (see [Variants](#variants)) is the standard mitigation when raw <abbr>throughput</abbr> matters.

## What the interviewer probes for

- **"Why not just use a Fenwick tree - it's simpler?"** - Fenwick trees only support invertible/associative ops (sum, XOR) because query *subtracts* one prefix from another; min/max/gcd have no inverse, so they need a segment tree's explicit tree structure instead of BIT's implicit-array trick. If the query is sum-only with point updates, Fenwick wins on code size and constant factor; the moment min/max or range-update+range-query appears, segment tree is the right tool.
- **"How would you support range updates, not just point updates?"** - Lazy propagation: defer pushing an update to children until a later query/update actually needs to descend past that node, storing a pending marker instead. This keeps range update O(log n) instead of the naive O(range length) of updating every leaf directly.
- **"What if `n` isn't known in advance / the array needs to grow?"** - A segment tree is normally built over a fixed-size array; growing it means rebuilding (O(n)) or over-allocating to a generous upper bound up front. Dynamic/implicit segment trees (allocate nodes lazily, only where visited) handle sparse or unbounded coordinate ranges without materializing the full `4n` array - the standard fix for "segment tree over `10⁹` possible values" problems.
- **"Can two segment trees be merged?"** - Yes, in O(n) by rebuilding from the combined leaves, or in specialized "small-to-large" / persistent-tree merging schemes at O(log n) amortized per merge for certain problem shapes (used in offline tree-DP problems merging subtree segment trees). This is advanced/CP-specialized territory, worth naming but not expected to implement cold.

## Practice problems

### 1. Range Sum Query - Mutable

**Problem.** Given an integer array, support `update(index, val)` (set `a[index] = val`) and `sumRange(left, right)` (sum of `a[left..right]`, inclusive), called repeatedly in any order.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [1,3,5], update(1, 2), sumRange(0, 2) | **Output:** 8
  - **Explanation:** after `update(1, 2)` the array is [1,2,5]; summing indices 0..2 gives 1+2+5 = 8.
- **Example 2**
  - **Input:** nums = [1,3,5], sumRange(0, 1), update(0, 10), sumRange(0, 1) | **Output:** 4, then 13
  - **Explanation:** first query sums [1,3] = 4; after `update(0, 10)` the array is [10,3,5], and the same range now sums to 13.

**Constraints:** `1 ≤ nums.length ≤ 3 × 10⁴`, `-100 ≤ nums[i] ≤ 100`, at most `3 × 10⁴` calls to `update` and `sumRange` combined.

**Approach:** The textbook segment-tree shape (also solvable with a Fenwick tree, since sum is invertible - but this entry uses the general `SegmentTree` template to exercise the combine/identity pattern). Build with `combine = operator.add`, `identity = 0`; `update` is a direct point update; `sumRange` is a direct range query.

```python
import operator

class NumArray:
    def __init__(self, nums: list[int]) -> None:
        self.tree = SegmentTree(nums, combine=operator.add, identity=0)

    def update(self, index: int, val: int) -> None:
        self.tree.update(index, val)

    def sumRange(self, left: int, right: int) -> int:
        return self.tree.query(left, right)
```

**Complexity:** O(log n) per `update` and `sumRange`, O(n) build, O(n) space.

**Duplicate problems:**
- Range Sum Query 2D - Mutable (LC 308) - same shape extended to 2D via a 2D segment tree; same point-update/range-query recognition, one more dimension.

### 2. Range Minimum Query with updates

**Problem.** Given an integer array, support `update(index, val)` and `queryMin(left, right)` (minimum of `a[left..right]`, inclusive), called repeatedly. Min has no inverse, so this is the canonical case where a Fenwick tree cannot substitute.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [5, 2, 8, 1, 9], queryMin(1, 3) | **Output:** 1
  - **Explanation:** the minimum of indices 1..3 (values 2, 8, 1) is 1.
- **Example 2**
  - **Input:** nums = [5, 2, 8, 1, 9], update(3, 100), queryMin(1, 3) | **Output:** 2
  - **Explanation:** after `update(3, 100)` the array is [5,2,8,100,9]; the minimum of indices 1..3 (values 2, 8, 100) is now 2.

**Constraints:** `1 ≤ nums.length ≤ 10⁵`, `-10⁹ ≤ nums[i] ≤ 10⁹`, up to `10⁵` calls combined.

**Approach:** Same `SegmentTree` template, different `combine`/`identity`: `combine = min`, `identity = +infinity`. This is the direct demonstration of why segment tree generalizes past Fenwick - swapping two parameters retargets the entire structure from sum to min with zero other code changes, because min is associative even though it isn't invertible.

```python
class MinArray:
    def __init__(self, nums: list[int]) -> None:
        self.tree = SegmentTree(nums, combine=min, identity=float("inf"))

    def update(self, index: int, val: int) -> None:
        self.tree.update(index, val)

    def queryMin(self, left: int, right: int) -> int:
        return self.tree.query(left, right)
```

**Complexity:** O(log n) per `update` and `queryMin`, O(n) build, O(n) space.

**Duplicate problems:**
- Range Maximum Query variants (implicit in many sliding-window/stack problems reframed with updates) - identical template with `combine = max`, `identity = -infinity`.
- Sliding Window Maximum (LC 239) - related shape, but no persistent updates between windows; usually solved with [Monotonic Queue](../patterns/monotonic-queue.md) instead since the window only slides, it doesn't get arbitrary point updates - included here as a *non*-duplicate to sharpen the boundary: segment tree wins once updates are arbitrary, monotonic queue wins for pure sliding without updates.

### 3. Range Addition

**Problem.** Support `update(left, right, val)` (add `val` to every element in `[left, right]`) and `sumRange(left, right)` (sum of `a[left..right]`), both called repeatedly and interleaved in any order.

**Worked examples:**
- **Example 1**
  - **Input:** a = [0,0,0,0,0], update(1, 3, 2), sumRange(0, 4) | **Output:** 6
  - **Explanation:** adding 2 to indices 1..3 gives [0,2,2,2,0]; summing all five gives 0+2+2+2+0 = 6.
- **Example 2**
  - **Input:** a = [0,0,0,0,0], update(0, 2, 5), update(2, 4, 3), sumRange(2, 2) | **Output:** 8
  - **Explanation:** the first update sets index 2 to 5; the second adds 3 more to index 2 (within `[2,4]`), so `a[2] = 8`, matching the single-index range query.

**Constraints:** `1 ≤ n ≤ 10⁵`, `0 ≤ left ≤ right < n`, `-10³ ≤ val ≤ 10³`, up to `10⁵` combined calls.

**Approach:** Range-update + range-query needs **lazy propagation** - a point-update segment tree would need O(range length) per update. Add a `lazy` array parallel to `tree`; a pending value at `lazy[node]` means "this node's whole subtree owes this delta but it hasn't been pushed to children yet." Every query/update first **pushes down** any pending lazy value before recursing further - `range_update` marks affected nodes and defers pushing to children, `range_query` pushes pending markers down only along the path it actually descends. This is the direct segment-tree analog of Fenwick's two-BIT range-update/range-query trick, but generalizes past sum to any associative op with the right push-down rule.

```python
class LazySegmentTree:
    """Sum segment tree with O(log n) range-add + range-sum query."""

    def __init__(self, arr: list[int]) -> None:
        self.n = len(arr)
        self.tree = [0] * (4 * self.n)
        self.lazy = [0] * (4 * self.n)
        if self.n:
            self._build(arr, 1, 0, self.n - 1)

    def _build(self, arr: list[int], node: int, lo: int, hi: int) -> None:
        if lo == hi:
            self.tree[node] = arr[lo]
            return
        mid = (lo + hi) // 2
        self._build(arr, 2 * node, lo, mid)
        self._build(arr, 2 * node + 1, mid + 1, hi)
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]

    def _push_down(self, node: int, lo: int, hi: int) -> None:
        if self.lazy[node] == 0:
            return
        mid = (lo + hi) // 2
        for child, (clo, chi) in ((2 * node, (lo, mid)), (2 * node + 1, (mid + 1, hi))):
            self.lazy[child] += self.lazy[node]                 # compose pending deltas
            self.tree[child] += self.lazy[node] * (chi - clo + 1)  # apply now to the aggregate
        self.lazy[node] = 0

    def range_update(self, node: int, lo: int, hi: int, l: int, r: int, delta: int) -> None:
        if r < lo or hi < l:
            return
        if l <= lo and hi <= r:
            self.tree[node] += delta * (hi - lo + 1)
            self.lazy[node] += delta
            return
        self._push_down(node, lo, hi)
        mid = (lo + hi) // 2
        self.range_update(2 * node, lo, mid, l, r, delta)
        self.range_update(2 * node + 1, mid + 1, hi, l, r, delta)
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]

    def range_query(self, node: int, lo: int, hi: int, l: int, r: int) -> int:
        if r < lo or hi < l:
            return 0
        if l <= lo and hi <= r:
            return self.tree[node]
        self._push_down(node, lo, hi)
        mid = (lo + hi) // 2
        return (self.range_query(2 * node, lo, mid, l, r) +
                self.range_query(2 * node + 1, mid + 1, hi, l, r))


class RangeAddRangeSum:
    def __init__(self, n: int) -> None:
        self.tree = LazySegmentTree([0] * n)
        self.n = n

    def update(self, left: int, right: int, val: int) -> None:
        self.tree.range_update(1, 0, self.n - 1, left, right, val)

    def sumRange(self, left: int, right: int) -> int:
        return self.tree.range_query(1, 0, self.n - 1, left, right)
```

**Complexity:** O(log n) per `update` and `sumRange`. O(n) space (tree + lazy arrays).

**Duplicate problems:**
- Range Sum Query - Range Update and Range Sum (the two-BIT Fenwick version, see [Fenwick tree practice problems](./fenwick-tree.md#3-range-sum-query---range-update-and-range-sum--two-bits)) - identical problem, alternate data structure; both hit O(log n), segment tree's lazy-prop generalizes further (works for min/max range-update too, which two-BIT does not).
- My Calendar III (LC 732) - range-add + max-overlap query is the same lazy-propagation shape with `combine = max` instead of sum.

### 4. Range Frequency Query

**Problem.** Given an array, answer repeated queries of the form "how many times does value `x` occur in `a[left..right]`?" without rebuilding on each query - a range-rank problem the base `SegmentTree`'s `combine` can't answer, since counting occurrences isn't associative in the way a scalar aggregate is.

**Worked examples:**
- **Example 1**
  - **Input:** arr = [1,3,3,3,2,4,3], query(left=0, right=6, value=3) | **Output:** 4
  - **Explanation:** value 3 appears at indices 1, 2, 3, and 6, all within `[0,6]`, so the count is 4.
- **Example 2**
  - **Input:** arr = [1,3,3,3,2,4,3], query(left=1, right=4, value=3) | **Output:** 2
  - **Explanation:** restricting to indices 1..4 keeps only the 3s at indices 1 and 2 (index 6 falls outside the range), so the count is 2.

**Constraints:** `1 ≤ arr.length ≤ 10⁵`, `1 ≤ arr[i], value ≤ 10⁹`, up to `10⁵` queries, array is static (no updates between queries).

**Approach:** A **merge sort tree**: each node stores its range's elements as a **sorted list**, built bottom-up via the merge step of merge sort (merging two sorted children costs O(child size), so the whole build is O(n log n)). A range-count-of-value query visits the same O(log n) nodes a normal segment-tree query would, but at each visited node does a binary search (`bisect`) instead of an O(1) read - `count(x) = count_leq(x) - count_leq(x - 1)` gives the exact frequency. This is a genuinely different technique from the lazy-propagation entry above: it trades a scalar per-node aggregate for a per-node sorted list to answer a rank-style query the base template structurally cannot.

```python
import bisect

class MergeSortTree:
    def __init__(self, arr: list[int]) -> None:
        self.n = len(arr)
        self.tree: list[list[int]] = [[] for _ in range(4 * self.n)]
        self._build(arr, 1, 0, self.n - 1)

    def _build(self, arr: list[int], node: int, lo: int, hi: int) -> None:
        if lo == hi:
            self.tree[node] = [arr[lo]]
            return
        mid = (lo + hi) // 2
        self._build(arr, 2 * node, lo, mid)
        self._build(arr, 2 * node + 1, mid + 1, hi)
        # merge step: O(size) per node, O(n log n) total across all levels
        left, right = self.tree[2 * node], self.tree[2 * node + 1]
        self.tree[node] = sorted(left + right)

    def _count_leq(self, node: int, lo: int, hi: int, l: int, r: int, x: int) -> int:
        if r < lo or hi < l:
            return 0
        if l <= lo and hi <= r:
            return bisect.bisect_right(self.tree[node], x)
        mid = (lo + hi) // 2
        return (self._count_leq(2 * node, lo, mid, l, r, x) +
                self._count_leq(2 * node + 1, mid + 1, hi, l, r, x))

    def count(self, left: int, right: int, value: int) -> int:
        return (self._count_leq(1, 0, self.n - 1, left, right, value) -
                self._count_leq(1, 0, self.n - 1, left, right, value - 1))
```

**Complexity:** O(n log n) build, O(log² n) per query, O(n log n) space (each element appears in O(log n) node lists).

**Duplicate problems:**
- Count of Range Sum (LC 327) - a different rank-style range query (prefix-sum values falling in `[lower, upper]`), usually solved with a Fenwick tree or merge-sort-based counting rather than a merge sort tree, but shares the "count elements in a value range via a sorted-merge structure" mechanic.
