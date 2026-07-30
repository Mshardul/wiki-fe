# Suffix Tree

## Prerequisites

- [Trie](./trie.md) [Must read]
- [Suffix Array](./suffix-array.md) [Must read]
- [String](./string.md) [Should read]

## Table of Contents

- [Prerequisites](#prerequisites)
- [Table of Contents](#table-of-contents)
- [What it is](#what-it-is)
- [How it works](#how-it-works)
- [Operations](#operations)
- [Complexity summary](#complexity-summary)
- [When to use / when not](#when-to-use--when-not)
- [Comparison](#comparison)
- [Variants](#variants)
- [Traversal & invariant](#traversal--invariant)
- [Implementation](#implementation)
- [CP-primitives](#cp-primitives)
- [Gotchas / edge cases](#gotchas--edge-cases)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)

## What it is

A **suffix tree** is a compressed trie containing every suffix of a string, where each edge is labeled with a **substring** (not a single character) so that no internal node has only one child - giving O(m) pattern search regardless of text length, at the cost of a large pointer-heavy footprint per node.

Mental model: **a trie that's been "vacuum-sealed."** A plain trie of all suffixes would have long unbranching chains everywhere (every suffix eventually becomes unique, but shares a long common run first) - a suffix tree collapses each such chain into one edge labeled with the whole substring it represents. The shape only branches where suffixes actually diverge; everything else is compressed into a single edge-label.

> **Takeaway (say this out loud):** "A suffix tree is a compressed trie of every suffix - O(m) pattern search no matter how big the text, built in O(n) with Ukkonen's algorithm, at the cost of 30-40 bytes of pointer overhead per node instead of a suffix array's 4-8 bytes per character."

## How it works

Take every suffix of a string `s$` (the `$` sentinel guarantees no suffix is a prefix of another, so every suffix ends at a distinct leaf), and insert them all into a trie. Then **compress every chain of single-child nodes into one edge**, labeled with the substring that chain represented - the tree that results is the suffix tree.

```
String: "banana$"  (7 characters including sentinel)

All suffixes:
  banana$
  anana$
  nana$
  ana$
  na$
  a$
  $

Suffix tree (edges labeled with substrings, compressed):

                          (root)
                    /   |    |    \    \
                  a/   b/   n/   $     ...
                  /     |    |
              (node)  banana$  (node)
              /    \          /      \
          na$      $        a$      a$
          /          (leaf: "a$"    (multiple leaves under n-branch,
      (leaf:          starts at 5)   compressed similarly)
      "ana$"
      starts at 3)
      ...

Key idea: the edge "banana$" is ONE edge, not 7 single-character edges -
it exists because after 'b', every following character is forced (no
suffix branches off mid-word), so the whole run compresses to one label.
```

**Search for pattern `P`:** walk down from the root, at each node choosing the child whose edge label starts with the next unmatched character of `P`. Unlike a trie, an edge label can be **longer than one character**, so a single edge-traversal can consume multiple characters of `P` at once. If at any point the edge label diverges from `P` before `P` is exhausted, `P` doesn't occur. If `P` is fully consumed while still inside an edge, `P` occurs (possibly at multiple positions, one per leaf in the subtree below). Because the total path length walked is bounded by `|P|` (each step consumes at least one character of `P`, edges skip over already-known-matching characters), search is **O(m)** regardless of `n`.

**Why compression matters for complexity, not just memory.** An uncompressed suffix trie has O(n²) total edges in the worst case (e.g. `"aaaa...a"` - every suffix shares almost everything with the next, but a trie still allocates one edge per character per suffix). Compressing chains into substring-labeled edges caps the tree at exactly `n` leaves and at most `n-1` internal branching nodes - O(n) nodes total, which is what makes O(n) construction (via Ukkonen's algorithm) and O(n) space even possible.

## Operations


| Operation                            | Time         | Space        | Notes                                                                         |
| -------------------------------------- | -------------- | -------------- | ------------------------------------------------------------------------------- |
| Build (Ukkonen's algorithm)          | O(n)         | O(n)         | Amortized linear via suffix links; the online, incremental construction       |
| Pattern search (exists?)             | O(m)         | O(1) extra   | Walk from root, following edges; independent of text length n                 |
| Count occurrences                    | O(m + k)     | O(1) extra   | k = number of matches; each match is a leaf in the landed subtree             |
| Find all occurrence positions        | O(m + k)     | O(k)         | Same subtree walk, collecting leaf positions (one per occurrence)             |
| Longest repeated substring           | O(n)         | O(n)         | Deepest internal node (by string-depth) with ≥2 leaves below it              |
| Longest common substring (2 strings) | O(n₁ + n₂) | O(n₁ + n₂) | Generalized suffix tree over both strings, deepest node with leaves from both |

## Complexity summary


| Task                                          | Time   | Space                                                                                 |
| ----------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| Build (Ukkonen)                               | O(n)   | O(n) - but 30-40 bytes per node, ~10-20× a suffix array's footprint                  |
| Build (naive, insert each suffix into a trie) | O(n²) | O(n²) worst case (no compression during insert)                                      |
| Pattern search                                | O(m)   | O(1) extra                                                                            |
| Space per node                                | -      | O(alphabet size) for a child-pointer array, or O(1) amortized with a hashmap-per-node |

**No amortized behavior across operations** - once built, every search is O(m) independent of prior searches. The one amortized argument that matters is **inside** Ukkonen's construction itself: without suffix links, building the tree suffix-by-suffix naively costs O(n²) (each new suffix insertion can require O(n) work); suffix links let the algorithm jump between related insertion points in O(1) amortized per step, which is *why* Ukkonen achieves O(n) instead of O(n²) - the standard "each pointer moves down the tree a total of at most n times across the whole construction" accounting argument.

## When to use / when not

**Reach for a suffix tree when:** you need **O(m) pattern search with zero dependency on text length**, and you're willing to pay the memory cost and implementation complexity to get it - genome-scale exact-match search where query volume is enormous enough that O(m) vs O(m log n) actually matters, or when you need **generalized suffix tree** operations (longest common substring across many strings) and prefer the tree's direct node-sharing over stitching separator characters into a suffix array.

**Reach for something else when:** you need a **single-query, one-time build** (a [suffix array](./suffix-array.md) is simpler to implement and O(m log n) is rarely the bottleneck); you're **memory-constrained** (a suffix array uses 4-8 bytes per character vs a suffix tree's 30-40 bytes per node - a 10× difference that matters at genome scale); or you just need **prefix queries** without full suffix machinery (a plain [trie](./trie.md) is simpler and sufficient). In practice, **suffix arrays dominate suffix trees in production** precisely because the query-time difference (O(m) vs O(m log n)) rarely matters as much as the 10× memory and implementation-complexity cost - this is the single most-tested comparison in this space.

**Real-world usage:** suffix trees (and their generalized form) appear in bioinformatics tools for genome assembly and repeat-finding (early tools like REPuter), and in some full-text search engines' internals for exact substring indexing. **At scale:** genome-scale texts (3 × 10⁹ characters for the human genome) make an explicit 30-40-byte-per-node suffix tree infeasible in RAM (60-120 GB) - production genomics tools use the FM-index (a compressed suffix array via Burrows-Wheeler Transform) instead, which is why the suffix array article's "at scale" note names BWA/Bowtie/samtools as suffix-array (not suffix-tree) tools. This is the concrete reason suffix trees are taught but suffix arrays are shipped.

## Comparison


| Structure                                 | Build time                   | Space                     | Pattern query                            | Prefix enum | Implementation                                 | Pick it when…                                                                        |
| ------------------------------------------- | ------------------------------ | --------------------------- | ------------------------------------------ | ------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| **Suffix Tree**                           | O(n) (Ukkonen)               | O(n),**30-40 bytes/node** | **O(m)**                                 | O(p)        | **hard** (suffix links, active point tracking) | single-query O(m) is a hard requirement and you're willing to implement Ukkonen       |
| [Suffix Array](./suffix-array.md)         | O(n log² n) or O(n) (SA-IS) | O(n),**4-8 bytes/char**   | O(m log n), or O(m + log n) with LCP+RMQ | via bisect  | medium                                         | multi-query text search, memory-constrained, genome tools, CP - the practical default |
| [Trie](./trie.md)                         | O(total chars)               | O(n · alphabet)          | O(m)                                     | **O(p)**    | easy                                           | prefix queries, autocomplete, no suffix-internal matching needed                      |
| [Rabin-Karp](../algorithms/rabin-karp.md) | O(n)                         | O(1)                      | O(n) per pattern                         | no          | easy                                           | one-shot sliding-window search, plagiarism check                                      |
| [KMP](../algorithms/string-matching.md)   | O(n)                         | O(m)                      | O(n+m) per query                         | no          | easy                                           | single pattern, single text, no repeated queries needed                               |

**Pick it when…crossover:** the suffix tree wins over the suffix array *only* when query volume is high enough that the O(log n) factor in the array's O(m log n) search actually shows up in a profile - in practice this crossover is rare, because the suffix array's LCP+RMQ variant closes most of the gap (O(m + log n)) while keeping the 4-8-byte-per-character footprint. The suffix tree's genuine edge case is when you need the **explicit tree structure itself** (e.g. walking internal nodes for generalized longest-common-substring across many strings, or repeat-finding via deepest-node queries) rather than just point-queries - there, having real tree nodes to walk is more direct than reconstructing the equivalent from a flat SA + LCP array.

## Variants

- **Generalized suffix tree (multiple strings):** build one suffix tree over several strings, each terminated with a **distinct** sentinel (`$1`, `$2`, …) so suffixes from different strings never collide at a leaf. Enables longest-common-substring-across-k-strings by finding the deepest internal node with leaves from all k source strings - the multi-string analogue of the two-string LCS approach shown in [Suffix Array](./suffix-array.md#3-longest-common-substring-of-two-strings).
- **Ukkonen's online construction:** the standard O(n) build - processes the string left to right, extending all existing suffixes by one character at each step, using suffix links to avoid re-walking from the root. "Online" means it can answer queries on the prefix built so far, before seeing the rest of the string.
- **Suffix tree via suffix array + LCP (offline construction):** build a suffix array and LCP array first (simpler to implement correctly), then reconstruct the suffix tree's shape from them - trades Ukkonen's implementation complexity for the suffix array's simpler O(n log n) or O(n) build, at the cost of an extra reconstruction pass. A common practical shortcut when the suffix tree's explicit structure is needed but Ukkonen's algorithm is deemed too risky to hand-implement under time pressure.
- **Compressed / succinct suffix tree:** replace explicit pointers with a bit-vector-based topology encoding, cutting per-node overhead from ~30-40 bytes toward a few bits - closes much of the memory gap with a suffix array while keeping the tree's O(m) query time, at a significant implementation-complexity cost.

## Traversal & invariant

**The core invariant:** every root-to-leaf path spells out exactly one suffix of `s$`, and every internal node has **at least two children** (the compression invariant - a node with only one child would mean an uncompressed chain still exists, which contradicts "compressed"). Leaves are labeled with the starting index of the suffix they represent; there are exactly `n` leaves for a string of length `n` (with sentinel), because every suffix is distinct and ends at its own leaf.

**Ukkonen's algorithm's central mechanism: suffix links.** A suffix link connects internal node `u` (representing string `xα` for some character `x` and string `α`) to internal node `v` (representing `α`) - i.e., "the same string with its first character stripped." During construction, after extending the tree for one suffix, the algorithm follows the current node's suffix link to jump directly to the insertion point for the *next* suffix, instead of re-walking from the root. **Why this gives O(n) instead of O(n²):** without suffix links, inserting each of the n suffixes could cost O(n) (a full root-to-insertion-point walk), giving O(n²) total. With suffix links, the total distance moved by the "active point" across the *entire* construction is bounded by O(n) - this is an amortized argument in the same family as the potential-function accounting used for dynamic array doubling: each suffix link jump can be "charged" against depth lost earlier, so the sum of all jumps across the whole build is O(n), not O(n) per suffix.

```
Suffix link example on "banana$":

  node for "ana"  --[suffix link]-->  node for "na"
  node for "na"   --[suffix link]-->  node for "a"
  node for "a"    --[suffix link]-->  root

  During construction, after finishing work at the "ana" node,
  Ukkonen's algorithm follows this link to jump straight to "na"'s
  position for the next suffix - no re-walk from root needed.
```

## Implementation

Ukkonen's algorithm's full active-point/suffix-link bookkeeping is notoriously intricate to get exactly right (this is the "hard" implementation rating in the Comparison table) - the pseudocode below shows the conceptual shape of one extension step; production implementations track an explicit `(active_node, active_edge, active_length)` triple across the whole construction rather than restarting the walk each time, which the pseudocode elides for clarity.

**Pseudocode (CLRS style) - conceptual single-suffix extension:**

```
procedure EXTEND-SUFFIX-TREE(T, s, i)
    ▷ Ensures suffix s[j..i] is represented in T for the current end position i,
    ▷ for the suffix currently being extended (Ukkonen processes all j's
    ▷ implicitly via suffix links - this shows the logical effect of one extension)
    node ← active_point(T)              ▷ tracked across the whole construction
    if node has no edge starting with s[i]
        create new leaf edge labeled s[i..∞) from node    ▷ Rule 2: new leaf
    else if edge from node already matches s[i] at this depth
        return                                             ▷ Rule 3: already present, do nothing
    else
        split existing edge at mismatch point               ▷ Rule 1/2: split, insert new internal node
        create new leaf edge for s[i..∞) from the split point
        if a suffix link is pending from a previous split this round
            link previous split node → this split node
    follow suffix link from active_point to next active_point ▷ O(1) amortized jump
```

**Python - simplified (non-Ukkonen) O(n²)-worst-case construction, for clarity over asymptotic optimality:**

```python
from __future__ import annotations
from typing import Optional


class SuffixTreeNode:
    def __init__(self) -> None:
        self.children: dict[str, "Edge"] = {}
        self.leaf_index: Optional[int] = None   # set only on leaves


class Edge:
    def __init__(self, label: str, target: SuffixTreeNode) -> None:
        self.label = label
        self.target = target


def build_suffix_tree_naive(s: str) -> SuffixTreeNode:
    """
    Builds a suffix tree by inserting each suffix and compressing shared
    edges as it goes. O(n^2) worst case (no suffix links) - this trades
    Ukkonen's O(n) guarantee for code that is straightforward to read and
    verify by hand-tracing, which is the point of this reference version.
    """
    s = s + "$"
    root = SuffixTreeNode()

    for start in range(len(s)):
        suffix = s[start:]
        node = root
        i = 0
        while i < len(suffix):
            matched_edge: Optional[Edge] = None
            for ch, edge in node.children.items():
                if suffix[i] == ch:
                    matched_edge = edge
                    break

            if matched_edge is None:
                # Rule 2: no matching edge - create a new leaf edge for the rest.
                leaf = SuffixTreeNode()
                leaf.leaf_index = start
                node.children[suffix[i]] = Edge(suffix[i:], leaf)
                break

            # Walk along the matched edge, comparing character by character.
            label = matched_edge.label
            j = 0
            while j < len(label) and i + j < len(suffix) and label[j] == suffix[i + j]:
                j += 1

            if j == len(label):
                # Fully consumed this edge - descend and continue.
                node = matched_edge.target
                i += j
                continue

            # Mismatch mid-edge - split the edge at the divergence point.
            split_node = SuffixTreeNode()
            old_target = matched_edge.target
            matched_edge.label = label[:j]
            matched_edge.target = split_node
            split_node.children[label[j]] = Edge(label[j:], old_target)

            leaf = SuffixTreeNode()
            leaf.leaf_index = start
            split_node.children[suffix[i + j]] = Edge(suffix[i + j:], leaf)
            break

    return root


def search(root: SuffixTreeNode, pattern: str) -> bool:
    """O(m) walk - does `pattern` occur anywhere in the indexed text?"""
    node = root
    i = 0
    while i < len(pattern):
        edge = node.children.get(pattern[i])
        if edge is None:
            return False
        label = edge.label
        j = 0
        while j < len(label) and i + j < len(pattern) and label[j] == pattern[i + j]:
            j += 1
        if j < len(label) and i + j < len(pattern):
            return False   # mismatch mid-edge before pattern exhausted
        node = edge.target
        i += j
    return True


# --- quick smoke test ---
if __name__ == "__main__":
    tree = build_suffix_tree_naive("banana")
    print(search(tree, "ana"))   # True
    print(search(tree, "nana"))  # True
    print(search(tree, "xyz"))   # False
```

**Why the naive version is shown instead of full Ukkonen.** Ukkonen's algorithm requires tracking an active point (node, edge, length-into-edge) across the entire construction and applying three extension rules (Rule 1: extend a leaf edge implicitly, Rule 2: create a new leaf, Rule 3: do nothing, already present) with careful suffix-link bookkeeping between phases - getting all of this exactly right is genuinely one of the hardest-to-hand-implement classic algorithms, which is precisely why the Comparison table rates its implementation difficulty "hard" and why production code almost always reaches for a suffix array instead. The naive version above preserves the *result* (a correctly compressed suffix tree) and the *query* behavior (O(m) search) so the structure can be understood and hand-traced, while being explicit that its O(n²) worst-case build is not the production algorithm.

## CP-primitives

### Longest repeated substring via deepest internal node

The longest repeated substring corresponds to the **deepest internal node** (measured by string-depth - the total length of the edge labels from root to that node), since an internal node with ≥2 children means ≥2 suffixes share that prefix, i.e. it's a repeated substring. This is the suffix-tree-native equivalent of scanning `max(LCP)` on a suffix array.

**Why for CP:** avoids materializing an LCP array at all if you already have the tree - useful when the problem's other parts already require walking the explicit tree structure (e.g. combined with generalized-suffix-tree queries).

### Generalized suffix tree for k-string longest common substring

Build one tree over all k strings (each with a distinct sentinel), then find the deepest internal node whose leaf-subtree contains suffixes from **all k** source strings (track a bitmask of "which strings have a leaf below me" per internal node, computed bottom-up in O(n) total).

**Why for CP:** generalizes the two-string longest-common-substring trick (shown on [Suffix Array](./suffix-array.md#3-longest-common-substring-of-two-strings) via a single `#`-separator) to arbitrarily many strings without needing k-1 separator characters and a more complex scan - the tree's explicit branching makes the "which strings does this subtree touch" bitmask a natural bottom-up computation.

### Suffix links as a jump table for online matching

Beyond construction, suffix links double as a **fast retry mechanism** during online pattern matching against a growing text (e.g. matching against a text that's still being appended to) - when a match attempt fails partway, following the suffix link from the current position jumps to the next-best candidate match point in O(1) amortized, avoiding a full restart from the root.

**Why for CP:** the same amortized-jump idea that makes Ukkonen's construction O(n) also accelerates certain streaming/online multi-match problems - recognizing the suffix-link structure saves reimplementing the equivalent bookkeeping from scratch.

## Gotchas / edge cases

- **Forgetting the sentinel (CP trap).** Exactly like a suffix array, without a terminating sentinel character (`$`, guaranteed smaller than every alphabet character and unique to the string), some suffixes end up as prefixes of others, which breaks the "every suffix ends at a distinct leaf" invariant - internal nodes lose their "at least 2 children" guarantee, corrupting the tree's structure and any leaf-count-based query (longest repeated substring, occurrence counting). Always append a sentinel before construction.
- **Edge-label storage: don't copy substrings (memory trap).** Storing each edge's label as an actual substring copy costs O(n) per edge, giving O(n²) total memory - the standard production fix is to store edges as `(start_index, end_index)` pairs into the *original* string, making every edge O(1) space regardless of label length. A naive from-scratch implementation (like the teaching version above) that copies substrings directly is fine for learning but not for text over ~10⁵ characters.
- **At-scale trap: pointer-chasing depth vs a flat array.** Every suffix-tree operation touches a chain of heap-allocated nodes, each holding a child-pointer table (array-indexed by alphabet, or a small hashmap) - at genome scale (n > 10⁷), this pointer-chasing pattern causes an L2/L3 cache miss on nearly every node visited, while a suffix array's binary search touches a single contiguous `int[]` with a predictable stride. This constant-factor gap (often 3-5×, sometimes more) is why suffix arrays dominate suffix trees in production despite identical or better asymptotic query time - see [Suffix Array](./suffix-array.md#what-the-interviewer-probes-for) for the same argument from the other side.
- **Recursion depth on deep/degenerate strings (CP trap).** A recursive construction or traversal (as in the naive Python implementation above) can recurse to depth O(n) in pathological cases (e.g. a string of all-identical characters produces a long unbranching internal structure before compression settles) - risking a stack overflow in languages without tail-call elimination, or hitting Python's recursion limit. Iterative or explicit-stack traversal avoids this at the cost of more verbose code.

## What the interviewer probes for

**"Why would anyone use a suffix array instead, if the suffix tree gives better query time?"**
Because the practical cost-benefit almost never favors the tree: a suffix array uses 4-8 bytes per character versus a suffix tree's 30-40 bytes per node (roughly 5-10× more memory for the same text), the tree is dramatically harder to implement correctly (Ukkonen's suffix links and active-point tracking versus the suffix array's comparatively simple prefix-doubling or radix-sort construction), and the query-time gap (O(m) vs O(m log n), or O(m + log n) with an LCP+RMQ-augmented suffix array) rarely shows up as the actual bottleneck in real workloads. The suffix tree wins only when query volume is so extreme that the log factor genuinely matters and you're willing to pay the memory and implementation cost.

**"How does Ukkonen's algorithm achieve O(n) when naively inserting n suffixes one at a time would cost O(n²)?"**
Suffix links let the construction jump directly between related insertion points instead of re-walking from the root for every suffix. The amortized argument: the "active point" used during construction can be shown to move a total of O(n) positions across the *entire* build (not per suffix) - the same style of accounting argument used for dynamic array doubling, just applied to tree-descent distance instead of array copies.

**"Can a suffix tree answer 'longest common substring of k strings' - and how?"**
Yes, via a generalized suffix tree: build one tree over all k strings, each ending in its own distinct sentinel so their suffixes never collide at the same leaf. Track, for each internal node, which of the k source strings have at least one leaf in its subtree (a bitmask computed bottom-up in O(total length)). The deepest internal node whose bitmask covers all k strings marks the longest common substring - the tree's explicit branching structure makes this bitmask computation direct, where a suffix-array equivalent requires careful separator-character bookkeeping (see the two-string version in the Suffix Array article, which needs k−1 separators and a linear scan checking "different source string" at each LCP boundary).

## Practice problems

### 1. Longest Repeated Substring (via suffix tree)

**Problem.** Given a string `s` of length up to `10⁵`, find the longest substring that occurs at least twice in `s` (occurrences may overlap). If no substring repeats, return the empty string.

- **Example 1**
  - **Input:** `s = "banana"` | **Output:** `"ana"`
  - **Explanation:** `"ana"` occurs at index 1 (`"anana"`) and index 3 (`"ana"`) - length 3 is the longest repeat.
- **Example 2**
  - **Input:** `s = "abcde"` | **Output:** `""`
  - **Explanation:** no substring of length ≥ 1 repeats, since every character is distinct.

**Constraints.** `1 ≤ |s| ≤ 10⁵`; lowercase English letters only (no sentinel character in the input alphabet, so `$` is always safe to append).

**Approach.** Build the suffix tree, then find the **deepest internal node** by string-depth (sum of edge-label lengths from root to that node) - any internal node has ≥2 children by construction, meaning ≥2 suffixes share that full prefix, i.e. it's a repeated substring. The deepest such node's string-depth is the answer length; walking back the accumulated label gives the substring itself. This is the tree-native version of scanning `max(LCP)` on a suffix array (see [Suffix Array's version of this same problem](./suffix-array.md#1-longest-repeated-substring)) - same answer, different structure to read it off of.

```python
def longest_repeated_substring_tree(s: str) -> str:
    root = build_suffix_tree_naive(s)
    best = [""]

    def dfs(node: SuffixTreeNode, depth_str: str) -> None:
        if len(node.children) >= 2 and len(depth_str) > len(best[0]):
            best[0] = depth_str
        for edge in node.children.values():
            if edge.target.leaf_index is None:  # only descend into internal nodes
                dfs(edge.target, depth_str + edge.label)

    dfs(root, "")
    return best[0]

print(longest_repeated_substring_tree("banana"))  # "ana"
print(longest_repeated_substring_tree("abcde"))   # ""
```

**Complexity.** O(n) tree traversal after O(n²) naive build shown here (O(n) total with real Ukkonen construction); O(n) space.

**Duplicate problems:**

- Longest Repeated Substring via Suffix Array (LC-style, SPOJ) - identical problem, solved via `max(LCP)` instead of deepest-node - see the [Suffix Array practice problem](./suffix-array.md#1-longest-repeated-substring) for the array-based version of this exact technique.
- Longest Duplicate Substring (LC 1044) - same core problem; LeetCode's expected solution is usually binary-search-on-length + rolling hash, but the suffix-structure approach (tree or array) solves it just as validly.

### 2. Count Distinct Substrings (via suffix tree)

**Problem.** Given a string `s` of length up to `10⁵`, count the number of distinct non-empty substrings of `s`.

- **Example 1**
  - **Input:** `s = "aab"` | **Output:** `5`
  - **Explanation:** the distinct substrings are `"a"`, `"aa"`, `"aab"`, `"ab"`, `"b"`.
- **Example 2**
  - **Input:** `s = "abc"` | **Output:** `6`
  - **Explanation:** all `n(n+1)/2 = 6` substrings of a string with no repeated characters are distinct.

**Constraints.** `1 ≤ |s| ≤ 10⁵`; may contain repeated characters (that's the case that makes the count less than `n(n+1)/2`).

**Approach.** Every distinct substring corresponds to exactly one root-to-somewhere path in the suffix tree (a prefix of some path from the root, stopping at any point along an edge, not just at a node) - so the count of distinct substrings equals the **sum of all edge-label lengths** across the entire tree (every position along every edge represents a distinct substring ending there, since the tree structure guarantees no two different paths from the root spell the same string). This is the tree-native version of the suffix array's `n(n+1)/2 − sum(LCP)` formula (see [Suffix Array's version](./suffix-array.md#2-number-of-distinct-substrings)) - both count the same thing, from opposite ends: the array subtracts shared prefixes, the tree directly sums the non-shared, newly-branching lengths.

```python
def count_distinct_substrings_tree(s: str) -> int:
    root = build_suffix_tree_naive(s)
    total = [0]

    def dfs(node: SuffixTreeNode) -> None:
        for edge in node.children.values():
            total[0] += len(edge.label)
            dfs(edge.target)

    dfs(root)
    return total[0] - 1  # subtract 1 for the sentinel-only path ("$" itself isn't a real substring)

print(count_distinct_substrings_tree("aab"))  # 5
print(count_distinct_substrings_tree("abc"))  # 6
```

**Complexity.** O(n) tree traversal (O(n) total nodes/edges after proper Ukkonen construction); O(n) space.

**Duplicate problems:**

- Number of Distinct Substrings via Suffix Array (SPOJ DISUBSTR) - the array-based version of the exact same count, using `sum(LCP)` instead of `sum(edge lengths)` - see the [Suffix Array practice problem](./suffix-array.md#2-number-of-distinct-substrings).
- Count of Distinct Substrings of Length K - a bounded-length variant, more efficiently solved with rolling hashes than a full suffix tree/array build.

### 3. Longest Common Substring Across k Strings (Generalized Suffix Tree)

**Problem.** Given `k` strings (total combined length up to `10⁵`), find the longest substring that appears in **all k** of them.

- **Example 1**
  - **Input:** `["abcdef", "zabcy", "wabco"]` | **Output:** `"abc"`
  - **Explanation:** `"abc"` appears in all three strings; no longer common substring exists across all three.
- **Example 2**
  - **Input:** `["xyz", "abc"]` | **Output:** `""`
  - **Explanation:** the two strings share no common substring at all (not even a single character), so the answer is empty.

**Constraints.** `2 ≤ k ≤ 20`; total combined length across all k strings `≤ 10⁵`.

**Approach.** This is where the suffix tree's explicit node structure earns its keep over the suffix array's flatter representation. Build a **generalized suffix tree** over all k strings, each terminated with its own distinct sentinel (`$1`, …, `$k`) so suffixes from different source strings never collide at a shared leaf. For each internal node, compute (bottom-up, one DFS pass) a bitmask of which of the k strings have at least one leaf in that node's subtree. The deepest internal node whose bitmask has all k bits set is the answer - its string-depth is the length, and any leaf beneath it gives a starting position to recover the substring itself. The two-string version of this problem (shown in [Suffix Array's practice problems](./suffix-array.md#3-longest-common-substring-of-two-strings)) uses a single `#` separator and a linear LCP scan checking "different source string" - that trick doesn't generalize cleanly past two strings, which is precisely the case where reaching for the explicit tree (with its bitmask-per-node bottom-up computation) beats trying to force the array approach further.

**Complexity.** O(N) where N = combined length of all k strings, for tree build + bitmask DFS (with real Ukkonen construction; the naive build shown in this article is O(N²) worst case). Space O(N + k) for the bitmasks.

**Duplicate problems:**

- Longest Common Substring of Two Strings (Suffix Array version) - the k=2 special case, solvable more simply via a single separator character and an LCP scan; see the [Suffix Array practice problem](./suffix-array.md#3-longest-common-substring-of-two-strings) for that approach directly.
- Shortest Common Superstring (a related but distinct problem - requires a different technique, typically greedy merging or DP over overlaps, not a generalized suffix tree).
