# Two Heaps

## Prerequisites

- [Heap](../data-structures/heap.md) [Must read] - the entire pattern is two heaps working in concert; you need push, pop, peek, and the heap property cold.
- [Top-K Elements](./top-k-elements.md) [Should read] - sibling pattern that uses one heap; two-heaps extends the idea to maintain a partition rather than a fixed-size window.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
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

The **two-heaps** pattern maintains a running partition of a data stream into two halves — a **max-heap of the lower half** and a **min-heap of the upper half** — so the median (or any partition-point statistic) is always one or two heap peeks away.

Mental model: **two back-to-back sorted piles, each with its top card face-up.** The left pile is sorted descending (max-heap, so the largest of the small values is visible); the right pile is sorted ascending (min-heap, so the smallest of the large values is visible). The median lives at the boundary — either the top of one pile (odd total) or the average of both tops (even total).

> **Takeaway (say this out loud):** "Two heaps split the stream at the median — max-heap holds the lower half, min-heap the upper half, balanced so the tops give the median in O(1) after O(log n) inserts."

## Recognition signals

### (a) Trigger phrases

- "Find the **median** of a data stream" / "running median as elements arrive"
- "**Sliding window median** — median of the last k elements"
- "Given a stream of integers, return the median after each insertion"
- "Find the **weighted median** / **k-th quantile** of a dynamic dataset"

### (b) Structural cues

- **Input:** a stream (or array processed left-to-right) of numbers arriving one at a time, or a fixed array where you need the median of a moving window.
- **Output property:** the median (or a fixed partition-point statistic) must be available after every insertion — not just once at the end.
- **Key shape:** you need O(1) or O(log n) access to *both* the maximum of one half *and* the minimum of the other half simultaneously. No single sorted structure gives O(1) to both simultaneously without extra structure.

### (c) Not to be confused with

- **Top-K Elements (one heap):** one heap finds the k-th largest in a stream; two heaps find the middle — use top-K when the partition point is fixed and one-sided, two-heaps when it must track the center of an expanding (or sliding) dataset.
- **Sliding Window (two pointers):** sliding window finds subarrays satisfying a constraint; two-heaps tracks a running statistic across the whole seen stream. The confusion arises when combining both (sliding window median) — the outer loop is a window, the inner structure is two heaps.
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

**Why the rebalance is O(log n):** each insert is at most two heap operations (one push + one push/pop pair for rebalancing) — each O(log n).

## Skeleton

**Pseudocode (CLRS style):**

```
MedianFinder-Init():
    lo ← MaxHeap()       ▷ lower half
    hi ← MinHeap()       ▷ upper half

MedianFinder-Add(num):
    if lo is empty or num ≤ lo.top
        lo.push(num)
    else
        hi.push(num)
    ▷ rebalance so |lo| - |hi| ∈ {0, 1}
    if |lo| > |hi| + 1
        hi.push(lo.pop())
    else if |hi| > |lo|
        lo.push(hi.pop())

MedianFinder-GetMedian() → float:
    if |lo| > |hi|
        return lo.top
    return (lo.top + hi.top) / 2.0
```

**Python template:**

```python
import heapq

class MedianFinder:
    def __init__(self) -> None:
        self._lo: list[int] = []   # max-heap (negate values)
        self._hi: list[int] = []   # min-heap

    def add_num(self, num: int) -> None:
        # push to correct half
        if not self._lo or num <= -self._lo[0]:
            heapq.heappush(self._lo, -num)
        else:
            heapq.heappush(self._hi, num)
        # rebalance
        if len(self._lo) > len(self._hi) + 1:
            heapq.heappush(self._hi, -heapq.heappop(self._lo))
        elif len(self._hi) > len(self._lo):
            heapq.heappush(self._lo, -heapq.heappop(self._hi))

    def find_median(self) -> float:
        if len(self._lo) > len(self._hi):
            return float(-self._lo[0])
        return (-self._lo[0] + self._hi[0]) / 2.0

    # --- adapt here for your specific problem ---
    # your logic here
```

Python's `heapq` is a **min-heap only**. Simulate a max-heap by **negating values** on push and negating again on pop/peek. This is the standard Python two-heaps idiom — always negate `lo` entries.

## Complexity

| Operation | Time | Space |
|-----------|------|-------|
| `add_num` | O(log n) | O(1) amortized |
| `find_median` | O(1) | O(1) |
| Space (n elements total) | — | O(n) |

**Cache behavior:** Python's `heapq` is a list under the hood — `heappush`/`heappop` access indices `2i+1` and `2i+2`, which stay in L1 cache at small n. At n > 10⁶ the heap's random-access sift pattern on a large list causes L2/L3 cache misses on every swap; at that scale a van Emde Boas layout or a cache-oblivious priority queue outperforms a standard binary heap despite the same O(log n) bound.

## Constraints & approach

| n (stream length) | Approach |
|-------------------|----------|
| n ≤ 10³ | Sort the seen list each query — O(n log n) per query, trivial code |
| n ≤ 10⁵, one-shot median | Sort once — O(n log n), done |
| n ≤ 10⁵, median after each insert | **Two heaps** — O(n log n) total, O(1) per query |
| n ≤ 10⁵, sliding window median (window k) | Two heaps + lazy deletion — O(n log k) |
| n ≤ 10⁶, order-statistics needed (rank queries, k-th element) | Augmented BST / order-statistics tree — O(log n) per op, but constant factor larger than two heaps for median-only |

**When the constraint pushes you off two heaps:**
- If you need the **k-th smallest for arbitrary k** (not just the median), two heaps don't generalize — use an order-statistics tree or a Fenwick tree on coordinate-compressed values.
- If the **window slides** (elements enter and leave), two heaps require lazy deletion (mark-and-ignore), which is trickier; a sorted structure (`SortedList`) may be cleaner at the cost of a larger constant.

**Real-world usage:** Apache Flink and Kafka Streams use two-heaps-style exact quantile tracking for low-latency streaming percentile metrics (p50/p99 dashboards). **At scale:** at n > 10⁷ events per second, maintaining exact two heaps becomes a bottleneck — the heap's O(log n) per insert with high constant dominates. Production systems replace exact two-heaps with approximate sketches (DDSketch, t-digest) that give p99 within ±1% error in O(1) amortized inserts and constant space.

## Variations

- **Sliding window median:** outer loop slides a window of size k. On each slide, add the new element and lazy-delete the element leaving. Lazy deletion: keep a `to_remove` counter map; skip deleted elements when they surface at a heap top. Requires rebalancing after each add and each delete.
- **Weighted median:** each element has a weight; the median is where cumulative weight first exceeds total/2. Two heaps with a running weight sum per heap; rebalance by weight, not count.
- **k-th quantile (not just median):** maintain the partition point at position k rather than n/2. The lo heap has exactly k elements; hi has n − k. Works identically — just change the rebalance target.
- **Two heaps on a fixed array (offline):** sort elements by value, assign to lo/hi by position; useful when all elements are known upfront and queries are static.

## CP-primitives

### Lazy deletion for sliding windows

In contests, `heapq` has no `remove` operation. When an element leaves the window, add it to a `garbage` counter-map. When the top of a heap is in `garbage`, pop and discard until the top is clean. This gives O(log k) amortized per slide.

**Why for CP:** eliminates the need for a balanced BST (unavailable in Python stdlib) for sliding-window median; the lazy approach runs fast enough for n ≤ 10⁵ in Python.

```python
from collections import defaultdict
import heapq

class SlidingMedian:
    def __init__(self) -> None:
        self._lo: list[int] = []
        self._hi: list[int] = []
        self._garbage: dict[int, int] = defaultdict(int)
        self._lo_size = self._hi_size = 0  # effective sizes (excluding garbage)

    def _clean(self, heap: list[int], negate: bool) -> None:
        while heap:
            val = -heap[0] if negate else heap[0]
            if self._garbage[val]:
                self._garbage[val] -= 1
                heapq.heappop(heap)
            else:
                break

    def add(self, num: int) -> None:
        if not self._lo or num <= -self._lo[0]:
            heapq.heappush(self._lo, -num)
            self._lo_size += 1
        else:
            heapq.heappush(self._hi, num)
            self._hi_size += 1
        self._rebalance()

    def remove(self, num: int) -> None:
        self._garbage[num] += 1
        if num <= -self._lo[0]:
            self._lo_size -= 1
        else:
            self._hi_size -= 1
        self._rebalance()

    def _rebalance(self) -> None:
        self._clean(self._lo, negate=True)
        self._clean(self._hi, negate=False)
        if self._lo_size > self._hi_size + 1:
            self._clean(self._lo, negate=True)
            heapq.heappush(self._hi, -heapq.heappop(self._lo))
            self._lo_size -= 1
            self._hi_size += 1
        elif self._hi_size > self._lo_size:
            self._clean(self._hi, negate=False)
            heapq.heappush(self._lo, -heapq.heappop(self._hi))
            self._hi_size -= 1
            self._lo_size += 1

    def median(self) -> float:
        self._clean(self._lo, negate=True)
        self._clean(self._hi, negate=False)
        if self._lo_size > self._hi_size:
            return float(-self._lo[0])
        return (-self._lo[0] + self._hi[0]) / 2.0
```

### Order-statistics tree as an alternative

Python's `sortedcontainers.SortedList` gives O(log n) insert, delete, and index — effectively an order-statistics tree. For sliding window median it's often simpler: `sl[len(sl) // 2]` is the median directly. **Why for CP:** eliminates the lazy-deletion complexity at the cost of a slightly larger constant; useful when the problem combines median with rank queries.

```python
from sortedcontainers import SortedList

class SortedMedian:
    def __init__(self) -> None:
        self.sl: SortedList[int] = SortedList()

    def add(self, num: int) -> None:
        self.sl.add(num)

    def remove(self, num: int) -> None:
        self.sl.remove(num)

    def median(self) -> float:
        n = len(self.sl)
        mid = n // 2
        return float(self.sl[mid]) if n % 2 else (self.sl[mid - 1] + self.sl[mid]) / 2.0
```

## Worked problems

### 1. Find Median from Data Stream (LC 295)

Design a data structure supporting `addNum(int num)` and `findMedian() → float`. The median of an even-length stream is the average of the two middle values. n ≤ 5 × 10⁴ numbers, values up to ±10⁶.

**Approach (n ≤ 5 × 10⁴):** two heaps as in the skeleton above — O(log n) per add, O(1) per query. The constraint confirms this: at 5 × 10⁴ elements with log factor, total work is well within a second. Use the negation trick for Python's min-heap-only `heapq`.

### 2. Sliding Window Median (LC 480)

Given array `nums` and window size `k`, return the median of each window of size k as the window slides from left to right. `1 ≤ k ≤ n ≤ 10⁵`, values up to ±2³¹.

**Approach (n ≤ 10⁵, sliding window):** two heaps + lazy deletion (see CP-primitives). On each step, add `nums[right]` and remove `nums[right - k]`. After rebalancing, read the median from heap tops. The lazy deletion avoids O(k) linear removal at each step — O(n log k) total. Values near ±2³¹ fit in Python ints natively; in C++ use `long long` for the median average to avoid overflow.

### 3. IPO (LC 502) — maximize capital

Given n projects each with `profit[i]` and `capital[i]`, and k project slots starting with initial capital w, greedily pick the available project with highest profit at each step. n ≤ 10⁵.

**Approach:** two heaps with different roles — a min-heap on capital (all projects sorted by cost) and a max-heap on profit (currently affordable projects). Each round: pop all projects with `capital[i] ≤ w` from the min-heap into the max-heap, then pick the max-profit one. This is two heaps used as a "gating" structure rather than a median partition — the same pattern of maintaining a dynamic affordable set and extracting the best from it. O(n log n) total.

### 4. Maximize Capital After k Investments (variant of IPO)

Same as IPO but projects have a deadline — project i is only available during time window `[avail_i, deadline_i]`. n ≤ 10³.

**Approach (n ≤ 10³):** at each time step, add projects whose `avail` has arrived to the profit max-heap, and remove (lazy-delete) any that have passed their deadline. The time-windowed availability turns this into a sliding-window two-heaps problem. At n ≤ 10³ a sorted list scan per step is also acceptable.

### 5. Find Right Interval (LC 436)

Given a set of intervals, for each interval find the interval with the smallest start point ≥ its end point. n ≤ 2 × 10⁴.

**Approach:** not a pure two-heaps problem — sort by start, binary-search for each end. Included here because it's frequently confused with interval-tree or two-heaps problems in recognition. The distinguishing signal: you're looking up a single next-interval, not maintaining a running median or affordable set. Reach for sorted array + `bisect` here, not two heaps.

## Pitfalls

- **Forgetting to negate in Python.** Python's `heapq` is a min-heap. `lo` (max-heap of lower half) must store `-num`. Forgetting to negate — or negating when reading `lo[0]` — produces silently wrong medians. Always: `heappush(lo, -num)` and `median = -lo[0]`.
- **Off-by-one in rebalance direction.** The invariant is `|lo| == |hi|` or `|lo| == |hi| + 1` (lo holds the extra element on odd count). Rebalancing to `|hi| > |lo|` by mistake means `find_median` reads from `hi[0]` instead of `lo[0]` and returns the wrong value. Always keep lo as the "leading" heap.
- **Lazy deletion: forgetting to clean before reading.** When using lazy deletion for sliding windows, always clean stale tops before reading the median. A common bug is cleaning on add/remove but not on `median()` — if the last few operations were removes, the top of lo/hi might be garbage.
- **Sliding window: values near integer overflow.** When averaging two middle values — `(lo_top + hi_top) / 2` — if values can be near ±2³¹ (as in LC 480), the sum overflows a 32-bit int. In Python this is invisible (arbitrary ints), but in C++/Java always cast to `long` before adding.

## First 30 seconds

"This is a two-heaps problem — I need a running median (or partition-point statistic) over a stream. I'll maintain a max-heap `lo` of the lower half and a min-heap `hi` of the upper half, keeping them balanced so sizes differ by at most one. Insert goes into the correct half, then I rebalance with at most one push-pop pair. Median is `lo.top` if sizes differ, else the average of both tops — O(log n) insert, O(1) query. In Python I negate values in `lo` to simulate a max-heap with `heapq`."

## Related

- [Heap](../data-structures/heap.md) — the underlying structure; understand push/pop/peek and the heap property.
- [Top-K Elements](./top-k-elements.md) — sibling pattern; one heap finds the k-th largest, two heaps find the center.
- [Sliding Window](./sliding-window.md) — outer loop for the sliding-window median variant; two heaps handle the inner statistic.
- [Binary Search on Answer](./binary-search-on-answer.md) — alternative for offline k-th quantile: binary-search on the answer and count elements ≤ mid.

## Practice problems

### 1. Find Median from Data Stream (LC 295)

Implement `addNum(int num)` and `findMedian() → float` for a growing stream. Median of even-length is the average of the two middle values. n ≤ 5 × 10⁴.

**Approach:** standard two-heaps skeleton — max-heap `lo` for lower half, min-heap `hi` for upper half. Insert into correct half, rebalance, read tops. O(log n) per add, O(1) per query.

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
- Running Average of Data Stream (not on LC) — trivial running sum; do not confuse with median.
- Kth Largest Element in a Stream (LC 703) — one min-heap of size k; not two heaps, different partition point.

### 2. Sliding Window Median (LC 480)

Given `nums` (n ≤ 10⁵) and window size k, return the median of each k-sized window as it slides. Values can be ±2³¹.

**Approach:** two heaps + lazy deletion. Add incoming element, lazy-remove outgoing element, rebalance by effective sizes. Cast to float for the average to handle near-overflow values.

```python
import heapq
from collections import defaultdict
from typing import List

def medianSlidingWindow(nums: List[int], k: int) -> List[float]:
    lo: list[int] = []   # max-heap (negated)
    hi: list[int] = []   # min-heap
    garbage: dict[int, int] = defaultdict(int)
    lo_size = hi_size = 0

    def _clean_top(heap: list[int], negate: bool) -> None:
        while heap:
            top = -heap[0] if negate else heap[0]
            if garbage[top]:
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

**Duplicate problems:**
- Maximum of Sliding Window (LC 239) — same sliding window frame, but max not median; use a monotonic deque instead.
- Minimum Window Substring (LC 76) — sliding window with a constraint; pattern is sliding window, not two heaps.

### 3. IPO (LC 502)

n projects, each with `profits[i]` and `capital[i]`. Starting capital w, do at most k projects. Each project adds its profit to w. Maximize final capital. n ≤ 10⁵, k ≤ 10⁵.

**Approach:** min-heap on (capital, profit) for all projects; max-heap for available profits. Each round: push all affordable projects to the profit max-heap, pick the best. O(n log n + k log n).

```python
import heapq
from typing import List

def findMaximizedCapital(k: int, w: int, profits: List[int], capital: List[int]) -> int:
    projects = sorted(zip(capital, profits))   # sort by required capital
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
- Task Scheduler (LC 621) — greedy with a max-heap of frequencies; same "pick the most abundant available" structure.
- Reorganize String (LC 767) — place most-frequent characters greedily; max-heap, not two heaps.
