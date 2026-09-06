# Combined Dialect

## Prerequisites

- **[Databases](../components/databases.md)** [Must read]
- **Consistent Hashing** [Should read]

## Overview

A callout and a footnote reference[^n].

> 🎯 **Interview Lens**
> How would you scale this?

```python
def solve(nums):
    total = 0
    for n in nums:
        total += n
    return total
```

## Complexity Comparison

| Operation | Average | Worst |
|---|---|---|
| Insert | O(1) | O(n) |
| Lookup | O(1) | O(n) |

## Structure

```viz
array
[4, 15, 23, 42]
```

## Practice problems

### Two Sum

Find two numbers that add to the target.

**Approach:** Hash map of complements.

**Complexity:** O(n) time, O(n) space.

[^n]: A footnote definition.
