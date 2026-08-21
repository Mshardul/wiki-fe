# SD Writer - Algorithms & Concepts

Category file for **Algorithm/Concept** articles (`content/system-design/algorithms/**/*.md`). Read [sd-writer.md](./sd-writer.md) first (article-kind detection, universal params, NEVER, format conventions, callouts, topic boundary) - this file adds only what's specific to Algorithms/Concepts.

---

## Section block - Algorithms & Concepts

Write these in addition to the universal params.

**Goal & audience:** interview prep (trade-offs, application to system design, reasoning under constraints) + deep conceptual mastery. Approach: intuition-first - mental model → formal definition → mechanics → variants → real-world application → production trade-offs & interview scenarios.

| #   | Param | What to write |
| --- | ----- | -------------- |
| AL1 | Analogy | For abstract theorems/formal concepts, lead with one concrete real-world analogy before the mental model, mapping directly to the key trade-off - not just the name. ✅ "CAP = a bank branch during a network outage: stop serving customers (CP) or serve with possibly stale balances (AP)." ❌ "CAP is like choosing between different priorities." |
| AL2 | Formal definition | State the formal definition in plain English. If there's a canonical statement, quote then restate plainly. 1 sentence preferred, ≤3 max, ≤30 words, no notation. |
| AL3 | Proof sketch (conditional) | Include **only** when the argument itself is the insight - when knowing _why_ the result holds changes how you design systems (CAP's partition-forces-a-choice argument). Skip when the mechanism matters more than the proof. If included: intuitive only, no formal notation/induction, one paragraph max, framed as "why this must be true." |
| AL4 | Assumptions & preconditions | For theorems/formal concepts: what must be true for this to hold, and what breaks when violated. Distinct from failure modes - these are the concept's own boundary conditions. |
| AL5 | Often confused with | Direct disambiguation for commonly-conflated concepts (CAP vs PACELC, ACID vs BASE), placed after core mechanics, before variants. Table if 3+ dimensions differ. Frame as "X focuses on **_, Y focuses on _**", not as a correction. |
| AL6 | Variants & extensions | Only variants with distinct design implications - not an exhaustive list. Table if 3+ dimensions. Common case first, then extensions/edge cases. |
| AL7 | Complexity & formal properties | Where meaningful (time, space, error bounds, false-positive rates): state bounds plainly in prose or a small table, no derivations, always connect to the practical system-design implication. |

---

## Headings list

```
# Title
## Prerequisites
## Table of Contents
## TLDR
... (Mental Model, Formal Definition, Assumptions, Mechanics, Variants, etc. - see Suggested section starting points) ...
## Common Misapplications & Gotchas    (U19 misconceptions fold in as a sub-heading)
## Interview Scenario Bank             (U20 opening framing script, advisory)
## Appendices
```

---

## Suggested section starting points

Pick, merge, and reorder based on the topic. Omit inapplicable sections - never include empty placeholders.

Mental Model & Intuition · Formal Definition · Assumptions & Preconditions · Core Mechanics · Often Confused With · Variants & Extensions · When This Applies · Real-World Applications · Performance & Complexity · Common Misapplications & Gotchas (U19 misconceptions fold in) · Interview Scenario Bank (U20 opening script, advisory) · Appendices

---

## Self-check addition

- **Proof sketch test (AL3):** does the proof sketch illuminate a design insight, or is it just formalism? If the latter, cut it.
