# Link anchor discrepancies — content-side fixes

`validateLinks` (Phase 7, `lib/content/links.ts`) hard-fails the content build on a link whose target file is missing. It also collects `#anchor` links that point at a heading id that does not exist on the target article, but those do **not** fail the build — they are pre-existing content drift, most of it unmasked by the Showdown → `github-slugger` (rehype-slug) change, and fixing them is a content task, not migration work. The live regenerated list is `lib/content/generated/anchor-discrepancies.json` after `pnpm run content:build`.

At time of writing there are 11, in two categories.

## Slugger difference: ` - ` in a heading now slugs to `---`, not `--`

Showdown collapsed a spaced ASCII hyphen (` - `) in a heading to a double hyphen in the id; `github-slugger` keeps all three characters (`space` `-` `space` → `-`, `-`, `-`). The author-written anchors use the old `--`. Fix: update the anchor in the linking file to match the rehype-slug id (three hyphens), or reword the target heading to use an em-dash (` — `, which slugs to `--` in both).

| Linking file | Anchor written | Target heading |
| --- | --- | --- |
| `system-design/components/api-gateway.md`, `session-auth.md`, `jwt.md` | `#stateful-vs-stateless--the-central-decision` | `authentication.md` → `## Stateful vs Stateless - The Central Decision` (id `…stateless---the-central-decision`) |
| `system-design/algorithms/sharding-strategies.md` | `#the-problem--why-modulo-hashing-breaks` | `consistent-hashing.md` → `## The Problem - Why Modulo Hashing Breaks` |
| `dsa/data-structures/string.md` | `#2-repeated-dna-sequences--multi-pattern-via-hash-set` | `rabin-karp.md` → `### 2. Repeated DNA sequences - multi-pattern via hash set` |
| `dsa/data-structures/segment-tree.md` | `#3-range-sum-query---range-update-and-range-sum--two-bits` | `fenwick-tree.md` → `### 3. Range Sum Query - Range Update and Range Sum` (heading also shorter than the anchor) |

## Genuine drift: the target heading was renamed or removed

The anchor names a heading that is not on the target article at all — the heading was reworded or deleted and the link never updated. These were dead in the vanilla app too (the click just did nothing). Fix: point the link at the current heading, or drop the fragment.

| Linking file | Anchor written | Target |
| --- | --- | --- |
| `system-design/components/api-gateway.md` | `#mutual-tls-mtls` | `load-balancer.md` — no "mutual TLS" heading (closest: `## SSL/TLS Handling`) |
| `dsa/data-structures/binary-search-tree.md`, `dsa/algorithms/lowest-common-ancestor.md` | `#5-lowest-common-ancestor--recursive-search` | `binary-tree.md` → `### 5. Lowest Common Ancestor` (no `--recursive-search` suffix) |
| `dsa/data-structures/b-plus-tree.md` | `#5-insert-with-node-split--median-push-up` | `b-tree.md` → `### 5. Insert-with-node-split` (no `--median-push-up` suffix) |
| `dsa/patterns/monotonic-queue.md` | `#4-sliding-window-median--why-a-deque-is-not-enough` | `deque.md` — no such heading |
