# Canary Text and Code

## Prerequisites

- **[Array](./data-structures/array.md)** [Must read]
- **Pointer Aliasing** [Should read]

## Overview

This paragraph is the lede, and it carries a footnote reference[^first] and a second one[^second]. Inline math reads $a^2 + b^2 = c^2$ in the sentence.

Block math follows:

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

> 🎯 **Interview Lens**
> How would you explain this in one sentence?

## Code

```python
def total(nums):
    result = 0
    for n in nums:
        result += n
    return result
```

### Sub-topic

A link to a real article: [Linked List](./data-structures/linked-list.md). An external link: [Example](https://example.com).

## Long Form

The sections below exist so the page is tall enough for scroll, reading-progress and table-of-contents tests, and large enough to count as a real article rather than a stub.

### First Reading Block

A hash table maps keys to buckets by hashing each key and reducing the hash modulo the bucket count. Collisions are resolved either by chaining entries inside a bucket or by probing for another free slot. The expected cost of a lookup stays constant while the load factor is bounded, and the table resizes by rehashing every entry into a larger array once that bound is crossed. Amortised over many insertions, the occasional resize does not change the average cost of an insert.

A binary heap stores a complete binary tree in a flat array, so the parent of index i lives at (i - 1) / 2 and its children at 2i + 1 and 2i + 2. Pushing appends at the end and sifts up while the new value beats its parent. Popping swaps the root with the last element, removes it, and sifts the new root down. Both operations take logarithmic time, and building a heap from an existing array takes linear time with the bottom-up method.

### Second Reading Block

A queue serves items in the order they arrived. A ring buffer implements one without shifting elements: a head index and a tail index chase each other around a fixed array, and the queue is full when advancing the tail would land on the head. Using one spare slot distinguishes a full buffer from an empty one without a separate counter.

A trie stores strings by sharing prefixes, so every node represents one character position and a path from the root spells a key. Lookup cost depends on the key length rather than the number of keys, which makes tries a good fit for autocomplete and for longest-prefix matching. The cost is memory, since each node may reserve a slot for every symbol in the alphabet unless children are stored sparsely.

### Third Reading Block

Binary search halves the remaining range on every step, so finding a value in a sorted array of a million elements takes about twenty comparisons. The classic mistake is computing the midpoint as lo + hi, which can overflow in fixed-width integers. Writing it as lo + (hi - lo) / 2 avoids that, and keeping the loop invariant explicit makes the boundary conditions easy to reason about.

Union-find tracks which elements belong to the same set. Path compression flattens the tree on every find, and union by rank keeps trees shallow when merging. Together they bring the amortised cost per operation down to the inverse Ackermann function, which is below five for any input that fits in a physical computer.

### Fourth Reading Block

A graph can be stored as an adjacency list, where each vertex keeps the list of its neighbours, or as an adjacency matrix, where a square table records whether each pair is connected. Lists use memory proportional to the number of edges and make iterating neighbours cheap. Matrices answer the question of whether two specific vertices are connected in constant time, at the price of memory proportional to the square of the vertex count.

Breadth-first search explores a graph in layers using a queue, which means the first time it reaches a vertex is along a path with the fewest edges. Depth-first search follows one branch as far as it goes before backing up, using the call stack or an explicit stack. Both visit every vertex and edge once, so their cost is linear in the size of the graph.

### Fifth Reading Block

Dynamic programming solves a problem by combining answers to overlapping subproblems and remembering each answer so it is computed only once. The two ingredients are a recurrence that expresses a larger answer in terms of smaller ones, and an order of evaluation that guarantees the smaller answers exist first. Memoisation adds a cache to a recursive solution, while tabulation fills a table from the base cases upward.

A sliding window keeps two indices over a sequence and moves them together to maintain a running property of the elements between them. Expanding the right edge admits a new element, and shrinking the left edge removes the oldest one. Each element enters and leaves the window at most once, so the whole scan stays linear even though the window changes size.

### Closing Notes

Every claim above is deliberately ordinary prose with no special markup, so that scrolling, the sticky section header, anchor links and the progress ring have plain text to work against.

[^first]: First footnote text.
[^second]: Second footnote text.
