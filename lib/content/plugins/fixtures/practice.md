# Sliding Window

## Practice problems

### Maximum Subarray Sum of Size K

Given an array, find the max sum of any contiguous subarray of size `k`.

**Approach:** Fixed-size window. Compute the first `k` sum, then slide.

**Complexity:** O(n) time, O(1) space.

### Longest Substring Without Repeats

Find the longest substring with all distinct characters.

**Approach:** Variable-size window with a seen-set.

**Complexity:** O(n) time, O(min(n, alphabet)) space.
