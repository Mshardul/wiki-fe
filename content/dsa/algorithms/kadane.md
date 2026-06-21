# Kadane's Algorithm

## Prerequisites

<!-- U9: [Title](./path.md) [Must read] - reason. HTML-comment link for unwritten targets. -->

## Table of Contents

<!-- U10: reflect the headings below. -->

## What it is

<!-- U1: definition + mental model. U13: spoken soundbite, marked as the takeaway. U2: O(n) time, O(1) space. -->

## Intuition

<!-- AL1: plain-language WHY it works — the greedy choice: at each position, either extend the current subarray or start fresh. A negative running sum can only hurt any extension. -->

## How it works

<!-- AL2: step-by-step trace on a concrete input (mix of positive and negative) + a REAL diagram showing current_sum and max_sum per step. Point back to the invariant per step. -->

## Correctness / invariant

<!-- AL3: the loop invariant — current_sum = max subarray sum ending exactly at index i; max_sum = max subarray sum ending anywhere in [0..i]. Prove the greedy choice is safe. -->

## Complexity derivation

<!-- AL4: WHY O(n) — single pass, O(1) work per element. WHY O(1) space — only two variables maintained. -->

## Constraints & approach

<!-- AL10 (gated): a TABLE mapping input size → expected complexity → which approach. -->

## When to use / when not

<!-- AL5 + U3: decision cues vs D&C max-subarray (O(n log n)), prefix-sum approach (O(n), less obvious). PROSE. Scannable table is AL9 below.
     U17 (advisory): fold in ONE sentence naming a real system where this algorithm is a workhorse. -->

## Comparison

<!-- AL9 (gated): a TABLE — rows = Kadane's + D&C max-subarray + prefix-sum brute force, columns = time/space + key constraint each assumes. -->

## Loop/recurrence invariant

<!-- FB: Search/divide family block — note: Kadane's is a linear scan, not a recurrence. Flag the stretch in a > Family note blockquote and treat the loop invariant as the family block content. -->

## Edge cases

<!-- AL6: ≥3 of: all negative (max is the least-negative element), all positive, single element, empty array, overflow on accumulation. Include ≥1 CP-flavored trap (integer overflow when summing large values, all-negative variant vs must-include-one variant). -->

## Implementation

<!-- AL7: U5 pseudocode (CLRS) + U4 Python (idiomatic). Pseudocode must NOT be pasteable as Python. -->

## What the interviewer probes for

<!-- AL8 (advisory): typical follow-ups, each = question + 2–3 sentence answer sketch. -->

## Practice problems

<!-- U6: ≥3 problems, each a WORKED entry (### subheading per problem): (1) full problem statement in 2–3 sentences + constraints where they matter; (2) approach/insight in prose; (3) short runnable Python solution; (4) time/space complexity. Tag the pattern + relative .md cross-link where a target exists. Favor canonical staples. EVERY PROBLEM MUST EXERCISE A DISTINCT TECHNIQUE — no duplicates padding the count. -->
