# Binary Search on Answer

## Prerequisites

- [Binary Search](../algorithms/binary-search.md) [Must read]
- [Greedy](../algorithms/greedy.md) [Must read]

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
  - [Koko Eating Bananas](#1-koko-eating-bananas-lc-875)
  - [Minimum Number of Days to Make m Bouquets](#2-minimum-number-of-days-to-make-m-bouquets-lc-1482)
  - [Magnetic Force Between Two Balls](#3-magnetic-force-between-two-balls-lc-1552)
  - [Minimize Max Distance to Gas Station](#4-minimize-max-distance-to-gas-station-lc-774)
  - [Maximum Average Subarray II](#5-maximum-average-subarray-ii-lc-644)

---

## What it is

**Binary search on answer** binary-searches not over an array's indices, but over the **space of possible answers** to an optimization problem - when you can cheaply check "is this candidate answer feasible?" and feasibility is **monotonic** (once a candidate is feasible, every "easier" candidate stays feasible; once infeasible, every "harder" candidate stays infeasible).

**Mental model:** instead of asking "where is X in this sorted array," you ask "what's the smallest/largest value X such that `feasible(X)` is true" - and `feasible(X)` being monotonic in X is exactly what makes halving the search space valid, the same guarantee sortedness gives ordinary binary search.

> **Interview soundbite:** "Binary search the *answer*, not the array - as long as feasibility is monotonic in the candidate answer, you can binary-search over it and turn 'find the best value' into O(log(range)) feasibility checks."

---

## Recognition signals

### (a) Trigger phrases

- *"minimize the maximum"* / *"minimize the largest ___"*
- *"maximize the minimum"* / *"maximize the smallest ___"*
- *"what is the minimum ... such that you can ..."*
- *"split into k groups such that ..."*
- *"Koko eating bananas"* / *"ship packages within D days"* (canonical phrasing for this pattern)

### (b) Structural cues

- The problem asks for an **optimal numeric value** (a capacity, a speed, a distance, a time), not an index or a subsequence.
- There's an implicit or explicit **feasibility check**: "can this candidate value satisfy the constraint?" - and that check is easy to write, usually greedy or a simple simulation.
- **Monotonicity**: if capacity `C` works, every `C' > C` also works (or symmetrically, every smaller value fails). Without this property, binary search on the answer is invalid - check it explicitly before applying the pattern.
- The **brute-force** approach would be "try every possible answer value and check feasibility for each" - binary search on answer is exactly the optimization of that brute force from O(range) to O(log(range)) checks.

### (c) Not to be confused with

| Pattern | Distinction |
|---|---|
| **Binary Search (classic)** | Classic binary search finds a target *within a sorted array* using array indices as the search space. Binary search on answer uses a **numeric range of candidate answers** as the search space - there may be no array being searched at all (e.g. searching over possible "max load" values from 1 to sum(weights)). |
| **Two Pointers** | Two pointers scans a sorted array with two indices converging - O(n) total movement. Binary search on answer discards half the *answer* range each iteration - O(log(range)) iterations, each costing an O(n) feasibility check, for O(n log(range)) total. |
| **<abbr>Greedy</abbr>** | The feasibility check *inside* binary search on answer is usually itself a greedy algorithm (e.g. "greedily pack items into the current capacity, count bins used"). The pattern's outer binary search decides *which* capacity to try; greedy answers *whether it works*. They compose, they aren't alternatives. |

---

## How it works

**Worked example: minimum feasible rate to clear piles within a deadline.** Given piles `[3, 6, 7, 11]` and `h = 8` time units to consume all of them. Pick a constant rate `k` (units/hour); each hour, consume from one pile, up to `k` units (if a pile has fewer than `k` left, it finishes early that hour and no other pile is touched that hour). Find the minimum `k` such that everything is consumed within `h` hours.

**Feasibility check** for a candidate speed `k`: hours needed = `sum(ceil(pile / k) for pile in piles)`. Feasible if `hours needed ≤ h`.

**Monotonicity check (do this before trusting the pattern applies):** larger `k` → fewer hours needed per pile → total hours needed is non-increasing in `k`. So if `k` is feasible, every `k' > k` is also feasible. This monotonic "feasible above a threshold, infeasible below it" shape is exactly what binary search needs.

**Search space:** `k` ranges from 1 (slowest) to `max(piles)` (fast enough to finish any single pile in one hour - going faster never helps once you can already clear the largest pile in one sitting).

```
piles = [3, 6, 7, 11], h = 8
lo = 1, hi = 11

mid = 6:  hours = ceil(3/6)+ceil(6/6)+ceil(7/6)+ceil(11/6) = 1+1+2+2 = 6 ≤ 8  → feasible, try smaller: hi = 6
mid = 3:  hours = ceil(3/3)+ceil(6/3)+ceil(7/3)+ceil(11/3) = 1+2+3+4 = 10 > 8 → infeasible, try bigger: lo = 4
mid = 5:  hours = ceil(3/5)+ceil(6/5)+ceil(7/5)+ceil(11/5) = 1+2+2+3 = 8 ≤ 8  → feasible, try smaller: hi = 5
mid = 4:  hours = ceil(3/4)+ceil(6/4)+ceil(7/4)+ceil(11/4) = 1+2+2+3 = 8 ≤ 8  → feasible, try smaller: hi = 4
lo == hi == 4 → answer: k = 4
```

**Diagram - the feasible/infeasible boundary being found:**

```
k:         1  2  3  4  5  6  7  8  9  10 11
feasible:  N  N  N  Y  Y  Y  Y  Y  Y  Y  Y
                     ↑
              answer = 4 (first Y)
```

The pattern is: infeasible values form a contiguous prefix, feasible values form a contiguous suffix (or vice versa depending on min/max framing) - binary search finds the exact boundary in O(log(range)) feasibility checks instead of testing every value linearly.

---

## Complexity

Typical time: **O(log(range) × cost of one feasibility check)**. If the feasibility check is O(n) (as in Koko - it scans all piles), total is **O(n log(range))**. Space is O(1) beyond the input, since the search only tracks `lo`/`hi`/`mid`.

---

## Constraints & approach

| Input size / range | Keywords | Reach for | Don't reach for |
|---|---|---|---|
| Answer range up to `10⁹` (e.g. max pile size, max distance) | "minimum ... such that", "minimize the maximum" | Binary search on answer: O(n log(range)) | Linear scan over every candidate value: O(n · range) - too slow |
| Answer range small (`≤ 100`) but `n` large | Same keywords | Either binary search on answer, or sometimes direct DP if states are small | - |
| Feasibility check itself is O(log n) or O(n log n) | Same keywords, n up to `10⁵`-`10⁶` | Still binary search on answer: total O(log(range) · n log n) is comfortably fast | Nested full re-simulation with no monotonicity check first |
| Feasibility is **not monotonic** | Any of the above phrasing, but a counterexample exists where smaller ≠ always easier | **Do not use this pattern** - fall back to brute force, DP, or a different structural insight entirely | Binary search on answer (produces a wrong answer silently) |

The constraint that actually matters here isn't `n` in isolation - it's the **width of the answer range**, since that's what's being binary-searched. A range of `10⁹` collapses to ~30 iterations; the pattern's whole value proposition is turning a huge linear scan over possible answers into a logarithmic one.

**Real-world usage:** capacity-planning systems use this exact shape - a system doing <abbr>load balancing</abbr> asking "what's the minimum instance count such that projected request <abbr>latency</abbr> stays under budget?" is a feasibility-monotonic search over a numeric answer space, same as Koko's speed. **At-scale failure:** if the feasibility check itself is expensive (e.g. a full simulation rather than an O(n) scan), the O(log(range)) factor stops being "free" - at large `range` and an expensive per-check cost, the total search time can dominate a request's latency budget, which is why production systems often cap the number of binary-search iterations rather than searching to exact convergence.

**Cache behavior:** n/a for this pattern - it's a pure numeric-range search over `lo`/`hi`/`mid` scalars with no array traversal of its own; whatever memory-access pattern exists belongs to the feasibility check (e.g. Koko's linear scan over `piles`, which is a contiguous, <abbr>cache-friendly</abbr> array pass).

---

## Variations

| Variant | Shape | Canonical example |
|---|---|---|
| Minimize the maximum | Find smallest `X` such that "can achieve with max ≤ X" is feasible | Koko Eating Bananas, Split Array Largest Sum |
| Maximize the minimum | Find largest `X` such that "can achieve with min ≥ X" is feasible | Magnetic Force Between Two Balls, Aggressive Cows |
| Binary search on a real-valued answer | Search space is continuous (e.g. a distance or ratio), fixed iteration count instead of integer convergence | Median of two sorted arrays (via partition search), minimizing a ratio |
| Binary search + greedy feasibility | Feasibility check is itself a greedy simulation | Ship packages within D days, Capacity to ship in D days |
| Binary search + DP feasibility | Feasibility check requires a DP/simulation rather than a simple greedy scan | Some scheduling variants where feasibility isn't obviously greedy |

---

## Pitfalls

1. **Applying the pattern without verifying monotonicity first.** Binary search on answer silently produces a wrong result if feasibility isn't actually monotonic in the candidate value - unlike a crash, this fails quietly. Always state the monotonicity argument explicitly (as in the Koko walkthrough) before coding, not after.

2. **Wrong rounding direction on `mid` for "maximize" searches.** For "minimize feasible" searches, `mid = lo + (hi - lo) // 2` (floor) is correct because `hi = mid` on success. For "maximize feasible" searches, using the same floor division causes an infinite loop when `lo` and `hi` are adjacent (`mid` always equals `lo`, and `lo = mid` never advances) - must round up: `mid = lo + (hi - lo + 1) // 2`.

3. **Off-by-one in the search bounds.** Setting the initial `hi` too low (excluding the actual answer) or `lo` too high produces `lo == hi` at the wrong value with no error raised. Always sanity-check that both the trivial extremes (`lo` = worst case, `hi` = best case) are actually valid bounds before searching.

4. **Feasibility check too slow, negating the log-factor benefit.** If the feasibility check itself is O(n²) or worse, wrapping it in O(log(range)) binary search may still be too slow if `n` is large - always multiply out the full complexity (`checks × cost-per-check`), not just count iterations.

5. **Confusing "binary search on answer" with "binary search on index."** Beginners sometimes try to binary search an *unsorted* array's values directly, expecting the classic binary-search invariant to hold - it doesn't, because plain unsorted values have no monotonic structure. The monotonicity here comes from the **feasibility function**, not from the input array being sorted.

**Common misconceptions:** *"binary search only works on sorted arrays."* Binary search on answer is the counterexample - there may be no array being searched at all (the search space is a numeric range like `[1, max(piles)]`). What binary search actually requires is a monotonic predicate over the search space, of which "the array is sorted" is just one special case (index-based classic binary search), not the general rule.

---

## First 30 seconds

*"This is minimize-the-max / maximize-the-min - I'll binary search over the candidate answer. First I need to confirm feasibility is monotonic in that value, then write a feasibility check (usually greedy), and binary search the range from the trivial lower bound to the trivial upper bound in O(log(range)) iterations."*

Then state the feasibility check in one sentence before coding - this is where interviewers probe whether you actually understand *why* the search is valid, not just the mechanical binary-search loop.

---

## Related

- [Binary Search](../algorithms/binary-search.md) - the underlying halving mechanic and off-by-one considerations this pattern reuses directly
- [Greedy](../algorithms/greedy.md) - the feasibility check inside this pattern is almost always a greedy simulation
- [Two Pointers](./two-pointers.md) - an alternative O(n) technique when the search space is over array positions rather than a numeric answer range
- [Modified Binary Search](./modified-binary-search.md) - sibling pattern for binary search on rotated/altered arrays, distinct from searching an answer space

---

## Practice problems

### 1. Koko Eating Bananas (LC 875)

Koko has piles of bananas and `h` hours to eat them all at a constant speed `k` (bananas/hour, per-pile per-hour cap). Find the minimum `k` so she finishes within `h` hours. Constraints: `1 ≤ piles.length ≤ 10⁴`, `piles[i], h ≤ 10⁹`.

**Worked examples:**
- **Example 1**
  - **Input:** piles = [3,6,7,11], h = 8 | **Output:** 4
- **Example 2**
  - **Input:** piles = [30,11,23,4,20], h = 5 | **Output:** 30
  - **Explanation:** only 5 hours for 5 piles - one hour per pile, so speed must clear the largest pile in one hour.

**Constraints:** `1 ≤ piles.length ≤ 10⁴`, `piles.length ≤ h ≤ 10⁹`, `1 ≤ piles[i] ≤ 10⁹`.

**Approach.** Binary search `k` from 1 to `max(piles)`. Feasible if `sum(ceil(p/k) for p in piles) ≤ h`. Monotonic since larger `k` reduces hours needed per pile.

```python
import math

def min_eating_speed(piles: list[int], h: int) -> int:
    lo, hi = 1, max(piles)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if sum(math.ceil(p / mid) for p in piles) <= h:
            hi = mid
        else:
            lo = mid + 1
    return lo
```

**Complexity.** O(n log(max(piles))) time, O(1) space.

**Duplicate problems:**
- Capacity To Ship Packages Within D Days (LC 1011) - same shape, feasibility is a greedy bin-packing simulation instead of a ceiling-sum.
- Split Array Largest Sum (LC 410) - identical greedy bin-packing feasibility to LC 1011, framed as splitting into m subarrays instead of days.
- Find the Smallest Divisor Given a Threshold (LC 1283) - structurally identical ceiling-sum feasibility check to Koko itself.
- Minimum Speed to Arrive on Time (LC 1870) - same ceiling-sum feasibility with one leg's rounding rule changed (fractional last leg).

---

### 2. Minimum Number of Days to Make m Bouquets (LC 1482)

Given bloom days for each flower and bouquet size `k`, find the minimum day on which `m` bouquets can be made from `k` adjacent bloomed flowers each. Return `-1` if impossible. Constraints: `1 ≤ bloomDay.length ≤ 10⁵`, `1 ≤ m ≤ 10⁶`, `1 ≤ k ≤ bloomDay.length`, `1 ≤ bloomDay[i] ≤ 10⁹`.

**Worked examples:**
- **Example 1**
  - **Input:** bloomDay = [1,10,3,10,2], m = 3, k = 1 | **Output:** 3
  - **Explanation:** by day 3, flowers 0,2,4 have bloomed - enough for 3 bouquets of size 1.
- **Example 2**
  - **Input:** bloomDay = [1,10,3,10,2], m = 3, k = 2 | **Output:** -1
  - **Explanation:** only 5 flowers total, need 6 for 3 bouquets of size 2.

**Constraints:** `1 ≤ bloomDay.length ≤ 10⁵`, `1 ≤ m ≤ 10⁶`, `1 ≤ k ≤ bloomDay.length`, `1 ≤ bloomDay[i] ≤ 10⁹`.

**Approach.** Binary search the day, from `min(bloomDay)` to `max(bloomDay)`. Feasibility for a candidate day `mid`: scan the array, treating a flower as "available" if `bloomDay[i] ≤ mid`; greedily count contiguous runs of available flowers, adding `run_length // k` bouquets per run (resetting the run on any unavailable flower). Feasible if total bouquets `≥ m`. This is a distinct feasibility shape from Koko's ceiling-sum - it's a greedy grouping/counting scan, not a per-item division.

```python
def min_days(bloom_day: list[int], m: int, k: int) -> int:
    if m * k > len(bloom_day):
        return -1

    def bouquets_by(day: int) -> int:
        count = run = 0
        for b in bloom_day:
            if b <= day:
                run += 1
                if run == k:
                    count += 1
                    run = 0
            else:
                run = 0
        return count

    lo, hi = min(bloom_day), max(bloom_day)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if bouquets_by(mid) >= m:
            hi = mid
        else:
            lo = mid + 1
    return lo
```

**Complexity.** O(n log(max(bloomDay))) time, O(1) space.

**Duplicate problems:** none - the greedy grouping/counting feasibility shape here is distinct from every other entry in this file.

---

### 3. Magnetic Force Between Two Balls (LC 1552)

Given basket positions and integer `m`, place `m` balls into baskets to maximize the minimum distance between any two balls. Constraints: `2 ≤ position.length ≤ 10⁵`, `2 ≤ m ≤ position.length`, `1 ≤ position[i] ≤ 10⁹`.

**Worked examples:**
- **Example 1**
  - **Input:** position = [1,2,3,4,7], m = 3 | **Output:** 3
  - **Explanation:** placing balls at 1, 4, 7 gives a minimum gap of 3, the largest achievable.
- **Example 2**
  - **Input:** position = [5,4,3,2,1,1000000000], m = 2 | **Output:** 999999999

**Constraints:** `2 ≤ position.length ≤ 10⁵`, `2 ≤ m ≤ position.length`, `1 ≤ position[i] ≤ 10⁹`.

**Approach.** This is the "maximize the minimum" mirror of Koko's "minimize the maximum" - the search direction flips. Sort `position`. Binary search the candidate minimum gap `d`, from `1` to `position[-1] - position[0]`. Feasibility: greedily place the first ball at the first (sorted) position, then place each subsequent ball at the next position at least `d` away from the last placed ball; feasible if `m` balls fit. Because this is a "maximize feasible" search, `mid` must round up (`(lo + hi + 1) // 2`) and the update is `lo = mid` on success, `hi = mid - 1` on failure - the mirror image of Koko's rounding and update directions.

```python
def max_distance(position: list[int], m: int) -> int:
    position.sort()

    def can_place(d: int) -> bool:
        count, last = 1, position[0]
        for p in position[1:]:
            if p - last >= d:
                count += 1
                last = p
        return count >= m

    lo, hi = 1, position[-1] - position[0]
    while lo < hi:
        mid = lo + (hi - lo + 1) // 2
        if can_place(mid):
            lo = mid
        else:
            hi = mid - 1
    return lo
```

**Complexity.** O(n log n) time (sort dominates; log(range) feasibility passes are each O(n)), O(1) extra space.

**Duplicate problems:**
- Divide Chocolate (LC 1231) - identical "maximize the minimum" greedy-spacing shape, applied to splitting a chocolate bar into sweetness-maximized pieces instead of ball positions.

---

### 4. Minimize Max Distance to Gas Station (LC 774)

Given sorted gas station positions along a road and an integer `k`, add `k` new stations anywhere (not necessarily at integer positions) to minimize the largest distance between any two adjacent stations. Return the minimized maximum distance.

**Worked examples:**
- **Example 1**
  - **Input:** stations = [1,2,3,4,5,6,7,8,9,10], k = 9 | **Output:** 0.5
  - **Explanation:** with 9 extra stations to place among 9 existing gaps of length 1, one station per gap halves every gap to 0.5.
- **Example 2**
  - **Input:** stations = [0,1,2,3,4,5,6,7,8,20], k = 1 | **Output:** 6.0
  - **Explanation:** every existing gap is length 1 except the last (length 12); the single new station splits only that worst gap in half, capping the new maximum at 6.0.

**Constraints:** `10 ≤ stations.length ≤ 2000`, stations sorted and distinct, `1 ≤ k ≤ 10⁶`, answers within `10⁻⁶` of the true value are accepted.

**Approach:** The answer is a **real number**, not an integer - "minimize the maximum gap" is monotonic in a candidate max-gap `d` (if `d` is achievable, so is any `d' > d`), so the pattern applies, but `lo`/`hi` converging to floating-point equality is unreliable. Instead, run the binary search for a **fixed number of iterations** (e.g. 50-100): each iteration halves the interval, and after enough rounds the remaining uncertainty is far below any required precision (`2⁻¹⁰⁰` is astronomically smaller than `10⁻⁶`). Feasibility for a candidate max-gap `d`: for each existing gap of length `g`, the minimum stations needed to keep every sub-gap `≤ d` is `ceil(g / d) - 1`; sum this across all gaps and check it's `≤ k`.

```python
import math

def min_max_gas_dist(stations: list[int], k: int) -> float:
    gaps = [stations[i + 1] - stations[i] for i in range(len(stations) - 1)]

    def feasible(d: float) -> bool:
        needed = sum(math.ceil(g / d) - 1 for g in gaps)
        return needed <= k

    lo, hi = 0.0, max(gaps)
    for _ in range(100):                  # fixed iteration count - float lo==hi never converges cleanly
        mid = (lo + hi) / 2
        if feasible(mid):
            hi = mid
        else:
            lo = mid
    return hi
```

**Complexity.** O(n · iterations) time, O(n) space for the gaps array. With a fixed 100 iterations this is effectively O(n).

**Duplicate problems:**
- Any "minimize the maximum interval after inserting k points into sorted gaps" restatement - the ceil-division-per-gap feasibility check and fixed-iteration real-valued search apply unchanged.

---

### 5. Maximum Average Subarray II (LC 644)

Given an array `nums` and an integer `k`, find the maximum average value of any contiguous subarray of length **≥ k**.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [1,12,-5,-6,50,3], k = 4 | **Output:** 12.75
  - **Explanation:** the subarray `[12,-5,-6,50]` (length 4) sums to 51, average 12.75, the best achievable among subarrays of length ≥ 4.
- **Example 2**
  - **Input:** nums = [5], k = 1 | **Output:** 5.0
  - **Explanation:** the only subarray of length ≥ 1 is the whole array, average 5.

**Constraints:** `1 ≤ k ≤ nums.length ≤ 10⁴`, `-10⁴ ≤ nums[i] ≤ 10⁴`, answers within `10⁻⁵` of the true value are accepted.

**Approach:** This is **parametric search**: the thing being optimized is a *ratio* (average = sum / length), which doesn't decompose into a simple greedy step directly. Binary search the candidate average `r` instead: feasibility becomes "does some subarray of length ≥ k have average ≥ r?" - subtract `r` from every element first, and this becomes "does some subarray of length ≥ k have **sum** ≥ 0?". The subtlety: it's not enough to check only exact-length-`k` windows - a longer window can be feasible even when every exact-length-`k` window is negative (extra elements past position `k` can pull the sum back up). The correct O(n) check tracks, for each right endpoint `i`, the **minimum prefix sum among all left endpoints `≤ i - k`** (so it implicitly considers every window length `≥ k` ending at `i`, not just exactly `k`) - if `prefix[i] - min_prefix_so_far ≥ 0` for any `i`, a feasible window exists.

```python
def find_max_average(nums: list[int], k: int) -> float:
    n = len(nums)

    def feasible(r: float) -> bool:
        # shift every element by -r; feasible iff some subarray of length >= k has sum >= 0
        prefix = 0.0
        prefixes = [0.0]
        for x in nums:
            prefix += x - r
            prefixes.append(prefix)

        min_prefix = prefixes[0]
        for i in range(k, n + 1):
            min_prefix = min(min_prefix, prefixes[i - k])   # best (smallest) start for any window length >= k ending at i
            if prefixes[i] - min_prefix >= 0:
                return True
        return False

    lo, hi = float(min(nums)), float(max(nums))
    for _ in range(100):
        mid = (lo + hi) / 2
        if feasible(mid):
            lo = mid
        else:
            hi = mid
    return lo
```

**Complexity.** O(n · iterations) time, O(n) space for the shifted array. With a fixed 100 iterations this is effectively O(n).

**Duplicate problems:**
- Any "maximize/minimize a ratio over a variable-length window or subsequence" restatement (density, rate, score-per-item) - the shift-by-candidate-and-check-sum-≥-0 change of variable applies unchanged.

