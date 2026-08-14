# Difference Array

## Prerequisites

- [Array](../data-structures/array.md) [Must read]
- [Prefix Sum](../patterns/prefix-sum.md) [Must read]

## Table of Contents

- [What it is](#what-it-is)
- [Recognition signals](#recognition-signals)
- [How it works](#how-it-works)
- [Complexity](#complexity)
- [Constraints & approach](#constraints--approach)
- [Variations](#variations)
- [Pitfalls](#pitfalls)
- [First 30 seconds](#first-30-seconds)
- [Related](#related)
- [Practice problems](#practice-problems)
  - [Range Addition (LC 370)](#1-range-addition-lc-370)
  - [Meeting Rooms II (LC 253)](#2-meeting-rooms-ii-lc-253)
  - [Number of Flowers in Full Bloom (LC 2251)](#3-number-of-flowers-in-full-bloom-lc-2251)
  - [Increment Submatrix by One (LC 2536)](#4-increment-submatrix-by-one-lc-2536)

## What it is

A **difference array** is an auxiliary array `D` where `D[i] = A[i] - A[i-1]`; applying a range update `[l, r] += val` becomes two O(1) point writes (`D[l] += val`, `D[r+1] -= val`), and a single prefix-sum pass at the end reconstructs the final array.

**Mental model:** think of `D` as storing the *slope* of `A` - an increment at `l` starts an upward slope, the decrement at `r+1` ends it. The prefix sum "integrates" those slopes back into values. Range update + bulk read = O(n + q); touching every cell per update = O(n·q). Whenever you batch many range increments before any read, reach for this.

> **Interview soundbite:** "I'll use a difference array - each range update is two O(1) point writes, and one prefix-sum pass at the end recovers the final array, so q updates cost O(n + q) instead of O(n·q)."

## Recognition signals

### (a) Trigger phrases

Look for these exact phrasings in problem statements:

- *"add `val` to each element in the range `[l, r]`"* - the canonical statement; range update before any query
- *"each booking reserves seats `first` through `last`"* - the flight-booking / interval-increment variant
- *"find the maximum number of overlapping intervals at any point"* - the overlap-count formulation
- *"increment all elements between index `i` and index `j` by `k`"* - textbook LC 370 wording
- *"what is the coverage at each position after all operations?"* - final-state-after-updates pattern

### (b) Structural cues

- **Input shape:** an array of length `n` + `q` update operations each of the form `(l, r, val)`.
- **Output property:** you need the final state of the array *after all updates*, or the max/count at any position - you do **not** need to answer interleaved point queries during updates.
- **Key tell:** all updates arrive before any read (offline / batch pattern). If queries are interleaved with updates, this pattern is the wrong tool.
- **Overlap counting:** `q` intervals, asked for the maximum simultaneous overlap - this is a difference array on an event-coordinate axis.

### (c) Not to be confused with

- **<abbr>Prefix sum</abbr>** - prefix sum answers range-*sum queries* on a static array; difference array answers range-*updates* then one-shot point reads. They are mathematical inverses: prefix sum of a difference array recovers the original array, and vice versa. When the array is static and you want fast range sums, use prefix sum. When the array is modified by many range increments and you want the final array, use difference array.
- **Segment tree** - a segment tree handles *interleaved* updates and queries online in O(log n) each; use it when queries arrive between updates. A difference array is strictly offline (batch updates → one read pass) but achieves O(1) per update vs O(log n).
- **BIT / Fenwick tree** - same trade-off as segment tree: online, O(log n) per op. Difference array wins when all updates precede all reads.

## How it works

### Step-by-step

Given array `A[0..n-1]` (initially all zeros, or any starting values), and `q` operations `(l, r, val)`:

1. Allocate difference array `D[0..n]` of size `n+1` (the extra slot absorbs `D[r+1]` when `r = n-1`).
2. For each update `(l, r, val)`: `D[l] += val` and `D[r+1] -= val`.
3. After all updates, compute the prefix sum of `D` in-place: `D[i] += D[i-1]` for `i = 1..n-1`.
4. `D[0..n-1]` is now the final array `A`.

### ASCII diagram

```
Initial A:    [0,  0,  0,  0,  0]   (n=5)
Diff array D: [0,  0,  0,  0,  0,  0]   (size n+1)

Update (1, 3, +4):   D[1] += 4,  D[4] -= 4
D:            [0, +4,  0,  0, -4,  0]

Update (0, 2, +2):   D[0] += 2,  D[3] -= 2
D:            [+2,+4,  0, -2, -4,  0]

Prefix sum of D:
  D[0] = 2
  D[1] = 2+4 = 6
  D[2] = 6+0 = 6
  D[3] = 6-2 = 4
  D[4] = 4-4 = 0

Final A:      [2,  6,  6,  4,  0]
```

The `+4` written at index 1 "flows rightward" through the prefix sum until the `-4` at index 4 cancels it. Two point writes replaced four element increments.

### Why it works

Define `D[i] = A[i] - A[i-1]` (with `A[-1] = 0`). Then `A[i] = D[0] + D[1] + … + D[i]` (prefix sum of D). Incrementing `A[l..r]` by `val` means `D[l]` increases by `val` (since `A[l] - A[l-1]` grows) and `D[r+1]` decreases by `val` (since `A[r+1] - A[r]` shrinks); all other `D[i]` are unchanged.

## Complexity

| Operation           | Time      | Space |
| ------------------- | --------- | ----- |
| Build diff array    | O(n)      | O(n)  |
| Single range update | O(1)      | O(1)  |
| q range updates     | O(q)      | O(1)  |
| Reconstruct (prefix sum) | O(n) | O(1)  |
| **Total (q updates + read)** | **O(n + q)** | **O(n)** |

Naive approach (update each element in the range): O(n·q) time.

## Constraints & approach

| n (array size) | q (updates) | Guidance |
| -------------- | ----------- | -------- |
| n ≤ 10⁵, q ≤ 10⁵ | batch before any read | **Reach for difference array** - O(n + q) is fast; naive O(n·q) = 10¹⁰, TLE |
| n ≤ 10⁶, q ≤ 10⁶ | batch | Still fine - two linear passes, low constants |
| Updates interleaved with point queries | online | **Do NOT use** - switch to BIT (O(log n) per op) or segment tree with lazy propagation |
| Updates interleaved with range-sum queries | online + range | **Do NOT use** - segment tree with lazy propagation only |
| n ≤ 500, q ≤ 500 | batch | Naive O(n·q) = 250K - either works; prefer naive for simplicity |
| Range of values is large but sparse (coordinate compression needed) | offline | Apply coordinate compression first, then difference array on compressed indices |

**When NOT to reach for it:** if the problem says "after each update, report the value at position i" - updates and queries are interleaved, and you need an online structure. Difference array only pays off when you can defer all reads until all writes are complete.

**Real-world usage:** game servers use a <abbr>difference array</abbr> to apply area-of-effect damage across player-health arrays (all hits in a tick batch before recalculation); ad-impression systems count overlapping campaign intervals over a time axis before aggregating totals. **At scale:** with `n` approaching 10⁸ (e.g. second-granularity time axes over a day), the O(n) prefix-sum pass over the full array dominates - coordinate-compress to the ~10⁶ actual event endpoints instead, reducing both time and memory by the same factor.

**Cache behavior:** the prefix-sum reconstruction pass is maximally <abbr>cache-friendly</abbr> - it reads `D` sequentially from index 0 to n−1 with no pointer indirection, so every access is a cache-line hit. The O(n + q) cost in practice has a tiny constant; compare this to a segment tree's O(log n) per query that follows non-contiguous child pointers and incurs a cache miss at each level.

## Variations

- **Non-zero initial array** - initialize `D` from `A` using `D[i] = A[i] - A[i-1]`, then apply updates, then prefix-sum.
- **Range assignment (set, not add)** - difference array handles additive increments natively; for "set range to val", convert to: undo current value and add new (requires knowing current values, or using a segment tree).
- **Multiple arrays / simultaneous updates** - apply difference arrays independently per dimension and combine.
- **Overlap counting** - treat each interval `[l, r]` as `+1` at `l` and `-1` at `r+1`; prefix sum gives the count of overlapping intervals at each position. Max of prefix sum = answer to "max simultaneous overlap."
- **Difference array on events (coordinate-compressed)** - when updates span a large integer range, map event coordinates to compressed indices first, apply difference array, then reconstruct.

## Pitfalls

### 1. Off-by-one on the sentinel slot

The decrement goes at `D[r+1]`, not `D[r]`. If your array is 1-indexed, `D[r+1]` when `r = n` requires a slot at index `n+1` - allocate size `n+2`. Allocating exactly `n+1` for a 1-indexed array will panic on the last interval. **Fix:** always allocate `D` of size `n+1` for 0-indexed (`n` elements), or `n+2` for 1-indexed (`n` elements).

### 2. Applying updates and queries interleaved

Difference array is **offline only** - you must see all updates before reconstructing. If a problem says "after each update, report the value at index k", a difference array cannot answer without re-running the prefix sum every time (O(n) per query → O(n·q) total, same as naive). The tell is interleaved queries in the problem statement. **Fix:** use a BIT (O(log n) point update + prefix query) or a segment tree with lazy propagation.

### 3. Forgetting to add the initial array

When the array `A` is not all zeros initially, the difference array must be initialized to reflect `A` (i.e., `D[i] = A[i] - A[i-1]`), not to zeros. Skipping this initialization silently overwrites the starting values. **Fix:** build the difference array from `A` before applying updates.

### 4. 2D prefix sum order dependency

For the 2D variant, you must apply prefix sums in *both* dimensions - row-wise then column-wise (or vice versa). Doing only one dimension gives wrong results. **Fix:** after building the 2D diff array, iterate all rows first to accumulate column-wise, then all columns to accumulate row-wise (or swap order; both are correct).

## First 30 seconds

"I see q range-increment operations on an array followed by a read of the final state - all updates are batched before any query. I'll use a difference array: each update is two O(1) point writes, and one prefix-sum pass at the end recovers the final array. Total cost is O(n + q) instead of O(n·q) naive."

## Related

- [Prefix Sum](../patterns/prefix-sum.md) - the inverse operation; prefix sum of the difference array recovers the original array. Must understand prefix sum to apply difference array fluently.
- [Array](../data-structures/array.md) - the underlying data structure; O(1) indexed read/write is what makes both O(1) point updates possible.
- [Segment Tree](../data-structures/segment-tree.md) - the online alternative; O(log n) range update + range query when updates and queries interleave.

## Practice problems

### 1. Range Addition (LC 370)

Given `n` (array length) and `updates`, a list of `[i, j, inc]` operations, apply each operation (add `inc` to `A[i..j]` inclusive) and return the final array. `1 ≤ n ≤ 10⁴`, `0 ≤ i ≤ j < n`. The problem is the textbook difference array problem.

**Worked examples:**
- **Example 1**
  - **Input:** n = 5, updates = [[1,3,2],[2,4,3],[0,2,-2]] | **Output:** [-2,0,3,5,3]
- **Example 2**
  - **Input:** n = 3, updates = [[0,2,1]] | **Output:** [1,1,1]

**Constraints:** `1 ≤ n ≤ 10⁴`, `0 ≤ updates.length ≤ 10⁴`, `0 ≤ i ≤ j < n`, `-1000 ≤ inc ≤ 1000`.

**Insight:** each operation is exactly one difference-array update; reconstruct with one prefix-sum pass.

```python
def get_modified_array(n: int, updates: list[list[int]]) -> list[int]:
    diff = [0] * (n + 1)
    for l, r, val in updates:
        diff[l] += val
        diff[r + 1] -= val
    for i in range(1, n):
        diff[i] += diff[i - 1]
    return diff[:n]
```

**Complexity:** O(n + q) time, O(n) space.

**Duplicate problems:**
- Corporate Flight Bookings (LC 1109) - structurally identical, 1-indexed range-add then read.
- Points That Intersect With Cars (LC 2848) - same diff array + prefix sum over an integer axis, finishes by counting positions with coverage > 0 instead of returning the array.

---

### 2. Meeting Rooms II (LC 253)

Given `intervals` where `intervals[i] = [start_i, end_i]`, return the minimum number of conference rooms required. `1 ≤ intervals.length ≤ 10⁴`.

**Worked examples:**
- **Example 1**
  - **Input:** intervals = [[0,30],[5,10],[15,20]] | **Output:** 2
- **Example 2**
  - **Input:** intervals = [[7,10],[2,4]] | **Output:** 1

**Constraints:** `1 ≤ intervals.length ≤ 10⁴`, `0 ≤ start_i < end_i ≤ 10⁶`.

**Insight:** event sweep (floating difference array) - `+1` at each start, `-1` at each end. Sort events by time; track running sum; max running sum = minimum rooms.

```python
def min_meeting_rooms(intervals: list[list[int]]) -> int:
    events: list[tuple[int, int]] = []
    for start, end in intervals:
        events.append((start, 1))
        events.append((end, -1))
    events.sort()
    rooms = cur = 0
    for _, delta in events:
        cur += delta
        rooms = max(rooms, cur)
    return rooms
```

**Complexity:** O(q log q) time, O(q) space.

**Duplicate problems:**
- Divide Intervals Into Minimum Number of Groups (LC 2406) - identical in structure.
- Car Pooling (LC 1094) - same event-sweep shape, deltas are passenger counts instead of ±1, checked against a capacity threshold.
- Floating / event-sweep difference array (CP-primitive) - identical mechanic when the update axis is continuous or spans large integers: sort `(+val, -val)` events instead of allocating a dense array, sweep with a running sum in place of the prefix-sum pass. Same O(q log q) cost from sorting.

---

### 3. Number of Flowers in Full Bloom (LC 2251)

`n` flowers bloom in `[start_i, end_i]` (inclusive). For each of `m` people at position `time_j`, count how many flowers are in bloom. `1 ≤ n, m ≤ 5×10⁴`.

**Worked examples:**
- **Example 1**
  - **Input:** flowers = [[1,6],[3,7],[9,12],[4,13]], people = [2,3,7,11] | **Output:** [1,2,2,2]
- **Example 2**
  - **Input:** flowers = [[1,10],[3,3]], people = [3,3,2] | **Output:** [2,2,1]

**Constraints:** `1 ≤ n, m ≤ 5×10⁴`, `1 ≤ start_i ≤ end_i ≤ 10⁹`, `1 ≤ time_j ≤ 10⁹`.

**Approach.** Difference array on the time axis conceptually - `D[start_i] += 1`, `D[end_i + 1] -= 1` for each flower - but `start_i`/`end_i` can reach 10⁹, so a literal array is infeasible. Instead, sort `start` and `end` values separately: for a query time `p`, the number of flowers blooming is `(flowers with start ≤ p)` minus `(flowers with end < p)`, both answerable in O(log n) via binary search on the two sorted lists. This is the difference-array mechanic (a `+1`/`-1` per flower, net effect at a point = accumulated deltas up to that point) computed via counting instead of materializing the array.

```python
from bisect import bisect_left, bisect_right

def full_bloom_flowers(flowers: list[list[int]], people: list[int]) -> list[int]:
    starts = sorted(f[0] for f in flowers)
    ends = sorted(f[1] for f in flowers)
    return [bisect_right(starts, p) - bisect_left(ends, p) for p in people]
```

**Complexity:** O((n + m) log n) time, O(n) space.

**Duplicate problems:**
- Meeting Rooms II (LC 253) - same "each interval contributes a +1/-1 delta" idea, but asks for the peak concurrent count rather than per-query counts at arbitrary points.

---

### 4. Increment Submatrix by One (LC 2536)

Given an `n × n` matrix initialized to zero and a list of queries, each `[r1, c1, r2, c2]` meaning "add 1 to every cell in the rectangle from `(r1,c1)` to `(r2,c2)` inclusive", return the final matrix after applying all queries. `1 ≤ n ≤ 500`.

**Worked examples:**
- **Example 1**
  - **Input:** n = 3, queries = [[1,1,2,2],[0,0,1,1]] | **Output:** [[1,1,0],[1,2,1],[0,1,1]]
  - **Explanation:** cell (1,1) is covered by both rectangles so it accumulates 2; cells covered by only one rectangle get 1.
- **Example 2**
  - **Input:** n = 2, queries = [[0,0,1,1]] | **Output:** [[1,1],[1,1]]
  - **Explanation:** the single query covers the whole 2×2 grid.

**Constraints:** `1 ≤ n ≤ 500`, `0 ≤ queries.length ≤ 10⁴`, `0 ≤ r1 ≤ r2 < n`, `0 ≤ c1 ≤ c2 < n`.

**Approach.** Distinct from every 1D entry above: a range update here is a *rectangle*, not an interval, so a single point write per endpoint no longer cancels the effect correctly - four corner writes are needed so that the two-dimensional prefix sum reconstructs the rectangle exactly. Each query does `D[r1][c1] += 1`, `D[r1][c2+1] -= 1`, `D[r2+1][c1] -= 1`, `D[r2+1][c2+1] += 1` (inclusion-exclusion on the four corners), and the final matrix is recovered with a prefix sum pass first along rows, then along columns (or vice versa - order doesn't matter as long as both passes run).

```python
def range_add_queries(n: int, queries: list[list[int]]) -> list[list[int]]:
    D = [[0] * (n + 1) for _ in range(n + 1)]
    for r1, c1, r2, c2 in queries:
        D[r1][c1] += 1
        D[r1][c2 + 1] -= 1
        D[r2 + 1][c1] -= 1
        D[r2 + 1][c2 + 1] += 1

    for r in range(n):
        for c in range(1, n):
            D[r][c] += D[r][c - 1]
    for c in range(n):
        for r in range(1, n):
            D[r][c] += D[r - 1][c]

    return [row[:n] for row in D[:n]]
```

**Complexity.** O(n² + q) time, O(n²) space.

**Duplicate problems:**
- Range Sum Query 2D - Mutable variant scoped to batch rectangle *increments* instead of interleaved point updates (classic CP "paint rectangles, read once at the end") - identical four-corner difference technique.
