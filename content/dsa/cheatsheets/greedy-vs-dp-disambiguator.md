# Greedy vs DP Disambiguator Cheatsheet

Does the greedy choice provably work, or do you need DP.

> 📖 Full articles:
> [Greedy](../algorithms/greedy.md) · [Dynamic Programming](../algorithms/dynamic-programming.md)

## Decision table

| Condition | Pick | Why |
| --- | --- | --- |
| Can prove: locally-best choice is always part of some optimal solution (exchange argument) | Greedy | O(n log n) typical, single sorted pass, no need to explore alternatives |
| Can't prove the local choice is safe, OR a counterexample exists | DP | explores all choices, O(states × transition), guaranteed optimal |
| Choices interact - an earlier "obviously best" pick can block a better later combination | DP | greedy is silent when wrong - returns a plausible but suboptimal answer |
| Problem reduces to interval scheduling, MST, Huffman coding | Greedy | proven exchange-argument correctness for these classic families |
| Problem is knapsack-shaped with per-item weight/value tradeoffs (0/1, not fractional) | DP | greedy by value/weight ratio only works for the *fractional* variant |

## The classic trap: Coin Change

| Setup | Greedy result | Optimal result |
| --- | --- | --- |
| Coins [1, 3, 4], amount 6 | grab 4 first → 4+1+1 = 3 coins | 3+3 = 2 coins |

<abbr>Greedy</abbr>'s local choice (biggest coin first) poisons the global answer here - no crash, no obvious tell, just a wrong answer. This is why "no proof, no greedy."

## Proof checklist before trusting greedy

| Requirement | What it means |
| --- | --- |
| Greedy-choice property | a globally optimal solution can be reached by a sequence of locally optimal choices |
| Optimal substructure | after committing to the greedy choice, what remains is a smaller instance of the same problem |
| Exchange argument | show any optimal solution can be modified to include the greedy choice without losing optimality |

If you can't produce the <abbr>exchange argument</abbr>, assume DP until proven otherwise.

## Gotchas

- ⚠️ <abbr>Greedy</abbr> always returns *an* answer - it never crashes when the greedy-choice property fails, it just silently returns a suboptimal one.
- ⚠️ Fractional knapsack is greedy-solvable (by value/weight ratio); 0/1 knapsack is NOT - the indivisibility breaks the exchange argument, forcing DP.
- ⚠️ "Sort then scan" being the obvious approach doesn't mean it's correct - interval scheduling's greedy is provably correct, but many sort-then-scan approaches for other problems aren't.
