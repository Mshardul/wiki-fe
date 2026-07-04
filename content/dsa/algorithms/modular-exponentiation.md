# Modular Exponentiation

## Prerequisites

- [Bit Manipulation](./bit-manipulation.md) [Must read] - the algorithm is a bit-scan loop: at each step it tests the lowest bit of the exponent with `exp & 1` and shifts right with `exp >>= 1`; understanding bit operations is essential
- [Modular Arithmetic](./modular-arithmetic.md) [Must read] - modular exponentiation is only correct because `(a × b) mod m = ((a mod m) × (b mod m)) mod m`; this identity is the license to reduce at every step
- [Number Theory](./number-theory.md) [Should read] - situates fast power in the contest math toolkit and explains Fermat's little theorem, which turns modular exponentiation into a modular inverse

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
- [Bit-tricks table](#bit-tricks-table)
- [Edge cases](#edge-cases)
- [Implementation](#implementation)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)

---

## What it is

**Modular exponentiation** computes `base^exp mod m` in **O(log exp)** time by squaring the base at each step instead of multiplying `exp` times. The key insight is that every number can be written in binary, and `base^exp` can be decomposed as a product of powers of two - you build that product bit by bit, doubling the exponent at each step and multiplying in the current power only when the corresponding bit is set.

> **One-liner:** Compute `base^exp mod m` in O(log exp) by reading the binary representation of `exp` from LSB to MSB - square the base at every bit, multiply the result when the bit is 1.

**Soundbite for interviews:** "Instead of multiplying base by itself exp times, I square it - every squaring doubles the exponent I've covered, so I only need log₂(exp) squarings."

**Time:** O(log exp) - the loop runs once per bit of `exp`. **Space:** O(1) iterative (the only variables are `result`, `base`, `exp`), O(log exp) recursive (call stack depth).

---

## Intuition

The naive approach - a loop that multiplies `base` into an accumulator `exp` times - is O(exp). For `exp = 10^9` that's a billion multiplications; for `exp = 10^18` it's impossible.

The fix is to stop thinking about "exp multiplications" and start thinking about the **binary representation of exp**. Every integer `exp` can be written as a sum of distinct powers of two:

```
13  =  8 + 4 + 1  =  2³ + 2² + 2⁰
```

So:
```
base^13  =  base^8 × base^4 × base^1
```

You don't need to precompute all those powers separately. Start with `base¹`. Square it to get `base²`. Square again to get `base⁴`. Square again to get `base⁸`. At each step, if the corresponding bit of `exp` is set, multiply that power into your running result.

The halving analogy: every time you shift `exp` right by one bit, you've "consumed" one bit and halved the problem. Starting from `exp`, you reach 0 in ⌊log₂(exp)⌋ + 1 steps.

**The abstraction generalizes.** Any associative operation with an identity element supports repeated squaring: integer multiplication (this article), matrix multiplication (Fibonacci in O(log n)), polynomial multiplication, string concatenation. The bit-scan skeleton is always the same.

---

## How it works

### Step-by-step trace: `2^13 mod 1000`

First, decompose 13 in binary: `13 = 1101₂`.

```
  Bit position:    3    2    1    0
  Bit value:       1    1    0    1
                   ↑    ↑         ↑
                  2^8  2^4       2^1   (the powers that contribute)
```

We scan bits from LSB (position 0) to MSB (position 3):

```
  exp = 13  (binary 1101)
  base = 2, result = 1

  Iteration 1:  exp = 13  →  exp & 1 = 1  (bit 0 is set)
                result = 1  × 2           mod 1000 = 2
                base   = 2² = 4           mod 1000 = 4
                exp    = 13 >> 1 = 6

  Iteration 2:  exp = 6   →  exp & 1 = 0  (bit 1 is NOT set)
                result = 2  (unchanged)
                base   = 4² = 16          mod 1000 = 16
                exp    = 6  >> 1 = 3

  Iteration 3:  exp = 3   →  exp & 1 = 1  (bit 2 is set)
                result = 2  × 16          mod 1000 = 32
                base   = 16² = 256        mod 1000 = 256
                exp    = 3  >> 1 = 1

  Iteration 4:  exp = 1   →  exp & 1 = 1  (bit 3 is set)
                result = 32 × 256         mod 1000 = 192
                base   = 256² = 65536     mod 1000 = 536
                exp    = 1  >> 1 = 0

  exp = 0 → done.   Answer: 2^13 mod 1000 = 192
```

Verify: `2^13 = 8192`. `8192 mod 1000 = 192`. Correct.

**What each power contributes:**

```
  2^13 = 2^8  × 2^4  × 2^1        (bits 3, 2, 0 of 13 are set; bit 1 is not)
       = 256  × 16   × 2
       = 8192

  mod 1000 at each factor:
  256 mod 1000 = 256
  16  mod 1000 = 16
  2   mod 1000 = 2

  (256 × 16 × 2) mod 1000 = (4096 × 2) mod 1000 = 8192 mod 1000 = 192  ✓
```

**ASCII diagram - bit decomposition:**

```
  exp = 13 = 1  1  0  1   (binary, MSB first)
              ↑  ↑     ↑
             bit3 bit2  bit0

  Powers accumulated:
  ┌──────────┬─────────────────────┬──────────────────────┐
  │ Iteration│ base (= 2^2^i mod m)│ result (accumulated) │
  ├──────────┼─────────────────────┼──────────────────────┤
  │    1     │    2  (= 2^1)       │   2    (bit 0 = 1)   │
  │    2     │    4  (= 2^2)       │   2    (bit 1 = 0)   │
  │    3     │   16  (= 2^4)       │  32    (bit 2 = 1)   │
  │    4     │  256  (= 2^8)       │ 192    (bit 3 = 1)   │
  └──────────┴─────────────────────┴──────────────────────┘
  Final: 192
```

**Cache behavior:** The iterative form operates on three scalar variables (`result`, `base`, `exp`) - entirely register-resident. No array is touched, no memory access pattern to analyze. The algorithm is trivially cache-friendly with O(1) memory traffic.

---

## Correctness / invariant

### Loop invariant

At the start of every iteration, the following holds:

> **Invariant:** `result × base^exp ≡ original_base^original_exp (mod m)`

**Proof by induction:**

- **Initialization:** `result = 1`, `base = original_base`, `exp = original_exp`. Then `1 × original_base^original_exp = original_base^original_exp`. The invariant holds.

- **Maintenance (exp is even):** We do NOT multiply into result. We set `base ← base²` and `exp ← exp >> 1`. The product `base^exp` becomes `(base²)^(exp/2) = base^exp`. `result` is unchanged. The invariant is preserved.

- **Maintenance (exp is odd):** We set `result ← result × base`, `base ← base²`, `exp ← (exp - 1) >> 1`. New product: `(result × base) × (base²)^((exp−1)/2) = result × base × base^(exp−1) = result × base^exp`. The invariant is preserved.

- **Termination:** `exp` halves (integer division) at every iteration, so `exp` reaches 0 in at most `⌊log₂(original_exp)⌋ + 1` steps. When `exp = 0`, `base^0 = 1`, so `result × 1 = result = original_base^original_exp (mod m)`. The invariant delivers the correct answer.

---

## Complexity derivation

Each iteration right-shifts `exp` by 1 bit: `exp ← exp >> 1`. Starting from `original_exp`, after `k` shifts the value is `⌊original_exp / 2^k⌋`. The loop exits when this reaches 0:

```
⌊original_exp / 2^k⌋ = 0  ⟺  k > log₂(original_exp)  ⟺  k = ⌊log₂(original_exp)⌋ + 1 iterations
```

The number of bits in `exp` is `⌊log₂(exp)⌋ + 1`. The loop runs exactly once per bit.

Each iteration does O(1) work: one bit test (`exp & 1`), at most one multiplication (`result × base mod m`), one squaring (`base × base mod m`), one right shift. For fixed-size integers (32-bit or 64-bit), each multiplication is O(1) regardless of the values.

**Big-integer note:** When `base` or `mod` exceeds 64 bits (as in RSA with 2048-bit keys), each multiplication costs O(M(n)) where n is the bit-width and M(n) is the cost of big-integer multiplication. Python's arbitrary-precision integers absorb this automatically; C++ requires a big-integer library or `__int128` for moderately large values.

**Total:** O(log exp) time, O(1) space (iterative). The recursive form uses O(log exp) stack frames.

---

## Constraints & approach

| Constraint                                | Iterations / complexity    | Approach                                                                                    |
| ----------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------- |
| `exp ≤ 10^9`                              | ~30 iterations             | Standard binary exponentiation; trivially fast                                              |
| `exp ≤ 10^18`                             | ~60 iterations             | Still fine - binary exponentiation is the only viable option; O(exp) loop is unusable       |
| `base or mod > 10^9`                      | ~30–60 iterations          | Intermediate product can reach `(10^9)^2 = 10^18`; use `long long` in C++ or `__int128`; Python handles automatically |
| `base or mod > 2^62` (near 64-bit limit)  | ~60–120 iterations         | `(mod-1)^2` can exceed `2^63`; use `__int128` in C++ or Python's arbitrary precision       |
| Need modular inverse, mod is prime        | O(log mod)                 | Fermat's little theorem: `a^(-1) ≡ a^(mod-2) (mod p)` - one binary exponentiation call    |
| Need modular inverse, mod not prime       | O(log mod)                 | Extended Euclidean algorithm; Fermat's theorem does NOT apply to composite moduli           |
| Matrix / linear recurrence in O(log n)    | O(k³ log n), k = matrix dim| Matrix exponentiation - same bit-scan loop, matrix multiply replaces scalar multiply        |

**Reading the constraint:** An exponent `exp ≤ 10^18` is the decisive signal - O(exp) is ruled out with finality; only O(log exp) is viable.

---

## When to use / when not

**Use modular exponentiation when:**

- Any problem involving `base^exp mod m` with `exp > ~100` - the naive loop is too slow
- Computing a modular inverse when the modulus is prime: `a^(-1) ≡ a^(p-2) (mod p)` via Fermat's little theorem - this IS binary exponentiation with exponent `p-2`
- Cryptographic operations: RSA encryption/decryption, Diffie-Hellman key exchange, AES key schedule - all reduce to `base^exp mod m` on large integers
- Contest problems with "answer mod 10^9+7" that involve powers: this is always a signal to use modular exponentiation
- Fibonacci or any linear recurrence for very large n: use matrix exponentiation (same algorithm, matrix multiply as the "operation")

**In contests:** Prefer Python's built-in `pow(base, exp, mod)`. It is implemented natively as fast modular exponentiation - O(log exp), not Python's slow arbitrary-precision `**` which builds the full `base^exp` integer in memory before taking mod. The three-argument `pow` is always the right choice. For C++, implement the loop yourself.

**In interviews:** Python's `pow(b, e, m)` is fine to cite, but implement from scratch to demonstrate understanding. The interviewer is testing whether you know the algorithm, not whether you can look up library functions.

**Do not use naive repeated multiplication when:**

- `exp > 10^6` - O(exp) will time out in any real system
- Intermediate products can overflow 64-bit integers - `base * base` overflows if `base ~ 10^9` in a 64-bit system (the product is ~10^18, which just fits `long long`, but `base * base * base` does not)

**Fermat's little theorem trap:** `a^(p-2) mod p` gives the modular inverse ONLY when `p` is prime. Silently applying it for a composite modulus gives a wrong answer with no error. Always verify primality before using Fermat's inverse. Use the extended Euclidean algorithm instead for composite moduli - it costs O(log m) regardless of primality and also detects when the inverse doesn't exist (`gcd(a, m) > 1`). Fermat's method is simpler to write (`pow(a, p-2, p)`) but narrower in applicability; extended Euclidean is the general tool.

**Real-world usage:** RSA encryption is `m^e mod n` where `n` is a 2048-bit semiprime and `e` is a 65537-bit public exponent. Every TLS handshake in every browser runs this algorithm. Diffie-Hellman key exchange is `g^a mod p` where `p` is a large safe prime. The same O(log exp) binary exponentiation - on big integers rather than 64-bit ints - is the workhorse of all public-key cryptography.

---

## Comparison

| Method                               | Time             | Space   | Requires prime mod? | Pick it when…                                                              |
| ------------------------------------ | ---------------- | ------- | ------------------- | -------------------------------------------------------------------------- |
| **Modular exponentiation** (this)    | O(log exp)       | O(1)    | No                  | You need `base^exp mod m` for any `exp > ~100`; always the right choice   |
| Naive repeated multiply              | O(exp)           | O(1)    | No                  | Only for `exp ≤ ~100` in throwaway code; never in production or contests  |
| Matrix exponentiation                | O(k³ log n)      | O(k²)   | No                  | You need a linear recurrence (Fibonacci, tribonacci) in O(log n); crossover: k ≥ 2 and n ≥ 100 |
| Python `pow(b, e, m)` built-in       | O(log e)         | O(1)    | No                  | Any contest/script in Python - same algorithm, zero implementation cost   |
| Python `b ** e % m`                  | O(e · bit(b))    | O(e · bit(b)) | No             | Never - builds full `b^e` integer first; catastrophic for large `e`       |

**Crossover:** Matrix exponentiation pays a `k³` constant per step vs scalar's `1`; for Fibonacci (k=2) that's 8× slower per iteration but still O(log n). Use it only when the problem is a linear recurrence, not for ordinary integer powers.

---

## Bit-tricks table

Modular exponentiation IS a bit-manipulation algorithm. The entire structure is a scan of the binary representation of `exp`, bit by bit from LSB to MSB.

| Bit operation      | Purpose in modular exponentiation                                            | General pattern                                              |
| ------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `exp & 1`          | Test the lowest bit: 1 = current power of two contributes to the result     | Test any bit: `(n >> k) & 1` tests bit k                    |
| `exp >>= 1`        | Consume the lowest bit: advance to the next bit                              | Enumerate all bits LSB→MSB: `while n: bit = n & 1; n >>= 1` |
| `base = base * base % mod` | Square the base: base now represents the next higher power of two  | Repeated squaring applies to any associative operation        |
| Initial `result = 1` | Identity for multiplication: the neutral element under the operation       | Matrix exp uses identity matrix; polynomial exp uses 1      |

**The repeated-squaring abstraction:**

The pattern `while exp > 0: if exp & 1: result = op(result, base); base = op(base, base); exp >>= 1` works for any operation `op` that is:
1. **Associative:** `op(op(a, b), c) = op(a, op(b, c))`
2. **Has an identity:** some `e` where `op(e, x) = x` for all `x`

This is a monoid homomorphism. Examples:
- `op = ×` on integers → modular exponentiation (this article)
- `op = matrix multiply` → matrix exponentiation for linear recurrences
- `op = polynomial multiply mod m` → polynomial exponentiation
- `op = string concatenation` → fast string repetition

**Binary representation connection:** The algorithm computes `base^exp` as `∏ base^(2^i)` for each bit `i` that is set in `exp`. This is not an approximation - it is the exact binary expansion of `exp`:

```
exp = b_k × 2^k + b_(k-1) × 2^(k-1) + … + b_1 × 2 + b_0

base^exp = base^(b_k × 2^k) × base^(b_(k-1) × 2^(k-1)) × … × base^b_0
         = (base^(2^k))^b_k × (base^(2^(k-1)))^b_(k-1) × … × base^b_0

Only the terms where b_i = 1 contribute. The algorithm generates base^(2^i)
by repeated squaring and multiplies in each term whose bit is set.
```

---

## Edge cases

1. **`exp = 0`:** Any nonzero `base^0 = 1`. The loop never executes (condition `exp > 0` is false from the start). Return 1. **But:** if `mod = 1`, then `1 mod 1 = 0`, not 1 - see case 3.

2. **`base = 0`:** `0^exp = 0` for any `exp > 0`. The algorithm handles this correctly (result stays 0 after any multiply by base). Special case: `0^0` is conventionally 1, which the algorithm also returns correctly since the loop never executes.

3. **`mod = 1`:** Every integer mod 1 is 0 - including `b^0 = 1 mod 1 = 0`. The naive implementation initialises `result = 1` and exits immediately when `exp = 0`, returning 1 instead of 0. Guard explicitly: `if mod == 1: return 0` before the loop (as in the implementation above). Python's `pow(b, e, 1)` correctly returns 0.

4. **`negative exp` (modular inverse needed):** `base^(-1) mod m` requires the modular inverse of `base`. If `m` is prime and `gcd(base, m) = 1`, use `pow(base, m - 2, m)`. If `m` is composite, use the extended Euclidean algorithm. If `gcd(base, m) > 1`, the inverse does not exist and you cannot compute a negative power.

5. **Large `base ≥ mod`:** The algorithm reduces `base %= mod` at the start. This is correct by the multiplicative homomorphism property: `base^exp mod m = (base mod m)^exp mod m`. Failing to reduce first wastes time on large intermediate products.

6. **Overflow in C++ intermediate step:** When `base` and `mod` are both close to `10^9`, the product `base * base` is close to `10^18` - within the `long long` range (max ~9.2×10^18). Safe. But if `mod > ~3 × 10^9`, then `(mod-1)^2 > 9 × 10^18` exceeds `long long`. Use `__int128` or Python. In Python, arbitrary-precision integers absorb this automatically.

7. **`exp` as very large number (e.g., given as string):** Some problems give `exp` as a digit string of thousands of digits. Use Euler's theorem (`a^φ(m) ≡ 1 mod m` for `gcd(a,m)=1`) to reduce `exp` modulo `φ(m)` first, then apply standard binary exponentiation.

---

## Implementation

### Pseudocode (CLRS style, iterative)

```
MODPOW(base, exp, mod)
  ▷ Compute base^exp mod mod in O(log exp) time, O(1) space
  ▷ Requires: mod ≥ 1, exp ≥ 0
  result ← 1
  base   ← base mod mod       ▷ reduce base; handles base ≥ mod
  while exp > 0
      if exp & 1 = 1           ▷ lowest bit of exp is set
          result ← (result × base) mod mod
      base ← (base × base) mod mod   ▷ square for next bit position
      exp  ← exp >> 1                ▷ consume lowest bit
  return result
```

### Pseudocode (CLRS style, recursive)

```
MODPOW-REC(base, exp, mod)
  ▷ Recursive form; O(log exp) stack depth
  if exp = 0
      return 1
  if exp & 1 = 0               ▷ even exponent
      half ← MODPOW-REC(base, exp >> 1, mod)
      return (half × half) mod mod
  else                          ▷ odd exponent
      half ← MODPOW-REC(base, exp >> 1, mod)
      return (half × half mod mod × base) mod mod
```

### Python - from-scratch iterative

```python
def modpow(base: int, exp: int, mod: int) -> int:
    """
    Binary exponentiation: compute base^exp mod mod in O(log exp).

    Iterative, O(1) space. In contests, use pow(base, exp, mod) directly.
    """
    if mod == 1:
        return 0             # n mod 1 = 0 for all n, including b^0 = 1
    result = 1
    base %= mod              # reduce; handles base >= mod
    while exp > 0:
        if exp & 1:          # lowest bit set: multiply current power into result
            result = result * base % mod
        base = base * base % mod   # square: advance to next power of two
        exp >>= 1                  # consume lowest bit
    return result
```

### Python - recursive

```python
def modpow_recursive(base: int, exp: int, mod: int) -> int:
    """Recursive binary exponentiation. O(log exp) stack depth."""
    if exp == 0:
        return 1
    half = modpow_recursive(base, exp >> 1, mod)
    result = half * half % mod
    if exp & 1:
        result = result * base % mod
    return result
```

### Python - contest one-liner

```python
# In any contest, this IS the right answer.
# Python's built-in pow(b, e, m) uses binary exponentiation internally.
# It is O(log e), not the catastrophic O(e) of b ** e % m.
result = pow(base, exp, mod)
```

### Fermat's little theorem - modular inverse

```python
def modinv_prime(a: int, p: int) -> int:
    """
    Modular inverse of a modulo prime p.
    Uses Fermat's little theorem: a^(p-1) ≡ 1 (mod p) for prime p,
    so a^(-1) ≡ a^(p-2) (mod p).
    Requires: p prime, gcd(a, p) = 1.
    """
    return pow(a, p - 2, p)   # this is itself a modular exponentiation call
```

### Matrix exponentiation - Fibonacci in O(log n)

```python
MOD = 10**9 + 7

def mat_mul(A: list[list[int]], B: list[list[int]]) -> list[list[int]]:
    """2×2 matrix multiply mod MOD."""
    return [
        [(A[0][0]*B[0][0] + A[0][1]*B[1][0]) % MOD,
         (A[0][0]*B[0][1] + A[0][1]*B[1][1]) % MOD],
        [(A[1][0]*B[0][0] + A[1][1]*B[1][0]) % MOD,
         (A[1][0]*B[0][1] + A[1][1]*B[1][1]) % MOD],
    ]

def mat_pow(M: list[list[int]], n: int) -> list[list[int]]:
    """Same bit-scan loop as modpow, but the 'multiply' is mat_mul."""
    result = [[1, 0], [0, 1]]   # identity matrix
    while n > 0:
        if n & 1:
            result = mat_mul(result, M)
        M = mat_mul(M, M)
        n >>= 1
    return result

def fib(n: int) -> int:
    """F(n) mod MOD in O(log n). Same algorithm, different 'operation'."""
    if n <= 1:
        return n
    M = [[1, 1], [1, 0]]
    return mat_pow(M, n)[0][1]
```

---

## What the interviewer probes for

- **"Why not just use `base ** exp % mod` in Python?"** - Python's `**` builds the full `base^exp` as an arbitrary-precision integer before applying `%`. For `exp = 10^9`, that integer has hundreds of millions of digits - computing it takes O(exp · M(exp)) time and O(exp · log base) memory, both catastrophic. Python's three-argument `pow(base, exp, mod)` uses binary exponentiation internally, staying O(log exp) and never allocating a large intermediate. The difference is observable: `2 ** (10**9) % (10**9+7)` will hang; `pow(2, 10**9, 10**9+7)` returns in microseconds.

- **"How do you compute `a^(-1) mod p`?"** - If `p` is prime and `gcd(a, p) = 1`, Fermat's little theorem gives `a^(p-1) ≡ 1 (mod p)`, so multiplying both sides by `a^(-1)` gives `a^(-1) ≡ a^(p-2) (mod p)`. This is a single `pow(a, p-2, p)` call - modular exponentiation itself. If `p` is not prime, use the extended Euclidean algorithm instead; Fermat's theorem requires primality.

- **"How would you extend this to matrix exponentiation for Fibonacci?"** - The Fibonacci recurrence `F(n) = F(n-1) + F(n-2)` can be written as a matrix equation: `[F(n+1), F(n)]^T = [[1,1],[1,0]] × [F(n), F(n-1)]^T`. Raising the 2×2 matrix to the n-th power via the same bit-scan loop (replacing scalar multiply with matrix multiply) gives F(n) in O(log n). The key observation: binary exponentiation works for any associative operation with an identity - scalar multiply, matrix multiply, or polynomial multiply.

- **"What happens when the intermediate product overflows 64 bits in C++?"** - If `base` is near `10^9` and `mod` is near `10^9`, then `base * base` is ~10^18 which fits in `long long` (max ~9.2×10^18). But if `mod > ~3.0 × 10^9`, then `(mod - 1)^2 > 9 × 10^18` and overflows. Solutions: use `__int128` in C++, reduce `base` to `base % mod` before each multiply (standard practice), or use Python where arbitrary precision handles it automatically.

---

## Practice problems

### 1. Pow(x, n) - LC 50

**Problem:** Implement `pow(x, n)` for a 64-bit float `x` and a 32-bit integer `n`, including negative exponents. Return `x^n`. Constraints: `-100.0 < x < 100.0`, `-2^31 ≤ n ≤ 2^31 - 1`.

**Approach:** Binary exponentiation on floats - same bit-scan loop, no mod involved. For negative `n`, compute `pow(1/x, -n)`. The only gotcha: in C++, negating `n = -2^31` overflows a 32-bit int because `2^31` is out of range; in Python this is safe since integers are arbitrary precision.

```python
def myPow(x: float, n: int) -> float:
    if n < 0:
        x, n = 1.0 / x, -n   # Python: no overflow risk
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
- Super Pow (LC 372) - `a^b mod 1337` where `b` is a digit array; decompose by digit using Euler's theorem and apply binary exponentiation per chunk.
- Fast Matrix Power - same squaring loop, matrix multiply as the operation.

---

### 2. Fermat's last step - modular inverse for combinations

**Problem:** Given `n` and `k`, compute `C(n, k) mod (10^9 + 7)`. Both `n` and `k` can be up to `10^6`, and you may receive up to `10^5` queries. Constraints: `0 ≤ k ≤ n ≤ 10^6`, prime modulus `p = 10^9 + 7`.

**Approach:** `C(n, k) = n! / (k! × (n-k)!)`. Division modulo a prime is multiplication by the modular inverse. Precompute factorial and inverse-factorial arrays in O(n + log p): one forward pass for factorials, one Fermat call `pow(fact[n], p-2, p)` for the top inverse, then one backward pass to fill all inverse factorials. Each query is then O(1).

The Fermat call `pow(fact[n], p - 2, p)` is itself a modular exponentiation - this problem nests binary exponentiation inside the precomputation for the O(1) queries.

```python
def precompute(n: int, p: int) -> tuple[list[int], list[int]]:
    fact = [1] * (n + 1)
    for i in range(1, n + 1):
        fact[i] = fact[i - 1] * i % p
    inv_fact = [1] * (n + 1)
    inv_fact[n] = pow(fact[n], p - 2, p)   # one modular exponentiation call
    for i in range(n - 1, -1, -1):
        inv_fact[i] = inv_fact[i + 1] * (i + 1) % p
    return fact, inv_fact

def comb(n: int, k: int, fact: list[int], inv_fact: list[int], p: int) -> int:
    if k < 0 or k > n:
        return 0
    return fact[n] * inv_fact[k] % p * inv_fact[n - k] % p

# Usage
p = 10**9 + 7
fact, inv_fact = precompute(10**6, p)
print(comb(10, 3, fact, inv_fact, p))   # 120
```

**Complexity:** O(n + log p) precomputation, O(1) per query.

**Duplicate problems:**
- Unique Paths II (LC 63) - combinatorial with obstacles; same C(n,k) formula for the obstacle-free version.
- Binomial Coefficient (many contest variants) - same factorial inverse table.

---

### 3. Fibonacci Number for large n - matrix exponentiation

**Problem:** Compute the n-th Fibonacci number (`F(0) = 0, F(1) = 1`) modulo `10^9 + 7`, where `1 ≤ n ≤ 10^18`. The standard iterative O(n) approach is too slow for n near `10^18`.

**Approach:** The Fibonacci recurrence is a linear recurrence with a 2×2 transition matrix `[[1,1],[1,0]]`. Raising this matrix to the n-th power via binary exponentiation gives `F(n)` in O(log n) matrix multiplications. This is the same bit-scan skeleton as scalar modular exponentiation - the "multiply" operation is now 2×2 matrix multiplication taken mod p.

*The non-obvious connection:* binary exponentiation is not specific to integers. Any monoid (associative operation with an identity) supports repeated squaring. The identity for matrices is the identity matrix; the operation is matrix multiply. The bit-scan code is structurally identical.

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
    result = [[1, 0], [0, 1]]  # identity matrix
    while n > 0:
        if n & 1:
            result = mat_mul(result, M)
        M = mat_mul(M, M)
        n >>= 1
    return result

def fib(n: int) -> int:
    if n <= 1:
        return n
    return mat_pow([[1, 1], [1, 0]], n)[0][1]

print(fib(10))        # 55
print(fib(10**18))    # fast
```

**Complexity:** O(log n) matrix multiplications, each O(1) for a 2×2 matrix → O(log n) total. Space: O(1) (four 2×2 matrices, constant size).

**Duplicate problems:**
- Climbing Stairs (LC 70) - same Fibonacci recurrence, n ≤ 45; naive iteration works but matrix pow demonstrates the technique.
- Count Vowel Permutations (LC 1220) - transition matrix DP; same matrix exponentiation pattern for very large n.
