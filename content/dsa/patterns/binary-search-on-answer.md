# Binary Search on Answer

## Prerequisites

- [Binary Search](../algorithms/binary-search.md) [Must read] - this pattern is binary search applied to a space of candidate *answers* rather than an array's indices; the halving logic and off-by-one traps are identical
- [Greedy](../algorithms/greedy.md) [Must read] - the feasibility check at each candidate answer is almost always a greedy simulation

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
| **Greedy** | The feasibility check *inside* binary search on answer is usually itself a greedy algorithm (e.g. "greedily pack items into the current capacity, count bins used"). The pattern's outer binary search decides *which* capacity to try; greedy answers *whether it works*. They compose, they aren't alternatives. |

---

## How it works

**Worked example: Koko Eating Bananas (LC 875).** Koko has piles `[3, 6, 7, 11]` bananas and `h = 8` hours to eat all of them. She picks a constant eating speed `k` (bananas/hour); each hour she eats from one pile, up to `k` bananas (if a pile has fewer than `k`, she finishes it early that hour and doesn't touch another pile that hour). Find the minimum `k` such that she finishes within `h` hours.

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

## Skeleton

**Pseudocode (CLRS style) - "find the minimum feasible value":**

```
BINARY-SEARCH-ON-ANSWER(lo, hi, FEASIBLE)
  while lo < hi
    mid = lo + (hi - lo) / 2        ▷ floor division; avoids overflow vs (lo+hi)/2
    if FEASIBLE(mid)
      hi = mid                      ▷ mid works - try to do better (smaller)
    else
      lo = mid + 1                  ▷ mid fails - need a larger value
  return lo                         ▷ lo == hi == the minimum feasible value
```

**Python template:**

```python
def binary_search_on_answer(lo: int, hi: int, feasible) -> int:
    """Find the minimum value in [lo, hi] for which feasible(x) is True.
    Requires: feasible is monotonic - False...False, True...True over [lo, hi]."""
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if feasible(mid):
            hi = mid            # your logic here: mid works, search left half
        else:
            lo = mid + 1        # your logic here: mid fails, search right half
    return lo


def feasible(candidate: int) -> bool:
    # your logic here: problem-specific check, e.g.
    # "can we finish within h hours at eating speed = candidate?"
    raise NotImplementedError
```

For "**maximize** the minimum" framing (the mirror image - e.g. "maximize the minimum distance between placed items"), flip the comparison and search direction:

```python
def binary_search_max_feasible(lo: int, hi: int, feasible) -> int:
    """Find the maximum value in [lo, hi] for which feasible(x) is True."""
    while lo < hi:
        mid = lo + (hi - lo + 1) // 2   # round UP to avoid infinite loop
        if feasible(mid):
            lo = mid            # mid works - try to do better (larger)
        else:
            hi = mid - 1        # mid fails - need a smaller value
    return lo
```

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

**Real-world usage:** capacity-planning systems use this exact shape - a load balancer or autoscaler asking "what's the minimum instance count such that projected request latency stays under budget?" is a feasibility-monotonic search over a numeric answer space, same as Koko's speed. **At-scale failure:** if the feasibility check itself is expensive (e.g. a full simulation rather than an O(n) scan), the O(log(range)) factor stops being "free" - at large `range` and an expensive per-check cost, the total search time can dominate a request's latency budget, which is why production systems often cap the number of binary-search iterations rather than searching to exact convergence.

**Cache behavior:** n/a for this pattern - it's a pure numeric-range search over `lo`/`hi`/`mid` scalars with no array traversal of its own; whatever memory-access pattern exists belongs to the feasibility check (e.g. Koko's linear scan over `piles`, which is a contiguous, cache-friendly array pass).

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

## CP-primitives

### 1. Binary search on a real-valued (floating-point) answer

**The trick:** when the answer isn't an integer (e.g. minimizing a ratio, or a geometric distance), binary search runs for a **fixed number of iterations** (e.g. 100) rather than until `lo == hi`, since floating-point equality never cleanly converges. Each iteration halves the error, so ~100 iterations gets far beyond any useful precision (`2⁻¹⁰⁰` is astronomically smaller than any precision a contest checks).

```python
def binary_search_real(lo: float, hi: float, feasible, iterations: int = 100) -> float:
    for _ in range(iterations):
        mid = (lo + hi) / 2
        if feasible(mid):
            hi = mid
        else:
            lo = mid
    return lo
```

**Why for CP:** contest problems involving "minimize a real-valued quantity" (average, ratio, geometric distance) almost always reduce to this fixed-iteration binary search once you have a feasibility/comparison check - avoids the messiness of floating-point convergence conditions.

### 2. Parametric search (binary search wrapping an optimization, not just a yes/no check)

**The trick:** some problems ask to optimize a *ratio* of two quantities (e.g. "maximize average value of a subarray of length ≥ k"). Binary search on the ratio `r`: feasibility becomes "does there exist a subarray with average ≥ r?", which is equivalent to "does there exist a subarray with `sum(a_i - r) ≥ 0`?" - a question answerable via prefix sums/Kadane in O(n), turning an optimization-of-a-ratio problem into a binary search + linear feasibility check.

```python
def max_average_at_least_r_feasible(nums: list[int], k: int, r: float) -> bool:
    # shift every element by -r, then check if some subarray of length >= k has sum >= 0
    shifted = [x - r for x in nums]
    window_sum = sum(shifted[:k])
    best = window_sum
    prefix_before_window = 0.0
    for i in range(k, len(shifted)):
        window_sum += shifted[i] - shifted[i - k]
        prefix_before_window = min(prefix_before_window, best - window_sum)  # track loosest extension
        best = max(best, window_sum)
    return best >= 0

# binary search wraps this: search r over [min(nums), max(nums)],
# shrink hi while max_average_at_least_r_feasible(nums, k, mid) stays True
```

**Why for CP:** this is the standard way to convert "optimize a ratio" (which doesn't decompose into simple greedy steps directly) into "optimize a simpler linear quantity" via a change of variable - a recurring trick across contest problems involving averages, densities, or rates.

---

## Worked problems

### 1. Koko Eating Bananas (LC 875)

Koko has piles of bananas and `h` hours; she picks a constant eating speed `k`. Find the minimum `k` so she finishes all piles within `h` hours.

**Approach sketch:** the "answer" being searched is the speed `k`, ranging from 1 to `max(piles)`. The feasibility check maps directly onto the skeleton's `feasible(mid)`: compute `sum(ceil(pile/mid) for pile in piles)` and compare to `h`. Larger `k` monotonically reduces hours needed, so the skeleton's "minimize feasible value" form applies unmodified.

### 2. Split Array Largest Sum (LC 410)

Split an array into `m` contiguous subarrays minimizing the largest subarray sum.

**Approach sketch:** the candidate answer is the "largest sum allowed," searched from `max(nums)` to `sum(nums)`. Feasibility plugs a greedy bin-packing simulation into `feasible(mid)`: walk the array accumulating a running sum, start a new subarray whenever adding the next element would exceed `mid`, and check whether the resulting subarray count is `≤ m`.

### 3. Magnetic Force Between Two Balls (LC 1552)

Place `m` balls into baskets at given positions to maximize the minimum distance between any two balls.

**Approach sketch:** this is the "maximize the minimum" mirror of the skeleton - use the `binary_search_max_feasible` variant instead of the minimize form. The candidate answer is the minimum allowed gap `d`; feasibility greedily places balls left-to-right, keeping a ball only if it's at least `d` from the last placed one, and checks whether `m` balls fit.

### 4. Minimum Number of Days to Make m Bouquets (LC 1482)

Given bloom days for each flower and bouquet size `k`, find the minimum day on which `m` bouquets can be made from `k` adjacent bloomed flowers each.

**Approach sketch:** the candidate answer is "day number," ranging from `min(bloomDay)` to `max(bloomDay)`. Feasibility scans the array once, treating a flower as "available" if its bloom day is `≤ mid`, and greedily counts contiguous runs of available flowers to see if `m` bouquets of size `k` can be formed - a direct swap-in for `feasible(mid)`.

### 5. Minimum Speed to Arrive on Time (LC 1870)

Given a sequence of train distances and a total time limit, find the minimum integer speed so all trains (with the last one allowed a fractional wait skipped) arrive on time.

**Approach sketch:** the candidate answer is speed, from 1 up to a bound like `10⁷`. Feasibility computes total travel time at that speed - `ceil` for all but the last leg, exact division for the last - and compares to the limit. This is a variant of the Koko feasibility shape with one leg's rounding rule changed, showing how the same skeleton adapts to a slightly different cost function.

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
- Capacity To Ship Packages Within D Days (LC 1011) - same shape, different feasibility simulation.
- Minimum Number of Days to Make m Bouquets (LC 1482) - binary search on days, feasibility = greedy bouquet-counting.

---

### 2. Capacity To Ship Packages Within D Days (LC 1011)

Given package weights (in order) and `D` days, find the minimum ship capacity such that loading greedily (as much as fits each day) ships everything within `D` days. Constraints: `1 ≤ n ≤ 5×10⁴`, `weights[i] ≤ 500`, `1 ≤ D ≤ n`.

**Approach.** Binary search capacity from `max(weights)` (can't go lower - must fit the heaviest single package) to `sum(weights)` (one day for everything). Feasibility: greedily accumulate a running load; whenever adding the next package would exceed capacity, start a new day; feasible if days used ≤ D.

```python
def ship_within_days(weights: list[int], days: int) -> int:
    def days_needed(capacity: int) -> int:
        d, load = 1, 0
        for w in weights:
            if load + w > capacity:
                d += 1
                load = w
            else:
                load += w
        return d

    lo, hi = max(weights), sum(weights)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if days_needed(mid) <= days:
            hi = mid
        else:
            lo = mid + 1
    return lo
```

**Complexity.** O(n log(sum(weights))) time, O(1) space.

**Duplicate problems:**
- Split Array Largest Sum (LC 410) - identical greedy-feasibility skeleton.
- Divide Chocolate (LC 1231) - "maximize the minimum" mirror of the same idea.

---

### 3. Find the Smallest Divisor Given a Threshold (LC 1283)

Find the smallest positive integer divisor such that `sum(ceil(nums[i] / divisor))` is `≤ threshold`. Constraints: `1 ≤ n ≤ 5×10⁴`, `nums[i] ≤ 10⁶`, `n ≤ threshold ≤ 10⁶`.

**Approach.** Binary search the divisor from 1 to `max(nums)`. Feasibility: sum of `ceil(x / divisor)` compared to threshold; monotonic since a larger divisor only shrinks each term.

```python
import math

def smallest_divisor(nums: list[int], threshold: int) -> int:
    def total(divisor: int) -> int:
        return sum(math.ceil(x / divisor) for x in nums)

    lo, hi = 1, max(nums)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if total(mid) <= threshold:
            hi = mid
        else:
            lo = mid + 1
    return lo
```

**Complexity.** O(n log(max(nums))) time, O(1) space.

**Duplicate problems:**
- Koko Eating Bananas (LC 875) - structurally identical, same `ceil`-sum feasibility check.
- Minimum Speed to Arrive on Time (LC 1870) - similar ceiling-sum feasibility but with a fractional final leg.

