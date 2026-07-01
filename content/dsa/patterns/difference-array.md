# Difference Array

## Prerequisites

- [Array](../data-structures/array.md) [Must read] — the difference array is just an array; you need O(1) indexed read/write
- [Prefix Sum](../patterns/prefix-sum.md) [Must read] — prefix sum is the inverse operation of the difference array; understanding it makes this pattern immediate

## Table of Contents

- [What it is](#what-it-is)
- [Recognition signals](#recognition-signals)
- [How it works](#how-it-works)
- [Skeleton](#skeleton)
- [Complexity](#complexity)
- [Constraints & approach](#constraints--approach)
- [Variations](#variations)
- [CP-primitives](#cp-primitives)
- [Worked problems](#worked-problems)
- [Pitfalls](#pitfalls)
- [First 30 seconds](#first-30-seconds)
- [Related](#related)
- [Practice problems](#practice-problems)

## What it is

A **difference array** is an auxiliary array `D` where `D[i] = A[i] - A[i-1]`; applying a range update `[l, r] += val` becomes two O(1) point writes (`D[l] += val`, `D[r+1] -= val`), and a single prefix-sum pass at the end reconstructs the final array.

**Mental model:** think of `D` as storing the *slope* of `A` — an increment at `l` starts an upward slope, the decrement at `r+1` ends it. The prefix sum "integrates" those slopes back into values. Range update + bulk read = O(n + q); touching every cell per update = O(n·q). Whenever you batch many range increments before any read, reach for this.

> **Interview soundbite:** "I'll use a difference array — each range update is two O(1) point writes, and one prefix-sum pass at the end recovers the final array, so q updates cost O(n + q) instead of O(n·q)."

## Recognition signals

### (a) Trigger phrases

Look for these exact phrasings in problem statements:

- *"add `val` to each element in the range `[l, r]`"* — the canonical statement; range update before any query
- *"each booking reserves seats `first` through `last`"* — the flight-booking / interval-increment variant
- *"find the maximum number of overlapping intervals at any point"* — the overlap-count formulation
- *"increment all elements between index `i` and index `j` by `k`"* — textbook LC 370 wording
- *"what is the coverage at each position after all operations?"* — final-state-after-updates pattern

### (b) Structural cues

- **Input shape:** an array of length `n` + `q` update operations each of the form `(l, r, val)`.
- **Output property:** you need the final state of the array *after all updates*, or the max/count at any position — you do **not** need to answer interleaved point queries during updates.
- **Key tell:** all updates arrive before any read (offline / batch pattern). If queries are interleaved with updates, this pattern is the wrong tool.
- **Overlap counting:** `q` intervals, asked for the maximum simultaneous overlap — this is a difference array on an event-coordinate axis.

### (c) Not to be confused with

- **Prefix sum** — prefix sum answers range-*sum queries* on a static array; difference array answers range-*updates* then one-shot point reads. They are mathematical inverses: prefix sum of a difference array recovers the original array, and vice versa. When the array is static and you want fast range sums, use prefix sum. When the array is modified by many range increments and you want the final array, use difference array.
- **Segment tree** — a segment tree handles *interleaved* updates and queries online in O(log n) each; use it when queries arrive between updates. A difference array is strictly offline (batch updates → one read pass) but achieves O(1) per update vs O(log n).
- **BIT / Fenwick tree** — same trade-off as segment tree: online, O(log n) per op. Difference array wins when all updates precede all reads.

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

## Skeleton

### CLRS pseudocode

```
DIFFERENCE-ARRAY-BUILD(A, n)
  let D[0..n] be a new array of zeros
  for i = 0 to n-1
    D[i] ← A[i]          ▷ if A is non-zero initially
  for i = n-1 downto 1
    D[i] ← D[i] - D[i-1] ▷ compute difference; D now holds deltas
  return D

RANGE-UPDATE(D, l, r, val)
  D[l] ← D[l] + val
  D[r+1] ← D[r+1] - val  ▷ sentinel slot at n absorbs r = n-1

RECONSTRUCT(D, n)
  for i = 1 to n-1
    D[i] ← D[i] + D[i-1]  ▷ prefix sum restores final values
  return D[0..n-1]
```

### Python template

```python
def range_updates(n: int, updates: list[tuple[int, int, int]]) -> list[int]:
    """
    Apply q range updates to a zero-initialized array of length n.
    Each update: (l, r, val) → add val to A[l..r] inclusive.
    Returns the final array.
    """
    diff: list[int] = [0] * (n + 1)   # extra slot for D[r+1] when r == n-1

    for l, r, val in updates:
        diff[l] += val
        diff[r + 1] -= val             # your logic here — adapt l/r to 0- or 1-indexed

    # prefix sum restores final array
    for i in range(1, n):
        diff[i] += diff[i - 1]

    return diff[:n]
```

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
| n ≤ 10⁵, q ≤ 10⁵ | batch before any read | **Reach for difference array** — O(n + q) is fast; naive O(n·q) = 10¹⁰, TLE |
| n ≤ 10⁶, q ≤ 10⁶ | batch | Still fine — two linear passes, low constants |
| Updates interleaved with point queries | online | **Do NOT use** — switch to BIT (O(log n) per op) or segment tree with lazy propagation |
| Updates interleaved with range-sum queries | online + range | **Do NOT use** — segment tree with lazy propagation only |
| n ≤ 500, q ≤ 500 | batch | Naive O(n·q) = 250K — either works; prefer naive for simplicity |
| Range of values is large but sparse (coordinate compression needed) | offline | Apply coordinate compression first, then difference array on compressed indices |

**When NOT to reach for it:** if the problem says "after each update, report the value at position i" — updates and queries are interleaved, and you need an online structure. Difference array only pays off when you can defer all reads until all writes are complete.

## Variations

- **Non-zero initial array** — initialize `D` from `A` using `D[i] = A[i] - A[i-1]`, then apply updates, then prefix-sum.
- **Range assignment (set, not add)** — difference array handles additive increments natively; for "set range to val", convert to: undo current value and add new (requires knowing current values, or using a segment tree).
- **Multiple arrays / simultaneous updates** — apply difference arrays independently per dimension and combine.
- **Overlap counting** — treat each interval `[l, r]` as `+1` at `l` and `-1` at `r+1`; prefix sum gives the count of overlapping intervals at each position. Max of prefix sum = answer to "max simultaneous overlap."
- **Difference array on events (coordinate-compressed)** — when updates span a large integer range, map event coordinates to compressed indices first, apply difference array, then reconstruct.

## CP-primitives

### 1. 2D difference array

Extend to a matrix for rectangle updates: increment all cells in sub-matrix `(r1, c1)` to `(r2, c2)` by `val`.

```
D[r1][c1]     += val
D[r1][c2+1]   -= val
D[r2+1][c1]   -= val
D[r2+1][c2+1] += val
```

After all updates, compute the 2D prefix sum (row-then-column, or column-then-row) to recover the matrix.

**Why for CP:** "paint rectangles, find max cell value" problems on grids with up to 10³×10³ cells and 10⁵ rectangle updates. Naive O(n²·q) → O(n² + q) with 2D difference array. Appears in Codeforces Div 2 C/D problems involving grid painting.

```python
def rect_updates(R: int, C: int,
                 updates: list[tuple[int, int, int, int, int]]) -> list[list[int]]:
    """Each update: (r1, c1, r2, c2, val)."""
    D = [[0] * (C + 1) for _ in range(R + 1)]
    for r1, c1, r2, c2, val in updates:
        D[r1][c1]     += val
        D[r1][c2 + 1] -= val
        D[r2 + 1][c1] -= val
        D[r2 + 1][c2 + 1] += val
    # 2D prefix sum
    for r in range(R):
        for c in range(1, C):
            D[r][c] += D[r][c - 1]
    for c in range(C):
        for r in range(1, R):
            D[r][c] += D[r - 1][c]
    return [row[:C] for row in D[:R]]
```

### 2. Floating / event-sweep difference array

When updates are on a continuous or large-integer axis, sort events instead of allocating a giant array. Each interval `[l, r]` contributes a `+val` event at `l` and a `-val` event at `r` (or `r+1` for half-open). Sort all events by coordinate; a running sum as you sweep is the equivalent of the prefix-sum pass.

**Why for CP:** meeting-rooms II (max concurrent meetings), car-fleet problems, bandwidth allocation, and any problem where the "positions" are large integers or floats. Avoids O(max_coord) space — O(q log q) time from sorting.

```python
import heapq

def max_overlap(intervals: list[tuple[int, int]]) -> int:
    """Count max simultaneous overlapping intervals."""
    events: list[tuple[int, int]] = []
    for l, r in intervals:
        events.append((l, +1))   # start event
        events.append((r, -1))   # end event (exclusive at r)
    events.sort()
    cur = ans = 0
    for _, delta in events:
        cur += delta
        ans = max(ans, cur)
    return ans
```

### 3. Difference array on a circular array

When the range can wrap around (index `l > r` in a circular array of length `n`):

- If `l ≤ r`: normal update — `D[l] += val`, `D[r+1] -= val`.
- If `l > r` (wraps): split into `[l, n-1]` and `[0, r]` — equivalently: `D[l] += val`, `D[n] -= val`, `D[0] += val`, `D[r+1] -= val`.

**Why for CP:** circular scheduler problems, wrap-around range painting on rings. Common in IOI / CF problems with circular indices.

## Worked problems

### 1. Range Addition (LC 370)

Given an array of `n` zeros and a list of operations `(i, j, inc)`, return the array after all operations.

**Approach:** textbook difference array — `D[i] += inc`, `D[j+1] -= inc` for each operation; prefix sum of `D` is the answer. Every operation is O(1); total O(n + q).

**Complexity:** O(n + q) time, O(n) space.

### 2. Corporate Flight Bookings (LC 1109)

`n` flights numbered 1..n; `bookings[i] = [first, last, seats]` means `seats` seats are booked on flights `first` through `last`. Return an array where `ans[i]` is the total seats booked on flight `i`.

**Approach:** difference array on 1-indexed positions — `D[first-1] += seats`, `D[last] -= seats`; prefix sum of `D[0..n-1]` is the answer. The problem is a verbatim range-addition task.

**Complexity:** O(n + q) time, O(n) space.

### 3. Meeting Rooms II (LC 253)

Given a list of meeting intervals `[start, end]`, find the minimum number of conference rooms required (equivalently, the maximum number of concurrent meetings at any point).

**Approach:** difference array / event sweep — place `+1` at each `start` and `-1` at each `end`; sort events; running sum gives occupancy at each moment; max occupancy = rooms needed. This is the overlap-counting variant.

**Complexity:** O(q log q) time (dominated by sort), O(q) space.

### 4. Minimum Number of Arrows to Burst Balloons (LC 452)

Balloons are represented as intervals `[x_start, x_end]`; an arrow shot at `x` bursts all balloons where `x_start ≤ x ≤ x_end`. Find the minimum arrows to burst all balloons.

**Approach:** greedy on sorted intervals — sort by `x_end`; shoot each arrow at the rightmost point of the earliest-ending balloon and count how many balloons it overlaps. The "how many overlap at a point" intuition is the same difference-array sweep; here, greedy collapses the problem further.

**Complexity:** O(q log q) time, O(1) extra space after sort.

### 5. Car Fleet (LC 853)

`n` cars at positions `pos[i]` heading to target at speed `speed[i]`; a slower car ahead blocks a faster car behind (they merge into a fleet). Count fleets.

**Approach:** sort cars by position descending; compute time to reach target for each. A car behind that arrives no earlier than the car ahead joins its fleet — this is a sweep (difference-array thinking on a sorted axis) where the "merge" signal is a non-strict decrease in arrival time.

**Complexity:** O(n log n) time, O(n) space.

## Pitfalls

### 1. Off-by-one on the sentinel slot

The decrement goes at `D[r+1]`, not `D[r]`. If your array is 1-indexed, `D[r+1]` when `r = n` requires a slot at index `n+1` — allocate size `n+2`. Allocating exactly `n+1` for a 1-indexed array will panic on the last interval. **Fix:** always allocate `D` of size `n+1` for 0-indexed (`n` elements), or `n+2` for 1-indexed (`n` elements).

### 2. Applying updates and queries interleaved

Difference array is **offline only** — you must see all updates before reconstructing. If a problem says "after each update, report the value at index k", a difference array cannot answer without re-running the prefix sum every time (O(n) per query → O(n·q) total, same as naive). The tell is interleaved queries in the problem statement. **Fix:** use a BIT (O(log n) point update + prefix query) or a segment tree with lazy propagation.

### 3. Forgetting to add the initial array

When the array `A` is not all zeros initially, the difference array must be initialized to reflect `A` (i.e., `D[i] = A[i] - A[i-1]`), not to zeros. Skipping this initialization silently overwrites the starting values. **Fix:** build the difference array from `A` before applying updates.

### 4. 2D prefix sum order dependency

For the 2D variant, you must apply prefix sums in *both* dimensions — row-wise then column-wise (or vice versa). Doing only one dimension gives wrong results. **Fix:** after building the 2D diff array, iterate all rows first to accumulate column-wise, then all columns to accumulate row-wise (or swap order; both are correct).

## First 30 seconds

"I see q range-increment operations on an array followed by a read of the final state — all updates are batched before any query. I'll use a difference array: each update is two O(1) point writes, and one prefix-sum pass at the end recovers the final array. Total cost is O(n + q) instead of O(n·q) naive."

## Related

- [Prefix Sum](../patterns/prefix-sum.md) — the inverse operation; prefix sum of the difference array recovers the original array. Must understand prefix sum to apply difference array fluently.
- [Array](../data-structures/array.md) — the underlying data structure; O(1) indexed read/write is what makes both O(1) point updates possible.
- [Segment Tree](../data-structures/segment-tree.md) — the online alternative; O(log n) range update + range query when updates and queries interleave.
- [Fenwick Tree (BIT)](../data-structures/fenwick-tree.md) — lighter online alternative; O(log n) point update + prefix query; use when the difference array's offline constraint is violated.

## Practice problems

### LC 370 — Range Addition

Given `n` (array length) and `updates`, a list of `[i, j, inc]` operations, apply each operation (add `inc` to `A[i..j]` inclusive) and return the final array. `1 ≤ n ≤ 10⁴`, `0 ≤ i ≤ j < n`. The problem is the textbook difference array problem.

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

**Duplicate problems:** LC 1109 (Corporate Flight Bookings) is structurally identical — 1-indexed range-add then read.

---

### LC 1109 — Corporate Flight Bookings

`n` flights, `bookings` list of `[first, last, seats]`; `seats` are booked on every flight from `first` to `last` (1-indexed). Return the total seats on each flight. `1 ≤ n ≤ 2×10⁴`.

**Insight:** difference array on 0-indexed positions: `D[first-1] += seats`, `D[last] -= seats`.

```python
def corp_flight_bookings(bookings: list[list[int]], n: int) -> list[int]:
    diff = [0] * (n + 1)
    for first, last, seats in bookings:
        diff[first - 1] += seats
        diff[last] -= seats          # last is inclusive → sentinel at last (0-indexed last)
    for i in range(1, n):
        diff[i] += diff[i - 1]
    return diff[:n]
```

**Complexity:** O(n + q) time, O(n) space.

**Duplicate problems:** LC 370 (Range Addition) is the same problem with 0-indexed input.

---

### LC 253 — Meeting Rooms II

Given `intervals` where `intervals[i] = [start_i, end_i]`, return the minimum number of conference rooms required. `1 ≤ intervals.length ≤ 10⁴`.

**Insight:** event sweep (floating difference array) — `+1` at each start, `-1` at each end. Sort events by time; track running sum; max running sum = minimum rooms.

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

**Duplicate problems:** LC 2406 (Divide Intervals Into Minimum Number of Groups) is identical in structure.

---

### LC 452 — Minimum Number of Arrows to Burst Balloons

`points[i] = [x_start, x_end]` represents a balloon. An arrow at `x` bursts all balloons with `x_start ≤ x ≤ x_end`. Return minimum arrows. `1 ≤ points.length ≤ 10⁵`.

**Insight:** sort balloons by end coordinate; greedily shoot at the end of the current earliest-ending balloon and skip all overlapping balloons. The overlap check is the difference-array sweep idea compressed into a greedy.

```python
def find_min_arrow_shots(points: list[list[int]]) -> int:
    points.sort(key=lambda p: p[1])
    arrows = 0
    arrow_pos = float('-inf')
    for start, end in points:
        if start > arrow_pos:        # no existing arrow covers this balloon
            arrows += 1
            arrow_pos = end          # shoot at the rightmost point of this balloon
    return arrows
```

**Complexity:** O(q log q) time, O(1) extra space.

**Duplicate problems:** LC 435 (Non-overlapping Intervals) uses the same greedy on sorted-by-end intervals.
