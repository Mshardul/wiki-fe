# Modified Binary Search

## Prerequisites

- [Binary Search](../algorithms/binary-search.md) [Must read] - modified binary search is vanilla binary search applied to a broken or transformed search space; understanding the invariant `lo` ≤ answer ≤ `hi` and the `lo = mid+1` / `hi = mid` mechanics is required before layering a twist on top.
- [Array](../data-structures/array.md) [Must read] - all variants operate on arrays or array-backed structures; understanding indexing and in-place layout matters for the rotated-array and peak-finding cases.

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

**Modified binary search** is the family of problems where you apply the binary-search halving strategy to a search space that is not a plain sorted array - it may be rotated, have a peak, contain duplicates, or be an implicit space of indices or values - by identifying which half still satisfies the problem's monotonic property and discarding the other.

**Mental model:** Binary search needs one thing: a way to look at `mid` and decide "the answer is to the left" or "the answer is to the right." Classic binary search gets that from sorted order. Modified binary search finds a *different* monotonic signal - sorted vs unsorted half in a rotated array, rising vs falling side of a peak, presence vs absence of a target in a bitonic sequence - and uses that signal to halve the space exactly the same way.

> **Interview soundbite:** "Modified binary search - same halving as classic, different signal at `mid`. Identify which half is 'structured' (sorted, rising, below peak) and use that to decide which side the answer lives on."

## Recognition signals

**(a) Trigger phrases** - literal problem-statement snippets:

- "array was sorted and then rotated at an unknown pivot"
- "find the peak element where `nums[i] > nums[i-1]` and `nums[i] > nums[i+1]`"
- "find the minimum in a rotated sorted array"
- "find the first or last position of a target in a sorted array"
- "find the bitonic point / mountain array peak"
- "search in a nearly sorted array" / "element may be shifted by one position"

**(b) Structural cues** - input shape + output property:

- Input is an array that *was* sorted but has been transformed (rotated, peaked, or has duplicates inserted).
- The array is not globally sorted, but every half produced by a mid-split is at least partially structured (one half is always fully sorted in a singly-rotated array; one side always rises in a peak problem).
- Output is a single index or value, not a count or sum - binary search terminates on one answer.
- `n` is large enough that O(n) linear scan is mentioned as too slow, inviting O(log n).

**(c) Not to be confused with:**

- **Binary search on answer** ([binary-search-on-answer.md](./binary-search-on-answer.md)) - you binary-search the *value space* (e.g. "minimize the maximum distance") with a feasibility check; here you binary-search the *index space* of a transformed array. The array in binary-search-on-answer can be entirely implicit; in modified binary search the array is always given explicitly.
- **Classic binary search** - operates on a globally sorted array with a direct `arr[mid] == target` check; modified binary search has no global sort, so you need the extra "which half is structured?" test before deciding where to recurse.
- **Two Pointers** ([two-pointers.md](./two-pointers.md)) - two pointers walk from opposite ends toward the middle; modified binary search always jumps to the midpoint and discards half. If the problem needs a pair of elements (sum = target), two pointers; if it needs a single index in a transformed array, modified binary search.

## How it works

The core loop is identical to vanilla binary search - maintain `lo`, `hi`, compute `mid = lo + (hi - lo) // 2`, and shrink the window by moving either `lo = mid + 1` or `hi = mid`. The only difference is *how* you decide which side to shrink.

**Rotated sorted array - which half is sorted?**

At any `mid` in a singly-rotated array, exactly one of the two halves `[lo, mid]` or `[mid+1, hi]` is fully sorted (the pivot lies in the other half). Test: `if arr[lo] <= arr[mid]` → left half is sorted. Otherwise right half is sorted.

```
arr = [4, 5, 6, 7, 0, 1, 2],  target = 0

lo=0 hi=6  mid=3  arr[mid]=7
  arr[lo]=4 <= arr[mid]=7  →  left half [4,5,6,7] is sorted
  target=0 not in [4..7]  →  search right:  lo=4

lo=4 hi=6  mid=5  arr[mid]=1
  arr[lo]=0 <= arr[mid]=1  →  left half [0,1] is sorted
  target=0 in [0..1]  →  search left:  hi=5

lo=4 hi=5  mid=4  arr[mid]=0  ==  target  →  return 4
```

**Diagram - rotated array structure:**

```
index:  0   1   2   3   4   5   6
value:  4   5   6   7   0   1   2
        [   sorted half   ] [sorted]
                            ^pivot
At mid=3 (value 7): left [0..3] is sorted (4≤7), right [4..6] contains the pivot.
```

**Peak element - which side rises?**

A peak exists wherever `nums[mid] > nums[mid+1]`. If `nums[mid] < nums[mid+1]`, the peak is to the right. This is valid even without global sort because the guarantee is only that a local peak exists somewhere.

```
arr = [1, 2, 3, 1]

lo=0 hi=3  mid=1  arr[1]=2 < arr[2]=3  →  peak is right:  lo=2
lo=2 hi=3  mid=2  arr[2]=3 > arr[3]=1  →  peak is left (or here):  hi=2
lo==hi==2  →  peak at index 2
```

## Skeleton

**CLRS pseudocode - rotated sorted array search:**

```
SEARCH-ROTATED(A, lo, hi, target):
  while lo ≤ hi:
    mid ← lo + ⌊(hi - lo) / 2⌋
    if A[mid] == target:
      return mid
    if A[lo] ≤ A[mid]:                    ▷ left half is sorted
      if A[lo] ≤ target < A[mid]:
        hi ← mid - 1                      ▷ target in sorted left half
      else:
        lo ← mid + 1                      ▷ target in right (pivot) half
    else:                                 ▷ right half is sorted
      if A[mid] < target ≤ A[hi]:
        lo ← mid + 1                      ▷ target in sorted right half
      else:
        hi ← mid - 1                      ▷ target in left (pivot) half
  return -1
```

**Python template - generic modified binary search:**

```python
def modified_binary_search(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1

    while lo <= hi:
        mid = lo + (hi - lo) // 2

        if nums[mid] == target:
            return mid

        # Determine which half is structured, then check if target lives there.
        if nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1              # your logic here - target in left half

    return -1
```

**Python template - peak finding:**

```python
def find_peak(nums: list[int]) -> int:
    lo, hi = 0, len(nums) - 1

    while lo < hi:                         # loop until lo == hi == peak
        mid = lo + (hi - lo) // 2
        if nums[mid] < nums[mid + 1]:
            lo = mid + 1
        else:
            hi = mid
    return lo
```

**Python template - first/last position (bisect-style):**

```python
def search_range(nums: list[int], target: int) -> tuple[int, int]:
    # bisect_left: first index where nums[i] >= target
    lo, hi = 0, len(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    left = lo
    if left == len(nums) or nums[left] != target:
        return (-1, -1)
    # bisect_right: first index where nums[i] > target
    lo, hi = 0, len(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] <= target:
            lo = mid + 1
        else:
            hi = mid
    right = lo - 1
    return (left, right)
```

## Complexity

| Variant | Time | Space |
|---|---|---|
| Rotated array search | O(log n) | O(1) |
| Find peak element | O(log n) | O(1) |
| First/last position | O(log n) | O(1) |
| Search in bitonic array | O(log n) | O(1) |
| Rotated with duplicates | O(log n) avg, O(n) worst | O(1) |

All variants halve the search space each iteration → O(log n). Duplicates break the "one half is always sorted" guarantee when `arr[lo] == arr[mid] == arr[hi]`, forcing a linear scan of that ambiguous region - worst case degrades to O(n).

## Constraints & approach

| Input size | Notes | Reach for modified binary search? |
|---|---|---|
| n ≤ 10⁵, O(log n) asked | Target/peak in transformed array | **Yes** - canonical fit |
| n ≤ 10⁵, O(n) acceptable | Linear scan works | No - simpler, but binary search still valid |
| n ≤ 10⁹ (implicit array / value space) | e.g. "first bad version" | Yes - search index space |
| Array has many duplicates | Worst case O(n) | Use with caution - state the O(n) worst case explicitly |
| 2D matrix, row/col sorted | Each row sorted, first element > last of previous row | Yes - treat as flattened sorted array; `mid` → `(mid // cols, mid % cols)` |
| Unsorted, no structure | No monotonic predicate exists | No - binary search inapplicable; use linear scan or hash |

**When the constraint pushes you off:** if the problem says "find all occurrences" rather than "find one index," binary search finds bounds (first/last) but you still need O(k) to enumerate - consider whether a hash map is simpler. If duplicates are dense and the worst-case O(n) is unacceptable, a linear scan or a different structure (hash set) is safer.

**Real-world usage:** Elasticsearch uses binary search on sorted segment-level term dictionaries to locate postings lists in O(log n) per lookup - the same rotated/bounded search logic scaled to billions of documents. **At scale:** when the sorted structure spans multiple machines (distributed sorted index), a single binary search becomes a cascade of network round-trips - each halving step may hit a different shard. At that point, consistent hashing or a B-tree index (which amortizes depth) replaces pure binary search; the O(log n) bound holds per node but the constant grows with network latency.

## Variations

**1. Rotated sorted array with duplicates (LC 81)**
When `arr[lo] == arr[mid]`, you cannot determine which half is sorted. Shrink both ends: `lo += 1; hi -= 1`. Average O(log n), worst O(n).

**2. Find minimum in rotated sorted array (LC 153/154)**
No target - find the pivot. Left half sorted means minimum is `arr[lo]` only if `arr[lo] < arr[hi]` (no rotation in current window); otherwise recurse right.

**3. Bitonic / mountain array (LC 852)**
Find peak first (O(log n)), then binary search the ascending half for the target (if ascending), then binary search the descending half (reversed comparator). Total O(log n).

**4. Search in nearly sorted array**
Each element may be displaced by ±1 from its sorted position. Check `mid-1`, `mid`, `mid+1` at each step. Still O(log n) because you eliminate half each iteration.

**5. Find first/last position (LC 34)**
Two binary searches: one with `bisect_left` semantics (first index where `arr[i] >= target`), one with `bisect_right` semantics (first index where `arr[i] > target`, minus 1). Both O(log n).

**6. Search in 2D matrix (LC 74)**
Flatten the matrix conceptually: treat index `mid` as row `mid // cols`, col `mid % cols`. Single binary search over `rows * cols` elements, O(log(m·n)).

## CP-primitives

**1. `bisect` module as drop-in replacement (contest velocity)**

Python's `bisect.bisect_left` / `bisect_right` implement the first/last-position variants in one line - no loop, no off-by-one. In contests where the array is globally sorted, always reach for these first:

```python
import bisect
# First index of target (or insertion point):
idx = bisect.bisect_left(arr, target)
# Count of target occurrences:
count = bisect.bisect_right(arr, target) - bisect.bisect_left(arr, target)
```

Why for CP: saves ~10 lines of loop code; bisect is implemented in C and is faster than a Python loop; eliminates the most common off-by-one bugs under contest pressure.

**2. Exponential search (unbounded / infinite array)**

When the array is sorted but the right boundary is unknown (stream, infinite array), double `hi` until `arr[hi] >= target`, then binary search `[hi//2, hi]`. O(log n) total - the doubling phase is also O(log n) since it reaches n in log₂(n) steps.

```python
def exponential_search(arr: list[int], target: int) -> int:
    if arr[0] == target:
        return 0
    hi = 1
    while hi < len(arr) and arr[hi] < target:
        hi *= 2
    lo = hi // 2
    # standard binary search in [lo, min(hi, len-1)]
    hi = min(hi, len(arr) - 1)
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
```

Why for CP: problems with "the list keeps growing" or "find the first bad version in an unknown range" require unbounded search; exponential doubling bounds the range before binary search halves it.

**3. Binary search on a predicate (generalized)**

Any boolean function `f(x)` that is `False...False...True...True` (monotone) supports binary search: find the first `x` where `f(x)` becomes `True`. This subsumes rotated search, peak finding, and first-position variants under one template:

```python
def first_true(lo: int, hi: int, predicate) -> int:
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if predicate(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo  # lo == hi == first True index
```

Why for CP: "first index where condition holds" appears across problem categories - duplicates search, rotation minimum, allocation problems; one clean template handles all of them without re-deriving the loop each time.

## Worked problems

### Search in Rotated Sorted Array (LC 33)

Array `nums` of distinct integers, sorted and then rotated at an unknown pivot. Given `target`, return its index or -1. Constraints: n ≤ 10⁴, O(log n) required.

**Approach:** At every `mid`, one half is guaranteed sorted (no pivot in it). Test `nums[lo] <= nums[mid]` to identify the sorted half. Check if `target` falls in that sorted range; if yes, discard the other half; if no, discard the sorted half. One comparison per step → O(log n).

```python
def search(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
```

**Time:** O(log n). **Space:** O(1).

**Duplicate problems:**
- Search in Rotated Sorted Array II (LC 81) - same algorithm; when `nums[lo] == nums[mid]`, can't determine sorted half → `lo += 1; hi -= 1`, worst case O(n).
- Find Minimum in Rotated Sorted Array (LC 153) - no target; search for pivot where `nums[mid] > nums[hi]`; same sorted-half identification.
- Find Minimum in Rotated Sorted Array II (LC 154) - same as LC 153 with duplicates; same O(n) worst-case caveat.

---

### Find Peak Element (LC 162)

Array `nums` where `nums[i] ≠ nums[i+1]`. A peak is any index `i` where `nums[i] > nums[i-1]` and `nums[i] > nums[i+1]` (boundaries count as -∞). Return any peak index. Constraints: n ≤ 10⁵, O(log n) required.

**Approach:** At `mid`, compare `nums[mid]` with `nums[mid+1]`. If `nums[mid] < nums[mid+1]` the slope is rising - a peak must exist to the right (LC guarantees a peak exists). If `nums[mid] > nums[mid+1]` the slope is falling - `mid` itself could be a peak, or there's one to the left. Shrink to `[lo, mid]`. Loop ends when `lo == hi` - that's a peak.

```python
def findPeakElement(nums: list[int]) -> int:
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] < nums[mid + 1]:
            lo = mid + 1
        else:
            hi = mid
    return lo
```

**Time:** O(log n). **Space:** O(1).

**Duplicate problems:**
- Peak Index in a Mountain Array (LC 852) - identical peak-finding mechanic; array is guaranteed bitonic (strictly up then strictly down), so any peak-finding binary search applies directly.
- Find Peak Element in 2D Matrix (LC 1901) - 2D extension; find column of global row-max, binary search columns; same "move toward the higher neighbor" rule applied to columns.

---

### Find First and Last Position of Element in Sorted Array (LC 34)

Given sorted array `nums` and `target`, return `[first, last]` index of `target`, or `[-1, -1]` if absent. Constraints: n ≤ 10⁵, O(log n) required.

**Approach:** Two separate binary searches. First: `bisect_left` - find the leftmost index where `nums[i] >= target` (the "lower bound"). Second: `bisect_right` - find the leftmost index where `nums[i] > target`, subtract 1 (the "upper bound"). If `lower_bound` is out of range or `nums[lower_bound] != target`, return `[-1,-1]`.

```python
def searchRange(nums: list[int], target: int) -> list[int]:
    # bisect_left: first index where nums[i] >= target
    lo, hi = 0, len(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    left = lo
    if left == len(nums) or nums[left] != target:
        return [-1, -1]
    # bisect_right: first index where nums[i] > target
    lo, hi = 0, len(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] <= target:
            lo = mid + 1
        else:
            hi = mid
    right = lo - 1
    return [left, right]
```

**Time:** O(log n). **Space:** O(1).

**Duplicate problems:**
- Count of Range Sum (LC 327) - uses `bisect_left`/`bisect_right` on a sorted prefix-sum array to count values in a range; same lower/upper bound pattern.
- Search Insert Position (LC 35) - pure `bisect_left`; the simplest application of the lower-bound search.

---

### Search a 2D Matrix (LC 74)

`m × n` matrix where each row is sorted and the first element of each row is greater than the last element of the previous row. Find if `target` exists. Constraints: m, n ≤ 100, O(log(m·n)) required.

**Approach:** The matrix is equivalent to a flattened sorted array of length `m*n`. Binary search over indices 0 to `m*n - 1`. Decode `mid` as `row = mid // n`, `col = mid % n`. Standard binary search comparisons apply.

```python
def searchMatrix(matrix: list[list[int]], target: int) -> bool:
    m, n = len(matrix), len(matrix[0])
    lo, hi = 0, m * n - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        val = matrix[mid // n][mid % n]
        if val == target:
            return True
        elif val < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return False
```

**Time:** O(log(m·n)). **Space:** O(1).

**Duplicate problems:**
- Search a 2D Matrix II (LC 240) - rows sorted, columns sorted, but first element of row is NOT > last of previous row; the flattening trick fails. Instead start top-right and move left (target smaller) or down (target larger). Different algorithm - O(m + n), not O(log(m·n)).

## Pitfalls

**1. Using `arr[lo] < arr[mid]` instead of `<=` in rotated search**

The condition to identify the sorted left half must be `arr[lo] <= arr[mid]` (not strict `<`). When `lo == mid` (two-element window), `arr[lo] == arr[mid]` - using strict `<` would incorrectly declare the right half sorted and potentially loop infinitely or miss the target.

**2. `hi = mid - 1` vs `hi = mid` - mixing templates**

There are two valid binary search templates: (A) `while lo <= hi` with `hi = mid - 1` / `lo = mid + 1`, and (B) `while lo < hi` with `hi = mid` / `lo = mid + 1`. Mixing them causes infinite loops. Peak finding uses template B (`hi = mid`) because `mid` is a candidate answer; rotated search uses template A (`hi = mid - 1`) because at `arr[mid] == target` you return immediately. Pick one template and apply it consistently per problem.

**3. Duplicates invalidate the sorted-half test**

When `arr[lo] == arr[mid] == arr[hi]`, you cannot tell which half is sorted. The safe fix is `lo += 1; hi -= 1` - shrink both ends by one. This degrades worst case to O(n) (all elements equal). Failing to handle this case causes incorrect results on LC 81 / LC 154.

**4. Not checking array length before accessing `mid + 1` in peak finding**

`nums[mid + 1]` accesses index `mid + 1`. If `hi` can equal `len(nums) - 1` and `mid == hi`, this is out of bounds. The loop condition `while lo < hi` prevents `mid` from ever equaling `hi` (`mid = lo + (hi - lo) // 2 < hi` when `lo < hi`), so `mid + 1 <= hi` is always safe - but only if you use the `lo < hi` template. Using `lo <= hi` here causes an out-of-bounds access.

**5. Applying modified binary search to an unsorted array**

Modified binary search requires at least local monotonicity - one half is always structured. If the array is entirely unsorted (random permutation), there is no consistent half to discard and binary search will silently return wrong answers. Verify the structural guarantee before applying any variant.

## First 30 seconds

"This is a modified binary search - the array has been transformed (rotated, peaked, or partially sorted) but not globally sorted. I'll use the standard `lo`/`hi`/`mid` loop and at each step ask: which half is still structured? For a rotated array, `arr[lo] <= arr[mid]` tells me the left half is sorted - I check if target falls there and discard the other half. For a peak, I compare `arr[mid]` with `arr[mid+1]` and move toward the rising side. Either way it's O(log n) - I never look at more than half the remaining space."

## Related

- [Binary Search](../algorithms/binary-search.md) - the underlying algorithm; modified binary search is binary search with a different halving predicate.
- [Binary Search on Answer](./binary-search-on-answer.md) - sibling pattern that binary-searches the *value space* with a feasibility check, rather than the index space of a given array.
- [Array](../data-structures/array.md) - all variants operate on array-backed structures; contiguous layout and O(1) index access are what make the O(log n) bound achievable.
- [Two Pointers](./two-pointers.md) - confused with modified binary search when the problem involves two indices; two pointers walk linearly, binary search halves.

## Practice problems

### 1. Search in Rotated Sorted Array II (LC 81)

Array `nums` of integers (may contain duplicates), sorted and rotated at an unknown pivot. Given `target`, return `true` if it exists. Constraints: n ≤ 5000, O(log n) average required.

**Approach:** Same sorted-half identification as LC 33, but duplicates break the test: when `nums[lo] == nums[mid] == nums[hi]`, you cannot tell which half is sorted. Shrink both ends by one (`lo += 1; hi -= 1`) and continue. This is the key extension over LC 33 - handle the ambiguous equal case explicitly. Average O(log n), worst case O(n) when all elements are equal.

```python
def search(nums: list[int], target: int) -> bool:
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] == target:
            return True
        if nums[lo] == nums[mid] == nums[hi]:  # ambiguous - can't tell which half is sorted
            lo += 1
            hi -= 1
        elif nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return False
```

**Time:** O(log n) average, O(n) worst case. **Space:** O(1).

**Duplicate problems:**
- Find Minimum in Rotated Sorted Array II (LC 154) - same duplicate-ambiguity handling (`lo += 1; hi -= 1`); goal is the minimum value rather than a target, but the same equal-case shrink applies.

---

### 2. Find in Mountain Array (LC 1095)

A mountain array first strictly increases then strictly decreases. You can call `MountainArray.get(index)` (limited calls). Find the minimum index of `target`, or -1. Constraints: `MountainArray.length()` ≤ 10⁴.

**Approach:** Three binary searches. (1) Find the peak index using the rising/falling comparison. (2) Binary search the ascending half `[0, peak]` for `target`. (3) If not found, binary search the descending half `[peak, n-1]` with a reversed comparator. Total O(log n) calls.

```python
def findInMountainArray(target: int, mountain_arr) -> int:
    n = mountain_arr.length()

    lo, hi = 0, n - 1
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if mountain_arr.get(mid) < mountain_arr.get(mid + 1):
            lo = mid + 1
        else:
            hi = mid
    peak = lo

    lo, hi = 0, peak
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        val = mountain_arr.get(mid)
        if val == target:
            return mid
        elif val < target:
            lo = mid + 1
        else:
            hi = mid - 1

    lo, hi = peak, n - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        val = mountain_arr.get(mid)
        if val == target:
            return mid
        elif val > target:
            lo = mid + 1
        else:
            hi = mid - 1

    return -1
```

**Time:** O(log n) calls. **Space:** O(1).

**Duplicate problems:**
- Peak Index in a Mountain Array (LC 852) - identical peak-finding step; skips the two subsequent searches since only the peak is needed.

---

### 3. Time Based Key-Value Store (LC 981)

Design a data structure supporting `set(key, value, timestamp)` and `get(key, timestamp)` which returns the value with the largest timestamp ≤ the given timestamp, or `""` if none exists. Constraints: up to 10⁵ calls, timestamps strictly increasing per key.

**Approach:** Store values per key in a list of `(timestamp, value)` pairs (they arrive in strictly increasing timestamp order, so the list is automatically sorted). For `get`, binary search the list for the largest timestamp ≤ the query timestamp using `bisect_right` - the answer is at index `pos - 1`.

```python
class TimeMap:
    def __init__(self) -> None:
        self.store: dict[str, list[tuple[int, str]]] = {}

    def set(self, key: str, value: str, timestamp: int) -> None:
        self.store.setdefault(key, []).append((timestamp, value))

    def get(self, key: str, timestamp: int) -> str:
        entries = self.store.get(key, [])
        # bisect_right on (timestamp, chr(127)): find first entry with ts > timestamp
        # chr(127) is the largest printable ASCII, so (timestamp, chr(127)) sorts past
        # all real values at this timestamp
        target = (timestamp, chr(127))
        lo, hi = 0, len(entries)
        while lo < hi:
            mid = (lo + hi) // 2
            if entries[mid] <= target:
                lo = mid + 1
            else:
                hi = mid
        pos = lo
        return entries[pos - 1][1] if pos > 0 else ""
```

**Time:** O(1) set, O(log n) get per key. **Space:** O(n) total entries.

**Duplicate problems:**
- Find Right Interval (LC 436) - binary search on sorted start points to find the smallest start ≥ each interval's end; same `bisect_left` on a sorted list of values.
- Online Election (LC 911) - `bisect_right` on timestamps to find the leader at query time; identical temporal binary search pattern.
