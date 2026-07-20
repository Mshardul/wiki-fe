# Monotonic Stack

## Prerequisites

- [Stack](../data-structures/stack.md) [Must read] - this pattern is a disciplined usage convention on top of a plain stack: elements are pushed/popped so the stack's contents stay sorted at all times
- [Array](../data-structures/array.md) [Must read] - the pattern's canonical inputs are arrays; "next greater/smaller element" is defined over array positions

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

---

## What it is

A **monotonic stack** is a stack maintained so its elements are always in strictly increasing (or strictly decreasing) order from bottom to top - enforced by popping off elements that would violate the ordering before pushing a new one. This lets you answer "next greater/smaller element" style queries for every array position in a single O(n) pass, instead of an O(n²) pair of nested loops.

**Mental model:** a stack of people standing in a line ordered by height, where anyone shorter than the person about to join must step out first - each person who steps out has just found their "next taller person" (the one that displaced them), and the line stays sorted after every insertion.

> **Interview soundbite:** "Monotonic stack - pop everything that violates the order before pushing; each element is pushed and popped at most once, so it's O(n) total even though it looks like a nested loop."

---

## Recognition signals

### (a) Trigger phrases

- *"next greater element"* / *"next smaller element"*
- *"daily temperatures"* (how many days until a warmer day)
- *"largest rectangle in histogram"*
- *"trapping rain water"* (the monotonic-stack solution, as an alternative to two pointers)
- *"remove k digits to make the smallest number"*

### (b) Structural cues

- Input is an **array or sequence**, and the query is about **the next/previous element satisfying a comparison** (greater, smaller, or equal) relative to each position - for every index, not just one.
- The brute-force approach is an **O(n²) nested loop**: for each element, scan forward (or backward) until you find the first one that beats it.
- There's an implicit **"span" or "distance until violated"** structure - the answer for each element depends on nearby elements that are smaller/larger than it, and elements "in between" that get resolved (popped) become irrelevant once a bigger element arrives.

### (c) Not to be confused with

| Pattern | Distinction |
|---|---|
| **Monotonic Queue (deque)** | Monotonic queue supports popping from **both ends**, used for sliding-window maximum/minimum where elements must expire from the *front* as the window moves. Monotonic stack only ever pops from one end (top) and has no notion of a "window" sliding past - it processes the whole sequence once, left to right. |
| **Two Pointers** | Two pointers uses two explicit indices with O(1) extra space and a convergence argument. Monotonic stack uses an actual stack data structure (O(n) space worst case) to remember *all* not-yet-resolved candidates, because a later element might resolve several pending ones at once, not just the two nearest. |
| **Sliding Window** | Sliding window maintains an aggregate (sum, count, frequency) over a maintained range `[L, R]`. Monotonic stack maintains an *ordering invariant* over candidates still awaiting resolution - it doesn't track a running aggregate over a contiguous range at all. |

---

## How it works

**Worked example: Next Greater Element for `[2, 1, 2, 4, 3]`.**

For each index, find the next element to its right that is strictly greater; `-1` if none exists.

```
arr:    [2, 1, 2, 4, 3]
index:   0  1  2  3  4

i=0, val=2:  stack empty → push index 0.        stack: [0]
i=1, val=1:  arr[0]=2 > 1, no pop needed → push. stack: [0, 1]
i=2, val=2:  arr[1]=1 < 2 → pop 1, answer[1] = arr[2] = 2
             arr[0]=2, not < 2 → stop popping → push 2.  stack: [0, 2]
i=3, val=4:  arr[2]=2 < 4 → pop 2, answer[2] = arr[3] = 4
             arr[0]=2 < 4 → pop 0, answer[0] = arr[3] = 4
             stack empty → push 3.               stack: [3]
i=4, val=3:  arr[3]=4, not < 3 → stop popping → push 4.  stack: [3, 4]

End of array: anything left on stack has no next greater → answer = -1
  index 3 (val=4): -1
  index 4 (val=3): -1

Final answer: [4, 2, 4, -1, -1]
```

**Diagram - the stack's contents evolving (holding indices, shown with values for clarity), and each pop resolving one answer:**

```
i=0: push 2         stack (bottom→top): [2]
i=1: push 1         stack: [2, 1]                    (1 < 2, stays under it - decreasing order maintained)
i=2: pop 1 → ans[1]=2    stack: [2]
     push 2         stack: [2, 2]
i=3: pop 2 → ans[2]=4    stack: [2]
     pop 2 → ans[0]=4    stack: []
     push 4         stack: [4]
i=4: push 3         stack: [4, 3]                    (3 < 4, stays under it)

At every point, the stack (bottom→top) holds a DECREASING sequence of values -
each pop happens exactly because the incoming element breaks that order,
and the popped element's answer is the element that broke it.
```

**Why each element is pushed and popped at most once (the amortized argument):** every index enters the stack exactly once (one push per iteration of the main loop) and can leave the stack at most once (one pop, ever, per index) - so across the whole run, total pushes + pops ≤ 2n, giving O(n) total work even though there's a `while` loop nested inside the `for` loop that looks like it could be O(n²).

---

## Skeleton

**Pseudocode (CLRS style) - "next greater element to the right":**

```
NEXT-GREATER-ELEMENT(A, n)
  let result[1..n] = -1                 ▷ default: no next greater element
  let S = empty stack                   ▷ stack holds INDICES, kept decreasing by value
  for i = 1 to n
    while S is not empty and A[top(S)] < A[i]
      j = pop(S)                        ▷ A[i] is the "next greater" for index j
      result[j] = A[i]
    push(S, i)
  return result
```

**Python template:**

```python
def next_greater_element(arr: list[int]) -> list[int]:
    n = len(arr)
    result = [-1] * n
    stack: list[int] = []               # holds indices, values decreasing bottom-to-top
    for i in range(n):
        while stack and arr[stack[-1]] < arr[i]:
            j = stack.pop()
            result[j] = arr[i]          # your logic here: what to record on resolution
        stack.append(i)
    return result
```

For **"next smaller"** instead of "next greater," flip the comparison (`arr[stack[-1]] > arr[i]`). For **"previous greater/smaller"** instead of "next," iterate right-to-left, or push answers while scanning left-to-right and interpret the stack differently - the invariant (keep the stack monotonic, pop-and-resolve on violation) stays the same; only the comparison direction and scan direction change.

---

## Complexity

Typical time: **O(n)** amortized - despite the nested loop, each element is pushed once and popped at most once across the entire run (see the amortized argument in How it works). Space: **O(n)** worst case - if the input is already strictly increasing (for "next greater"), no element ever gets popped until the very end, so the stack holds all n indices simultaneously.

---

## Constraints & approach

| Input size | Keywords | Reach for | Don't reach for |
|---|---|---|---|
| `n ≤ 10⁵` - `10⁶`, "next/previous greater/smaller for every element" | "next greater element", "daily temperatures" | Monotonic stack: O(n) | Nested loop: O(n²) - times out well before 10⁵ |
| `n ≤ 10⁵`, "largest rectangle" / "max area" derived from per-element spans | "largest rectangle in histogram" | Monotonic stack (each bar's span to the next-shorter bar on each side) | Brute-force per-bar expansion: O(n²) |
| `n ≤ 10⁵`, need a **maximum over a sliding window**, not "next greater" for a fixed array | "sliding window maximum" | **Not this pattern** - reach for Monotonic Queue/deque instead, since elements must expire from the window's *front* | Monotonic stack (no eviction-from-front support) |
| `n ≤ 10⁵`, remove k elements to build smallest/largest result | "remove k digits", "smallest subsequence" | Monotonic stack, greedily popping while removals remain and the top violates the target order | Brute-force enumeration of all removal combinations |

The signal that should push you *off* this pattern: if the problem needs elements to fall out of consideration from the **front** as some window boundary advances (not just "resolved" by a bigger element arriving), that's [Monotonic Queue](./monotonic-queue.md), not a stack - a stack only ever discards from the top.

**Real-world usage:** compilers and calculators use a monotonic-stack-like discipline for operator-precedence parsing (resolving "next lower-or-equal-precedence operator" as tokens arrive), and stock/metrics dashboards use the "stock span" variant to compute running spans in O(1) amortized per new data point. **At-scale failure:** on adversarially-sorted input (e.g. a strictly increasing sequence for a "next greater" query, which never triggers a single pop until the end), the stack holds all n elements simultaneously - at n > 10⁷ this O(n) worst-case space, not just the O(n) time, is what can blow a memory budget in a streaming context.

**Cache behavior:** a Python list-backed stack (or an array-backed stack in most languages) is contiguous, so push/pop at the tail is cache-friendly - sequential memory access, no pointer-chasing. This contrasts with a linked-list-backed stack implementation, where each push/pop touches a freshly (and non-contiguously) allocated node - the array-backed form is the one actually used in practice for exactly this reason.

---

## Variations

| Variant | Shape | Canonical example |
|---|---|---|
| Next greater element (to the right) | Decreasing stack, scan left→right | Next Greater Element I/II (LC 496, 503) |
| Next smaller element | Increasing stack, scan left→right | Sum of Subarray Minimums (LC 907) |
| Previous greater/smaller element | Same idea, scan direction or interpretation flipped | Largest Rectangle in Histogram (uses both directions implicitly) |
| Span-based area/width problems | Stack of indices; span = distance between the two "boundary" elements that resolve a given index | Largest Rectangle in Histogram (LC 84), Trapping Rain Water (LC 42) |
| Greedy digit removal | Pop while removals remain and top digit is "worse" than incoming | Remove K Digits (LC 402), Remove Duplicate Letters (LC 316) |
| Circular array variant | Scan the array twice (conceptually wrapping around) | Next Greater Element II (LC 503) |

---

## CP-primitives

### 1. Largest Rectangle in Histogram via monotonic stack (single-pass span trick)

**The trick:** rather than computing "distance to next smaller on the left" and "distance to next smaller on the right" as two separate passes, a single left-to-right pass with an increasing monotonic stack computes each bar's full span in one go: when a bar `i` pops bar `j` off the stack (because `height[i] < height[j]`), the width for bar `j`'s rectangle is exactly `i - stack[-1] - 1` after the pop (or `i` if the stack is now empty) - the new top is `j`'s "next smaller on the left," discovered implicitly.

```python
def largest_rectangle_area(heights: list[int]) -> int:
    stack: list[int] = []          # indices, increasing height bottom-to-top
    max_area = 0
    for i, h in enumerate(heights + [0]):     # sentinel 0 flushes the stack at the end
        while stack and heights[stack[-1]] >= h:
            height = heights[stack.pop()]
            width = i if not stack else i - stack[-1] - 1
            max_area = max(max_area, height * width)
        stack.append(i)
    return max_area
```

**Why for CP:** collapses what looks like it needs two auxiliary arrays (next-smaller-left, next-smaller-right) into one pass with a sentinel trick - a standard contest-speed simplification once you recognize the span is fully determined by the stack's state at pop time.

### 2. Monotonic stack for "sum over all subarray minimums/maximums"

**The trick:** to compute `sum(min(subarray) for every subarray)` in O(n) instead of enumerating all O(n²) subarrays, use a monotonic stack to find, for each element, how many subarrays have it as the minimum - via "distance to previous smaller" times "distance to next smaller or equal" (careful with the tie-breaking direction to avoid double-counting equal elements).

```python
def sum_subarray_mins(arr: list[int]) -> int:
    MOD = 10**9 + 7
    n = len(arr)
    stack: list[int] = []
    left = [0] * n     # distance to previous element strictly less
    for i in range(n):
        while stack and arr[stack[-1]] >= arr[i]:
            stack.pop()
        left[i] = i - (stack[-1] if stack else -1)
        stack.append(i)
    stack.clear()
    right = [0] * n     # distance to next element strictly less (or equal, tie-broken)
    for i in range(n - 1, -1, -1):
        while stack and arr[stack[-1]] > arr[i]:
            stack.pop()
        right[i] = (stack[-1] if stack else n) - i
        stack.append(i)
    return sum(arr[i] * left[i] * right[i] for i in range(n)) % MOD
```

**Why for CP:** the "count subarrays where element i is the min/max" trick via monotonic stack is a recurring building block across contest problems (contribution technique) - it turns an O(n²) or O(n³) enumeration into O(n).

---

## Worked problems

### 1. Next Greater Element I (LC 496)

Given two arrays where `nums1` is a subset of `nums2`, find the next greater element for each `nums1` value within `nums2`.

**Approach sketch:** build the next-greater-element mapping for *all* of `nums2` once using the standard decreasing monotonic stack (the skeleton's `next_greater_element`, keyed by value instead of index since all values are distinct), then look up each `nums1` element in that mapping - O(n + m) instead of recomputing per query.

### 2. Daily Temperatures (LC 739)

Given daily temperatures, for each day find how many days until a warmer temperature; `0` if none.

**Approach sketch:** same decreasing monotonic stack as next-greater-element, but instead of recording the *value* that resolved each index, record the **distance** (`i - j`) between the current index and the popped index - the skeleton's resolution step changes from "record the value" to "record the index gap," everything else is identical.

### 3. Largest Rectangle in Histogram (LC 84)

Given bar heights, find the largest rectangular area that fits entirely under the histogram's outline.

**Approach sketch:** maintain an increasing monotonic stack of bar indices. When a shorter bar arrives and pops a taller one, the popped bar's rectangle width spans from the (new) stack top's position to the current index - exactly the CP-primitive #1 span trick above. A sentinel zero-height bar appended at the end flushes any bars still on the stack.

### 4. Remove K Digits (LC 402)

Given a number as a string and an integer `k`, remove `k` digits to make the smallest possible resulting number.

**Approach sketch:** greedily build an increasing monotonic stack of digits: for each incoming digit, pop any larger digit currently on top of the stack as long as removals remain (`k > 0`) - removing a larger digit before a smaller one always helps make the number smaller. After the scan, if removals remain, trim from the end (largest remaining suffix); this maps "remove k digits to minimize" directly onto "maintain an increasing stack, popping while budget remains."

### 5. Trapping Rain Water (LC 42)

Given an elevation map, compute total trapped water (also solvable with two pointers - see [Two Pointers](./two-pointers.md) - but the monotonic-stack solution generalizes the same "span between resolving boundaries" idea from Largest Rectangle).

**Approach sketch:** maintain a decreasing monotonic stack of bar indices (by height). When a taller bar arrives and pops a shorter one, the popped bar acts as a "basin floor" - water trapped above it is bounded by `min(current height, new stack top's height) - popped height`, times the width between them. This reuses the exact same "resolve on pop, compute a span-based quantity" shape as Largest Rectangle, applied to volume instead of area.

---

## Pitfalls

1. **Using `<=` instead of `<` (or vice versa) in the comparison, silently changing behavior on duplicates.** Whether to pop on strictly-less-than or less-than-or-equal changes how ties are resolved (which of two equal elements "wins" as the next-greater), and can cause double-counting in contribution-style problems (like sum-of-subarray-minimums) if not chosen deliberately and consistently between the left-scan and right-scan passes.

2. **Forgetting to flush the stack after the main loop.** Elements still on the stack when the array ends have no "next greater/smaller" within the array - their answer should default to `-1` (or `n`, or whatever the problem's sentinel is), not be silently skipped. A common trick to avoid a separate flush step is appending a sentinel value (`0` for histogram problems, `-infinity` for next-greater problems) that forces every remaining stack element to resolve.

3. **Storing values instead of indices when the answer needs position information.** If the problem needs "how far away" or "at what index," the stack must hold indices (and look up `arr[index]` for comparisons), not raw values - storing values only works when the problem needs just the resolving *value*, not its position.

4. **Assuming monotonic stack works for a sliding window.** A monotonic stack has no way to evict an element from the "far" end when a window boundary passes it - if the problem needs a maintained window (elements expiring from the front as well as the back), that's [Monotonic Queue](./monotonic-queue.md) (deque-based), not this pattern. Reaching for a plain stack here silently produces wrong answers once the window moves past an element still needed.

5. **Missing the circular-array wraparound.** Problems like "Next Greater Element II" (circular array) require conceptually scanning the array twice (`for i in range(2*n)`, indexing with `i % n`) - forgetting the wraparound misses next-greater relationships that only exist by looping back to the start.

**Common misconceptions:** *"the nested `while` loop inside the `for` loop makes this O(n²)."* False - this is the single most common first reaction to seeing the skeleton's code shape. The amortized argument (each index pushed once, popped at most once, so total work across the *entire* run is ≤2n) is what makes it O(n) despite the nested-loop appearance; counting "worst case per iteration" instead of "total work across all iterations" is exactly the wrong lens here.

---

## First 30 seconds

*"This is monotonic stack - I need the next/previous greater or smaller element for every position. I'll scan once, maintaining a stack that stays increasing or decreasing, popping and resolving whenever the incoming element violates that order. Each element is pushed and popped at most once, so it's O(n) total despite the nested-looking loop."*

Then state which direction (increasing vs decreasing) and which comparison (strict vs non-strict) the specific problem needs - that's usually where the interviewer probes next.

---

## Related

- [Stack](../data-structures/stack.md) - the underlying data structure; this pattern is a usage discipline on top of it, not a new structure
- [Monotonic Queue](./monotonic-queue.md) - sibling pattern for sliding-window max/min, supporting eviction from both ends
- [Two Pointers](./two-pointers.md) - alternative approach to Trapping Rain Water and similar span problems, without an explicit stack

---

## Practice problems

### 1. Next Greater Element I (LC 496)

Given `nums1` (a subset of `nums2`, all distinct values), find the next greater element in `nums2` for each `nums1` value, or `-1`. Constraints: `1 ≤ nums1.length ≤ nums2.length ≤ 1000`.

**Approach.** Build a value→next-greater map for all of `nums2` in one O(n) monotonic-stack pass, then answer each `nums1` query with an O(1) lookup.

```python
def next_greater_element(nums1: list[int], nums2: list[int]) -> list[int]:
    next_greater: dict[int, int] = {}
    stack: list[int] = []
    for num in nums2:
        while stack and stack[-1] < num:
            next_greater[stack.pop()] = num
        stack.append(num)
    return [next_greater.get(x, -1) for x in nums1]
```

**Complexity.** O(n + m) time (n = len(nums2), m = len(nums1)), O(n) space for the stack and map.

**Duplicate problems:**
- Daily Temperatures (LC 739) - same decreasing-stack mechanic, records index gap instead of value.
- Next Greater Element II (LC 503) - same idea with circular-array wraparound.

---

### 2. Daily Temperatures (LC 739)

Given daily temperatures, return for each day the number of days until a warmer temperature, or `0` if none exists. Constraints: `1 ≤ n ≤ 10⁵`, `30 ≤ temperatures[i] ≤ 100`.

**Approach.** Decreasing monotonic stack of indices. When a warmer day arrives, pop all cooler days off the stack and record the index gap as their answer.

```python
def daily_temperatures(temperatures: list[int]) -> list[int]:
    n = len(temperatures)
    result = [0] * n
    stack: list[int] = []
    for i, t in enumerate(temperatures):
        while stack and temperatures[stack[-1]] < t:
            j = stack.pop()
            result[j] = i - j
        stack.append(i)
    return result
```

**Complexity.** O(n) time, O(n) space.

**Duplicate problems:**
- Next Greater Element I (LC 496) - identical mechanic, records value instead of distance.
- Online Stock Span (LC 901) - same decreasing-stack idea, run incrementally instead of on a fixed array.

---

### 3. Largest Rectangle in Histogram (LC 84)

Given an array of bar heights, find the area of the largest rectangle that fits under the histogram. Constraints: `1 ≤ n ≤ 10⁵`, `0 ≤ heights[i] ≤ 10⁴`.

**Approach.** Increasing monotonic stack of indices. When a shorter bar pops a taller one, the popped bar's rectangle spans from the new stack top (exclusive) to the current index (exclusive) - compute area at each pop. A sentinel `0` appended at the end flushes the stack.

```python
def largest_rectangle_area(heights: list[int]) -> int:
    stack: list[int] = []
    max_area = 0
    extended = heights + [0]
    for i, h in enumerate(extended):
        while stack and extended[stack[-1]] >= h:
            height = extended[stack.pop()]
            width = i if not stack else i - stack[-1] - 1
            max_area = max(max_area, height * width)
        stack.append(i)
    return max_area
```

**Complexity.** O(n) time (amortized - each index pushed/popped once), O(n) space.

**Duplicate problems:**
- Maximal Rectangle (LC 85) - same histogram algorithm run once per row of a binary matrix (accumulating column heights).
- Trapping Rain Water (LC 42) - same "resolve on pop, compute a span-based quantity" shape, applied to trapped volume.

