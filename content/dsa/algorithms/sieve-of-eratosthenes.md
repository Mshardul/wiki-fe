# Sieve of Eratosthenes

## Prerequisites

- [Array](../data-structures/array.md) [Must read] - the sieve is a boolean array indexed by value; marking multiples is index arithmetic over it.
- [Number Theory](./number-theory.md) [Should read] - the hub explaining where the sieve sits in the contest math toolkit and what it precomputes for factorization and primality.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)
- [Intuition](#intuition)
- [How it works](#how-it-works)
- [Correctness / invariant](#correctness--invariant)
- [Complexity derivation](#complexity-derivation)
- [Constraints & approach](#constraints--approach)
- [When to use / when not](#when-to-use--when-not)
- [Comparison](#comparison)
- [Key & distribution](#key--distribution)
- [Edge cases](#edge-cases)
- [Implementation](#implementation)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)

---

## What it is

The **Sieve of Eratosthenes** marks every composite number up to `n` in **O(n log log n)** by, for each prime `p` found, striking out all of its multiples starting at `p²` - whatever survives unstruck is prime. It answers "is x prime?" for **every** `x ≤ n` in one bulk pass, rather than testing each number in isolation.

> **One-liner:** Starting from 2, for every number still unmarked, mark all its multiples as composite - what's left unmarked is prime. Start marking at `p²` since everything below it is already caught by a smaller prime.

**Soundbite for interviews:** "Every composite has a prime factor at most its square root - so I only need to sieve with primes up to `√n`, and each prime `p` only needs to start crossing off at `p²`, since smaller multiples were already crossed off by smaller primes."

**Time:** O(n log log n) - see derivation below. **Space:** O(n) for the boolean array.

---

## Intuition

Testing a single number `x` for primality by trial division costs O(√x) - check every candidate divisor up to `√x`. Doing that for **every** number from 2 to `n` costs `O(n·√n)`, which is roughly `10^10` operations for `n = 10^7` - far too slow.

The sieve flips the question. Instead of asking "is 17 prime?" one number at a time, it asks "which numbers does 2 rule out? Which does 3 rule out? Which does 5 rule out?" - and answers all of them **simultaneously** by marking multiples in a single array.

**The key structural fact:** every composite number `c ≤ n` has **at least one** prime factor `p ≤ √c ≤ √n`. So you never need to sieve with a prime larger than `√n` - once you've crossed off all multiples of every prime up to `√n`, every remaining unmarked number above that point must be prime (if it had a factor, that factor would be ≤ its own square root, and would have already been used to cross it off).

**Why start at `p²`, not `2p`:** when processing prime `p`, every smaller multiple of `p` - `2p, 3p, ..., (p-1)p` - has already been marked, because each of those has a prime factor smaller than `p` (e.g., `2p` was marked when processing `2`; `(p-1)·p`, if `p-1` is composite, was marked by one of its own prime factors, all smaller than `p`). The **first** multiple of `p` that hasn't already been struck by a smaller prime is `p × p = p²`.

This is the same "iterate over structure, not magnitude" theme that runs through the number-theory toolkit: instead of testing each number's magnitude individually (trial division per number), the sieve exploits the **structure of composite numbers** - that every composite decomposes into smaller prime factors - to knock out huge swaths in one shared pass.

---

## How it works

### Step-by-step trace: sieve up to n = 30

Start with all of 2..30 marked "prime" (unmarked = candidate prime), then cross off multiples starting from each prime found, beginning at `p²`.

```
Initial (2..30, all unmarked = assumed prime):
2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30

p = 2 (2² = 4 ≤ 30): mark 4, 6, 8, 10, 12, ... (every multiple of 2 from 4 on)
2  3  X  5  X  7  X  9  X  11 X  13 X  15 X  17 X  19 X  21 X  23 X  25 X  27 X  29 X

p = 3 (3² = 9 ≤ 30): mark 9, 12(already), 15, 18(already), 21, 24(already), 27, 30(already)
2  3  X  5  X  7  X  X  X  11 X  13 X  X   X  17 X  19 X  X   X  23 X  X   X  27 X  29 X

p = 5 (5² = 25 ≤ 30): mark 25, 30(already)
2  3  X  5  X  7  X  X  X  11 X  13 X  X   X  17 X  19 X  X   X  23 X  X   X  X  X  29 X

p = 7: 7² = 49 > 30 → STOP (outer loop condition fails)

Surviving unmarked = primes: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29
```

**ASCII grid - marking pass by prime:**

```
        2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30
p=2:    .  .  X  .  X  .  X  .  X  .  X  .  X  .  X  .  X  .  X  .  X  .  X  .  X  .  X  .  X
p=3:    .  .  .  .  .  .  .  X  .  .  .  .  .  X  .  .  .  .  .  X  .  .  .  .  .  X  .  .  .
p=5:    .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  X  .  .  .  .  .

'.'  = not marked in this pass (already marked earlier, or not a multiple of p)
'X'  = newly marked composite in this pass

Loop stops after p=5 because 7×7=49 > 30 - no unmarked number ≤ 30 can have
its smallest prime factor exceed √30 ≈ 5.48.
```

**Invariant check per step:** after processing prime `p`, every number ≤ `p²` that is unmarked is guaranteed prime (every composite ≤ `p²` has a prime factor ≤ `p`, and all such multiples have been struck by the time `p`'s pass completes).

**Cache behavior:** the sieve is a **sequential scan over a flat boolean array** - each marking pass (`i, i+p, i+2p, ...`) strides through memory in fixed steps. For small `p` this is highly cache-friendly (short stride, hits the same cache lines repeatedly); for large `p` near `√n`, the stride grows and each mark increasingly touches a fresh cache line, but there are correspondingly fewer such primes to process, so the aggregate effect stays favorable. This contrasts sharply with pointer-chasing structures (a BST doing primality checks via repeated divisibility tests would have no such locality).

---

## Correctness / invariant

**Claim:** after the sieve completes (looping `p` from 2 to `⌊√n⌋`, marking multiples of each unmarked `p` starting at `p²`), a number `x` in `[2, n]` is unmarked if and only if `x` is prime.

**Proof, forward direction (composite ⟹ marked):** Let `x` be composite. Then `x` has a smallest prime factor `p ≤ √x ≤ √n` (if all prime factors of `x` exceeded `√x`, their product would exceed `x`, a contradiction since `x` has at least two such factors counted with multiplicity, or a single factor `p` with `x/p` also `≥ p`). Since `p ≤ √n`, the outer loop reaches `p`. Since `x` is a multiple of `p` (specifically `x = p × (x/p)` with `x/p ≥ p`, so `x ≥ p²`), `x` is marked during `p`'s pass, which starts at `p²` and covers every multiple of `p` from there on.

**Proof, reverse direction (prime ⟹ never marked):** A number `x` is only ever marked as a multiple of some `p ≤ √n` where `p < x` and `p` divides `x`. If `x` is prime, its only divisors are `1` and `x` itself - no `p < x` with `p ≠ 1` divides it. So a prime `x` is never marked.

**Invariant (maintained across the outer loop):** *after processing all primes ≤ some threshold `t`, every marked number ≤ n has a prime factor ≤ t, and every unmarked number ≤ t² is prime.* This is why the loop can safely stop once `p² > n` - beyond that point, any remaining composite would need a smallest prime factor `> √n`, which is impossible by the argument above.

---

## Complexity derivation

**Time - the harmonic-of-primes sum:**

For each prime `p ≤ √n`, the inner loop marks multiples `p², p²+p, p²+2p, ..., ≤ n`, which is `⌊(n - p²)/p⌋ + 1 ≈ n/p` operations.

Total work:

```
Σ (n/p)  for all primes p ≤ n   (summing over ALL primes up to n gives an upper bound;
                                   the sieve only sieves with p ≤ √n but the marked
                                   multiples span up to n)
      = n × Σ (1/p)  for primes p ≤ n
```

By **Mertens' second theorem**, the sum of reciprocals of primes up to `n` is:

```
Σ (1/p) for primes p ≤ n  =  log log n + M + o(1)     (M = Meissel-Mertens constant ≈ 0.2615)
```

This is the non-obvious number-theoretic fact that makes the whole derivation work: the sum of reciprocals of primes grows like `log log n` - **far** slower than the harmonic series `Σ(1/k) ≈ log n` over *all* integers, because primes thin out.

Substituting: total work `= n × (log log n + O(1)) = O(n log log n)`.

**Why this beats trial division:** trial division tests each of `n` numbers individually at `O(√n)` each, giving `O(n^1.5)`. The sieve instead marks multiples in bulk, and the harmonic-of-primes sum collapses the total work to `O(n log log n)` - for `n = 10^7`, `log log n ≈ 2.9`, so the sieve does roughly `3 × 10^7` operations versus trial division's `~3 × 10^10`.

**Space:** O(n) for the boolean array - this is the dominant practical constraint, not the time. At `n = 10^8`, a naive `bool` array (1 byte per entry in most languages) costs 100 MB; a bitset packs it to 12.5 MB.

**Total:** O(n log log n) time, O(n) space (O(n/8) with bit-packing).

---

## Constraints & approach

| Constraint                                      | Complexity                     | Approach                                                                                     |
| ------------------------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------- |
| `n ≤ 10^7`                                       | O(n log log n), O(n) space       | Plain sieve - fits comfortably in memory and time (~30M ops, ~10MB with bit-packing)              |
| `n ≤ 10^9` and only need is-prime for a bulk range | O(n log log n) time, O(√n range width) memory | **Segmented sieve** - sieve small blocks of size `√n` at a time using primes up to `√n`, discard each block after use |
| Single number up to `10^18`, one-off primality test | O(log³ n) per test              | **Miller-Rabin** probabilistic primality test - sieving is wrong tool for a single huge query    |
| Need factorization of every number ≤ n, not just is-prime | O(n) precompute, O(log n) per factorization | **Linear sieve** - track smallest prime factor (SPF) per number in O(n), then repeatedly divide by SPF to factorize in O(log n) |
| Need Euler's totient φ(k) for every k ≤ n         | O(n log log n)                   | Modify the sieve to compute φ alongside primality (multiplicative-function sieve)                |
| Counting primes in `[L, R]` where `R` up to `10^12`, `R - L ≤ 10^6` | O((R-L) log log R)      | Segmented sieve over just the `[L, R]` window using base primes up to `√R`                        |

**Reading the constraint:** `n ≤ 10^7`-`10^8` is the decisive signal for "plain sieve, fits in memory." Past `10^9` for a full range, memory becomes the bottleneck before time does - that's when a segmented sieve or bit-packing becomes mandatory, not optional. A single huge number, regardless of size, is never a sieve problem - that's Miller-Rabin's territory.

---

## When to use / when not

**Use the Sieve of Eratosthenes when:**

- You need primality or factorization info for **many** numbers up to a bound `n` - "count primes below 10^6", "list all primes up to n", "for every k ≤ n, is it prime?"
- You need **fast repeated factorization** - precompute smallest-prime-factor (linear sieve variant) once in O(n), then factorize any number ≤ n in O(log n) by repeated division.
- Precomputing number-theoretic building blocks for combinatorics mod a prime - factorial arrays used alongside [Modular Exponentiation](./modular-exponentiation.md) for `C(n,k) mod p`.
- Computing Euler's totient, Möbius function, or other multiplicative functions in bulk across a range.

**Do not use the sieve when:**

- You need to test **one** very large number (say `10^18`) for primality - sieving up to `10^18` is impossible (the array alone would need exabytes). Use **Miller-Rabin** (probabilistic, O(log³ n) per test, deterministic for `n < 3.3 × 10^{24}` with a fixed witness set).
- `n` is large enough that even O(n) memory doesn't fit (e.g., `n = 10^12` for a full sieve) - use a **segmented sieve** restricted to the specific range you need, sieved with base primes up to `√n`.
- You only need the factorization of a handful of specific large numbers, not a bulk range - trial division or Pollard's rho on those specific numbers is cheaper than sieving the entire range up to them.

**Real-world usage:** cryptographic key generation (RSA, Diffie-Hellman) needs large primes, but generates candidates and tests them individually with Miller-Rabin - the sieve isn't used at that scale (primes there are ~600+ decimal digits, far beyond any feasible sieve range). Where the sieve genuinely shows up in practice: precomputed prime tables in number-theory libraries (SymPy, PARI/GP) sieve up to a reasonable bound (often `10^6`-`10^8`) once at startup or on first use, then serve primality/factorization queries from that table. **At scale:** past `n ~ 10^9`, the O(n) memory requirement becomes the actual bottleneck (not the O(n log log n) time) - a 1-byte-per-entry array at `n = 10^9` is already a full gigabyte, forcing either bit-packing (8× reduction) or a segmented approach that never materializes the whole range at once.

---

## Comparison

| Method                          | Time (for range up to n)     | Space         | What it answers                              | Pick it when…                                                                              |
| -------------------------------- | ------------------------------- | -------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Sieve of Eratosthenes** (this)  | O(n log log n)                  | O(n)           | Primality + list of all primes ≤ n            | Bulk queries up to a bound that fits in memory (n ≲ 10^8); always the default choice here    |
| **Trial division per number**    | O(n√n) for all of 1..n; O(√x) single | O(1)      | Primality of a single number x                | Only need ONE number's primality and n is modest (x ≲ 10^12); crossover: sieve wins the moment you need more than a handful of queries |
| **Linear sieve (smallest prime factor)** | O(n)                     | O(n)           | Primality + O(log n) factorization per number | You need to factorize many numbers ≤ n repeatedly, not just test primality; crossover: worth the extra bookkeeping only when factorization (not just is-prime) is the actual goal |
| **Segmented sieve**              | O((R-L) log log R)              | O(√R + (R-L))  | Primality within a specific window `[L, R]`   | The window is large in value (R up to 10^12) but narrow in width, or the full 1..n array won't fit in memory |
| **Miller-Rabin (probabilistic)** | O(k log³ n) for k rounds        | O(1)           | Primality of one large number                | n itself exceeds any feasible sieve bound (n > 10^9-10^12); crossover: this is the ONLY viable option once a single query's n exceeds sieve-able memory |

---

## Key & distribution

*(Family: **Distribution**.)*

**What the key is:** the key is the **integer value itself** - the sieve indexes a boolean array directly by value (`is_composite[x]`), not by a hash or comparison. This is what lets it sidestep the comparison-based lower bound entirely: it never asks "is a < b?", it asks "does index x have a mark?" - an O(1) array read.

**Key range `k`:** the range is `[2, n]` - the full span of values being tested. The space cost is exactly this range: O(n) bits (or bytes) regardless of how many actual primes exist within it. This is the same "space paid for by the key range, not the data size" trade that counting sort and radix sort make - here the "count" per key is binary (prime or not), rather than a frequency tally.

**Why it sidesteps the comparison lower bound:** the Ω(n log n) comparison-sort lower bound applies to algorithms that only learn information by comparing elements. The sieve never compares two candidate primes to each other - it directly computes, via index arithmetic (`i, i+p, i+2p, ...`), which values are composite. Like counting sort, it exploits **direct addressing** into a range-sized array instead of pairwise comparison, buying a better-than-comparison bound (`O(n log log n)` here, versus `O(n log n)` for a comparison-based approach to the same bulk-primality problem) at the cost of O(n) space tied to the value range, not the input count.

**The distribution mechanism:** for each prime `p` found, values are marked at a fixed stride `p` starting from `p²` - this is a *distribution by arithmetic progression* rather than by bucket-of-digit (radix sort) or bucket-of-range (bucket sort), but the shared DNA is the same: **exploit a known structural fact about the key space** (multiples of p are evenly spaced; every composite has a small prime factor) to avoid pairwise comparisons.

---

## Edge cases

1. **`n < 2`:** there are no primes below 2. `sieve(0)` or `sieve(1)` should return an empty list without attempting to size a negative or zero-length inner range. Guard explicitly: if `n < 2`, return `[]` immediately.

2. **`n = 2`:** the smallest prime. The outer loop condition `p × p ≤ n` (i.e., `4 ≤ 2`) is false immediately, so no marking occurs - correctly leaves 2 marked as prime (the initial assumption).

3. **Off-by-one in the marking start:** starting the inner loop at `2p` instead of `p²` still produces a correct sieve (just does redundant work re-marking already-marked multiples) - but starting at `p` itself would incorrectly mark `p` as composite (a multiple of itself), erasing every prime. The correct start is `p²`, or at minimum `2p` if simplicity is preferred over the tighter bound.

4. **Outer loop bound:** the outer loop must run `p` from 2 to `⌊√n⌋` **inclusive** - using `p < √n` (strict) instead of `p ≤ √n` can skip the case where `√n` itself is prime and needs its multiples marked (e.g., `n = 25`: `√25 = 5` exactly, and `5`'s only unmarked multiple ≤ 25 at that point is `25` itself, which must be marked). Implementations typically use `p * p <= n` to avoid floating-point `sqrt` imprecision entirely.

5. **Integer overflow on `p * p`:** for `n` near the maximum representable integer (relevant in 32-bit environments, less so in Python), computing `p * p` for `p` near `√n` can overflow a fixed-width integer type before the comparison `p*p <= n` is even evaluated. Python's arbitrary-precision integers make this a non-issue; C/C++/Java with `int` need to either use a wider type for the comparison or bound `p` by an explicit integer square root computed safely.

6. **Memory blowup for large n:** a naive `list[bool]` in Python or `vector<bool>` in naive form can consume far more than the theoretical 1-bit-per-entry - Python's `list` of booleans is actually a list of pointers to `True`/`False` objects, costing ~28 bytes per entry, not 1 bit. For `n = 10^8`, that's 2.8 GB, not 12.5 MB. Use a `bytearray` (1 byte/entry) or a true bitset for large `n` in Python; C++'s `vector<bool>` is already bit-packed but has known performance quirks from that packing.

**Common misconceptions:**

- *"The sieve tests each number for primality individually, just faster."* False - it never tests a number directly. It only ever marks multiples of already-confirmed primes; a number surviving unmarked is inferred prime by the absence of any factor having struck it, not by direct testing.
- *"You need to sieve with every prime up to n, not just up to √n."* False and a common source of wasted work - once `p > √n`, any composite `≤ n` still unmarked would need a smallest prime factor `> √n`, which is impossible (its cofactor would then be `< √n`, contradicting "smallest"). Stopping at `√n` is not an optimization, it's the point at which continuing would provably do nothing.

---

## Implementation

### Pseudocode (CLRS style)

```
SIEVE-OF-ERATOSTHENES(n)
  ▷ Returns a boolean array is_prime[0..n], O(n log log n) time, O(n) space
  ▷ Requires: n ≥ 0
  let is_prime[0..n] be a new array
  for i = 0 to n
      is_prime[i] ← TRUE
  is_prime[0] ← FALSE
  if n ≥ 1
      is_prime[1] ← FALSE
  for p = 2 to ⌊√n⌋
      if is_prime[p] = TRUE
          for multiple = p × p to n by p        ▷ start at p², stride by p
              is_prime[multiple] ← FALSE
  return is_prime
```

### Python - from-scratch plain sieve

```python
def sieve(n: int) -> list[bool]:
    """
    Sieve of Eratosthenes: is_prime[i] is True iff i is prime, for 0 <= i <= n.
    O(n log log n) time, O(n) space.
    """
    if n < 2:
        return [False] * (n + 1)
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False
    p = 2
    while p * p <= n:
        if is_prime[p]:
            for multiple in range(p * p, n + 1, p):   # start at p^2, stride p
                is_prime[multiple] = False
        p += 1
    return is_prime


def primes_up_to(n: int) -> list[int]:
    """List of primes <= n, built from the sieve."""
    is_prime = sieve(n)
    return [i for i, prime in enumerate(is_prime) if prime]
```

### Python - linear sieve (smallest prime factor, O(n))

```python
def linear_sieve(n: int) -> tuple[list[int], list[int]]:
    """
    Linear sieve: O(n) time (each composite marked exactly once, by its
    SMALLEST prime factor). Returns (primes, spf) where spf[i] is the
    smallest prime factor of i - enables O(log i) factorization afterward.
    """
    spf = [0] * (n + 1)          # smallest prime factor of i
    primes: list[int] = []
    for i in range(2, n + 1):
        if spf[i] == 0:            # i has no smaller factor found yet -> prime
            spf[i] = i
            primes.append(i)
        for p in primes:
            if p > spf[i] or i * p > n:
                break               # KEY: stop once p exceeds i's smallest factor
            spf[i * p] = p          # i*p's smallest prime factor is p, by construction
    return primes, spf


def factorize(x: int, spf: list[int]) -> list[int]:
    """Factorize x in O(log x) using a precomputed smallest-prime-factor table."""
    factors = []
    while x > 1:
        factors.append(spf[x])
        x //= spf[x]
    return factors
```

### Python - bit-packed sieve for large n (memory-efficient)

```python
def sieve_bytearray(n: int) -> bytearray:
    """
    Same algorithm, but backed by a bytearray (1 byte/entry, not ~28 bytes
    per Python bool object in a list). For n = 10^8: ~100MB vs ~2.8GB.
    """
    if n < 2:
        return bytearray(n + 1)
    is_prime = bytearray([1]) * (n + 1)
    is_prime[0] = is_prime[1] = 0
    p = 2
    while p * p <= n:
        if is_prime[p]:
            span = is_prime[p * p :: p]           # one slice, reused for both length and clear
            is_prime[p * p :: p] = bytearray(len(span))
        p += 1
    return is_prime
```

### Python - segmented sieve for a range `[L, R]`

```python
import math

def segmented_sieve(L: int, R: int) -> list[int]:
    """
    Primes in [L, R] where R can be up to ~10^12, as long as R - L is modest.
    Uses base primes up to sqrt(R) to sieve the (small) window directly.
    """
    limit = int(math.isqrt(R)) + 1
    base_primes = primes_up_to(limit)          # small sieve, reused above

    is_prime = [True] * (R - L + 1)
    if L == 0:
        is_prime[0] = False
    if L <= 1 <= R:
        is_prime[1 - L] = False

    for p in base_primes:
        start = max(p * p, ((L + p - 1) // p) * p)   # first multiple of p >= L, >= p^2
        for multiple in range(start, R + 1, p):
            is_prime[multiple - L] = False

    return [L + i for i, prime in enumerate(is_prime) if prime]
```

### Contest one-liner - sympy (not for hot paths, but valid for scripting)

```python
from sympy import primerange
list(primerange(2, 31))   # [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
```

---

## What the interviewer probes for

- **"Why do you only need to sieve up to `√n`?"** - Because any composite `x ≤ n` has a prime factor `p ≤ √x ≤ √n` (if all its prime factors exceeded `√x`, their product would exceed `x`). So sieving with every prime up to `√n` guarantees every composite up to `n` gets struck by at least one of them; primes beyond `√n` would only re-strike numbers already caught.

- **"Why start marking at `p²` instead of `2p`?"** - Every smaller multiple of `p` (`2p, 3p, ..., (p-1)p`) already has a prime factor smaller than `p`, so it was already marked in an earlier pass. `p²` is the first multiple of `p` whose *smallest* prime factor is `p` itself - everything before it in the multiples-of-`p` sequence was redundant to re-mark.

- **"Can you get this down to O(n)?"** - Yes, the **linear sieve**: track the smallest prime factor of each composite, and ensure each composite is marked exactly once by iterating known primes in increasing order and breaking as soon as the current prime exceeds the number's own smallest factor. This is more bookkeeping for a constant-factor gain (`log log n` is already tiny, ~3-4 for realistic n) - worth it mainly when you also want O(log n) factorization per number afterward, not for the raw is-prime speedup alone.

- **"What if n is too large to fit the sieve array in memory?"** - Two options depending on the actual need: (1) if you need primality across a **narrow window** `[L, R]` where R is huge but `R - L` is small, use a **segmented sieve** - sieve the window using base primes up to `√R`, which themselves fit a small standard sieve. (2) if you need a **single** large number's primality and can't sieve at all, switch tools entirely to **Miller-Rabin**, which is O(log³ n) per test regardless of how large n is.

- **"How would you compute Euler's totient for every number up to n?"** - Extend the same sieve structure: initialize `phi[i] = i`, and during the marking pass for prime `p`, for each multiple update `phi[multiple] -= phi[multiple] // p` (the standard multiplicative-function sieve trick) - same O(n log log n) time, computing an entire array of totients in one pass rather than calling Euler's formula per number.

- **"Can you shave off more of the constant factor?"** - Yes, via a **wheel** (wheel factorization): since every prime beyond 2 and 3 is of the form `6k ± 1`, you can skip 4 out of every 6 candidates entirely - store only positions coprime to a small "wheel" of primes (typically 2, 3, and sometimes 5), roughly halving to two-thirds the array size and the number of marking operations. This doesn't change the O(n log log n) asymptotic complexity - it's a constant-factor win (~2-3x in practice), which is exactly the distinction a senior candidate draws: "the Big-O doesn't change, but the wheel cuts real wall-clock time in half," useful when a contest's time limit is tight even though the algorithm is asymptotically correct.

---

## Practice problems

### 1. Count Primes - LC 204

**Problem:** Given an integer `n`, return the number of prime numbers strictly less than `n`. Constraints: `0 ≤ n ≤ 5 × 10^6`.

**Approach:** Textbook sieve application - build the boolean array up to `n - 1` and count `True` entries. The constraint (`n` up to 5 million) is the direct signal: trial division per number (`O(n√n)`) would be too slow, but a single sieve pass (`O(n log log n)`) comfortably fits the time limit.

```python
def countPrimes(n: int) -> int:
    if n < 3:
        return 0
    is_prime = [True] * n
    is_prime[0] = is_prime[1] = False
    p = 2
    while p * p < n:
        if is_prime[p]:
            for multiple in range(p * p, n, p):
                is_prime[multiple] = False
        p += 1
    return sum(is_prime)
```

**Complexity:** O(n log log n) time, O(n) space.

**Duplicate problems:**
- Four Divisors (LC 1390) - needs factorization per number rather than a raw count; solved with the linear-sieve SPF variant instead of the plain count-only sieve.

---

### 2. Prime Factorization via Smallest Prime Factor

**Problem:** Given `q` queries, each asking for the full prime factorization of a number `x_i` where `1 ≤ x_i ≤ n ≤ 10^6` and `1 ≤ q ≤ 10^5`, answer each query efficiently. Naive per-query trial division (`O(√x)` each) risks `10^5 × 10^3 = 10^8` operations - borderline, and much worse if `n` were larger.

**Approach:** Precompute the smallest-prime-factor (SPF) table once via the linear sieve in O(n). Each query then factorizes by repeatedly dividing by the SPF, which takes O(log x) steps since each division at least halves the remaining value (the smallest prime factor is always ≥ 2). This converts a per-query O(√x) cost into O(log x), and amortizes the sieve's one-time O(n) cost across all queries.

```python
def linear_sieve(n: int) -> list[int]:
    spf = [0] * (n + 1)
    primes = []
    for i in range(2, n + 1):
        if spf[i] == 0:
            spf[i] = i
            primes.append(i)
        for p in primes:
            if p > spf[i] or i * p > n:
                break
            spf[i * p] = p
    return spf

def factorize(x: int, spf: list[int]) -> list[int]:
    factors = []
    while x > 1:
        factors.append(spf[x])
        x //= spf[x]
    return factors

# Usage
spf = linear_sieve(10**6)
print(factorize(360, spf))   # [2, 2, 2, 3, 3, 5]
```

**Complexity:** O(n) one-time precompute, O(log x) per factorization query.

**Duplicate problems:**
- Smallest Factorization (LC 625) - direct single-number factorization; the SPF table generalizes it to many queries at once.
- Count Primes with factor constraints (various contest variants) - same SPF-table precompute pattern.

---

### 3. Prime Range Query (segmented sieve)

**Problem:** Given a range `[L, R]` where `1 ≤ L ≤ R ≤ 10^12` and `R - L ≤ 10^6`, count how many primes lie in `[L, R]`.

**Approach:** A full sieve up to `10^12` is impossible (would need ~1TB+ of memory even bit-packed). But since the *window width* is only `10^6`, a **segmented sieve** solves it: first sieve base primes up to `√R ≈ 10^6` with a standard small sieve, then use those base primes to mark composites directly within the `[L, R]` window (an array sized only `R - L + 1`, not `R`). This is the textbook case where the constraint's two dimensions - the huge upper bound `R` and the narrow window width - point to two different tools working together: a plain sieve for the small base-prime range, a segmented pass for the actual query range.

```python
import math

def count_primes_in_range(L: int, R: int) -> int:
    limit = int(math.isqrt(R)) + 1
    base_is_prime = [True] * (limit + 1)
    base_is_prime[0:2] = [False, False]
    for p in range(2, int(math.isqrt(limit)) + 1):
        if base_is_prime[p]:
            for multiple in range(p * p, limit + 1, p):
                base_is_prime[multiple] = False
    base_primes = [i for i, is_p in enumerate(base_is_prime) if is_p]

    window = [True] * (R - L + 1)
    if L == 0:
        window[0] = False
    if L <= 1 <= R:
        window[1 - L] = False

    for p in base_primes:
        start = max(p * p, ((L + p - 1) // p) * p)
        for multiple in range(start, R + 1, p):
            window[multiple - L] = False

    return sum(window)

print(count_primes_in_range(10**12, 10**12 + 100))
```

**Complexity:** O(√R log log √R) for the base sieve + O((R-L) log log R) for the window pass; O(√R + (R-L)) space - crucially independent of R itself.

**Duplicate problems:**
- Closest prime pairs in a range (various contest variants) - same segmented-sieve setup, different final aggregation over the surviving primes.
