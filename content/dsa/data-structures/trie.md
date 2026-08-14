# Trie

## Prerequisites

- [Big-O Notation](../algorithms/big-o-notation.md) [Must read]
- [String](./string.md) [Must read]
- [Hash Table](./hash-table.md) [Should read]

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
- [Gotchas / edge cases](#gotchas--edge-cases)
- [What the interviewer probes for](#what-the-interviewer-probes-for)
- [Practice problems](#practice-problems)
  - [Implement a Trie](#1-implement-a-trie--insert-search-startswith)
  - [Word Search II](#2-word-search-ii--trie--dfs-on-a-grid)
  - [Replace Words](#3-replace-words--shortest-prefix-lookup)
  - [Maximum XOR of Two Numbers](#4-maximum-xor-of-two-numbers-lc-421---bitwise-trie)
  - [Design Add and Search Words](#5-design-add-and-search-words--wildcard-dfs)
  - [Count Words With a Given Prefix](#6-count-words-with-a-given-prefix)

## What it is

A **trie** (prefix tree) is a tree that stores strings by their **characters**, one character per edge, so that all words sharing a prefix share the same path from the root - making lookup, insert, and prefix queries O(L) in the key's length, independent of how many keys are stored.

Mental model: **a shared-path dictionary, like a phone-tree menu.** To find "cat" you walk root → c → a → t; "car" shares the first two steps and branches at the third. Common prefixes are stored **once**, and "does any word start with 'ca'?" is just "can I walk the path c → a?" - the operation a [hash table](./hash-table.md) can't do, because <abbr>hashing</abbr> destroys prefix structure.

> **Takeaway (say this out loud):** "A trie stores strings character-by-character down a tree, so shared prefixes share a path - giving O(L) lookup and, uniquely, O(L) prefix queries that a hash map can't do."

## How it works

Each **node** represents a prefix; its **edges** are labeled by the next character, and a boolean **is-end** flag marks nodes where a complete word terminates. The root is the empty prefix. A word is a root-to-`is_end` path.

```
insert "cat", "car", "card", "dog":

           (root)
          /      \
        c          d
        |          |
        a          o
       / \         |
      t*  r        g*          *  = is_end (a complete word ends here)
          |
          d*

words:  cat (c-a-t*),  car (c-a-r*),  card (c-a-r-d*),  dog (d-o-g*)
prefix "ca" → walk c→a → exists → some word starts with "ca"  ✓
```

**Search "card":** walk c → a → r → d, check `is_end` → found. **Prefix "ca":** walk c → a, succeed → at least one word has that prefix (no `is_end` check needed). **Insert "care":** walk the shared path c-a-r, then add a new `e*` child. Every operation is a walk of length L (the word/prefix length), touching one node per character - **O(L), regardless of how many words the trie holds.** That length-not-count cost is the trie's defining property.

The shared-prefix structure is also the space story: storing "car", "card", "care", "carry" costs roughly one path for "car" plus the divergent tails - common prefixes are paid for once.

## Operations

| Operation                  | Time                          | Space (per op)        |
| -------------------------- | ----------------------------- | --------------------- |
| Insert a word (length L)   | O(L)                          | O(L) worst (new path) |
| Search exact word          | O(L)                          | O(1)                  |
| Prefix query `startsWith`  | O(L)                          | O(1)                  |
| Delete a word              | O(L)                          | O(1)                  |
| List all words with prefix | O(p + total chars of matches) | O(answer)             |
| Count words with prefix    | O(p) (with augmentation)      | O(1)                  |

Every core operation is **O(L)** - the word length - and crucially **independent of `n`, the number of stored words.** Compare a [BST](./binary-search-tree.md)'s O(log n · L) (log n comparisons, each comparing up to L chars) or a sorted scan. The prefix query is the trie's signature: O(p) for a prefix of length p.

## Complexity summary

| Operation | Best | Average | Worst |
| --------- | ---- | ------- | ----- |
| Insert    | O(L) | O(L)    | O(L)  |
| Search    | O(L) | O(L)    | O(L)  |
| Prefix    | O(p) | O(p)    | O(p)  |

**Space:** the catch. A naive trie node holds an array of child pointers sized to the **alphabet** (26 for lowercase, 256 for bytes, more for Unicode), so worst-case space is **O(n · L · alphabet)** - potentially huge and sparse, since most child slots are empty. This is the trie's central trade: blazing O(L) operations bought with heavy memory. Mitigations - a **hash map of children** per node (only present edges), or a **compressed/radix trie** that collapses single-child chains - cut the waste (see [Variants](#variants)). For a dense dictionary the prefix-sharing recovers a lot; for sparse keys the overhead bites.

## When to use / when not

**Reach for a trie when:**

- You need **prefix queries** - autocomplete, "words starting with…", longest-prefix match, type-ahead. This is the trie's reason to exist; nothing else does it as cleanly.
- You're doing **many lookups on a fixed dictionary** of strings - spell-check, word games, dictionary membership where O(L) beats <abbr>hashing</abbr> the whole word repeatedly.
- The keys **share lots of prefixes** - URLs, file paths, IP prefixes (routing) - so the sharing pays for the node overhead.
- You need **lexicographic ordering** of string keys - a pre-order walk emits them sorted, for free.

**Reach for something else when:**

- **You only need whole-key membership/lookup, no prefixes** → a [hash table](./hash-table.md) is O(L) to hash but with far less memory and a tiny constant; the trie's prefix power is wasted. This is the default choice unless prefixes matter.
- **Memory is tight and keys are sparse / long with few shared prefixes** → the per-node alphabet overhead explodes; a hash set is leaner.
- **Keys aren't strings/sequences** → a trie needs a sequential key (chars, digits, bits); for arbitrary objects use a [hash table](./hash-table.md) or [BST](./binary-search-tree.md).

Rule of thumb: **trie = "I need prefixes."** If the problem says "starts with", "autocomplete", "longest common prefix", or "shortest prefix", it's a trie. If it just says "is this word present", it's a hash set.

Real-world: **autocomplete / type-ahead** in search boxes and IDEs, **spell-checkers** and word-game validators (Scrabble/Boggle), **IP routing tables** (longest-prefix match via bitwise tries), **T9 / predictive text**, and dictionary-compression. A bitwise trie powers max-XOR queries in competitive programming (see [Practice problem 4](#4-maximum-xor-of-two-numbers-lc-421)).

## Comparison

How a trie relates to the structures you'd weigh against it for string keys:

| Structure               | Exact lookup | Prefix query      | Sorted iteration    | Memory                           | Pick it when…                       |
| ----------------------- | ------------ | ----------------- | ------------------- | -------------------------------- | ----------------------------------- |
| **Trie**                | O(L)         | **O(p)**          | **yes** (pre-order) | heavy (alphabet × nodes)         | prefix queries dominate the workload - crosses over from a hash set the moment "starts with" appears, since a hash set's O(n) prefix scan loses to O(p) at any dataset large enough to matter |
| Hash table/set          | O(L) hash    | **no** (O(n))     | no                  | light                            | only whole-key membership is needed, never a prefix - wins on memory and constant factor the instant prefix queries drop out of scope; the moment "autocomplete" or "starts with" enters the requirements, the trie's O(p) beats this O(n) scan regardless of dataset size |
| BST (balanced)          | O(L·log n)   | range-ish         | yes                 | 2 ptrs/node                      | keys need lexicographic range queries over whole keys ("between 'cat' and 'dog'") rather than prefix matching - crosses over from a trie when the query shape is a key-range, not a shared-prefix set, since a trie has no native "next key after X" the way an in-order BST walk does |
| Sorted array + bisect   | O(L·log n)   | prefix via bisect | yes                 | tight                            | the dictionary is static (built once, queried many times, no inserts) - crosses over from a trie when insert/delete cost doesn't matter and the tightest possible memory footprint does; the trie wins back the trade once the key set becomes dynamic, since re-sorting an array on every insert is O(n log n) vs the trie's O(L) |
| Compressed trie (radix) | O(L)         | **O(p)**          | yes                 | **much lighter** than plain trie | the plain trie's memory becomes the bottleneck - crosses over once long shared-prefix chains (sparse branching, e.g. URLs or file paths) waste nodes on single-child runs; collapsing pays off once chains average more than ~2-3 nodes without branching, below which the merge/split bookkeeping isn't worth it |

The trie's column is the only one with **O(p) prefix queries**. The hash table beats it on memory and whole-key lookup constant but can't do prefixes at all; the compressed trie keeps the prefix power while slashing the memory overhead.

See the [Data Structure Selection cheatsheet](../cheatsheets/data-structure-selection.md) for the full cross-structure comparison.

## Variants

- **Standard (array-node) trie** - each node has a fixed array of `alphabet` child slots. Fastest child lookup (O(1) index), heaviest memory. Good for small alphabets (26 letters, 2 bits).
- **Hash-map-node trie** - each node stores children in a [hash map](./hash-table.md) keyed by character, so only present edges cost memory. Leaner for large/sparse alphabets (Unicode), slightly slower child access.
- **Compressed trie / radix tree (Patricia trie)** - collapses chains of single-child nodes into one edge labeled with a substring, drastically cutting node count and memory while keeping O(L)/O(p) operations. The variant used in IP routing and many real systems.
- **Ternary search trie** - each node has low/equal/high children (a BST of characters per level), trading some speed for far less memory than an array-node trie. A middle ground.
- **Bitwise trie (binary trie)** - keys are the **bits** of integers (alphabet = {0,1}, depth = bit-width), enabling max-XOR and longest-prefix-match queries. A structural specialization; the technique lives in [Practice problem 4](#4-maximum-xor-of-two-numbers-lc-421).
- **Suffix trie / suffix tree** - a trie of all suffixes of one string, for substring queries. Powerful but heavy; the compressed form ([suffix tree](./suffix-tree.md)/automaton) is the practical version.

## Traversal & invariant

A trie's <abbr>invariant</abbr> is structural: each edge is labeled by exactly one symbol of the alphabet, a node's path from the root spells its prefix, and `is_end` flags which prefixes are complete words. No ordering-by-value invariant like a [BST](./binary-search-tree.md) - the order is the **lexicographic order of the edge labels**.

**Traversal - pre-order yields sorted words.** Walk children in alphabetical order, emitting the accumulated string whenever you hit an `is_end` node:

```
pre-order (children A→Z), collecting at is_end:

  root → c → a → r → (is_end: "car")
                 → d → (is_end: "card")
             → t → (is_end: "cat")
       → d → o → g → (is_end: "dog")

emits:  car, card, cat, dog   ← lexicographically sorted, for free
```

This is how a trie does **ordered iteration** and **prefix listing**: to list all words under a prefix, walk to the prefix node (O(p)), then DFS its subtree collecting `is_end` paths. The `is_end` flag is load-bearing - without it you can't distinguish a stored word "car" from the mere prefix "car" of "card" (see [Gotchas](#gotchas--edge-cases)).

## Implementation

A standard trie with insert, search, and the prefix query. Pseudocode states the contract; Python uses a dict-of-children node (the lean, idiomatic choice).

**Pseudocode (CLRS-style contract):**

```
TRIE-INSERT(root, word)
1   node = root
2   for each char c in word
3       if c not in node.children
4           node.children[c] = new TRIE-NODE()    ▷ extend the path
5       node = node.children[c]
6   node.is_end = TRUE                             ▷ mark a complete word

TRIE-SEARCH(root, word)                            ▷ exact word
1   node = TRIE-WALK(root, word)
2   return node ≠ NIL and node.is_end              ▷ must be a marked word, not just a prefix

TRIE-STARTS-WITH(root, prefix)
1   return TRIE-WALK(root, prefix) ≠ NIL           ▷ path exists → prefix present (no is_end check)

TRIE-WALK(root, s)                                  ▷ follow s; NIL if path breaks
1   node = root
2   for each char c in s
3       if c not in node.children: return NIL
4       node = node.children[c]
5   return node
```

**Python (reference - idiomatic, dict-of-children):**

```python
from __future__ import annotations
from dataclasses import dataclass, field

@dataclass
class TrieNode:
    children: dict[str, "TrieNode"] = field(default_factory=dict)
    is_end: bool = False

class Trie:
    def __init__(self) -> None:
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.is_end = True

    def _walk(self, s: str) -> TrieNode | None:
        node = self.root
        for ch in s:
            node = node.children.get(ch)
            if node is None:
                return None                  # path breaks → not present
        return node

    def search(self, word: str) -> bool:
        node = self._walk(word)
        return node is not None and node.is_end

    def starts_with(self, prefix: str) -> bool:
        return self._walk(prefix) is not None
```

**Contest velocity.** A `dict`-of-children trie (above) is the fast thing to write - no fixed alphabet array, no index math. For a known small alphabet (lowercase), a 26-slot list per node is faster but more code; reach for it only when profiling demands. For pure membership with no prefixes, skip the trie and use a `set`.

## Gotchas / edge cases

- **Confusing a prefix with a stored word - the `is_end` flag.** Inserting "card" creates the path for "car" too, but "car" is not a stored word unless separately inserted. `search("car")` must check `is_end`; `starts_with("car")` must not. Forgetting the flag (or checking it in the wrong query) is the #1 trie bug.
- **The empty string.** Inserting `""` marks the **root** as `is_end`; searching `""` then returns true, and `starts_with("")` is always true (every word has the empty prefix). Decide whether the empty string is a valid key and handle the root flag accordingly.
- **Memory blowup on large alphabets.** An array-node trie over Unicode (or bytes) allocates a huge mostly-empty child array per node - O(n·L·alphabet) space. Use a hash-map node or a compressed/radix trie when the alphabet is large or keys are sparse; don't reflexively use 26-arrays for arbitrary text.
- **Delete must prune, not just unflag.** Removing a word should clear its `is_end` and then **delete now-childless, non-word nodes** up the path - otherwise dead branches leak memory. But stop pruning at any node that is another word's `is_end` or has other children.
- **Case sensitivity and normalization.** "Cat" and "cat" are different paths; normalize case/encoding before insert and lookup, or queries silently miss. The same Unicode-normalization caveat as [strings](./string.md#gotchas--edge-cases) applies.
- **Off-the-end walks.** A lookup whose path breaks partway (a character with no child) must return "not found" immediately - dereferencing a missing child is the crash. The `_walk` returning `None` on a broken path centralizes this.

## What the interviewer probes for

**What happens at a billion keys with a large alphabet (Unicode, not just lowercase)?** - An array-node trie over Unicode allocates a huge mostly-empty child array at every node, so memory blows up long before you reach a billion keys - O(n·L·alphabet) with `alphabet` in the tens of thousands is unusable. The fix is structural: switch to a hash-map-node trie (pay only for present edges) or, better, a compressed/radix trie that collapses single-child chains, cutting node count by an order of magnitude on real-world key sets like URLs or file paths.

**Why not always use a hash set instead of a trie?** - A hash set is O(L) to hash and lookup with a far smaller constant and no per-node pointer overhead, so it wins on memory and raw lookup speed whenever the workload is pure membership. The trie earns its keep only when prefix queries ("starts with", autocomplete, longest-common-prefix) are actually in scope - trade the memory for O(p) prefix operations a hash set can't do at all (it would need an O(n) scan).

**Does a trie hold up under concurrent writes?** - Insert and delete both mutate shared node state (creating children, flipping `is_end`, pruning dead branches), so naive concurrent access races on the same nodes near the root, which every key touches. Production tries either shard by first-character/first-byte (giving each shard its own subtree and lock) or use copy-on-write/RCU-style node replacement so readers never block on a concurrent writer.

## Practice problems

Five staples, each a **distinct** trie technique - no two solved the same way.

### 1. Implement a Trie - _insert, search, startsWith_

**Problem.** Build a trie supporting `insert(word)`, `search(word)` (exact, complete word), and `startsWith(prefix)`. E.g. after inserting "apple", `search("app")` → false, `startsWith("app")` → true, `search("apple")` → true.

**Worked examples:**
- **Example 1**
  - **Input:** `insert("apple"); search("apple")` | **Output:** `True`
  - **Explanation:** "apple" was inserted, so walking its full path lands on a node with `is_end` set.
- **Example 2**
  - **Input:** `insert("apple"); search("app")` | **Output:** `False`
  - **Explanation:** "app" is a prefix of "apple" (the path exists) but was never inserted as its own word, so its node's `is_end` is false.

**Constraints:** up to `3 × 10⁴` calls to insert/search/startsWith combined; word/prefix length `1 ≤ length ≤ 2000`; lowercase English letters only.

**Approach:** A node per prefix with a children map and an `is_end` flag. Insert walks/extends the path and marks the last node. Search walks then checks `is_end`; startsWith walks and just checks the path exists. The `is_end` distinction between "word" and "prefix" is the whole exercise.

```python
# see Trie in Implementation - the canonical solution.
t = Trie()
t.insert("apple")
print(t.search("app"), t.starts_with("app"), t.search("apple"))   # False True True
```

**Complexity:** O(L) per operation, O(total chars) space.

**Duplicate problems:**
- Map Sum Pairs (LC 677) - same trie insert/walk core, augmented with a prefix-sum instead of an is_end flag.
- Longest Word in Dictionary (LC 720) - same insert-then-walk core, checking that every prefix along the way is itself a complete word.

### 2. Word Search II

**Problem.** Given a grid of letters and a list of words, return all words findable by connecting 4-directionally adjacent cells (no cell reused per word). E.g. find "oath", "eat" in a board of letters.

**Worked examples:**
- **Example 1**
  - **Input:** `board = [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]]`, `words = ["oath","pea","eat","rain"]` | **Output:** `["oath","eat"]`
  - **Explanation:** "oath" is spelled by a connected path of adjacent cells; "eat" likewise; "pea" and "rain" have no valid adjacent path on this board.
- **Example 2**
  - **Input:** `board = [["a","b"],["c","d"]]`, `words = ["abcb"]` | **Output:** `[]`
  - **Explanation:** "abcb" would require reusing cell "b" twice in one path, which is disallowed, so the DFS prunes it out.

**Constraints:** `1 ≤ board rows, cols ≤ 12`; `1 ≤ words.length ≤ 3 × 10⁴`; `1 ≤ word length ≤ 10`; lowercase English letters only.

**Approach:** Build a trie of the word list, then DFS the grid following trie edges - prune the moment the current path isn't a trie prefix (this is what makes it fast vs searching each word separately). When a DFS reaches an `is_end` node, record the word. Searching all words simultaneously through one trie is the key efficiency.

```python
def find_words(board, words):
    root = Trie(); [root.insert(w) for w in words]
    rows, cols, found = len(board), len(board[0]), set()
    def dfs(r, c, node, path):
        ch = board[r][c]
        nxt = node.children.get(ch)
        if nxt is None: return
        path += ch
        if nxt.is_end: found.add(path)
        board[r][c] = "#"
        for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):
            nr, nc = r+dr, c+dc
            if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] != "#":
                dfs(nr, nc, nxt, path)
        board[r][c] = ch
    for r in range(rows):
        for c in range(cols):
            dfs(r, c, root.root, "")
    return list(found)
```

**Complexity:** O(cells · 4^L) worst, pruned hard by the trie in practice. Pattern: [Tree & Graph Traversal](../patterns/tree-graph-traversal.md) + [Backtracking](../patterns/subsets-permutations.md).

### 3. Replace Words

**Problem.** Given a dictionary of root words and a sentence, replace every word by the **shortest root** that is a prefix of it. E.g. roots `["cat","bat"]`, "the cattle was rattled" → "the cat was rattled".

**Worked examples:**
- **Example 1**
  - **Input:** `roots = ["cat","bat"]`, `sentence = "the cattle was rattled"` | **Output:** `"the cat was rattled"`
  - **Explanation:** "cattle" walks to the `is_end` node at "cat" first, so it's replaced by "cat"; "rattled" has no matching root, so it's kept as-is.
- **Example 2**
  - **Input:** `roots = ["a","b","c"]`, `sentence = "aadsfasf absfasf acbfekk"` | **Output:** `"a a a"`
  - **Explanation:** every word starts with a single-letter root, so the walk hits an `is_end` node after just one character each time.

**Constraints:** `1 ≤ roots.length ≤ 1000`, `1 ≤ root length ≤ 100`, `1 ≤ sentence length ≤ 10⁶`, lowercase English letters only.

**Approach:** Insert all roots into a trie. For each word, walk its characters down the trie, stopping at the **first** `is_end` node - that's the shortest matching root. If the path breaks before any `is_end`, keep the word. The early-stop-at-first-is_end is the shortest-prefix idiom.

```python
def replace_words(roots, sentence):
    t = Trie(); [t.insert(r) for r in roots]
    def shortest_root(word):
        node = t.root
        for i, ch in enumerate(word):
            node = node.children.get(ch)
            if node is None: return word
            if node.is_end: return word[:i+1]
        return word
    return " ".join(shortest_root(w) for w in sentence.split())
```

**Complexity:** O(total chars) time and space.

### 4. Maximum XOR of Two Numbers (LC 421)

**Problem.** Given an array of integers, return the maximum `nums[i] XOR nums[j]`. E.g. `[3,10,5,25,2,8]` → `28` (`5 XOR 25`).

**Worked examples:**
- **Example 1**
  - **Input:** `nums = [3,10,5,25,2,8]` | **Output:** `28`
  - **Explanation:** `5 XOR 25 = 28`, the largest XOR among all pairs; the bitwise trie finds it by greedily choosing opposite bits for each number.
- **Example 2**
  - **Input:** `nums = [0]` | **Output:** `0`
  - **Explanation:** with only one number, the only "pair" is `0 XOR 0 = 0`.

**Constraints:** `1 ≤ nums.length ≤ 2 × 10⁵`, `0 ≤ nums[i] ≤ 2³¹ - 1`.

**Approach:** Insert every number's bits (MSB-first) into a **binary trie** (alphabet `{0, 1}`, depth = bit-width). For each number, greedily walk choosing the **opposite** bit at each step when possible - each differing bit contributes a 1 to the XOR at that position, maximizing it. O(n · 32) instead of the O(n²) all-pairs check. This is the canonical binary-trie technique for max-XOR problems.

```python
class BitTrie:
    def __init__(self) -> None:
        self.root: dict = {}

    def insert(self, x: int, bits: int = 31) -> None:
        node = self.root
        for i in range(bits, -1, -1):
            b = (x >> i) & 1
            node = node.setdefault(b, {})

    def max_xor(self, x: int, bits: int = 31) -> int:
        node, best = self.root, 0
        for i in range(bits, -1, -1):
            b = (x >> i) & 1
            want = 1 - b                      # prefer the opposite bit - maximizes XOR at this position
            if want in node:
                best |= (1 << i)
                node = node[want]
            else:
                node = node[b]
        return best


def find_maximum_xor(nums: list[int]) -> int:
    trie = BitTrie()
    best = 0
    for x in nums:
        trie.insert(x)
    for x in nums:
        best = max(best, trie.max_xor(x))
    return best
```

**Complexity:** O(n · B) time (B = bit-width), O(n · B) space.

**Duplicate problems:**
- Maximum XOR With an Element From Array (LC 1707) - same binary-trie greedy-opposite-bit max-XOR walk, adapted to offline queries with a value limit (sort queries by limit, insert numbers incrementally).

### 5. Design Add and Search Words

**Problem.** Support `addWord(word)` and `search(word)` where `search` may contain `.` matching any single character. E.g. after adding "bad","dad", `search("b..")` → true, `search(".ad")` → true.

**Worked examples:**
- **Example 1**
  - **Input:** `addWord("bad"); addWord("dad"); addWord("mad"); search("pad")` | **Output:** `False`
  - **Explanation:** "pad" has no wildcard and was never added, so the plain walk breaks before reaching an `is_end` node.
- **Example 2**
  - **Input:** `addWord("bad"); addWord("dad"); addWord("mad"); search(".ad")` | **Output:** `True`
  - **Explanation:** the `.` branches into all three first-letter children (b, d, m); the "d"→"a"→"d" branch reaches an `is_end` node, so the DFS returns true.

**Constraints:** up to `3 × 10⁴` calls to addWord/search combined; word length `1 ≤ length ≤ 25`; lowercase English letters and `.` only in search.

**Approach:** A trie for `addWord`. For `search`, DFS: at a normal character follow that one edge; at `.` recurse into **all** children. The wildcard turns the linear walk into a branching DFS, but only where dots appear, so it stays efficient for few wildcards. Combines trie traversal with backtracking on `.`.

```python
class WordDictionary:
    def __init__(self): self.root = TrieNode()
    def addWord(self, word):
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.is_end = True
    def search(self, word):
        def dfs(node, i):
            if i == len(word):
                return node.is_end
            ch = word[i]
            if ch == ".":
                return any(dfs(child, i+1) for child in node.children.values())
            nxt = node.children.get(ch)
            return dfs(nxt, i+1) if nxt else False
        return dfs(self.root, 0)
```

**Complexity:** O(L) for no-wildcard search; up to O(alphabet^(dots) · L) worst with many dots.

### 6. Count Words With a Given Prefix

**Problem.** Design a structure supporting `insert(word)`, `delete(word)`, and `countPrefix(prefix)` (how many currently-inserted words start with `prefix`), each in O(L) where L is the word/prefix length.

**Worked examples:**
- **Example 1**
  - **Input:** `insert("apple"); insert("app"); insert("apricot"); countPrefix("ap")` | **Output:** `3`
  - **Explanation:** all three inserted words start with `"ap"`, so the prefix node at `a→p` has been passed through 3 times.
- **Example 2**
  - **Input:** `insert("apple"); delete("apple"); countPrefix("apple")` | **Output:** `0`
  - **Explanation:** deleting decrements the counter along the same path insert incremented, so the count returns to 0.

**Constraints:** up to `3 × 10⁴` calls to insert/delete/countPrefix combined; word/prefix length `1 ≤ length ≤ 2000`; lowercase English letters only; `delete` is only called on words currently present.

**Approach:** Augment every node with a **counter** = how many inserted words currently pass through it. `insert` increments the counter at each node along the word's path; `delete` decrements it along the same path. `countPrefix(p)` then just walks to `p`'s node and reads its counter directly - O(p), no subtree scan needed. This turns "how many words share this prefix" from an O(n·p) re-scan of every stored word into an O(p) counter read, the standard augmentation for prefix-frequency queries.

```python
from dataclasses import dataclass, field

@dataclass
class CountingTrieNode:
    children: dict[str, "CountingTrieNode"] = field(default_factory=dict)
    count: int = 0                      # number of inserted words passing through this node

class PrefixCounter:
    def __init__(self) -> None:
        self.root = CountingTrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, CountingTrieNode())
            node.count += 1

    def delete(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.children[ch]
            node.count -= 1

    def count_prefix(self, prefix: str) -> int:
        node = self.root
        for ch in prefix:
            node = node.children.get(ch)
            if node is None:
                return 0
            if node.count == 0:
                return 0
        return node.count
```

**Complexity:** O(L) per operation, O(total chars) space.

**Duplicate problems:**
- Map Sum Pairs (LC 677) - same per-node augmentation idea, storing a running value-sum instead of a plain count.

