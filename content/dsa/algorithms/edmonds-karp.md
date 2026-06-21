# Edmonds-Karp

## Prerequisites

<!-- U9: [Title](./path.md) [Must read] - reason. HTML-comment link for unwritten targets. -->

## Table of Contents

<!-- U10: reflect the headings below. -->

## What it is

<!-- U1: definition + mental model (Ford-Fulkerson + BFS for shortest augmenting path). U13: spoken soundbite. U2: O(VE²). -->

## Intuition

<!-- AL1: plain-language WHY BFS gives a complexity bound — shortest augmenting paths can only get longer over time (monotone distance lemma), bounding the number of augmentations to O(VE). -->

## How it works

<!-- AL2: step-by-step trace on a concrete capacity graph + a REAL diagram. Point back to the invariant per step. -->

## Correctness / invariant

<!-- AL3: inherits Ford-Fulkerson correctness; the new invariant is the monotone-distance lemma that gives the O(VE) augmentation bound. -->

## Complexity derivation

<!-- AL4: WHY O(VE²) — O(VE) augmentations (monotone distance lemma), each BFS costs O(E). -->

## Constraints & approach

<!-- AL10 (gated): a TABLE mapping input size → expected complexity → which approach. -->

## When to use / when not

<!-- AL5 + U3: decision cues vs Ford-Fulkerson and Dinic — PROSE. Scannable table is AL9 below.
     U17 (advisory): fold in ONE sentence naming a real system where this is a workhorse. -->

## Comparison

<!-- AL9 (gated): a TABLE — rows = Ford-Fulkerson + Edmonds-Karp + Dinic, columns = time/space + key constraint. -->

## Graph/tree assumptions

<!-- FB: Traversal family block — directed, weighted (capacity), BFS on residual graph for shortest augmenting path. -->

## Edge cases

<!-- AL6: ≥3 of: no augmenting path, disconnected graph, parallel edges, capacity-1 graphs. Include ≥1 CP-flavored trap. -->

## Implementation

<!-- AL7: U5 pseudocode (CLRS) + U4 Python (idiomatic). Pseudocode must NOT be pasteable as Python. -->

## What the interviewer probes for

<!-- AL8 (advisory): typical follow-ups, each = question + 2–3 sentence answer sketch. -->

## Practice problems

<!-- U6: ≥3 problems, each a WORKED entry (### subheading per problem): (1) full problem statement in 2–3 sentences + constraints where they matter; (2) approach/insight in prose; (3) short runnable Python solution; (4) time/space complexity. Tag the pattern + relative .md cross-link where a target exists. Favor canonical staples. EVERY PROBLEM MUST EXERCISE A DISTINCT TECHNIQUE — no duplicates padding the count. -->
