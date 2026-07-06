# Sliding Window

## Prerequisites

- [Array](../data-structures/array.md) [Must read] - window operates on a contiguous indexed sequence
- [Hash Table](../data-structures/hash-table.md) [Must read] - frequency maps track window contents in variable windows
- [Deque](../data-structures/deque.md) [Must read] - monotonic deque enables O(1) window max/min (CP-primitive)
- [Two Pointers](./two-pointers.md) [Must read] - sliding window is a specialization of the two-pointers pattern

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

A **sliding window** maintains a contiguous sub-range `[L, R]` over a sequence and moves it by expanding `R` to include new elements and contracting `L` to restore a constraint - answering questions about all sub-ranges in O(n) instead of O(n²).

**Mental model:** imagine a physical window frame sliding across a row of tiles. You never lift the frame; you push the right edge right to grow it, and push the left edge right to shrink it. Everything you need to know about the current view is maintained incrementally.

> **Interview soundbite:** "Sliding window - two pointers bounding a contiguous sub-range; expand right, contract left on a constraint violation, track aggregate state incrementally."

---

## Recognition signals

### (a) Trigger phrases

Look for these literal phrasings in the problem statement:

- *"longest/shortest **contiguous** subarray/substring that…"*
- *"maximum sum subarray of **size K**"*
- *"minimum window substring containing all characters of T"*
- *"longest substring with **at most K** distinct characters"*
- *"find all anagrams of P in S"* / *"permutation of P exists in S"*
- *"sliding window maximum"* / *"maximum of every window of size K"*

### (b) Structural cues

- Input is an **array or string** (contiguous, indexed).
- You need to optimize a metric (max/min length, max/min sum) over **all sub-ranges** satisfying a constraint.
- The constraint has a **monotonic** relationship with window size: once the window violates it, growing further only makes it worse (or better), so you can move one pointer without re-checking all positions.
- Output is a single value or a list of sub-ranges - not all pairs.

### (c) Not to be confused with

| Pattern | Distinction |
|---|---|
| **Two Pointers** | Two-pointers is the parent - sliding window IS two-pointers, but with **window semantics**: every element between L and R contributes to a maintained aggregate (sum, frequency map). Pure two-pointer (pair-sum on sorted array) converges toward a condition without maintaining a running aggregate over the gap. |
| **Prefix Sum** | Prefix sum answers range queries in O(1) after O(n) preprocessing; it doesn't move a window. Use prefix sum when you need arbitrary `[L, R]` queries; use sliding window when you're scanning for an optimal window under a constraint. |
| **DP** | DP memoizes overlapping subproblems. Sliding window is a special case where the subproblem structure is purely contiguous and can be maintained in O(1) per step without memoization. |

---

## How it works

### Fixed-size window

For a window of fixed size K, initialize on `[0, K-1]`, then slide: remove `arr[L]`, add `arr[R+1]`, advance both pointers.

```
Array:  [2, 1, 5, 1, 3, 2],  K = 3
        L_____R              window = [2,1,5], sum=8
           L_____R           window = [1,5,1], sum=7
              L_____R        window = [5,1,3], sum=9  ← max
                 L_____R     window = [1,3,2], sum=6
```

### Variable-size window

Expand `R` unconditionally; shrink `L` when the constraint is violated. The window is always valid after the shrink step.

```
Problem: longest substring with at most 2 distinct chars
String:  a  a  b  b  c  c
         0  1  2  3  4  5

Step 1: R=0, window="a",  distinct=1  ✓
Step 2: R=1, window="aa", distinct=1  ✓
Step 3: R=2, window="aab",distinct=2  ✓  best=3
Step 4: R=3, window="aabb",distinct=2 ✓  best=4
Step 5: R=4, window="aabbc",distinct=3 ✗
        → shrink L: remove 'a' (L=0→1), still 3 distinct
        → shrink L: remove 'a' (L=1→2), still 3 distinct
        → shrink L: remove 'b' (L=2→3), distinct=2 ✓
        window="bc", L=3,R=4
Step 6: R=5, window="bcc",distinct=2 ✓  best=4
```

**Key invariant:** after every step, the window `[L, R]` satisfies the constraint. `R` never moves left; `L` never moves right past `R`.

---

## Skeleton

### Fixed-size window (pseudocode)

```
FIXED-WINDOW(arr, n, k)
  window_sum = sum of arr[0..k-1]
  best = window_sum
  for i = k to n - 1
    window_sum = window_sum + arr[i] - arr[i - k]
    best = max(best, window_sum)
  return best
```

### Variable-size window - maximize length (pseudocode)

```
VARIABLE-WINDOW-MAX(arr, n)
  L = 0
  state = empty             ▷ frequency map or counter
  best = 0
  for R = 0 to n - 1
    ADD arr[R] to state     ▷ expand right
    while VIOLATED(state)   ▷ shrink left until valid
      REMOVE arr[L] from state
      L = L + 1
    best = max(best, R - L + 1)
  return best
```

### Minimum-window (find smallest valid) (pseudocode)

```
MIN-WINDOW(s, t)
  need = frequency map of t
  have = 0,  required = number of distinct chars in t
  L = 0,  best = (∞, 0, 0)
  for R = 0 to len(s) - 1
    ADD s[R] to window_count
    if s[R] in need and window_count[s[R]] == need[s[R]]
      have = have + 1
    while have == required         ▷ try to shrink
      if R - L + 1 < best length
        best = (R - L + 1, L, R)
      REMOVE s[L] from window_count
      if s[L] in need and window_count[s[L]] < need[s[L]]
        have = have - 1
      L = L + 1
  return best
```

### Python templates

```python
from collections import deque
from typing import Optional

# ── Fixed-size window ────────────────────────────────────────────────────────
def max_sum_fixed(arr: list[int], k: int) -> int:
    window = sum(arr[:k])
    best = window
    for i in range(k, len(arr)):
        window += arr[i] - arr[i - k]
        best = max(best, window)
    return best


# ── Variable-size window (maximize length) ───────────────────────────────────
def longest_valid_window(arr: list[int], k: int) -> int:
    freq: dict[int, int] = {}
    L = 0
    best = 0
    for R, val in enumerate(arr):
        freq[val] = freq.get(val, 0) + 1
        while len(freq) > k:
            freq[arr[L]] -= 1
            if freq[arr[L]] == 0:
                del freq[arr[L]]
            L += 1
        best = max(best, R - L + 1)
    return best


# ── Minimum window (minimize length) ────────────────────────────────────────
def min_window(s: str, t: str) -> str:
    need: dict[str, int] = {}
    for c in t:
        need[c] = need.get(c, 0) + 1
    have, required = 0, len(need)
    window: dict[str, int] = {}
    best: Optional[tuple[int, int]] = None
    L = 0
    for R, c in enumerate(s):
        window[c] = window.get(c, 0) + 1
        if c in need and window[c] == need[c]:
            have += 1
        while have == required:
            if best is None or (R - L + 1) < (best[1] - best[0] + 1):
                best = (L, R)
            window[s[L]] -= 1
            if s[L] in need and window[s[L]] < need[s[L]]:
                have -= 1
            L += 1
    return s[best[0] : best[1] + 1] if best else ""
```

---

## Complexity

| Variant | Time | Space | Why |
|---|---|---|---|
| Fixed-size window | O(n) | O(1) | Single pass; O(1) add/remove per step |
| Variable-size window | O(n) | O(k) or O(∣Σ∣) | Each element enters and leaves L once; state is bounded by distinct values |
| Minimum window | O(n + ∣t∣) | O(∣Σ∣) | Same amortized argument; need-map is O(∣t∣) |
| Window max (monotonic deque) | O(n) | O(k) | Each element pushed/popped once from deque |

**Amortized argument:** `L` and `R` each traverse the array at most once. Even though the inner `while` loop runs multiple times, across the entire outer loop each element is added to state exactly once and removed at most once → total state operations = O(n).

---

## Constraints & approach

| Input size | Keyword | Expected complexity | Reach for |
|---|---|---|---|
| n ≤ 10⁵ | "contiguous subarray/substring", "at most K", "window of size K" | O(n) | Sliding window |
| n ≤ 10⁵ | "all pairs", "two elements" (not contiguous) | O(n) | Two pointers (not window) |
| n ≤ 10⁵ | "any subarray sum = K" (exact, not bounded) | O(n) | Prefix sum + hash map |
| n ≤ 10³ | No contiguous constraint, overlapping subproblems | O(n²) or O(n³) | DP |
| n ≤ 10⁵, values ≤ 10⁶ | "window maximum/minimum" | O(n) | Sliding window + monotonic deque |
| n ≤ 10⁵ | "at most K" decomposable | O(n) | atMost(K) − atMost(K−1) trick |

**The key constraint signal:** *"contiguous"* + *"optimize a metric over sub-ranges"* + *"constraint has a monotonic relationship with window growth"* = sliding window, not O(n²) brute force.

---

## Variations

| Variant | Shape | Example |
|---|---|---|
| Fixed-size | Window size K fixed throughout | Max sum of K consecutive elements |
| Variable-size (maximize) | Expand until violation, shrink to restore | Longest substring with at most K distinct chars |
| Variable-size (minimize) | Shrink aggressively once valid | Minimum window substring |
| Exactly-K decomposition | `f(exactly K) = f(atMost K) − f(atMost K−1)` | Subarrays with exactly K distinct integers (LC 992) |
| Multi-source / permutation | Fixed window over character frequencies | Find all anagrams of P in S (LC 438) |

The **exactly-K trick** is the non-obvious one: if `atMost(K)` is easy to compute with a sliding window, then `exactly(K) = atMost(K) − atMost(K−1)`. This transforms an "exact" constraint (hard to handle with a single window) into two "at most" windows.

---

## CP-primitives

### 1. Monotonic deque for window max/min

**The problem:** find the maximum in every window of size K naively → O(nk). With a sliding window that queries `max(window)` via a heap → O(n log k). With a monotonic deque → **O(n)**.

**The trick:** maintain a deque of indices in decreasing order of value. When the window slides:
- Pop from the back any index whose value is ≤ new element (they can never be the max).
- Pop from the front any index that has left the window (`i - deque[0] >= k`).
- Front of deque = index of current window max.

Each index is pushed and popped at most once → O(n) total.

```python
from collections import deque

def sliding_window_max(nums: list[int], k: int) -> list[int]:
    dq: deque[int] = deque()   # stores indices, values decreasing
    result: list[int] = []
    for i, val in enumerate(nums):
        while dq and nums[dq[-1]] <= val:
            dq.pop()                    # smaller values can never be max
        dq.append(i)
        if dq[0] == i - k:
            dq.popleft()                # front has left the window
        if i >= k - 1:
            result.append(nums[dq[0]])
    return result
```

**Why for CP:** collapses window-max from O(k) per step to O(1) amortized - critical when n=10⁵ and k=10⁴ would make a naive approach TLE.

### 2. Frequency map / Counter for distribution matching

**The problem:** "does window contain all characters of pattern?" or "is window an anagram of P?"

**The trick:** maintain a frequency delta: `need[c]` = how many more of `c` the window needs. Track `have` = number of characters fully satisfied. When `have == len(need)`, the window is valid.

```python
from collections import Counter

def find_anagrams(s: str, p: str) -> list[int]:
    need = Counter(p)
    window: Counter[str] = Counter()
    have, required = 0, len(need)
    L = 0
    result: list[int] = []
    for R, c in enumerate(s):
        window[c] += 1
        if c in need and window[c] == need[c]:
            have += 1
        if R - L + 1 == len(p):
            if have == required:
                result.append(L)
            if s[L] in need and window[s[L]] == need[s[L]]:
                have -= 1
            window[s[L]] -= 1
            L += 1
    return result
```

**Why for CP:** O(1) validity check per step (just compare `have == required`) instead of comparing entire frequency maps - reduces constant factor dramatically for large alphabets.

### 3. atMost(K) decomposition

**Why for CP:** converts "exactly K" problems (where a single window can't maintain validity monotonically) into two "at most K" windows that CAN. One function, two calls, O(n) total. Used in LC 992 (Subarrays with K Different Integers), LC 930 (Binary Subarrays with Sum).

```python
def count_subarrays_with_exactly_k(nums: list[int], k: int) -> int:
    def at_most(limit: int) -> int:
        freq: defaultdict[int, int] = defaultdict(int)
        L = count = 0
        for R, val in enumerate(nums):
            freq[val] += 1
            while len(freq) > limit:
                freq[nums[L]] -= 1
                if freq[nums[L]] == 0:
                    del freq[nums[L]]
                L += 1
            count += R - L + 1   # all windows ending at R are valid
        return count
    return at_most(k) - at_most(k - 1)
```

---

## Worked problems

### 1. Maximum Sum Subarray of Size K

Given an integer array `nums` and integer `k`, find the maximum sum of any contiguous subarray of length exactly `k`. Constraints: `1 ≤ k ≤ n ≤ 10⁵`, values in `[-10⁴, 10⁴]`.

**Approach:** Fixed-size window. Compute the sum of the first `k` elements, then slide: subtract the element leaving the left, add the element entering the right. Track the running max. O(n) instead of O(nk) brute force.

```python
def max_sum_subarray(nums: list[int], k: int) -> int:
    window = sum(nums[:k])
    best = window
    for i in range(k, len(nums)):
        window += nums[i] - nums[i - k]
        best = max(best, window)
    return best
```

**Complexity:** O(n) time, O(1) space.

**Duplicate problems:**
- Maximum Average Subarray I (LC 643) - same fixed window, return average instead of sum.
- Subarray Product Less Than K (LC 713) - fixed window replaced with variable (product constraint); count valid windows.

---

### 2. Longest Substring Without Repeating Characters (LC 3)

Given a string `s`, find the length of the longest substring without repeating characters. Constraints: `0 ≤ n ≤ 5×10⁴`, any ASCII characters.

**Approach:** Variable-size window. Maintain a set of characters in `[L, R]`. Expand `R`; when `s[R]` already in set (violation), advance `L` until the duplicate is removed. The window is always duplicate-free. This is O(n) because `L` only moves right.

```python
def length_of_longest_substring(s: str) -> int:
    seen: set[str] = set()
    L = best = 0
    for R, c in enumerate(s):
        while c in seen:
            seen.discard(s[L])
            L += 1
        seen.add(c)
        best = max(best, R - L + 1)
    return best
```

**Complexity:** O(n) time, O(min(n, ∣Σ∣)) space.

**Duplicate problems:**
- Longest Substring with At Most Two Distinct Characters (LC 159) - same pattern, `len(freq) > 2` is the violation.
- Longest Substring with At Most K Distinct Characters (LC 340) - generalize to K.

---

### 3. Minimum Window Substring (LC 76)

Given strings `s` and `t`, find the minimum window in `s` that contains every character of `t` (including duplicates). If none exists, return `""`. Constraints: `1 ≤ len(s), len(t) ≤ 10⁵`.

**Approach:** Minimum-window template. Track `need[c]` (how many of each `t` character we still need) and `have` (count of fully satisfied characters). Expand `R` to grow the window; once `have == required`, try to shrink `L` to minimize length. Every time we shrink, check if a character drops below its needed count (decrement `have`).

```python
from collections import defaultdict

def min_window(s: str, t: str) -> str:
    need: defaultdict[str, int] = defaultdict(int)
    for c in t:
        need[c] += 1
    have, required = 0, len(need)
    window: defaultdict[str, int] = defaultdict(int)
    best_len, best_L = float("inf"), 0
    L = 0
    for R, c in enumerate(s):
        window[c] += 1
        if c in need and window[c] == need[c]:
            have += 1
        while have == required:
            if R - L + 1 < best_len:
                best_len, best_L = R - L + 1, L
            window[s[L]] -= 1
            if s[L] in need and window[s[L]] < need[s[L]]:
                have -= 1
            L += 1
    return s[best_L : best_L + best_len] if best_len != float("inf") else ""
```

**Complexity:** O(n + ∣t∣) time, O(∣Σ∣) space.

**Duplicate problems:**
- Smallest Range Covering Elements from K Lists (LC 632) - same shrink-when-valid logic, more complex state.
- Substring with Concatenation of All Words (LC 30) - fixed-word-length windows instead of character windows.

---

### 4. Longest Substring with At Most K Distinct Characters (LC 340)

Given string `s` and integer `k`, return the length of the longest substring with at most `k` distinct characters. Constraints: `1 ≤ k ≤ 10⁵`, `1 ≤ n ≤ 5×10⁴`.

**Approach:** Variable-size window with a frequency map. Violation = `len(freq) > k`. On violation, shrink `L`: decrement `freq[s[L]]`, delete key if zero, advance `L`. Window length after shrink is `R - L + 1`.

```python
from collections import defaultdict

def length_of_longest_substring_k_distinct(s: str, k: int) -> int:
    freq: defaultdict[str, int] = defaultdict(int)
    L = best = 0
    for R, c in enumerate(s):
        freq[c] += 1
        while len(freq) > k:
            freq[s[L]] -= 1
            if freq[s[L]] == 0:
                del freq[s[L]]
            L += 1
        best = max(best, R - L + 1)
    return best
```

**Complexity:** O(n) time, O(k) space.

**Duplicate problems:**
- Fruit Into Baskets (LC 904) - identical: at most 2 distinct "types" (k=2), different framing.
- Max Consecutive Ones III (LC 1004) - at most K zeros allowed; same window violation structure.

---

### 5. Sliding Window Maximum (LC 239)

Given array `nums` and integer `k`, return an array of the maximum value in every contiguous window of size `k`. Constraints: `1 ≤ k ≤ n ≤ 10⁵`, values in `[-10⁴, 10⁴]`.

**Approach:** Monotonic deque (CP-primitive). Maintain a deque of indices in decreasing order of value. For each new element, pop smaller elements from the back (they can never be the max in any future window). Pop the front if it's outside the window. Front = current max. Each element is pushed and popped at most once → O(n).

```python
from collections import deque

def max_sliding_window(nums: list[int], k: int) -> list[int]:
    dq: deque[int] = deque()
    result: list[int] = []
    for i, val in enumerate(nums):
        while dq and nums[dq[-1]] <= val:
            dq.pop()
        dq.append(i)
        if dq[0] == i - k:
            dq.popleft()
        if i >= k - 1:
            result.append(nums[dq[0]])
    return result
```

**Complexity:** O(n) time, O(k) space.

**Duplicate problems:**
- Jump Game VI (LC 1696) - DP + monotonic deque for max in a window of size k.
- Constrained Subsequence Sum (LC 1425) - same deque trick, different DP formulation.

---

## Pitfalls

1. **Treating variable-size as fixed-size.** Not shrinking `L` at all - just advancing `R`. Produces wrong answers on violation cases and may not terminate correctly.

2. **Off-by-one on window size check.** In fixed windows: `window_size = R - L + 1`, not `R - L`. Forgetting the `+1` causes a window one element too small throughout.

3. **Using sliding window when elements aren't contiguous.** If the problem allows skipping elements or selecting non-adjacent ones (e.g. "pick any k elements from the array"), there is no contiguous window - reach for sorting, heap, or DP instead.

4. **Missing the exactly-K trap.** "Exactly K distinct" cannot be directly windowed because the window can't maintain a simple monotonic valid/invalid boundary. Apply `atMost(K) − atMost(K−1)`.

5. **Shrinking past the violation.** In minimum-window, stopping the shrink loop too early (e.g., `while have == required: L += 1` without checking) misses the optimal left boundary. Always record best *before* shrinking.

---

## First 30 seconds

*"Sliding window - contiguous sub-range, two pointers. Expand R one step at a time; shrink L whenever the window violates the constraint. Maintain the aggregate state (sum, frequency map) incrementally. O(n) because each element enters and leaves at most once."*

Then clarify: fixed size K (simpler) or variable size (need a constraint to drive shrinking)?

---

## Related

- [Two Pointers](./two-pointers.md) - parent pattern; sliding window is two-pointers with window semantics
- [Prefix Sum](./prefix-sum.md) - alternative for arbitrary range queries without a constraint to drive shrinking
- [Monotonic Stack](./monotonic-stack.md) - next-greater-element sibling; monotonic deque is the window-max version
- [Deque](../data-structures/deque.md) - the data structure powering the monotonic deque CP-primitive
- [Hash Table](../data-structures/hash-table.md) - frequency maps for character/value distribution in variable windows
- [Fast & Slow Pointers](./fast-slow-pointers.md) - different two-pointer variant (cycle detection, not window)

---

## Practice problems

### 1. Longest Substring Without Repeating Characters (LC 3)

Array of ASCII characters. Find the length of the longest substring (contiguous) with no repeated characters. Constraints: `0 ≤ n ≤ 5×10⁴`.

**Approach:** Variable-size window with a `set`. Expand R; when `s[R]` already in set, advance L removing characters until the duplicate is gone. Window is always duplicate-free. Classic variable-window with O(1) per step.

```python
def length_of_longest_substring(s: str) -> int:
    seen: set[str] = set()
    L = best = 0
    for R, c in enumerate(s):
        while c in seen:
            seen.discard(s[L])
            L += 1
        seen.add(c)
        best = max(best, R - L + 1)
    return best
```

**Complexity:** O(n) time, O(min(n, ∣Σ∣)) space.

**Duplicate problems:**
- Longest Substring with At Most Two Distinct Characters (LC 159) - change set to frequency map, `len(freq) > 2` as violation.
- Longest Repeating Character Replacement (LC 424) - count max-frequency char in window; violation when `window_len − max_freq > k`.

---

### 2. Minimum Window Substring (LC 76)

String `s` and string `t`. Find the minimum-length substring of `s` containing all characters of `t`. Return `""` if none. Constraints: `1 ≤ n, m ≤ 10⁵`.

**Approach:** Minimum-window template. `need` map for `t`, `have` counter. Expand R; once `have == required`, record window length then shrink L to find tighter bounds. Shrink loop stops when `have < required`.

```python
from collections import defaultdict

def min_window(s: str, t: str) -> str:
    need: defaultdict[str, int] = defaultdict(int)
    for c in t:
        need[c] += 1
    have, required = 0, len(need)
    window: defaultdict[str, int] = defaultdict(int)
    best_len, best_L = float("inf"), 0
    L = 0
    for R, c in enumerate(s):
        window[c] += 1
        if c in need and window[c] == need[c]:
            have += 1
        while have == required:
            if R - L + 1 < best_len:
                best_len, best_L = R - L + 1, L
            window[s[L]] -= 1
            if s[L] in need and window[s[L]] < need[s[L]]:
                have -= 1
            L += 1
    return s[best_L : best_L + best_len] if best_len != float("inf") else ""
```

**Complexity:** O(n + m) time, O(∣Σ∣) space.

**Duplicate problems:**
- Smallest Range Covering Elements from K Lists (LC 632) - generalized minimum-window with multi-list state.

---

### 3. Subarrays with K Different Integers (LC 992)

Integer array `nums` with values in `[1, n]`. Count subarrays with exactly `k` distinct integers. Constraints: `1 ≤ k ≤ n ≤ 2×10⁴`.

**Approach:** Direct sliding window can't handle "exactly K" because validity isn't monotonic. Apply `atMost(K) − atMost(K−1)`. `atMost(limit)` counts subarrays with ≤ limit distinct values using a standard variable window; for each R, every window `[L..R]`, `[L+1..R]`, …, `[R..R]` is valid → add `R − L + 1`.

```python
from collections import defaultdict

def subarrays_with_k_distinct(nums: list[int], k: int) -> int:
    def at_most(limit: int) -> int:
        freq: defaultdict[int, int] = defaultdict(int)
        L = count = 0
        for R, val in enumerate(nums):
            freq[val] += 1
            while len(freq) > limit:
                freq[nums[L]] -= 1
                if freq[nums[L]] == 0:
                    del freq[nums[L]]
                L += 1
            count += R - L + 1
        return count
    return at_most(k) - at_most(k - 1)
```

**Complexity:** O(n) time, O(k) space.

**Duplicate problems:**
- Binary Subarrays With Sum (LC 930) - `atMost(goal) − atMost(goal−1)` on 0/1 arrays; identical decomposition.
- Count Number of Nice Subarrays (LC 1248) - same trick on odd-count constraint.
