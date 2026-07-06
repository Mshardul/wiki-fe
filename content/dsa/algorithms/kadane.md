# Kadane

## Prerequisites

- [Array](../data-structures/array.md) [Must read] - Kadane's operates on a 1-D array with O(1) index access; understanding contiguous subarray indexing is required.
- [Dynamic Programming](./dynamic-programming.md) [Must read] - Kadane's is a one-variable DP with optimal substructure and overlapping subproblems; framing it as DP (not just a greedy scan) is how the interviewer will probe it.
- [Prefix Sum](../patterns/prefix-sum.md) [Must read] - the prefix-sum maximum-subarray approach is Kadane's main rival; knowing both lets you pick correctly and explain the trade-off.

## Table of Contents

- [Prerequisites](#prerequisites)
- [What it is](#what-it-is)
- [Intuition](#intuition)
- [How it works](#how-it-works)
- [Correctness / invariant](#correctness--invariant)
- [Complexity derivation](#complexity-derivation)
- [Constraints & approach](#constraints--approach)
- [When to use / when not](#when-to-use--when-not)
- [Comparison](#comparison)
- [Loop/recurrence invariant](#looprecurrence-invariant)
- [Edge cases](#edge-cases)
- [Implementation](#implementation)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)

## What it is

**Kadane's algorithm** finds the contiguous subarray with the largest sum in a 1-D array in a single left-to-right pass, using O(1) extra space.

**Mental model:** At each position `i`, you have exactly one decision - does including `nums[i]` in the current running subarray help, or is it better to start a new subarray at `i`? A negative running sum can only drag any future element down, so you discard it and restart. You track the best you've seen globally as you go.

> **Interview soundbite:** "Kadane's is a one-pass DP - `current` = best subarray ending *here*, `best` = best seen so far. At each step: extend or restart. O(n) time, O(1) space."

**Complexity:** O(n) time, O(1) space.

## Intuition

Suppose you're scanning left to right and you've accumulated a running sum `current`. You arrive at element `nums[i]`.

- If `current > 0`: keeping the accumulated prefix helps - any positive contribution makes the sum larger. Extend: `current += nums[i]`.
- If `current <= 0`: the accumulated prefix actively hurts. Starting fresh at `nums[i]` gives a better subarray ending at `i` than dragging the negative tail along. Restart: `current = nums[i]`.

**Why this greedy choice is globally safe:** the maximum subarray ending at `i` either (a) is just `nums[i]` alone, or (b) extends the maximum subarray ending at `i-1`. If the maximum subarray ending at `i-1` is negative, (a) is always better than (b) - no future element will benefit from a negative prefix. So the local decision (extend or restart) is always globally consistent with the optimal answer.

This is also a DP: define `dp[i]` = maximum subarray sum ending exactly at index `i`. Then:

```
dp[i] = max(nums[i], dp[i-1] + nums[i])
answer = max(dp[0], dp[1], ..., dp[n-1])
```

Kadane's is just this DP with the `dp` array replaced by a single scalar `current`, since `dp[i]` only depends on `dp[i-1]`.

## How it works

**Input:** `nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]`

**Expected output:** `6` (subarray `[4, -1, 2, 1]`)

Step-by-step trace (`current` = max subarray ending here, `best` = global max):

```
i    nums[i]   current (before)   decision       current (after)   best
─────────────────────────────────────────────────────────────────────────
0     -2           -              start = -2           -2           -2
1      1          -2 ≤ 0          restart =  1          1            1
2     -3           1 > 0          extend  = -2         -2            1
3      4          -2 ≤ 0          restart =  4          4            4
4     -1           4 > 0          extend  =  3          3            4
5      2           3 > 0          extend  =  5          5            5
6      1           5 > 0          extend  =  6          6            6   ← answer
7     -5           6 > 0          extend  =  1          1            6
8      4           1 > 0          extend  =  5          5            6
```

**Diagram - current and best per step:**

```
index:    0    1    2    3    4    5    6    7    8
nums:    -2    1   -3    4   -1    2    1   -5    4

current: -2    1   -2    4    3    5    6    1    5
best:    -2    1    1    4    4    5    6    6    6
                                             ^
                                      answer = 6
```

The invariant holds at every step: `current` is the maximum sum of any subarray ending at the current index; `best` is the maximum across all indices seen so far.

## Correctness / invariant

**Loop invariant:** At the start of iteration `i`:

1. `current` = the maximum sum of any contiguous subarray ending at index `i-1`.
2. `best` = the maximum sum of any contiguous subarray in `nums[0..i-1]`.

**Initialization:** Before the loop (`i = 0`), set `current = nums[0]`, `best = nums[0]`. Both invariants hold vacuously for the prefix of length 1.

**Maintenance:** At index `i`, the maximum subarray ending at `i` is either `nums[i]` alone (restart) or `current + nums[i]` (extend). We take the max: `current = max(nums[i], current + nums[i])`. This preserves invariant 1. We then update `best = max(best, current)`, preserving invariant 2.

**Termination:** After the loop, `best` holds the maximum subarray sum over all of `nums[0..n-1]`. ∎

**Why the greedy choice is safe (exchange argument):** Suppose the optimal subarray starts at index `j`. At index `j-1`, `current ≤ 0` (otherwise, including `nums[0..j-1]` in the subarray would only improve the sum, contradicting the optimum starting at `j`). So the algorithm restarts at `j` - exactly where the optimum begins. Kadane's never misses the optimal start.

## Complexity derivation

**Time - O(n):**
Each element is visited exactly once. At each step: one comparison (`max`), one addition, one comparison for `best`. All O(1) work. Total: O(n) operations over n elements → **O(n)**.

**Space - O(1):**
Only two scalar variables maintained (`current`, `best`). No auxiliary array, no stack. The `dp[i]` array collapses to a single value because `dp[i]` depends only on `dp[i-1]` → **O(1)**.

**Cache behavior:** Sequential left-to-right scan of a contiguous array - every access is the next element. Perfect sequential prefetch, maximum cache friendliness. In practice this is one of the fastest possible linear-time algorithms on modern hardware.

## Constraints & approach

| Input size | Expected complexity | Approach | Notes |
|---|---|---|---|
| n ≤ 10⁵ | O(n) | Kadane's | Standard - single pass, O(1) space |
| n ≤ 10⁶ | O(n) | Kadane's | Still single pass; no concern at this scale |
| n ≤ 500 | O(n²) acceptable | Prefix-sum brute force | O(n) is still better; use Kadane's anyway |
| 2-D matrix, max subarray sum | O(n²·m) | Kadane's per compressed row | Fix left/right column bounds (O(n²)), compress each row to 1-D, run Kadane's on each - total O(n²·m) |
| Circular array max subarray | O(n) | Kadane's + complement trick | `max(kadane(nums), total_sum - kadane(-nums))` - see Variations |
| All elements negative | O(n) | Kadane's (must-pick-one variant) | Tracks least-negative; `best` initialised to `nums[0]`, not `-∞` |
| n ≤ 10⁹ (implicit array) | - | Not applicable | Kadane's needs random access or streaming; use math/formula if array is implicit |

**What constraints rule in/out:**
- O(n log n) → divide-and-conquer max subarray works but is overcomplicated; ruled out when O(n) is achievable.
- O(n²) prefix-sum brute force → ruled out for n > 10⁴.
- D&C (O(n log n)) → only useful if the interviewer explicitly asks you to demonstrate it.

## When to use / when not

**Reach for Kadane's when:**
- Asked for the **maximum sum contiguous subarray** in a 1-D or 2-D array.
- The problem says "maximum subarray" and n ≥ 10⁴ - O(n) is required.
- A **circular** variant appears - combine Kadane's with the complement trick.
- The 2-D extension is needed - fix column bounds, reduce each row to 1-D, apply Kadane's.

**Do not reach for Kadane's when:**
- The subarray must have a **fixed length** - use a sliding window instead.
- The problem asks for **maximum subarray product** - multiplication doesn't share Kadane's "restart on negative" logic; you must track both max and min running products (negatives flip sign).
- The problem asks for **all subarrays above a threshold** - Kadane's finds one optimum, not all qualifying subarrays.
- Elements are **non-negative** - the maximum subarray is always the entire array; answer is `sum(nums)` in O(n) with no algorithm needed.

**Real-world usage:** Financial data analysis uses Kadane's to find the maximum-profit window in a price series (equivalent to max subarray on daily changes). Signal processing uses it to find the highest-energy contiguous segment in a sampled signal. At scale, the 2-D extension (O(n²·m) for an n×m matrix) becomes the bottleneck - for large video frames or satellite imagery, GPU parallelism over column-bound pairs is required since no sub-cubic sequential algorithm is known for the general 2-D case.

## Comparison

| Algorithm | Time | Space | Key constraint / assumption | Pick it when |
|---|---|---|---|---|
| **Kadane's** | O(n) | O(1) | Any array (neg/pos/mixed) | Always - fastest, smallest space |
| Prefix-sum O(n²) | O(n²) | O(n) | Any array | Never for max sum - only useful for *counting* subarrays equal to k |
| Divide & conquer | O(n log n) | O(log n) | Any array | Interviewer asks to demonstrate D&C; never for performance |
| Sliding window | O(n) | O(1) | **Fixed-length** subarray | Max subarray of exact length k - beats Kadane's only when length is fixed, since Kadane's has no way to enforce a length constraint |
| Kadane's 2-D | O(n²·m) | O(m) | 2-D matrix, max rectangle sum | Explicitly 2-D problem |

**Crossover condition:** D&C max subarray beats Kadane's in exactly zero practical cases - it's O(n log n) vs O(n) with higher constant. Its only use is pedagogical (demonstrates D&C on arrays) or when the interviewer specifically asks for it.

## Loop/recurrence invariant

> **Family note:** Kadane's algorithm belongs to the **Search/divide** family by nearest fit - it maintains a loop invariant over a linear scan rather than a recurrence over halves. The block below treats the invariant as the family-level content; the recurrence is a degenerate one (`dp[i]` depends only on `dp[i-1]`), not a divide-and-conquer split.

**The DP recurrence:**

```
dp[i] = max(nums[i], dp[i-1] + nums[i])
      = nums[i] + max(0, dp[i-1])
```

**Why it encodes the right thing:** `dp[i]` is the maximum sum subarray ending at index `i`. Every subarray ending at `i` either starts at `i` (just `nums[i]`) or extends some subarray ending at `i-1`. The best such extension uses `dp[i-1]` - the best ending at `i-1`. If `dp[i-1]` is negative, `max(0, dp[i-1]) = 0` and we restart.

**Space compression:** The standard DP table `dp[0..n-1]` compresses to a single scalar `current` because `dp[i]` depends only on `dp[i-1]`. This is the same compression used in 1-D DP knapsack and staircase problems.

**Recurrence and complexity:** The recurrence is degenerate - `T(n) = T(n-1) + O(1)` (process one element, recurse on the rest). Unrolling: `T(n) = n · O(1) = O(n)`. This is the degenerate case of the Master Theorem (a=1, b=1 - not a divide step at all), which is why Kadane's is O(n) rather than O(n log n) like true divide-and-conquer recurrences.

**Search-space shrink (loop invariant form):** After processing index `i`, `current` holds the maximum of all subarray sums of the form `nums[j..i]` for any `j ≤ i`. We never store all j..i pairs - `current` is the single survivor that the next element needs. This greedy compression is what collapses O(n²) candidate subarrays to O(1) space.

## Edge cases

**1. All negative - must-include-one variant:**

The maximum subarray is the single least-negative element. Initialise `current = best = nums[0]` (not `0` or `-∞`) and the loop handles this correctly - `current` restarts at each element but `best` captures the maximum single element seen.

```python
# All negative: [-3, -1, -2]
# current trace: -3 → -1 → -2  (restarts each step since prev ≤ 0)
# best trace:    -3 → -1 → -1  → answer: -1  ✓
```

**CP trap:** Initialising `best = 0` is wrong when all elements are negative - it would return 0, implying an empty subarray, but the problem typically requires at least one element.

**2. Single element:**

`current = best = nums[0]`. Loop doesn't execute. Returns `nums[0]`. Correct regardless of sign.

**3. All positive:**

`current` never restarts (always > 0). Final `current = sum(nums)`. `best = sum(nums)`. Correct - the whole array is the answer.

**4. Integer overflow (CP trap):**

Subarray sums can reach `n × max_val`. For `n = 10⁵` and `nums[i] = 10⁹`, the maximum subarray sum is `10¹⁴` - overflows a 32-bit int (max ~2.1 × 10⁹). In Python this is never an issue (arbitrary precision integers). In C++/Java: use `long` / `long long` for `current` and `best`. This is the most common CP submission WA on Kadane's problems.

**5. Empty array:**

Standard Kadane's assumes `n ≥ 1`. For `n = 0`, return 0 or raise - problem constraints always specify `n ≥ 1` in practice. Add a guard: `if not nums: return 0`.

**6. Array with exactly one positive island surrounded by negatives:**

e.g. `[-5, -3, 4, -8]`. Kadane's restarts at index 2 (4), `best` captures 4, then `current` drops to -4 but `best` holds. Correctly returns 4. No special handling needed.

**7. Restart condition equivalence (implementation trap):**

Two forms look different but are identical:
- `current = max(num, current + num)` - the canonical form
- `if current < 0: current = num else: current += num` - explicit branch form

They produce the same result because `max(num, current + num) = num` iff `current ≤ 0`. The index-tracking variant uses `current + num < num` (i.e. `current < 0`) as the restart test - same condition, rearranged. Mixing forms in a single implementation (e.g. `if current <= 0` in one place and `max(num, current + num)` elsewhere) causes off-by-one disagreements when `current == 0`; the `max` form handles the `current == 0` case as "restart" (returns the same value either way), making it the safer canonical choice.

## Implementation

**Pseudocode (CLRS style):**

```
KADANE(A, n):
  if n == 0:
    return 0
  current ← A[1]
  best    ← A[1]
  for i = 2 to n:
    current ← max(A[i], current + A[i])
    best    ← max(best, current)
  return best
```

**Python (idiomatic):**

```python
def max_subarray(nums: list[int]) -> int:
    if not nums:
        return 0
    current = best = nums[0]
    for num in nums[1:]:
        current = max(num, current + num)
        best = max(best, current)
    return best
```

**With subarray bounds tracking (interview follow-up):**

```python
def max_subarray_with_indices(nums: list[int]) -> tuple[int, int, int]:
    current = best = nums[0]
    start = end = best_start = 0
    temp_start = 0

    for i, num in enumerate(nums[1:], start=1):
        if current + num < num:
            current = num
            temp_start = i
        else:
            current += num
        if current > best:
            best = current
            best_start = temp_start
            end = i

    return best, best_start, end
```

**Contest velocity - `itertools.accumulate` for prefix-sum approach (when counting, not maximising):**

```python
from itertools import accumulate

def subarray_sum_equals_k_count(nums: list[int], k: int) -> int:
    from collections import defaultdict
    counts: dict[int, int] = defaultdict(int)
    counts[0] = 1
    result = running = 0
    for num in nums:
        running += num
        result += counts[running - k]
        counts[running] += 1
    return result
```

Note: `accumulate` replaces hand-rolled prefix sums; for Kadane's itself there is no stdlib shortcut - the two-line loop is already optimal.

## What the interviewer probes for

**"What if all elements are negative?"**
Return the maximum single element (least-negative). The algorithm handles this automatically when `current` and `best` are both initialised to `nums[0]` - the loop still runs, `current` restarts at each element (since any accumulated sum ≤ 0 after a negative), and `best` tracks the maximum seen. The bug is initialising `best = 0` - that would incorrectly return 0 for an all-negative array, since 0 implies an empty subarray is chosen.

**"Can you extend this to 2D - maximum sum rectangular submatrix?"**
Fix the left and right column boundaries (O(n²) pairs for an n×n matrix). For each pair, compress the matrix horizontally: `row_sum[r]` = sum of `matrix[r][left..right]` for each row `r`. This gives a 1-D array of length `m`; run Kadane's on it to find the best row range. Total O(n²·m). For a square matrix: O(n³).

**"What if the subarray can wrap around (circular array)?"**
Two cases: (1) the max subarray does not wrap - plain Kadane's gives the answer. (2) the max subarray wraps - it equals `total_sum - min_subarray_sum`. Run Kadane's twice: once for max subarray, once for min subarray (negate all elements or flip `max`/`min`). Answer: `max(kadane_max, total - kadane_min)`. Edge case: if all elements are negative, case 2 yields `total - total = 0` (empty subarray) which is wrong - return `kadane_max` in that case.

**"How is this different from the divide-and-conquer O(n log n) approach?"**
D&C splits the array at mid, recursively finds the max subarray in left half, right half, and crossing the midpoint (O(n) crossing scan), combining in O(n log n) total. Kadane's achieves O(n) by recognising the DP structure: `dp[i]` depends only on `dp[i-1]`, eliminating the need to recurse. D&C is pedagogically useful (demonstrates the paradigm on arrays) but never the right choice over Kadane's in practice.

**"Is Kadane's greedy or DP?"**
Both - it's the same algorithm viewed through two lenses. The DP lens: `dp[i] = max(nums[i], dp[i-1] + nums[i])`, space-compressed to O(1). The greedy lens: at each step, make the locally optimal choice (restart if current is negative), which is provably globally optimal by exchange argument. Most interviewers accept either framing; the DP framing is more rigorous.

## Practice problems

### 1. Maximum Subarray (LC 53)

Given an integer array `nums`, find the contiguous subarray with the largest sum and return its sum. Constraints: 1 ≤ n ≤ 10⁵, -10⁴ ≤ nums[i] ≤ 10⁴.

**Approach:** Direct Kadane's application. Initialise `current = best = nums[0]`. For each subsequent element: `current = max(num, current + num)`, `best = max(best, current)`. Single pass, O(1) space. The all-negative case is handled correctly by initialising to `nums[0]` rather than 0.

```python
def maxSubArray(nums: list[int]) -> int:
    current = best = nums[0]
    for num in nums[1:]:
        current = max(num, current + num)
        best = max(best, current)
    return best
```

**Time:** O(n). **Space:** O(1).

**Duplicate problems:**
- Maximum Sum Circular Subarray (LC 918) - same Kadane's base, adds the `total - min_subarray` case for wrap-around; same "all negative" edge case caveat.
- Maximum Subarray Sum with One Deletion (LC 1186) - track two states: `dp_no_del[i]` (best ending at i, no deletion) and `dp_del[i]` (best ending at i, one element deleted); both transition using Kadane-style extend/restart logic.

---

### 2. Maximum Sum Circular Subarray (LC 918)

Given a circular integer array `nums` (last element wraps to first), return the maximum subarray sum. The subarray may not be empty. Constraints: 1 ≤ n ≤ 3×10⁴, -3×10⁴ ≤ nums[i] ≤ 3×10⁴.

**Approach:** Two cases. Case 1: max subarray does not wrap - plain Kadane's. Case 2: max subarray wraps - it consists of a prefix + suffix, equivalent to `total_sum - min_subarray_sum`. Run Kadane's for max, then run Kadane's again with `min` instead of `max` for min subarray sum. Answer = `max(case1, total - case2)`. Edge case: if all elements are negative, `total - case2 = 0` (empty subarray) - return `case1` (the least-negative element).

```python
def maxSubarraySumCircular(nums: list[int]) -> int:
    total = sum(nums)
    cur_max = best_max = nums[0]
    cur_min = best_min = nums[0]

    for num in nums[1:]:
        cur_max = max(num, cur_max + num)
        best_max = max(best_max, cur_max)
        cur_min = min(num, cur_min + num)
        best_min = min(best_min, cur_min)

    if best_max < 0:          # all elements negative
        return best_max
    return max(best_max, total - best_min)
```

**Time:** O(n). **Space:** O(1).

**Duplicate problems:**
- Maximum Sum of Two Non-Overlapping Subarrays (LC 1031) - run two Kadane-style passes (prefix max and suffix max arrays), then combine; same extend/restart mechanic, different structure.

---

### 3. Maximum Product Subarray (LC 152)

Given integer array `nums`, find the contiguous subarray with the largest product and return its product. Constraints: 1 ≤ n ≤ 2×10⁴, -10 ≤ nums[i] ≤ 10 (note: LC's actual constraint is up to 30, but the algorithm is identical).

**Approach:** Product does not share Kadane's "restart on negative" logic - a large negative times another negative yields a large positive. Track both `cur_max` (running maximum product ending here) and `cur_min` (running minimum product ending here). At each element: `cur_max, cur_min = max(num, cur_max*num, cur_min*num), min(num, cur_max*num, cur_min*num)`. A zero resets both to `num` (the `max`/`min` with `num` alone handles this). This exercises the key insight: Kadane's extend-or-restart breaks for products; you need both extremes.

```python
def maxProduct(nums: list[int]) -> int:
    cur_max = cur_min = best = nums[0]
    for num in nums[1:]:
        candidates = (num, cur_max * num, cur_min * num)
        cur_max, cur_min = max(candidates), min(candidates)
        best = max(best, cur_max)
    return best
```

**Time:** O(n). **Space:** O(1).

**Duplicate problems:**
- Maximum Absolute Value Expression (LC 1131) - tracks two running extremes simultaneously; same dual-track pattern as max-product.
- Minimum Product Subarray (no LC number, classic variant) - swap `max`/`min` roles; identical code structure.
