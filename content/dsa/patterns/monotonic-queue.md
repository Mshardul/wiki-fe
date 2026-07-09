# Monotonic Queue

## Prerequisites

- [Deque](../data-structures/deque.md) [Must read] - a monotonic queue *is* a deque under a monotonicity discipline; the O(1)-both-ends mechanic and the `collections.deque` API live there, not repeated here.
- [Monotonic Stack](../data-structures/stack.md#cp-primitives) [Should read] - the single-ended sibling; seeing both makes the "which end(s) do I need" decision automatic.
- [Sliding Window](./sliding-window.md) [Should read] - the parent recognition pattern; a monotonic queue is usually the engine *inside* a sliding-window solution once the window needs an extremum, not just a running sum/count.

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
- Brute force is O(n·k) (rescan the window each time) or a heap gives O(n log k); the array is large enough (`n` up to `10^5`–`10^6`) that both are too slow or unnecessarily complex.

### (c) Not to be confused with

| Pattern | Distinction |
|---|---|
| [Monotonic Stack](../data-structures/stack.md#cp-primitives) | Stack answers "next greater/smaller element" for each index looking **one direction, unbounded** (until the answer is found or the array ends) - no window, no eviction from a second end. Queue answers windowed extremum, needs *two*-ended eviction (stale index expires **and** dominated value is popped). |
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

## Skeleton

**Pseudocode (CLRS-style contract):**

```
MONOTONIC-QUEUE-MAX(A, k)
1   Q = empty deque                    ▷ stores indices, values decreasing
2   result = empty list
3   for i = 0 to A.length − 1
4       while Q not empty and A[Q.back] ≤ A[i]
5           Q.pop_back()                ▷ evict dominated
6       Q.push_back(i)
7       if Q.front == i − k
8           Q.pop_front()               ▷ evict expired
9       if i ≥ k − 1
10          result.append(A[Q.front])
11  return result
```

**Python template (paste-and-adapt):**

```python
from collections import deque

def monotonic_queue_template(nums: list[int], k: int) -> list[int]:
    dq: deque[int] = deque()   # indices; nums[dq[i]] strictly decreasing for max-queue
    result = []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:   # your logic here: flip to >= for min-queue
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:                # your logic here: expiry condition for this problem
            dq.popleft()
        if i >= k - 1:                    # your logic here: when a window is "complete"
            result.append(nums[dq[0]])
    return result
```

## Complexity

**O(n) time, O(k) space** - each of the `n` indices is pushed once and popped at most once total (across both ends), so the amortized per-element work is O(1) despite the `while` loop. Space is bounded by the window size `k` since stale/dominated indices never accumulate.

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
- **Two monotonic queues at once** - track both a max-queue and a min-queue over the same window to answer "is `max - min` within a bound" (see [Worked problems](#worked-problems)).

## CP-primitives

- **Monotonic-deque optimization of DP transitions** - when a DP recurrence looks like `dp[i] = min(dp[j] + cost) for j in [i-k, i)`, the sliding-window-min is exactly a monotonic queue, collapsing an O(n·k) DP to **O(n)**. Common in "jump game with cost" and constrained knapsack variants.
- **2D sliding-window max via two monotonic-queue passes** - for the max over every `k×k` submatrix, run the 1D monotonic queue along each row first (collapsing every row to its sliding-row-max), then run it again along each column of the row-max result. Two O(rows·cols) passes instead of an O(rows·cols·k²) brute force per submatrix - the pattern composes cleanly because "max of a window" is associative across dimensions.
- **Monotonic queue as a poor-man's convex hull trick (CHT) gateway** - when a DP transition is `dp[i] = min_j(dp[j] + b[j]·a[i])` and the `b[j]` values arrive in monotonic order, tracking the best line with a deque (push new lines to the back, pop dominated ones, evict from the front when the query point moves past the optimal line) is a monotonic queue over lines instead of values. Recognizing this shape is the on-ramp to full CHT/Li Chao tree for the harder DP-speedup problems.

## Worked problems

Three problems, each mapping the skeleton differently - none overlap with [deque.md's practice problems](../data-structures/deque.md#practice-problems) (which cover the canonical Sliding Window Maximum, Circular Deque design, prefix-sum variant, and the median counterexample).

### 1. Constrained Subsequence Sum

Sketch: `dp[i] = nums[i] + max(0, dp[j] for j in [i-k, i-1])`. The `max(dp[j])` over the trailing window of size `k` is a monotonic queue on the `dp` array itself, run *while* computing `dp` left to right - the DP and the window slide together in one pass. This is the DP-optimization use of the pattern, distinct from a plain array-max query.

### 2. Shortest Subarray with Sum at Least K

Sketch: build [prefix sums](./prefix-sum.md), then for each `j` want the closest earlier `i` with `prefix[i] ≤ prefix[j] - k`. An **increasing** monotonic queue of prefix-sum indices lets both the "pop from front once it can't help a later `j`" and "pop from back because a later smaller prefix dominates" happen in one O(n) pass - the monotonic queue applied to a derived array (prefix sums), not the raw input. (Full worked solution lives on [deque.md problem 3](../data-structures/deque.md#3-shortest-subarray-with-sum-at-least-k--monotonic-deque-on-prefix-sums); linked here as the "prefix-sum twist" entry in this pattern's problem set.)

### 3. Longest Continuous Subarray With Absolute Diff ≤ Limit

Sketch: maintain **two** monotonic queues simultaneously over the same sliding window - a max-queue and a min-queue. Expand `R`; while `max_queue.front - min_queue.front > limit`, shrink `L` (popping expired indices from both queues). The window is valid whenever the two queues' fronts stay within `limit` of each other - a genuinely different shape from problems 1–2 because it fuses the pattern with the general variable-size [sliding window](./sliding-window.md) skeleton, using two monotonic queues as the constraint check instead of one.

## Pitfalls

- **Storing values instead of indices.** You need the index to know *when* an entry expires (`i - k`); storing bare values loses that information and you can't detect a stale front. Always push indices, dereference with `nums[dq[i]]` when comparing.
- **Wrong strictness in the eviction comparison.** `<=` vs `<` when popping the back decides whether duplicate values are collapsed or kept - get it backwards and either the window max is wrong on ties, or the queue grows unbounded and blows the O(n) bound. Pin down whether ties should be evicted (`<=`, "leftmost of equal values is stale first") before coding.
- **Checking expiry against the wrong index.** The front expires when it equals `i - k` (fixed window) - checking `< i - k` after already popping earlier is fine, but checking `== L` without updating `L` correctly on a variable-size window silently keeps stale candidates. Recompute the expiry condition from the *current* window bounds, not a cached constant.
- **Reaching for a monotonic queue when the answer is an order statistic, not an extremum.** If the problem wants the median, a specific rank, or "top-k distinct" rather than the single max/min, a monotonic queue structurally cannot answer it - the front is the only element you can cheaply inspect. Switch to [two heaps](./two-heaps.md) or a balanced structure instead of forcing this pattern.

## First 30 seconds

"This is sliding-window extremum - I need the max (or min) of every window as it moves, not just once. I'll keep a deque of indices, decreasing by value from front to back: evict dominated values off the back before pushing, evict expired indices off the front, and the front is always the answer. O(n) because each index moves in and out exactly once."

## Related

- [Deque](../data-structures/deque.md) - the underlying structure; its [CP-primitives](../data-structures/deque.md#cp-primitives) section has the canonical implementation this pattern page builds recognition and transfer around.
- [Monotonic Stack](../data-structures/stack.md#cp-primitives) - the single-ended sibling for "next greater/smaller," not windowed.
- [Sliding Window](./sliding-window.md) - the parent recognition pattern; monotonic queue is the engine for the extremum-tracking sub-case.
- [Two Heaps](./two-heaps.md) - reach here instead when the window needs a median/order-statistic, which a monotonic queue cannot provide.
- [DP Patterns](./dp-patterns.md) - monotonic-queue DP optimization (problem 1 above) is a named transition-speedup technique within that family.

## Practice problems

### 1. Sliding Window Maximum

**Problem.** Given an array `nums` and window size `k`, return an array of the maximum of every contiguous window of size `k`. E.g. `nums=[1,3,-1,-3,5,3,6,7], k=3` → `[3,3,5,5,6,7]`. Constraints: `n ≤ 10⁵`, so O(n·k) and even O(n log k) heap solutions risk TLE - O(n) is intended.

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
- Maximum of Minimums of Every Window Size (GfG) - repeated application of the same monotonic-queue max/min extraction across all window sizes at once.

### 2. Jump Game VI

**Problem.** Starting at index 0 of `nums`, at each step jump to any index in `[i+1, i+k]`. Your score is the sum of visited `nums` values; maximize the total score reaching the last index. Constraints: `n ≤ 10⁵`, `1 ≤ k ≤ n` - a naive O(n·k) DP (checking all `k` previous states per index) is too slow.

**Approach.** `dp[i] = nums[i] + max(dp[j] for j in [i-k, i-1])`. The `max` over a trailing window of size `k` is exactly a sliding-window-max query on the `dp` array - run a monotonic queue over `dp` *as it's being filled*, evicting indices `< i-k` and dominated values, same as problem 1 but the array being windowed is computed on the fly rather than given upfront. This is the DP-transition-speedup use of the pattern (see [CP-primitives](#cp-primitives)).

```python
from collections import deque

def max_result(nums: list[int], k: int) -> int:
    n = len(nums)
    dp = [0] * n
    dp[0] = nums[0]
    dq: deque[int] = deque([0])   # indices into dp, values decreasing
    for i in range(1, n):
        while dq and dq[0] < i - k:
            dq.popleft()
        dp[i] = nums[i] + dp[dq[0]]
        while dq and dp[dq[-1]] <= dp[i]:
            dq.pop()
        dq.append(i)
    return dp[-1]
```

**Complexity.** O(n) time, O(k) space.

**Duplicate problems:**
- Constrained Subsequence Sum (LC 1425) - same `dp[i] = nums[i] + max(0, dp[j])` sliding-window-max-in-DP shape, with a max-with-zero clamp instead of a plain jump.

### 3. Longest Continuous Subarray With Absolute Diff Less Than or Equal to Limit

**Problem.** Given `nums` and integer `limit`, return the length of the longest contiguous subarray where `max(subarray) - min(subarray) ≤ limit`. Constraints: `n ≤ 10⁵`.

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
