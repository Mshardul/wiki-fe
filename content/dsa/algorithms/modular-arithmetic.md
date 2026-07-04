# Modular Arithmetic

## Prerequisites

- [Number Theory](./number-theory.md) [Must read] - the hub that surveys the contest math toolkit and positions modular arithmetic within it
- [Bit Manipulation](./bit-manipulation.md) [Must read] - binary exponentiation reads individual bits of the exponent with the same shift-and-test loop
- [Binary Search](./binary-search.md) [Must read] - halving-per-step complexity argument appears in both; O(log n) intuition transfers directly

## Table of Contents

- [What it is](#what-it-is)
- [Intuition](#intuition)
- [How it works](#how-it-works)
- [Correctness / invariant](#correctness--invariant)
- [Complexity derivation](#complexity-derivation)
- [Constraints & approach](#constraints--approach)
- [When to use / when not](#when-to-use--when-not)
- [Comparison](#comparison)
- [Modular arithmetic identities](#modular-arithmetic-identities)
- [Edge cases](#edge-cases)
- [Implementation](#implementation)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)

---

## What it is

**Modular arithmetic** is arithmetic performed on a "clock face" - after every operation you wrap around at a fixed modulus `m`, so all values stay in the range `[0, m-1]`. Formally, `a mod m` is the remainder when `a` is divided by `m`; two numbers are *congruent modulo m* (written `a ≡ b (mod m)`) when they differ by a multiple of m.

> **One-liner:** Add, subtract, multiply, and exponentiate integers while keeping every result bounded - the technique that lets you compute `3^10^100 mod 10^9+7` in microseconds instead of years.

**Soundbite for interviews:** "Modular arithmetic gives you the last-digit behavior of a computation without carrying the full number - take mod at every step because `(a op b) mod m = ((a mod m) op (b mod m)) mod m`."

---

## Intuition

Picture a 12-hour clock. At 11 o'clock, adding 3 hours gives 2 - not 14. The result *wraps*. Modular arithmetic formalizes this: the "clock size" is the modulus `m`, and every result lives on that clock.

The killer property is **homomorphism**: the remainder of a sum, product, or difference equals the sum, product, or difference of the remainders.

```
(a + b) mod m  =  ((a mod m) + (b mod m)) mod m
(a × b) mod m  =  ((a mod m) × (b mod m)) mod m
```

This means you can take mod *at every step* of a computation - intermediate values never grow larger than `m-1`. Without it, computing `3^1000000 mod 10^9+7` would require a billion-digit integer. With it, every intermediate product fits in a 64-bit integer.

Three operations build on this foundation:

1. **Modular exponentiation** - compute `a^n mod m` in O(log n) by squaring
2. **Modular inverse** - find `a^(-1) mod m` (the division analogue) in O(log m)
3. **Chinese Remainder Theorem** - reconstruct a value from its remainders modulo coprime moduli

---

## How it works

### Binary (fast) exponentiation

The naive loop `result = 1; for _ in range(n): result = result * base % m` is O(n) - useless when n is 10^18. Binary exponentiation exploits the following recurrence:

```
base^n = (base^(n/2))^2          if n is even
base^n = base × base^(n-1)       if n is odd
```

Each step halves the exponent. In practice, we read the binary representation of `n` bit by bit.

**Concrete trace: `3^13 mod 7`**

First, decompose 13 in binary: `13 = 1101₂ = 8 + 4 + 1`.

```
Exponent bits (LSB → MSB):  1  0  1  1
                             ↑     ↑  ↑
                           bit0  bit2 bit3

Step-by-step (scanning from LSB to MSB):

  exp = 13 (binary 1101)
  base = 3, result = 1

  Iteration 1:  exp=13 (odd)  → result = 1 × 3        mod 7 = 3
                               base   = 3^2      mod 7 = 2
                               exp   = 13 >> 1 = 6

  Iteration 2:  exp=6  (even) → result = 3  (unchanged)
                               base   = 2^2      mod 7 = 4
                               exp   = 6  >> 1 = 3

  Iteration 3:  exp=3  (odd)  → result = 3 × 4        mod 7 = 5
                               base   = 4^2      mod 7 = 2
                               exp   = 3  >> 1 = 1

  Iteration 4:  exp=1  (odd)  → result = 5 × 2        mod 7 = 3
                               base   = 2^2      mod 7 = 4
                               exp   = 1  >> 1 = 0

  exp = 0 → done.  Answer: 3^13 mod 7 = 3
```

Verify by direct calculation: `3^13 = 1594323`. `1594323 / 7 = 227760` remainder `3`. Correct.

**Bit decomposition diagram:**

```
  n = 13 = 8 + 4 + 1
           ↓   ↓   ↓
  3^13 = 3^8 × 3^4 × 3^1

  3^1 mod 7  =  3
  3^2 mod 7  =  9 mod 7 = 2
  3^4 mod 7  =  4 mod 7 = 4    (squaring 3^2)
  3^8 mod 7  =  16 mod 7 = 2   (squaring 3^4)

  result = 3 × 4 × 2 mod 7 = 24 mod 7 = 3  ✓
           ↑bit0 ↑bit2 ↑bit3
```

### Modular inverse

Division mod m requires the *modular inverse*: `a^(-1) mod m` is the value `x` such that `a × x ≡ 1 (mod m)`.

- **When m is prime:** Fermat's little theorem says `a^(m-1) ≡ 1 (mod m)` for `a` not divisible by m. Therefore `a^(-1) ≡ a^(m-2) (mod m)`. Compute with binary exponentiation: O(log m).
- **When m is not prime:** Use the extended Euclidean algorithm, which expresses `gcd(a, m) = a·x + m·y` by back-substitution. If `gcd(a, m) = 1`, then `x mod m` is the inverse. Runtime: O(log min(a, m)).

---

## Correctness / invariant

### Loop invariant for binary exponentiation

At the start of each iteration, the following holds:

> **Invariant:** `result × base^exp ≡ original_base^original_exp (mod m)`

**Proof by induction:**

- *Initialization:* `result = 1`, `base = original_base`, `exp = original_exp`. Then `1 × original_base^original_exp = original_base^original_exp`. The invariant holds.

- *Maintenance (exp is even):* We set `base ← base²` and `exp ← exp/2`. The product `base^exp` becomes `(base²)^(exp/2) = base^exp`. `result` is unchanged. The invariant is preserved.

- *Maintenance (exp is odd):* We set `result ← result × base`, `base ← base²`, `exp ← (exp-1)/2`. The new product: `(result × base) × (base²)^((exp-1)/2) = result × base × base^(exp-1) = result × base^exp`. The invariant is preserved.

- *Termination:* `exp` halves (integer division) each iteration, so `exp` reaches 0 in at most `⌊log₂(original_exp)⌋ + 1` steps. When `exp = 0`, `base^0 = 1`, so `result × 1 = result = original_base^original_exp (mod m)`. The invariant delivers the answer.

---

## Complexity derivation

### Binary exponentiation: O(log n)

Each iteration right-shifts `exp` by 1 bit: `exp ← exp >> 1`. Starting from `n`, after `k` shifts the value is `⌊n / 2^k⌋`. The loop exits when this reaches 0, which requires:

```
⌊n / 2^k⌋ = 0  ⟺  k > log₂(n)  ⟺  k = ⌊log₂(n)⌋ + 1 iterations
```

Each iteration does O(1) work (one multiply mod m, one square mod m, one bit test). Total: **O(log n)** time, O(1) space.

### Modular inverse via Fermat: O(log m)

`a^(m-2) mod m` is binary exponentiation with exponent `m-2`. Time: O(log m).

### Sieve-based inverse precomputation: O(n) time, O(n) space

When you need inverses of all integers `1..n` for a prime modulus `p`, recomputing each with Fermat costs O(n log p). The linear sieve is faster:

```
inv[1] = 1
for i = 2 to n:
    inv[i] = -(p / i) × inv[p mod i]  mod p
```

**Why this works:** Write `p = (p / i) × i + (p mod i)`. Reduce mod p: `0 ≡ (p/i) × i + (p mod i) (mod p)`. Divide both sides by `i × (p mod i)`:

```
0 ≡ (p/i) × inv[p mod i] + inv[i]  (mod p)
inv[i] ≡ -(p/i) × inv[p mod i]     (mod p)
```

Each `inv[i]` uses a previously computed `inv[p mod i]` where `p mod i < i`. Each step is O(1). Total: **O(n)** time, **O(n)** space.

### Factorial inverse precomputation: O(n) time, O(n) space

For combinations `C(n, k) = n! / (k! × (n-k)!)` modulo a prime p:

1. Compute `fact[0..n]` in one forward pass: O(n).
2. Compute `inv_fact[n] = pow(fact[n], p-2, p)`: one Fermat call, O(log p).
3. Back-fill `inv_fact[i] = inv_fact[i+1] × (i+1)` for i from n-1 down to 0: O(n).
4. `C(n, k) = fact[n] × inv_fact[k] × inv_fact[n-k] mod p`: O(1) per query.

Total precomputation: **O(n + log p)**, queries: **O(1)**.

---

## Constraints & approach

| Input size / condition               | Expected complexity   | Approach                                                                  |
| ------------------------------------ | --------------------- | ------------------------------------------------------------------------- |
| n ≤ 10^6, answer mod p               | O(n)                  | Precompute fact + inv_fact arrays; O(1) per C(n,k) query                  |
| n ≤ 10^9, single `a^n mod p`         | O(log n)              | Binary exponentiation - `pow(a, n, p)` in Python; loop in C++             |
| n ≤ 10^18                            | O(log n)              | Binary exponentiation mandatory - repeated multiply overflows and is O(n) |
| p is prime                           | O(log p)              | Modular inverse via Fermat: `pow(a, p-2, p)`                              |
| p is **not** prime, gcd(a,p)=1       | O(log p)              | Extended Euclidean algorithm - Fermat fails for composite moduli          |
| gcd(a, p) > 1                        | N/A                   | Inverse does not exist; check before computing                             |
| "answer mod 10^9+7" in problem       | whatever the problem  | Signal: the answer grows too large to store; take mod at every step       |
| n large, p small (p ≤ 10^6)          | O(p + log n)          | Lucas' theorem: `C(n,k) = C(n mod p, k mod p) × C(n/p, k/p) mod p`      |

**Reading the constraint:** When a problem says "mod 10^9+7" or "mod a prime p", it's telling you the answer is combinatorial or exponential in the input - the *constraint is the signal* to plan for modular arithmetic from step one, not as an afterthought.

---

## When to use / when not

**Cache behavior:** Binary exponentiation operates entirely on scalar variables (`result`, `base`, `exp`) - everything fits in registers, no array is touched, and the loop is trivially cache-friendly. The linear-sieve and factorial precomputation passes are single forward (or backward) scans over a dense integer array - stride-1, sequential prefetch, maximally cache-friendly. By contrast, arbitrary `C(n, k)` queries into the factorial-inverse table are **cache-hostile when n and k are far apart**: `fact[n]`, `inv_fact[k]`, and `inv_fact[n-k]` can be separated by hundreds of kilobytes of array, each a potential L2/L3 miss. For n ≤ 10^6 the entire table fits in ~8 MB (L3 on most machines), so cold-start misses amortize away after the first sweep - but for n ≈ 10^7 the table exceeds L3 and random-query performance degrades noticeably.

**Use modular arithmetic when:**

- The problem says "output the answer modulo 10^9+7" (or any prime) - this is the universal CP signal
- Counting problems: permutations, combinations, and paths grow exponentially; keep them bounded
- Power / exponentiation of integers with large exponents (cryptography, DP transitions)
- Hashing by polynomial rolling hash uses a prime modulus to reduce collisions

**Do not use (or use with care) when:**

- You need the actual value, not the remainder - modular arithmetic destroys the magnitude. A problem asking for the *exact* count of paths cannot be answered with a mod-reduced value unless it asks for the result mod something. The canonical trap: you cannot compare two mod-reduced values to determine which original was larger.
- Checking divisibility - `a mod m == 0` checks divisibility by m, but you can't infer "is a divisible by p?" from `a mod q` for `q ≠ p`. Modular arithmetic is not a general divisibility oracle.
- Floating-point quantities - never substitute integer modular arithmetic for floating-point reasoning.
- **Prefer extended Euclidean over Fermat when the modulus might not be prime.** Using `pow(a, m-2, m)` silently gives a wrong answer if m is composite - it's the most common modular-inverse bug in contest code. Always confirm primality before applying Fermat.
- **Lucas' theorem when n ≥ p.** The factorial precomputation table breaks down when n ≥ p because `fact[p] = 0 mod p`. For combinations C(n, k) with n ≥ p, use Lucas' theorem: `C(n, k) ≡ C(n mod p, k mod p) × C(n/p, k/p) (mod p)`, recurse until arguments are < p. This is the alternative when the standard factorial table is inapplicable.

**Real-world usage:** "mod 10^9+7" is universal in competitive programming because 10^9+7 is prime, just under 2^30, and the product of any two values below it fits in a signed 64-bit integer - no intermediate overflow. At scale: RSA encryption uses modular exponentiation on 2048-bit numbers - the *same binary exponentiation algorithm*, but applied to arbitrary-precision integers by the crypto library. Every time you encrypt data in a browser, modular exponentiation runs in the TLS handshake.

---

## Comparison

| Method                           | Time (single inverse) | Time (n inverses) | Requires prime p? | Notes                                                    |
| -------------------------------- | --------------------- | ----------------- | ----------------- | -------------------------------------------------------- |
| Binary exponentiation (Fermat)   | O(log p)              | O(n log p)        | Yes               | Simplest; `pow(a, p-2, p)` in Python                     |
| Extended Euclidean               | O(log p)              | O(n log p)        | No                | Works for any modulus when `gcd(a,p)=1`                  |
| Linear sieve inverse             | O(n) total            | O(n) total        | Yes               | One-time precompute; O(1) per query after                 |
| Factorial + inverse precompute   | O(n + log p) setup    | O(1) per C(n,k)  | Yes               | Best when many combination queries                        |
| Python `pow(a, b, m)` built-in   | O(log b)              | -                 | No requirement    | Uses fast three-arg form; always prefer over `a**b % m`  |
| Naive `a ** n % m`               | O(n)                  | -                 | -                 | Catastrophic: builds full a^n in memory first             |
| BigInteger / arbitrary precision | O(n · M(n))           | -                 | -                 | Wasteful when mod suffices; only needed for exact value   |

**Crossover:** Use the linear sieve when you need inverses of *all* integers in a range (e.g., factorial inverse table). Use Fermat for *one-off* inverses. Use extended Euclidean when p might not be prime.

---

## Modular arithmetic identities

> **Family note:** Modular arithmetic sits in the **Bit/greedy** family by the spec (the binary exponentiation loop is a bit-scan loop - same shift-and-test skeleton as most bit tricks). The table below is the "Bit-tricks table" repurposed for modular identities, since mod-arith's canonical reference is a set of algebraic laws, not low-level bit patterns. The bit-manipulation connection is direct: binary exponentiation *is* bit manipulation applied to an exponent.

### Fundamental congruence properties

| Identity                                                      | Proof sketch                                                                           |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `(a + b) mod m = ((a mod m) + (b mod m)) mod m`               | Write `a = qm + r`, `b = q'm + r'`; sum = `(q+q')m + (r+r')`. Remainder of sum = remainder of `r+r'`. |
| `(a - b) mod m = ((a mod m) - (b mod m) + m) mod m`           | Same as addition; the `+m` prevents negative results in languages that allow them.     |
| `(a × b) mod m = ((a mod m) × (b mod m)) mod m`               | Expand `(qm+r)(q'm+r') = (cross terms with m) + rr'`; mod m kills cross terms.        |
| `(a / b) mod m = (a × b^(-1)) mod m`  (when inverse exists)  | Division is multiplication by the inverse; the inverse exists iff `gcd(b,m)=1`.        |
| `a^n mod m = (a mod m)^n mod m`                               | Apply multiplicative property n-1 times; basis for binary exponentiation.              |

**Property that does NOT hold:** `(a / b) mod m ≠ (a mod m) / (b mod m)` - standard integer division is not modular division. Always convert to inverse multiplication.

### Fermat's little theorem

When p is prime and `gcd(a, p) = 1`:

```
a^(p-1) ≡ 1 (mod p)
```

**Proof (group theory):** The nonzero residues `{1, 2, …, p-1}` form a multiplicative group of order `p-1`. By Lagrange's theorem, the order of any element divides the group order, so `a^(p-1) = 1`. ∎

**Corollary (modular inverse):** `a^(-1) ≡ a^(p-2) (mod p)`. This follows immediately: `a × a^(p-2) = a^(p-1) ≡ 1 (mod p)`.

### Extended Euclidean algorithm

For non-prime modulus (or any modulus), the extended Euclidean algorithm finds `x, y` such that:

```
a·x + m·y = gcd(a, m)
```

If `gcd(a, m) = 1`, then `a·x ≡ 1 (mod m)`, so `x mod m` is the modular inverse of `a`. The algorithm is a simple recursion on `gcd(a, m) = gcd(m, a mod m)`, back-substituting at each step.

```
EXTENDED-GCD(a, m):
  if m == 0:
    return a, 1, 0            ▷ gcd = a, coefficients: a·1 + 0·0 = a
  g, x, y ← EXTENDED-GCD(m, a mod m)
  return g, y, x - (a / m)·y  ▷ back-substitute
```

Runtime: O(log min(a, m)) - same as Euclidean GCD.

### Chinese Remainder Theorem (CRT)

Given pairwise coprime moduli `m₁, m₂, …, mₖ` and remainders `r₁, r₂, …, rₖ`, CRT guarantees a unique solution `x` modulo `M = m₁ × m₂ × ⋯ × mₖ` such that `x ≡ rᵢ (mod mᵢ)` for all i.

**Construction:** Let `Mᵢ = M / mᵢ`. Compute `yᵢ = Mᵢ^(-1) mod mᵢ` (modular inverse). Then:

```
x = (Σ rᵢ × Mᵢ × yᵢ) mod M
```

**When it applies:** Combine results computed modulo several small primes (avoids big-number arithmetic). Also appears when a problem has constraints over multiple independent cycles.

---

## Edge cases

1. **Negative subtraction result in C++ / Java:** `(a - b) % m` can be negative when `a < b`. The fix: `((a - b) % m + m) % m`. Python's `%` operator always returns a non-negative result (it uses floored division), so this is not needed in Python - but you *must* apply it in C++ and Java.

2. **Integer overflow on multiplication in C++:** If `a` and `b` are both up to `10^9`, then `a * b` overflows a 32-bit `int` (max ~2×10^9). Use `long long` (64-bit). Even with `long long`, `a * b * c` for three values near `10^9` can overflow - intermediate-mod after each multiplication.

3. **Modular inverse of 0 does not exist:** `0` has no multiplicative inverse mod any m. Before computing an inverse, check that the argument is nonzero (and for non-prime m, check `gcd(a, m) == 1`).

4. **Fermat's little theorem fails for composite m:** `a^(m-1) mod m ≠ 1` in general when m is not prime (except for Carmichael numbers, which are a rare pathology). For a composite modulus, use the extended Euclidean algorithm.

5. **Off-by-one in factorial inverse precomputation:** Computing `inv_fact[n]` requires `fact[n]` to already be computed. Ensure the forward pass goes all the way to `n` (inclusive), and the backward pass starts from `n-1` and goes down to `0`. An array declared `fact[n]` in C++ holds indices 0..n-1, not 0..n - use `fact[n+1]`.

6. **Using `a ** b % m` in Python (CP trap):** Python's `**` builds the full `a^b` as an arbitrary-precision integer before applying `%`. For large b, this is catastrophically slow. Always use `pow(a, b, m)` - Python's three-argument `pow` uses binary exponentiation internally.

---

## Implementation

### Pseudocode

```
MODPOW(base, exp, mod)
  ▷ Compute base^exp mod, mod in O(log exp) time
  result ← 1
  base ← base mod mod            ▷ reduce base; handles base ≥ mod
  while exp > 0
      if exp is odd              ▷ test lowest bit: exp & 1
          result ← result × base mod mod
      base ← base × base mod mod ▷ square for next bit
      exp ← exp >> 1             ▷ shift to next bit
  return result

MODINV-FERMAT(a, p)
  ▷ Modular inverse of a modulo prime p via Fermat's little theorem
  ▷ Requires: p prime, gcd(a,p) = 1
  return MODPOW(a, p - 2, p)

EXTENDED-GCD(a, b)
  ▷ Returns (g, x, y) such that a·x + b·y = g = gcd(a, b)
  if b == 0
      return a, 1, 0
  g, x, y ← EXTENDED-GCD(b, a mod b)
  return g, y, x - (a / b) × y

MODINV-GENERAL(a, m)
  ▷ Modular inverse of a modulo m (m need not be prime)
  g, x, _ ← EXTENDED-GCD(a mod m, m)
  if g ≠ 1
      error "inverse does not exist: gcd(a, m) ≠ 1"
  return (x mod m + m) mod m     ▷ normalize to [0, m-1]
```

### Python

```python
def modpow(base: int, exp: int, mod: int) -> int:
    """Binary exponentiation: base^exp mod mod, O(log exp)."""
    # In contests, just use pow(base, exp, mod) - Python's built-in is this.
    result = 1
    base %= mod
    while exp > 0:
        if exp & 1:
            result = result * base % mod
        base = base * base % mod
        exp >>= 1
    return result


def modinv_prime(a: int, p: int) -> int:
    """Modular inverse of a mod prime p via Fermat's little theorem."""
    return pow(a, p - 2, p)   # pow(a, b, m) is the contest idiom


def extended_gcd(a: int, b: int) -> tuple[int, int, int]:
    """Returns (g, x, y) such that a*x + b*y = g = gcd(a, b)."""
    if b == 0:
        return a, 1, 0
    g, x, y = extended_gcd(b, a % b)
    return g, y, x - (a // b) * y


def modinv_general(a: int, m: int) -> int:
    """Modular inverse of a mod m for any modulus m (requires gcd(a,m)=1)."""
    g, x, _ = extended_gcd(a % m, m)
    if g != 1:
        raise ValueError(f"Inverse does not exist: gcd({a}, {m}) = {g}")
    return (x % m + m) % m


def precompute_factorials(n: int, p: int) -> tuple[list[int], list[int]]:
    """
    Precompute fact[0..n] and inv_fact[0..n] modulo prime p.
    O(n + log p) setup; O(1) per C(n,k) query after.
    """
    fact = [1] * (n + 1)
    for i in range(1, n + 1):
        fact[i] = fact[i - 1] * i % p

    inv_fact = [1] * (n + 1)
    inv_fact[n] = pow(fact[n], p - 2, p)
    for i in range(n - 1, -1, -1):
        inv_fact[i] = inv_fact[i + 1] * (i + 1) % p

    return fact, inv_fact


def comb(n: int, k: int, fact: list[int], inv_fact: list[int], p: int) -> int:
    """C(n, k) mod p using precomputed factorial tables. O(1)."""
    if k < 0 or k > n:
        return 0
    return fact[n] * inv_fact[k] % p * inv_fact[n - k] % p
```

---

## What the interviewer probes for

- **"Why not just compute `a**b` and then take mod?"** - For large b, `a**b` is an astronomically large integer (billions of digits). Python builds it in memory before applying `%`; the memory and time cost is O(b·log a) bit-operations. Binary exponentiation keeps every intermediate value below m, so the bit-width never grows - O(log b) multiplications of numbers each at most `~log m` bits wide.

- **"What if the modulus isn't prime?"** - Fermat's little theorem requires p prime. For composite m, use the extended Euclidean algorithm. The inverse exists iff `gcd(a, m) = 1` - if the modulus and the value share a common factor, no inverse exists (analogous to: you can't divide 6 by 4 and get an integer, because they share factor 2).

- **"How do you compute `n! mod p` for large n?"** - Two cases. If n < p: precompute `fact[0..n]` in O(n), done. If n ≥ p: by Wilson's theorem, `p!` contains p as a factor so `p! ≡ 0 (mod p)` - and `n!` for n ≥ p is also `0 mod p`. For combinations `C(n, k)` when n ≥ p, use Lucas' theorem: `C(n, k) ≡ C(n mod p, k mod p) × C(n/p, k/p) (mod p)`.

- **"How do you handle `(a - b) mod m` safely in C++?"** - Use `((a % m) - (b % m) + m) % m`. The `+m` ensures the intermediate can never be negative. In Python, `(a - b) % m` is always correct because Python's `%` returns `[0, m-1]` by definition.

- **"What is the significance of 10^9+7?"** - It is prime (so Fermat's little theorem applies), and just under 2^30 ≈ 10^9.07. The product of any two residues below it fits in a signed 64-bit integer (max ~9.2×10^18 >> (10^9+7)^2 ≈ 10^18), so `a * b % MOD` never overflows `long long` in C++.

---

## Practice problems

### 1. Fibonacci Number (large n variant)

**Problem:** Compute the n-th Fibonacci number modulo 10^9+7, where `1 ≤ n ≤ 10^18`. The standard recursive or iterative definition is too slow for n = 10^18.

**Approach:** Matrix exponentiation is the fast-Fibonacci technique: the recurrence `[F(n+1), F(n)] = [[1,1],[1,0]]^n × [F(1), F(0)]`. Binary exponentiation on 2×2 matrices takes O(log n) matrix multiplications, each O(1) (fixed size). Each matrix entry is taken mod 10^9+7 after every multiply.

*Insight that unlocks it:* Binary exponentiation works on *any* structure with an associative multiply - integers, matrices, or polynomials. Here the "base" is a 2×2 matrix.

```python
MOD = 10**9 + 7

def mat_mul(A: list[list[int]], B: list[list[int]]) -> list[list[int]]:
    return [
        [(A[0][0]*B[0][0] + A[0][1]*B[1][0]) % MOD,
         (A[0][0]*B[0][1] + A[0][1]*B[1][1]) % MOD],
        [(A[1][0]*B[0][0] + A[1][1]*B[1][0]) % MOD,
         (A[1][0]*B[0][1] + A[1][1]*B[1][1]) % MOD],
    ]

def mat_pow(M: list[list[int]], n: int) -> list[list[int]]:
    result = [[1, 0], [0, 1]]  # identity
    while n > 0:
        if n & 1:
            result = mat_mul(result, M)
        M = mat_mul(M, M)
        n >>= 1
    return result

def fib(n: int) -> int:
    if n <= 1:
        return n
    M = [[1, 1], [1, 0]]
    return mat_pow(M, n)[0][1]
```

**Complexity:** O(log n) matrix multiplications, each O(1) → O(log n) total. Space: O(1).

**Duplicate problems:**
- Climbing Stairs (LC 70) - same Fibonacci recurrence, n ≤ 45; naive iteration works, but matrix pow generalizes to arbitrary linear recurrences.
- K-th Symbol in Grammar (LC 779) - recursive structure; different recurrence, same halving-per-step pattern.

---

### 2. Count Vowel Permutations (LC 1220)

**Problem:** Count the number of strings of length n using only vowels `{a, e, i, o, u}` where each character can follow only specific vowels (a→e only, e→a or i, etc.). Return the count modulo 10^9+7. Constraints: `1 ≤ n ≤ 2×10^4`.

**Approach:** DP over positions and last character. Let `dp[i][v]` = number of valid strings of length i ending in vowel v. Each transition multiplies by at most a handful of previous states. Take mod after each addition to prevent overflow.

*Key insight:* Without mod, `dp[n][v]` grows exponentially in n. With mod at every DP step, every value stays below 10^9+7.

```python
def countVowelPermutation(n: int) -> int:
    MOD = 10**9 + 7
    # State: count of valid strings of current length ending in each vowel
    a = e = i = o = u = 1  # length-1 base case
    for _ in range(n - 1):
        a, e, i, o, u = (
            (e + i + u) % MOD,         # a can follow: e, i, u
            (a + i) % MOD,             # e can follow: a, i
            (e + o) % MOD,             # i can follow: e, o
            i % MOD,                   # o can follow: i
            (i + o) % MOD,             # u can follow: i, o
        )
    return (a + e + i + o + u) % MOD
```

**Complexity:** O(n) time, O(1) space.

**Duplicate problems:**
- House Robber (LC 198) - DP with mod not needed, but same "take mod at transition" reasoning applies once counts exceed int bounds.
- Distinct Subsequences (LC 115) - DP with potentially large counts; same mod-at-every-step discipline.

---

### 3. Combination Sum IV / nCr mod p

**Problem:** Given integers n and r, compute C(n, r) mod p where p = 10^9+7. Constraints: `0 ≤ r ≤ n ≤ 10^6`. Multiple queries with the same n possible.

**Approach:** Precompute factorial and inverse-factorial arrays using the O(n + log p) setup. Each query is then O(1): `C(n, r) = fact[n] × inv_fact[r] × inv_fact[n-r] mod p`.

*Insight that unlocks it:* C(n, r) = n! / (r! × (n-r)!). Division is multiplication by inverse. Precomputing all inverses in O(n) lets you serve any combination query in O(1).

*Why not Pascal's triangle?* Pascal's triangle requires O(n²) space and time for all C(n, k), 0 ≤ k ≤ n. The factorial table is O(n) for everything.

```python
def solve_combinations() -> None:
    MOD = 10**9 + 7
    MAXN = 10**6 + 1

    fact, inv_fact = precompute_factorials(MAXN, MOD)  # defined in Implementation

    # Example queries
    print(comb(10, 3, fact, inv_fact, MOD))   # 120
    print(comb(1000000, 500000, fact, inv_fact, MOD))  # large, mod-reduced
```

**Complexity:** O(n + log p) precomputation, O(1) per query.

**Duplicate problems:**
- Unique Paths (LC 62) - `C(m+n-2, m-1)` with small m,n; mod not needed but the formula generalizes to large inputs with this technique.
- Binomial Coefficient (LC 1569 / many contest variants) - same factorial inverse table; constraint determines whether sieve or Fermat is cheaper.

---

### 4. Pow(x, n) (LC 50)

**Problem:** Implement `pow(x, n)` where `x` is a float and `n` is a 32-bit integer (including negative). Return `x^n`. Constraints: `-100.0 < x < 100.0`, `-2^31 ≤ n ≤ 2^31 - 1`.

**Approach:** Binary exponentiation on floats. Handle negative `n` by computing `1.0 / pow(x, -n)`. Edge case: `n = -2^31` overflows when negated in 32-bit int - convert to 64-bit first.

*Insight:* This problem tests whether you know binary exponentiation, not modular arithmetic specifically - but it's the same squaring loop. Demonstrates the algorithm family applies beyond integer mod contexts.

```python
def myPow(x: float, n: int) -> float:
    if n < 0:
        x, n = 1 / x, -n   # safe in Python: arbitrary int, no overflow
    result = 1.0
    while n > 0:
        if n & 1:
            result *= x
        x *= x
        n >>= 1
    return result
```

**Complexity:** O(log |n|) time, O(1) space.

**Duplicate problems:**
- Fast Matrix Exponentiation (e.g., LC 509 matrix variant) - same squaring loop, matrix multiply instead of scalar multiply.
- Super Pow (LC 372) - `a^b mod 1337` where `b` is given as a digit array; decompose by Euler's theorem + binary exp per digit.
