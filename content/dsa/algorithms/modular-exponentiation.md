# Modular Exponentiation

> **🚧 Stub — work in progress.** Not yet written to depth; not registered in `index.md` and not yet linked from the [Number Theory](./number-theory.md) hub. Do not ship until it passes the rater. Scope when resumed: square-and-multiply `xⁿ = (x^(n/2))²`, keeping every intermediate `< m`; Fermat's modular inverse `a⁻¹ ≡ a^(p−2) mod p` for prime p; the `O(log n)` derivation; the 64-bit overflow trap on the intermediate product before `% m`.

## Prerequisites

- [Bit Manipulation](./bit-manipulation.md) [Must read] - the algorithm *is* the binary expansion of the exponent: square at every bit, multiply where the bit is 1.
- [Number Theory](./number-theory.md) [Should read] - the hub explaining where fast power sits in the contest math toolkit and how it yields the modular inverse.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)

## What it is

_TODO._ Family: **Search/divide** (or note the stretch — it's a halving recurrence on the exponent). Fill every Algorithm-section heading per [dsa-writer.md](../../../docs/_meta/ai-instructions/dsa-writer.md): Intuition, How it works (worked trace + diagram), Correctness/invariant, Complexity derivation, Constraints & approach, When to use / when not, Comparison, family block, Edge cases, Implementation (pseudocode ≠ Python; show Python's `pow(x, n, m)` as the contest-velocity one-liner), What the interviewer probes for, Practice problems.
