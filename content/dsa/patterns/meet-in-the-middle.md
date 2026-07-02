# Meet in the Middle

## Prerequisites

- [Binary Search](../algorithms/binary-search.md) [Must read] - the combine step sorts one half and binary-searches it; you need to know `bisect_left` and its boundary semantics
- [Subsets & Permutations](./subsets-permutations.md) [Must read] - generating all subsets of a half is the core enumeration step
- [Bitmask DP](./bitmask-dp.md) [Must read] - often the alternative when n ≤ 20; understand why bitmask DP breaks at n ≈ 35–40
- [Dynamic Programming](../algorithms/dynamic-programming.md) [Must read] - know when DP applies (overlapping subproblems) and why MITM is different (independent halves, no recurrence)
- [Backtracking](../algorithms/backtracking.md) [Must read] - used to enumerate the power set of each half recursively

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

**Meet in the Middle (MITM)** is a divide-and-conquer technique that cuts an exponential search space in half by splitting the input into two equal halves, exhaustively enumerating each half independently, then combining the two result sets — typically by sorting one half and binary-searching it.

**Mental model:** imagine two explorers starting from opposite ends of a maze; instead of one person walking the entire O(2ⁿ) path, both walk O(2^(n/2)) steps and meet somewhere in the middle.

> **Takeaway:** "Split the input in half, enumerate each half independently (2^(n/2) each), sort one, binary-search from the other — turns O(2ⁿ) into O(2^(n/2) · n)."

## Recognition signals

**(a) Trigger phrases**

- "given n ≤ 40 integers, find a subset that sums to target T"
- "count pairs (i, j) where i is from the first half and j from the second half such that …"
- "find four numbers summing to zero" (4-sum variant where brute force is O(n⁴))
- "n ≤ 40 and find if any subset satisfies constraint X" — the n ≤ 40 phrase is almost a signature

**(b) Structural cues**

- Input size in the range 30–45 where 2ⁿ is TLE (2⁴⁰ ≈ 10¹²) but 2^(n/2) is fine (2²⁰ ≈ 10⁶)
- The search space is a power set or Cartesian product — every element is either included or excluded (or chosen from a set of options)
- The objective decomposes cleanly across a split: `f(left_half) ⊕ f(right_half) = target` where ⊕ is addition, XOR, concatenation, or a similarly splittable operation
- Output is "does it exist?", "count of", or "closest value" — not "all solutions" (all-solutions would still be exponential)

**(c) Not to be confused with**

- **Two Pointers:** two pointers walk a *single sorted array* from both ends toward the center; MITM generates *two independent result sets* from two halves of the input and merges them. Different mechanism, different trigger.
- **DP (Dynamic Programming):** DP requires *overlapping subproblems* and a recurrence — the same sub-state is reached many ways. MITM works when the two halves are *independent* and there is no recurrence structure to exploit. If n ≤ 20 and subproblems overlap, reach for DP first.
- **Bidirectional BFS:** also called "meet in the middle" in graph contexts — expands from both source and target until frontiers meet. Shares the name and the "halving" intuition but operates on a graph rather than a power set.

## How it works

The technique has three phases: **split → enumerate → combine**.

**Concrete trace — subset sum with n = 6, target T = 9**

Input: `A = [3, 1, 4, 1, 5, 9]`, target = 9

**Phase 1 — Split**

```
Left half  L = [3, 1, 4]      (indices 0..2)
Right half R = [1, 5, 9]      (indices 3..5)
```

**Phase 2 — Enumerate all subset sums of each half**

```
Subsets of L = [3, 1, 4]:
  {}         → 0
  {3}        → 3
  {1}        → 1
  {4}        → 4
  {3,1}      → 4
  {3,4}      → 7
  {1,4}      → 5
  {3,1,4}    → 8

left_sums  = [0, 3, 1, 4, 4, 7, 5, 8]   (2³ = 8 values)

Subsets of R = [1, 5, 9]:
  {}         → 0
  {1}        → 1
  {5}        → 5
  {9}        → 9
  {1,5}      → 6
  {1,9}      → 10
  {5,9}      → 14
  {1,5,9}   → 15

right_sums = [0, 1, 5, 9, 6, 10, 14, 15]  (2³ = 8 values)
```

**Phase 3 — Combine via sort + binary search**

Sort `right_sums`: `[0, 1, 5, 6, 9, 10, 14, 15]`

For each `s` in `left_sums`, check if `target - s` exists in sorted `right_sums`:

```
s = 0  → need 9  → bisect finds 9  ✓  FOUND
```

A subset from L with sum 0 (the empty set) plus a subset from R with sum 9 (`{9}`) gives target 9.

**ASCII diagram — the three phases**

```
Input A = [3, 1, 4, 1, 5, 9]   (n = 6)
              |
         ┌────┴────┐
    Left half    Right half
    [3, 1, 4]    [1, 5, 9]
         │              │
    enumerate       enumerate
    2³=8 sums       2³=8 sums
         │              │
  [0,3,1,4,         [0,1,5,9,
   4,7,5,8]          6,10,14,15]
         │              │
         └──────┬────────┘
              sort right_sums
              for each s in left_sums:
                binary_search(right_sums, target - s)
              answer = True / count / closest
```

The combine step converts the naive O(2^(n/2) × 2^(n/2)) Cartesian scan into O(2^(n/2) · log(2^(n/2))) = O(2^(n/2) · n/2) by sorting once and probing with binary search.

**Cache behavior:** the enumeration phase iterates over small arrays of size 2^(n/2) ≈ 10⁶ — these fit comfortably in L2/L3 cache. The sort is comparison-based and cache-friendly (sequential merges). The binary search has O(log(2^(n/2))) = O(n/2) cache misses per probe but only 2^(n/2) probes, so the total miss count is the same order as the sort. In practice MITM on n = 40 runs in under a second on modern hardware.

## Skeleton

**Pseudocode (CLRS style)**

```
GENERATE-SUMS(A, start, end)
  sums ← empty list
  n ← end - start
  for mask = 0 to 2ⁿ - 1 do          ▷ iterate over all 2ⁿ subsets of A[start..end]
    s ← 0
    for bit = 0 to n - 1 do
      if bit-th bit of mask is 1 then
        s ← s + A[start + bit]
    APPEND(sums, s)
  return sums

MEET-IN-MIDDLE(A, target)
  mid ← ⌊|A| / 2⌋
  left_sums  ← GENERATE-SUMS(A, 0, mid)
  right_sums ← GENERATE-SUMS(A, mid, |A|)
  SORT(right_sums)                      ▷ sort once, binary-search many
  for each s in left_sums do
    need ← target - s
    if BINARY-SEARCH(right_sums, need) = FOUND then
      return True
  return False
```

**Python template**

```python
from bisect import bisect_left
from itertools import combinations


def generate_sums(items: list[int]) -> list[int]:
    """Return all 2^len(items) subset sums of items."""
    sums: list[int] = []
    n = len(items)
    for mask in range(1 << n):
        s = 0
        for bit in range(n):
            if mask >> bit & 1:
                s += items[bit]
        sums.append(s)
    return sums


def meet_in_middle(A: list[int], target: int) -> bool:
    """Return True if any subset of A sums to target."""
    mid = len(A) // 2
    left_sums = generate_sums(A[:mid])
    right_sums = sorted(generate_sums(A[mid:]))

    for s in left_sums:
        need = target - s
        pos = bisect_left(right_sums, need)
        if pos < len(right_sums) and right_sums[pos] == need:
            return True
    return False


# --- Variant: count subsets summing to target ---
def count_subsets(A: list[int], target: int) -> int:
    from collections import Counter
    mid = len(A) // 2
    left_counts = Counter(generate_sums(A[:mid]))
    right_sums = generate_sums(A[mid:])
    result = 0
    for s in right_sums:
        result += left_counts[target - s]   # your logic here: adapt for closest / count / min-diff
    return result
```

## Complexity

| Measure   | Bound                        | Why                                                                              |
| --------- | ---------------------------- | -------------------------------------------------------------------------------- |
| Time      | O(2^(n/2) · n)               | 2 × O(2^(n/2)) to enumerate; O(2^(n/2) · n/2) to sort; O(2^(n/2) · n/2) probes |
| Space     | O(2^(n/2))                   | storing both sum lists, each of size 2^(n/2)                                    |
| vs brute  | O(2ⁿ) → O(2^(n/2) · n)      | the square-root reduction: 2^40 ≈ 10¹² vs 2^20 ≈ 10⁶                           |

**Why this is better than O(2ⁿ):** 2^(n/2) is the *geometric mean* of 1 and 2ⁿ. Halving the exponent squares the denominator of the running time — `2^40 / 2^20 = 2^20 ≈ 10⁶` speedup for n = 40. The logarithmic factor `n` from the sort/search is negligible. This is the same mathematical trick that makes baby-step giant-step work in discrete logarithms.

**Space note:** at n = 40, each half produces 2²⁰ ≈ 10⁶ sums. If each sum is a 64-bit integer that is 8 MB per list — trivially within memory. At n = 50 (2²⁵ ≈ 33 M entries × 8 bytes = 256 MB per list), you're close to the memory wall; n ≤ 40 is the practical ceiling.

## Constraints & approach

| Constraint             | Expected approach                          | Why MITM is (not) chosen                                                                              |
| ---------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| n ≤ 20                 | DP / bitmask DP / backtracking             | 2²⁰ ≈ 10⁶ is fine without splitting; bitmask DP gives richer info (all subset sums in O(2ⁿ · n))    |
| n ≤ 35–40              | **Meet in the Middle**                     | 2ⁿ = 10¹⁰⁻¹² → TLE; 2^(n/2) = 10⁶ → fine. MITM is the only practical exact algorithm here          |
| n ≤ 10⁵, T ≤ 10⁹      | DP (if values small) or greedy             | MITM space = 2^(n/2) ≈ 2^50000 — astronomically infeasible; need a polynomial algorithm              |
| n ≤ 10⁵, values ≤ n   | DP (O(n · T)) if T is small                | Classic 0/1 knapsack DP; MITM won't help when the power-set is the bottleneck, not the sum space      |
| 4-sum, n ≤ 2000        | MITM on pairs (O(n²) pairs per half)       | Brute force O(n⁴); MITM on pair-sums gives O(n² log n); better than O(n³) two-pointer if n is small |
| Password / key search  | MITM (baby-step giant-step)                | n ≤ 56-bit DES key → 2^28 meet-in-middle instead of 2^56 brute force                                 |

**The key diagnostic:** n in 30–45 AND the search space is a power set (each element included or not) AND the objective decomposes additively (or via XOR/AND) across a split → MITM.

## Variations

**1. Closest subset sum (minimise |sum − target|)**
Instead of checking for exact equality, after sorting `right_sums`, for each `s` in `left_sums` binary-search for the insertion point of `target - s` and check both neighbours. Track the global minimum `|s + right_sums[pos] - target|`. Time remains O(2^(n/2) · n).

**2. Count subsets summing to target**
Use `Counter` on `left_sums`, then for each value in `right_sums` add `counter[target - val]`. O(2^(n/2)) time after enumeration.

**3. Two-pointer combine (when both halves are sorted)**
Sort both `left_sums` and `right_sums`. Use two pointers (lo on left, hi on right). This reduces the combine from O(2^(n/2) · n/2) to O(2^(n/2)) but requires sorting both lists first — same asymptotic, better constant.

**4. Partition into two equal-sum halves (LC 805)**
Generate all achievable sums from subsets of the left half, check if any sum equals `(total / num_in_left_partition)`. Requires careful tracking of subset sizes alongside sums.

**5. MITM on operations (not just include/exclude)**
When each element has k possible operations (e.g. signs: +/−), each half has kⁿ/² states instead of 2^(n/2). The technique still applies: enumerate all kⁿ/² states per half, sort, combine.

## CP-primitives

**1. Two-pointer combine instead of binary search**

After generating both sum lists, sort *both* lists. Run two pointers: `lo = 0` on the left list, `hi = len(right) - 1` on the right list.

```python
left_sums.sort()
right_sums.sort()
lo, hi = 0, len(right_sums) - 1
while lo < len(left_sums) and hi >= 0:
    total = left_sums[lo] + right_sums[hi]
    if total == target:
        return True
    elif total < target:
        lo += 1
    else:
        hi -= 1
```

**Why for CP:** the combine step becomes O(2^(n/2)) instead of O(2^(n/2) · n/2) — eliminates the log factor from binary search. In tight time limits this is the difference between AC and TLE. Use when you only need existence (not count), the target is exact, and both lists are sorted anyway.

**2. MITM for 4-sum / k-sum reduction**

For k-sum, split the k numbers to pick into two groups of k/2. Generate all (n choose k/2) partial sums for each group, then use binary search or a hash set on one group to find pairs.

```python
from itertools import combinations

def four_sum_count(A, B, C, D, target):
    # MITM: AB sums vs CD sums (each pair is one "half")
    ab = {}
    for a in A:
        for b in B:
            ab[a + b] = ab.get(a + b, 0) + 1
    count = 0
    for c in C:
        for d in D:
            count += ab.get(target - c - d, 0)
    return count
```

**Why for CP:** collapses O(n⁴) 4-sum to O(n²) by treating each pair (a, b) and (c, d) as one "item" in a 2-sum MITM. The same reduction works for 6-sum → two 3-sum halves, etc. LC 454 (4Sum II) is a canonical contest problem solved this way.

**3. MITM + bitmask for exact-cover / assignment**

For problems where each element has a state (not just in/out), enumerate all 3^(n/2) or k^(n/2) state assignments per half, store them in a hash map keyed by the resulting "signature", then probe from the other half. Used in cryptanalysis (MITM attack on double-DES) and combinatorial puzzles.

**Why for CP:** generalises MITM beyond subset-sum to any problem where the state decomposes across a split and the number of states per half is ≤ 10⁷.

## Worked problems

### LC 1755 — Closest Subsequence Sum

**Problem:** Given an integer array `nums` of length n ≤ 40 and a target integer `goal`, return the minimum absolute difference between `goal` and the sum of any non-empty subset of `nums`.

**Approach (MITM — closest subset sum):** n ≤ 40 rules out O(2ⁿ) brute force and makes DP infeasible (values can be ±10⁹). Split into two halves, enumerate all 2^(n/2) sums for each, sort the right list, then for each left sum binary-search for the complementary right sum that brings the total closest to `goal`. Check both the floor and ceiling neighbours in the sorted right list.

```python
from bisect import bisect_left

class Solution:
    def minAbsDifference(self, nums: list[int], goal: int) -> int:
        def gen(arr: list[int]) -> list[int]:
            sums: list[int] = []
            n = len(arr)
            for mask in range(1 << n):
                s = sum(arr[i] for i in range(n) if mask >> i & 1)
                sums.append(s)
            return sums

        mid = len(nums) // 2
        left = gen(nums[:mid])
        right = sorted(gen(nums[mid:]))
        ans = abs(goal)  # empty subset
        for s in left:
            need = goal - s
            pos = bisect_left(right, need)
            for p in (pos, pos - 1):
                if 0 <= p < len(right):
                    ans = min(ans, abs(s + right[p] - goal))
        return ans
```

**Complexity:** O(2^(n/2) · n) time, O(2^(n/2)) space.

**Duplicate problems:**
- Subset Sum (LC 416 — Partition Equal Subset Sum) — same MITM or DP approach; find a subset summing to total/2. DP works here because values ≤ 200 bound the sum space; MITM is the fallback when values are large.
- Target Sum (LC 494) — assign +/− signs to elements; each sign assignment is a "subset selection" — count assignments where the signed sum equals target. MITM applies when n is up to 40 (not LC 494's n ≤ 20).

---

### LC 805 — Split Array With Same Average

**Problem:** Given integer array `nums` of length n ≤ 30, return True if you can split nums into two non-empty subsets A and B such that `average(A) == average(B)`. The split must use every element exactly once.

**Approach (MITM + feasibility check):** The condition `average(A) == average(B)` is equivalent to `sum(A) / |A| == total / n`, i.e. `sum(A) * n == total * |A|`. Enumerate all subset sums *along with subset sizes* for each half. For each (sum, size) from the left half check whether the right half contains a complementary (sum, size) such that the totals add up correctly. Store right half entries as a set of `(right_sum, right_size)` pairs.

```python
class Solution:
    def splitArraySameAverage(self, nums: list[int]) -> bool:
        n = len(nums)
        total = sum(nums)
        mid = n // 2

        # generate (sum, size) pairs for left half
        def gen(arr: list[int]) -> set[tuple[int, int]]:
            results: set[tuple[int, int]] = set()
            m = len(arr)
            for mask in range(1, 1 << m):
                s, cnt = 0, 0
                for i in range(m):
                    if mask >> i & 1:
                        s += arr[i]
                        cnt += 1
                results.add((s, cnt))
            return results

        left = gen(nums[:mid])
        right = gen(nums[mid:])

        for ls, lc in left:
            for rc in range(1, n - lc):   # O(n) per left entry — total O(2^(n/2) · n)
                needed_total = total * (lc + rc)
                if needed_total % n != 0:
                    continue
                rs = needed_total // n - ls
                if (rs, rc) in right:
                    return True
        return False
```

**Complexity:** O(2^(n/2) · n) time — the `rc` loop runs at most n times per left entry, giving 2^(n/2) × n total iterations. O(2^(n/2)) space.

**Duplicate problems:**
- Fair Split (partition into two equal-sum groups) — same feasibility check pattern; MITM if n ≤ 40, DP if values are bounded.

---

### Classic — Subset Sum with Large Values

**Problem:** Given n ≤ 40 integers each up to 10¹⁸, determine if any subset sums exactly to T. Standard DP is infeasible (sum space too large). Return True or False.

**Approach (canonical MITM):** This is the textbook motivation for MITM. DP breaks because the sum space is up to 40 × 10¹⁸ — no table fits in memory. Backtracking is O(2ⁿ) ≈ 10¹² — TLE. MITM: split into two halves of size 20, enumerate all 2²⁰ ≈ 10⁶ sums for each, sort the right list, binary-search from the left. Runs in ~1 second.

```python
from bisect import bisect_left

def subset_sum_large(A: list[int], T: int) -> bool:
    mid = len(A) // 2
    left, right = A[:mid], A[mid:]

    def all_sums(items: list[int]) -> list[int]:
        sums: list[int] = []
        n = len(items)
        for mask in range(1 << n):
            s = 0
            for i in range(n):
                if mask >> i & 1:
                    s += items[i]
            sums.append(s)
        return sums

    left_sums = all_sums(left)
    right_sums = sorted(all_sums(right))

    for s in left_sums:
        need = T - s
        pos = bisect_left(right_sums, need)
        if pos < len(right_sums) and right_sums[pos] == need:
            return True
    return False
```

**Complexity:** O(2^(n/2) · n) time, O(2^(n/2)) space.

**Duplicate problems:**
- Partition to K Equal Sum Subsets (LC 698) — for k=2 reduces to subset-sum; MITM applies when n is large and sum space is huge.
- Sum of Squares (find four perfect squares summing to N) — Lagrange's 4-square theorem; MITM on two pairs cuts the search from O(N²) to O(N).

## Pitfalls

**1. Forgetting the empty subset (sum = 0)**

`mask = 0` is a valid subset (the empty set) with sum 0. If you start `for mask in range(1, 1 << n)`, you miss this. In the closest-subset-sum variant this means you start `ans = abs(goal)` *before* the loop as a base case (empty subset from left AND empty subset from right). Forgetting it causes wrong answers when the target equals the sum of a subset that is entirely in one half.

**2. Integer overflow when values are large**

With n = 40 elements each up to 10¹⁸, the maximum subset sum is 40 × 10¹⁸ = 4 × 10¹⁹, which overflows a signed 64-bit integer (max ≈ 9.2 × 10¹⁸). In Python this is not an issue (arbitrary precision), but in C++/Java you must use `__int128` or `unsigned long long` for the accumulation. A missed overflow silently produces wrong answers — especially treacherous because the code runs without error.

**3. Off-by-one when target falls exactly in one half**

If `target` can be formed using only elements from the left half (right contribution = 0), the right sum needed is 0. The empty subset of the right half has sum 0 and is always in `right_sums` (at index 0 after sorting). This case is handled correctly only if you include `mask = 0` in `GENERATE-SUMS` (see pitfall 1 above). Similarly if the right half alone achieves the target, the left sum 0 must be present.

**4. Confusing MITM with two-pointer on the same array**

MITM *generates two independent lists* from two halves of the input and sorts/searches one list with values from the other. Two pointers *walks a single sorted input array* from both ends. Applying a two-pointer walk directly to the original unsorted input will produce wrong answers for subset-sum — the pointers must operate on the *generated sum lists*, not on `A` itself.

**5. Applying MITM when n ≤ 20 (DP is faster and richer)**

At n ≤ 20, bitmask DP runs in O(2²⁰ · n) and gives not just existence but the *full set of achievable sums* in one pass. MITM adds overhead (sort + bisect, two passes) for no gain. Reach for bitmask DP first; switch to MITM only when n pushes past 25–30.

## First 30 seconds

"The constraint says n ≤ 40 and I need to find a subset satisfying a sum condition — that's Meet in the Middle. 2⁴⁰ is TLE but 2²⁰ is fine. I'll split the array in half, enumerate all 2^(n/2) subset sums for each half independently, sort the right list, then binary-search for the complement from the left list. Time is O(2^(n/2) · n), space O(2^(n/2))."

## Related

**Leans on:**
- [Binary Search](../algorithms/binary-search.md) — the combine step (sort one half, `bisect_left` probe from the other)
- [Backtracking](../algorithms/backtracking.md) — recursive subset enumeration for each half
- [Subsets & Permutations](./subsets-permutations.md) — the power-set generation template
- [Array](../data-structures/array.md) — underlying structure for the sum lists

**Sibling patterns / alternatives:**
- [Bitmask DP](./bitmask-dp.md) — preferred when n ≤ 20; same subset enumeration idea but with memoization across overlapping subproblems
- [Dynamic Programming](../algorithms/dynamic-programming.md) — preferred when values are bounded (small sum space); O(n · T) DP beats MITM when T ≤ 10⁶
- [Two Pointers](./two-pointers.md) — similar "meet in the middle" intuition on a sorted array, but entirely different mechanism (no power-set generation)
- [Binary Search on Answer](./binary-search-on-answer.md) — different "split + search" shape; binary-searches the answer space rather than a generated sum list

## Practice problems

### LC 454 — 4Sum II

**Problem statement:** Given four integer arrays `nums1`, `nums2`, `nums3`, `nums4` each of length n ≤ 200, return the number of tuples (i, j, k, l) such that `nums1[i] + nums2[j] + nums3[k] + nums4[l] == 0`. Constraints: n ≤ 200.

**Approach:** MITM on pairs — treat (nums1[i] + nums2[j]) as "left half sums" and (nums3[k] + nums4[l]) as "right half sums". Build a frequency counter of all n² AB-sums; for each of the n² CD-sums look up its negation. O(n²) — the n² pair enumeration replaces the 2^(n/2) element enumeration because here each "item" is a pair.

```python
from collections import Counter

class Solution:
    def fourSumCount(self, nums1: list[int], nums2: list[int],
                     nums3: list[int], nums4: list[int]) -> int:
        ab = Counter(a + b for a in nums1 for b in nums2)
        return sum(ab[-(c + d)] for c in nums3 for d in nums4)
```

**Complexity:** O(n²) time, O(n²) space.

**Duplicate problems:**
- Two Sum (LC 1) — same hash-map lookup on a single array; MITM on pairs generalises it to 4 arrays.
- 4-Sum (LC 18, unique quadruples in one array) — two-pointer on sorted array; different problem shape from 4Sum II.

---

For additional worked examples with full solutions, see the [Worked problems](#worked-problems) section above: LC 1755 (closest subset sum), LC 805 (equal-average split), and the classic large-value subset-sum problem.
