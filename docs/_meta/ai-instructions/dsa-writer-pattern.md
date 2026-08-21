# DSA Writer - Patterns

Category file for **Pattern** articles (`content/dsa/patterns/**/*.md`). Read [dsa-writer.md](./dsa-writer.md) first (article-kind detection, universal params, format conventions, depth bar) - this file adds only what's specific to Patterns. **Patterns have no family block.**

---

## Section block - Patterns

Write these in addition to the universal params.

| #    | Param                   | What to write                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PA1  | **Recognition signals** | The heart of the vertical - write it most carefully. **Three labeled parts**, each concrete: **(a) Trigger phrases** - **≥2** literal, quoted problem-statement snippets ("longest substring with at most K distinct characters", "next greater element"), not "when dealing with arrays". **(b) Structural cues** - input shape + output property regardless of wording. **(c) Not to be confused with** - name ≥1 neighbor pattern and state the distinction in one crisp sentence. |
| PA2  | How it works + diagram  | The mechanic, with a **real diagram**. Examples are **generic - no LC/problem names**: describe the trace by its mechanic ("pair summing to a target", "maximize `min(a,b) * width` over a height array"), not by the LC problem it happens to resemble. Same numbers/arrays/diagram steps as always, just nameless framing. This keeps How-it-works structurally unable to duplicate a Practice-problems entry by name.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| PA4  | Complexity              | Typical time/space of the pattern.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| PA5  | Variations              | Common twists on the pattern.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| PA10 | Constraints & approach  | A `## Constraints & approach` section: **input size → reach for this pattern (or not)**. The CP reading skill at the pattern level - `n ≤ 10⁵ and "contiguous subarray" → sliding window, not O(n²) brute force`; when the constraint pushes you _off_ this pattern to another. Patterns are CP-heavy, so this is **gated**. Contest tricks/variants of the mechanic (sliding window → monotonic-deque for window-max; two pointers → meet-in-the-middle; binary-search-on-answer) get their full worked-problem treatment in Practice problems, per U6/U23.                                  |
| PA7  | Pitfalls                | **≥2** common misapplications.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| PA8  | Related                 | Cross-links to the DS/algo it leans on + sibling patterns.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| PA9  | First 30 seconds        | The exact 2–3 sentences a candidate says out loud the moment they spot the pattern (e.g. _"This is a sliding window - longest contiguous subarray satisfying a constraint. Two pointers, expand right, contract left on a hashmap of counts."_). Distinct from PA1: PA1 is how to _recognize_; this is the _script_ once recognized - structure, why, approach in one breath.                                                                                                         |

---

## Headings list

```
# Title
## Prerequisites
## Table of Contents
## What it is              (U1, U13)
## Recognition signals     (PA1 - trigger phrases / structural cues / not to be confused with)
## How it works            (PA2 - diagram, generic/nameless examples)
## Complexity              (PA4)
## Constraints & approach  (PA10 - input size → reach for this pattern or not)
## Variations              (PA5)
## Pitfalls                (PA7)
## First 30 seconds        (PA9 - advisory; WRITE IT)
## Related                 (PA8)
## Practice problems        (U6/U22-25 - favor canonical staples, full worked entries; gated contest-tool entry)
```
