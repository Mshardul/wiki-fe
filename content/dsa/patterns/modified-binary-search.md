# Modified Binary Search

## Prerequisites

- [Binary Search](../algorithms/binary-search.md) [Must read]
- [Array](../data-structures/array.md) [Must read]

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

**Real-world usage:** Elasticsearch uses binary search on sorted segment-level term dictionaries to locate postings lists in O(log n) per lookup - the same rotated/bounded search logic scaled to billions of documents. **At scale:** when the sorted structure spans multiple machines (distributed sorted index), a single binary search becomes a cascade of network round-trips - each halving step may hit a different shard. At that point, <abbr>consistent hashing</abbr> or a B-tree index (which amortizes depth) replaces pure binary search; the O(log n) bound holds per node but the constant grows with network latency.

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

### 1. Search in Rotated Sorted Array (LC 33)

Array `nums` of distinct integers, sorted and then rotated at an unknown pivot. Given `target`, return its index or -1. Constraints: n ≤ 10⁴, O(log n) required.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [4,5,6,7,0,1,2], target = 0 | **Output:** 4
- **Example 2**
  - **Input:** nums = [4,5,6,7,0,1,2], target = 3 | **Output:** -1

**Constraints:** `1 ≤ nums.length ≤ 10⁴`, `-10⁴ ≤ nums[i] ≤ 10⁴`, all values distinct, `nums` is a rotated sorted array.

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

**Complexity:** O(log n) time, O(1) space.

**Duplicate problems:**
- Search in Rotated Sorted Array II (LC 81) - same algorithm; when `nums[lo] == nums[mid] == nums[hi]`, can't determine sorted half → `lo += 1; hi -= 1`, worst case O(n).
- Find Minimum in Rotated Sorted Array (LC 153) - no target; search for pivot where `nums[mid] > nums[hi]`; same sorted-half identification.
- Find Minimum in Rotated Sorted Array II (LC 154) - same as LC 153 with duplicates; same O(n) worst-case caveat.

---

### 2. Find Peak Element (LC 162)

Array `nums` where `nums[i] ≠ nums[i+1]`. A peak is any index `i` where `nums[i] > nums[i-1]` and `nums[i] > nums[i+1]` (boundaries count as -∞). Return any peak index. Constraints: n ≤ 10⁵, O(log n) required.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [1,2,3,1] | **Output:** 2
- **Example 2**
  - **Input:** nums = [1,2,1,3,5,6,4] | **Output:** 5
  - **Explanation:** index 1 (value 2) and index 5 (value 6) are both valid peaks; any one is accepted.

**Constraints:** `1 ≤ nums.length ≤ 1000`, `-2³¹ ≤ nums[i] ≤ 2³¹-1`, `nums[i] ≠ nums[i+1]`.

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

**Complexity:** O(log n) time, O(1) space.

**Duplicate problems:**
- Peak Index in a Mountain Array (LC 852) - identical peak-finding mechanic; array is guaranteed bitonic (strictly up then strictly down), so any peak-finding binary search applies directly.
- Find in Mountain Array (LC 1095) - same peak-finding as its first phase, then two plain binary searches (one per side of the peak, one with a reversed comparator) to locate a target - no new halving mechanic beyond peak-finding and classic search.
- Find Peak Element in 2D Matrix (LC 1901) - 2D extension; find column of global row-max, binary search columns; same "move toward the higher neighbor" rule applied to columns.
- Generalized "first True" <abbr>predicate</abbr> search (contest template) - the loop above is the special case of a monotone boolean predicate `f(mid) = nums[mid] < nums[mid+1]`; any problem with a `False...False...True...True` monotone condition (rotation-minimum, allocation/capacity problems) reduces to the same `while lo < hi: hi = mid if predicate(mid) else lo = mid + 1` template.

---

### 3. Find First and Last Position of Element in Sorted Array (LC 34)

Given sorted array `nums` and `target`, return `[first, last]` index of `target`, or `[-1, -1]` if absent. Constraints: n ≤ 10⁵, O(log n) required.

**Worked examples:**
- **Example 1**
  - **Input:** nums = [5,7,7,8,8,10], target = 8 | **Output:** [3,4]
- **Example 2**
  - **Input:** nums = [5,7,7,8,8,10], target = 6 | **Output:** [-1,-1]

**Constraints:** `0 ≤ nums.length ≤ 10⁵`, `-10⁹ ≤ nums[i], target ≤ 10⁹`, `nums` sorted ascending.

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

**Complexity:** O(log n) time, O(1) space.

**Duplicate problems:**
- Search Insert Position (LC 35) - pure `bisect_left`; the simplest application of the lower-bound search.
- Count of Range Sum (LC 327) - uses `bisect_left`/`bisect_right` on a sorted prefix-sum array to count values in a range; same lower/upper bound pattern.
- Time Based Key-Value Store (LC 981) - same `bisect_right` floor-lookup mechanic (largest key ≤ query), applied to a per-key list that grows via appends instead of a static array.
- Find Right Interval (LC 436) - `bisect_left` on sorted start points to find the smallest start ≥ each interval's end.
- Online Election (LC 911) - `bisect_right` on timestamps to find the leader at query time; identical temporal binary search pattern.
- Python `bisect` module as drop-in (contest velocity) - `bisect.bisect_left`/`bisect_right` implement exactly this lower/upper-bound search in one C-implemented call each; in a contest, reach for these directly instead of hand-rolling the loop shown above.

---

### 4. Search a 2D Matrix (LC 74)

`m × n` matrix where each row is sorted and the first element of each row is greater than the last element of the previous row. Find if `target` exists. Constraints: m, n ≤ 100, O(log(m·n)) required.

**Worked examples:**
- **Example 1**
  - **Input:** matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3 | **Output:** true
- **Example 2**
  - **Input:** matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 13 | **Output:** false

**Constraints:** `1 ≤ m, n ≤ 100`, `-10⁴ ≤ matrix[i][j], target ≤ 10⁴`.

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

**Complexity:** O(log(m·n)) time, O(1) space.

**Duplicate problems:**
- Search a 2D Matrix II (LC 240) - rows sorted, columns sorted, but first element of row is NOT > last of previous row; the flattening trick fails. Instead start top-right and move left (target smaller) or down (target larger). Different algorithm - O(m + n), not O(log(m·n)) - but same problem shape (search a sorted matrix).

---

### 5. Search in a Sorted Array of Unknown Size (LC 702)

You are given an ascending sorted array of unknown size, accessible only through an `ArrayReader` interface that returns `2³¹ - 1` for any out-of-bounds index. Given `target`, return its index, or `-1` if absent.

**Worked examples:**
- **Example 1**
  - **Input:** secret = [-1,0,3,5,9,12], target = 9 | **Output:** 4
- **Example 2**
  - **Input:** secret = [-1,0,3,5,9,12], target = 2 | **Output:** -1
  - **Explanation:** 2 does not exist in the array, so -1 is returned.

**Constraints:** `1 ≤ secret.length ≤ 10⁴`, `-10⁴ ≤ secret[i], target ≤ 10⁴`, `secret` sorted in ascending order.

**Approach:** the array's length is unknown, so a fixed `[0, n-1]` window doesn't exist yet - the search space itself must be discovered before it can be halved. Double a `hi` bound (`1, 2, 4, 8, ...`) until `reader.get(hi)` either exceeds `target` or returns the <abbr>sentinel</abbr> `2³¹-1`, which bounds the array within `[hi/2, hi]` in O(log n) doublings. Then run standard binary search inside that bound - the doubling phase and the search phase are each O(log n), so the total stays O(log n) despite not knowing `n` up front.

```python
class ArrayReader:
    def get(self, index: int) -> int: ...

def search(reader: ArrayReader, target: int) -> int:
    if reader.get(0) == target:
        return 0
    lo, hi = 0, 1
    while reader.get(hi) < target:
        lo = hi
        hi *= 2
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        val = reader.get(mid)
        if val == target:
            return mid
        elif val < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
```

**Complexity:** O(log n) time, O(1) space - both the doubling phase and the binary-search phase are logarithmic in the (unknown) array length.

**Duplicate problems:**
- First Bad Version (LC 278) - same "search space grows/unknown boundary" shape when `n` itself is not given up front and only a feasibility check (`isBadVersion`) is available; both reduce to the generalized first-True predicate template.
