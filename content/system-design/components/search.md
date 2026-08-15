# Search

## Prerequisites

- **[Sharding Strategies](../algorithms/sharding-strategies.md)** [Should read]
- **[Replication Strategies](../algorithms/replication-strategies.md)** [Should read]

---

## Table of Contents

- [TLDR](#tldr)
- [Core Mechanics](#core-mechanics)
- [Relevance Ranking](#relevance-ranking)
- [Distributed Search](#distributed-search)
- [Quick Decision Guide](#quick-decision-guide)
- [Comparison / Selection Matrix](#comparison--selection-matrix)
- [Indexing Pipeline & Freshness](#indexing-pipeline--freshness)
- [Performance & Optimization](#performance--optimization)
- [Resilience & Failure Handling](#resilience--failure-handling)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

A search system answers "which documents match this query, ranked by relevance" over a large, frequently-changing corpus - a fundamentally different problem from a database's "find the row matching this exact key," which is why it's built on an inverted index (word → list of documents containing it) rather than a B-tree keyed on primary key. The core design decision is trading write-time cost for read-time speed: every document write fans out to update postings lists for every term it contains, so that a query touches only the (usually small) set of relevant postings lists instead of scanning the corpus. At scale, the corpus and index are sharded across nodes and every query becomes scatter-gather - fan out to every shard, merge and re-rank partial results - making tail latency, not average latency, the operational metric that actually matters.

---

## Core Mechanics

**Think of it as the index at the back of a textbook, inverted and built automatically: instead of "page 42 discusses X, Y, Z," it's "X appears on pages 12, 42, 87."** For each distinct term across the whole corpus, the **inverted index** stores a **postings list** - the list of documents containing that term, plus enough metadata (term frequency in that document, term position) to support ranking later.

```
Document 1: "the quick brown fox"
Document 2: "the lazy fox sleeps"

Inverted index:
  "the"   → [doc1, doc2]
  "quick" → [doc1]
  "brown" → [doc1]
  "fox"   → [doc1, doc2]
  "lazy"  → [doc2]
  "sleeps"→ [doc2]
```

A query for "quick fox" looks up the postings lists for "quick" and "fox" independently, then intersects/unions them (per the query's boolean semantics) to find candidate documents containing both terms - touching only two postings lists, not the entire document corpus, regardless of corpus size. This is the entire value proposition: the inverted index converts "scan every document" into "look up a small number of terms," at the cost of maintaining that index on every write.

Before indexing, raw text is **tokenized** (split into terms), typically **lowercased and stemmed/lemmatized** (`"running"` and `"runs"` both index under `"run"`) so a query for one form matches documents containing any related form - this is what makes free-text search feel forgiving compared to an exact-match database lookup.

---

## Relevance Ranking

Once candidate documents are found via the inverted index, they need to be **ranked** - a search engine's core differentiator isn't finding matching documents (any boolean intersection does that), it's ordering them by relevance.

### TF-IDF (Term Frequency-Inverse Document Frequency)

The classical baseline ranking signal: a term contributes more to a document's relevance score the more often it appears in that document (**term frequency**), but less if it's a common term across the whole corpus (**inverse document frequency** - "the" appearing in every document carries almost no discriminating signal, while a rare term appearing in a document is a strong match signal). A document's score for a query is the sum of TF-IDF contributions across the query's terms.

### BM25

The modern practical default, refining TF-IDF with two corrections: **term frequency saturation** (a term appearing 20 times in a document isn't meaningfully more relevant than appearing 10 times - BM25's contribution curve flattens, where raw TF-IDF keeps scaling linearly) and **document length normalization** (a long document naturally contains more term occurrences by sheer length, not necessarily higher relevance - BM25 discounts long documents' raw counts relative to the corpus's average document length). Elasticsearch and most production full-text engines use BM25 as the default scoring function specifically for these two corrections over raw TF-IDF.

> 🧠 **Thought Process** - the real design question in ranking isn't "which formula" but "what signal does relevance actually mean for this product." TF-IDF/BM25 rank by textual match strength alone - genuinely relevant results for a product search (popularity, recency, personalization) often need those signals blended in on top, which is why production ranking is rarely BM25 alone past a certain product maturity (see [Learning-to-Rank](#learning-to-rank-ml-based-ranking)).

### Learning-to-Rank (ML-Based Ranking)

Past a certain scale/maturity, systems replace or augment BM25 with a machine-learned ranking model trained on click/engagement data (a document clicked and not immediately bounced from is a positive relevance signal) - blending textual match score with business signals (popularity, recency, personalization, price) that pure term-frequency statistics can't capture. This trades BM25's transparency and zero-training-data requirement for materially better relevance at the cost of a training pipeline and feedback-loop infrastructure.

---

## Distributed Search

A corpus too large for one node's index is **sharded** (see [Sharding Strategies](../algorithms/sharding-strategies.md)) - each shard holds a disjoint subset of documents and its own local inverted index.

```
Query "quick fox"
      │
      ▼
[Coordinator]
      │  scatter
      ├──────────► [Shard A index] ──► top-K local matches
      ├──────────► [Shard B index] ──► top-K local matches
      └──────────► [Shard C index] ──► top-K local matches
      │  gather + merge + re-rank
      ▼
  Final top-K results
```

Every query becomes **scatter-gather**: the coordinator fans the query out to every shard, each shard independently finds and ranks its own top-K local matches, and the coordinator merges those partial ranked lists into a single final ranking. This is the same scatter-gather pattern any sharded system pays for cross-shard queries (see [Sharding Strategies](../algorithms/sharding-strategies.md#cross-shard-operations)) - a search system pays it on effectively every query, not just occasional cross-shard ones, since relevance ranking is inherently a whole-corpus operation.

> ⚠️ **Warning / Gotcha** - because every query touches every shard, one slow or temporarily unavailable shard degrades **every** query's tail latency, not just queries that happen to need that shard's data. This is why P99 latency (not average) is the metric that actually matters for search-system health - a single struggling shard is invisible in an average but dominates the tail.

Each shard is typically also **replicated** (see [Replication Strategies](../algorithms/replication-strategies.md)) - both for read availability and to spread query load for a given shard's index across multiple replicas, since search queries are typically read-heavy relative to the indexing write rate.

---

## Quick Decision Guide

### When to Use a Dedicated Search System

Free-text or fuzzy-match queries, relevance ranking beyond exact-match, faceted filtering (filter by category + free-text simultaneously), or query patterns a relational database's B-tree indexes weren't built for (a `LIKE '%term%'` scan is not a search engine's inverted-index lookup, and gets slower, not faster, as the table grows).

### When NOT to Use a Dedicated Search System

- **Exact-key lookups** - a primary-key or unique-index lookup is a database's core competency; adding a search engine for this is unnecessary operational surface area.
- **Strongly consistent, transactional reads of the same data being written** - most search indexes are near-real-time, not immediately consistent (see [Indexing Pipeline & Freshness](#indexing-pipeline--freshness)); don't use a search index as the system of record for data requiring read-your-writes guarantees.
- **Small, static, low-query-volume datasets** - the inverted-index infrastructure and its operational cost (cluster management, reindexing) isn't worth it below a scale where a database's `LIKE`/full-text extension (e.g. Postgres `tsvector`) suffices.

---

## Comparison / Selection Matrix

| System | Ranking | Distributed model | Best for |
| --- | --- | --- | --- |
| Elasticsearch / OpenSearch | BM25 default, pluggable | Sharded + replicated (Lucene-based) | General-purpose full-text + log/metrics search |
| Apache Solr | BM25/TF-IDF, pluggable | Sharded + replicated (Lucene-based) | Enterprise search, similar niche to Elasticsearch |
| Postgres full-text search (`tsvector`) | Simplified TF-IDF-style ranking | Single-node (or read-replica scale only) | Small-to-medium corpora already living in Postgres, avoiding a second system |
| Algolia (managed) | Proprietary, typo-tolerant, speed-optimized | Managed, sharded internally | Instant-search-as-you-type product UX, low ops overhead |

**Pick it when:** the decisive factor is usually operational ownership and scale, not raw feature difference - Elasticsearch/OpenSearch when the team can operate a cluster and needs full control (custom scoring, log/metrics dual-use); a managed option (Algolia) when search is a product feature, not the team's infrastructure specialty; Postgres full-text when the corpus is small enough that a second system is pure overhead.

---

## Indexing Pipeline & Freshness

New or updated documents don't appear in search results instantly - they flow through an indexing pipeline: the document is tokenized, its postings lists updated, and the update becomes visible to queries only after a **refresh interval** (commonly ~1 second in Elasticsearch's near-real-time model, tunable). This is a deliberate throughput trade-off: making every single write immediately queryable would require far more expensive per-write index restructuring than batching writes into periodic refresh cycles.

> ⚖️ **Decision Framework**
> Search-index freshness requirements vary by product: a chat message search feature needs near-instant visibility (short refresh interval, accepting the indexing throughput cost); a product-catalog search tolerates seconds-to-minutes of staleness easily (longer refresh interval, better indexing throughput). Don't default to the shortest possible refresh interval - it's a real cost, not a free correctness improvement.

**Segment merging:** internally, an inverted index is typically built as many small immutable **segments** (each refresh cycle creates a new segment) that are periodically merged into larger segments in the background - avoiding the cost of restructuring one giant index on every write, at the cost of background merge I/O and, transiently, more segments to search per query before a merge catches up.

---

## Performance & Optimization

### Caching Hot Queries

Popular or repeated queries (a trending search term, a common filter combination) are strong candidates for a query-result cache in front of the search cluster - the same caching trade-offs as any read-heavy system apply (see **[Caching](./caching.md)**), and search workloads are frequently read-heavy with a long tail of repeated popular queries, making cache hit rates favorable.

### Query-Time vs Index-Time Cost Trade-offs

Some relevance/filtering work can be pushed to index time (compute and store a field once, at write time) instead of query time (recompute on every query) - e.g. precomputing a popularity score and storing it as an indexed field, rather than joining against a live popularity table on every search request. This trades index-time write cost and storage for materially faster queries, the same "pay once at write, cheap at read" trade-off underlying the inverted index itself.

---

## Resilience & Failure Handling

A shard replica failure is masked by routing queries to a surviving replica (see [Distributed Search](#distributed-search)) - transparent to the client, at the cost of that shard's remaining replicas absorbing more query load until the failed replica is replaced. A full shard loss (all replicas of one shard gone) is more serious: since search results are typically an aggregate top-K across all shards, a missing shard silently produces incomplete results (missing documents that happen to live on that shard) rather than an obvious error - unlike a database query that would fail loudly on a missing partition, a search query "succeeds" with quietly wrong results unless the system explicitly surfaces partial-result status to the caller.

---

## Production Failure Modes & Gotchas

### Reindexing at Scale

Changing the tokenization/analysis configuration (a new stemming rule, a schema change to what fields are indexed) requires reprocessing the entire corpus through the new pipeline - not an incremental operation, since the inverted index's structure is derived from the analysis config at index-build time. At large corpus scale, a full reindex is a significant, carefully-orchestrated operation (often building the new index in parallel and cutting over, rather than rebuilding in place) - treating it as a routine config change is a common scale surprise.

### Hot Shard from Skewed Term Distribution

Even with an even document-count shard distribution, query load can still skew heavily if a small number of popular query terms concentrate scatter-gather traffic onto whichever shards happen to hold the most matching documents for those terms - a variant of the general hot-shard problem (see [Sharding Strategies](../algorithms/sharding-strategies.md#common-misapplications--gotchas)), but driven by query-pattern skew rather than write-pattern skew.

### Common Misconceptions

- "A database's `LIKE '%term%'` query is basically the same as search." No - `LIKE` with a leading wildcard can't use a B-tree index at all and degrades to a full table scan; an inverted index's postings-list lookup stays fast regardless of corpus size specifically because it was built for this access pattern from the start.
- "Search results are always immediately consistent with writes." No - see [Indexing Pipeline & Freshness](#indexing-pipeline--freshness); most production search systems are near-real-time by design, not strongly consistent, and treating them as a system of record for read-your-writes is a design error.
- "More relevant" means "more term matches." Term frequency is one signal among several (see [Relevance Ranking](#relevance-ranking)) - a document mentioning a term 50 times isn't necessarily more relevant than one mentioning it twice in exactly the right context; this is precisely what BM25's saturation curve and modern learning-to-rank signals correct for.

---

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** Why can't a relational database's B-tree index handle full-text search efficiently?
> **Ideal answer:** A B-tree index is built for range/equality lookups on an ordered key - it doesn't help with "does this document contain this word anywhere in its text," since text isn't a single sortable key. An inverted index instead maps each term directly to its postings list, so a term lookup is O(1)-ish (hash) or O(log n) (sorted term dictionary) regardless of how many documents exist, which is the structural reason search engines exist as a separate system rather than "just add an index" to a relational table.
> **Common trap:** Suggesting `LIKE '%term%'` as a substitute - a leading wildcard defeats B-tree index usage entirely and forces a full table scan, getting slower as the table grows rather than staying fast.
> **Next question:** Your product now needs typo-tolerant search ("resturant" should match "restaurant") - how does that change the indexing approach?

> 🎯 **Interview Lens**
> **Q:** A search cluster is sharded across 20 nodes. P50 query latency looks fine, but P99 is consistently 10x P50. What's the likely cause and how do you investigate?
> **Ideal answer:** Because every query scatters to every shard and waits for the slowest one, a single consistently-slow or occasionally-GC-pausing shard drags every query's tail latency, even though most shards respond fast - this is exactly why P99, not average, is the operative metric. Investigate per-shard latency distribution directly (not aggregate query latency) to isolate which specific shard(s) are the outlier, rather than tuning the whole cluster.
> **Common trap:** Treating this as a general "the cluster needs more capacity" problem and adding uniform capacity, when the actual cause is localized to specific slow shards.
> **Next question:** You find one shard is consistently the outlier because it holds disproportionately more documents than the others - what does that tell you about the original sharding scheme?

> 🎯 **Interview Lens**
> **Q:** Your search index has a 1-second refresh interval, and a user reports that a document they just created doesn't show up in search results immediately. Is this a bug?
> **Ideal answer:** Not necessarily - most production search systems are near-real-time by design (see [Indexing Pipeline & Freshness](#indexing-pipeline--freshness)), trading immediate write-visibility for indexing throughput. This is expected behavior within the refresh interval, not a correctness bug, though it's a real product/UX decision that needs to be made explicit (and potentially tuned) rather than silently assumed.
> **Common trap:** Treating any indexing delay as an outright bug rather than recognizing it as a deliberate, tunable freshness/throughput trade-off that needs to be sized to the specific product's requirements.
> **Next question:** The product now needs sub-100ms write-to-searchable visibility for a real-time chat feature - what does achieving that cost, compared to the default refresh interval?

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| TF-IDF | Term Frequency-Inverse Document Frequency | Classical relevance scoring weighting term rarity across the corpus against frequency in a document |
| BM25 | Best Matching 25 | Modern default relevance function refining TF-IDF with term-frequency saturation and document-length normalization |

### Anti-patterns

- Using a database `LIKE '%term%'` wildcard scan as a substitute for a real inverted index - defeats index usage, degrades as the table grows.
- Treating a search index as the strongly-consistent system of record for data needing read-your-writes guarantees - see [Indexing Pipeline & Freshness](#indexing-pipeline--freshness).
- Defaulting to the shortest possible refresh interval without checking the actual freshness requirement - a real indexing-throughput cost, not a free correctness win.
- Diagnosing tail-latency problems with aggregate/average metrics instead of per-shard P99 - masks which specific shard is the actual outlier.

### Selection Matrix

See [Comparison / Selection Matrix](#comparison--selection-matrix) above for system-level trade-offs.
