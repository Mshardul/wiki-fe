# Strongly Connected Components

## Prerequisites

<!-- U9: [Title](./path.md) [Must read] - reason. HTML-comment link for unwritten targets. -->

## Table of Contents

<!-- U10: reflect the headings below. -->

## What it is

<!-- U1: definition + mental model. U13: spoken soundbite, marked as the takeaway. U2: state time + space O() here or in the derivation. -->

## Intuition

<!-- AL1: plain-language WHY it works, separate from the walkthrough. Analogy welcome. -->

## How it works

<!-- AL2: step-by-step trace on a concrete input + a REAL diagram. Point back to the invariant per step if possible. -->

## Correctness / invariant

<!-- AL3: state the loop/recurrence invariant or correctness argument explicitly. -->

## Complexity derivation

<!-- AL4: WHY the O — solve the recurrence or count steps/space. Not "it's O(n)". -->

## Constraints & approach

<!-- AL10 (gated): a TABLE mapping input size → expected complexity → which approach. State what each constraint rules OUT and invites. -->

## When to use / when not

<!-- AL5 + U3: decision cues vs ≥1 competing algorithm — PROSE. Scannable table is AL9 below.
     U17 (advisory): fold in ONE sentence naming a real system where this algorithm is a workhorse. -->

## Comparison

<!-- AL9 (gated): a TABLE — rows = Kosaraju + Tarjan + (others where applicable), columns = time/space + the key constraint each assumes. Must add what AL5 prose doesn't. -->

## Graph/tree assumptions

<!-- FB: Traversal family block — visited-state, directed/weighted, queue vs stack vs PQ. For SCC: must be directed graph; two-pass DFS (Kosaraju) or single-pass with a stack (Tarjan); transpose graph. -->

## Edge cases

<!-- AL6: ≥3 of empty / single / duplicates / overflow / cycles. Handle each in the Python where natural. Include ≥1 CP-flavored trap where relevant. -->

## Implementation

<!-- AL7: U5 pseudocode (CLRS) + U4 Python (idiomatic). Pseudocode must NOT be pasteable as Python.
     Cover both Kosaraju (two-pass DFS + transpose) and Tarjan (single-pass, low-link values). -->

## What the interviewer probes for

<!-- AL8 (advisory): typical follow-ups, each = question + 2–3 sentence answer sketch. -->

## Practice problems

<!-- U6: ≥3 problems, each a WORKED entry (### subheading per problem): (1) full problem statement in 2–3 sentences + constraints where they matter; (2) approach/insight in prose; (3) short runnable Python solution; (4) time/space complexity. Tag the pattern + relative .md cross-link where a target exists. Favor canonical staples. EVERY PROBLEM MUST EXERCISE A DISTINCT TECHNIQUE — no duplicates padding the count. -->
