# String Algorithm Decision Cheatsheet

Which string algorithm for which text task.

> 📖 Full articles:
> [String Matching (KMP)](../algorithms/string-matching.md) · [Z-Algorithm](../algorithms/z-algorithm.md) · [Rabin-Karp](../algorithms/rabin-karp.md) · [Manacher Algorithm](../algorithms/manacher-algorithm.md) · [Aho-Corasick](../algorithms/aho-corasick.md) · [String Hashing](../algorithms/string-hashing.md)

## Decision table

| Condition | Pick | Why |
| --- | --- | --- |
| Single pattern search in one text | KMP | O(n+m), failure function avoids rewinding text |
| Single pattern search, want the algorithm derived from prefix logic | Z-Algorithm | O(n+m) via Z-array on `P$T`, KMP's twin |
| Multiple pattern search, need to compare substrings fast | Rabin-Karp | O(n+m) avg via rolling hash, O(nm) worst on adversarial collisions |
| Find longest palindromic substring | Manacher | O(n), mirrors radii across a known palindrome center |
| Multi-pattern search, many patterns against one text, one pass | Aho-Corasick | O(n + Σm + matches), trie + failure links, KMP generalized |
| Need O(1) substring-equality checks after O(n) preprocessing | String Hashing | O(n) prefix-hash pass, then O(1) per comparison |

## Complexity

| Algorithm | Time | Space |
| --- | --- | --- |
| KMP | O(n + m) | O(m) |
| Z-Algorithm | O(n + m) | O(n) |
| Rabin-Karp | O(n + m) avg, O(n·m) worst | O(1) extra |
| Manacher | O(n) | O(n) |
| Aho-Corasick | O(n + Σm + matches) | O(Σm) |
| String Hashing | O(n) build, O(1) per query | O(n) |

## Gotchas

- ⚠️ Rabin-Karp's worst case is O(n·m) under adversarial hash collisions - use a strong/randomized modulus, or prefer KMP when worst-case matters.
- ⚠️ Aho-Corasick is overkill for a single pattern - it's built for many patterns scanned in one pass; use KMP or Z for one pattern.
- ⚠️ Manacher only finds palindromic substrings - for palindrome subsequence (non-contiguous) problems, that's a different DP (interval DP), not Manacher.
