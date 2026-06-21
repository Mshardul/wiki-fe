# Suffix Array

## Prerequisites

<!-- U9: [Title](./path.md) [Must read] - reason. HTML-comment link for unwritten targets. -->

## Table of Contents

<!-- U10: reflect the headings below. -->

## What it is

<!-- U1: one-sentence definition + mental model / analogy. U13: end with the spoken soundbite, marked as the takeaway. -->

## How it works

<!-- DS1: internal layout + a REAL diagram (mermaid or ASCII — no placeholder). -->

## Operations

<!-- DS2: table, each op (build, pattern search, LCP query…) with its own time AND space O(). -->

| Operation | Time | Space |
| --------- | ---- | ----- |
|           |      |       |

## Complexity summary

<!-- DS3: time/space, best / average / worst where they differ. -->

## When to use / when not

<!-- DS4 + U3: decision cues naming ≥1 sibling structure (suffix tree, rolling hash + binary search, KMP) — PROSE. The scannable table is DS8 below, don't duplicate.
     U17 (advisory): fold in ONE sentence naming a real system where this is a workhorse (cross-link system-design where natural). -->

## Comparison

<!-- DS8 (gated): a TABLE — rows = suffix array + suffix tree + rolling hash, columns = build time/space + query time + implementation complexity. Scannable. -->

## Variants

<!-- DS5 (advisory): ≥1 real variant (LCP array, SA-IS construction, DC3/Skew algorithm). -->

## Memory layout

<!-- FB: Linear family block — suffix array is a sorted array of integer indices; memory layout is contiguous ints, cache-friendly for binary search. Contrast with suffix tree's pointer-heavy nodes. -->

## Implementation

<!-- DS6: structure definition + core ops. U5 pseudocode (CLRS) + U4 Python (idiomatic). Pseudocode must NOT be pasteable as Python. -->

## CP-primitives

<!-- CP (advisory for non-linear): suffix array + LCP for: longest repeated substring, number of distinct substrings, longest common substring of two strings. Each with one-line "why for CP". -->

## Gotchas / edge cases

<!-- DS7: ≥2 interview traps, including ≥1 CP-flavored where relevant (sentinel character needed, 0-indexed vs 1-indexed suffix ranks, LCP array construction separate from SA). -->

## Practice problems

<!-- U6: ≥3 problems, each a WORKED entry (### subheading per problem): (1) full problem statement in 2–3 sentences + constraints where they matter; (2) approach/insight in prose; (3) short runnable Python solution; (4) time/space complexity. Tag the pattern + relative .md cross-link where a target exists. Favor canonical staples. EVERY PROBLEM MUST EXERCISE A DISTINCT TECHNIQUE — no duplicates padding the count. -->
