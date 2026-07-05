# Number Theory

## Prerequisites

- **Modular arithmetic** [Must read] - the load-bearing prerequisite: every member is used "mod a big prime", and the toolkit only coheres once you have congruences, the modular inverse (division mod p), and Fermat's little theorem. Without these the "thread that ties them together" section is unreadable. <!-- U9: not-yet-written target - wire to a future `algorithms/modular-arithmetic.md` once it exists. -->
- [Bit Manipulation](./bit-manipulation.md) [Should read] - modular exponentiation *is* the binary expansion of the exponent: square at every bit, multiply only where the bit is 1. The shift/mask reading of an integer transfers one-to-one to square-and-multiply.
- [Recursion](./recursion.md) [Should read] - Euclid's GCD is the cleanest recurrence in the toolkit (`gcd(a,b) = gcd(b, a mod b)`), and extended Euclid threads Bézout coefficients back up the call stack - both demand fluency with base-case/recursive-case reasoning.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)
- [The two recurring problems](#the-two-recurring-problems)
- [The shared idea: exploit structure, dodge the brute-force cost](#the-shared-idea-exploit-structure-dodge-the-brute-force-cost)
- [The members](#the-members)
- [Comparison](#comparison)
- [Which one when](#which-one-when)
- [The modular-arithmetic thread that ties them together](#the-modular-arithmetic-thread-that-ties-them-together)
- [Interview soundbite](#interview-soundbite)

> **Hub article.** This page is the survey + decision layer for the contest number-theory toolkit - it does not trace any single algorithm in full. Each member ([Euclidean GCD](./euclidean-gcd.md), [Modular Exponentiation](./modular-exponentiation.md), [Sieve of Eratosthenes](./sieve-of-eratosthenes.md)) has its own page with its invariant, complexity proof, edge cases, and implementation. Read this to learn _what the toolkit contains and which tool a problem is asking for_; follow a member link for the procedure.

## What it is

**Number theory** in a DSA context is the small, high-leverage toolkit for problems about **integers, divisibility, primes, and arithmetic modulo a number** - the "math" tag that shows up constantly in competitive programming and occasionally in interviews (hashing, cryptography, combinatorics with large answers).

Mental model: **three power tools, one workshop.** You rarely need the whole of number theory - you need to recognize which of a handful of standard procedures a problem is secretly asking for, then apply it cleanly. Almost everything reduces to: *find a common factor* (GCD), *compute a huge power without overflow* (modular exponentiation), or *know which numbers are prime, fast* (sieve). The members are not interchangeable; each solves a distinct primitive question, and they **compose** - modular inverse needs both extended GCD *and* fast exponentiation; counting answers "mod 10⁹+7" needs the sieve to precompute factorials' building blocks.

The unifying trick across all three: **the naive approach is linear or worse in the *value* of the input, and the smart approach is logarithmic in the value (or linear in its size).** That gap - `O(n)` over a number's magnitude collapsing to `O(log n)` - is the whole game.

## The two recurring problems

Two failure modes make a "just compute it" solution blow up, and the toolkit exists to dodge each:

**1. The number is astronomically large.** Compute `2^1000000 mod (10⁹+7)`. Multiplying 2 a million times is a million operations *and* the intermediate value has ~300,000 digits - both the time and the bignum cost are fatal. Fast exponentiation does it in ~20 multiplications, each kept small by reducing mod p every step.

```
naive:  2 · 2 · 2 · ... · 2     (1,000,000 multiplications, gigantic intermediates)
smart:  square-and-multiply      (~20 multiplications, every value < p)
```

**2. You need a property of *every* number up to n.** "How many primes below 10⁷?" Testing each number for primality by trial division is `O(n·√n)` ≈ 10¹⁰·… - too slow. The sieve marks all composites in one pass, `O(n log log n)` ≈ near-linear.

GCD sits slightly apart - it's not about size blowup but about **a clean recurrence that beats listing divisors**: `gcd(a,b)` via Euclid is `O(log min(a,b))` versus `O(min(a,b))` for the naive "check every candidate divisor".

## The shared idea: exploit structure, dodge the brute-force cost

Each member replaces an `O(value)` loop with a structural shortcut:

- **GCD** uses the invariant `gcd(a, b) = gcd(b, a mod b)` - every step shrinks the operands at least geometrically (two steps at least halve the larger), so it's logarithmic in the input value, not linear.
- **Modular exponentiation** uses `xⁿ = (x^(n/2))²` - halving the exponent each step gives `log n` squarings instead of `n` multiplications (binary expansion of the exponent).
- **The sieve** uses the fact that **every composite has a prime factor ≤ √n**, so marking multiples of each prime once eliminates all composites without ever testing a number in isolation.

The common theme: **don't iterate over the magnitude of the number - iterate over its *structure*** (its bits, its prime factors, its Euclidean remainders).

## The members

Each member solves a distinct primitive; together they cover the overwhelming majority of contest "math" tags. **Suggested reading order - base first, composites last:** GCD and the sieve are **independent foundations** (read either first); modular exponentiation **depends on** modular arithmetic and underpins the Fermat inverse; the inverse itself **pulls from both** GCD (extended, any modulus) and modular exponentiation (Fermat, prime modulus). So: **GCD → sieve → modular exponentiation**, then the inverse falls out of the first and third.

- **[Euclidean GCD](./euclidean-gcd.md)** - the **divisibility** tool. Computes `gcd(a, b)` in `O(log min(a,b))` via `gcd(a,b) = gcd(b, a mod b)`. The **extended** version additionally finds integers `x, y` with `a·x + b·y = gcd(a,b)` (Bézout), which yields the **modular inverse** when `gcd = 1`. Foundation for LCM (`a·b / gcd`), fraction reduction, CRT, and any "make these coprime" problem.

- **[Modular exponentiation](./modular-exponentiation.md)** - the **large-power** tool. Computes `xⁿ mod m` in `O(log n)` by square-and-multiply, keeping every intermediate `< m`. The workhorse behind answers reported "mod 10⁹+7", behind **Fermat's modular inverse** (`a⁻¹ ≡ a^(p−2) mod p` for prime p), behind RSA, and behind fast Fibonacci / linear-recurrence via matrix power.

- **[Sieve of Eratosthenes](./sieve-of-eratosthenes.md)** - the **bulk-primality** tool. Marks every prime up to `n` in `O(n log log n)`. Variants extend it: the **linear sieve** is `O(n)` and also yields each number's **smallest prime factor**, giving `O(log n)` factorization afterward; a **segmented sieve** handles ranges too large to fit in memory at once. The base for prime counting, factorization, Euler's totient over a range, and "is it prime?" answered in `O(1)` after precompute.

## Comparison

| Tool                       | Question it answers                 | Naive cost            | This cost          | Key output(s)                          |
| -------------------------- | ----------------------------------- | --------------------- | ------------------ | -------------------------------------- |
| **Euclidean GCD**          | greatest common divisor of a, b     | `O(min(a,b))`         | `O(log min(a,b))`  | `gcd`; extended → Bézout `x,y` + inverse |
| **Extended GCD**           | `x, y` with `ax + by = gcd`         | -                     | `O(log min(a,b))`  | modular inverse for *any* modulus       |
| **Modular exponentiation** | `xⁿ mod m` for huge n               | `O(n)`                | `O(log n)`         | the power; inverse via Fermat (prime m) |
| **Sieve of Eratosthenes**  | all primes ≤ n / is-prime in bulk   | `O(n·√n)` trial-div   | `O(n log log n)`   | prime table; + smallest-prime-factor (linear sieve) |

All four share the same DNA: **logarithmic in the value, or near-linear in n**, by exploiting number structure instead of brute force.

## Which one when

- **"Reduce a fraction" / "make coprime" / "common period/cycle length" / LCM** → **Euclidean GCD**. If you also need a **modular inverse for a non-prime modulus**, you need **extended GCD** specifically (Fermat won't work when the modulus isn't prime).
- **"Answer mod 10⁹+7" with a power, or you need a⁻¹ mod a *prime*** → **modular exponentiation**. Inverse via Fermat (`a^(p−2)`) is the one-liner; reach for extended GCD only when the modulus isn't prime.
- **"Count / list / factor primes up to n", or many primality queries** → **Sieve of Eratosthenes** (plain for primes only; linear sieve when you also want fast factorization via smallest-prime-factor). For a **single** primality test on a huge number, don't sieve - use a probabilistic test (Miller–Rabin); the sieve is for *bulk* up to a bound.
- **They compose** - counting combinations `C(n,k) mod p` for large n needs the sieve (or factorial precompute) *and* modular exponentiation (for the inverse). Recognize a problem as "which primitive(s)", not "which single algorithm".

## The modular-arithmetic thread that ties them together

The reason these three live in one toolkit is that contest answers are almost always demanded **modulo a large prime** (`10⁹+7` or `998244353`) to keep them in 64-bit range. That single convention pulls all three together:

- You compute the answer with `+`, `−`, `·` **all taken mod p** as you go (so nothing overflows).
- **Division mod p** isn't `/` - it's multiplication by the **modular inverse**, which you get *either* from **modular exponentiation** (`a^(p−2)`, prime p) *or* from **extended GCD** (any modulus).
- Building blocks like `n!`, `C(n,k)`, or "is x prime" come from the **sieve** / factorial precompute.

So a single hard problem routinely touches **all three members at once**. The member pages teach each primitive; this hub is the map of how they fit. (Overflow note: even with mod, a product `a·b` can momentarily exceed 32 bits before the `% p` - use 64-bit (`long`/Python int) for the intermediate, the classic trap.)

## Interview soundbite

> **(say this out loud):** "Three tools - GCD for divisibility, fast power for `xⁿ mod p`, the sieve for primes - all logarithmic in the value or near-linear in n, and all run mod a big prime, where division means multiply by the inverse."
