# Sieve of Eratosthenes

> **🚧 Stub - work in progress.** Not yet written to depth; not registered in `index.md` and not yet linked from the [Number Theory](./number-theory.md) hub. Do not ship until it passes the rater. Scope when resumed: mark composites by "every composite has a prime factor ≤ √n", `O(n log log n)` derivation; the **linear sieve** (`O(n)` + smallest-prime-factor → `O(log n)` factorization); the **segmented sieve** for ranges too large for memory; start marking at `i·i`.

## Prerequisites

- [Array](../data-structures/array.md) [Must read] - the sieve is a boolean array indexed by value; marking multiples is index arithmetic over it.
- [Number Theory](./number-theory.md) [Should read] - the hub explaining where the sieve sits in the contest math toolkit and what it precomputes for factorization and primality.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)

## What it is

_TODO._ Family: **Distribution** - repurpose the `## Key & distribution` heading to the sieve's marking structure, or note the stretch. Fill every Algorithm-section heading per [dsa-writer.md](../../../docs/_meta/ai-instructions/dsa-writer.md): Intuition, How it works (worked trace + diagram), Correctness/invariant, Complexity derivation (the `log log n` sum over primes), Constraints & approach (`n ≤ 10⁷` plain sieve vs single-number primality → Miller–Rabin), When to use / when not, Comparison, family block, Edge cases, Implementation (pseudocode ≠ Python), What the interviewer probes for, Practice problems.
