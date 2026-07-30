# Merge Intervals

## Prerequisites

- [Array](../data-structures/array.md) [Must read]
- [Sorting](../algorithms/sorting.md) [Must read]
- [Heap](../data-structures/heap.md) [Must read]

## Table of Contents

- [What it is](#what-it-is)
- [Recognition signals](#recognition-signals)
- [How it works](#how-it-works)
- [Complexity](#complexity)
- [Constraints & approach](#constraints--approach)
- [Variations](#variations)
- [CP-primitives](#cp-primitives)
- [Pitfalls](#pitfalls)
- [First 30 seconds](#first-30-seconds)
- [Related](#related)
- [Practice problems](#practice-problems)

---

## What it is

**Merge Intervals** sorts a collection of `[start, end]` ranges by start time and then sweeps left to right, folding any interval that overlaps the one before it into a single merged range, so overlap/coverage questions collapse from an O(n²) pairwise comparison to a single O(n log n) sorted pass.

**Mental model:** laying a row of bricks. Sort the bricks by their left edge, then walk left to right holding the "current brick" in your hand - if the next brick's left edge starts before (or exactly at) the right edge of the one you're holding, you cement them together into one longer brick; if it starts after, you set the current brick down and pick up the new one.

> **Interview soundbite:** "Merge Intervals - sort by start, sweep once, merge when the next interval's start doesn't exceed the current merged end; O(n log n), dominated by the sort."

---

## Recognition signals

### (a) Trigger phrases

- *"merge overlapping intervals"* / *"merge all overlapping intervals and return the result"*
- *"minimum number of meeting rooms"* / *"minimum number of conference rooms required"*
- *"insert interval into a sorted list of non-overlapping intervals"*
- *"can a person attend all meetings"*
- *"employee free time"*

### (b) Structural cues

- Input is a **list of `[start, end]` pairs** (or objects with a start and end field) - not a flat array of numbers.
- The output cares about **overlap, coverage, or count-of-simultaneous-ranges**, not about individual element values - you're asked to merge, count collisions, or find gaps, never to sum or search for a specific value.
- There is no notion of a single "window" sliding over a contiguous index range - each interval is a discrete object with its own start and end, and the order they're given in is irrelevant until you sort them.

### (c) Not to be confused with

| Pattern | Distinction |
|---|---|
| **Two Pointers** | Two pointers walks two indices *into the same array* (or across two arrays) toward a convergence condition - the "gap" between pointers is a position range. Merge Intervals walks a *single* index over a list of already-sorted interval *objects*, and the comparison is between an interval's start and the running merged end, not between two positions in one array. The one true two-pointer sub-case here is **Interval List Intersections**, which really does need two independent walk indices across two separate sorted lists - see Variations. |
| **Sliding Window** | Sliding window maintains a *contiguous subarray* `[L, R]` over a single array and grows/shrinks it based on a running aggregate (sum, count, frequency map). Merge Intervals has no contiguous subarray at all - its inputs are discrete `[start, end]` objects that may be scattered anywhere in the input order before sorting; there's no "window" sliding over indices. |

---

## How it works

Sort intervals by start. Keep a `result` list; its last entry is the "current merged interval." For each next interval in sorted order, compare its `start` against `result[-1].end`: if `start <= result[-1].end`, they overlap (or touch) - extend `result[-1].end` to `max(result[-1].end, interval.end)`. Otherwise, the new interval starts a fresh group - append it as-is.

**The boundary-inclusive gotcha, stated up front:** do `[1, 2]` and `[2, 3]` merge? The problem statement decides this, and both conventions exist in the wild. If intervals are **closed** (`[1,2]` includes the point 2) and "overlapping" is defined to include touching endpoints, the merge condition is `start <= result[-1].end` (LC 56 uses this - `[1,3]` and `[2,6]` merge, and so do `[1,4]` and `[4,5]`). If the problem instead treats adjacent-but-not-overlapping intervals as separate (common in "free time" / scheduling variants where a meeting ending at 2 and one starting at 2 don't actually conflict), the condition is strictly `start < result[-1].end`. **This single `<` vs `<=` choice is the most common silent bug in this pattern** - it doesn't crash, it just produces a plausible-looking wrong answer, so always re-read the problem's definition of "overlap" before writing the comparison.

**Worked example - merging `[[1,3], [2,6], [8,10], [15,18]]` (already sorted by start):**

```
Sorted input:  [1,3]  [2,6]  [8,10]  [15,18]

Step 0: result = [[1,3]]                         (seed with the first interval)

Step 1: next = [2,6]
        2 <= result[-1].end (3)?  yes -> overlap
        merge: result[-1].end = max(3, 6) = 6
        result = [[1,6]]

Step 2: next = [8,10]
        8 <= result[-1].end (6)?  no -> no overlap
        append as new group
        result = [[1,6], [8,10]]

Step 3: next = [15,18]
        15 <= result[-1].end (10)?  no -> no overlap
        append as new group
        result = [[1,6], [8,10], [15,18]]

Final: [[1,6], [8,10], [15,18]]
```

**Timeline view of the same trace:**

```
value:   1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18
[1,3]:   ■■■
[2,6]:      ■■■■■
merged:  ■■■■■■■■                                              <- [1,6]
[8,10]:                          ■■■
merged:                          ■■■                           <- [8,10] (gap 6→8, no merge)
[15,18]:                                              ■■■■
merged:                                              ■■■■       <- [15,18] (gap 10→15, no merge)
```

The sweep only ever needs to look at `result[-1]` (the most recently closed group) because sorting by start guarantees no later interval can start before an earlier one - once a gap opens, nothing still to come can close it.

---

## Complexity

Time: **O(n log n)**, dominated entirely by the sort - the sweep itself is a single O(n) pass. Space: **O(n)** for the result list (or O(log n)–O(n) extra for the sort's own recursion/temp buffers, depending on the sort implementation) - O(1) *extra* beyond the output only if sorting is done in-place and the merge overwrites the input array.

---

## Constraints & approach

| Input size | Keywords | Reach for | Don't reach for |
|---|---|---|---|
| `n ≤ 10⁵`, "merge overlapping intervals" | "merge", "combine overlapping ranges" | Sort by start + single sweep, O(n log n) | Pairwise overlap check, O(n²) - fine for n ≤ ~500, times out past 10⁴ |
| `n ≤ 10⁵`, "minimum meeting rooms" / "max simultaneous events" | "minimum rooms", "max overlap at any point" | Sort start & end separately (two-pointer sweep) or min-heap of end times, O(n log n) | Merging intervals - merging tells you disjoint groups, not concurrent-overlap count |
| `n ≤ 10⁵`, list is **already sorted and disjoint**, one new interval arrives | "insert interval" | Binary-search the insertion point, O(log n) to locate + O(n) to splice/shift | Re-sorting the whole list from scratch, O(n log n) - wasteful when it's already sorted |
| Two separate already-sorted, disjoint interval lists, want overlaps between them | "interval list intersections" | Two-pointer walk across both lists, O(n + m) | Merge-intervals sweep on a concatenation of both lists - loses which list each interval came from |
| `n ≤ 10⁹`, only need max-overlap-count, not the list of intervals themselves | "count of overlapping intervals at some point" | Coordinate-compressed sweep-line with event deltas (+1/-1), O(n log n) - see CP-primitives | Building an explicit timeline array indexed by coordinate - O(range), infeasible when endpoints span up to 10⁹ |

---

## Variations

- **Meeting Rooms II (min-heap-of-end-times).** Instead of merging, sort by *start* only, and push each meeting's end time onto a min-heap; before pushing a new meeting, pop-while the heap's smallest end time is `<=` the new meeting's start (that room frees up and gets reused). The heap's size at any point is the number of rooms in simultaneous use - the answer is the heap's peak size. This needs a heap, not just a sweep, because a later meeting can free up *any* currently-open room, not just the most-recently-opened one.
- **Insert Interval (binary-search insertion into sorted-disjoint list).** When the input is already sorted and non-overlapping and a single new interval is inserted, don't re-sort - binary-search for where the new interval's start would land, then walk outward merging every neighbor it overlaps. This turns an O(n log n) re-sort into an O(log n) locate + O(n) worst-case splice (still O(n) overall because of the potential shift, but avoids the sort).
- **Interval List Intersections (two-pointer variant).** Two *separate* sorted, disjoint lists - walk one index into each list, and at each step compute the overlap (if any) between the two current intervals, then advance whichever interval ends first. This is genuinely Two Pointers wearing an interval costume, not Merge Intervals - see Related.
- **Employee Free Time.** Merge all employees' intervals into one sorted, merged timeline (a direct application of the core mechanic across a flattened multi-list input), then the gaps *between* consecutive merged intervals are the free-time answer.

---

## CP-primitives

### 1. Sweep-line with event points (+1 / -1) for max-overlap-count

**The trick:** instead of merging intervals, convert each `[start, end]` into two **events**: `(start, +1)` and `(end, -1)` (or `(end + 1, -1)` if the interval is inclusive of its endpoint and you want touching intervals to not count as overlapping). Sort all events by coordinate (breaking ties by processing `-1` before `+1` at the same coordinate if touching intervals shouldn't count as concurrent). Sweep through, maintaining a running counter; the counter's peak value across the whole sweep is the maximum number of intervals overlapping at any single point - this answers "minimum meeting rooms" without a heap.

```python
def max_overlap(intervals: list[list[int]]) -> int:
    events = []
    for start, end in intervals:
        events.append((start, 1))
        events.append((end, -1))
    events.sort(key=lambda e: (e[0], e[1]))   # process -1 before +1 on ties (end before start)

    count = peak = 0
    for _, delta in events:
        count += delta
        peak = max(peak, count)
    return peak
```

**Why for CP:** collapses "how many intervals overlap at the busiest point" from an O(n²) pairwise-check or an O(n log n) heap simulation into a single O(n log n) sort + O(n) linear scan with no auxiliary structure beyond the event list - the standard contest tool whenever the question is about a count at some moment, not the merged shape.

### 2. Coordinate compression for sparse, large-range endpoints

**The trick:** when interval endpoints are drawn from a huge range (up to `10⁹` or beyond) but there are only `n ≤ 10⁵` intervals, you can't index a timeline array by raw coordinate value. Collect all `2n` distinct endpoint values, sort and de-duplicate them, and map each original coordinate to its rank in that sorted list (a dictionary lookup, `O(log n)` via `bisect` or an `O(1)` dict). Any sweep-line or difference-array technique then runs over the compressed index space of size `O(n)` instead of the raw coordinate range.

```python
import bisect

def compress_coordinates(intervals: list[list[int]]) -> list[list[int]]:
    coords = sorted({x for start, end in intervals for x in (start, end)})
    return [[bisect.bisect_left(coords, s), bisect.bisect_left(coords, e)] for s, e in intervals]
```

**Why for CP:** turns an otherwise `O(range)`-space problem (a difference array or segment tree indexed by raw coordinate, infeasible when `range ~ 10⁹`) into an `O(n)`-space one - the difference between "times out / OOMs" and "runs in the contest time limit" whenever endpoints are sparse relative to their range.

---

## Pitfalls

1. **Getting the boundary condition backwards.** Using `<` when the problem's definition of "overlap" includes touching endpoints (or vice versa) silently produces a plausible but wrong merged list - it never crashes, so this bug survives casual testing. Always check the problem's own worked example for a touching-endpoint case (`[1,4]`/`[4,5]`) before picking `<` or `<=`.
2. **Forgetting to sort, or sorting by the wrong key.** The entire correctness argument depends on `result[-1]` being the only interval that could possibly overlap the next one - that only holds if input is sorted by start. Non-overlapping-intervals-style problems that need greedy-by-end and get sorted by start instead will silently produce a suboptimal (but valid-looking) count.
3. **Mutating the input while iterating over it.** Merging by pushing values back into the original list, or continuing to index into `intervals` after `result` has diverged from it, is an easy source of stale-read bugs - keep `result` as its own separate list and only ever read from the sorted input array.
4. **Using merge-intervals logic for a max-concurrency question.** Merging gives disjoint *groups*; it throws away information about how many intervals were stacked at the busiest point inside a group. "Minimum meeting rooms" and "max simultaneous events" need the heap or event-sweep variant, not the merge sweep - reaching for a plain merge here gives a plausible number (the count of merged groups) that is not the right answer.

---

## First 30 seconds

*"This is Merge Intervals - sort by start, then sweep once comparing each interval's start against the running merged end. If it overlaps I extend the end, otherwise I close the current group and start a new one. O(n log n), dominated by the sort."* Then immediately check: does the problem want the merged ranges themselves (sweep-merge), the max number overlapping at once (heap or event-sweep), or an insertion into an already-sorted list (binary search, skip the re-sort) - that's the fork the interviewer is usually testing.

---

## Related

- [Two Pointers](./two-pointers.md) - the technique behind Interval List Intersections, where two independent sorted lists are walked with separate indices instead of a single merge sweep
- [Heap](../data-structures/heap.md) - powers the Meeting Rooms II / min-heap-of-end-times variant, needed whenever the question is max-concurrency rather than merged shape
- [Interval Tree](../data-structures/interval-tree.md) - the data-structure-level generalization: when stabbing queries ("which intervals contain point x?") or overlap queries need to run repeatedly against a large, changing interval set, a one-off sweep no longer suffices and an interval tree (or augmented BST) is the right tool

---

## Practice problems

### 1. Merge Intervals (LC 56)

Given an array of `intervals` where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals and return an array of the non-overlapping intervals that cover all the ranges in the input. Constraints: `1 ≤ n ≤ 10⁴`, `0 ≤ start_i ≤ end_i ≤ 10⁴`.

**Worked examples:**
- **Example 1**
  - **Input:** intervals = [[1,3],[2,6],[8,10],[15,18]] | **Output:** [[1,6],[8,10],[15,18]]
  - **Explanation:** [1,3] and [2,6] overlap, merged into [1,6].
- **Example 2**
  - **Input:** intervals = [[1,4],[4,5]] | **Output:** [[1,5]]
  - **Explanation:** touching endpoints (4 == 4) still count as overlapping.

**Constraints:** `1 ≤ n ≤ 10⁴`, `0 ≤ start_i ≤ end_i ≤ 10⁴`.

**Approach.** Sort by start. Walk the sorted list keeping a `result` list; if the current interval's start is `<=` the last merged interval's end, extend the end to the max of the two ends - otherwise start a new group. Correctness relies entirely on the sort: once a gap opens between `result[-1].end` and the next start, no later interval (all of which start even later) can close it.

```python
def merge(intervals: list[list[int]]) -> list[list[int]]:
    if not intervals:
        return []
    intervals.sort(key=lambda x: x[0])
    result = [intervals[0]]
    for start, end in intervals[1:]:
        if start <= result[-1][1]:
            result[-1][1] = max(result[-1][1], end)
        else:
            result.append([start, end])
    return result
```

**Complexity.** O(n log n) time (sort dominates), O(n) space for the result (O(log n)-O(n) extra for the sort itself, implementation-dependent).

**Duplicate problems:**
- Insert Interval (LC 57) - already-sorted, disjoint input plus one new interval; binary-search the insertion point instead of re-sorting, then absorb overlaps the same way.
- Employee Free Time (LC 759) - flatten all employees' intervals into one list, run the identical merge, then report the gaps between consecutive merged intervals.
- Merge Sorted Array (LC 88) - different data shape (values, not intervals), but the same "sorted input, single sweep, no re-sorting needed" spirit.

---

### 2. Meeting Rooms II (LC 253)

Given an array of meeting time intervals, return the minimum number of conference rooms required so no two meetings using the same room overlap. Constraints: `1 ≤ n ≤ 10⁴`, `0 ≤ start_i < end_i ≤ 10⁶`.

**Worked examples:**
- **Example 1**
  - **Input:** intervals = [[0,30],[5,10],[15,20]] | **Output:** 2
  - **Explanation:** [5,10] and [15,20] both overlap [0,30] at different times, needing a 2nd room at peak, but never a 3rd since [5,10] ends before [15,20] starts.
- **Example 2**
  - **Input:** intervals = [[7,10],[2,4]] | **Output:** 1

**Constraints:** `1 ≤ n ≤ 10⁴`, `0 ≤ start_i < end_i ≤ 10⁶`.

**Approach.** This needs concurrency count, not a merged shape, so a plain merge sweep is the wrong tool. Sort meetings by start time. Maintain a min-heap of currently-occupied rooms' end times. For each meeting, first pop-while the heap's smallest end time is `<=` the meeting's start (that room is now free and reusable), then push the current meeting's end time. The heap's maximum size at any point during the scan is the answer.

```python
import heapq

def min_meeting_rooms(intervals: list[list[int]]) -> int:
    if not intervals:
        return 0
    intervals.sort(key=lambda x: x[0])
    heap: list[int] = []          # min-heap of end times currently "in use"
    peak = 0
    for start, end in intervals:
        while heap and heap[0] <= start:
            heapq.heappop(heap)
        heapq.heappush(heap, end)
        peak = max(peak, len(heap))
    return peak
```

**Complexity.** O(n log n) time (sort plus n heap operations, each O(log n)), O(n) space for the heap in the worst case (all meetings overlapping).

**Duplicate problems:**
- Car Pooling (LC 1094) - identical event-sweep-line shape (CP-primitives #1) with capacity in place of room count.

---

### 3. Non-overlapping Intervals (LC 435)

Given an array of intervals, find the minimum number to remove so the rest are non-overlapping. Constraints: `1 ≤ n ≤ 10⁵`, `-5×10⁴ ≤ start_i < end_i ≤ 5×10⁴`.

**Worked examples:**
- **Example 1**
  - **Input:** intervals = [[1,2],[2,3],[3,4],[1,3]] | **Output:** 1
  - **Explanation:** remove [1,3] and the rest are non-overlapping.
- **Example 2**
  - **Input:** intervals = [[1,2],[1,2],[1,2]] | **Output:** 2
  - **Explanation:** remove two of the three duplicates.

**Constraints:** `1 ≤ n ≤ 10⁵`, `-5×10⁴ ≤ start_i < end_i ≤ 5×10⁴`.

**Approach.** The trap: this is greedy-by-**end** time, not the usual sort-by-start. Sort by end; walk left to right keeping track of the last kept interval's end. Whenever the next interval's start is before that end, it must be removed (greedily keeping the interval that frees up the earliest end time for future intervals is provably optimal). Count removals instead of building a merged list.

```python
def erase_overlap_intervals(intervals: list[list[int]]) -> int:
    if not intervals:
        return 0
    intervals.sort(key=lambda x: x[1])
    removals = 0
    last_end = intervals[0][1]
    for start, end in intervals[1:]:
        if start < last_end:
            removals += 1
        else:
            last_end = end
    return removals
```

**Complexity.** O(n log n) time (sort dominates), O(1) extra space.

**Duplicate problems:**
- Minimum Number of Arrows to Burst Balloons (LC 452) - identical sort-by-end greedy sweep; counts arrows (groups) instead of removals, but the same core loop.

---

### 4. Interval List Intersections (LC 986)

Given two lists `firstList` and `secondList` of closed, pairwise-disjoint, sorted intervals, return the list of their pairwise intersections. Constraints: `0 ≤ n, m ≤ 1000`, `-10⁹ ≤ start_i ≤ end_i ≤ 10⁹`.

**Worked examples:**
- **Example 1**
  - **Input:** first = [[0,2],[5,10],[13,23],[24,25]], second = [[1,5],[8,12],[15,24],[25,26]] | **Output:** [[1,2],[5,5],[8,10],[15,23],[24,24],[25,25]]
- **Example 2**
  - **Input:** first = [[1,3],[5,9]], second = [] | **Output:** []

**Constraints:** `0 ≤ n, m ≤ 1000`, `-10⁹ ≤ start_i ≤ end_i ≤ 10⁹`.

**Approach.** This is Two Pointers, not a merge sweep - each list is already internally sorted and disjoint, so walk one index into each list independently. At every step, the candidate intersection is `[max(a.start, b.start), min(a.end, b.end)]`; keep it only if that range is valid (`start <= end`). Advance whichever interval has the smaller end, since by definition it cannot intersect anything further along in the *other* list.

```python
def interval_intersection(first: list[list[int]], second: list[list[int]]) -> list[list[int]]:
    i = j = 0
    result: list[list[int]] = []
    while i < len(first) and j < len(second):
        lo = max(first[i][0], second[j][0])
        hi = min(first[i][1], second[j][1])
        if lo <= hi:
            result.append([lo, hi])
        if first[i][1] < second[j][1]:
            i += 1
        else:
            j += 1
    return result
```

**Complexity.** O(n + m) time, O(1) extra space beyond the output (no sort needed - both inputs are pre-sorted).

**Duplicate problems:**
- Merge Sorted Array (LC 88) - same "two sorted sequences, one advancing pointer per side" shape, applied to values instead of ranges.
- Find Right Interval (LC 436) - different mechanic (binary search per query) but same family of "match up intervals from related sorted collections."

