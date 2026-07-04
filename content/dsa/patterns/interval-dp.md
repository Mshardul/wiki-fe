# Interval DP

## Prerequisites

- [Dynamic Programming](../algorithms/dynamic-programming.md) [Must read] - interval DP is a DP shape; you need the recurrence/memoization/tabulation distinction and the idea of optimal substructure before the interval formulation makes sense.
- [DP Patterns](./dp-patterns.md) [Should read] - surveys the major DP shapes; interval DP is one of them, and seeing it alongside 1D and 2D DP helps you place it correctly.
- [Recursion](../algorithms/recursion.md) [Should read] - the top-down memo form of interval DP is direct recursion; comfortable recursion makes the base-case / overlap reasoning cleaner.

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
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)

## What it is

**Interval DP** is the pattern where the state is a contiguous subarray (or subrange) `[i, j]` and the recurrence fills larger intervals from smaller ones by trying every possible **split point** `k` inside `[i, j]`. It applies when the optimal way to handle `[i, j]` depends on how you split it into two sub-intervals, and the sub-problems overlap (the same `[i, j]` is needed by many larger intervals).

Mental model: **a table of sub-problems where you fill the diagonal first.** The cell `dp[i][j]` holds the answer for the subarray from index `i` to `j`. You start with single-element intervals (the main diagonal), then two-element, then three-element, and so on - each cell is filled from smaller cells already computed. The outer loop is "interval length", the inner loops are "all intervals of that length", and the innermost is "all split points."

> **Takeaway (say this out loud):** "Interval DP - state is `dp[i][j]` for the subrange `[i,j]`, fill by length, try every split point `k` inside the interval, O(n³) time and O(n²) space."

## Recognition signals

### (a) Trigger phrases

- "Find the **minimum/maximum cost** to reduce an array to one element by repeatedly merging/splitting adjacent segments"
- "**Burst all balloons** to maximize coins - bursting order matters"
- "**Optimal parenthesization** of a chain of matrices to minimize multiplications"
- "**Minimum number of moves** to score optimally by removing intervals from both ends"
- "Find the minimum cost to make a string a palindrome by inserting / deleting characters"

### (b) Structural cues

- **Input:** a 1-D sequence (array, string, or chain of objects) where **order is fixed** and the cost/value of an operation depends on a **contiguous subrange** of it.
- **Output property:** a scalar (min cost, max score, count of ways) for the whole sequence, derivable by choosing an optimal split inside every subrange.
- **Key shape:** the problem is self-similar - the answer for `[i, j]` is composed of answers for `[i, k]` and `[k+1, j]` for some `k`. Sub-problems for smaller intervals are reused many times.
- **Recurrence shape:** `dp[i][j] = min/max over k in [i, j-1] of (dp[i][k] + dp[k+1][j] + cost(i, k, j))`.

### (c) Not to be confused with

- **1-D DP (LIS, Kadane's):** those DP states are a single index `i` ("best answer ending at i"); interval DP states are a pair `[i, j]` - if your recurrence only needs one boundary, it's not interval DP.
- **Bitmask DP:** bitmask DP encodes a *subset* of n items as a bitmask (order doesn't matter, membership does); interval DP encodes a *contiguous range* (order matters, the range must be a slice of the original sequence). If the problem lets you pick items in any order, it's bitmask; if the sequence is fixed and you split contiguous segments, it's interval DP.
- **Divide and Conquer (non-DP):** D&C splits a problem into independent sub-problems; interval DP splits into *overlapping* sub-problems that are cached. If `[i, k]` and `[k+1, j]` never share sub-problems, you don't need DP - but they almost always do in interval problems.

## How it works

Fill a 2-D table `dp[0..n-1][0..n-1]` by interval length, from length 1 up to length n.

```
Example: Burst Balloons (LC 312)
nums = [3, 1, 4]  (padded: [1, 3, 1, 4, 1])

dp[i][j] = max coins from bursting all balloons in (i, j) exclusive
Base: dp[i][i+1] = 0 (no balloons between adjacent indices)

Fill by gap (j - i):
gap = 2 (intervals of length 1 balloon):
  dp[0][2]: try k=1 → nums[0]*nums[1]*nums[2] = 1*3*1 = 3  → dp[0][2] = 3
  dp[1][3]: try k=2 → nums[1]*nums[2]*nums[3] = 3*1*4 = 12 → dp[1][3] = 12
  dp[2][4]: try k=3 → nums[2]*nums[3]*nums[4] = 1*4*1 = 4  → dp[2][4] = 4

gap = 3 (intervals of 2 balloons):
  dp[0][3]: try k=1 → dp[0][1] + dp[1][3] + nums[0]*nums[1]*nums[3] = 0 + 12 + 1*3*4 = 24
            try k=2 → dp[0][2] + dp[2][3] + nums[0]*nums[2]*nums[3] = 3 + 0 + 1*1*4 = 7
            dp[0][3] = 24
  dp[1][4]: try k=2 → dp[1][2] + dp[2][4] + nums[1]*nums[2]*nums[4] = 0 + 4 + 3*1*1 = 7
            try k=3 → dp[1][3] + dp[3][4] + nums[1]*nums[3]*nums[4] = 12 + 0 + 3*4*1 = 24
            dp[1][4] = 24

gap = 4 (the whole array):
  dp[0][4]: try k=1 → dp[0][1] + dp[1][4] + 1*3*1 = 0 + 24 + 3 = 27
            try k=2 → dp[0][2] + dp[2][4] + 1*1*1 = 3 + 4 + 1 = 8
            try k=3 → dp[0][3] + dp[3][4] + 1*4*1 = 24 + 0 + 4 = 28
            dp[0][4] = 28  ← answer
```

**Why "last balloon burst" rather than "first":** the standard Burst Balloons formulation chooses `k` as the *last* balloon burst in `(i, j)`, which means `dp[i][k]` and `dp[k][j]` are already fully resolved - no dependency on what's outside `(i, j)`. Choosing the *first* balloon instead creates a dependency on the outer context, which breaks the sub-problem isolation that DP requires.

**Fill order matters:** you must fill smaller intervals before larger ones, because `dp[i][j]` references `dp[i][k]` and `dp[k+1][j]` for `k` strictly inside `[i, j]`. The loop `for length in range(2, n+1): for i in range(n-length+1): j = i+length-1` achieves this.

## Skeleton

**Pseudocode (CLRS style):**

```
IntervalDP(n, cost) → dp[0][n-1]:
    ▷ cost(i, k, j) = contribution of split point k to interval [i,j]
    dp[0..n-1][0..n-1] ← 0 (or −∞ for max problems)
    ▷ base cases: single elements
    for i = 0 to n-1
        dp[i][i] ← base_value(i)
    ▷ fill by interval length
    for length = 2 to n
        for i = 0 to n - length
            j ← i + length - 1
            dp[i][j] ← ∞ (or −∞)
            for k = i to j - 1
                dp[i][j] ← min(dp[i][j], dp[i][k] + dp[k+1][j] + cost(i, k, j))
    return dp[0][n-1]
```

**Python template (bottom-up):**

```python
def interval_dp(n: int) -> int:
    dp: list[list[int]] = [[0] * n for _ in range(n)]

    # base cases: intervals of length 1
    for i in range(n):
        dp[i][i] = 0  # or problem-specific base value

    # fill by increasing interval length
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = float("inf")  # or -inf for max
            for k in range(i, j):  # try every split point
                cost = 0  # your logic here: cost of this split
                dp[i][j] = min(dp[i][j], dp[i][k] + dp[k + 1][j] + cost)

    return dp[0][n - 1]
```

**Python template (top-down memo):**

```python
from functools import lru_cache

def interval_dp_memo(n: int) -> int:
    @lru_cache(maxsize=None)
    def dp(i: int, j: int) -> int:
        if i == j:
            return 0  # base case
        result = float("inf")
        for k in range(i, j):
            cost = 0  # your logic here
            result = min(result, dp(i, k) + dp(k + 1, j) + cost)
        return result

    return dp(0, n - 1)
```

**Which form to use:** bottom-up avoids recursion overhead and is preferred in contests (no stack depth risk). Top-down with `@lru_cache` is easier to write correctly for irregular base cases (palindrome DP, where `dp[i][i]=0` and `dp[i][i-1]=0`).

## Complexity

| Metric | Value |
|--------|-------|
| Time | O(n³) - n² intervals × n split points each |
| Space | O(n²) for the dp table |
| Recursion stack (top-down) | O(n) - max depth is n/2 nested calls |

**Where the n³ comes from:** for each of the O(n²) `(i, j)` pairs, you try O(n) split points. No known general approach reduces interval DP below O(n³) in the worst case, though specific cost functions admit the Knuth-Yao speedup (see CP-primitives).

**Cache behavior:** the dp table is n² cells × 8 bytes = 2 MB at n = 500 - this spills out of L2 (typically 256 KB–1 MB per core). The bottom-up fill accesses `dp[i][k]` and `dp[k+1][j]` in diagonal stripes, not sequential rows, so the hardware prefetcher doesn't help. In practice the inner loop (over k) still hits the same row `dp[i][*]` sequentially, which stays warm; the `dp[k+1][j]` accesses scatter across rows and cause the misses. At n ≤ 300 (720 KB table, borderline L2) this is rarely the bottleneck; at n = 500 in a tight C++ inner loop, cache misses on `dp[k+1][j]` can cost 30–40% of wall time.

## Constraints & approach

| n (sequence length) | Approach |
|---------------------|----------|
| n ≤ 10 | Brute-force enumeration / backtracking - O(n!) at worst |
| n ≤ 500 | **Interval DP** - O(n³) ≈ 1.25 × 10⁸ ops; tight but usually fine in C++/Python with simple cost |
| n ≤ 500, monge cost | **Interval DP + Knuth-Yao** - O(n²); cost must satisfy the quadrangle inequality |
| n ≤ 10⁵ | Interval DP is too slow; look for a greedy, stack-based, or O(n log n) approach |

**When the constraint pushes you off interval DP:**
- n > 500 with a general cost: O(n³) won't pass in most OJs (≈ 10⁸–10⁹ ops depending on cost). Look for a greedy exchange argument or a different DP formulation.
- The "intervals" are not contiguous sub-sequences: if you can pick arbitrary subsets or permutations, interval DP doesn't apply - bitmask DP or backtracking is the shape.
- The cost is separable with no split-point dependency: then it's 1-D DP, not interval DP.

**Real-world usage:** interval DP is the algorithm inside every **LaTeX / text-layout engine's line-breaking optimizer** (the Knuth-Plass algorithm minimizes badness over all paragraph breaks - a chain of intervals). **At scale:** for n > 10⁴, O(n³) is unusable; production compilers use approximations (greedy first-fit) with dynamic fallback only on pathological inputs.

## Variations

- **Palindrome DP:** `dp[i][j]` = min insertions to make `s[i..j]` a palindrome. Base: `dp[i][i] = 0` (single char), `dp[i][i-1] = 0` (empty). Recurrence: `s[i]==s[j]` → `dp[i][j] = dp[i+1][j-1]` (outer chars already match, recurse inward); else `dp[i][j] = 1 + min(dp[i+1][j], dp[i][j-1])` (insert one char to match either end). Fill bottom-up from shorter to longer intervals. Note: this is *not* the standard split-point-k recurrence - it's a shrink-inward recurrence, which is why it fills from bottom-right to top-left (`for i in range(n-1, -1, -1)`) rather than by length. It shares the O(n²) table and O(n²) fill, but the dependency is inward rather than through a split.
- **Optimal BST:** given search probabilities `p[i]` and miss probabilities `q[i]`, find the BST that minimizes expected search cost. `dp[i][j]` = min cost tree for keys `i..j`; split point is the root. O(n³) plain, O(n²) with Knuth-Yao.
- **Matrix Chain Multiplication:** classic interval DP; `dp[i][j]` = min scalar multiplications for the chain `M_i × ... × M_j`. Split point `k` gives `dp[i][k] + dp[k+1][j] + dims[i] × dims[k+1] × dims[j+1]`.
- **Stone merging / Zuma game:** merge adjacent piles / groups, cost is the merged pile's weight (or a function of the merged group). Identical shape to matrix chain - only the cost function changes.
- **Minimum cost to cut a stick (LC 1547):** the cost of a cut depends on the current stick length, not just the two pieces. Sort cut positions, pad with 0 and L, reframe as merging intervals - standard interval DP.

## CP-primitives

### Knuth-Yao speedup (O(n²) for convex cost functions)

When the cost function satisfies the **quadrangle inequality** (also called the "concave SMAWK" or "Monge condition"), the optimal split point `opt[i][j]` is monotone: `opt[i][j-1] ≤ opt[i][j] ≤ opt[i+1][j]`. This bounds the total work to O(n²).

**Condition:** `cost(a, c) + cost(b, d) ≤ cost(a, d) + cost(b, c)` for all `a ≤ b ≤ c ≤ d`. Holds for matrix chain, optimal BST, and stone merging with additive weight.

**Why for CP:** many CP problems have costs satisfying this - applying Knuth-Yao turns a TLE O(n³) into an AC O(n²) on n ≤ 10⁴.

```python
def interval_dp_knuth(n: int, w: list[list[int]]) -> list[list[int]]:
    dp = [[0] * n for _ in range(n)]
    opt = [[0] * n for _ in range(n)]

    for i in range(n):
        opt[i][i] = i

    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = float("inf")
            lo = opt[i][j - 1]
            hi = opt[i + 1][j] if i + 1 <= j else j
            for k in range(lo, min(hi, j - 1) + 1):
                val = dp[i][k] + dp[k + 1][j] + w[i][j]
                if val < dp[i][j]:
                    dp[i][j] = val
                    opt[i][j] = k
    return dp
```

### Padding to avoid boundary special-cases

Many interval DP problems (Burst Balloons, minimum cost cut) pad the input with sentinel values at both ends. This eliminates the `if i > 0 and j < n-1` guards in the recurrence - the sentinels are always present and contribute 0 or 1 to the cost function.

**Why for CP:** clean up the recurrence by 5–10 lines and eliminate a common source of off-by-one errors. In Burst Balloons, padding with `[1] + nums + [1]` means the last balloon in any interval always has a left and right neighbor - no boundary check needed.

## Worked problems

### 1. Burst Balloons (LC 312)

Given n balloons with values `nums[i]`, burst all of them. Bursting balloon `i` earns `nums[i-1] * nums[i] * nums[i+1]` coins. Return max coins. n ≤ 500.

**Approach (n ≤ 500):** pad with sentinels: `vals = [1] + nums + [1]`. `dp[i][j]` = max coins from bursting all balloons strictly between indices `i` and `j` in `vals`. Choose `k` as the *last* balloon burst in `(i, j)`: `dp[i][j] = max over k of (dp[i][k] + dp[k][j] + vals[i]*vals[k]*vals[j])`. Fill by gap length. O(n³), O(n²) space.

### 2. Minimum Cost to Merge Stones (LC 1000)

n piles of stones, each merge combines k adjacent piles into one, costing their sum. Find minimum total cost to reduce to one pile. If impossible return -1. n ≤ 30, k ≤ 30.

**Approach (n ≤ 30):** first check feasibility: `(n - 1) % (k - 1) == 0`. `dp[i][j]` = min cost to merge piles `i..j` into as few piles as possible. Use prefix sums for range sum in O(1). The recurrence merges `[i, m]` and `[m+1, j]` for `m` stepping by `k-1`. O(n³/k) - the step constraint prunes split points. When `(j - i) % (k - 1) == 0`, add `prefix[j+1] - prefix[i]` (cost of the final merge that reduces to one pile).

### 3. Strange Printer (LC 664)

A printer can print a sequence of the same character in one turn, but each new print replaces characters already printed in that range. Find the minimum turns to print string `s`. n ≤ 100.

**Approach (n ≤ 100):** `dp[i][j]` = min turns to print `s[i..j]`. Base: `dp[i][i] = 1`. For `j > i`: `dp[i][j] = dp[i][j-1] + 1` (print `s[j]` alone). Then optimize: for each `k` in `[i, j-1]` where `s[k] == s[j]`, we can extend the turn that printed `s[k]` to also cover `s[j]` for free: `dp[i][j] = min(dp[i][j], dp[i][k] + dp[k+1][j-1])` (with `dp[k+1][j-1] = 0` when `k+1 > j-1`). O(n³).

### 4. Palindrome Partitioning II (LC 132)

Given string `s`, partition it into the fewest substrings that are all palindromes. n ≤ 1000.

**Approach:** not pure interval DP - a 1-D DP `cuts[i]` = min cuts for `s[0..i]` with a precomputed `is_pal[i][j]` table. The `is_pal` table is filled by interval DP: `is_pal[i][j] = (s[i]==s[j]) and is_pal[i+1][j-1]`. Then `cuts[i] = min(cuts[j-1] + 1)` for all `j ≤ i` where `is_pal[j][i]`. O(n²) time with the precomputed table. Included here because it's commonly misclassified as pure interval DP - the outer DP is 1-D.

## Pitfalls

- **Wrong fill order.** Filling by `(i, j)` in row-major order (i=0..n, j=0..n) is wrong - `dp[i][j]` references `dp[i][k]` and `dp[k+1][j]` for `k < j` and `k ≥ i`, so smaller intervals must be ready first. Always fill by **interval length** (outer loop = length from 2 to n).
- **Off-by-one in split point range.** The split point `k` ranges from `i` to `j-1` (not `i+1` to `j`, not `i` to `j`). The interval `[i, k]` has `k` as the last index, `[k+1, j]` starts at `k+1`. Getting this wrong produces silent wrong answers - the table fills without errors but with incorrect values.
- **Conflating "first operation" and "last operation" in the recurrence.** In Burst Balloons, `k` must be the *last* balloon burst (not the first) to keep sub-problems independent. Choosing `k` as the first means the coins earned depend on which outer balloons are still present - that's context outside `[i, j]`, breaking isolation. If your recurrence gives wrong answers, check whether you're choosing first vs last.
- **Forgetting the base cases for empty intervals.** Some problems need `dp[i][i-1] = 0` (empty interval) as well as `dp[i][i] = base`. In Python, initialize the entire table to 0 or infinity and set base cases explicitly - don't rely on Python's default 0 for list initialization if infinity is the correct base for a min problem.
- **n ≤ 500 is the limit, not a guarantee.** O(n³) at n = 500 is 1.25 × 10⁸ operations - fast in C++, potentially slow in Python (≈ 60–120 seconds). In Python, use `sys.stdin` for fast I/O and consider PyPy if available. At n = 300 Python is usually fine; n = 500 may need the Knuth-Yao speedup.

## First 30 seconds

"This is interval DP - the answer for the full sequence decomposes into answers for sub-intervals by trying every split point. My state is `dp[i][j]` for the subrange `[i, j]`; I fill by interval length from 1 up to n; for each interval I try every split point `k` and take the best combination of `dp[i][k]`, `dp[k+1][j]`, and the cost of the split. O(n³) time, O(n²) space. I'll pad with sentinels if the cost function needs neighbors at the boundary."

## Related

- [Dynamic Programming](../algorithms/dynamic-programming.md) - the general DP framework; interval DP is one filling strategy.
- [DP Patterns](./dp-patterns.md) - surveys all major DP shapes and where interval DP sits relative to 1-D, 2-D, and bitmask DP.
- [Bitmask DP](./bitmask-dp.md) - the other 2-D DP shape; choose interval DP when the sequence is ordered and you split contiguous ranges, bitmask when you choose arbitrary subsets.
- [Prefix Sum](./prefix-sum.md) - almost every interval DP uses prefix sums to compute range sums in O(1) inside the O(n³) loop; combine them.
- [Divide and Conquer](../algorithms/divide-and-conquer.md) - similar splitting structure, but D&C sub-problems are independent (no overlap, no memoization needed).

## What the interviewer probes for

**"Why must k be the last operation rather than the first?"**
If k is the first balloon burst in `(i, j)`, the coins earned are `vals[i-1] * vals[k] * vals[j+1]` - but `vals[i-1]` and `vals[j+1]` are outside the sub-problem's boundary and depend on what the outer DP has already done. Sub-problem isolation breaks: `dp[i][j]` would need to know its context, making the recurrence circular. Choosing k as the *last* burst means `vals[i]` and `vals[j]` (the sentinels bounding `(i, j)`) are still present when k is burst - they're the fixed walls of the sub-problem, not anything the inner DP touches.

**"What if n = 500 and you're in Python - does interval DP pass?"**
Likely no. O(n³) at n = 500 is 1.25 × 10⁸ iterations; Python executes roughly 10⁷ simple operations per second, so this is 10–100 seconds - a TLE. Options: (1) use PyPy if the judge allows it; (2) apply the Knuth-Yao speedup if the cost satisfies the quadrangle inequality, dropping to O(n²) ≈ 250k iterations; (3) rewrite the inner loop in C via `ctypes` or use `numpy` for the cost computation. In interviews (no TLE), state the O(n³) complexity, note the Python constant, and mention Knuth-Yao as the optimization path.

**"How do you check if Knuth-Yao applies?"**
Verify the quadrangle inequality: `cost(a, c) + cost(b, d) ≤ cost(a, d) + cost(b, c)` for all `a ≤ b ≤ c ≤ d`. Intuitively, "the cost of merging two wide intervals is at least as large as the sum of costs for two crossing narrower intervals." Additive range-sum costs (stone merging: cost = sum of the merged pile) satisfy this. Multiplicative or max-based costs usually don't - check by plugging in small examples.

## Practice problems

### 1. Burst Balloons (LC 312)

Given n balloons with integer values `nums`, burst them one at a time. Bursting balloon `i` (when its neighbors are `l` and `r`) earns `nums[l] * nums[i] * nums[r]`. Maximize total coins. n ≤ 500, values ≤ 100.

**Approach:** pad `nums` with 1 on both ends. `dp[i][j]` = max coins from balloons strictly between positions `i` and `j`. For each sub-interval, try every `k` in `(i, j)` as the *last* balloon burst: `dp[i][j] = max(dp[i][k] + dp[k][j] + vals[i]*vals[k]*vals[j])`. Fill by gap length. O(n³) time, O(n²) space.

```python
from typing import List

def maxCoins(nums: List[int]) -> int:
    vals = [1] + nums + [1]
    n = len(vals)
    dp = [[0] * n for _ in range(n)]

    for gap in range(2, n):
        for i in range(n - gap):
            j = i + gap
            for k in range(i + 1, j):
                coins = vals[i] * vals[k] * vals[j]
                dp[i][j] = max(dp[i][j], dp[i][k] + dp[k][j] + coins)
    return dp[0][n - 1]
```

**Complexity:** O(n³) time, O(n²) space.

**Duplicate problems:**
- Zuma Game (LC 488) - burst groups of same-colored balls; interval DP on the sequence of groups, cost depends on group size. Same shape, more complex cost function.
- Remove Boxes (LC 546) - burst boxes where adjacent same-colored boxes earn k² points; the state is `dp[i][j][k]` (k boxes of same color appended to the right), extending interval DP to 3-D.

### 2. Minimum Cost Tree from Leaf Values (LC 1130)

Given an array `arr` of leaf values, construct a non-leaf binary tree where each non-leaf node's value is the product of the max leaf values in its left and right subtrees. Minimize the sum of non-leaf node values. n ≤ 40, values ≤ 15.

**Approach:** `dp[i][j]` = minimum sum of non-leaf values for a tree built from leaves `arr[i..j]`. Split at `k`: the left subtree covers `arr[i..k]`, the right covers `arr[k+1..j]`, and the non-leaf node at this split contributes `max(arr[i..k]) * max(arr[k+1..j])`. Precompute `range_max[i][j]` in O(n²). Fill dp by length. O(n³) time, O(n²) space.

```python
from typing import List

def mctFromLeafValues(arr: List[int]) -> int:
    n = len(arr)
    INF = float("inf")
    rmax = [[0] * n for _ in range(n)]
    for i in range(n):
        rmax[i][i] = arr[i]
        for j in range(i + 1, n):
            rmax[i][j] = max(rmax[i][j - 1], arr[j])

    dp = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = INF
            for k in range(i, j):
                cost = rmax[i][k] * rmax[k + 1][j]
                dp[i][j] = min(dp[i][j], dp[i][k] + dp[k + 1][j] + cost)
    return dp[0][n - 1]
```

**Complexity:** O(n³) time, O(n²) space.

**Duplicate problems:**
- Matrix Chain Multiplication (classic) - same shape; cost is `dims[i] * dims[k+1] * dims[j+1]`; the textbook interval DP problem.
- Minimum Cost to Merge Stones (LC 1000) - merge k adjacent piles; cost = sum of merged pile; same fill, different stride (step by k-1 for split points).

### 3. Strange Printer (LC 664)

A printer prints sequences of the same character in one turn; a new print can overwrite part of an existing print. Given string `s`, find the minimum number of turns to print it. n ≤ 100.

**Approach:** `dp[i][j]` = min turns for `s[i..j]`. Base: `dp[i][i] = 1`. For larger intervals: start with `dp[i][j-1] + 1` (print `s[j]` alone). For each `k` in `[i, j-1]` where `s[k] == s[j]`, the turn that prints `s[k]` can be extended to also print `s[j]` at no extra cost: `dp[i][j] = min(dp[i][j], dp[i][k] + dp[k+1][j-1])` (empty interval `dp[k+1][j-1] = 0` when `k+1 > j-1`). O(n³) time.

```python
def strangePrinter(s: str) -> int:
    n = len(s)
    dp = [[0] * n for _ in range(n)]

    for i in range(n - 1, -1, -1):
        dp[i][i] = 1
        for j in range(i + 1, n):
            dp[i][j] = dp[i][j - 1] + 1
            for k in range(i, j):
                if s[k] == s[j]:
                    inner = dp[k + 1][j - 1] if k + 1 <= j - 1 else 0
                    dp[i][j] = min(dp[i][j], dp[i][k] + inner)
    return dp[0][n - 1]
```

**Complexity:** O(n³) time, O(n²) space.

**Duplicate problems:**
- Palindrome Partitioning II (LC 132) - precompute `is_pal[i][j]` by interval DP, then 1-D DP for min cuts; the interval part is the same recurrence.
- Minimum Insertion Steps to Make a String Palindrome (LC 1312) - `dp[i][j]` = min insertions; `s[i]==s[j]` → `dp[i+1][j-1]`, else `1 + min(dp[i+1][j], dp[i][j-1])`; classic palindrome interval DP.
