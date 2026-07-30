# Prefix Sum

## Prerequisites

- [Array](../data-structures/array.md) [Must read]
- [Hash Table](../data-structures/hash-table.md) [Must read]

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

**Prefix sum** precomputes, for every index `i`, the running total of all elements up to `i` - so that the sum of *any* contiguous range `[L, R]` can be answered in O(1) afterward via subtraction, instead of re-summing the range from scratch every query.

**Mental model:** a car's odometer. You don't need to know how far you drove between mile marker 30 and mile marker 82 by re-measuring that stretch - you just read the odometer at marker 82, read it at marker 30, and subtract. The odometer readings are the prefix sums; the trip distance between any two markers is a single subtraction.

> **Interview soundbite:** "Prefix sum - precompute cumulative totals once in O(n), then any range sum is `prefix[R] - prefix[L-1]` in O(1). Turns O(n) per query into O(1) per query after an O(n) setup."

---

## Recognition signals

### (a) Trigger phrases

- *"subarray sum equals K"*
- *"range sum query"* (especially when the array is **immutable** and there are **many queries**)
- *"number of subarrays with sum divisible by K"*
- *"pivot index"* / *"find the index where left sum equals right sum"*
- *"product of array except self"* (prefix/suffix product, the multiplicative sibling)

### (b) Structural cues

- Many queries asking for **the sum (or another associative aggregate) over a contiguous range**, on an array that **doesn't change between queries** (or changes rarely, in which case a Fenwick tree/segment tree may be needed instead - see Related).
- The brute-force approach is **O(n) per query** (re-sum the range every time), and there are enough queries that O(n·q) is too slow but O(n + q) is fine.
- A **running total** appears naturally in the problem's phrasing - "cumulative," "running sum," "total so far."

### (c) Not to be confused with

| Pattern | Distinction |
|---|---|
| **Sliding Window** | Sliding window maintains a sum over a range that **shifts** (expand right, contract left) based on a condition, recomputing incrementally as it slides - O(n) total across all window positions, but doesn't support arbitrary, non-adjacent range queries. Prefix sum precomputes once and answers **any** `[L, R]` query in O(1), including ranges accessed in any order. |
| **Difference Array** | Difference array is prefix sum's *inverse operation* - it supports O(1) **range updates** (add a value to every element in `[L, R]`) at the cost of needing a full prefix-sum pass to read back individual values. Prefix sum supports O(1) **range reads** on a static array. They solve opposite problems and are often used together (many updates, then one final reconstruction pass). |
| **Fenwick Tree / Segment Tree** | These support O(log n) range sum queries **and** O(log n) point/range *updates* - useful when the array is mutated between queries. Plain prefix sum requires a full O(n) rebuild after any single update, so it's only appropriate for **immutable** (or rarely-updated) arrays. |

---

## How it works

**Worked example: range sum queries on `[2, 4, -1, 5, 3]`.**

Build prefix array `P` where `P[i]` = sum of `arr[0..i-1]` (i.e. `P[0] = 0`, and `P[i]` accumulates one more element each step):

```
arr:     [2,  4, -1,  5,  3]
index:    0   1   2   3   4

P[0] = 0
P[1] = P[0] + arr[0] = 0 + 2  = 2
P[2] = P[1] + arr[1] = 2 + 4  = 6
P[3] = P[2] + arr[2] = 6 + -1 = 5
P[4] = P[3] + arr[3] = 5 + 5  = 10
P[5] = P[4] + arr[4] = 10 + 3 = 13

P = [0, 2, 6, 5, 10, 13]     (length n+1)
```

**Diagram - reading a range sum as two odometer readings subtracted:**

```
arr:    [ 2 ][ 4 ][-1 ][ 5 ][ 3 ]
P:    0 [ 2 ][ 6 ][ 5 ][10 ][13 ]
      P[0]                        P[5]

Query: sum of arr[1..3] (i.e. 4 + -1 + 5 = 8)
  = P[4] - P[1]
  = 10 - 2
  = 8   ✓
```

**Why the off-by-one convention matters:** `P[i]` is defined as the sum of the first `i` elements (`arr[0]` through `arr[i-1]`), **not** "sum through index `i` inclusive." This means `P` has length `n+1`, with `P[0] = 0` (sum of zero elements) as a sentinel. The payoff: `sum(arr[L..R])` (inclusive, 0-indexed) is `P[R+1] - P[L]` with **no special case for `L = 0`**, because `P[0] = 0` already handles it - if you instead define `P[i]` as "sum through index `i` inclusive" (length `n`, no sentinel), every query needs an `if L == 0` branch to avoid indexing `P[-1]`. The `n+1`-length-with-sentinel convention is what makes the formula uniform.

---

## Complexity

Typical time: **O(n) to build**, **O(1) per range-sum query** thereafter - the entire value of the pattern is amortizing the build cost across many queries. Space: **O(n)** for the prefix array (O(1) extra is possible if only a running total is needed, not random-access range queries).

---

## Constraints & approach

| Input size / query count | Keywords | Reach for | Don't reach for |
|---|---|---|---|
| `n, q ≤ 10⁵` - `10⁶`, array immutable between queries | "range sum query", "many queries" | Prefix sum: O(n + q) total | Re-summing each query: O(n·q) - times out |
| `n, q` large, array **mutated** between queries | "range sum query", "update value at index" | Fenwick tree / segment tree: O((n+q) log n) | Plain prefix sum (would need O(n) rebuild per update) |
| `n ≤ 10⁵`, "count subarrays with sum == K" | "subarray sum equals K" | Prefix sum + hash map of prefix-sum frequencies: O(n) | Brute-force nested loop: O(n²) |
| `n ≤ 10⁵`, 2D grid, many rectangle-sum queries | "range sum query 2D" | 2D prefix sum (inclusion-exclusion over 4 corners): O(nm + q) | Re-summing each rectangle: O(nm·q) |
| Range **update**, not range read, needed frequently | "add value to every element in range" | [Difference Array](./difference-array.md) instead - prefix sum's inverse | Prefix sum with per-update O(n) rebuild |

The signal that pushes you *off* this pattern: if updates happen between queries at anywhere near the same frequency as reads, plain prefix sum's O(n) rebuild-per-update cost dominates - that's when a Fenwick tree or segment tree earns its added complexity.

**Real-world usage:** OLAP/analytics engines precompute running aggregates over immutable time-series windows (e.g. cumulative revenue up to each day) so that any date-range rollup query answers in O(1) instead of re-scanning raw rows - the same precompute-once-query-many trade this pattern makes. **At-scale failure:** "immutable" datasets often stop being immutable as requirements evolve. The moment updates start arriving at meaningful frequency, the O(n) full-rebuild cost per update dominates total query time - exactly the point at which teams migrate to a Fenwick tree or segment tree.

**Cache behavior:** building the prefix array is a single sequential pass over contiguous memory - cache-friendly, with hardware prefetching working in the pattern's favor. Each O(1) range-sum query touches exactly two array slots, which for a prefix array small enough to fit in cache is effectively free; only once the array is large enough to exceed cache size do individual queries risk a cache miss on either endpoint.

---

## Variations

| Variant | Shape | Canonical example |
|---|---|---|
| 1D prefix sum | Single running total array | Range Sum Query - Immutable (LC 303) |
| 2D prefix sum | Running total over rows and columns, inclusion-exclusion for rectangle queries | Range Sum Query 2D - Immutable (LC 304) |
| Prefix sum + hash map (subarray-sum-equals-K family) | Track frequency of each prefix-sum value seen so far | Subarray Sum Equals K (LC 560) |
| Prefix XOR / prefix product | Same accumulation idea, different associative operator | Product of Array Except Self (LC 238, via prefix + suffix product) |
| Prefix sum modulo K | Group prefix sums by remainder mod K | Subarray Sums Divisible by K (LC 974) |
| Weighted / signed prefix sum | Transform values before accumulating (e.g. `+1`/`-1` for a balance problem) | Contiguous Array (LC 525, treating 0 as -1) |

---

## CP-primitives

### 1. 2D prefix sum via inclusion-exclusion

**The trick:** extend the 1D idea to a grid so any rectangle's sum is O(1) after an O(nm) build. `P[i][j]` = sum of the rectangle from `(0,0)` to `(i-1,j-1)`. Building it requires inclusion-exclusion to avoid double-counting the overlap: `P[i][j] = P[i-1][j] + P[i][j-1] - P[i-1][j-1] + grid[i-1][j-1]`. Reading a rectangle sum uses the same inclusion-exclusion pattern in reverse.

```python
def build_2d_prefix(grid: list[list[int]]) -> list[list[int]]:
    rows, cols = len(grid), len(grid[0])
    P = [[0] * (cols + 1) for _ in range(rows + 1)]
    for i in range(1, rows + 1):
        for j in range(1, cols + 1):
            P[i][j] = P[i-1][j] + P[i][j-1] - P[i-1][j-1] + grid[i-1][j-1]
    return P

def rect_sum(P: list[list[int]], r1: int, c1: int, r2: int, c2: int) -> int:
    # inclusive rectangle from (r1,c1) to (r2,c2), 0-indexed
    return P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1]
```

**Why for CP:** turns what looks like it needs O(nm) per rectangle query into O(1) per query after one O(nm) build - the standard technique whenever a contest problem asks for many rectangle-sum queries on a static grid.

### 2. Prefix sum + hash map of frequencies (subarray-sum-equals-K generalization)

**The trick:** to count subarrays summing to exactly `K`, note that `sum(arr[L..R]) == K` iff `prefix[R+1] - prefix[L] == K`, i.e. `prefix[L] == prefix[R+1] - K`. Scan left to right, maintaining a hash map of `{prefix_sum_value: count_of_times_seen}`; at each index, look up how many earlier prefix sums equal `current_prefix - K` and add that count to the answer. This converts an O(n²) pair-enumeration into O(n).

```python
from collections import defaultdict

def subarray_sum_equals_k(arr: list[int], k: int) -> int:
    count = defaultdict(int)
    count[0] = 1                 # empty prefix, handles subarrays starting at index 0
    prefix_sum = 0
    result = 0
    for x in arr:
        prefix_sum += x
        result += count[prefix_sum - k]
        count[prefix_sum] += 1
    return result
```

**Why for CP:** this "prefix sum value → frequency map, look up complement" shape generalizes to sum-divisible-by-K (key by `prefix_sum % K` instead of raw value), longest-subarray-with-sum-K (store first-seen *index* instead of frequency), and XOR-based variants - one mental template covers a whole family of contest problems.

---

## Pitfalls

1. **Off-by-one between the `n`-length and `n+1`-length prefix array conventions.** Using an `n`-length array (`P[i]` = sum through index `i` inclusive) requires a special case for `L = 0` in every query (`P[R] - (P[L-1] if L > 0 else 0)`); the `n+1`-length-with-sentinel convention (`P[0] = 0`) avoids this branch entirely. Mixing the two conventions mid-problem is the most common source of off-by-one bugs in this pattern.

2. **Integer overflow on accumulated sums (CP-flavored).** In languages with fixed-width integers, a prefix sum over `n = 10⁵` elements each up to `10⁹` can reach `10¹⁴`, overflowing 32-bit integers but well within a 64-bit range (~9.2×10¹⁸) - use 64-bit accumulators (Python's arbitrary-precision integers sidestep this, but C++/Java do not).

3. **Rebuilding the entire prefix array after a single point update, when a Fenwick tree was actually needed.** Plain prefix sum is O(n) to rebuild after any single element changes - if the problem has interleaved updates and queries at meaningful frequency, this degrades to O(n) per update, which a Fenwick tree/segment tree avoids at O(log n) per update. Recognize this before committing to plain prefix sum.

4. **Forgetting to initialize the hash map with `{0: 1}` in subarray-sum-equals-K style problems.** Without seeding the frequency map with a prefix sum of `0` occurring once (representing the "empty prefix" before the array starts), subarrays starting at index 0 that sum to exactly `k` are missed - the lookup `count[prefix_sum - k]` needs `prefix_sum - k == 0` to already have an entry.

**Common misconceptions:** *"prefix sum only works for sums."* False - the same precompute-once-query-many idea generalizes to any **associative** operator: prefix product (Product of Array Except Self), prefix XOR, prefix min/max. The technique isn't specifically about addition; it's about turning any associative combine over a contiguous range into two precomputed-value lookups plus one combine (subtraction for sums, but division-free multiplication-splitting for products, XOR-of-XOR for XOR, and so on).

---

## First 30 seconds

*"This is prefix sum - I'll precompute cumulative totals once in O(n), so any range sum becomes O(1) subtraction afterward. If I need to count subarrays matching a sum condition rather than just answer range queries, I'll pair this with a hash map of prefix-sum frequencies to get O(n) instead of O(n²)."*

Then state up front whether the array is mutated between queries - if so, redirect to a Fenwick tree/segment tree instead of committing to plain prefix sum.

---

## Related

- [Difference Array](./difference-array.md) - the inverse operation: O(1) range updates instead of O(1) range reads
- [Hash Table](../data-structures/hash-table.md) - paired with prefix sums for the subarray-sum-equals-K family
- [Two Pointers](./two-pointers.md) - an alternative for range-sum problems specifically when all values are non-negative (sliding window works directly); prefix sum is needed once negative values are allowed
- [Sliding Window](./sliding-window.md) - handles a shifting range with an incrementally maintained aggregate, rather than arbitrary O(1) lookups on a static array

---

## Practice problems

### 1. Range Sum Query - Immutable (LC 303)

Design a class that, given an integer array, answers multiple `sumRange(left, right)` queries efficiently. Constraints: `1 ≤ n ≤ 10⁴`, up to `10⁴` queries.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [-2,0,3,-5,2,-1], sumRange(0,2) | **Output:** 1
  - **Explanation:** -2 + 0 + 3 = 1.
- **Example 2**
  - **Input:** nums = [-2,0,3,-5,2,-1], sumRange(2,5) | **Output:** -1

**Constraints:** `1 ≤ n ≤ 10⁴`, `-10⁵ ≤ nums[i] ≤ 10⁵`, up to `10⁴` calls to `sumRange`.

**Approach.** Build the prefix-sum array once in the constructor. Each query is `prefix[right+1] - prefix[left]`.

```python
class NumArray:
    def __init__(self, nums: list[int]):
        self.prefix = [0] * (len(nums) + 1)
        for i, x in enumerate(nums):
            self.prefix[i + 1] = self.prefix[i] + x

    def sum_range(self, left: int, right: int) -> int:
        return self.prefix[right + 1] - self.prefix[left]
```

**Complexity.** O(n) build, O(1) per query, O(n) space.

**Duplicate problems:**
- Range Sum Query 2D - Immutable (LC 304) - same idea generalized to two dimensions.
- Running Sum of 1d Array (LC 1480) - the prefix array itself is the answer, no queries needed.

---

### 2. Subarray Sum Equals K (LC 560)

Given an array of integers (possibly negative) and target `k`, return the total number of contiguous subarrays summing to `k`. Constraints: `1 ≤ n ≤ 2×10⁴`, `-1000 ≤ nums[i], k ≤ 1000`.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [1,1,1], k = 2 | **Output:** 2
  - **Explanation:** [1,1] at indices [0,1] and [1,2] both sum to 2.
- **Example 2**
  - **Input:** nums = [1,2,3], k = 3 | **Output:** 2
  - **Explanation:** [1,2] and [3] both sum to 3.

**Constraints:** `1 ≤ n ≤ 2×10⁴`, `-1000 ≤ nums[i] ≤ 1000`, `-10⁷ ≤ k ≤ 10⁷`.

**Approach.** Maintain a running prefix sum and a hash map of prefix-sum frequencies. At each step, the number of valid subarrays ending here equals how many earlier prefix sums equal `current_prefix - k`.

```python
from collections import defaultdict

def subarray_sum(nums: list[int], k: int) -> int:
    count = defaultdict(int)
    count[0] = 1
    prefix_sum = 0
    result = 0
    for x in nums:
        prefix_sum += x
        result += count[prefix_sum - k]
        count[prefix_sum] += 1
    return result
```

**Complexity.** O(n) time, O(n) space.

**Duplicate problems:**
- Subarray Sums Divisible by K (LC 974) - same map-based lookup, keyed by remainder instead of raw value.
- Continuous Subarray Sum (LC 523) - same remainder-keyed map, tracking first-seen index instead of count.

---

### 3. Product of Array Except Self (LC 238)

Given an array, return an array where `answer[i]` is the product of all elements except `nums[i]`, in O(n) time without using division. Constraints: `2 ≤ n ≤ 10⁵`.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [1,2,3,4] | **Output:** [24,12,8,6]
- **Example 2**
  - **Input:** nums = [-1,1,0,-3,3] | **Output:** [0,0,9,0,0]
  - **Explanation:** a single zero makes every product except the zero's own index equal to 0.

**Constraints:** `2 ≤ n ≤ 10⁵`, `-30 ≤ nums[i] ≤ 30`, product of any prefix/suffix fits in a 32-bit integer.

**Approach.** Build a prefix-product pass (product of everything strictly to the left of `i`) and a suffix-product pass (product of everything strictly to the right), then multiply the two at each index - the multiplicative analogue of prefix sum, avoiding division entirely (which would break on zero elements).

```python
def product_except_self(nums: list[int]) -> list[int]:
    n = len(nums)
    answer = [1] * n
    prefix = 1
    for i in range(n):
        answer[i] = prefix
        prefix *= nums[i]
    suffix = 1
    for i in range(n - 1, -1, -1):
        answer[i] *= suffix
        suffix *= nums[i]
    return answer
```

**Complexity.** O(n) time, O(1) extra space (excluding the O(n) output array).

**Duplicate problems:**
- Trapping Rain Water (LC 42) - same "prefix pass + suffix pass, combine" shape, with max instead of product.
- Range Sum Query - Immutable (LC 303) - same precompute-once-query-many idea, additive instead of multiplicative.

