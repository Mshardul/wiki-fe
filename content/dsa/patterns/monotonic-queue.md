# Monotonic Queue

## Prerequisites

- [Deque](../data-structures/deque.md) [Must read]
- [Monotonic Stack](./monotonic-stack.md) [Should read]
- [Sliding Window](./sliding-window.md) [Should read]

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

## What it is

A **monotonic queue** is a [deque](../data-structures/deque.md) kept strictly increasing or decreasing (by value) from front to back, used to answer **"what's the max/min over every window"** in O(n) total instead of O(n·k) or O(n log k).

Mental model: **a queue of "still-relevant" candidates, front-to-back from most-extreme to least.** Every element that enters evicts the weaker candidates already lined up behind it - so the queue never needs to hold anything that can't possibly win.

> **Takeaway (say this out loud):** "A monotonic queue is a deque that only keeps candidates who can still win - dominated values get evicted from the back on the way in, stale ones from the front on the way out."

## Recognition signals

### (a) Trigger phrases

- "maximum/minimum of every sliding window of size k"
- "maximum in every subarray of length k"

### (b) Structural cues

- A contiguous window (fixed or variable size) slides over an array/string.
- The question asks for an **extremum** (max or min) over the window, evaluated **repeatedly** as the window moves - not once.
- Brute force is O(n·k) (rescan the window each time) or a <abbr>heap</abbr> gives O(n log k); the array is large enough (`n` up to `10^5`–`10^6`) that both are too slow or unnecessarily complex.

### (c) Not to be confused with

| Pattern | Distinction |
|---|---|
| [Monotonic Stack](./monotonic-stack.md) | Stack answers "next greater/smaller element" for each index looking **one direction, unbounded** (until the answer is found or the array ends) - no window, no eviction from a second end. Queue answers windowed extremum, needs *two*-ended eviction (stale index expires **and** dominated value is popped). |
| [Two Heaps](./two-heaps.md) | Heaps track the **median** (an interior order statistic) with lazy deletion; a monotonic queue can only ever report the **max or min**, never a middle rank - see [deque.md's sliding-window-median counterexample](../data-structures/deque.md#4-sliding-window-median--why-a-deque-is-not-enough) for exactly where a deque stops being enough. |
| [Sliding Window (general)](./sliding-window.md) | Sliding window is the umbrella recognition pattern (shrink/grow on *any* constraint - sum, distinct count, extremum). Monotonic queue is the specific *data-structure engine* you plug in only when the constraint being tracked is a max/min. |

## How it works

Maintain a deque of **indices**, ordered so that `nums[dq[0]]` is always the current window's extremum. On each new index `i`:

1. **Evict dominated candidates from the back.** While the value at the back is `≤` (for max) the incoming value, pop it - it can never be the max again while `nums[i]` is in the window, so it's dead weight.
2. **Push `i`** onto the back.
3. **Evict expired candidates from the front.** If `dq[0]` has slid outside the window (`dq[0] == i - k`), pop it.
4. **Read the front** - it's the extremum for the current window.

```
nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3

i=0  push 1                    dq(idx): [0]              window not full yet
i=1  3 >= nums[0]=1, pop 0      dq(idx): [1]              (1 evicted - dominated)
     push 1
i=2  -1 < nums[1]=3, keep       dq(idx): [1,2]            window [0,1,2] -> max = nums[1] = 3
i=3  -3 < nums[2]=-1, keep      dq(idx): [1,2,3]
     dq[0]=1 == 3-3? no                                    window [1,2,3] -> max = nums[1] = 3
i=4  5 >= nums[3]=-3, pop 3
     5 >= nums[2]=-1, pop 2
     5 >= nums[1]=3,  pop 1     dq(idx): [4]               (1,2,3 all evicted - 5 dominates all)
     dq[0]=4 == 4-3? no                                    window [2,3,4] -> max = nums[4] = 5
```

Each index is pushed exactly once and popped at most once (from either end) across the whole run - that's the O(n) argument, not "it feels linear."

## Complexity

**O(n) time, O(k) space** - each of the `n` indices is pushed once and popped at most once total (across both ends), so the <abbr>amortized</abbr> per-element work is O(1) despite the `while` loop. Space is bounded by the window size `k` since stale/dominated indices never accumulate.

## Constraints & approach

| Input size | Extremum query pattern | Reach for |
|---|---|---|
| `n ≤ 10³` | any | brute-force rescan O(n·k) is fine, don't over-engineer |
| `n ≤ 10⁵`–`10⁶`, fixed window `k`, one pass | sliding max/min | **monotonic queue, O(n)** |
| `n ≤ 10⁵`, need max/min **and** count/sum simultaneously | combined constraint | monotonic queue for the extremum half, running sum/counter for the rest - two structures, one pass |
| need median, not max/min | order statistic mid-window | monotonic queue does **not** apply - use [two heaps](./two-heaps.md) |
| static array, many arbitrary range-max queries (not sliding) | range-max query (RMQ), no window slide | monotonic queue doesn't apply either - use a sparse table or segment tree; monotonic queue needs the *sliding* property to amortize |

The tell: if the window **slides** (one element in, one out, repeatedly) and you need **max or min**, it's this pattern in O(n). If queries are **arbitrary ranges** with no slide, you're off this pattern entirely.

## Variations

- **Min-queue** - flip the eviction comparison (`≥` instead of `≤`) to track the window minimum instead of maximum.
- **Variable-size window** - instead of a fixed `k`, expand/shrink `L`/`R` per a constraint (classic sliding-window skeleton), using the monotonic queue only to answer "what's the max in `[L, R]` right now" as the window moves - the eviction-from-front step becomes "pop while front index `< L`" rather than a fixed `i - k` check.
- **Two monotonic queues at once** - track both a max-queue and a min-queue over the same window to answer "is `max - min` within a bound" (see [Practice problems](#practice-problems)).

## Pitfalls

- **Storing values instead of indices.** You need the index to know *when* an entry expires (`i - k`); storing bare values loses that information and you can't detect a stale front. Always push indices, dereference with `nums[dq[i]]` when comparing.
- **Wrong strictness in the eviction comparison.** `<=` vs `<` when popping the back decides whether duplicate values are collapsed or kept - get it backwards and either the window max is wrong on ties, or the queue grows unbounded and blows the O(n) bound. Pin down whether ties should be evicted (`<=`, "leftmost of equal values is stale first") before coding.
- **Checking expiry against the wrong index.** The front expires when it equals `i - k` (fixed window) - checking `< i - k` after already popping earlier is fine, but checking `== L` without updating `L` correctly on a variable-size window silently keeps stale candidates. Recompute the expiry condition from the *current* window bounds, not a cached constant.
- **Reaching for a monotonic queue when the answer is an order statistic, not an extremum.** If the problem wants the median, a specific rank, or "top-k distinct" rather than the single max/min, a monotonic queue structurally cannot answer it - the front is the only element you can cheaply inspect. Switch to [two heaps](./two-heaps.md) or a balanced structure instead of forcing this pattern.

## First 30 seconds

"This is sliding-window extremum - I need the max (or min) of every window as it moves, not just once. I'll keep a deque of indices, decreasing by value from front to back: evict dominated values off the back before pushing, evict expired indices off the front, and the front is always the answer. O(n) because each index moves in and out exactly once."

## Related

- [Deque](../data-structures/deque.md) - the underlying structure; its [Sliding Window Maximum practice entry](../data-structures/deque.md#1-sliding-window-maximum) has the canonical implementation this pattern page builds recognition and transfer around.
- [Monotonic Stack](./monotonic-stack.md) - the single-ended sibling for "next greater/smaller," not windowed.
- [Sliding Window](./sliding-window.md) - the parent recognition pattern; monotonic queue is the engine for the extremum-tracking sub-case.
- [Two Heaps](./two-heaps.md) - reach here instead when the window needs a median/order-statistic, which a monotonic queue cannot provide.
- [DP Patterns](./dp-patterns.md) - monotonic-queue DP optimization (see Problem 1's duplicate-problems list) is a named transition-speedup technique within that family.

## Practice problems

### 1. Sliding Window Maximum (LC 239)

**Problem.** Given an array `nums` and window size `k`, return an array of the maximum of every contiguous window of size `k`. Constraints: `1 ≤ k ≤ n ≤ 10⁵`, values in `[-10⁴, 10⁴]` - O(n·k) and even O(n log k) heap solutions risk TLE, O(n) is intended.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [1,3,-1,-3,5,3,6,7], k = 3 | **Output:** [3,3,5,5,6,7]
- **Example 2**
  - **Input:** nums = [1], k = 1 | **Output:** [1]

**Constraints:** `1 ≤ k ≤ n ≤ 10⁵`, values in `[-10⁴, 10⁴]`.

**Approach.** Maintain a decreasing monotonic queue of indices: pop smaller-or-equal values off the back before pushing the new index, pop the front once its index has slid out of the window. The front is always the current max. This is the pattern's namesake problem - the direct skeleton application.

```python
from collections import deque

def max_sliding_window(nums: list[int], k: int) -> list[int]:
    dq: deque[int] = deque()
    res = []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] == i - k:
            dq.popleft()
        if i >= k - 1:
            res.append(nums[dq[0]])
    return res
```

**Complexity.** O(n) time, O(k) space.

**Duplicate problems:**
- Sliding Window Minimum (LC-adjacent, no canonical number) - identical technique with the comparison flipped (`>=` instead of `<=`).
- Jump Game VI (LC 1696) - same algorithm run over a `dp` array computed on the fly instead of a given input array: `dp[i] = nums[i] + max(dp[j] for j in [i-k, i-1])` - the general shape of "monotonic-deque optimizes a DP transition of the form `dp[i] = f(dp[j])` for `j` in a sliding window."
- Constrained Subsequence Sum (LC 1425) - same DP-transition shape as Jump Game VI, with a max-with-zero clamp: `dp[i] = nums[i] + max(0, dp[j] for j in [i-k, i-1])`.
- Maximum of Minimums of Every Window Size (GfG) - repeated application of the same monotonic-queue max/min extraction across all window sizes at once.

---

### 2. Shortest Subarray with Sum at Least K (LC 862)

**Problem.** Given an integer array `nums` and integer `k`, return the length of the shortest non-empty contiguous subarray with a sum at least `k`, or `-1` if none exists. Constraints: `1 ≤ n ≤ 10⁵`, `-10⁵ ≤ nums[i] ≤ 10⁵`, `1 ≤ k ≤ 10⁹`.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [1], k = 1 | **Output:** 1
- **Example 2**
  - **Input:** nums = [2,-1,2], k = 3 | **Output:** 3
  - **Explanation:** the whole array sums to 3; no shorter subarray reaches the target since values can be negative.

**Constraints:** `1 ≤ n ≤ 10⁵`, `-10⁵ ≤ nums[i] ≤ 10⁵`, `1 ≤ k ≤ 10⁹`.

**Approach.** Build [prefix sums](./prefix-sum.md), then for each `j` want the closest earlier `i` with `prefix[i] ≤ prefix[j] - k`. Maintain an **increasing** monotonic queue of prefix-sum indices: for the current `j`, pop from the front while `prefix[j] - prefix[front] ≥ k` (that front index just gave a valid, and shortest-so-far, answer - it can never help again since any later `j'` would give a longer subarray). Pop from the back while `prefix[back] ≥ prefix[j]` (a later, smaller-or-equal prefix always dominates for future queries). This differs from Sliding Window Maximum's mechanic: there's no fixed window size, and the queue is over a derived array (prefix sums) with eviction driven by the sum constraint, not a fixed offset.

```python
from collections import deque

def shortest_subarray(nums: list[int], k: int) -> int:
    n = len(nums)
    prefix = [0] * (n + 1)
    for i, x in enumerate(nums):
        prefix[i + 1] = prefix[i] + x

    dq: deque[int] = deque()   # indices into prefix, increasing prefix value
    best = n + 1
    for j in range(n + 1):
        while dq and prefix[j] - prefix[dq[0]] >= k:
            best = min(best, j - dq.popleft())
        while dq and prefix[dq[-1]] >= prefix[j]:
            dq.pop()
        dq.append(j)
    return best if best <= n else -1
```

**Complexity.** O(n) time, O(n) space.

**Duplicate problems:**
- Subarray Sum Equals K (LC 560) - same prefix-sum-over-a-target idea, but counts all matching subarrays via a hash map instead of finding the shortest one via a monotonic queue (only works there because values can repeat arbitrarily; the monotonic-queue trick here specifically exploits the "shortest" objective).

---

### 3. Longest Continuous Subarray With Absolute Diff Less Than or Equal to Limit (LC 1438)

**Problem.** Given `nums` and integer `limit`, return the length of the longest contiguous subarray where `max(subarray) - min(subarray) ≤ limit`. Constraints: `1 ≤ n ≤ 10⁵`, `-10⁴ ≤ nums[i] ≤ 10⁴`, `0 ≤ limit ≤ 10⁴`.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [8,2,4,7], limit = 4 | **Output:** 2
  - **Explanation:** [2,4] has max-min = 2 ≤ 4; extending to [8,2,4] gives max-min = 6 > 4.
- **Example 2**
  - **Input:** nums = [10,1,2,4,7,2], limit = 5 | **Output:** 4

**Constraints:** `1 ≤ n ≤ 10⁵`, `-10⁴ ≤ nums[i] ≤ 10⁴`, `0 ≤ limit ≤ 10⁴`.

**Approach.** Variable-size sliding window (expand `R`, shrink `L` on violation) with **two** monotonic queues tracked in parallel - one decreasing (for the window max), one increasing (for the window min). After each expansion, while `max_queue.front - min_queue.front > limit`, advance `L` and evict any front indices `< L` from both queues. Track the best `R - L + 1` seen. Distinct from problems 1–2: two synchronized monotonic queues driving a variable-size window rather than one queue over a fixed window.

```python
from collections import deque

def longest_subarray(nums: list[int], limit: int) -> int:
    max_dq: deque[int] = deque()   # decreasing
    min_dq: deque[int] = deque()   # increasing
    left = 0
    best = 0
    for right, x in enumerate(nums):
        while max_dq and nums[max_dq[-1]] <= x:
            max_dq.pop()
        max_dq.append(right)
        while min_dq and nums[min_dq[-1]] >= x:
            min_dq.pop()
        min_dq.append(right)

        while nums[max_dq[0]] - nums[min_dq[0]] > limit:
            left += 1
            if max_dq[0] < left:
                max_dq.popleft()
            if min_dq[0] < left:
                min_dq.popleft()

        best = max(best, right - left + 1)
    return best
```

**Complexity.** O(n) time, O(n) space (two deques, each bounded by the window).

**Duplicate problems:**
- Subarrays with Bounded Max/Min variants (interview-staple rephrasing) - same dual-monotonic-queue shrink-on-violation shape under a different constraint name.

---

### 4. Sliding Window Maximum II (grid version)

**Problem.** Given a 2D grid of numbers and a window size `k`, return the maximum value in every `k×k` submatrix as the window slides across both dimensions. Constraints: `1 ≤ rows, cols ≤ 10³`, `1 ≤ k ≤ min(rows, cols)`, values in `[-10⁴, 10⁴]`.

**Worked examples:**
- **Example 1**
  - **Input:** grid = [[1,2,3],[4,5,6],[7,8,9]], k = 2 | **Output:** [[5,6],[8,9]]
  - **Explanation:** the four 2×2 submatrices have maxima 5, 6, 8, 9, arranged in the same relative positions as their top-left corners.
- **Example 2**
  - **Input:** grid = [[1,1,1],[1,1,1],[1,1,1]], k = 3 | **Output:** [[1]]
  - **Explanation:** only one 3×3 window fits in a 3×3 grid, and every value is 1.

**Constraints:** `1 ≤ rows, cols ≤ 10³`, `1 ≤ k ≤ min(rows, cols)`, values in `[-10⁴, 10⁴]`.

**Approach.** A brute-force scan of every `k×k` submatrix is O(rows·cols·k²), which is too slow once `k` grows. Instead, exploit that "max of a window" composes across dimensions: run the 1D sliding-window-maximum (Problem 1's exact skeleton) along every row first, collapsing each row into its sliding-row-max of width `k`; then run the same 1D routine again down every column of that intermediate result. Two O(rows·cols) passes replace the O(rows·cols·k²) brute force - this is distinct from problems 1-3 because it composes the 1D monotonic-queue routine across two dimensions rather than running it once.

```python
from collections import deque

def sliding_window_max_1d(row: list[int], k: int) -> list[int]:
    dq: deque[int] = deque()
    res = []
    for i, x in enumerate(row):
        while dq and row[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] == i - k:
            dq.popleft()
        if i >= k - 1:
            res.append(row[dq[0]])
    return res

def max_submatrix(grid: list[list[int]], k: int) -> list[list[int]]:
    row_maxed = [sliding_window_max_1d(row, k) for row in grid]
    cols = len(row_maxed[0])
    transposed = [[row_maxed[r][c] for r in range(len(row_maxed))] for c in range(cols)]
    col_maxed = [sliding_window_max_1d(col, k) for col in transposed]
    out_rows = len(col_maxed[0])
    return [[col_maxed[c][r] for c in range(cols)] for r in range(out_rows)]
```

**Complexity.** O(rows·cols) time, O(rows·cols) space for the intermediate arrays.
