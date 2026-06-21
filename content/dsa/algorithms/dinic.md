# Dinic's Algorithm

## Prerequisites

<!-- U9: [Title](./path.md) [Must read] - reason. HTML-comment link for unwritten targets. -->

## Table of Contents

<!-- U10: reflect the headings below. -->

## What it is

<!-- U1: definition + mental model (level graph + blocking flows). U13: spoken soundbite. U2: O(V²E); O(E√V) for unit-capacity graphs. -->

## Intuition

<!-- AL1: plain-language WHY level graphs + blocking flows give O(V) phases — each phase increases the shortest augmenting path length by ≥1, so there are at most O(V) phases. Within each phase a blocking flow saturates all shortest paths. -->

## How it works

<!-- AL2: step-by-step trace on a concrete capacity graph + a REAL diagram. Point back to the invariant per step. -->

## Correctness / invariant

<!-- AL3: the level graph invariant; why a blocking flow exhausts all shortest augmenting paths in a phase; why phases terminate in O(V). -->

## Complexity derivation

<!-- AL4: WHY O(V²E) — O(V) phases, each blocking flow costs O(VE) via DFS with dead-end pruning. Special case O(E√V) for unit-capacity graphs. -->

## Constraints & approach

<!-- AL10 (gated): a TABLE mapping input size → expected complexity → which approach. -->

## When to use / when not

<!-- AL5 + U3: decision cues vs Edmonds-Karp — PROSE. Dinic is the practical choice for dense graphs and unit-capacity (bipartite matching). Scannable table is AL9 below.
     U17 (advisory): fold in ONE sentence naming a real system where this is a workhorse. -->

## Comparison

<!-- AL9 (gated): a TABLE — rows = Ford-Fulkerson + Edmonds-Karp + Dinic, columns = time/space + key constraint. -->

## Graph/tree assumptions

<!-- FB: Traversal family block — BFS for level graph construction, DFS with dead-end pruning for blocking flow. -->

## Edge cases

<!-- AL6: ≥3 of: no augmenting path, unit-capacity graphs, parallel edges, disconnected graph. Include ≥1 CP-flavored trap. -->

## Implementation

<!-- AL7: U5 pseudocode (CLRS) + U4 Python (idiomatic). Pseudocode must NOT be pasteable as Python. -->

## What the interviewer probes for

<!-- AL8 (advisory): typical follow-ups, each = question + 2–3 sentence answer sketch. -->

## Practice problems

<!-- U6: ≥3 problems, each a WORKED entry (### subheading per problem): (1) full problem statement in 2–3 sentences + constraints where they matter; (2) approach/insight in prose; (3) short runnable Python solution; (4) time/space complexity. Tag the pattern + relative .md cross-link where a target exists. Favor canonical staples. EVERY PROBLEM MUST EXERCISE A DISTINCT TECHNIQUE — no duplicates padding the count. -->
