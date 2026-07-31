# Suffix Tree

## Prerequisites

- [Trie](./trie.md) [Must read]
- [Array](./array.md) [Must read]
- [Binary Search](../algorithms/binary-search.md) [Should read]
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
- [Suffix array (array-based variant)](#suffix-array-array-based-variant)
  - [When the array beats the tree](#when-the-array-beats-the-tree)
- [CP-primitives](#cp-primitives)
  - [Longest repeated substring via deepest internal node](#longest-repeated-substring-via-deepest-internal-node)
  - [Generalized suffix tree for k-string longest common substring](#generalized-suffix-tree-for-k-string-longest-common-substring)
  - [Suffix links as a jump table for online matching](#suffix-links-as-a-jump-table-for-online-matching)
  - [LCP array for faster pattern counting](#lcp-array-for-faster-pattern-counting)
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

**Reach for something else when:** you need a **single-query, one-time build** (a [suffix array](#suffix-array-array-based-variant) is simpler to implement and O(m log n) is rarely the bottleneck); you're **memory-constrained** (a suffix array uses 4-8 bytes per character vs a suffix tree's 30-40 bytes per node - a 10× difference that matters at genome scale); or you just need **prefix queries** without full suffix machinery (a plain [trie](./trie.md) is simpler and sufficient). In practice, **suffix arrays dominate suffix trees in production** precisely because the query-time difference (O(m) vs O(m log n)) rarely matters as much as the 10× memory and implementation-complexity cost - this is the single most-tested comparison in this space.

**Real-world usage:** suffix trees (and their generalized form) appear in bioinformatics tools for genome assembly and repeat-finding (early tools like REPuter), and in some full-text search engines' internals for exact substring indexing. **At scale:** genome-scale texts (3 × 10⁹ characters for the human genome) make an explicit 30-40-byte-per-node suffix tree infeasible in RAM (60-120 GB) - production genomics tools use the FM-index (a compressed suffix array via Burrows-Wheeler Transform) instead, which is why the [suffix array variant's "when the array beats the tree" note](#when-the-array-beats-the-tree) names BWA/Bowtie/samtools as suffix-array (not suffix-tree) tools. This is the concrete reason suffix trees are taught but suffix arrays are shipped.

## Comparison


| Structure                                 | Build time                   | Space                     | Pattern query                            | Prefix enum | Implementation                                 | Pick it when…                                                                        |
| ------------------------------------------- | ------------------------------ | --------------------------- | ------------------------------------------ | ------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| **Suffix Tree**                           | O(n) (Ukkonen)               | O(n),**30-40 bytes/node** | **O(m)**                                 | O(p)        | **hard** (suffix links, active point tracking) | single-query O(m) is a hard requirement and you're willing to implement Ukkonen       |
| [Suffix Array](#suffix-array-array-based-variant) | O(n log² n) or O(n) (SA-IS) | O(n),**4-8 bytes/char**   | O(m log n), or O(m + log n) with LCP+RMQ | via bisect  | medium                                         | multi-query text search, memory-constrained, genome tools, CP - the practical default |
| [Trie](./trie.md)                         | O(total chars)               | O(n · alphabet)          | O(m)                                     | **O(p)**    | easy                                           | prefix queries, autocomplete, no suffix-internal matching needed                      |
| [Rabin-Karp](../algorithms/rabin-karp.md) | O(n)                         | O(1)                      | O(n) per pattern                         | no          | easy                                           | one-shot sliding-window search, plagiarism check                                      |
| [KMP](../algorithms/string-matching.md)   | O(n)                         | O(m)                      | O(n+m) per query                         | no          | easy                                           | single pattern, single text, no repeated queries needed                               |

**Pick it when…crossover:** the suffix tree wins over the suffix array *only* when query volume is high enough that the O(log n) factor in the array's O(m log n) search actually shows up in a profile - in practice this crossover is rare, because the suffix array's LCP+RMQ variant closes most of the gap (O(m + log n)) while keeping the 4-8-byte-per-character footprint. The suffix tree's genuine edge case is when you need the **explicit tree structure itself** (e.g. walking internal nodes for generalized longest-common-substring across many strings, or repeat-finding via deepest-node queries) rather than just point-queries - there, having real tree nodes to walk is more direct than reconstructing the equivalent from a flat SA + LCP array.

## Variants

- **Generalized suffix tree (multiple strings):** build one suffix tree over several strings, each terminated with a **distinct** sentinel (`$1`, `$2`, …) so suffixes from different strings never collide at a leaf. Enables longest-common-substring-across-k-strings by finding the deepest internal node with leaves from all k source strings - the multi-string analogue of the two-string LCS approach shown in [Practice problem 3's array alternative](#3-longest-common-substring-across-k-strings-generalized-suffix-tree).
- **Ukkonen's online construction:** the standard O(n) build - processes the string left to right, extending all existing suffixes by one character at each step, using suffix links to avoid re-walking from the root. "Online" means it can answer queries on the prefix built so far, before seeing the rest of the string.
- **Suffix tree via suffix array + LCP (offline construction):** build a suffix array and LCP array first (simpler to implement correctly), then reconstruct the suffix tree's shape from them - trades Ukkonen's implementation complexity for the suffix array's simpler O(n log n) or O(n) build, at the cost of an extra reconstruction pass. A common practical shortcut when the suffix tree's explicit structure is needed but Ukkonen's algorithm is deemed too risky to hand-implement under time pressure. See [Suffix array (array-based variant)](#suffix-array-array-based-variant) for the construction this shortcut builds on.
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

## Suffix array (array-based variant)

A **suffix array** (`SA`) is an array of integers in `[0, n)`, sorted so that `SA[i]` is the starting index of the `i`-th lexicographically smallest suffix of the string - the same "all suffixes, ordered" information a suffix tree encodes, but flattened into a plain array of ints instead of a pointer-linked tree. Mental model: **a yellow-pages index for every tail of the string** - rip the string into all its "chapter-and-everything-after" tails, alphabetize them, and keep only the starting positions in that order. Pattern search becomes a binary search over `SA` rather than a root-to-leaf walk.

**Construction on `"banana"` (n = 6):**

```
index  suffix              sorted lexicographically:
  0    banana                rank 0: "a"      -> SA[0] = 5
  1    anana                 rank 1: "ana"    -> SA[1] = 3
  2    nana                  rank 2: "anana"  -> SA[2] = 1
  3    ana                   rank 3: "banana" -> SA[3] = 0
  4    na                    rank 4: "na"     -> SA[4] = 4
  5    a                     rank 5: "nana"   -> SA[5] = 2

SA = [5, 3, 1, 0, 4, 2]
```

**Building it: prefix-doubling, O(n log² n).** Sort suffixes by their length-1 prefix (rank by first character), then repeatedly re-rank by doubled prefix lengths (1, 2, 4, 8, …): at each round, sort by the pair `(rank[i], rank[i+k])` so that suffixes already correctly ordered on their first `k` characters get refined by their next `k`. There are O(log n) doubling rounds; using `sorted()` per round costs O(n log n) each, for O(n log² n) total (a two-pass radix sort per round instead gets the tighter O(n log n) - see [Gotchas](#gotchas--edge-cases) for when that difference matters). Faster O(n) constructions exist (SA-IS, DC3/skew) but prefix-doubling is the one worth hand-implementing under contest time pressure.

**The LCP array.** The companion **Longest Common Prefix array**, `LCP[i]`, stores the length of the longest common prefix between `SA[i-1]`'s suffix and `SA[i]`'s suffix (`LCP[0] = 0`). **Kasai's algorithm** builds it in O(n): the key insight is that when the LCP for position `i` is `h`, the LCP for position `i+1` can only be `h-1` at minimum (stripping the first matched character off both sides), so each step resumes matching from `h-1` instead of from scratch - amortized O(n) total, not O(n²). Together, `SA` + `LCP` are, in effect, a **flattened suffix tree**: every internal node of the conceptual tree corresponds to a *range* in `SA` whose `LCP` value is that node's string-depth - which is exactly what lets the LCP array answer the same repeated-substring and distinct-substring questions the tree answers (see [Practice problems](#practice-problems) below), just by scanning an array instead of walking nodes.

**Python - prefix-doubling construction + Kasai's LCP:**

```python
def build_suffix_array(s: str) -> list[int]:
    """O(n log^2 n) prefix-doubling suffix array construction."""
    s = s + "\x00"          # sentinel: smallest ASCII character
    n = len(s)

    sa = sorted(range(n), key=lambda i: s[i])
    rank = [0] * n
    rank[sa[0]] = 0
    for i in range(1, n):
        rank[sa[i]] = rank[sa[i - 1]] + (0 if s[sa[i]] == s[sa[i - 1]] else 1)

    k = 1
    while k < n:
        sa = sorted(range(n), key=lambda i: (rank[i], rank[i + k] if i + k < n else -1))

        new_rank = [0] * n
        new_rank[sa[0]] = 0
        for i in range(1, n):
            prev, cur = sa[i - 1], sa[i]
            prev_pair = (rank[prev], rank[prev + k] if prev + k < n else -1)
            cur_pair  = (rank[cur],  rank[cur  + k] if cur  + k < n else -1)
            new_rank[cur] = new_rank[prev] + (0 if cur_pair == prev_pair else 1)

        rank = new_rank
        if rank[sa[-1]] == n - 1:
            break               # all ranks distinct; SA is complete
        k *= 2

    return sa


def build_lcp_array(s: str, sa: list[int]) -> list[int]:
    """Kasai's algorithm: O(n) LCP array construction."""
    n = len(s)
    rank = [0] * n          # inverse of SA
    for i, v in enumerate(sa):
        rank[v] = i

    lcp = [0] * n
    h = 0
    for i in range(n):
        if rank[i] > 0:
            j = sa[rank[i] - 1]
            while i + h < n and j + h < n and s[i + h] == s[j + h]:
                h += 1
            lcp[rank[i]] = h
            if h > 0:
                h -= 1      # LCP can only drop by 1 between adjacent positions
    return lcp


def search(s: str, sa: list[int], pattern: str) -> list[int]:
    """Binary-search the suffix array; returns sorted list of match positions."""
    n = len(sa)
    m = len(pattern)

    lo, hi = 0, n
    while lo < hi:
        mid = (lo + hi) // 2
        if s[sa[mid]:sa[mid] + m] < pattern:
            lo = mid + 1
        else:
            hi = mid
    left = lo

    lo, hi = 0, n
    while lo < hi:
        mid = (lo + hi) // 2
        if s[sa[mid]:sa[mid] + m] <= pattern:
            lo = mid + 1
        else:
            hi = mid
    right = lo

    return sorted(sa[left:right])


# --- quick smoke test ---
if __name__ == "__main__":
    text = "banana"
    sa   = build_suffix_array(text)          # built on "banana\x00" internally
    lcp  = build_lcp_array(text + "\x00", sa)
    print("SA:", sa)          # [6, 5, 3, 1, 0, 4, 2] - index 6 is sentinel '\x00'
    print("LCP:", lcp)
    print("search 'ana':", search(text + "\x00", sa, "ana"))  # [1, 3]
```

**Pattern search via binary search.** To find pattern `P`, binary-search `SA` twice - once for the first suffix `≥ P`, once for the first `> P` - the range `[lo, hi)` gives every occurrence. Each comparison is O(m) and O(log n) comparisons are made, so plain binary search is **O(m log n)**; layering an RMQ structure on `LCP` (so pivots can skip already-matched characters) tightens this to **O(m + log n)** - see [CP-primitives](#cp-primitives).

### When the array beats the tree

The array isn't just "a suffix tree with extra steps" - it's the version production systems actually ship, for three concrete reasons:

- **Memory footprint.** A suffix array uses **4-8 bytes per character** (one int per suffix, plus the LCP array). A suffix tree uses **30-40 bytes per node** for child-pointer tables and metadata - roughly 5-10× more, because every branch is a heap-allocated node instead of a slot in a flat array. At genome scale (10⁹ characters) this is the difference between fitting in RAM and not.
- **Cache-friendliness.** `SA` is a contiguous `int[]`; binary search strides across it in a predictable halving pattern that the CPU prefetches well. A suffix tree is pointer-linked - every edge traversal is a potential cache miss, and at genome scale this pointer-chasing pattern costs a real 3-5× constant-factor slowdown even when the asymptotic complexity is worse for the array (O(m log n) vs O(m)).
- **Simplicity.** Prefix-doubling (shown above) is maybe 30 lines and safe to hand-implement under contest pressure. Ukkonen's algorithm - suffix links, active-point tracking, three extension rules - is one of the hardest classic algorithms to get exactly right (see [Implementation](#implementation)'s "hard" rating). Unless O(m) query time is a proven bottleneck, the array's simpler build is almost always the better trade.

This is why bioinformatics tools (BWA, Bowtie, samtools) build suffix arrays (or the further-compressed FM-index) over genomes, not suffix trees - see [When to use / when not](#when-to-use--when-not) for the tree's narrower home turf.

## CP-primitives

### Longest repeated substring via deepest internal node

The longest repeated substring corresponds to the **deepest internal node** (measured by string-depth - the total length of the edge labels from root to that node), since an internal node with ≥2 children means ≥2 suffixes share that prefix, i.e. it's a repeated substring. This is the suffix-tree-native equivalent of scanning `max(LCP)` on a suffix array.

**Why for CP:** avoids materializing an LCP array at all if you already have the tree - useful when the problem's other parts already require walking the explicit tree structure (e.g. combined with generalized-suffix-tree queries).

### Generalized suffix tree for k-string longest common substring

Build one tree over all k strings (each with a distinct sentinel), then find the deepest internal node whose leaf-subtree contains suffixes from **all k** source strings (track a bitmask of "which strings have a leaf below me" per internal node, computed bottom-up in O(n) total).

**Why for CP:** generalizes the two-string longest-common-substring trick (shown in [Practice problem 3's array alternative](#3-longest-common-substring-across-k-strings-generalized-suffix-tree) via a single `#`-separator) to arbitrarily many strings without needing k-1 separator characters and a more complex scan - the tree's explicit branching makes the "which strings does this subtree touch" bitmask a natural bottom-up computation.

### Suffix links as a jump table for online matching

Beyond construction, suffix links double as a **fast retry mechanism** during online pattern matching against a growing text (e.g. matching against a text that's still being appended to) - when a match attempt fails partway, following the suffix link from the current position jumps to the next-best candidate match point in O(1) amortized, avoiding a full restart from the root.

**Why for CP:** the same amortized-jump idea that makes Ukkonen's construction O(n) also accelerates certain streaming/online multi-match problems - recognizing the suffix-link structure saves reimplementing the equivalent bookkeeping from scratch.

### LCP array for faster pattern counting

This one belongs to the [array variant](#suffix-array-array-based-variant), not the tree. After building `SA` and `LCP`, counting occurrences of pattern `P` is a binary search for the range `[lo, hi)` in `SA` - the count is `hi - lo`, costing O(m log n). Layer a **sparse table for range-minimum queries (RMQ)** on top of `LCP`, and subsequent binary-search pivots can call `RMQ(LCP, lo, mid)` to skip characters already known to match instead of re-comparing all `m` characters at each step - dropping the cost to **O(m + log n)**.

**Why for CP:** any "count occurrences of P in T" problem with many queries goes from O(q · m log n) to O(n log n build + q(m + log n)) - the LCP+RMQ combo is the difference between TLE and AC on large test cases, and it's the array's answer to the tree's native O(m) search when you're not willing to implement Ukkonen.

## Gotchas / edge cases

- **Forgetting the sentinel (CP trap).** Exactly like a suffix array, without a terminating sentinel character (`$`, guaranteed smaller than every alphabet character and unique to the string), some suffixes end up as prefixes of others, which breaks the "every suffix ends at a distinct leaf" invariant - internal nodes lose their "at least 2 children" guarantee, corrupting the tree's structure and any leaf-count-based query (longest repeated substring, occurrence counting). Always append a sentinel before construction.
- **Edge-label storage: don't copy substrings (memory trap).** Storing each edge's label as an actual substring copy costs O(n) per edge, giving O(n²) total memory - the standard production fix is to store edges as `(start_index, end_index)` pairs into the *original* string, making every edge O(1) space regardless of label length. A naive from-scratch implementation (like the teaching version above) that copies substrings directly is fine for learning but not for text over ~10⁵ characters.
- **At-scale trap: pointer-chasing depth vs a flat array.** Every suffix-tree operation touches a chain of heap-allocated nodes, each holding a child-pointer table (array-indexed by alphabet, or a small hashmap) - at genome scale (n > 10⁷), this pointer-chasing pattern causes an L2/L3 cache miss on nearly every node visited, while a suffix array's binary search touches a single contiguous `int[]` with a predictable stride. This constant-factor gap (often 3-5×, sometimes more) is why suffix arrays dominate suffix trees in production despite identical or better asymptotic query time - see [What the interviewer probes for](#what-the-interviewer-probes-for) for the same argument from the other side.
- **Recursion depth on deep/degenerate strings (CP trap).** A recursive construction or traversal (as in the naive Python implementation above) can recurse to depth O(n) in pathological cases (e.g. a string of all-identical characters produces a long unbranching internal structure before compression settles) - risking a stack overflow in languages without tail-call elimination, or hitting Python's recursion limit. Iterative or explicit-stack traversal avoids this at the cost of more verbose code.
- **[Array variant] 0-vs-1 indexing in `LCP` (CP trap).** `LCP[0]` is conventionally `0` (no predecessor for the first suffix); `LCP[i]` is the LCP between `SA[i-1]` and `SA[i]`, not between `SA[i]` and `SA[i+1]`. Off-by-one here silently corrupts longest-repeated-substring and distinct-substring computations built on the array. When porting reference code, double-check the convention (some implementations are 1-indexed).
- **[Array variant] `LCP` value ≠ suffix length.** `LCP[i]` is the overlap with the *previous* suffix in sorted order, not the length of `SA[i]`'s own suffix - conflating `lcp[sa[i]]` with `lcp[rank[i]]` is a common source of bugs when code blends the two arrays.
- **[Array variant] O(n log² n) is fine up to n ≈ 10⁶, then reach for SA-IS.** At n = 10⁷, prefix-doubling does O(n log² n) ≈ 10⁷ × 23 × 23 ≈ 5 × 10⁹ character comparisons - several minutes in Python. For contest constraints (n ≤ 10⁵-10⁶) prefix-doubling is fine; for genomics or large-corpus work, SA-IS (O(n)) is the production choice.

## What the interviewer probes for

**"Why would anyone use a suffix array instead, if the suffix tree gives better query time?"**
Because the practical cost-benefit almost never favors the tree: a suffix array uses 4-8 bytes per character versus a suffix tree's 30-40 bytes per node (roughly 5-10× more memory for the same text), the tree is dramatically harder to implement correctly (Ukkonen's suffix links and active-point tracking versus the suffix array's comparatively simple prefix-doubling or radix-sort construction), and the query-time gap (O(m) vs O(m log n), or O(m + log n) with an LCP+RMQ-augmented suffix array) rarely shows up as the actual bottleneck in real workloads. The suffix tree wins only when query volume is so extreme that the log factor genuinely matters and you're willing to pay the memory and implementation cost.

**"How does Ukkonen's algorithm achieve O(n) when naively inserting n suffixes one at a time would cost O(n²)?"**
Suffix links let the construction jump directly between related insertion points instead of re-walking from the root for every suffix. The amortized argument: the "active point" used during construction can be shown to move a total of O(n) positions across the *entire* build (not per suffix) - the same style of accounting argument used for dynamic array doubling, just applied to tree-descent distance instead of array copies.

**"Can a suffix tree answer 'longest common substring of k strings' - and how?"**
Yes, via a generalized suffix tree: build one tree over all k strings, each ending in its own distinct sentinel so their suffixes never collide at the same leaf. Track, for each internal node, which of the k source strings have at least one leaf in its subtree (a bitmask computed bottom-up in O(total length)). The deepest internal node whose bitmask covers all k strings marks the longest common substring - the tree's explicit branching structure makes this bitmask computation direct, where the [array-based two-string version](#3-longest-common-substring-across-k-strings-generalized-suffix-tree) needs k−1 separators and a linear scan checking "different source string" at each LCP boundary, and doesn't generalize cleanly past two strings.

## Practice problems

### 1. Longest Repeated Substring (via suffix tree)

**Problem.** Given a string `s` of length up to `10⁵`, find the longest substring that occurs at least twice in `s` (occurrences may overlap). If no substring repeats, return the empty string.

**Worked examples:**
- **Example 1**
  - **Input:** `s = "banana"` | **Output:** `"ana"`
  - **Explanation:** `"ana"` occurs at index 1 (`"anana"`) and index 3 (`"ana"`) - length 3 is the longest repeat.
- **Example 2**
  - **Input:** `s = "abcde"` | **Output:** `""`
  - **Explanation:** no substring of length ≥ 1 repeats, since every character is distinct.

**Constraints:** `1 ≤ |s| ≤ 10⁵`; lowercase English letters only (no sentinel character in the input alphabet, so `$` is always safe to append).

**Approach:** Build the suffix tree, then find the **deepest internal node** by string-depth (sum of edge-label lengths from root to that node) - any internal node has ≥2 children by construction, meaning ≥2 suffixes share that full prefix, i.e. it's a repeated substring. The deepest such node's string-depth is the answer length; walking back the accumulated label gives the substring itself.

**The array alternative.** The same answer falls out of the [suffix array variant](#suffix-array-array-based-variant) without building a tree at all: the longest repeated substring equals `max(LCP)` - the maximum value in the LCP array, since `LCP[i]` is exactly the shared-prefix length of two adjacent sorted suffixes. It's the same underlying fact (deepest shared prefix among suffixes), just read off a flat array scan instead of a node walk:

```python
def longest_repeated_substring_array(s: str) -> str:
    if not s:
        return ""
    sa  = build_suffix_array(s)
    lcp = build_lcp_array(s + "\x00", sa)
    best_len = max(lcp)
    if best_len == 0:
        return ""
    best_i = lcp.index(best_len)
    return s[sa[best_i]: sa[best_i] + best_len]
```

Same O(n)-after-build cost either way; the array version skips the tree build entirely in exchange for the O(n log² n) (or O(n) with SA-IS) array construction - see [When the array beats the tree](#when-the-array-beats-the-tree) for when that trade is worth it.

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

**Complexity:** O(n) tree traversal after O(n²) naive build shown here (O(n) total with real Ukkonen construction); O(n) space. The array alternative is O(n log² n) build + O(n) LCP scan; O(n) space.

**Duplicate problems:**

- Longest Repeated Substring via Suffix Array (LC-style, SPOJ) - identical problem, solved via `max(LCP)` instead of deepest-node; see the array alternative above.
- Longest Repeated Non-Overlapping Substring - a harder variant requiring the additional constraint `SA[i] - SA[i-1] ≥ lcp_len` (array form) or a subtree-leaf-spread check (tree form) to rule out overlapping occurrences.
- Longest Duplicate Substring (LC 1044) - same core problem; LeetCode's expected solution is usually binary-search-on-length + rolling hash, but the suffix-structure approach (tree or array) solves it just as validly.

### 2. Count Distinct Substrings (via suffix tree)

**Problem.** Given a string `s` of length up to `10⁵`, count the number of distinct non-empty substrings of `s`.

**Worked examples:**
- **Example 1**
  - **Input:** `s = "aab"` | **Output:** `5`
  - **Explanation:** the distinct substrings are `"a"`, `"aa"`, `"aab"`, `"ab"`, `"b"`.
- **Example 2**
  - **Input:** `s = "abc"` | **Output:** `6`
  - **Explanation:** all `n(n+1)/2 = 6` substrings of a string with no repeated characters are distinct.

**Constraints:** `1 ≤ |s| ≤ 10⁵`; may contain repeated characters (that's the case that makes the count less than `n(n+1)/2`).

**Approach:** Every distinct substring corresponds to exactly one root-to-somewhere path in the suffix tree (a prefix of some path from the root, stopping at any point along an edge, not just at a node) - so the count of distinct substrings equals the **sum of all edge-label lengths** across the entire tree, minus one sentinel character per leaf and minus the sentinel-only leaf itself (every position along every edge represents a distinct substring ending there, since the tree structure guarantees no two different paths from the root spell the same string, but the appended `$` isn't a real character of `s` and shouldn't be counted).

**The array alternative.** The [suffix array variant](#suffix-array-array-based-variant) reaches the same count from the opposite direction: total substrings is `n(n+1)/2`, and each pair of adjacent suffixes in sorted order shares `LCP[i]` substrings that would otherwise be double-counted, so the distinct count is `n(n+1)/2 − sum(LCP)`. The tree sums the *non-shared* newly-branching lengths directly; the array starts from the full count and *subtracts* the shared prefixes - same quantity, computed from opposite ends:

```python
def count_distinct_substrings_array(s: str) -> int:
    n = len(s)
    sa  = build_suffix_array(s)
    lcp = build_lcp_array(s + "\x00", sa)
    total = n * (n + 1) // 2
    return total - sum(lcp)
```

```python
def count_distinct_substrings_tree(s: str) -> int:
    n = len(s)
    root = build_suffix_tree_naive(s)
    total = [0]

    def dfs(node: SuffixTreeNode) -> None:
        for edge in node.children.values():
            total[0] += len(edge.label)
            dfs(edge.target)

    dfs(root)
    return total[0] - n - 1  # remove one sentinel char per leaf (n+1 leaves) and the empty-string leaf itself

print(count_distinct_substrings_tree("aab"))  # 5
print(count_distinct_substrings_tree("abc"))  # 6
```

**Complexity:** O(n) tree traversal (O(n) total nodes/edges after proper Ukkonen construction); O(n) space. The array alternative is O(n log² n) build + O(n) sum; O(n) space.

**Duplicate problems:**

- Number of Distinct Substrings via Suffix Array (SPOJ DISUBSTR) - the array-based version of the exact same count, using `sum(LCP)` instead of `sum(edge lengths)`; see the array alternative above.
- Count of Distinct Substrings of Length K - a bounded-length variant, more efficiently solved with rolling hashes than a full suffix tree/array build.

### 3. Longest Common Substring Across k Strings (Generalized Suffix Tree)

**Problem.** Given `k` strings (total combined length up to `10⁵`), find the longest substring that appears in **all k** of them.

**Worked examples:**
- **Example 1**
  - **Input:** `["abcdef", "zabcy", "wabco"]` | **Output:** `"abc"`
  - **Explanation:** `"abc"` appears in all three strings; no longer common substring exists across all three.
- **Example 2**
  - **Input:** `["xyz", "abc"]` | **Output:** `""`
  - **Explanation:** the two strings share no common substring at all (not even a single character), so the answer is empty.

**Constraints:** `2 ≤ k ≤ 20`; total combined length across all k strings `≤ 10⁵`.

**Approach:** This is where the suffix tree's explicit node structure earns its keep over the suffix array's flatter representation. Build a **generalized suffix tree** over all k strings, each terminated with its own distinct sentinel (`$1`, …, `$k`) so suffixes from different source strings never collide at a shared leaf. For each internal node, compute (bottom-up, one DFS pass) a bitmask of which of the k strings have at least one leaf in that node's subtree. The deepest internal node whose bitmask has all k bits set is the answer - its string-depth is the length, and any leaf beneath it gives a starting position to recover the substring itself.

**The array alternative - and why it stops here.** For the **k = 2** special case, the [suffix array variant](#suffix-array-array-based-variant) solves this more simply: concatenate `s + "#" + t` with a separator smaller than any alphabet character, build `SA` + `LCP` on the combined string, and scan adjacent SA entries for pairs coming from different source strings - the max `LCP[i]` among such cross-string pairs is the answer:

```python
def longest_common_substring_array(s: str, t: str) -> str:
    ns, nt = len(s), len(t)
    combined = s + "#" + t          # "#" = chr(1), below all lowercase
    sa  = build_suffix_array(combined)
    lcp = build_lcp_array(combined + "\x00", sa)

    best_len, best_pos = 0, 0
    for i in range(1, len(sa)):
        a, b = sa[i - 1], sa[i]
        from_s_a = a < ns
        from_s_b = b < ns
        if from_s_a != from_s_b:   # different strings
            if lcp[i] > best_len:
                best_len = lcp[i]
                best_pos = a if from_s_a else b
    return combined[best_pos: best_pos + best_len]
```

That trick doesn't generalize cleanly past two strings - one separator only distinguishes "string A vs string B," not "which of k strings." Extending it to k strings needs k−1 separators plus a scan tracking *which* source string each side of an LCP boundary came from, which is roughly the same bookkeeping the generalized tree's bitmask does more directly. This is precisely the case where reaching for the explicit tree beats forcing the array approach further.

```python
def longest_common_substring_k(strs: list[str]) -> str:
    k = len(strs)
    # each string gets its own sentinel so leaves never collide across strings
    combined = "".join(s + chr(1 + i) for i, s in enumerate(strs))
    bounds = []  # (start, end) offset of string i within combined
    pos = 0
    for s in strs:
        bounds.append((pos, pos + len(s)))
        pos += len(s) + 1

    def source_of(leaf_index: int) -> Optional[int]:
        for i, (start, end) in enumerate(bounds):
            if start <= leaf_index < end:
                return i
        return None  # tree's own trailing sentinel leaf - not part of any input string

    root = build_suffix_tree_naive(combined)
    best = [""]

    def dfs(node: SuffixTreeNode, depth_str: str) -> int:
        if node.leaf_index is not None:
            src = source_of(node.leaf_index)
            return (1 << src) if src is not None else 0
        mask = 0
        for edge in node.children.values():
            child_mask = dfs(edge.target, depth_str + edge.label)
            mask |= child_mask
        if mask == (1 << k) - 1 and len(depth_str) > len(best[0]):
            best[0] = depth_str
        return mask

    dfs(root, "")
    return best[0]

print(longest_common_substring_k(["abcdef", "zabcy", "wabco"]))  # "abc"
print(longest_common_substring_k(["xyz", "abc"]))                # ""
```

**Complexity:** O(N) where N = combined length of all k strings, for tree build + bitmask DFS (with real Ukkonen construction; the naive build shown in this article is O(N²) worst case). Space O(N + k) for the bitmasks. The k=2 array alternative is O(N log² N) build + O(N) scan; O(N) space.

**Duplicate problems:**

- Longest Common Substring of Two Strings (Suffix Array version) - the k=2 special case, solvable more simply via a single separator character and an LCP scan; see the array alternative above.
