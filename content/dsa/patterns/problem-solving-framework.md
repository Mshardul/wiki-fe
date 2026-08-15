# Problem-Solving Framework

> **Cheatsheet.** This page is a fast-lookup aggregator - it does not teach any topic in depth. Each entry links to its full article.

A repeatable loop for an unseen interview problem: what to do when you don't immediately recognize the pattern.

## Table of Contents

- [The loop](#the-loop)
- [Step 1 - Clarify](#step-1---clarify)
- [Step 2 - Plan](#step-2---plan)
- [Step 3 - Code](#step-3---code)
- [Step 4 - Verify](#step-4---verify)
- [Step 5 - Optimize](#step-5---optimize)
- [Stuck? Escape hatches](#stuck-escape-hatches)
- [Common failure modes](#common-failure-modes)

## The loop

| Step | Goal | Time budget (45-min interview) | If skipped |
| --- | --- | --- | --- |
| 1. Clarify | Pin down the actual problem before solving the wrong one | 2-3 min | Solve a problem the interviewer didn't ask |
| 2. Plan | Pick an approach and state its complexity before coding | 5-8 min | Code yourself into a corner mid-implementation |
| 3. Code | Translate the plan into working code | 15-20 min | - |
| 4. Verify | Catch bugs before the interviewer does | 5 min | Ship broken code, lose the "testing mindset" signal |
| 5. Optimize | Push toward the best achievable complexity | remaining time | Leave an easy complexity win on the table |

## Step 1 - Clarify

- **Restate the problem in your own words** - surfaces misreadings immediately, before any time is sunk.
- **Ask about input constraints**: size of `n` (drives which complexity is acceptable - see [Constraints & approach](./pattern-selection-cheatsheet.md)), value ranges, can it be empty/null, are duplicates possible, is it sorted.
- **Ask about output shape**: exact value, all valid answers, count, boolean, in-place vs new structure.
- **Confirm edge cases the interviewer cares about** before assuming - "should I handle an empty input, or can I assume it's always non-empty?"
- **Work one concrete example by hand** - not to test code yet, but to make sure your mental model of the problem matches the stated one. A hand-traced example often surfaces the actual mechanic before any pattern is named.

## Step 2 - Plan

- **Say the brute force out loud first**, even if obviously too slow - it's a starting complexity baseline and often reveals the mechanic that the optimal approach refines.
- **Run the trigger phrase / structural cues through the [Pattern Selection Cheatsheet](./pattern-selection-cheatsheet.md)** - literal wording ("contiguous subarray", "next greater element") and structural shape (sorted input? fixed window? tree/graph?) both matter; the cheatsheet's Recognition table maps both.
- **State the target complexity before writing any code** - "given n ≤ 10^5, I'm aiming for O(n log n) or better" - this is the single highest-leverage sentence in the interview: it commits you to a plan and gives the interviewer an early signal you're reasoning about scale, not just reaching for the first idea.
- **Sanity-check the approach against your Step 1 example by hand** before coding - catching a wrong approach here costs 2 minutes; catching it after coding costs the rest of the interview.
- **State space/time trade-offs explicitly if more than one viable approach exists** - "I could use O(n) extra space for a hashmap to get O(n) time, or O(1) space with a two-pointer approach if the input is sorted" - naming the trade is a senior-level signal even when you then pick one.

## Step 3 - Code

- **Narrate while writing** - interviewers evaluate the reasoning trace, not just the final diff; silent coding loses signal even when the code is correct.
- **Write the skeleton/structure first** (function signature, main loop shape, return statement) **before filling in logic** - catches structural mistakes (wrong function shape, missing edge-case branch) before they're buried inside dense logic.
- **Use the language's real idioms, not pseudocode-as-code** - `enumerate`, `collections.Counter`, `bisect` where they replace hand-rolled logic (see any article's Python/U4 section for the pattern).
- **If you get stuck mid-implementation**, say so explicitly and revisit Step 2's plan rather than thrashing silently - "let me step back, I think my approach has an issue with X" is a stronger signal than 3 minutes of silent flailing.

## Step 4 - Verify

- **Trace your own code on the Step 1 example, line by line** - don't just re-read it, actually simulate execution with real values.
- **Check the canonical edge-case menu for the problem's family** - empty input, single element, all-duplicates, already-sorted/reverse-sorted, one very large/very small value. (Family-specific menus - e.g. Distribution-family algorithms swap this for negative-key/adversarial-clustering - live on each technique's own Gotchas section.)
- **Check off-by-one boundaries explicitly** - loop bounds, array indices, the classic `<` vs `<=` in binary-search-shaped code.
- **State the final complexity out loud** - confirms it matches what you committed to in Step 2, and surfaces a missed optimization if it doesn't.

## Step 5 - Optimize

- **Revisit the brute force's bottleneck**: what's the one repeated computation, redundant scan, or unnecessary sort that a smarter data structure or the identified pattern removes?
- **Ask "have I seen this shape before?"** - most optimizations are a known technique (memoization on repeated subproblems, a hashmap trading space for O(1) lookup, a monotonic stack collapsing an O(n²) scan to O(n)) rather than a novel insight.
- **Don't over-optimize past what the constraints demand** - if `n ≤ 1000`, an O(n²) solution is often the *correct* stopping point; grinding toward O(n log n) the interviewer didn't ask for burns time better spent on edge cases.

## Stuck? Escape hatches

- **Re-read Step 1** - a surprising number of "stuck" moments are actually a misunderstood problem, not a hard problem.
- **Simplify the problem**: solve a smaller/restricted version first (fixed-size window instead of variable, a sorted-input assumption) - the simplified solution often reveals the general one.
- **Work backwards from the output shape** - if the answer is "the k largest," that shape alone points toward a heap regardless of what the rest of the problem looks like.
- **Ask the interviewer for a hint** - in a real interview, this is expected practice past a certain stuck-time, not a failure; interviewers actively want to see how you use a nudge.
- **Switch representations** - array to graph, string to array of counts, recursive to iterative - sometimes the blocker is the representation, not the algorithm.

## Common failure modes

- **Jumping to code before Step 2's plan** - the single most common interview failure; produces code that compiles but solves a different problem, or hits a wall halfway through requiring a restart.
- **Silently changing the plan mid-code without saying so** - the interviewer loses the thread of what you're building and can't help course-correct.
- **Declaring a complexity without deriving it** - "this is O(n log n)" without being able to say why, when probed, reads as memorized rather than understood.
- **Skipping Step 4 entirely under time pressure** - the last 2 minutes spent tracing an example catch the majority of real bugs; skipping this step to "save time" costs more time when the interviewer finds the bug for you.
