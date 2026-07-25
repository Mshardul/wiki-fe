# Complexity Growth Reference Cheatsheet

How bad is O(n²) actually, at real n - growth classes side by side.

> 📖 Full articles:
> [Sorting](../algorithms/sorting.md) · [Dynamic Programming](../algorithms/dynamic-programming.md)

## Growth curve - true shape (small n, linear y-axis)

Actual operation counts, n = 1 to 30, O(n²) and O(2ⁿ) excluded (both dwarf the others at this scale and are already off-scale by n = 30 - see the log chart below, and the table further down for exact values). O(n) is honestly straight here; a log axis would bend it.

```mermaid
xychart-beta
    title "Operations vs n (linear scale, n <= 30)"
    x-axis [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29]
    y-axis "Operations" 0 --> 150
    line "O(1)" [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    line "O(log n)" [0, 1.58, 2.32, 2.81, 3.17, 3.46, 3.7, 3.91, 4.09, 4.25, 4.39, 4.52, 4.64, 4.75, 4.86]
    line "O(n)" [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29]
    line "O(n log n)" [0, 4.75, 11.61, 19.65, 28.53, 38.05, 48.11, 58.6, 69.49, 80.71, 92.24, 104.04, 116.1, 128.38, 140.88]
```

**Legend** (top-to-bottom = plot order = default line-color order): O(1) → O(log n) → O(n) → O(n log n). At n = 30: O(1) is flat at 1, O(log n) ≈ 5 (lowest rising line), O(n) = 30 (straight diagonal), O(n log n) ≈ 147 (steepest, highest line).

## Growth curve - full range (log y-axis)

Mermaid's xychart-beta has no true log-axis, so the y-axis plots **log₁₀(operation count)** directly - read 1 as 10 ops, 2 as 100 ops, 3 as 1,000 ops, and so on. This is what makes O(2ⁿ) fit next to the rest at all, but it bends every straight/near-straight line (O(n), O(n log n)) into a curve - only the relative gap between lines matters here, not their shape. n = 1 to 100:

```mermaid
xychart-beta
    title "log10(operations) vs n"
    x-axis [1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66, 71, 76, 81, 86, 91, 96]
    y-axis "log10(operations)" 0 --> 30
    line "O(1)" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "O(log n)" [0, 0.41, 0.54, 0.6, 0.64, 0.67, 0.69, 0.71, 0.73, 0.74, 0.75, 0.76, 0.77, 0.78, 0.79, 0.8, 0.8, 0.81, 0.81, 0.82]
    line "O(n)" [0, 0.78, 1.04, 1.2, 1.32, 1.41, 1.49, 1.56, 1.61, 1.66, 1.71, 1.75, 1.79, 1.82, 1.85, 1.88, 1.91, 1.93, 1.96, 1.98]
    line "O(n log n)" [0, 1.19, 1.58, 1.81, 1.96, 2.09, 2.19, 2.27, 2.34, 2.4, 2.46, 2.51, 2.56, 2.6, 2.64, 2.68, 2.71, 2.74, 2.77, 2.8]
    line "O(n^2)" [0, 1.56, 2.08, 2.41, 2.64, 2.83, 2.98, 3.11, 3.23, 3.33, 3.42, 3.5, 3.57, 3.64, 3.7, 3.76, 3.82, 3.87, 3.92, 3.96]
    line "O(2^n)" [0.3, 1.81, 3.31, 4.82, 6.32, 7.83, 9.33, 10.84, 12.34, 13.85, 15.35, 16.86, 18.36, 19.87, 21.37, 22.88, 24.38, 25.89, 27.39, 28.9]
```

**Legend** (top-to-bottom = plot order = default line-color order): O(1) → O(log n) → O(n) → O(n log n) → O(n²) → O(2ⁿ). At n = 100: O(1) is flat at 0, O(log n) ≈ 0.8, O(n) = 2, O(n log n) ≈ 2.8, O(n²) = 4, O(2ⁿ) ≈ 30 (the line that shoots off the top).

O(2ⁿ) already needs 30+ on this log scale by n = 100 (that's 10³⁰ operations) - it separates from every other curve within the first ~20-30 steps and keeps climbing while the rest flatten out.

## Operation count at real n

| n | O(log n) | O(n) | O(n log n) | O(n²) | O(2ⁿ) |
| --- | --- | --- | --- | --- | --- |
| 10 | 3 | 10 | 33 | 100 | 1,024 |
| 100 | 7 | 100 | 664 | 10,000 | astronomical |
| 1,000 | 10 | 1,000 | 9,966 | 1,000,000 | astronomical |
| 10⁵ | 17 | 100,000 | 1,660,964 | 10¹⁰ | astronomical |
| 10⁶ | 20 | 1,000,000 | 19,931,569 | 10¹² | astronomical |

## Gut check

| Complexity | ~1 second budget (10⁸-10⁹ ops) fits n up to |
| --- | --- |
| O(2ⁿ) | ~20-25 |
| O(n²) | ~10⁴ |
| O(n log n) | ~10⁶-10⁷ |
| O(n) | ~10⁸ |
| O(log n) | any n |

## Gotchas

- ⚠️ O(n²) at n = 10⁵ is already 10¹⁰ operations - looks "just quadratic" on paper but is unusably slow (~10s+) well before n reaches 10⁶.
- ⚠️ O(2ⁿ) is fine at n ≤ 20-22 but doubles with every added element - n = 30 is already ~10⁹, n = 40 is ~10¹².
