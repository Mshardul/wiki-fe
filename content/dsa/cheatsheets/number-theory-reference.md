# Number Theory Reference Cheatsheet

GCD/LCM, modular arithmetic, sieve - formulas in one glance.

> 📖 Full articles:
> [Number Theory](../algorithms/number-theory.md) (hub) · [Modular Arithmetic](../algorithms/modular-arithmetic.md) · [Modular Exponentiation](../algorithms/modular-exponentiation.md) · [Euclidean GCD](../algorithms/euclidean-gcd.md) · [Sieve of Eratosthenes](../algorithms/sieve-of-eratosthenes.md)

## Formulas

| Task | Formula | Complexity |
| --- | --- | --- |
| GCD | `gcd(a, b) = gcd(b, a mod b)`, base case `gcd(a, 0) = a` | O(log min(a,b)) |
| LCM | `lcm(a, b) = a * b // gcd(a, b)` | O(log min(a,b)) |
| Bézout's identity | `a*x + b*y = gcd(a,b)` via extended Euclid | O(log min(a,b)) |
| Modular add/sub | `(a + b) % m`, `(a - b + m) % m` | O(1) |
| Modular multiply | `(a * b) % m` | O(1) |
| Modular exponentiation | `pow(base, exp, mod)` - square and multiply | O(log exp) |
| Modular inverse (m prime) | `a^(-1) ≡ a^(m-2) (mod m)` via Fermat's little theorem | O(log m) |
| Modular inverse (m any) | extended Euclid: `gcd(a,m)=1` → `x mod m` is the inverse | O(log min(a,m)) |
| Sieve of Eratosthenes | mark composites up to n, strike multiples from p² | O(n log log n) |

## Decision table

| Condition | Pick |
| --- | --- |
| Need GCD/LCM of two numbers | Euclidean GCD |
| Need Bézout coefficients or modular inverse for a non-prime modulus | Extended Euclidean GCD |
| Need modular inverse, modulus IS prime | Fermat's little theorem (binary exponentiation) |
| Need base^exp mod m | Modular Exponentiation (square-and-multiply) |
| Need primality/factorization for many numbers up to n | Sieve of Eratosthenes |
| Need inverses of every integer 1..n under a prime modulus | Linear sieve for inverses (O(n) total, not O(n log p)) |

## Gotchas

- ⚠️ Fermat's method for modular inverse ONLY works when the modulus is prime - use extended Euclid for composite moduli.
- ⚠️ Subtraction-based GCD (`gcd(a,b) = gcd(a-b,b)`) is pseudo-polynomial, not O(log) - always use the mod-based recurrence.
- ⚠️ Recomputing modular inverse for every value 1..n with Fermat costs O(n log p) - the linear sieve for inverses does it in O(n) total when you need all of them.
