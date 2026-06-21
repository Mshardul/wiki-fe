# Ford-Fulkerson

## Prerequisites

<!-- U9: [Title](./path.md) [Must read] - reason. HTML-comment link for unwritten targets. -->

## Table of Contents

<!-- U10: reflect the headings below. -->

## What it is

<!-- U1: definition + mental model. U13: spoken soundbite, marked as the takeaway. U2: state time + space O(). -->

## Intuition

<!-- AL1: plain-language WHY it works — augmenting paths, residual graph, max-flow min-cut. -->

## How it works

<!-- AL2: step-by-step trace on a concrete capacity graph + a REAL diagram. Point back to the invariant per step. -->

## Correctness / invariant

<!-- AL3: the augmenting path invariant; why termination requires integer capacities; max-flow min-cut theorem as the correctness certificate. -->

## Complexity derivation

<!-- AL4: WHY the O(E·|max_flow|) — worst case with irrational capacities never terminates; integer capacities terminate in |max_flow| augmentations each taking O(E). -->

## Constraints & approach

<!-- AL10 (gated): a TABLE mapping input size → expected complexity → which approach. State what each constraint rules OUT and invites. -->

## When to use / when not

<!-- AL5 + U3: decision cues vs Edmonds-Karp and Dinic — PROSE. Scannable table is AL9 below.
     U17 (advisory): fold in ONE sentence naming a real system where this algorithm is a workhorse. -->

## Comparison

<!-- AL9 (gated): a TABLE — rows = Ford-Fulkerson + Edmonds-Karp + Dinic, columns = time/space + the key constraint each assumes (integer caps? BFS vs DFS augmentation?). -->

## Graph/tree assumptions

<!-- FB: Traversal family block — directed, weighted (capacity), residual graph construction, DFS vs BFS path finding. -->

## Edge cases

<!-- AL6: ≥3 of: no path from source to sink, disconnected graph, parallel edges, self-loops, irrational capacities (non-termination). Include ≥1 CP-flavored trap. -->

## Implementation

<!-- AL7: U5 pseudocode (CLRS) + U4 Python (idiomatic). Pseudocode must NOT be pasteable as Python. -->

## What the interviewer probes for

<!-- AL8 (advisory): typical follow-ups, each = question + 2–3 sentence answer sketch. -->

## Practice problems

<!-- U6: ≥3 problems, each a WORKED entry (### subheading per problem): (1) full problem statement in 2–3 sentences + constraints where they matter; (2) approach/insight in prose; (3) short runnable Python solution; (4) time/space complexity. Tag the pattern + relative .md cross-link where a target exists. Favor canonical staples. EVERY PROBLEM MUST EXERCISE A DISTINCT TECHNIQUE — no duplicates padding the count. -->
