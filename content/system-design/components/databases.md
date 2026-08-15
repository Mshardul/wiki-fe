# Databases

## Prerequisites

- **[ACID vs BASE](../algorithms/acid-vs-base.md)** [Must read]
- **[Replication Strategies](../algorithms/replication-strategies.md)** [Should read]

---

## Table of Contents

- [TLDR](#tldr)
- [What It Is](#what-it-is)
- [SQL vs NoSQL - The Real Decision](#sql-vs-nosql--the-real-decision)
- [Storage Engine Internals](#storage-engine-internals)
- [Indexing](#indexing)
- [NoSQL Data Models](#nosql-data-models)
- [Transactions & Isolation Levels](#transactions--isolation-levels)
- [Quick Decision Guide](#quick-decision-guide)
- [Comparison / Selection Matrix](#comparison--selection-matrix)
- [Security & Hardening](#security--hardening)
- [Resilience & Failure Handling](#resilience--failure-handling)
- [Observability & Debugging](#observability--debugging)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

A database is the system of record - durable, queryable storage that survives process restarts and enforces the invariants the application relies on. The core decision isn't "SQL or NoSQL" as a label, it's which guarantees the workload actually needs: strict schema and multi-row transactions point to relational; flexible schema, horizontal write scale, or a specific access pattern (key-value, wide-column, document) point to a NoSQL model built around that pattern. PostgreSQL and MySQL dominate relational workloads; DynamoDB and Cassandra dominate massive-scale key-value/wide-column workloads. The failure mode that shows up past a few thousand QPS on a single relational primary isn't usually storage capacity - it's write throughput and connection contention, which is what pushes systems toward read replicas, sharding, or a NoSQL model with distributed writes.

---

## What It Is

**Analogy:** a database is a filing cabinet with a very strict clerk (relational, ACID) versus a warehouse of labeled bins with no clerk enforcing anything about what goes where (NoSQL, schema-flexible). The clerk guarantees every folder is correctly cross-referenced and no two people can edit the same folder at once; the warehouse trades that guarantee for the ability to add bins and throughput without waiting for the clerk.

**Mental model:** every database, regardless of model, is answering the same question - "how do I persist state durably while making some subset of read/write/consistency/scale trade-offs explicit" - the SQL/NoSQL split is just the most visible axis of that trade-off, not the only one.

---

## SQL vs NoSQL - The Real Decision

**Interviewer TL;DR:** "SQL vs NoSQL" is a proxy for a deeper question - does this workload need multi-row ACID transactions and a fixed, enforced schema, or does it need horizontal write scale and a schema that can evolve without a migration? Answer that question first; the label follows.

**Relational (SQL):** data organized into tables with a fixed schema, related via foreign keys, queried via SQL. ACID transactions (see [ACID vs BASE](../algorithms/acid-vs-base.md)) are a first-class guarantee - multi-row, multi-table updates either fully commit or fully roll back. The schema is enforced at write time: an insert violating a constraint (type, foreign key, uniqueness) is rejected, not silently accepted.

**NoSQL:** an umbrella term for databases that relax one or more of the relational guarantees - typically the fixed schema, multi-row transactions, or both - in exchange for horizontal scalability or a data model matching a specific access pattern more directly than tables ever could (see [NoSQL Data Models](#nosql-data-models)).

> ⚖️ **Decision Framework**
> Choose relational when the data has genuine relational structure (orders reference customers reference addresses) and the application needs to enforce that structure's integrity at the database level - not re-implement foreign-key checking in application code. Choose NoSQL when the access pattern is dominated by a single, known query shape (fetch by key, append to a time-series, traverse a graph) and forcing that pattern into normalized relational tables would mean expensive joins on every read, or when write throughput needs to scale past what a single relational primary can sustain without heavy sharding investment.
>
> **Cost angle:** managed relational (RDS, Cloud SQL) and managed NoSQL (DynamoDB, Cosmos DB) both abstract operational cost, but relational's vertical-scaling ceiling means cost grows step-wise with instance size, while NoSQL's horizontal model means cost grows closer to linearly with load - relevant when traffic projections are uncertain and cost predictability matters.

The common failure mode: treating this as a permanent, system-wide choice rather than a per-workload one. A single application routinely uses relational for its transactional core (orders, payments, inventory) and NoSQL for a specific hot path (session state, activity feed, product search index) - see [Quick Decision Guide](#quick-decision-guide).

---

## Storage Engine Internals

**Interviewer TL;DR:** Almost every database's storage engine is built on one of two data structures - B-trees or LSM-trees - and the choice determines whether the engine is optimized for reads or for write throughput.

**B-tree (PostgreSQL, MySQL InnoDB, most relational engines):** data stored in a balanced tree of fixed-size pages on disk, kept sorted, updated in place. A write locates the correct page and modifies it directly. Reads are fast and predictable (`O(log n)` page lookups); writes require locating and rewriting the page in place, which costs random I/O on spinning disks and, on SSDs, contributes to write amplification (see [Common Misapplications & Gotchas](#common-misapplications--gotchas)).

**LSM-tree (Log-Structured Merge-tree - Cassandra, RocksDB, LevelDB, and most write-optimized NoSQL engines):** writes go to an in-memory structure (a memtable) and an append-only write-ahead log first, both fast, sequential operations. When the memtable fills, it's flushed to disk as an immutable sorted file (an SSTable). Reads may need to check the memtable and multiple SSTables, merging results - slower than a B-tree's single lookup unless mitigated (see [Indexing](#indexing)'s bloom filter note). A background **compaction** process periodically merges SSTables to bound how many files a read must check and reclaim space from overwritten/deleted keys.

```
LSM-tree write path:
  Write → WAL (durability) → Memtable (in-memory, sorted)
                                  │ (fills up)
                                  ▼
                          Flush to SSTable (immutable, on disk)
                                  │
                    Background compaction merges SSTables over time
```

> ⚖️ **Decision Framework**
> B-tree engines suit read-heavy or balanced workloads where read latency predictability matters and write volume is moderate. LSM-tree engines suit write-heavy workloads (logging, time-series, event ingestion) where sequential-write throughput matters more than single-read latency, and where the read path can tolerate checking multiple files or be accelerated with bloom filters and caching.

> 🧠 **Thought Process**
> The B-tree vs LSM-tree choice is really "where do you want to pay the cost of keeping data sorted and mergeable" - a B-tree pays it on every write (rewrite the page in place, now); an LSM-tree defers it to a background compaction process (pay it later, off the write's critical path). This is the same "coordination now vs reconciliation later" pattern that shows up in [ACID vs BASE](../algorithms/acid-vs-base.md), applied to disk I/O instead of distributed consensus.

---

## Indexing

An index is a separate, ordered data structure pointing back to full rows/documents, trading write cost and storage for read speed on a specific query pattern.

**B-tree index (default in most relational engines):** the standard general-purpose index - efficient for equality lookups, range scans, and sorted retrieval (`ORDER BY` on the indexed column). The default choice absent a specific reason otherwise.

**Hash index:** O(1) equality lookups, no range scan support at all. Rarely the default because the range-scan capability B-tree gives up is usually worth more than the marginal speed gain on pure equality lookups.

**Bloom filter (used inside LSM-tree engines, not a queryable index itself):** a probabilistic structure answering "might this SSTable contain this key?" with no false negatives but a tunable false-positive rate. Lets an LSM-tree read skip SSTables that provably don't contain the key, without eliminating the need to check ones that might. See [Bloom Filter](./bloom-filter.md) <!-- link: bloom-filter.md --> for the full mechanics.

**Composite index:** an index on multiple columns together, ordered by column order in the index definition - a query filtering on the first column (or first N columns as a prefix) can use it, but a query filtering only on the second column cannot, because the index isn't sorted by that column independently.

> ⚠️ **Warning / Gotcha**
> Every index accelerates specific reads but adds write cost (every insert/update must also update every index on the table) and storage. A table with ten unused indexes pays that write cost on every single write with zero read benefit - "just add an index" is not a free lever; each one is a genuine trade-off that needs a query pattern justifying it.

---

## NoSQL Data Models

**Interviewer TL;DR:** NoSQL isn't one model - it's four distinct data models, each optimized for a specific access pattern, and choosing "NoSQL" without picking one of these is an incomplete decision.

| Model | Access pattern optimized for | Examples |
| --- | --- | --- |
| Key-value | Fetch/write by a single key, no query on value contents | DynamoDB, Redis |
| Document | Fetch by key or query on nested fields; schema varies per document | MongoDB, DynamoDB (with GSIs) |
| Wide-column | Very high write throughput, queries by row key + column family | Cassandra, HBase, BigTable |
| Graph | Traversal-heavy queries (friends-of-friends, shortest path) | Neo4j, Amazon Neptune |

**Key-value:** the simplest model - opaque values retrieved by key, no query language over the value's internal structure. Fastest possible lookups when the access pattern is genuinely "give me the value for this key," nothing more.

**Document:** values are structured documents (typically JSON-like) queryable on nested fields, without a rigid schema enforced across all documents in a collection. Suits data that's naturally document-shaped (a user profile, a product listing) where different documents may legitimately have different optional fields.

**Wide-column:** rows identified by a key, with columns grouped into families that can vary per row - optimized for extremely high write throughput via an LSM-tree storage engine (see [Storage Engine Internals](#storage-engine-internals)) and queries that specify the row key. Cassandra's write path is designed to accept writes at near-disk-sequential speed specifically for this reason.

**Graph:** nodes and edges as first-class citizens, with traversal (not join) as the primary query operation - a multi-hop "friends of friends who like X" query that would require several expensive joins in a relational model is a single traversal in a graph model.

> ⚖️ **Decision Framework**
> Match the model to the dominant access pattern, not the data's conceptual shape - a "document-shaped" entity (a user profile) still belongs in a relational table if the application does heavy multi-entity joins against it (orders, permissions, billing) rather than mostly fetching the profile alone. The model choice should follow the query pattern the system runs most, at the highest volume, not how a human would draw the data on a whiteboard.

---

## Transactions & Isolation Levels

**Interviewer TL;DR:** Isolation level is the tunable trade-off between transaction correctness under concurrency and throughput - higher isolation prevents more anomalies but costs more locking/coordination.

Concurrent transactions touching overlapping data can produce anomalies (a dirty read, a non-repeatable read, a phantom read) if left completely uncoordinated. SQL defines four standard isolation levels, each preventing a strict superset of the prior level's anomalies:

| Level | Prevents | Allows |
| --- | --- | --- |
| Read Uncommitted | Nothing | Dirty reads, non-repeatable reads, phantom reads |
| Read Committed | Dirty reads | Non-repeatable reads, phantom reads |
| Repeatable Read | Dirty reads, non-repeatable reads | Phantom reads (mostly - implementation-dependent) |
| Serializable | All of the above | Nothing - transactions behave as if fully sequential |

**Read Committed** is the practical default for most relational databases (PostgreSQL's default) - it prevents reading another transaction's uncommitted changes but allows the same query re-run within a transaction to see different results if another transaction committed in between.

**Serializable** gives the strongest guarantee - transactions behave exactly as if run one at a time in some order - at the highest coordination cost, typically implemented via extensive locking or optimistic conflict detection that aborts and retries transactions that would have violated serializability.

> ⚖️ **Decision Framework**
> Default to Read Committed unless a specific anomaly (non-repeatable reads causing a real bug, e.g. a total computed from two reads of the same row within one transaction disagreeing with itself) justifies the throughput cost of a stricter level. Reach for Serializable only for genuinely correctness-critical multi-step transactions (financial transfers, inventory reservation) where any anomaly is unacceptable - not as a default posture, since it measurably reduces achievable concurrency.

This is the ACID "I" (Isolation) made concrete and tunable - see [ACID vs BASE](../algorithms/acid-vs-base.md) for how it fits into the full transaction guarantee.

---

## Quick Decision Guide

| Need | Choice |
| --- | --- |
| Multi-row transactions, enforced schema, relational integrity | Relational (PostgreSQL, MySQL) |
| Simple key-based lookups at massive scale | Key-value (DynamoDB, Redis) |
| Flexible/nested schema, moderate scale, query on document fields | Document (MongoDB) |
| Extremely high write throughput, time-series/event data | Wide-column (Cassandra) |
| Traversal-heavy queries (social graphs, recommendations) | Graph (Neo4j, Neptune) |
| Read-heavy relational workload outgrowing one primary | Relational + read replicas |
| Write-heavy relational workload outgrowing one primary | Relational + sharding, or migrate the hot path to NoSQL |

---

## Comparison / Selection Matrix

| Dimension | Relational | Key-Value | Document | Wide-Column | Graph |
| --- | --- | --- | --- | --- | --- |
| Schema | Fixed, enforced | Schemaless | Flexible per-document | Flexible per-row | Flexible (property graph) |
| Multi-row transactions | Yes (ACID) | Rare/limited | Limited (varies) | Rare | Varies |
| Horizontal write scale | Hard (needs sharding) | Native | Native (varies) | Native (best-in-class) | Hard |
| Best query pattern | Joins, aggregates | Fetch by key | Nested-field queries | Row-key range scans | Multi-hop traversal |
| Storage engine (typical) | B-tree | LSM-tree or B-tree | Varies | LSM-tree | Varies |

---

## Security & Hardening

**Interviewer TL;DR:** Three layers cover most of what gets probed - encrypt data at rest and in transit by default, never build queries by string concatenation, and grant the minimum privilege each connection actually needs.

**Encryption at rest** - the underlying storage (disk, snapshot, backup) is encrypted so a stolen disk or leaked backup file is unreadable without the key. Most managed databases (RDS, Cloud SQL) enable this by default or with a single flag; self-hosted requires explicit filesystem or database-level encryption (TDE - Transparent Data Encryption).

**Encryption in transit** - TLS between the application and the database prevents credentials and query results from being readable to anyone on the network path. Increasingly a default-on requirement, not an opt-in, for anything handling sensitive data.

**SQL injection** - the classic vulnerability from building queries via string concatenation with unsanitized user input, letting an attacker inject arbitrary SQL. **Parameterized queries / prepared statements** (binding user input as typed parameters rather than interpolating it into the query string) close this off structurally - the query structure is fixed before user input is ever attached, so injected SQL syntax is treated as literal data, not executable code.

**Least-privilege access** - application connections should hold only the permissions their queries actually need (a read-only reporting service shouldn't hold `DROP TABLE` privilege), and per-service database credentials (not one shared superuser credential across every service) bound the blast radius of a single compromised service.

> ⚠️ **Gotcha:** An ORM does not automatically make queries injection-safe - most ORMs parameterize by default for their standard query builder methods, but a raw-SQL escape hatch (common for complex queries the ORM can't express) reintroduces the same string-concatenation risk if the developer isn't careful to parameterize manually there too.

---

## Resilience & Failure Handling

A database's failure handling is largely the replication and failover mechanics covered in depth in [Replication Strategies](../algorithms/replication-strategies.md) - synchronous vs asynchronous trade-offs, leader election, split-brain risk - applied specifically to the storage layer. What's specific to databases beyond general replication:

**Write-Ahead Log (WAL) recovery:** on crash, a database replays its WAL to reconstruct any committed-but-not-yet-flushed-to-disk state, guaranteeing the Durability half of ACID survives a crash even though writes aren't synced to the main data files on every single commit (which would be prohibitively slow).

**Backup vs replica distinction:** see [Replication Strategies → Often Confused With](../algorithms/replication-strategies.md#often-confused-with) - a live replica does not substitute for point-in-time backups, since a bad write (application bug, bad migration, malicious `DELETE`) replicates to every live replica within the normal replication lag window.

**Connection pool exhaustion:** a database has a hard ceiling on concurrent connections; every application instance opening its own unbounded connection pool can collectively exceed that ceiling long before query load itself is the bottleneck - see [Production Failure Modes & Gotchas](#production-failure-modes--gotchas).

---

## Observability & Debugging

**Interviewer TL;DR:** Three signals catch most production database problems before they become an incident - slow query logs (what's actually slow), connection/pool saturation (is the database reachable at all), and replication lag (are replicas safe to read from right now).

**Slow query log + `EXPLAIN ANALYZE`** - the slow query log surfaces which queries are actually slow in production (not just in isolated testing); `EXPLAIN ANALYZE` (or the equivalent query planner tool) shows whether a specific query is hitting an index or falling back to a full table/collection scan, and where time is actually being spent within the query plan.

**Connection/pool metrics** - active vs max connections, and connection pool queue depth on the application side. The earliest signal of the [connection pool exhaustion](#production-failure-modes--gotchas) failure mode, visible before it manifests as generic query slowness.

**Replication lag** - see [Replication Strategies → Replication Lag](../algorithms/replication-strategies.md#replication-lag) for the full mechanics; the operational takeaway here is to expose it as a metric and route reads away from any replica whose lag exceeds an acceptable threshold, rather than discovering staleness from a user complaint.

**Lock wait time / blocking queries** - a query waiting on a lock held by another transaction shows up as slowness with a clean query plan - `EXPLAIN ANALYZE` alone won't reveal it. Most engines expose a lock-wait or blocking-queries view (PostgreSQL's `pg_locks`, MySQL's `INFORMATION_SCHEMA.INNODB_LOCK_WAITS`) specifically for this case.

---

## Production Failure Modes & Gotchas

**Connection pool exhaustion.** Each application instance typically maintains its own connection pool; with N instances each holding M connections, total connections = N × M, which can exceed the database's max-connections setting long before query throughput is actually the bottleneck. **Mitigation:** a connection pooler (PgBouncer for PostgreSQL, ProxySQL for MySQL) sitting between application instances and the database, multiplexing many application connections onto fewer actual database connections.

**Write amplification (B-tree/SSD).** A single logical row update can trigger multiple physical page rewrites (the page itself, index pages referencing it) - on SSDs this multiplies actual disk writes beyond the logical write volume, accelerating SSD wear and consuming more I/O bandwidth than the logical operation implies. LSM-tree engines have their own amplification cost in compaction, trading write-path amplification for background-process amplification instead.

**N+1 query pattern.** Fetching a list, then issuing one additional query per item to fetch related data (instead of a single join or batched `IN` query), turns what should be 2 queries into N+1 - a common ORM footgun that silently degrades to unacceptable latency as N grows. Detected via query-count spikes correlating with list-endpoint traffic, not via any single slow query in isolation.

**Long-running transactions blocking vacuum/compaction.** In PostgreSQL specifically, a long-running transaction prevents `VACUUM` from reclaiming space from rows it made obsolete (MVCC's old row versions), causing unbounded table bloat until the transaction commits or is killed. The equivalent in LSM-tree engines is compaction falling behind write volume, causing read amplification (more SSTables to check per read) to grow unbounded.

**Missing index on a foreign key.** Relational engines don't automatically index foreign key columns - a join or cascade delete on an unindexed foreign key forces a full table scan on the referencing side, invisible until the referencing table grows large enough to make it slow.

### Common Misconceptions

**"NoSQL means no schema, ever."** Most NoSQL databases still have an implicit schema enforced by the application, or a semi-enforced schema (DynamoDB's key schema, MongoDB's optional schema validation) - "schemaless" means the database doesn't enforce it centrally, not that no schema exists in practice.

**"Sharding and replication are the same scaling lever."** They solve different problems - see [Replication Strategies → Often Confused With](../algorithms/replication-strategies.md#often-confused-with): replication scales reads and availability via copies of the same data; sharding scales writes and storage via disjoint data subsets. A write-throughput bottleneck isn't fixed by adding read replicas.

**"A NoSQL database is always faster than a relational one."** Neither model is universally faster - a NoSQL key-value store is faster *for key-based lookups specifically*; the same NoSQL database running a multi-entity join-shaped query (which it likely can't do natively at all) is often far slower or requires denormalizing data at write time to compensate.

---

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** How do you decide between a relational database and a NoSQL database for a new service?
> **Ideal answer:** Start from the access pattern and correctness requirements, not the label - does the data have genuine relational structure requiring multi-row transactional integrity (SQL), or is there one dominant, known query shape (key lookup, document fetch, wide-column write, graph traversal) that a specific NoSQL model directly optimizes for? Most real systems use both: relational for the transactional core, NoSQL for a specific high-volume hot path.
> **Common trap:** Treating it as a single system-wide choice, or choosing NoSQL purely for perceived scalability without a concrete query pattern that justifies giving up multi-row transactions and a fixed schema.
> **Next question:** "Your relational primary is hitting write throughput limits. Do you add NoSQL, or do something else first?" → Sharding the existing relational database (or moving just the hot write path to a purpose-built NoSQL store) are both valid, but the first question is whether the bottleneck is genuinely write throughput vs connection pool exhaustion vs missing indexes - profile before architecting.

> 🎯 **Interview Lens**
> **Q:** Explain the difference between a B-tree and an LSM-tree storage engine, and when you'd pick each.
> **Ideal answer:** A B-tree updates data in place, giving fast, predictable reads at the cost of random-I/O writes; an LSM-tree appends writes sequentially to an in-memory structure and flushes to immutable sorted files, giving very fast sequential writes at the cost of reads potentially checking multiple files (mitigated by bloom filters and compaction). Pick B-tree for read-heavy or balanced workloads; LSM-tree for write-heavy ingestion (logging, time-series, event streams).
> **Common trap:** Describing only one engine's mechanics without connecting it to the actual read/write trade-off it implies - the mechanism matters because of the trade-off, not as trivia.
> **Next question:** "An LSM-tree engine's compaction is falling behind write volume. What happens, and how do you know?" → Read amplification grows (more SSTables per read before compaction merges them), and read latency degrades even though writes stay fast - visible via a growing SSTable count metric and rising read p99, not via any write-side symptom.

> 🎯 **Interview Lens**
> **Q:** A service's database queries are getting slower under load, but CPU and query plans look fine. What do you check?
> **Ideal answer:** Connection pool exhaustion first - if application instances collectively hold more connections than the database's max-connections setting supports, queries queue waiting for a connection slot, which looks like generic "slowness" rather than a specific slow query. Check active vs max connections before assuming it's a query optimization problem.
> **Common trap:** Immediately reaching for query optimization (adding indexes, rewriting queries) when the bottleneck is actually connection-layer, not query-execution-layer.
> **Next question:** "You confirm it's connection exhaustion. What's the fix, and what's the trade-off?" → A connection pooler (PgBouncer/ProxySQL) multiplexing many app connections onto fewer real database connections - the trade-off is an added network hop and a new component that itself needs monitoring and can become its own bottleneck at extreme scale.

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| LSM-tree | Log-Structured Merge-tree | Write-optimized storage engine using sequential writes and background compaction |
| WAL | Write-Ahead Log | Durable log of writes applied before being reflected in the main data files |
| MVCC | Multi-Version Concurrency Control | Technique keeping multiple row versions to let readers avoid blocking writers |

### Anti-patterns

- **Unbounded per-instance connection pools** - collectively exceeds database max-connections long before query load is the bottleneck; use a connection pooler.
- **N+1 query pattern from an ORM** - one query per list item instead of a batched join/`IN` query; profile query count, not just query latency, per endpoint.
- **Choosing NoSQL for perceived scale without a concrete access pattern** - inherits schema flexibility and write scale but loses multi-row transactions and joins, often re-implemented badly in application code.
- **Treating a live replica as a backup** - see [Resilience & Failure Handling](#resilience--failure-handling).
- **Indexing every column "just in case"** - each index has a real write-cost tax with zero benefit if no query pattern uses it.
