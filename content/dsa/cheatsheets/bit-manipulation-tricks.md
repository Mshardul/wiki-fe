# Bit Manipulation Tricks Cheatsheet

Common bit tricks, one lookup.

> 📖 Full articles:
> [Bit Manipulation](../algorithms/bit-manipulation.md)

## Tricks

| Trick | Expression | When to use |
| --- | --- | --- |
| Check bit k | `(n >> k) & 1` | test one flag |
| Set bit k | `n \| (1 << k)` | write one flag |
| Clear bit k | `n & ~(1 << k)` | unset one flag |
| Toggle bit k | `n ^ (1 << k)` | flip one flag |
| Isolate lowest set bit | `n & (-n)` | Fenwick tree navigation, factor-of-2 checks |
| Clear lowest set bit | `n & (n-1)` | popcount loop, power-of-2 test |
| Power of 2 check | `n > 0 and not (n & (n-1))` | alignment checks, bucket sizing |
| Count trailing zeros | `(n & -n).bit_length() - 1` | next Fenwick index, LSB position |
| Turn off rightmost run of 1s | `n & (n + 1)` | detect/clear a run of consecutive 1s |
| Popcount (Brian Kernighan) | `while n: count+=1; n &= n-1` | O(k) count of set bits |
| Popcount (Python built-in) | `n.bit_count()` (3.10+) | prefer over manual loop |
| XOR find-unique | `reduce(xor, arr)` | one element appears an odd number of times |
| XOR swap | `a ^= b; b ^= a; a ^= b` | swap without a temp variable |
| Lowest k bits on | `(1 << k) - 1` | mask the lower k bits |
| Subset enumeration | `sub=(sub-1)&mask` until `sub==0` | iterate all submasks in bitmask DP, O(3ⁿ) total |
| Simulate 32-bit unsigned in Python | `n & 0xFFFFFFFF` | porting C++ solutions, avoid sign-extension bugs |

## Gotchas

- ⚠️ XOR swap breaks when `a` and `b` alias the same location (`A[i]`/`A[j]` with `i == j`) - first `^=` zeros it out. Guard with `if i != j:`.
- ⚠️ XOR swap is a historical trap in Python - `a, b = b, a` compiles to a single load/store, faster than XOR swap. Don't "optimize" into it.
- ⚠️ `while n:` not `while n > 0:` for popcount loops - matters in languages where unsigned underflow wraps to a huge value.
- ⚠️ Two or more odd-frequency elements (not exactly one) - plain XOR find-unique breaks; need the bit-partition extension or a hash set.
