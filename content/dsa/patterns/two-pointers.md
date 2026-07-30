# Two Pointers

## Prerequisites

- [Array](../data-structures/array.md) [Must read]
- [Sorting](../algorithms/sorting.md) [Must read]
- [Linked List](../data-structures/linked-list.md) [Must read]

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

**Two pointers** places two indices into a sequence and moves them - toward each other, in the same direction, or at different speeds - so that the pair collectively narrows toward a target condition in O(n) instead of examining all O(n²) pairs.

**Mental model:** two fingers on a number line. One on the left, one on the right. You move whichever finger doesn't help the current state. When they meet, you've seen every candidate without redundancy.

> **Interview soundbite:** "Two pointers - place L and R, move whichever finger brings you closer to the target; O(n) because each pointer traverses the array at most once."

---

## Recognition signals

### (a) Trigger phrases

- *"find a pair that sums to target"* / *"two numbers that add up to…"*
- *"remove duplicates in-place"* / *"remove all occurrences of val"*
- *"container with most water"* / *"maximize the area"*
- *"is this string/array a palindrome?"*
- *"partition the array"* / *"move zeros to end"*
- *"3Sum"* / *"find all triplets that sum to zero"*
- *"trapping rain water"*

### (b) Structural cues

- Input is a **sorted array** (or can be sorted without violating the problem) - the sorted order creates the monotonic property that makes pointer movement correct.
- You need O(n) over a brute-force O(n²) pass over all pairs.
- The problem has a **convergence property**: moving one pointer in a direction strictly brings you closer to the target (or rules out a range of candidates).
- Output is a pair, triplet, or a transformed version of the array - **not** a count of all valid sub-ranges (that's prefix sum or sliding window).

### (c) Not to be confused with

| Pattern | Distinction |
|---|---|
| **Sliding Window** | Sliding window IS two-pointers, but the gap between L and R has semantic meaning - every element in `[L, R]` contributes to a maintained aggregate (sum, frequency map). Pure two-pointer converges toward a condition without maintaining a running state over the gap. If you don't need to know what's *between* the pointers, it's two-pointers; if you do, it's sliding window. |
| **Fast & Slow Pointers** | Same-direction two-pointer variant, but operates on linked lists and uses speed difference (2× vs 1×) for cycle detection. Two-pointers operates on arrays and uses position convergence. |
| **Binary Search** | Also narrows a range on a sorted array, but by halving - O(log n) per query. Two-pointers scans - O(n) total. Use binary search when you need a single lookup; two-pointers when you need to process all pairs. |

---

## How it works

### Variant 1: Opposite-ends convergence

Place `L = 0`, `R = n-1`. Move whichever pointer is "worse" inward. Terminates when `L ≥ R`.

**Example - pair summing to a target, sorted array `[1, 3, 5, 7, 9]`, target = 10:**

```
[1,  3,  5,  7,  9]
 L               R    sum = 1+9 = 10  ✓  found
```

**Example - maximize `min(a,b) * width` over a height array `[1, 8, 6, 2, 5, 4, 8, 3, 7]`:**

```
[1,  8,  6,  2,  5,  4,  8,  3,  7]
 L                               R    area = min(1,7)*8 = 8
                                      move L (height[L] < height[R])
[1,  8,  6,  2,  5,  4,  8,  3,  7]
     L                           R    area = min(8,7)*7 = 49  ← best
                                      move R (height[R] < height[L])
     ...continuing...
```

**Greedy argument:** when `height[L] < height[R]`, moving `R` inward can only decrease width while height is bounded by `height[L]` (the shorter wall). No future `R` position can improve on moving `L`. So always move the shorter wall.

### Variant 2: Same-direction (slow/fast write-head)

`L` = write head (next position to fill), `R` = read head (current element to evaluate). `R` scans every element; `L` advances only when it writes.

**Example - compact array keeping only unique adjacent runs, `[0, 0, 1, 1, 1, 2, 2, 3, 3, 4]`:**

```
[0, 0, 1, 1, 1, 2, 2, 3, 3, 4]
 L  R                            nums[R]=0 == nums[L-1]? (L=0, no prev) → write, L=1
 L     R                         nums[R]=0 == nums[L-1]=0? yes → skip
 L        R                      nums[R]=1 != nums[0]=0 → write at L=1, L=2
    L        R                   nums[R]=1 == nums[L-1]=1? yes → skip
    ...
Result: [0, 1, 2, 3, 4, ...]  first L elements are the answer
```

---

## Complexity

| Variant | Time | Space | Notes |
|---|---|---|---|
| Opposite-ends convergence | O(n) | O(1) | Each pointer moves at most n steps total |
| Same-direction write-head | O(n) | O(1) | R scans once, L writes ≤ n times |
| Three-way partition | O(n) | O(1) | Each element classified once |
| kSum (fix outer, two-pointer inner) | O(nᵏ⁻¹) | O(1) extra | 3Sum = O(n²), 4Sum = O(n³) |

**Why O(1) space is the defining property:** two pointers never need an auxiliary array or map. This is the single biggest advantage over hash-map approaches (which are also O(n) time but O(n) space) - at n = 10⁹ in a memory-constrained environment, O(1) space is the deciding factor.

---

## Constraints & approach

| Input size | Keywords | Reach for | Don't reach for |
|---|---|---|---|
| n ≤ 10⁶, sorted | "find a pair", "palindrome check", "partition" | Two pointers O(n) | Hash map O(n) space |
| n ≤ 10⁶, unsorted | "find a pair with sum target" | Sort first O(n log n), then two-pointer | Two-pointer on unsorted (wrong) |
| n ≤ 10⁴, unsorted, all pairs | "count pairs satisfying" | Hash map O(n) | Sorting (order may matter) |
| n ≤ 10⁵, "contiguous subarray" | "longest/shortest/max/min window" | Sliding window (not two-pointer) | - |
| n ≤ 10² (3Sum, 4Sum) | "find all triplets/quadruplets" | Fix outer pointer(s) + two-pointer | Backtracking O(n³)+ |
| n = 10⁹ | Any pair/partition | Two pointers (O(1) space, O(n) time) | Any O(n) space structure |

---

## Variations

| Variant | Shape | Canonical example |
|---|---|---|
| Opposite-ends inward sweep | `L→, ←R` until they cross | Two Sum II, Container With Most Water |
| Palindrome check | Compare `s[L]` and `s[R]`, move both inward | Valid Palindrome (LC 125) |
| Same-direction write-head | `L` writes, `R` scans | Remove Duplicates (LC 26), Move Zeros (LC 283) |
| Three-way partition | `lo / mid / hi` three pointers | Sort Colors (LC 75), Dutch National Flag |
| kSum (fix + recurse) | Fix k−2 outer pointers, two-pointer the last two | 3Sum (LC 15), 4Sum (LC 18) |
| Merge of two sorted arrays | One pointer per array, merge into third | Merge Sorted Array (LC 88) |
| Two pointers on two arrays | "closest pair across arrays" | Closest pair from two sorted arrays |

---

## CP-primitives

### 1. Meet in the middle (two-pointer on two sorted halves)

**The problem:** subset-sum with n ≤ 40 - brute force is O(2ⁿ), too slow. Split into two halves of size n/2. Enumerate all 2^(n/2) ≈ 2²⁰ ≈ 10⁶ subset sums for each half. Sort one list, two-pointer the other to find pairs summing to target.

```python
def meet_in_middle(nums: list[int], target: int) -> bool:
    n = len(nums)
    half = n // 2
    def all_sums(arr: list[int]) -> list[int]:
        sums = [0]
        for x in arr:
            sums += [s + x for s in sums]
        return sums
    left = sorted(all_sums(nums[:half]))
    right = sorted(all_sums(nums[half:]))
    L, R = 0, len(right) - 1
    while L < len(left) and R >= 0:
        s = left[L] + right[R]
        if s == target:
            return True
        elif s < target:
            L += 1
        else:
            R -= 1
    return False
```

**Why for CP:** reduces O(2ⁿ) to O(2^(n/2) · log(2^(n/2))) = O(n · 2^(n/2)) - makes n=40 feasible where n=50 is not.

### 2. Three-pointer / kSum generalization

**The problem:** find all unique triplets (or quadruplets) summing to a target without duplicates.

**The trick:** sort the array. Fix the outermost k−2 pointers with a nested for loop (skipping duplicates). Two-pointer the remaining two positions. Duplicate skipping: after recording a valid pair, advance past any equal elements on both ends.

```python
def four_sum(nums: list[int], target: int) -> list[list[int]]:
    nums.sort()
    n, result = len(nums), []
    for i in range(n - 3):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        for j in range(i + 1, n - 2):
            if j > i + 1 and nums[j] == nums[j - 1]:
                continue
            L, R = j + 1, n - 1
            while L < R:
                s = nums[i] + nums[j] + nums[L] + nums[R]
                if s == target:
                    result.append([nums[i], nums[j], nums[L], nums[R]])
                    while L < R and nums[L] == nums[L + 1]: L += 1
                    while L < R and nums[R] == nums[R - 1]: R -= 1
                    L += 1; R -= 1
                elif s < target:
                    L += 1
                else:
                    R -= 1
    return result
```

**Why for CP:** O(nᵏ⁻¹) vs O(nᵏ) brute force. For 3Sum: O(n²) vs O(n³). Each fixed pointer loop is one factor of n; two-pointer replaces the innermost loop.

---

## Pitfalls

1. **Applying to unsorted input.** The opposite-ends pointer movement is only correct when the array is sorted - the monotonic property ("moving L right increases the sum") only holds in sorted order. On unsorted input, the result is wrong with no error. Sort first if needed.

2. **Missing duplicate-skip logic in kSum.** After recording a valid triplet/quadruplet in 3Sum/4Sum, failing to skip equal elements for both L and R produces duplicate results. This is the most common reason a "correct" 3Sum implementation gets WA on `[-2, 0, 0, 2, 2]`.

3. **Off-by-one in write-head.** In the same-direction variant, starting `L = 0` instead of `L = 1` (when the first element is always kept) and comparing `nums[R] != nums[L]` instead of `nums[R] != nums[L-1]` causes the first unique element to be written twice.

4. **Wrong pointer to move.** In the opposite-ends variant, when `sum < target` you must move `L` right (not `R` left). Moving the wrong pointer is a logic error that passes small test cases but fails when both pointers are near their bounds.

5. **Pointer order inversion.** Forgetting `while L < R` (not `<=`) in the termination condition causes processing the same element twice when L and R converge on the same index - especially critical when elements include the search target itself.

---

## First 30 seconds

*"Two pointers - sorted array, place L and R at opposite ends, move the one that can't possibly yield a better answer. O(n) because each pointer moves at most n steps. If it's 3Sum, sort first, fix one pointer, two-pointer the rest - O(n²)."*

Then clarify: is the array sorted? Is it pair-finding (opposite-ends) or in-place rewriting (same-direction)?

---

## Related

- [Sliding Window](./sliding-window.md) - two-pointer specialization where the gap `[L, R]` has window semantics with an aggregate
- [Fast & Slow Pointers](./fast-slow-pointers.md) - same-direction variant for cycle detection on linked lists
- [Binary Search on Answer](./binary-search-on-answer.md) - also narrows a range, but by halving rather than scanning
- [Sorting](../algorithms/sorting.md) - prerequisite for opposite-ends two-pointer; the sorted order is what makes convergence correct
- [Prefix Sum](./prefix-sum.md) - alternative for pair counting problems where you need O(n) without sorting
- [Merge Intervals](./merge-intervals.md) - uses a single scan with implicit pointer, related sweep idea

---

## Practice problems

### 1. Two Sum II - Input Array Is Sorted (LC 167)

1-indexed sorted array `numbers`. Find two numbers summing to `target` and return their indices. Constraints: `2 ≤ n ≤ 3×10⁴`, `−10³ ≤ numbers[i] ≤ 10³`, exactly one solution.

**Worked examples:**
- **Example 1**
  - **Input:** numbers = [2, 7, 11, 15], target = 9 | **Output:** [1, 2]
  - **Explanation:** numbers[0] + numbers[1] = 2 + 7 = 9, returned as 1-indexed.
- **Example 2**
  - **Input:** numbers = [2, 3, 4], target = 6 | **Output:** [1, 3]
  - **Explanation:** numbers[0] + numbers[2] = 2 + 4 = 6.

**Constraints:** `2 ≤ n ≤ 3×10⁴`, `−10³ ≤ numbers[i] ≤ 10³`, `numbers` sorted ascending, exactly one solution guaranteed.

**Approach:** Classic opposite-ends. If `numbers[L] + numbers[R] < target`, the sum is too small - only way to increase is move `L` right (array is sorted). If too large, move `R` left. Correctness rests entirely on the sorted order: no pointer movement discards a valid pair.

```python
def two_sum_sorted(numbers: list[int], target: int) -> list[int]:
    L, R = 0, len(numbers) - 1
    while L < R:
        s = numbers[L] + numbers[R]
        if s == target:
            return [L + 1, R + 1]
        elif s < target:
            L += 1
        else:
            R -= 1
    return []
```

**Complexity:** O(n) time, O(1) space.

**Duplicate problems:**
- Two Sum IV - Input is a BST (LC 653) - same logic; in-order traversal gives a sorted array, then two-pointer.
- Sum of Square Numbers (LC 633) - two-pointer over `[0, isqrt(c)]`; `a² + b² = c`.

---

### 2. Trapping Rain Water (LC 42)

Given array `height` representing an elevation map, compute how much water it can trap after raining. Constraints: `1 ≤ n ≤ 2×10⁴`, `0 ≤ height[i] ≤ 10⁵`.

**Worked examples:**
- **Example 1**
  - **Input:** height = [0,1,0,2,1,0,1,3,2,1,2,1] | **Output:** 6
  - **Explanation:** water pools above the lower bars wherever both sides have a taller wall; total trapped volume is 6 units.
- **Example 2**
  - **Input:** height = [4,2,0,3,2,5] | **Output:** 9

**Constraints:** `1 ≤ n ≤ 2×10⁴`, `0 ≤ height[i] ≤ 10⁵`.

**Approach:** Two-pointer tracking running max from each side. Water at position `i` = `min(max_left[i], max_right[i]) − height[i]`. Instead of precomputing both arrays, use L/R pointers: if `max_left < max_right`, the water at L is determined by `max_left` (the left side is the bottleneck) - accumulate and advance L. Otherwise accumulate from R and advance R. No extra O(n) arrays needed.

```python
def trap(height: list[int]) -> int:
    L, R = 0, len(height) - 1
    max_left = max_right = 0
    water = 0
    while L < R:
        if height[L] <= height[R]:
            if height[L] >= max_left:
                max_left = height[L]
            else:
                water += max_left - height[L]
            L += 1
        else:
            if height[R] >= max_right:
                max_right = height[R]
            else:
                water += max_right - height[R]
            R -= 1
    return water
```

**Complexity:** O(n) time, O(1) space (vs O(n) for the two-array prefix-max approach).

**Duplicate problems:**
- Container With Most Water (LC 11) - same opposite-ends greedy shape, simpler objective (`min(a,b) * width`, no accumulation).

---

### 3. Remove Duplicates from Sorted Array (LC 26)

Given sorted array `nums` in-place, remove duplicates so each unique element appears once. Return the count of unique elements. Constraints: `1 ≤ n ≤ 3×10⁴`.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [1,1,2] | **Output:** 2, nums = [1,2,...]
  - **Explanation:** first two unique values written to the front; return count 2.
- **Example 2**
  - **Input:** nums = [0,0,1,1,1,2,2,3,3,4] | **Output:** 5, nums = [0,1,2,3,4,...]

**Constraints:** `1 ≤ n ≤ 3×10⁴`, `−10⁴ ≤ nums[i] ≤ 10⁴`, `nums` sorted ascending.

**Approach:** Same-direction write-head. `L` is the write position (next slot for a unique element). `R` scans. When `nums[R] != nums[L-1]` (new unique), write it at `L` and advance `L`. Elements at `[L:]` don't need to be cleared - the return value `L` tells the caller how many are valid.

```python
def remove_duplicates(nums: list[int]) -> int:
    if not nums:
        return 0
    L = 1
    for R in range(1, len(nums)):
        if nums[R] != nums[L - 1]:
            nums[L] = nums[R]
            L += 1
    return L
```

**Complexity:** O(n) time, O(1) space.

**Duplicate problems:**
- Remove Duplicates from Sorted Array II (LC 80) - allow at most 2 copies; change condition to `nums[R] != nums[L-2]`.
- Move Zeroes (LC 283) - same write-head, keep predicate = non-zero, then fill tail with zeros.
- Remove Element (LC 27) - same write-head, keep predicate = `nums[R] != val`.

---

### 4. 3Sum (LC 15)

Given integer array `nums`, find all unique triplets `[nums[i], nums[j], nums[k]]` such that `i ≠ j ≠ k` and `nums[i] + nums[j] + nums[k] = 0`. Constraints: `3 ≤ n ≤ 3×10³`.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [-1,0,1,2,-1,-4] | **Output:** [[-1,-1,2],[-1,0,1]]
  - **Explanation:** after sorting, fixing each `i` and two-pointering the rest finds both triplets summing to 0, duplicates skipped.
- **Example 2**
  - **Input:** nums = [0,1,1] | **Output:** []
  - **Explanation:** no triplet sums to 0.

**Constraints:** `3 ≤ n ≤ 3×10³`, `−10⁵ ≤ nums[i] ≤ 10⁵`.

**Approach:** Sort. Iterate `i` over the array (the fixed pointer). For each `i`, two-pointer `L = i+1` and `R = n-1` looking for a pair summing to `-nums[i]`. Skip duplicate values of `i` (outer loop), and skip duplicate values of `L` and `R` after recording a result (inner loop). The duplicate-skip logic is the trap most candidates miss.

```python
def three_sum(nums: list[int]) -> list[list[int]]:
    nums.sort()
    result: list[list[int]] = []
    for i, val in enumerate(nums):
        if i > 0 and val == nums[i - 1]:
            continue
        L, R = i + 1, len(nums) - 1
        while L < R:
            s = val + nums[L] + nums[R]
            if s == 0:
                result.append([val, nums[L], nums[R]])
                while L < R and nums[L] == nums[L + 1]:
                    L += 1
                while L < R and nums[R] == nums[R - 1]:
                    R -= 1
                L += 1
                R -= 1
            elif s < 0:
                L += 1
            else:
                R -= 1
    return result
```

**Complexity:** O(n²) time, O(1) extra space (sort is in-place).

**Duplicate problems:**
- 4Sum (LC 18) - add one more outer fixed pointer; O(n³).
- 3Sum Closest (LC 16) - track closest sum instead of exact zero.

---

### 5. Valid Palindrome (LC 125)

Given string `s` with alphanumeric characters and spaces/punctuation, determine if it reads the same forwards and backwards ignoring case and non-alphanumeric characters. Constraints: `1 ≤ n ≤ 2×10⁵`.

**Worked examples:**
- **Example 1**
  - **Input:** s = "A man, a plan, a canal: Panama" | **Output:** true
  - **Explanation:** ignoring case/punctuation, "amanaplanacanalpanama" reads the same both ways.
- **Example 2**
  - **Input:** s = "race a car" | **Output:** false

**Constraints:** `1 ≤ n ≤ 2×10⁵`, `s` consists of printable ASCII characters.

**Approach:** Opposite-ends. Advance L past non-alphanumeric, retreat R past non-alphanumeric, compare lowercased characters. If mismatch → not palindrome. If L ≥ R → palindrome.

```python
def is_palindrome(s: str) -> bool:
    L, R = 0, len(s) - 1
    while L < R:
        while L < R and not s[L].isalnum():
            L += 1
        while L < R and not s[R].isalnum():
            R -= 1
        if s[L].lower() != s[R].lower():
            return False
        L += 1
        R -= 1
    return True
```

**Complexity:** O(n) time, O(1) space.

**Duplicate problems:**
- Valid Palindrome II (LC 680) - allow one deletion; try skipping L or R on mismatch, check remainder.
- Longest Palindromic Substring (LC 5) - expand-around-center variant, not convergence.
