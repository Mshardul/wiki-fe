# Big-O Notation

## Prerequisites

- [Recursion](./recursion.md) [Should read]

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)
- [Intuition](#intuition)
- [How it works](#how-it-works)
- [Correctness / invariant](#correctness--invariant)
- [Complexity derivation](#complexity-derivation)
- [Constraints & approach](#constraints--approach)
- [When to use / when not](#when-to-use--when-not)
- [Comparison](#comparison)
- [State & recurrence](#state--recurrence)
- [Edge cases](#edge-cases)
- [Implementation](#implementation)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)
  - [Merge two sorted arrays - derive the bound](#1-merge-two-sorted-arrays---derive-the-bound)
  - [Nested loop with a shrinking bound](#2-nested-loop-with-a-shrinking-bound)
  - [Recurrence solving via Master theorem](#3-recurrence-solving-via-master-theorem)
  - [Amortized cost of a dynamic array](#4-amortized-cost-of-a-dynamic-array---accounting-method)

## What it is

**Big-O notation** is a way of describing how an algorithm's running time (or space) grows as the input size `n` grows **without number**, by naming the dominant term and discarding constants and lower-order terms - it answers "how does the cost scale?" not "how many milliseconds does it take?"

Mental model: **the speed limit sign, not the speedometer.** Big-O tells you the *shape* of growth (linear, quadratic, logarithmic) - the same way a speed-limit sign tells you the legal ceiling, not your actual current speed. Two algorithms both "O(n)" can differ by a 100x constant factor in wall-clock time; Big-O deliberately throws that constant away because it doesn't tell you how the algorithm behaves as `n → ∞`, which is the question that actually predicts whether an approach survives `n = 10⁸` or collapses.

> **Takeaway (say this out loud):** "Big-O describes the growth rate of cost as input size increases, ignoring constants and lower-order terms - it's the tool for answering 'will this approach survive the given constraint,' not 'how many milliseconds will this take.'"

## Intuition

Why throw away constants at all? Because **constants don't determine which algorithm wins at scale, growth rate does.** An O(n²) algorithm with a tiny constant (say, `0.01 · n²` operations) beats an O(n log n) algorithm with a large constant (`1000 · n log n`) at `n = 100` - but the moment `n` crosses roughly 14,000, the quadratic term overtakes no matter how small its constant, because `n²` grows faster than `n log n` *by definition*, and that gap widens without bound as `n` grows further. Big-O is a statement about the **limit**, not any single input size - it tells you who wins eventually, which is exactly the question that matters when `n` is large and unpredictable (production traffic, adversarial contest input).

The formal definition makes this precise: `f(n) = O(g(n))` means there exist positive constants `c` and `n₀` such that `f(n) ≤ c · g(n)` for all `n ≥ n₀`. In words: **beyond some threshold input size `n₀`, `f` is bounded above by some constant multiple of `g`, forever.** The constant `c` absorbs exactly the "which computer, which language, which constant-factor implementation detail" noise that Big-O is designed to ignore - what's left is the pure growth-rate comparison.

## How it works

Deriving a Big-O bound is a mechanical process: **count the operations as a function of `n`, then keep only the fastest-growing term, dropping its coefficient.**

**Step 1 - count operations symbolically.** For a loop that runs `n` times doing O(1) work per iteration, that's `n` operations. For two sequential loops of size `n` each, that's `n + n = 2n`. For a loop nested inside another loop, each running `n` times, that's `n · n = n²`.

```
for i in range(n):        # n iterations
    for j in range(n):    # n iterations each
        do_O(1)_work()    # 1 op

total operations = n × n × 1 = n²  →  O(n²)
```

**Step 2 - keep the dominant term, drop the rest.** If the exact operation count is `3n² + 5n + 12`, as `n → ∞` the `n²` term dominates - at `n = 1000`, `3n² = 3,000,000` while `5n = 5,000` and `12` is negligible by comparison. Formally, `3n² + 5n + 12 = O(n²)` because you can find `c` and `n₀` (e.g. `c = 4`, `n₀ = 6`) such that `3n² + 5n + 12 ≤ 4n²` for all `n ≥ 6`. The lower-order terms and the constant `3` vanish into the "ignore constants and lower-order terms" rule - they affect the crossover point, not the eventual winner.

**Step 3 - name the growth-rate family.** The common families, from fastest to slowest:

```
O(1)  <  O(log n)  <  O(√n)  <  O(n)  <  O(n log n)  <  O(n²)  <  O(n³)  <  O(2ⁿ)  <  O(n!)

constant   logarithmic   linear      "n log n"      quadratic    cubic    exponential   factorial
```

Each family grows strictly faster than the one before it - not just "usually faster at large n" but *provably* faster in the limit, which is exactly what the O(·) inequality captures.

## Correctness / invariant

**The <abbr>invariant</abbr> Big-O expresses:** for `f(n) = O(g(n))`, the invariant is that the ratio `f(n) / g(n)` is bounded above by some constant `c` for all `n ≥ n₀` - it never grows without bound. This is what "f doesn't grow faster than g" formally means.

**Why the definition requires an `n₀` (not "for all n"):** small inputs are allowed to violate the bound because Big-O is a statement about *asymptotic* (large-n) behavior only. `f(n) = 1000` and `g(n) = n` - at `n = 1`, `f(1) = 1000 > g(1) = 1`, so no constant `c` makes `f(n) ≤ c·g(n)` hold at `n=1` unless `c ≥ 1000`. But pick `c = 1000` and `n₀ = 1`: then `f(n) = 1000 ≤ 1000n = c·g(n)` holds for all `n ≥ 1`. The `n₀` threshold is what lets Big-O ignore small-input noise (startup constants, one-time overhead) and focus purely on the growth trend.

**Why constants are provably irrelevant to the family, not just conventionally ignored:** for any constant `k > 0`, `k · n = O(n)` - because you can always pick `c = k` (or larger) and the inequality `k·n ≤ c·n` holds trivially for all `n ≥ 1`. This is not a simplification convention; it's a direct consequence of the definition. It's why `O(n)` and `O(5n)` and `O(0.001n)` are all the *same* Big-O class - the notation is defined to be insensitive to multiplicative constants by construction.

## Complexity derivation

**Deriving O(n²) from a nested loop, precisely.** Consider:

```python
total = 0
for i in range(n):
    for j in range(i, n):
        total += 1
```

The inner loop runs `n - i` times for each `i`. Total operations: `Σᵢ₌₀ⁿ⁻¹ (n - i) = n + (n-1) + (n-2) + ... + 1 = n(n+1)/2`. This is the classic **arithmetic series sum**, which equals `n²/2 + n/2`. As `n → ∞`, the `n²/2` term dominates the `n/2` term, and the constant `1/2` is dropped per the definition - so this is `O(n²)`, exactly the same family as a full `n × n` nested loop, even though the *exact* count is half. This is the concrete illustration of "constants and lower-order terms don't change the family."

**Solving a recurrence via the Master theorem.** For divide-and-conquer algorithms with recurrence `T(n) = a·T(n/b) + O(n^d)` (a subproblems, each of size `n/b`, plus `O(n^d)` work to combine), the Master theorem gives three cases by comparing `d` to `log_b(a)`:

```
T(n) = a·T(n/b) + O(n^d)

Case 1: d < log_b(a)  →  T(n) = O(n^(log_b a))     (leaves dominate)
Case 2: d = log_b(a)  →  T(n) = O(n^d · log n)      (every level costs the same)
Case 3: d > log_b(a)  →  T(n) = O(n^d)              (root's work dominates)
```

Applied to merge sort: `T(n) = 2·T(n/2) + O(n)` (2 subproblems of half size, O(n) merge work). Here `a=2, b=2, d=1`; `log_b(a) = log₂(2) = 1 = d` → **Case 2** → `T(n) = O(n¹ · log n) = O(n log n)`. This is *why* merge sort is O(n log n), not an assertion - the recurrence plus the theorem *derives* it.

## Constraints & approach

The single most-tested reading skill in interviews and contests: **the input-size constraint tells you which complexity is required, before you write a line of code.**

| Constraint (`n`)      | Required complexity | What it rules out / invites                                                    |
| ---------------------- | -------------------- | -------------------------------------------------------------------------------- |
| `n ≤ 10`               | O(n!), O(2ⁿ · n)     | Brute-force permutation/subset enumeration is fine.                              |
| `n ≤ 20-24`             | O(2ⁿ)                | Bitmask DP over all subsets (2²⁴ ≈ 16M is the practical ceiling).                |
| `n ≤ 500`               | O(n³)                | Floyd-Warshall, cubic DP over triples.                                          |
| `n ≤ 5000`              | O(n²)                | Simple nested-loop DP, O(n²) DP tables.                                          |
| `n ≤ 10⁵ - 10⁶`         | O(n log n)           | Sorting-based approaches, segment/Fenwick tree, heap-based greedy.               |
| `n ≤ 10⁸`               | O(n) or O(n log n) with a tiny constant | Single-pass algorithms only; even O(n log n) risks TLE at the high end. |
| `n ≤ 10⁹` and beyond    | O(log n) or O(1)     | Binary search on the answer, closed-form math, no full scan of `n` at all.       |

A time limit of ~1-2 seconds buys roughly **10⁸-10⁹ simple operations** on a typical judge - so dividing the constraint by that ceiling immediately narrows the viable complexity class before any algorithm is chosen. Seeing `n ≤ 10⁵` and reaching for an O(n²) solution is the single most common contest time-limit-exceeded (TLE) cause; seeing `n ≤ 20` and reaching for O(n) when the problem is actually NP-hard-shaped (and needs bitmask DP) is the mirror mistake - the constraint is a *hint*, not just a bound to check.

## When to use / when not

**Reach for Big-O analysis when:**

- Comparing two algorithms for the **same problem** to decide which scales better - the entire point of the notation.
- Reading a problem's **constraints** to determine which complexity class is required before designing an approach (see [Constraints & approach](#constraints--approach)).
- Communicating a design's scaling behavior to an interviewer or teammate - "O(n log n)" is a precise, portable claim; "it's pretty fast" is not.

**Reach for something else when:**

- You need **actual wall-clock performance** on a specific input size and hardware → benchmark/profile instead; Big-O intentionally discards the constant factor that determines real speed at small-to-medium `n`.
- Comparing two algorithms that are **both O(n)** but you need to pick between them for a specific deployment → look at the constant factor and cache behavior directly (see [Big O vs the constant factor](#big-o-vs-the-constant-factor-lies-o-hides) below) - Big-O alone can't distinguish them.
- The **input size is small and fixed** (e.g. always exactly 4 elements) → asymptotic behavior is irrelevant; just pick the simplest correct code.

Real-world: every capacity-planning conversation ("will this endpoint survive 10x traffic growth?") is implicitly a Big-O question - a service with O(n) per-request database scans degrades non-linearly as the table grows, which is exactly the failure Big-O predicts before it happens in production. At scale, an algorithm that's O(n log n) but with a cache-hostile access pattern (see [Gotchas](#edge-cases)) can lose to a "worse" O(n²) algorithm with a cache-friendly one - up to a genuine crossover point, after which the asymptotically better algorithm always wins; Big-O correctly predicts *that* crossover exists, just not exactly where.

## Comparison

| Notation | Meaning | Bound direction | Use case |
| --- | --- | --- | --- |
| **O(g(n))** (Big-O) | `f` grows **no faster than** `g`, up to a constant | Upper bound | "This algorithm never does worse than ___" - the standard interview/contest answer |
| Ω(g(n)) (Big-Omega) | `f` grows **at least as fast as** `g`, up to a constant | Lower bound | Proving a problem *requires* at least this much work (e.g. comparison sorting is Ω(n log n)) |
| Θ(g(n)) (Big-Theta) | `f` grows **exactly as fast as** `g` (both O and Ω hold) | Tight bound | The precise growth rate, when upper and lower bounds coincide - most textbook "complexity" claims are actually Θ, stated loosely as O |
| o(g(n)) (little-o) | `f` grows **strictly slower than** `g` (the ratio → 0) | Strict upper bound | Rare in interviews; used in proofs to express "negligible compared to" |

**Pick it when…** Big-O is the default because interview and contest answers care about the *worst case you must not exceed* - an upper bound. Θ is the more precise claim ("this algorithm is Θ(n log n), not just O(n log n)") and is what's usually *meant* when someone casually says "O(n log n)" for merge sort - merge sort is never faster than n log n either, so the bound is tight. Ω matters specifically when arguing a lower bound is unavoidable (e.g. "you cannot beat O(n) here because you must read every element at least once").

## State & recurrence

> **Family note:** Big-O notation is a cross-cutting analysis tool, not an algorithm with a single state/recurrence shape of its own - it doesn't fit any of the writer's five algorithm families cleanly (it has no loop invariant to shrink, no graph to traverse, no greedy choice, no key/distribution to exploit). The closest fit is **Recursive/build**, because the Master theorem - the main derivation tool this article teaches - is itself a recurrence-solving technique, and deriving Big-O for recursive algorithms is one of the two core skills this page equips (the other being loop-counting for iterative code). This section covers that recurrence-analysis half; [Complexity derivation](#complexity-derivation) covers the loop-counting half.

**The general recurrence shape and how to read it.** A recursive algorithm's cost is described by `T(n) = [subproblem calls] + [work done outside the recursive calls]`. Three canonical shapes:

```
T(n) = T(n-1) + O(1)         → O(n)          (single decrement, e.g. simple recursion/factorial)
T(n) = 2·T(n/2) + O(n)       → O(n log n)    (divide into 2 halves, linear combine - merge sort)
T(n) = T(n/2) + O(1)         → O(log n)      (halve, constant combine - binary search)
```

**How to derive these without memorizing the Master theorem's three cases.** The **recursion-tree method** makes the derivation visible: draw one node per call, with its cost written inside; the total cost is the sum of every node in the tree.

```
T(n) = 2·T(n/2) + O(n)   (merge sort's recurrence)

Level 0:           [n]                              cost n
Level 1:      [n/2]   [n/2]                          cost n/2 + n/2 = n
Level 2:   [n/4][n/4][n/4][n/4]                       cost 4·(n/4) = n
...
Level log₂n:  1  1  1  1  1 ... (n leaves)            cost n·1 = n

Total: n levels × cost n per level = n · log₂n  →  O(n log n)
```

Each level costs exactly `n` (the work is redistributed but not lost - `n/2 + n/2 = n`, `4·(n/4) = n`, etc.), and there are `log₂n` levels (halving `n` down to 1 takes `log₂n` steps) - so total cost is `n · log₂n`. This tree-summing derivation is what the Master theorem's Case 2 formalizes; walking the tree by hand is the fallback when a recurrence doesn't cleanly match one of the three Master theorem cases (e.g. unequal subproblem sizes).

**State-space size ties back to complexity.** For recursive algorithms with <abbr>memoization</abbr> (DP), the total work is `(number of distinct subproblem states) × (work per state)`. A recurrence like `T(n) = 2·T(n-1) + O(1)` **without memoization** has `2ⁿ` leaf calls (no shared subproblems) → O(2ⁿ); the *same* recurrence *with* memoization over `n` distinct states collapses to O(n) states × O(1) work = O(n) - the state-space size, not the naive recursion-tree leaf count, is what memoized complexity depends on. This is why "did you memoize?" is the first question that changes a complexity class from exponential to polynomial.

## Edge cases

- **O(1) is not "instant" - it's "independent of `n`."** An O(1) operation can still be slow in absolute terms (a single disk seek is O(1) but far slower than an O(n) scan of a small in-memory array). Big-O says nothing about the constant - conflating "O(1)" with "fast" is a common junior mistake.
- **<abbr>Amortized</abbr> ≠ worst-case, and both are legitimate Big-O claims about different things.** A dynamic array's `append` is "O(1) amortized" - meaning the *average* cost per operation over any sequence is O(1), even though any *individual* append can cost O(n) (the resize). Stating "O(1)" without the "amortized" qualifier when a worst-case single call can be O(n) is a precision failure that misleads about latency-sensitive contexts (a single slow append can violate a real-time deadline even though the amortized throughput is fine).
- **Multiple variables need multiple letters - don't collapse a graph's V and E into one `n`.** A graph algorithm's true cost is O(V + E) or O(V·E) or O(E log V) - collapsing to "O(n)" hides which variable dominates. For a sparse graph (E ≈ V) this barely matters; for a dense graph (E ≈ V²) writing "O(n)" when the truth is O(V²) is a serious understatement.
- **Best/average/worst case are three different Big-O claims for the same algorithm - name which one you mean.** Quicksort is O(n log n) *average* but O(n²) *worst* case (already-sorted input with a naive pivot). Saying "quicksort is O(n log n)" without qualification is technically the average case, not a universal bound - a interviewer probing quicksort will expect the worst-case caveat.
- **Recursive algorithms need a space term for the <abbr>call stack</abbr>, not just time.** An unbounded-depth recursive algorithm has O(depth) space from the call stack alone, even if it allocates no other memory - stating O(1) space for a recursive function (unless it's tail-call-eliminated or converted to iteration) is a common and gated-serious error (see [Recursion › Complexity](./recursion.md#complexity-derivation)).

### Big O vs the constant factor: lies O hides

Two algorithms in the same Big-O class can differ by orders of magnitude in real speed. `O(n)` with a hidden constant of `1000` (e.g., 1000 operations per element due to poor cache behavior or a heavy per-element function call) can be slower in practice than `O(n log n)` with a constant of `1` at any `n` below roughly `2^1000` - a threshold so astronomically large it never matters, meaning the O(n log n) algorithm's asymptotic advantage rarely materializes at any realistic `n` if its constant is that bad relative to a well-tuned O(n). This is why production engineering pairs Big-O analysis with **profiling** - Big-O tells you the *shape* of the curve; profiling tells you where you actually sit on it today.

## Implementation

Big-O is a way of reading and analyzing code, not code itself - but the mechanical process of *deriving* a bound is best shown as a worked derivation on representative code shapes.

**Pseudocode - the counting procedure:**

```
COUNT-OPERATIONS(code)
1   for each loop L in code (outermost to innermost)
2       determine L's iteration count as a function of n
3   multiply nested loop iteration counts together (nested loops)
4   add sequential loop/block counts together (sequential blocks)
5   for recursive calls, write the recurrence T(n) = [calls] + [non-recursive work]
6   solve the recurrence (recursion tree, or Master theorem if it fits the form
    T(n) = a·T(n/b) + O(n^d))
7   keep only the fastest-growing term; drop its coefficient
8   name the resulting O(·) class
```

**Python - deriving the bound for three representative shapes:**

```python
def linear_scan(arr: list[int]) -> int:
    total = 0
    for x in arr:              # n iterations, O(1) work each
        total += x
    return total                # O(n) time, O(1) space


def nested_pair_sum(arr: list[int], target: int) -> bool:
    n = len(arr)
    for i in range(n):          # n iterations
        for j in range(n):      # n iterations each → n * n = n^2
            if arr[i] + arr[j] == target:
                return True
    return False                 # O(n^2) time, O(1) space


def binary_search(arr: list[int], target: int) -> int:
    lo, hi = 0, len(arr) - 1
    while lo <= hi:              # search space halves each iteration
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1                    # O(log n) time: n halved each step → log2(n) steps
```

**Contest velocity.** In a contest, Big-O reasoning is applied *before* writing code, not derived after - read the constraint, pick the required complexity class per [Constraints & approach](#constraints--approach), and only write the algorithm that fits. Deriving Big-O for code you've already written is an interview-explanation skill; picking the target complexity from constraints first is the contest skill.

## What the interviewer probes for

- **"What's the difference between O, Θ, and Ω?"** - O is an upper bound (never worse than), Ω is a lower bound (never better than), Θ is both at once (a tight bound). Most casual "this is O(n log n)" claims about merge sort are actually Θ(n log n) claims, since merge sort is never faster either.
- **"Is O(1) always faster than O(n)?"** - No, for small or fixed `n` - Big-O only describes the growth trend as `n → ∞`, and hides the constant factor entirely. An O(1) operation with a large constant (a slow hash function, a disk read) can lose to an O(n) operation with a tiny constant, for any `n` below the crossover point.
- **"How do you find the complexity of a recursive function?"** - Write the recurrence `T(n) = [subproblem calls] + [combine work]`, then either match it to the Master theorem's `T(n) = a·T(n/b) + O(n^d)` form and read off the case, or sum the recursion tree level by level when it doesn't cleanly match.
- **"Why does quicksort have two different complexities people quote?"** - O(n log n) is the *average* case (random pivot choices split roughly evenly); O(n²) is the *worst* case (already-sorted input with a naive first/last-element pivot, causing maximally unbalanced partitions). Both are correct claims about different scenarios - state which one you mean.
- **"When would you accept a worse Big-O algorithm?"** - When `n` is small and bounded (the asymptotic advantage never kicks in), when the "worse" algorithm has a much smaller constant factor or better cache behavior, or when the "better" algorithm requires significantly more memory that doesn't fit the target hardware.

## Practice problems

Four problems, each exercising a **distinct** complexity-derivation skill - no two the same.

### 1. Merge two sorted arrays - derive the bound

**Problem.** Given two sorted arrays of length `m` and `n`, merge them into one sorted array. Derive the time and space complexity of your approach.

**Worked examples:**
- **Example 1**
  - **Input:** `arr1 = [1,3,5]`, `arr2 = [2,4,6]` | **Output:** `[1,2,3,4,5,6]`
  - **Explanation:** a two-pointer merge advances whichever pointer holds the smaller current value, appending it to the result - each element from both arrays is visited exactly once.
- **Example 2**
  - **Input:** `arr1 = []`, `arr2 = [1,2,3]` | **Output:** `[1,2,3]`
  - **Explanation:** with one array empty, the merge degenerates to copying the other array directly - still bounded by the same two-pointer loop.

**Constraints:** `0 ≤ m, n ≤ 10⁵`.

**Approach:** Two pointers, one per array, always advancing the one pointing at the smaller current element. Each pointer advances at most once per element, and the loop terminates when both are exhausted - so the total iterations across the whole run is bounded by `m + n`, not `m × n`. This is the two-variable case from [Edge cases](#edge-cases): naming both `m` and `n` separately (`O(m+n)`) is more precise than collapsing to a single `O(n)`.

```python
def merge_sorted(a: list[int], b: list[int]) -> list[int]:
    result: list[int] = []
    i = j = 0
    while i < len(a) and j < len(b):    # each iteration advances i or j
        if a[i] <= b[j]:
            result.append(a[i]); i += 1
        else:
            result.append(b[j]); j += 1
    result.extend(a[i:])                 # at most one of these has leftovers
    result.extend(b[j:])
    return result
```

**Complexity:** O(m + n) time - each of the m+n elements is appended exactly once, and no element is revisited. O(m + n) space for the output array.

**Duplicate problems:**
- Merge Sorted Array (LC 88) - same two-pointer merge, in-place variant merging into the end of the larger array to avoid extra space.

### 2. Nested loop with a shrinking bound

**Problem.** Given an array of length `n`, count all pairs `(i, j)` with `i < j`. Determine the complexity without running the code, purely from the loop structure.

**Worked examples:**
- **Example 1**
  - **Input:** `n = 4` | **Output:** `6` pairs `((0,1),(0,2),(0,3),(1,2),(1,3),(2,3))`
  - **Explanation:** this is `n choose 2 = n(n-1)/2 = 4·3/2 = 6`, matching the triangular-number pattern the shrinking inner loop produces.
- **Example 2**
  - **Input:** `n = 1` | **Output:** `0` pairs
  - **Explanation:** with only one element there's no `j > i` to pair with, so the inner loop never executes.

**Constraints:** `0 ≤ n ≤ 10⁴`.

**Approach:** The inner loop's range shrinks as `i` grows (`range(i+1, n)` instead of `range(n)`), so the naive "it's a nested loop, must be O(n²)" reflex needs the arithmetic-series derivation from [Complexity derivation](#complexity-derivation) to confirm the family doesn't change: `Σᵢ₌₀ⁿ⁻¹ (n - i - 1) = n(n-1)/2`, which is still O(n²) (the leading term is `n²/2`) - a shrinking inner bound changes the *constant*, not the family, exactly the "constants don't change growth rate" lesson this article teaches.

```python
def count_pairs(n: int) -> int:
    count = 0
    for i in range(n):
        for j in range(i + 1, n):    # shrinks as i grows
            count += 1
    return count
```

**Complexity:** O(n²) time despite the shrinking inner bound - the exact count n(n-1)/2 has leading term n²/2, same family as a full n×n nested loop. O(1) space.

### 3. Recurrence solving via Master theorem

**Problem.** A divide-and-conquer algorithm splits a problem of size `n` into 3 subproblems of size `n/2` each, then does O(n²) work to combine results. Derive its time complexity using the Master theorem.

**Worked examples:**
- **Example 1**
  - **Input:** `T(n) = 3·T(n/2) + O(n²)` | **Output:** O(n²)
  - **Explanation:** `a=3, b=2, d=2`; `log_b(a) = log₂(3) ≈ 1.585`, and since `d=2 > 1.585`, this is Master theorem Case 3 - the combine step dominates, giving O(n²).
- **Example 2**
  - **Input:** `T(n) = 7·T(n/2) + O(n²)` (Strassen's matrix multiplication's recurrence) | **Output:** O(n^log₂7) ≈ O(n^2.807)
  - **Explanation:** `a=7, b=2, d=2`; `log₂(7) ≈ 2.807 > d=2`, so this is Case 1 - the leaves (7^(log₂n) of them) dominate over the O(n²) combine work, giving the famous sub-cubic bound that makes Strassen's algorithm asymptotically beat naive O(n³) matrix multiplication.

**Constraints:** recurrence must be of the form `T(n) = a·T(n/b) + O(n^d)` for the Master theorem to apply directly; `a ≥ 1`, `b > 1`, `d ≥ 0`.

**Approach:** Identify `a` (number of subproblems), `b` (size-reduction factor), and `d` (exponent of the non-recursive combine work), then compare `d` to `log_b(a)` per the three cases in [Complexity derivation](#complexity-derivation). This is a direct plug-into-the-theorem exercise, distinct from problem 1's two-pointer counting and problem 2's arithmetic-series summing - it tests recurrence *classification* rather than direct operation counting.

```python
import math

def master_theorem(a: int, b: int, d: float) -> str:
    log_b_a = math.log(a, b)
    if d < log_b_a - 1e-9:
        return f"O(n^{log_b_a:.3f})  (Case 1: leaves dominate)"
    elif abs(d - log_b_a) < 1e-9:
        return f"O(n^{d} log n)  (Case 2: every level costs the same)"
    else:
        return f"O(n^{d})  (Case 3: root's work dominates)"

print(master_theorem(3, 2, 2))   # O(n^2)  (Case 3)
print(master_theorem(7, 2, 2))   # O(n^2.807)  (Case 1)
print(master_theorem(2, 2, 1))   # O(n^1.0 log n)  (Case 2 - merge sort)
```

**Complexity:** O(1) for the classification itself (a fixed number of comparisons); the *result* of applying it to a given recurrence is whatever O(·) class the theorem outputs, per case.

**Duplicate problems:**
- Pow(x, n) (LC 50) - fast exponentiation's recurrence `T(n) = T(n/2) + O(1)` is a direct Case-1/Case-2 boundary application (a=1, b=2, d=0, log_b(a)=0=d → Case 2 → O(log n)).

### 4. Amortized cost of a dynamic array - accounting method

**Problem.** A dynamic array doubles its capacity whenever it's full. Prove that `n` sequential `append` calls starting from an empty array cost O(n) total, i.e. O(1) amortized per append, using the accounting (banker's) method.

**Worked examples:**
- **Example 1**
  - **Input:** 8 sequential appends into an initially empty array (capacity starts at 1, doubling: 1→2→4→8) | **Output:** total real cost = 8 (appends) + 1+2+4 (resize copies) = 15 operations for 8 appends ≈ 1.875 per append
  - **Explanation:** resizes happen at append 2 (copy 1 element), append 3 (copy 2), append 5 (copy 4) - each resize's copy cost is bounded by the previous capacity, and the sum of all prior capacities is less than the current size.
- **Example 2**
  - **Input:** 1 million sequential appends | **Output:** total real cost bounded by ~3 million operations (< 3n), confirming O(1) amortized regardless of scale
  - **Explanation:** the geometric-doubling resize costs (1+2+4+...+n/2 < n) never exceed the linear append cost by more than a constant factor, no matter how large n grows - this is the scale-invariance the accounting method proves algebraically, not just empirically.

**Constraints:** doubling factor is 2 (standard); `1 ≤ n ≤ 10⁷` appends.

**Approach:** The accounting method charges each `append` a flat fee of **3 credits** (a constant, chosen in advance): 1 credit pays for the append itself, and 2 credits are banked. When a resize of size `k` occurs, it needs to move `k` elements - and because the array just doubled from `k` to `2k`, exactly `k` elements were appended since the *previous* resize (which grew capacity from `k/2` to `k`), each of which banked 2 credits = `2k` banked credits available, more than enough to pay the `k`-element copy cost. Since every append is charged the same flat 3 credits regardless of whether it triggers a resize, and the total charged is `3n` for `n` appends, the total actual cost (appends + all resize copies) can never exceed `3n` - giving O(1) amortized cost per append, proven algebraically rather than asserted. This is the argument [dynamic-array.md](../data-structures/dynamic-array.md) references but doesn't fully carry out - see that page's own DS9a section for the array-specific version.

```python
def simulate_amortized_cost(n: int) -> tuple[int, float]:
    capacity = 1
    size = 0
    real_cost = 0            # actual copy operations performed
    for _ in range(n):
        if size == capacity:                  # resize needed
            real_cost += capacity              # cost of copying existing elements
            capacity *= 2
        real_cost += 1                          # cost of the append itself
        size += 1
    return real_cost, real_cost / n              # total, and per-append average

total, per_append = simulate_amortized_cost(1_000_000)
print(total, per_append)          # real cost stays < 3n; per-append ratio stays bounded, not growing with n
```

**Complexity:** O(n) total real cost for n appends (proven via the accounting method: 3 credits/append × n appends bounds both the append cost and every resize's copy cost), so O(1) amortized per append - despite individual worst-case appends costing O(n) when a resize triggers.

**Duplicate problems:**
- Design a HashSet / Design HashMap (LC 705/706) - the same doubling-resize amortized argument underlies dynamic hash table resizing, just triggered by load factor instead of a full array.
