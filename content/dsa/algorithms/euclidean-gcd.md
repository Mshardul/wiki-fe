# Euclidean GCD

## Prerequisites

- [Recursion](./recursion.md) [Must read] - GCD is the cleanest recurrence in the toolkit; extended Euclid threads Bézout coefficients back up the call stack.
- [Number Theory](./number-theory.md) [Should read] - the hub explaining where GCD sits in the contest math toolkit and how it composes with the modular inverse.
- [Modular Exponentiation](./modular-exponentiation.md) [Should read] - the other half of "modular inverse": Fermat's method works only for prime moduli, extended GCD works for any modulus.

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
- [State & recurrence](#state--recurrence)
- [Edge cases](#edge-cases)
- [Implementation](#implementation)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)

---

## What it is

**Euclidean GCD** computes the greatest common divisor of two integers `a` and `b` in **O(log min(a,b))** time using the recurrence `gcd(a, b) = gcd(b, a mod b)`, bottoming out at `gcd(a, 0) = a`. The **extended** version additionally recovers integers `x, y` such that `a·x + b·y = gcd(a, b)` (Bézout's identity), which is the mechanism behind the **modular inverse for any modulus**.

> **One-liner:** Repeatedly replace `(a, b)` with `(b, a mod b)` until `b = 0` - the last nonzero remainder is the GCD, and it takes only O(log min(a,b)) steps because each pair of steps at least halves the smaller number.

**Soundbite for interviews:** "GCD of a and b equals GCD of b and a mod b - the remainder throws away everything that isn't a shared factor, and the operands shrink geometrically, not linearly."

**Time:** O(log min(a,b)). **Space:** O(1) iterative, O(log min(a,b)) recursive (call stack).

---

## Intuition

The schoolbook approach - list every divisor of `a`, list every divisor of `b`, take the largest common one - costs O(min(a,b)) in the worst case (trial division up to `√n` per number, or worse, checking every candidate). That's fine for small numbers but useless once `a, b` reach `10^18`.

Euclid's insight is that **the GCD doesn't care about the numbers themselves - only about what they share.** If `d` divides both `a` and `b`, then `d` also divides `a mod b` (the remainder when `a` is divided by `b`), because `a mod b = a - ⌊a/b⌋·b`, and `d` divides both terms on the right. So:

```
gcd(a, b) = gcd(b, a mod b)
```

This is a strict simplification: `a mod b < b ≤ a`, so the pair shrinks every step. The remainder operation is doing the same job as "cross out everything that isn't a shared factor" - but in one arithmetic step instead of enumerating divisors.

**Why it's fast, not just correct:** replacing `(a, b)` with `(b, a mod b)` doesn't just shrink the numbers - it shrinks them geometrically. Two consecutive steps at least halve the larger value (proven below), so the recursion depth is logarithmic, not linear, in the input **value**. That's the same trick modular exponentiation uses on the exponent: don't iterate over the magnitude, iterate over the structure.

**Extended Euclid rides on top for free.** While unwinding the recursion, you can track how each remainder was built as a linear combination of the original `a` and `b`. That bookkeeping falls out of the same recursive calls - no extra pass needed - and it hands you Bézout's coefficients, which is exactly what a modular inverse is.

**Historical note:** Euclid's *original* algorithm (~300 BCE) was subtraction-based, not mod-based: `gcd(a, b) = gcd(a - b, b)` for `a ≥ b`, bottoming out when the two are equal. It's correct by the same divisor argument, but it's pseudo-polynomial - `gcd(10^9, 1)` takes roughly `10^9` subtractions, since each step only shrinks the larger value by `b`, not by a full remainder. Replacing repeated subtraction with a single `mod` (which is exactly "subtract `b` as many times as fits in one step") is what turns O(max(a,b)/min(a,b)) into O(log min(a,b)) - the same speedup idea as replacing a unary counter with binary representation.

---

## How it works

### Step-by-step trace: `gcd(48, 18)`

```
gcd(48, 18)
  48 = 2×18 + 12        →  gcd(48, 18) = gcd(18, 12)
gcd(18, 12)
  18 = 1×12 + 6         →  gcd(18, 12) = gcd(12, 6)
gcd(12, 6)
  12 = 2×6 + 0          →  gcd(12, 6)  = gcd(6, 0)
gcd(6, 0)
  b = 0 → base case      →  return 6
```

```
  Step │  a  │  b  │ a mod b │ next pair
  ─────┼─────┼─────┼─────────┼───────────
    1  │ 48  │ 18  │   12    │ (18, 12)
    2  │ 18  │ 12  │    6    │ (12, 6)
    3  │ 12  │  6  │    0    │ (6, 0)  ← stop, b = 0
  ─────┴─────┴─────┴─────────┴───────────
                    answer = 6
```

Verify: `48 = 6 × 8`, `18 = 6 × 3`. `6` is indeed the largest number dividing both, since `8` and `3` are coprime.

### Extended Euclid - recovering Bézout's coefficients

Extended Euclid additionally finds `x, y` with `48x + 18y = 6`. Unwind the recursion bottom-up, expressing each remainder as a combination of the two inputs at that level:

```
gcd(6, 0)  = 6                       → 6 = 1·6 + 0·0
gcd(12, 6):  6 = 12 - 2×6            → 6 = 0·12 + 1·6            (substitute previous)
gcd(18, 12): 6 = 12 - 2×(18 - 1×12)  → 6 = 3·12 - 2·18
                = 3×(18-1×12) ... expand in terms of 18, 12
gcd(48, 18): 12 = 48 - 2×18
             6  = 3×12 - 2×18 = 3×(48 - 2×18) - 2×18 = 3×48 - 8×18
```

Final: `3×48 + (-8)×18 = 144 - 144 = 6`. So `x = 3, y = -8`.

```
  Bottom-up substitution (each level expresses gcd in terms of that level's a, b):

  gcd(6, 0)   = 6            (x, y) = (1, 0)
       ↑ substitute b = a - q·b from the level above
  gcd(12, 6)  = 6 = 0·12 + 1·6          (x, y) = (0, 1)
       ↑
  gcd(18, 12) = 6 = 1·18 + (-1)·12→ recombine → (x,y) = (1, -1) at this level
       ↑
  gcd(48, 18) = 6 = 3·48 + (-8)·18      (x, y) = (3, -8)   ← final answer
```

**Diagram - the shrinking pair (state machine view):**

```
  (48, 18) ──mod──▶ (18, 12) ──mod──▶ (12, 6) ──mod──▶ (6, 0)
      │                  │                 │               │
   remainder          remainder         remainder        b=0: STOP
    = 12                = 6               = 0            return a = 6
```

**Cache behavior:** Both variables are scalars held in registers; no array or pointer structure is touched. The algorithm is trivially cache-friendly - the only "memory traffic" is stack frames in the recursive form, and even those are tiny (two integers per frame).

---

## Correctness / invariant

### The core lemma

**Claim:** `gcd(a, b) = gcd(b, a mod b)` for `a ≥ b > 0`.

**Proof:** Let `r = a mod b`, so `a = q·b + r` for some integer `q ≥ 0` and `0 ≤ r < b`.

- **(⊇) Any common divisor of `b` and `r` divides `a`.** If `d | b` and `d | r`, then `d | (q·b + r) = a`. So `d` is also a common divisor of `a` and `b`.
- **(⊆) Any common divisor of `a` and `b` divides `r`.** If `d | a` and `d | b`, then `d | (a - q·b) = r`. So `d` is also a common divisor of `b` and `r`.

The two directions show the set of common divisors of `(a, b)` is **identical** to the set of common divisors of `(b, r)`. Since GCD is the maximum of that set, `gcd(a, b) = gcd(b, r) = gcd(b, a mod b)`. ∎

**Base case:** `gcd(a, 0) = a` for any `a > 0` - every number divides 0 (since `0 = a × 0`), so the largest common divisor of `a` and `0` is `a` itself.

**Termination:** the sequence of second arguments `b, a mod b, b mod (a mod b), ...` is strictly decreasing (each remainder is smaller than the divisor that produced it) and bounded below by 0, so it reaches 0 in finitely many steps.

### Invariant for extended Euclid

At every level of the recursion, the algorithm maintains: *the returned `(g, x, y)` satisfies `a·x + b·y = g` for the `a, b` at that level.* The base case `(a, 0) → (a, 1, 0)` trivially satisfies `a·1 + 0·0 = a`. The recursive case substitutes the child's `(x', y')` (which satisfies `b·x' + r·y' = g`, where `r = a mod b = a - ⌊a/b⌋·b`) to derive the parent's coefficients: `x = y'`, `y = x' - ⌊a/b⌋·y'` - this is the algebraic rearrangement shown in the trace above.

---

## Complexity derivation

**Claim:** the number of recursive calls is O(log min(a, b)).

**Key lemma:** if `a ≥ b`, then `a mod b < a / 2`.

*Proof:* two cases.
- If `b ≤ a/2`, then `a mod b < b ≤ a/2`.
- If `b > a/2`, then `a = 1·b + (a - b)`, so `a mod b = a - b < a - a/2 = a/2`.

Either way, `a mod b < a/2`.

**Consequence:** every **two** steps of the recursion, the larger operand at least halves. Concretely, after the call `gcd(a, b) → gcd(b, a mod b)`, the new pair's larger value is `b`. But looking two steps ahead, `gcd(b, a mod b) → gcd(a mod b, b mod (a mod b))`, and since `a mod b < a/2`, the value has more than halved within two steps of the original `a`.

So the number of steps to reach `b = 0` is **O(log₂ a)** - specifically, at most `2 log₂(a) + O(1)` calls. Since the recurrence is symmetric in which operand shrinks faster, the bound is stated as **O(log min(a, b))**.

**Fibonacci worst case:** the slowest-shrinking inputs are **consecutive Fibonacci numbers** - `gcd(F(n+1), F(n))` takes exactly `n` steps, each remainder being the next-smaller Fibonacci number, achieving the worst-case ratio (this is why the golden ratio bounds the constant in the O(log) - Lamé's theorem states the number of steps is at most 5× the number of decimal digits in the smaller number).

**Total:** O(log min(a,b)) time (each step is O(1) arithmetic on numbers of bounded size), O(1) space iterative, O(log min(a,b)) space recursive (stack depth).

**Big-integer caveat:** for arbitrary-precision integers (as in cryptographic applications with 2048-bit numbers), each `mod` operation itself costs more than O(1) - the true complexity becomes O(log(min(a,b)) × M(n)) where `n` is the bit-length and `M(n)` is the cost of big-integer division. For fixed-width 64-bit integers, this doesn't matter; for RSA-scale numbers, it does.

---

## Constraints & approach

| Constraint                                   | Steps / complexity          | Approach                                                                                   |
| --------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| `a, b ≤ 10^9`                                 | ~30-45 steps                 | Standard Euclidean algorithm; instant                                                        |
| `a, b ≤ 10^18`                                | ~60-90 steps                 | Still trivial - O(log) is essentially constant here; use 64-bit / Python int                 |
| Need `gcd` of a whole array (n numbers)        | O(n log(max value))          | Fold: `reduce(gcd, arr)` - GCD is associative, so pairwise reduction works                    |
| Need modular inverse, **any modulus**          | O(log min(a,m))              | **Extended Euclid** - works regardless of whether `m` is prime                                |
| Need modular inverse, **prime modulus**        | O(log m)                     | Either extended Euclid or Fermat's little theorem (`pow(a, m-2, m)`) - both valid, Fermat simpler to write |
| `a` or `b` given as a huge digit string         | depends on big-int lib        | Standard algorithm still applies; per-step cost rises with digit count (see big-integer caveat) |
| LCM of `a, b`                                 | O(log min(a,b))              | `lcm(a,b) = a // gcd(a,b) × b` - divide before multiplying to avoid overflow                  |

**Reading the constraint:** GCD's O(log) makes it essentially free at any contest-legal input size - the constraint that actually matters is usually **which modulus you have** (prime vs composite), which decides extended-Euclid vs Fermat for the inverse, not the size of `a, b`.

---

## When to use / when not

**Use Euclidean GCD when:**

- Reducing a fraction to lowest terms: divide numerator and denominator by their GCD.
- Computing LCM (`a·b / gcd(a,b)`) - period/cycle-length problems, "when do these two repeating events align again".
- Checking coprimality (`gcd(a,b) = 1`) - a precondition for many number-theoretic algorithms (CRT, some hashing schemes).
- **Extended Euclid specifically** when you need a modular inverse and the modulus is **not guaranteed prime** - Fermat's little theorem silently gives the wrong answer for composite moduli, extended Euclid works unconditionally (as long as `gcd(a, m) = 1`).
- Solving linear Diophantine equations `ax + by = c` - solvable iff `gcd(a,b) | c`, and extended Euclid constructs a solution directly.

**Use Fermat's little theorem instead when:** the modulus is a known prime and you just need a one-liner (`pow(a, p-2, p)`) - see [Modular Exponentiation](./modular-exponentiation.md). It's simpler to write but narrower: it silently produces a wrong answer if the modulus isn't actually prime, whereas extended Euclid works for any modulus and additionally tells you when no inverse exists (`gcd(a, m) ≠ 1`).

**Do not reach for GCD when:**

- You need the **prime factorization** of a number, not just a shared factor - that's a different tool (trial division, Pollard's rho, or a sieve for bulk queries).
- You're testing primality of a single large number - GCD doesn't test primality; use Miller-Rabin.

**Real-world usage:** GCD reduction underlies rational-number arithmetic in every language's fraction/rational type (Python's `fractions.Fraction` calls `math.gcd` on every construction to keep the representation canonical). Extended Euclid is the core primitive inside RSA key generation, where the private exponent is computed as the modular inverse of the public exponent mod `φ(n)`. **At scale:** for cryptographic key sizes (2048+ bit numbers), each `mod` operation is no longer O(1) - it costs O(M(n)) for big-integer division, and generating keys involves many GCD calls during primality-related bookkeeping, which is why key generation has a measurable latency budget even though the algorithm is "just" O(log n) steps.

---

## Comparison

| Method                          | Time                     | Space | Works for composite modulus? | Pick it when…                                                                 |
| -------------------------------- | ------------------------- | ------ | ----------------------------- | -------------------------------------------------------------------------------- |
| **Euclidean GCD** (this)         | O(log min(a,b))          | O(1)   | n/a (not an inverse method)   | You just need the GCD/LCM of two numbers - always the right choice               |
| **Extended Euclidean**           | O(log min(a,b))          | O(1) iter / O(log) rec | **Yes**       | You need a modular inverse and can't guarantee the modulus is prime; crossover: any time modulus primality is unknown or explicitly composite |
| **Fermat's little theorem** (modular exponentiation) | O(log m)  | O(1)   | **No** - prime only           | Modulus is a known prime and you want the simplest one-liner (`pow(a,p-2,p)`); crossover: breaks silently the moment `m` isn't prime, so only pick this with a verified-prime modulus |
| **List-divisors GCD** (naive)    | O(√min(a,b))              | O(1)   | n/a                            | Never in practice - enumerates candidate divisors up to √min(a,b); pedagogical only  |
| **Subtraction-based GCD** (Euclid's original form) | O(max(a,b)/min(a,b)) | O(1) | n/a                       | Never in practice - `gcd(a,b) = gcd(a-b, b)` repeated subtraction; pseudo-polynomial when a≫b (e.g. gcd(10^9, 1) takes ~10^9 steps) - the mod-based recurrence is the fix |
| **Binary GCD (Stein's algorithm)** | O(log² min(a,b)) worst, faster constant in practice | O(1) | n/a | Hardware without a fast division instruction (embedded systems) - trades a division per step for shifts/subtracts, faster in practice on some CPUs despite same asymptotic order |

---

## State & recurrence

*(Family: **Recursive/build**.)*

**State definition:** the state at any point in the recursion is the pair `(a, b)`. There is no auxiliary memoization table - unlike DP, each state is visited exactly once (the sequence of pairs is strictly decreasing and never revisits a previous pair), so this is **recursion without overlapping subproblems**, not dynamic programming.

**Base case:** `gcd(a, 0) = a`. This is reached because `b` strictly decreases (`a mod b < b`) at every step and is bounded below by 0.

**Recursive case:** `gcd(a, b) = gcd(b, a mod b)` for `b > 0`.

**State-space size:** the recursion depth is O(log min(a,b)) - not the value of `a` or `b`, but its **bit-length**. This is the same "iterate over structure, not magnitude" idea that underlies modular exponentiation's O(log exp): here the structure being iterated over is the sequence of remainders, which shrinks geometrically rather than linearly.

**Extended Euclid's extra state:** each recursive call additionally threads back `(g, x, y)` - the GCD and the two Bézout coefficients - reconstructed via the substitution `x, y = y', x' - (a // b) * y'` on the way back up. This costs no extra recursion depth, only O(1) extra arithmetic per frame.

---

## Edge cases

1. **`b = 0`:** Base case - `gcd(a, 0) = a`. If `a` is also 0, `gcd(0, 0)` is conventionally defined as `0` (no proper GCD exists, but this is the standard convention libraries follow - `math.gcd(0, 0) == 0` in Python).

2. **Negative inputs:** `gcd(a, b)` is conventionally defined as non-negative, so implementations take `abs(a), abs(b)` first (or rely on `a mod b` in the language always producing a non-negative remainder - not guaranteed in every language: C++'s `%` can return a negative result for negative operands, which breaks the algorithm if not handled). Python's `%` always returns a non-negative result for a positive divisor, so this is safe in Python but a classic trap in C++.

3. **`gcd(a, 1) = 1`:** any number and 1 are always coprime - one recursive step (`gcd(1, a mod 1) = gcd(1, 0) = 1`).

4. **Overflow in extended Euclid coefficients:** the Bézout coefficients `x, y` can be as large as the inputs themselves (in absolute value) - for `a, b` near `10^18`, `x` or `y` can also approach `10^18`, fitting in a 64-bit signed integer but leaving no headroom for further multiplication. If the coefficients are used in a subsequent multiply (e.g., constructing a modular inverse via `(x mod m + m) mod m`), reduce modulo `m` immediately rather than carrying the raw Bézout value forward.

5. **LCM overflow:** computing `lcm(a, b) = a * b / gcd(a, b)` in that order can overflow before the division happens if `a, b` are both large. Always divide first: `lcm(a, b) = (a // gcd(a, b)) * b`.

6. **Modular inverse doesn't exist:** extended Euclid on `(a, m)` returns `gcd(a, m) ≠ 1` when `a` and `m` share a factor - in that case, no modular inverse exists, and any code that blindly uses the returned `x` as an inverse is silently wrong. Always check `gcd == 1` before trusting the coefficients as an inverse.

**Common misconceptions:**

- *"Euclid's algorithm only works on positive integers."* False - it's well-defined on any integers once you take `abs(a), abs(b)` first. GCD-is-non-negative is a convention libraries follow, not a mathematical limitation of the recurrence itself.
- *"Extended Euclid's `x, y` are the unique solution to `ax + by = g`."* False - infinitely many integer solutions exist, differing by `(x + k·b/g, y - k·a/g)` for any integer `k`. The algorithm returns *one* particular solution; don't assume a candidate answer must match it exactly when checking correctness.

---

## Implementation

### Pseudocode (CLRS style, iterative)

```
EUCLID-GCD(a, b)
  ▷ Returns gcd(a, b) in O(log min(a,b)) time, O(1) space
  ▷ Requires: a, b ≥ 0
  while b ≠ 0
      a, b ← b, a mod b        ▷ simultaneous reassignment: shrink the pair
  return a
```

### Pseudocode (CLRS style, extended, recursive)

```
EXTENDED-EUCLID(a, b)
  ▷ Returns (g, x, y) such that a·x + b·y = g = gcd(a, b)
  if b = 0
      return (a, 1, 0)          ▷ base case: a·1 + 0·0 = a
  (g, x', y') ← EXTENDED-EUCLID(b, a mod b)
  q ← a div b                    ▷ integer quotient
  x ← y'
  y ← x' - q × y'
  return (g, x, y)
```

### Python - from-scratch iterative GCD

```python
def gcd(a: int, b: int) -> int:
    """
    Euclidean algorithm: gcd(a, b) via repeated (a, b) -> (b, a mod b).
    O(log min(a, b)) time, O(1) space.
    """
    a, b = abs(a), abs(b)
    while b:
        a, b = b, a % b
    return a
```

### Python - extended Euclid, recursive

```python
def extended_gcd(a: int, b: int) -> tuple[int, int, int]:
    """
    Returns (g, x, y) such that a*x + b*y = g = gcd(a, b).
    O(log min(a, b)) time, O(log min(a, b)) recursion depth.
    """
    if b == 0:
        return a, 1, 0
    g, x1, y1 = extended_gcd(b, a % b)
    x, y = y1, x1 - (a // b) * y1
    return g, x, y
```

### Python - modular inverse via extended Euclid (any modulus)

```python
def mod_inverse(a: int, m: int) -> int:
    """
    Modular inverse of a mod m, for ANY modulus m (prime or composite),
    as long as gcd(a, m) == 1. Unlike Fermat's little theorem, this does
    not require m to be prime.
    """
    g, x, _ = extended_gcd(a, m)
    if g != 1:
        raise ValueError(f"no modular inverse: gcd({a}, {m}) = {g} != 1")
    return x % m   # normalize into [0, m)
```

### Python - contest one-liners (stdlib)

```python
import math

math.gcd(48, 18)          # 6 - built-in, use this in contests
math.lcm(48, 18)          # 144 - built-in since Python 3.9
math.gcd(*[4, 8, 12, 20])  # 4  - variadic: GCD of a whole list
```

---

## What the interviewer probes for

- **"Why does `gcd(a, b) = gcd(b, a mod b)` hold?"** - Because the set of common divisors of `(a, b)` is identical to the set of common divisors of `(b, a mod b)`: any `d` dividing both `b` and `r = a mod b` also divides `a = q·b + r`, and conversely any `d` dividing `a` and `b` divides `r = a - q·b`. Same maximum, same GCD.

- **"Why is it O(log n) and not O(n)?"** - Because `a mod b < a / 2` whenever `a ≥ b` (shown by case split on whether `b ≤ a/2` or `b > a/2`), so the operand pair at least halves every two steps - a geometric, not arithmetic, shrink. The worst case (slowest shrink) is consecutive Fibonacci numbers, still bounded at O(log n) steps by Lamé's theorem.

- **"How do you compute a modular inverse without knowing if the modulus is prime?"** - Extended Euclid. It returns `x, y` with `a·x + m·y = gcd(a, m)`; if `gcd(a, m) = 1`, then `x mod m` is the inverse, and this works regardless of `m`'s primality. Fermat's little theorem (`pow(a, m-2, m)`) is simpler but only valid when `m` is prime - using it on a composite modulus gives a wrong answer with no runtime error.

- **"What if `a` and `b` are given as huge digit strings, too big for a 64-bit integer?"** - Python handles this transparently via arbitrary-precision integers; the algorithm doesn't change, only the per-step cost (each `mod` now costs O(M(n)) for `n`-digit big-integer division, not O(1)). In C++, you'd need a bignum library.

- **"What happens if `a` or `b` is negative?"** - Mathematically, GCD is conventionally defined as non-negative, so the first step is `a, b = abs(a), abs(b)`. This matters more than it looks: in Python, `%` always returns a result with the same sign as the divisor (so `a % b` is non-negative when `b > 0`), but in C++ and Java, `%` returns a result with the same sign as the *dividend* - meaning `-7 % 3` is `-1` in C++ but `2` in Python. Skipping the `abs()` step and relying on `%` alone is a real bug in C++, silently producing wrong or even non-terminating behavior; it's a non-issue in Python only because of the language's `%` convention, not because the algorithm itself doesn't need the guard.

---

## Practice problems

### 1. Greatest Common Divisor of Strings - LC 1071

**Problem:** Given two strings `str1` and `str2`, return the largest string `x` such that `x` divides both (`str1` and `str2` are each `x` repeated some number of times). If no such `x` exists, return the empty string.

**Approach:** The key insight: if such an `x` exists, then `str1 + str2 == str2 + str1` (concatenation order doesn't matter - a necessary and sufficient condition). Given that check passes, the answer's length is `gcd(len(str1), len(str2))` - the "divides both lengths" structure of the string problem is a direct transliteration of numeric GCD onto string length.

```python
def gcdOfStrings(str1: str, str2: str) -> str:
    if str1 + str2 != str2 + str1:
        return ""
    import math
    g = math.gcd(len(str1), len(str2))
    return str1[:g]
```

**Complexity:** O(n + m) for the concatenation check, O(log min(n,m)) for the GCD itself.

**Duplicate problems:**
- Repeated String Match (LC 686) - different framing, similar "does one string divide/tile another" reasoning, though solved by different technique (repetition + substring check, not GCD).

---

### 2. Water and Jug Problem - LC 365

**Problem:** Given two jugs with capacities `x` and `y` liters and no other measuring tools, determine if it's possible to measure exactly `z` liters using the two jugs, where you can fill, empty, and pour water between them. Constraints: `0 ≤ x, y, z ≤ 10^6`.

**Approach:** This is Bézout's identity in disguise. Every reachable water level via fill/empty/pour operations is an integer linear combination `a·x + b·y` for some integers `a, b` (positive = fill, negative = empty/pour-out) - exactly the form extended Euclid analyzes. By Bézout, `a·x + b·y = z` has an integer solution **if and only if** `gcd(x, y) | z`. The problem reduces entirely to: compute `g = gcd(x, y)`, then check `z ≤ x + y` (can't exceed total capacity) and `z % g == 0`. This is the cleanest real interview signal that Bézout's identity isn't just a bookkeeping trick for modular inverses - it directly answers "which target values are reachable by integer combinations of two numbers."

```python
import math

def canMeasureWater(x: int, y: int, z: int) -> bool:
    if z > x + y:
        return False
    if x == 0 or y == 0:
        return z == 0 or z == x + y
    return z % math.gcd(x, y) == 0
```

**Complexity:** O(log min(x,y)) time (the GCD call), O(1) space.

**Duplicate problems:**
- Any "can you reach target T using steps of size a and b" reachability problem - the moment the question is about integer combinations of two fixed step sizes, `gcd(a,b) | T` is the test, not a search.

---

### 3. Modular inverse for combinatorics with a non-prime modulus

**Problem:** Compute `n! mod m` divided by `k! mod m` and `(n-k)! mod m` - i.e., `C(n, k) mod m` - where `m` is **not guaranteed prime** (unlike the classic `10^9+7` contest modulus). Constraints: `0 ≤ k ≤ n ≤ 10^5`, `m` arbitrary composite up to `10^9`.

**Approach:** Fermat's little theorem (`pow(a, m-2, m)`) is invalid here because `m` isn't prime. Extended Euclid is the general tool: compute the modular inverse of each factorial via `mod_inverse(fact[i], m)`, which works as long as `gcd(fact[i], m) = 1`. This is the canonical scenario that separates "I memorized Fermat's formula" from "I understand what a modular inverse actually requires."

```python
def extended_gcd(a: int, b: int) -> tuple[int, int, int]:
    if b == 0:
        return a, 1, 0
    g, x1, y1 = extended_gcd(b, a % b)
    return g, y1, x1 - (a // b) * y1

def mod_inverse(a: int, m: int) -> int:
    g, x, _ = extended_gcd(a, m)
    if g != 1:
        raise ValueError(f"no inverse: gcd({a},{m}) = {g}")
    return x % m

def comb_mod(n: int, k: int, m: int) -> int:
    if k < 0 or k > n:
        return 0
    fact = [1] * (n + 1)
    for i in range(1, n + 1):
        fact[i] = fact[i - 1] * i % m
    numerator = fact[n]
    denom = fact[k] * fact[n - k] % m
    return numerator * mod_inverse(denom, m) % m
```

**Complexity:** O(n) precompute + O(log m) for the single extended-Euclid inverse call, O(1) per subsequent query if factorials are cached.

**Duplicate problems:**
- Any "combinations mod m" problem where m is explicitly stated as composite or unspecified - the tell that Fermat's shortcut (valid only for prime m) is the wrong tool and extended Euclid is required.
- Diophantine equation solvers (`ax + by = c`, does a solution exist / find one) - same extended-Euclid machinery, different final step (check `c % gcd(a,b) == 0` then scale the Bézout coefficients).
