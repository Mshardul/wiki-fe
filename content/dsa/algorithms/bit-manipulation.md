# Bit Manipulation

## Prerequisites

- [Dynamic Programming](./dynamic-programming.md) [Must read] - bitmask DP encodes subset state as a single integer; you need DP fundamentals to understand why iterating all 2ⁿ subsets solves the problem.
- [Divide and Conquer](./divide-and-conquer.md) [Should read] - binary exponentiation (fast pow) and the subset enumeration recurrence both halve the problem each step; understanding the paradigm clarifies why O(log exp) and O(3ⁿ) arise.

## Table of Contents

- [What it is](#what-it-is)
- [Intuition](#intuition)
- [How it works](#how-it-works)
- [Correctness / invariant](#correctness--invariant)
- [Complexity derivation](#complexity-derivation)
- [Constraints & approach](#constraints--approach)
- [When to use / when not](#when-to-use--when-not)
- [Comparison](#comparison)
- [Bit-tricks table](#bit-tricks-table)
- [Edge cases](#edge-cases)
- [Implementation](#implementation)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)

---

## What it is

Bit manipulation is the class of algorithms that operate directly on the **binary representation** of integers using the CPU's bitwise operators — AND (`&`), OR (`|`), XOR (`^`), NOT (`~`), left shift (`<<`), right shift (`>>`) — achieving O(1) or O(k) results that would otherwise require arithmetic loops.

**Mental model:** think of an integer as an array of 64 light switches. Bitwise ops let you flip, read, or mask any subset of those switches in a single clock cycle — no loops, no conditionals. Every trick reduces to "position the bit you care about, then apply the operator that does exactly what AND/OR/XOR/NOT does to two bits."

> **Soundbite:** Bit manipulation treats integers as fixed-width boolean arrays — AND, OR, XOR, and shifts give you O(1) set operations on up to 64 elements, and that constant is one CPU instruction.

---

## Intuition

The six operators have fixed, predictable single-bit behavior:

| Op | 0,0 | 0,1 | 1,0 | 1,1 | Plain English |
|----|-----|-----|-----|-----|---------------|
| AND `&` | 0 | 0 | 0 | 1 | "both must be 1" — mask/test |
| OR `\|` | 0 | 1 | 1 | 1 | "either is enough" — set |
| XOR `^` | 0 | 1 | 1 | 0 | "exactly one" — toggle/cancel pairs |
| NOT `~` | 1 | 0 | — | — | "flip every bit" — complement |

Shifts are multiplication/division by powers of 2: `n << k` = `n × 2ᵏ`, `n >> k` = `n ÷ 2ᵏ` (integer division; arithmetic shift for signed integers — sign bit is replicated, not zeroed).

The non-obvious insight is **two's complement**: a signed negative `-n` is stored as `~n + 1`. That identity is why `n & (-n)` isolates the lowest set bit — it is not a coincidence or a memorized formula, it follows directly from how negation is defined in hardware. Bits 0..p-1 of ~n are all 1 (since bits 0..p-1 of n are all 0), so adding 1 triggers a carry chain through all of them; the chain stops at bit p where ~n has a 0 (since bit p of n is 1), flipping it to 1 — the only bit set in -n that also matches n. Once you internalize the single-bit truth table and the two's complement definition, you can derive any compound trick from scratch instead of memorizing a catalog.

---

## How it works

### Trace 1: `n & (n-1)` clears the lowest set bit

Take `n = 44` (binary `0010 1100`). We want to clear the lowest set bit — the `1` at position 2.

```
n       =  44  =  0 0 1 0 1 1 0 0
                  7 6 5 4 3 2 1 0   ← bit positions

n - 1   =  43  =  0 0 1 0 1 0 1 1
                           ↑
           subtracting 1 borrows through the lowest 1 and all 0s below it,
           flipping that 1 → 0 and every lower 0 → 1.

n & (n-1):
  0 0 1 0 1 1 0 0   (n)
& 0 0 1 0 1 0 1 1   (n-1)
─────────────────
  0 0 1 0 1 0 0 0  =  40

Bit 2 (the lowest set bit of 44) is now cleared.
Bits above it: unchanged (AND keeps matching 1s).
Bits below it: were 0 in n, stay 0 after AND regardless of n-1.
```

Trace 1 clears the lowest set bit by exploiting borrow propagation. Trace 2 uses the same mechanic in reverse — two's complement negation also propagates a carry through the trailing zeros, but this time the result *isolates* the bit instead of clearing it.

### Trace 2: `n & (-n)` isolates the lowest set bit

Same `n = 44 = 0010 1100`. Two's complement: `-44 = ~44 + 1`.

```
~n      = ~44  =  1 1 0 1 0 0 1 1   (flip every bit)
~n + 1  = -44  =  1 1 0 1 0 1 0 0   (add 1: carry propagates through trailing 1s of ~n,
                                       stops at the first 0 of ~n = the first 1 of n)

n & (-n):
  0 0 1 0 1 1 0 0   (n)
& 1 1 0 1 0 1 0 0   (-n)
─────────────────
  0 0 0 0 0 1 0 0  =  4   ← only bit 2, the lowest set bit of 44
```

The carry in `-n = ~n + 1` always stops at the mirror of `n`'s lowest set bit, so AND yields a single-bit mask.

### Trace 3: XOR pair-cancellation

Array `[3, 1, 4, 1, 3]` — find the number that appears an odd number of times.

```
acc = 0
XOR 3:  acc = 0 ^ 3 = 3     (0011)
XOR 1:  acc = 3 ^ 1 = 2     (0010)
XOR 4:  acc = 2 ^ 4 = 6     (0110)
XOR 1:  acc = 6 ^ 1 = 7     (0111)
XOR 3:  acc = 7 ^ 3 = 4     (0100)  ← 4 is the answer

1 appeared twice → cancelled (1 ^ 1 = 0).
3 appeared twice → cancelled (3 ^ 3 = 0).
4 appeared once  → survived  (4 ^ 0 = 4).
```

---

## Correctness / invariant

### Why `n & (n-1)` works — borrow-propagation argument

**Claim:** `n & (n-1)` clears exactly the lowest set bit of `n` and leaves all other bits unchanged.

Let bit position `p` be the lowest set bit of `n`. By definition, bits `0..p-1` of `n` are all 0, and bit `p` is 1.

**Subtracting 1 from `n`:**

- Bits `0..p-1` are 0 in `n`; the subtraction borrows through each of them in turn, flipping each 0 → 1.
- The borrow reaches bit `p` (which is 1) and flips it → 0; the borrow chain stops here.
- Bits `p+1..k` are untouched by the borrow.

**Result `n-1`:** bits `0..p-1` are all 1; bit `p` is 0; bits `p+1..k` are identical to `n`.

**AND of `n` and `n-1`:**

- Bits `0..p-1`: `n` has 0, `n-1` has 1 → AND = 0. (Same as `n` — these were already 0.)
- Bit `p`: `n` has 1, `n-1` has 0 → AND = 0. (**Cleared.**)
- Bits `p+1..k`: both identical → AND preserves them. (**Unchanged.**)

Therefore `n & (n-1)` = `n` with exactly bit `p` cleared. QED.

### Why `n & (-n)` works — two's complement argument

**Claim:** `n & (-n)` yields exactly `2ᵖ`, where `p` is the lowest set bit position of `n`.

Two's complement: `-n = ~n + 1`.

**`~n`:** flips every bit. Bit `p` of `n` is 1 → bit `p` of `~n` is 0. Bits `0..p-1` of `n` are 0 → bits `0..p-1` of `~n` are 1. Bits `p+1..k` are inverted.

**`~n + 1` = `-n`:** adding 1 starts a carry chain through bits `0..p-1` of `~n` (all 1s → all flip to 0 with carry). The carry reaches bit `p` of `~n` (which is 0), flips it to 1, and the carry stops. Bits `p+1..k` remain inverted relative to `n`.

**`-n` summary:** bits `0..p-1` are 0 (match `n`). Bit `p` is 1 (matches `n`). Bits `p+1..k` are inverted.

**AND of `n` and `-n`:**

- Bits `0..p-1`: both 0 → 0.
- Bit `p`: both 1 → 1.
- Bits `p+1..k`: `n` and `-n` differ (one has 0, the other has 1) → AND = 0.

Result = `2ᵖ` — a single-bit mask at exactly the lowest set bit of `n`. QED.

### XOR find-unique correctness

**Invariant:** after processing elements `a₁, a₂, ..., aᵢ`, the accumulator holds the XOR of every element that has appeared an **odd** number of times so far.

Base case: accumulator = 0 (zero elements processed; nothing has appeared).

Step: XORing `aᵢ₊₁` into the accumulator either adds it (first/third/... occurrence) or cancels it (`a ^ a = 0`, second/fourth/... occurrence). The invariant holds by induction.

At termination: elements with even count are cancelled (`a ^ a = 0`). The unique element (odd count) survives (`a ^ 0 = a`).

---

## Complexity derivation

| Trick | Time | Space | Why |
|-------|------|-------|-----|
| Single-bit ops (check/set/clear/toggle) | O(1) | O(1) | One shift + one bitwise op — constant regardless of n's value |
| Isolate lowest set bit `n & (-n)` | O(1) | O(1) | Negation and AND are single instructions |
| Clear lowest set bit `n & (n-1)` | O(1) | O(1) | Subtract and AND |
| Power-of-2 check | O(1) | O(1) | One AND, one comparison |
| XOR find-unique over n-element array | O(n) | O(1) | One pass; accumulator is a scalar register |
| Brian Kernighan popcount | O(k) | O(1) | k = number of set bits; loop runs exactly k iterations, each clearing one bit |
| `bin(n).count('1')` in Python | O(k) | O(k) | Converts to k-character string, then scans it |
| `int.bit_count()` (Python 3.10+) | O(k) | O(1) | Built-in; CPython maps to hardware popcount instruction |
| Bitmask DP over n items | O(2ⁿ · W) | O(2ⁿ) | 2ⁿ states; W = work per state (usually O(n)) |
| Subset enumeration via `(sub-1) & mask` | O(3ⁿ) total | O(1) extra | Each bit in the n-bit universe has 3 fates relative to mask: not in mask / in mask but not in sub / in both. Product = 3ⁿ total iterations across all masks. Formally: summing the submask count over all masks gives Σ_{k=0}^{n} C(n,k)·2^k = (1+2)^n = 3^n by the binomial theorem. |

**Cache behavior:** individual bit tricks operate on register values — no memory access, maximally cache-friendly. For 1D `dp[mask]`: 2²⁰ states × 4 bytes ≈ 4 MB — fits in L3 cache. For 2D `dp[mask][node]` (e.g., TSP): 2²⁰ × 20 entries × 4 bytes ≈ 80 MB — spills to RAM and becomes memory-bound. 2²⁵ (128 MB for 1D) does not fit — expect cache thrashing and wall-clock time ≫ operation count suggests.

**Signed vs unsigned:** Python integers are arbitrary precision and always sign-extend on right shift (`>>` is arithmetic). To simulate 32-bit unsigned behavior, apply `& 0xFFFFFFFF` after any op that could produce a negative or overflow. In C++/Java, `>>` on signed integers is implementation-defined (typically arithmetic, sign-extends); use `>>>` (Java) or `(unsigned)n >> k` (C++) for logical shift.

---

## Constraints & approach

The key constraint for bit manipulation is not just `n` (count of elements) but the **bit-width `k` of values** and the **subset size**:

| Input shape / size | Expected complexity | Approach | What it rules out |
|--------------------|--------------------|-----------|-------------------|
| `n ≤ 20` items, need optimal subset | O(2ⁿ · n) | Bitmask DP — encode subset as one integer, iterate `0..(1<<n)-1`; store O(2ⁿ) states | 1D dp[mask]: ~4 MB; 2D dp[mask][v]: ~80 MB at n=20 — fits L3 only for 1D. n > 25: 2²⁵ = 33M states, borderline. n > 30: ~1B states, OOM. |
| k-bit integer, operate on individual bits | O(k) or O(1) | Brian Kernighan popcount, bit-scan tricks | Per-digit loops when an O(1) trick exists |
| n elements in array, find odd-frequency item | O(n), O(1) space | XOR reduction — pairs cancel | Hash set works but costs O(n) space |
| Value range up to 10⁹ (so ≤ 30 bits) | O(log n) = O(30) | Popcount loop, parity, bit-level fast exponentiation | O(n) scan through all values up to 10⁹ — too slow |
| Alignment / power-of-2 check | O(1) | `n & (n-1) == 0` | Division `n % k == 0` — correct but slower; no bit shortcut for non-powers |

**Bitmask DP memory budget (critical contest constraint):**

```
n = 20  → 2²⁰ =  1,048,576 states  →  ~4 MB at 4 bytes/state   ✓ safe
n = 25  → 2²⁵ = 33,554,432 states  → ~128 MB                    ⚠ borderline
n = 30  → 2³⁰ = 1,073,741,824 states → ~4 GB                    ✗ OOM
```

When you see `n ≤ 20` combined with "minimum/maximum cost over all assignments/subsets" or "partition into groups" — bitmask DP is the invited approach. When `n ≤ 64` and the problem asks about bit patterns in individual integers — direct bit tricks. When `n > 25` for subset problems — look for meet-in-the-middle (splitting subsets into two halves of size n/2, each with 2^(n/2) ≈ 32K entries) or polynomial/DP-on-values alternatives.

---

## When to use / when not

**Use bit manipulation when:**

- The problem asks about optimal assignment or cost over subsets of a small set (`n ≤ 20`) → bitmask DP.
- You need to find a unique or missing element in an array where other elements appear in pairs → XOR reduction.
- Flags need to be compactly stored and tested together — visited sets in graph problems, permission bitmasks, state encoding in DP.
- Powers of two appear — alignment checks, bucket-size validation, Fenwick tree index arithmetic (`i += i & (-i)`, `i -= i & (-i)`).
- The problem involves popcount or Hamming distance — kernel feature similarity, error-correcting codes.

**Do not use when:**

- The problem involves arithmetic relationships between values with no clean bitwise expression — "find the pair that sums to k" does not benefit from XOR (XOR ≠ addition).
- `n > 25` for subset enumeration — 2ⁿ state space becomes impractical; prefer DP on values or meet-in-the-middle.
- You need ordering information (max, min, sorted order) — bit tricks on single integers carry no ordering information.

**Real-world:** Fenwick trees (binary-indexed trees) use `i & (-i)` for index arithmetic — every competitive-programming judge and analytics system that needs O(log n) prefix-sum updates relies on this. At n > 10⁷ Fenwick tree updates, the non-sequential index steps (`i += i & (-i)`) cause ~1 L3 miss per traversal level, shifting the bottleneck from arithmetic to memory latency.

---

## Comparison

| Approach | Time | Space | Key assumption | Pick when |
|----------|------|-------|----------------|-----------|
| Bit tricks (single-bit ops) | O(1) | O(1) | Values fit in a machine word (≤ 64 bits) | Flag manipulation, power-of-2 checks, Fenwick tree index |
| XOR reduction (odd-frequency) | O(n) | O(1) | Exactly one element appears odd times; all others appear even | Space critical; exactly one unique/missing element |
| Hash set (dedup / odd-frequency) | O(n) avg | O(n) | Hashable elements | Multiple odd-frequency elements; or you need the count, not just existence |
| Arithmetic modulo (power-of-2 via `n % k`) | O(1) | O(1) | None | Only for non-power-of-2 divisors where no bit trick exists (e.g., `n % 7`); for power-of-2 divisors, always use `n & (m-1)` |
| Bitmask DP | O(2ⁿ · W) | O(2ⁿ) | n ≤ 20–22; subset itself is the DP state | TSP on small graphs, optimal assignment, covering problems |
| DP on values (knapsack) | O(n · W) | O(W) | Value range W bounded | n > 25; bitmask DP OOMs; standard knapsack-style |
| Sorting + two-pointer (find unique) | O(n log n) | O(1) | Elements can be sorted | Multiple unique elements, or you need the value not just its existence |

**Crossover conditions:**

- XOR beats hash set only when exactly one element is odd-frequency and O(1) space is required. For two odd-frequency elements: XOR all to get `a^b`, isolate any set bit (they differ there), partition array into two groups by that bit, XOR each group separately — recovers both values. Three or more odd-frequency elements → hash set wins unconditionally.
- Bitmask DP beats full DP when `n ≤ 20` and the subset is the DP state. At `n = 22` the two are comparable in memory. At `n = 25`, bitmask DP hits memory limits and DP on values wins if the value range W is bounded.

---

## Bit-tricks table

| Trick | Expression | Why it works | Complexity | When to use |
|-------|-----------|-------------|------------|-------------|
| Check bit k | `(n >> k) & 1` | Shifts bit k to position 0; AND with 1 masks everything else | O(1) | Read one flag; test k-th bit |
| Set bit k | `n \| (1 << k)` | OR forces position k to 1 without touching other bits | O(1) | Write one flag |
| Clear bit k | `n & ~(1 << k)` | `~(1 << k)` has 0 only at position k; AND clears it | O(1) | Unset one flag |
| Toggle bit k | `n ^ (1 << k)` | XOR flips: 0→1 if bit k was 0, 1→0 if it was 1 | O(1) | Flip one flag |
| Isolate lowest set bit | `n & (-n)` | `-n = ~n + 1`; carry in `~n+1` stops at the lowest 1 of n, producing a single-bit mask | O(1) | Fenwick tree navigation; factor-of-2 checks |
| Clear lowest set bit | `n & (n-1)` | Subtracting 1 borrows through trailing 0s, flips lowest 1→0; AND cancels the flipped bits below | O(1) | Popcount loop; power-of-2 test |
| Power of 2 check | `n > 0 and not (n & (n-1))` | A power of 2 has exactly one set bit; `n & (n-1)` would be 0 | O(1) | Alignment checks; bucket sizing |
| Count trailing zeros | `(n & -n).bit_length() - 1` | `n & (-n)` gives `2^p`; `.bit_length()` returns p+1 | O(1) | Next Fenwick tree index; LSB position |
| Turn off rightmost run of 1s | `n & (n + 1)` | Adding 1 to a trailing block of 1s flips them to 0 with a carry; AND zeros them. e.g., `n=0b0111` (7): `n+1=0b1000`, `n&(n+1)=0b0000` — the trailing run of three 1s is cleared. | O(1) | Detect/clear a run of consecutive 1s |
| Popcount (Brian Kernighan) | `while n: count+=1; n &= n-1` | Each iteration clears exactly the lowest set bit; runs k times for k set bits | O(k) | Count set bits when k is small |
| Popcount (Python built-in) | `bin(n).count('1')` or `n.bit_count()` (3.10+) | String scan O(k); `bit_count()` maps to hardware instruction | O(k) | Contest use; `bit_count()` preferred in Python 3.10+ |
| XOR find-unique | `reduce(xor, arr)` | `a^a=0`, `a^0=a`; pairs cancel, lone element survives | O(n) | One element appears an odd number of times |
| XOR swap | `a ^= b; b ^= a; a ^= b` | `a` becomes `a^b`; `b` becomes `(a^b)^b=a`; `a` becomes `(a^b)^a=b` | O(1) | Swap without temp variable |
| Lowest k bits on | `(1 << k) - 1` | `2ᵏ - 1` has all lower-k bits set | O(1) | Mask the lower k bits of a value |
| Subset enumeration | `sub=(sub-1)&mask` until `sub==0` | Rolls through every submask of `mask` in descending order | O(3ⁿ) total | Iterate all submasks in bitmask DP |
| Simulate 32-bit unsigned in Python | `n & 0xFFFFFFFF` | Python integers are arbitrary-precision; mask truncates to 32 bits | O(1) | Porting C++ solutions; avoiding sign-extension bugs |
| Fast exponentiation | `pow(base, exp, mod)` in Python; binary method: square and multiply | Each step squares the base and conditionally multiplies by base based on the current exponent bit; halves the remaining exponent each iteration | O(log exp) | Computing base^exp mod m |

> **XOR swap aliasing trap:** if `a` and `b` refer to the same variable or memory location (e.g., `A[i]` and `A[j]` when `i == j`), the first `a ^= b` sets the location to 0, destroying the value. Always guard with `if a is not b:` (or `if i != j:` for array indices). See Edge cases §3.
>
> **XOR swap — modern context:** in Python, `a, b = b, a` compiles to a single LOAD_FAST/STORE_FAST pair with no temp — XOR swap is slower in Python and a historical interview trap, not a genuine optimization.

---

## Edge cases

1. **`n = 0` in popcount loop:** `n & (n-1)` when `n = 0` would compute `0 & (-1) = 0`. The standard guard `while n:` ensures the loop body is never entered for `n = 0`, correctly returning count = 0. Always use `while n:`, not `while n > 0:` (same in Python, but habit matters in C++ where unsigned underflow to `UINT_MAX` is a trap).

2. **`n < 0` in power-of-2 check:** the expression `n & (n-1) == 0` is true for `-4` in some 2's complement representations. In Python, negative integers have infinite leading 1-bits, so `n & (n-1) != 0` for negative n — the guard `n > 0` is still required. In C++, `INT_MIN = 0x80000000` passes `n & (n-1) == 0` but is not a positive power of 2; the `n > 0` guard is mandatory there too.

3. **XOR swap aliasing trap:** if `a` and `b` refer to the same variable or array location (i.e., `i == j` when swapping `A[i]` and `A[j]`), `a ^= b` sets the location to 0; the subsequent steps produce 0, 0 — the value is destroyed. Always check `if i != j:` before an XOR swap on array indices. This is a well-known C pointer-aliasing trap and surfaces in Python as `A[i] ^= A[i]`.

4. **Bitmask DP off-by-one — `(1 << n) - 1` vs `1 << n`:** the full mask for n items is `(1 << n) - 1`. Iterating `range(1 << n)` goes from 0 to `(1<<n)-1` inclusive — correct. Allocating `dp = [INF] * (1 << n)` has exactly `2ⁿ` slots indexed 0..`(1<<n)-1` — correct. The trap is allocating size `1 << n` but accidentally accessing index `1 << n` (out of bounds in C++; silently creates a new entry in Python's dynamic list).

5. **CP trap — `1 << k` overflow in C++:** `1 << 31` on a 32-bit signed `int` is undefined behavior in C++ (signed overflow). Use `1LL << k` for k ≥ 31, or `1ULL << k` for unsigned contexts. In Python, `1 << k` is always exact for any k (arbitrary-precision integers) — this trap only bites when porting to C++ where `int` is 32-bit.

6. **Subset enumeration: the empty subset and termination:** the loop `sub = (sub-1) & mask` eventually reaches `sub = 0` — the empty subset. After processing it, `(0 - 1) & mask = (-1) & mask = mask`, restarting the loop infinitely. The correct idiom processes 0 inside the loop and breaks immediately after:

   ```python
   sub = mask
   while True:
       process(sub)
       if sub == 0:
           break
       sub = (sub - 1) & mask
   ```

---

## Implementation

**Pseudocode (CLRS-style) — Brian Kernighan popcount:**

```
POPCOUNT(n)
    count ← 0
    while n ≠ 0                   ▷ loop runs exactly once per set bit
        n ← n AND (n − 1)         ▷ clears the lowest set bit
        count ← count + 1
    return count
```

**Pseudocode — bitmask DP (minimum cost to visit all n nodes, TSP-style):**

```
BITMASK-DP(cost[0..n-1][0..n-1], n)
    dp[mask][v] ← ∞  for all mask ∈ [0, 2ⁿ), v ∈ [0, n)
    dp[1][0] ← 0                                ▷ start at node 0; only node 0 visited (mask=1)
    for mask = 1 to (2ⁿ − 1)                    ▷ iterate all subsets in increasing order
        for each v such that bit v is set in mask
            if dp[mask][v] = ∞: continue
            for each u in [0, n) such that bit u is NOT set in mask
                next ← mask OR (1 << u)
                dp[next][u] ← min(dp[next][u], dp[mask][v] + cost[v][u])
    return min over all v of dp[(2ⁿ − 1)][v]   ▷ full mask = all nodes visited
```

**Pseudocode — enumerate all submasks of a mask:**

```
ENUMERATE-SUBMASKS(mask)
    sub ← mask
    loop
        process(sub)              ▷ handle this submask (including sub = 0, the empty set)
        if sub = 0: break         ▷ empty subset processed — terminate
        sub ← (sub − 1) AND mask  ▷ roll to the previous submask in descending order
```

**Python — core bit tricks:**

```python
def check_bit(n: int, k: int) -> int:
    """Return 1 if bit k of n is set, else 0."""
    return (n >> k) & 1

def set_bit(n: int, k: int) -> int:
    return n | (1 << k)

def clear_bit(n: int, k: int) -> int:
    return n & ~(1 << k)

def toggle_bit(n: int, k: int) -> int:
    return n ^ (1 << k)

def lowest_set_bit(n: int) -> int:
    """Return a mask with only the lowest set bit of n. n must be nonzero."""
    return n & (-n)

def clear_lowest_set_bit(n: int) -> int:
    return n & (n - 1)

def is_power_of_two(n: int) -> bool:
    return n > 0 and not (n & (n - 1))

def popcount(n: int) -> int:
    """Brian Kernighan — O(k) where k = number of set bits."""
    count = 0
    while n:
        n &= n - 1   # clear lowest set bit; loop runs exactly k times
        count += 1
    return count
```

**Python — XOR find-unique element:**

```python
from functools import reduce
from operator import xor
from typing import List

def find_unique(arr: List[int]) -> int:
    """Find the one element that appears an odd number of times. O(n) time, O(1) space."""
    return reduce(xor, arr)
```

**Python — bitmask DP (minimum cost Hamiltonian path, TSP-style on small graph):**

```python
import math
from typing import List

def min_cost_visit_all(cost: List[List[int]], n: int) -> int:
    """
    Minimum cost path visiting all n nodes starting from node 0.
    cost[i][j] = edge weight. O(2^n * n^2) time, O(2^n * n) space. n <= 20.
    """
    INF = math.inf
    dp = [[INF] * n for _ in range(1 << n)]
    dp[1][0] = 0  # visited only node 0 (mask = 1 = 0b...001), currently at node 0

    for mask in range(1, 1 << n):
        for v in range(n):
            if not (mask >> v & 1) or dp[mask][v] == INF:
                continue  # v not in current visited set, or unreachable
            for u in range(n):
                if mask >> u & 1:
                    continue  # u already visited
                nxt = mask | (1 << u)
                dp[nxt][u] = min(dp[nxt][u], dp[mask][v] + cost[v][u])

    full_mask = (1 << n) - 1
    return min(dp[full_mask][v] for v in range(n))
```

**Python — enumerate all submasks of a mask:**

```python
from typing import Iterator

def enumerate_submasks(mask: int) -> Iterator[int]:
    """Yield every submask of mask (including 0 and mask itself). O(3^n) total across all masks."""
    sub = mask
    while True:
        yield sub
        if sub == 0:
            break
        sub = (sub - 1) & mask
```

---

## What the interviewer probes for

**"Why does `n & (n-1)` work — can you prove it without memorizing it?"**
Walk through the borrow-propagation argument: subtracting 1 borrows through all trailing 0s of `n`, flips the lowest 1 to 0, and stops. All higher bits are unchanged. AND with `n` then zeros the bits below `p` (which `n-1` flipped to 1), leaving exactly the lowest set bit cleared. The derivation is two paragraphs — an interviewer who hears "the formula is `n & (n-1)`" learns nothing; one who hears the borrow-chain argument sees that you understand hardware arithmetic.

**"What's the memory cost of bitmask DP at n = 20 vs n = 25?"**
At `n = 20`: `2²⁰ × n` states ≈ 20M integers × 4 bytes = 80 MB — fits in most environments. At `n = 25`: `2²⁵ × n` ≈ 800M integers × 4 bytes = 3.2 GB — does not fit. Seeing `n ≤ 20` in the constraint list is the green light for bitmask DP; `n ≤ 22–23` is yellow (may need dimension reduction, only store the last layer); `n > 25` is red — look for meet-in-the-middle or a different DP state.

**"Why does XOR find-unique fail with two unique elements, and how do you fix it?"**
XOR of two different values `a ^ b ≠ 0`. The accumulator holds `a ^ b`, not either value alone. Fix: find any set bit in `a ^ b` (there must be at least one, since `a ≠ b`). Partition all elements into two groups based on that bit — group 0 contains neither `a` nor `b` or contains one of them, and group 1 contains the other. XOR each group independently; each produces one of `a` or `b`. This is the Single Number III (LC 260) pattern — the bit-partition step is the key insight an interviewer expects. This problem is listed as a duplicate of Single Number in the practice section — it deserves promotion to a full worked problem. See the duplicate-problems entry under Single Number for the approach sketch.

**"How do you enumerate all submasks of a mask without generating all 2ⁿ integers?"**
Use `sub = (sub - 1) & mask`. This rolls through exactly the submasks of `mask` in descending order. The total work across all masks of an n-bit universe is O(3ⁿ) — not O(4ⁿ) — because each bit has three independent fates: absent from `mask` (always 0 in sub), present in `mask` but absent in `sub`, present in both. Three choices per bit × n bits = 3ⁿ total pairs (mask, sub) across the entire iteration.

**"How do you handle signed integers when porting bit tricks to Python?"**
Python integers are arbitrary precision and always sign-extend: `~n = -(n+1)` (negative), `>>` always replicates the sign bit. To simulate 32-bit unsigned: apply `& 0xFFFFFFFF` after any operation that could produce a negative or ≥ 2³² result. Logical right shift: `(n & 0xFFFFFFFF) >> k`. This matters when porting C++ problem solutions where the original code relies on 32-bit unsigned wraparound. In C++, arithmetic right shift on a negative `int` is implementation-defined pre-C++20 and guaranteed to be arithmetic (sign-extending) in C++20; for portable logical right shift, cast to `unsigned`: `(unsigned)n >> k`.

---

## Practice problems

### Single Number (find the element appearing once)

Given a non-empty array of integers where every element appears *exactly twice* except for one element, find that element. Constraints: `1 ≤ n ≤ 3 × 10⁴`; must run in O(n) time with O(1) space.

**Approach:** XOR all elements. Pairs cancel (`a ^ a = 0`); the unique element survives (`a ^ 0 = a`). No hash set needed — O(1) extra space. This is the canonical XOR reduction problem: the correctness invariant (XOR accumulator holds the XOR of all odd-frequency elements) ensures the answer emerges from a single linear scan.

```python
from functools import reduce
from operator import xor
from typing import List

def single_number(nums: List[int]) -> int:
    return reduce(xor, nums)
```

**Complexity:** O(n) time, O(1) space.

**Duplicate problems:**
- Missing Number (LC 268) — XOR indices 0..n with all array elements; the missing index survives (same pair-cancellation mechanic, values are just indices vs array contents).
- Find the Difference (LC 389) — one character added to a shuffled string; XOR all characters from both strings, the added character survives.
- Single Number III (LC 260) — two unique elements; extend with the bit-partition trick: XOR all → get `a^b`; isolate a differing bit with `diff & (-diff)`; partition array into two groups on that bit; XOR each group to recover a and b separately.

---

### Counting Bits (popcount over a range)

Given an integer `n`, return an array `ans` of length `n + 1` where `ans[i]` is the number of 1-bits in `i`. Constraints: `0 ≤ n ≤ 10⁵`. Follow-up: achieve O(n) time without calling any built-in popcount.

**Approach:** use the recurrence `popcount(i) = popcount(i >> 1) + (i & 1)`. Right-shifting `i` removes the least-significant bit; `ans[i >> 1]` is already computed (smaller index); `(i & 1)` adds back that last bit. This gives O(1) per value using previously computed results — no Brian Kernighan O(k) loop per number, no string conversion.

```python
def count_bits(n: int) -> List[int]:
    ans = [0] * (n + 1)
    for i in range(1, n + 1):
        ans[i] = ans[i >> 1] + (i & 1)   # recurrence: strip LSB, add it back
    return ans
```

**Complexity:** O(n) time, O(n) space for the output array.

**Note:** the recurrence `popcount(i) = popcount(i >> 1) + (i & 1)` is equivalent to `popcount(i) = popcount(i & (i-1)) + 1` (Brian Kernighan form) — both give O(n) total with O(1) per number.

**Duplicate problems:**
- Number of 1 Bits (LC 191) — single-value popcount; use `n & (n-1)` Brian Kernighan loop or `bin(n).count('1')` — the exact per-number variant of this range problem.
- Hamming Distance (LC 461) — `popcount(x ^ y)`; XOR first to isolate differing bits, then count them with any popcount method.

---

### Subsets (enumerate the power set via bitmask)

Given an integer array `nums` of `n` **unique** elements, return all `2ⁿ` possible subsets (the power set). Constraints: `1 ≤ n ≤ 10`; elements are unique. Output order does not matter.

**Approach:** encode each subset as a bitmask. For `n = len(nums)`, iterate `mask` from 0 to `(1 << n) - 1`. For each mask, include `nums[i]` in the subset if bit `i` of `mask` is set. This is the direct bitmask enumeration that underpins bitmask DP — the same "state = integer encoding a subset" reasoning, applied to output generation rather than optimization.

```python
def subsets(nums: List[int]) -> List[List[int]]:
    n = len(nums)
    result = []
    for mask in range(1 << n):                          # 2^n masks
        subset = [nums[i] for i in range(n) if (mask >> i) & 1]
        result.append(subset)
    return result
```

**Complexity:** O(2ⁿ · n) time (2ⁿ masks, up to n elements each), O(2ⁿ · n) space for output.

**Duplicate problems:**
- Subsets II (LC 90) — same bitmask enumeration with duplicate elements; sort first, then skip masks that would include a duplicate at the same relative position as a prior mask.
- Letter Case Permutation (LC 784) — treat each letter as a bit (upper vs lower); enumerate all 2^(letter-count) masks, each mask selects which letters are uppercased.

---

### Number of Ways to Wear Different Hats (bitmask DP over persons)

There are `n ≤ 10` people and 40 hat types. Each person has a list of hats they like. Count the number of ways to assign each person a **different** hat (from their preferred list) such that no two people share a hat. Return the count modulo 10⁹ + 7.

**Approach:** `n ≤ 10` persons screams bitmask DP — encode "which persons have been assigned a hat" as the DP state. `dp[mask]` = number of ways to assign hats such that exactly the persons in `mask` have been assigned. Iterate hats 1..40; for each hat, update `dp[mask]` → `dp[mask | (1<<p)]` for each person `p` who likes that hat and is not yet in `mask`. Iterate masks in decreasing order within each hat's pass so each hat is used at most once (same as 0/1 knapsack ordering).

```python
from collections import defaultdict
from typing import List

def number_ways(hats: List[List[int]]) -> int:
    MOD = 10**9 + 7
    n = len(hats)
    full = (1 << n) - 1

    hat_to_persons: dict = defaultdict(list)
    for p, liked in enumerate(hats):
        for h in liked:
            hat_to_persons[h].append(p)

    dp = [0] * (1 << n)
    dp[0] = 1   # zero persons assigned: 1 way (empty assignment)

    for h in range(1, 41):
        for mask in range(full, -1, -1):   # decreasing order: each hat used at most once
            for p in hat_to_persons[h]:
                if (mask >> p) & 1:        # person p already has a hat in this mask
                    dp[mask] = (dp[mask] + dp[mask ^ (1 << p)]) % MOD

    return dp[full]
```

**Complexity:** O(40 · 2ⁿ · n) time, O(2ⁿ) space. At n = 10: 40 × 1024 × 10 = 409,600 operations.

**Duplicate problems:**
- Assign K Workers to Jobs (bitmask DP variants with n ≤ 20) — same "assign distinct resource to each person" structure; the DP transition is identical, only the cost function changes.
- Minimum XOR Sum of Two Arrays (LC 1879) — assign elements of array B to array A one-to-one to minimize total XOR; bitmask DP where `mask` encodes which B elements have been assigned; same 0/1-knapsack mask iteration.

---

### Find Minimum Time to Finish All Jobs (bitmask DP with min-max objective)

You are given an integer array `jobs` where `jobs[i]` is the amount of time it takes to complete the i-th job. There are `k` workers. Split the jobs among the workers to minimize the maximum working time of any worker. Constraints: `1 ≤ k ≤ jobs.length ≤ 12`, `1 ≤ jobs[i] ≤ 10⁷`.

**Approach:** Bitmask DP. Precompute `total[mask]` = sum of job times for the subset represented by `mask`. Then `dp[mask]` = minimum possible "last worker's load" when all jobs in `mask` are assigned optimally across the fewest workers possible. Enumerate submasks to fill the DP: for each `mask`, try assigning a contiguous submask `sub` of jobs to a single worker with load `total[sub]`; the remaining jobs `mask ^ sub` are assigned to previous workers with cost `dp[mask ^ sub]`. Take `max` to capture the worst-case worker load and minimize over all such splits. `n ≤ 12` → 2¹² = 4096 states, and subset enumeration totals O(3¹²) ≈ 531K iterations — fully feasible.

```python
from typing import List

def minimumTimeRequired(jobs: List[int], k: int) -> int:
    n = len(jobs)
    total = [0] * (1 << n)
    for mask in range(1, 1 << n):
        lsb = mask & (-mask)
        bit = lsb.bit_length() - 1
        total[mask] = total[mask ^ lsb] + jobs[bit]

    # dp[mask] = min max-load when jobs in mask are assigned to minimum workers
    INF = float('inf')
    dp = [INF] * (1 << n)
    dp[0] = 0

    for mask in range(1, 1 << n):
        sub = mask
        while sub:
            dp[mask] = min(dp[mask], max(dp[mask ^ sub], total[sub]))
            sub = (sub - 1) & mask

    return dp[(1 << n) - 1]
```

**Complexity:** O(3ⁿ + 2ⁿ) time — subset enumeration dominates; O(2ⁿ) space.

**Duplicate problems:**
- LC 1986 Minimum Number of Work Sessions to Finish the Tasks — identical bitmask DP shape, different framing (sessions vs workers).
- LC 2305 Fair Distribution of Cookies — same min-max bitmask DP with k buckets.
