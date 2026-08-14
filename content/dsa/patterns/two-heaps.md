# Two Heaps

## Prerequisites

- [Heap](../data-structures/heap.md) [Must read]
- [Top-K Elements](./top-k-elements.md) [Should read]

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
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

## What it is

The **two-heaps** pattern maintains a running partition of a data stream into two halves - a **max-<abbr>heap</abbr> of the lower half** and a **min-heap of the upper half** - so the median (or any partition-point statistic) is always one or two heap peeks away.

Mental model: **two back-to-back sorted piles, each with its top card face-up.** The left pile is sorted descending (max-heap, so the largest of the small values is visible); the right pile is sorted ascending (min-heap, so the smallest of the large values is visible). The median lives at the boundary - either the top of one pile (odd total) or the average of both tops (even total).

> **Takeaway (say this out loud):** "Two heaps split the stream at the median - max-heap holds the lower half, min-heap the upper half, balanced so the tops give the median in O(1) after O(log n) inserts."

## Recognition signals

### (a) Trigger phrases

- "Find the **median** of a data stream" / "running median as elements arrive"
- "**Sliding window median** - median of the last k elements"
- "Given a stream of integers, return the median after each insertion"
- "Find the **weighted median** / **k-th quantile** of a dynamic dataset"

### (b) Structural cues

- **Input:** a stream (or array processed left-to-right) of numbers arriving one at a time, or a fixed array where you need the median of a moving window.
- **Output property:** the median (or a fixed partition-point statistic) must be available after every insertion - not just once at the end.
- **Key shape:** you need O(1) or O(log n) access to *both* the maximum of one half *and* the minimum of the other half simultaneously. No single sorted structure gives O(1) to both simultaneously without extra structure.

### (c) Not to be confused with

- **Top-K Elements (one heap):** one heap finds the k-th largest in a stream; two heaps find the middle - use top-K when the partition point is fixed and one-sided, two-heaps when it must track the center of an expanding (or sliding) dataset.
- **<abbr>Sliding Window</abbr> (two pointers):** sliding window finds subarrays satisfying a constraint; two-heaps tracks a running statistic across the whole seen stream. The confusion arises when combining both (sliding window median) - the outer loop is a window, the inner structure is two heaps.
- **Sorting:** sorting gives the median once in O(n log n) but can't update in O(log n) per element; two-heaps trades space (two heaps) for O(log n) per update.

## How it works

Maintain two heaps, always keeping them **balanced (sizes differ by at most 1)** and **partitioned (every element in the max-heap ≤ every element in the min-heap)**:

```
Stream: 5, 3, 8, 1, 7

After 5:    lo=[5]        hi=[]         median=5
After 3:    lo=[3]        hi=[5]        median=(3+5)/2=4.0
After 8:    lo=[3,5]      hi=[8]        median=5
After 1:    lo=[1,3]      hi=[5,8]      median=(3+5)/2=4.0
After 7:    lo=[1,3,5]    hi=[7,8]      median=5

lo = max-heap (shown as sorted list, largest = top)
hi = min-heap (shown as sorted list, smallest = top)
```

**Insert algorithm:**
1. If `num ≤ lo.top` (or lo is empty): push to `lo`.
2. Else: push to `hi`.
3. **Rebalance:** if `|lo| > |hi| + 1` → move `lo.top` to `hi`. If `|hi| > |lo|` → move `hi.top` to `lo`.

Invariant after each insert: `len(lo) == len(hi)` or `len(lo) == len(hi) + 1`. The median is `lo.top` (odd total) or `(lo.top + hi.top) / 2` (even total).

**Why the rebalance is O(log n):** each insert is at most two heap operations (one push + one push/pop pair for rebalancing) - each O(log n).

## Complexity

| Operation | Time | Space |
|-----------|------|-------|
| `add_num` | O(log n) | O(1) amortized |
| `find_median` | O(1) | O(1) |
| Space (n elements total) | - | O(n) |

**Cache behavior:** Python's `heapq` is a list under the hood - `heappush`/`heappop` access indices `2i+1` and `2i+2`, which stay in L1 cache at small n. At n > 10⁶ the heap's random-access sift pattern on a large list causes L2/L3 cache misses on every swap; at that scale a van Emde Boas layout or a cache-oblivious priority queue outperforms a standard binary heap despite the same O(log n) bound.

## Constraints & approach

| n (stream length) | Approach |
|-------------------|----------|
| n ≤ 10³ | Sort the seen list each query - O(n log n) per query, trivial code |
| n ≤ 10⁵, one-shot median | Sort once - O(n log n), done |
| n ≤ 10⁵, median after each insert | **Two heaps** - O(n log n) total, O(1) per query |
| n ≤ 10⁵, sliding window median (window k) | Two heaps + lazy deletion - O(n log k) |
| n ≤ 10⁶, order-statistics needed (rank queries, k-th element) | Augmented BST / order-statistics tree - O(log n) per op, but constant factor larger than two heaps for median-only |

**When the constraint pushes you off two heaps:**
- If you need the **k-th smallest for arbitrary k** (not just the median), two heaps don't generalize - use an order-statistics tree or a Fenwick tree on coordinate-compressed values.
- If the **window slides** (elements enter and leave), two heaps require lazy deletion (mark-and-ignore), which is trickier; a sorted structure (`SortedList`) may be cleaner at the cost of a larger constant.

**Real-world usage:** Apache Flink and Kafka Streams use two-heaps-style exact quantile tracking for low-latency streaming percentile metrics (p50/p99 dashboards). **At scale:** at n > 10⁷ events per second, maintaining exact two heaps becomes a bottleneck - the heap's O(log n) per insert with high constant dominates. Production systems replace exact two-heaps with approximate sketches (DDSketch, t-digest) that give p99 within ±1% error in O(1) <abbr>amortized</abbr> inserts and constant space.

## Variations

- **<abbr>Sliding window</abbr> median:** outer loop slides a window of size k. On each slide, add the new element and lazy-delete the element leaving. Lazy deletion: keep a `to_remove` counter map; skip deleted elements when they surface at a heap top. Requires rebalancing after each add and each delete.
- **Weighted median:** each element has a weight; the median is where cumulative weight first exceeds total/2. Two heaps with a running weight sum per heap; rebalance by weight, not count.
- **k-th quantile (not just median):** maintain the partition point at position k rather than n/2. The lo heap has exactly k elements; hi has n − k. Works identically - just change the rebalance target.
- **Two heaps on a fixed array (offline):** sort elements by value, assign to lo/hi by position; useful when all elements are known upfront and queries are static.

## Pitfalls

- **Forgetting to negate in Python.** Python's `heapq` is a min-heap. `lo` (max-heap of lower half) must store `-num`. Forgetting to negate - or negating when reading `lo[0]` - produces silently wrong medians. Always: `heappush(lo, -num)` and `median = -lo[0]`.
- **Off-by-one in rebalance direction.** The invariant is `|lo| == |hi|` or `|lo| == |hi| + 1` (lo holds the extra element on odd count). Rebalancing to `|hi| > |lo|` by mistake means `find_median` reads from `hi[0]` instead of `lo[0]` and returns the wrong value. Always keep lo as the "leading" heap.
- **Lazy deletion: forgetting to clean before reading.** When using lazy deletion for sliding windows, always clean stale tops before reading the median. A common bug is cleaning on add/remove but not on `median()` - if the last few operations were removes, the top of lo/hi might be garbage.
- **Sliding window: values near integer overflow.** When averaging two middle values - `(lo_top + hi_top) / 2` - if values can be near ±2³¹ (as in LC 480), the sum overflows a 32-bit int. In Python this is invisible (arbitrary ints), but in C++/Java always cast to `long` before adding.

## First 30 seconds

"This is a two-heaps problem - I need a running median (or partition-point statistic) over a stream. I'll maintain a max-heap `lo` of the lower half and a min-heap `hi` of the upper half, keeping them balanced so sizes differ by at most one. Insert goes into the correct half, then I rebalance with at most one push-pop pair. Median is `lo.top` if sizes differ, else the average of both tops - O(log n) insert, O(1) query. In Python I negate values in `lo` to simulate a max-heap with `heapq`."

## Related

- [Heap](../data-structures/heap.md) - the underlying structure; understand push/pop/peek and the heap property.
- [Top-K Elements](./top-k-elements.md) - sibling pattern; one heap finds the k-th largest, two heaps find the center.
- [Sliding Window](./sliding-window.md) - outer loop for the sliding-window median variant; two heaps handle the inner statistic.
- [Binary Search on Answer](./binary-search-on-answer.md) - alternative for offline k-th quantile: binary-search on the answer and count elements ≤ mid.

## Practice problems

### 1. Find Median from Data Stream (LC 295)

Implement `addNum(int num)` and `findMedian() → float` for a growing stream. Median of even-length is the average of the two middle values. n ≤ 5 × 10⁴.

**Worked examples:**
- **Example 1**
  - **Input:** addNum(1), addNum(2), findMedian() | **Output:** 1.5
- **Example 2**
  - **Input:** addNum(3), findMedian() | **Output:** 2.0
  - **Explanation:** stream is now [1,2,3], median is the middle value.

**Constraints:** `-10⁵ ≤ num ≤ 10⁵`, up to `5×10⁴` calls to `addNum` and `findMedian`.

**Approach:** standard two-heaps skeleton - max-<abbr>heap</abbr> `lo` for lower half, min-heap `hi` for upper half. Insert into correct half, rebalance, read tops. O(log n) per add, O(1) per query.

```python
import heapq

class MedianFinder:
    def __init__(self) -> None:
        self._lo: list[int] = []   # max-heap (negated)
        self._hi: list[int] = []   # min-heap

    def addNum(self, num: int) -> None:
        if not self._lo or num <= -self._lo[0]:
            heapq.heappush(self._lo, -num)
        else:
            heapq.heappush(self._hi, num)
        if len(self._lo) > len(self._hi) + 1:
            heapq.heappush(self._hi, -heapq.heappop(self._lo))
        elif len(self._hi) > len(self._lo):
            heapq.heappush(self._lo, -heapq.heappop(self._hi))

    def findMedian(self) -> float:
        if len(self._lo) > len(self._hi):
            return float(-self._lo[0])
        return (-self._lo[0] + self._hi[0]) / 2.0
```

**Complexity:** O(log n) per `addNum`, O(1) `findMedian`, O(n) space.

**Duplicate problems:**
- Running Average of Data Stream (not on LC) - trivial running sum; do not confuse with median.
- Kth Largest Element in a Stream (LC 703) - one min-heap of size k; not two heaps, different partition point.

### 2. Sliding Window Median (LC 480)

Given `nums` (n ≤ 10⁵) and window size k, return the median of each k-sized window as it slides. Values can be ±2³¹.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [1,3,-1,-3,5,3,6,7], k = 3 | **Output:** [1.0,-1.0,-1.0,3.0,5.0,6.0]
- **Example 2**
  - **Input:** nums = [1,2,3,4,2,3,1,4,2], k = 3 | **Output:** [2.0,3.0,3.0,3.0,2.0,3.0,2.0]

**Constraints:** `1 ≤ k ≤ n ≤ 10⁵`, `-2³¹ ≤ nums[i] ≤ 2³¹-1`.

**Approach:** two heaps + lazy deletion. Add incoming element, lazy-remove outgoing element, rebalance by effective sizes. Cast to float for the average to handle near-overflow values.

```python
import heapq
from typing import List

def medianSlidingWindow(nums: List[int], k: int) -> List[float]:
    lo: list[int] = []   # max-heap (negated)
    hi: list[int] = []   # min-heap
    garbage: dict[int, int] = {}
    lo_size = hi_size = 0

    def _clean_top(heap: list[int], negate: bool) -> None:
        while heap:
            top = -heap[0] if negate else heap[0]
            if garbage.get(top, 0):
                garbage[top] -= 1
                heapq.heappop(heap)
            else:
                break

    def _add(num: int) -> None:
        nonlocal lo_size, hi_size
        if not lo or num <= -lo[0]:
            heapq.heappush(lo, -num); lo_size += 1
        else:
            heapq.heappush(hi, num); hi_size += 1
        _rebalance()

    def _remove(num: int) -> None:
        nonlocal lo_size, hi_size
        garbage[num] += 1
        if num <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1
        _rebalance()

    def _rebalance() -> None:
        nonlocal lo_size, hi_size
        _clean_top(lo, True); _clean_top(hi, False)
        if lo_size > hi_size + 1:
            heapq.heappush(hi, -heapq.heappop(lo))
            lo_size -= 1; hi_size += 1
            _clean_top(lo, True)
        elif hi_size > lo_size:
            heapq.heappush(lo, -heapq.heappop(hi))
            hi_size -= 1; lo_size += 1
            _clean_top(hi, False)

    def _median() -> float:
        _clean_top(lo, True); _clean_top(hi, False)
        if lo_size > hi_size:
            return float(-lo[0])
        return (-lo[0] + hi[0]) / 2.0

    result: list[float] = []
    for i, num in enumerate(nums):
        _add(num)
        if i >= k:
            _remove(nums[i - k])
        if i >= k - 1:
            result.append(_median())
    return result
```

**Complexity:** O(n log k) time, O(k) space (effective heap sizes).

**Note on alternatives:** `sortedcontainers.SortedList` (`O(log n)` insert/delete/index, `sl[len(sl)//2]` gives the median directly) removes the lazy-deletion bookkeeping above at the cost of a larger constant - worth it when the problem also needs rank queries, not just the median. Use the hand-rolled lazy-deletion heap solution for contest submissions where third-party packages aren't available.

**Duplicate problems:**
- Maximum of Sliding Window (LC 239) - same sliding window frame, but max not median; use a monotonic deque instead.
- Minimum Window Substring (LC 76) - sliding window with a constraint; pattern is sliding window, not two heaps.
- Count of Smaller Numbers After Self (LC 315) - same lazy-deletion-avoidant rank-query need; solved with an order-statistics structure (BIT or `SortedList`) instead of two heaps, illustrating the alternative-tool tradeoff.

### 3. IPO (LC 502)

n projects, each with `profits[i]` and `capital[i]`. Starting capital w, do at most k projects. Each project adds its profit to w. Maximize final capital. n ≤ 10⁵, k ≤ 10⁵.

**Worked examples:**
- **Example 1**
  - **Input:** k = 2, w = 0, profits = [1,2,3], capital = [0,1,1] | **Output:** 4
  - **Explanation:** start with project 0 (capital 0 ≤ w=0), gain 1, w=1; then project 2 (capital 1 ≤ w=1), gain 3, w=4.
- **Example 2**
  - **Input:** k = 3, w = 0, profits = [1,2,3], capital = [0,1,2] | **Output:** 6

**Constraints:** `1 ≤ k ≤ 10⁵`, `0 ≤ w ≤ 10⁹`, `n == profits.length == capital.length`, `1 ≤ n ≤ 10⁵`.

**Approach:** min-heap on (capital, profit) for all projects; max-heap for available profits. Each round: push all affordable projects to the profit max-heap, pick the best. O(n log n + k log n).

```python
import heapq
from typing import List

def findMaximizedCapital(k: int, w: int, profits: List[int], capital: List[int]) -> int:
    projects = sorted(zip(capital, profits))
    available: list[int] = []                  # max-heap of profits (negated)
    i = 0
    for _ in range(k):
        while i < len(projects) and projects[i][0] <= w:
            heapq.heappush(available, -projects[i][1])
            i += 1
        if not available:
            break
        w += -heapq.heappop(available)
    return w
```

**Complexity:** O(n log n) sort + O((n + k) log n) heap ops = O((n + k) log n) total.

**Duplicate problems:**
- Reorganize String (LC 767) - place most-frequent characters greedily; max-heap, not two heaps.
