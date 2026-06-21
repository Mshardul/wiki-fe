# Rabin-Karp

## Prerequisites

<!-- U9: [Title](./path.md) [Must read] - reason. HTML-comment link for unwritten targets. -->

## Table of Contents

<!-- U10: reflect the headings below. -->

## What it is

<!-- U1: definition + mental model (rolling hash over a sliding window). U13: spoken soundbite. U2: O(n+m) average, O(nm) worst case. -->

## Intuition

<!-- AL1: plain-language WHY rolling hash avoids recomputing the full hash — subtract leftmost char's contribution, multiply by base, add new char. The hash is a fingerprint; only verify on hash match. -->

## How it works

<!-- AL2: step-by-step trace on a concrete text + pattern + a REAL diagram showing the rolling window. Point back to the invariant per step. -->

## Correctness / invariant

<!-- AL3: rolling hash invariant; why hash equality is necessary but not sufficient (spurious hits); why comparison on hit makes it correct. -->

## Complexity derivation

<!-- AL4: WHY O(n+m) average — expected O(n/q) spurious hits for a prime q; each hit costs O(m) verification, but expected total verification cost is O(n). Worst case O(nm) when all hashes collide. -->

## Constraints & approach

<!-- AL10 (gated): a TABLE mapping input size → expected complexity → which approach. -->

## When to use / when not

<!-- AL5 + U3: decision cues vs KMP and Z-algorithm — PROSE. Rabin-Karp's key advantage: multi-pattern search (one pass, k pattern hashes). Scannable table is AL9 below.
     U17 (advisory): fold in ONE sentence naming a real system where this is a workhorse. -->

## Comparison

<!-- AL9 (gated): a TABLE — rows = Rabin-Karp + KMP + Z-algorithm + naive, columns = time/space + key constraint each assumes (preprocessing? multi-pattern? alphabet size?). -->

## Loop/recurrence invariant

<!-- FB: Search/divide family block — rolling hash as a sliding invariant; how the search space shrinks (skip non-matching windows in O(1)). -->

## Edge cases

<!-- AL6: ≥3 of: pattern longer than text, all characters same (all spurious hits), hash collision, empty string, multi-pattern variant. Include ≥1 CP-flavored trap (modular arithmetic overflow, choosing prime and base). -->

## Implementation

<!-- AL7: U5 pseudocode (CLRS) + U4 Python (idiomatic). Pseudocode must NOT be pasteable as Python. -->

## What the interviewer probes for

<!-- AL8 (advisory): typical follow-ups, each = question + 2–3 sentence answer sketch. -->

## Practice problems

<!-- U6: ≥3 problems, each a WORKED entry (### subheading per problem): (1) full problem statement in 2–3 sentences + constraints where they matter; (2) approach/insight in prose; (3) short runnable Python solution; (4) time/space complexity. Tag the pattern + relative .md cross-link where a target exists. Favor canonical staples. EVERY PROBLEM MUST EXERCISE A DISTINCT TECHNIQUE — no duplicates padding the count. -->
