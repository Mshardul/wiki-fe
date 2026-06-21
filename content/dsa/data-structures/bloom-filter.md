# Bloom Filter

## Prerequisites

<!-- U9: [Title](./path.md) [Must read] - reason. HTML-comment link for unwritten targets. -->

## Table of Contents

<!-- U10: reflect the headings below. -->

## What it is

<!-- U1: one-sentence definition + mental model / analogy. U13: end with the spoken soundbite, marked as the takeaway. -->

## How it works

<!-- DS1: internal layout + a REAL diagram (mermaid or ASCII — no placeholder). -->

## Operations

<!-- DS2: table, each op (insert/find/delete…) with its own time AND space O(). -->

| Operation | Time | Space |
| --------- | ---- | ----- |
|           |      |       |

## Complexity summary

<!-- DS3: time/space, best / average / worst where they differ. -->

## When to use / when not

<!-- DS4 + U3: decision cues naming ≥1 sibling structure (e.g. array vs linked-list) — PROSE. The scannable table is DS8 below, don't duplicate.
     U17 (advisory): fold in ONE sentence naming a real system where this is a workhorse (cross-link system-design where natural). -->

## Comparison

<!-- DS8 (gated): a TABLE — rows = this structure + real rivals, columns = key ops' time/space + the distinguishing trade-off (ordering? contiguity? lookup?). Scannable. Must add what DS4 prose doesn't; prose-only or single-row caps at 5. -->

## Variants

<!-- DS5 (advisory): ≥1 real variant. Include CP-relevant variants where they exist. -->

## Hashing & collisions

<!-- FB: Hash-based family block — hash fn, chaining vs open-addressing, load factor, resize. Adapt: for a bloom filter this means the k independent hash functions, false-positive rate formula, and the optimal k given m bits and n elements. -->

## Implementation

<!-- DS6: structure definition + core ops. U5 pseudocode (CLRS) + U4 Python (idiomatic). Pseudocode must NOT be pasteable as Python. -->

## Gotchas / edge cases

<!-- DS7: ≥2 interview traps, including ≥1 CP-flavored where relevant (overflow on accumulation, 1-vs-0 indexing, fast I/O, modular arithmetic). The senior-depth trap lives here. -->

## Practice problems

<!-- U6: ≥3 problems, each a WORKED entry (### subheading per problem): (1) full problem statement in 2–3 sentences + constraints where they matter; (2) approach/insight in prose; (3) short runnable Python solution; (4) time/space complexity. Tag the pattern + relative .md cross-link where a target exists. Favor canonical staples. EVERY PROBLEM MUST EXERCISE A DISTINCT TECHNIQUE — no duplicates padding the count. -->
