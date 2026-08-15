# Design: URL Shortener

## Prerequisites

- **[Databases](../components/databases.md)** [Must read]
- **[Caching](../components/caching.md)** [Should read]
- **[Consistent Hashing](../algorithms/consistent-hashing.md)** [Should read]

## Table of Contents

- [TLDR](#tldr)
- [Requirements & Scope](#requirements--scope)
- [Capacity Estimation](#capacity-estimation)
- [High-Level Architecture](#high-level-architecture)
- [Short-Code Generation](#short-code-generation)
- [Data Model & Storage](#data-model--storage)
- [Redirect Path Performance](#redirect-path-performance)
- [Reliability & Fault Tolerance](#reliability--fault-tolerance)
- [Scalability & Performance](#scalability--performance)
- [Deep-Dive: Short-Code Generation at Scale](#deep-dive-short-code-generation-at-scale)
- [Observability](#observability)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Trade-off Summary](#trade-off-summary)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

## TLDR

A URL shortener maps a long URL to a short, unique code and redirects on lookup - the interesting engineering problem isn't the redirect, it's generating collision-free short codes at high write throughput without a shared bottleneck. The core architectural challenge of URL Shortener is decentralized unique-ID generation: any approach that requires a single global counter or synchronous coordination between write nodes reintroduces the exact bottleneck the system is trying to scale past.

## Requirements & Scope

**Functional requirements:**
- `POST /shorten(long_url) → short_code`, optionally with a custom alias and expiration.
- `GET /{short_code} → 3xx redirect` to the original long URL.
- Optional: click analytics, per-link expiration, user-owned link management.

**Non-functional requirements:**
- **Read-heavy at extreme skew** - redirects vastly outnumber creations (often 100:1 or higher), and traffic is highly non-uniform (a handful of links go viral, most get near-zero traffic). Read path must be optimized independently from the write path.
- **Low redirect latency** - a short URL is often embedded in something time-sensitive (SMS, ads, social posts); redirect latency should be in the tens of milliseconds, favoring aggressive caching over strict freshness.
- **Availability over strong consistency for redirects**: prioritize AP - a short link resolving from a slightly stale cache is fine; a short link failing to resolve at all is a customer-visible outage. Once written, a mapping is immutable (barring explicit deletion/expiration), which relaxes the consistency requirement further - there's no concurrent-write conflict to resolve.
- **Security**: short codes must not be sequentially guessable in a way that leaks creation volume or allows enumeration of other users' private links (relevant if links can be unlisted/private) - favor random or hashed codes over an exposed incrementing counter. Rate-limit the creation endpoint to prevent abuse (spam link generation, phishing-URL farming); validate/sanitize submitted URLs to reject `javascript:` and other unsafe schemes before storing.

**Out of scope:** malicious-URL detection/blocklisting (treated as a separate downstream service); full analytics pipeline beyond basic click counts.

## Capacity Estimation

**Users:** 100M long URLs shortened per month · **Read/Write ratio:** 100:1 (redirects dominate) · **Peak QPS:** writes ~40/sec average, ~150/sec peak; reads ~4K/sec average, ~15K/sec peak · **Storage:** 100M new URLs/month × ~500 bytes/record (long URL + short code + metadata) ≈ 50GB/month, ~600GB/year retained · **Bandwidth:** redirect responses are tiny (a few hundred bytes) - 15K QPS peak × ~500B ≈ 7.5MB/s, trivially low · **Key constraint:** read QPS and cache hit ratio, not storage or write throughput - at 100:1 read skew, the entire system's user-facing latency is determined by how well the hot subset of links is cached, not by the database's write capacity.

## High-Level Architecture

```
                     ┌──────────────┐
  Write path:        │ Shorten API  │──▶ Short-Code Generator ──▶ DB (short_code → long_url)
  POST /shorten       └──────────────┘

                     ┌──────────────┐         ┌───────┐        ┌────────┐
  Read path:  Client │ Redirect API │───miss──▶│ Cache │──miss──▶│   DB   │
  GET /{code}         └──────────────┘   hit ↑  └───────┘   hit ↑ └────────┘
                             │                                       
                             └──────────── 301/302 redirect ─────────
```

Read path (sequence view):

```
Client → Redirect API → Cache (short_code lookup)
  Cache HIT  → return long_url → 301/302 redirect to client
  Cache MISS → DB lookup → SET into cache → return long_url → redirect
```

## Short-Code Generation

Three broad approaches, each with a real trade-off:

1. **Hash-based** - `base62(md5(long_url))[:7]`, truncated. Deterministic (same URL always produces the same code, which can be a feature or a collision risk depending on intent), but truncating a hash reintroduces collision probability that must be checked against the DB before accepting - adds a read on every write.
2. **Random generation + collision check** - generate a random base62 string, check for existence, retry on collision. Simple, but collision probability rises as the keyspace fills, and every write pays a DB round-trip before it can be considered safe.
3. **Pre-generated key pool / distributed counter ranges** - a background service pre-generates and stores unused short codes (or hands out non-overlapping ID ranges to write nodes, e.g. via Zookeeper/etcd), so the write path just pops a ready-to-use code with no collision check needed. This is the approach that scales past the other two's per-write coordination cost.

> ⚖️ **Decision Framework**
> Hash-based and random-with-retry both pay a synchronous existence-check on the write path, which caps write throughput at the DB's read capacity for that check. Pre-generated key pools decouple code generation from the write request entirely - the trade-off is operational complexity (a key-generation service, key-pool exhaustion monitoring) for a write path that's O(1) with no DB read.

## Data Model & Storage

```
url_mappings
  short_code   VARCHAR(10)  PRIMARY KEY
  long_url     TEXT         NOT NULL
  created_at   TIMESTAMP
  expires_at   TIMESTAMP    NULL
  user_id      BIGINT       NULL (nullable for anonymous links)
  click_count  BIGINT       DEFAULT 0
```

A key-value store (DynamoDB, Cassandra) or a sharded relational store both work - the access pattern is pure key lookup (`short_code → long_url`), no joins, no range queries, which is exactly what a KV store is built for and avoids relational overhead this workload doesn't need. Sharding, if used, is by `short_code` (via [consistent hashing](../algorithms/consistent-hashing.md) or the KV store's native partitioning) so lookups route deterministically without a fan-out query.

`click_count` is a write-amplifying field if incremented synchronously on every redirect at 15K QPS peak - see [Production Failure Modes](#production-failure-modes--gotchas) for the fix.

## Redirect Path Performance

**301 (Permanent) vs 302 (Found/Temporary) redirect:**

> ⚖️ **Decision Framework**
> 301 tells browsers/CDNs the mapping is permanent, so they may cache it client-side indefinitely - fewer round-trips to your servers on repeat visits, but you lose the ability to track every click server-side and can't safely change the target later (some clients never re-check). 302 forces a check on every visit, giving accurate click analytics and the flexibility to update the target, at the cost of no client-side caching benefit. Most production shorteners default to 302 specifically to preserve click-tracking as a first-class product feature.

## Reliability & Fault Tolerance

- **Cache as the primary read shield** - given the 100:1 read skew, the cache absorbing the vast majority of redirect traffic is what keeps the DB's read load manageable; a cache outage should degrade to DB reads (higher latency), not fail redirects outright.
- **Short-code generator availability** - if using pre-generated key pools, the key-generation service becoming unavailable should not block writes immediately; write nodes hold a local buffer of unused codes so a transient generator outage doesn't stall the write path.
- **DB replication** - standard leader-follower replication for the mapping store; reads can be served from replicas given the relaxed consistency requirement (a mapping is immutable once written, so replica lag only matters in the brief window right after creation).

## Scalability & Performance

- **Read scaling**: horizontally scale cache nodes and DB read replicas independently of write capacity - the 100:1 skew means read infrastructure needs to be sized an order of magnitude past write infrastructure.
- **Write scaling**: pre-generated key pools decouple write throughput from any single coordination point; write nodes can be added horizontally as long as key-range allocation itself doesn't become the bottleneck (mitigated by handing out large ranges per node, not per-request).
- **Hot-link problem**: a single viral short link can dominate traffic to one cache/DB partition regardless of overall sharding - same mitigation pattern as any hot-key problem (see [Distributed Cache](./distributed-cache.md)'s hot key discussion): client-side/edge caching of the hottest links, or a CDN layer in front of the redirect API entirely.

## Deep-Dive: Short-Code Generation at Scale

The naive "auto-increment ID + base62-encode it" approach is the one candidates reach for first, and it's the one that breaks under real write concurrency: a single auto-increment counter is a single point of write serialization and a single point of failure, and the resulting codes are sequentially guessable (code `N+1` was created right after code `N`, leaking creation-rate information and enabling enumeration).

The production-grade fix is a **distributed key-generation service**: multiple key-generator nodes each claim a disjoint range of IDs (e.g. via a coordination service like Zookeeper handing out `[1M, 2M)`, `[2M, 3M)`, …), encode each ID in that range to base62 independently, and store pre-generated, unused codes in a fast key-value store ready to be popped. Write nodes pull from this pool with no synchronous coordination and no collision check needed, because uniqueness is guaranteed by the non-overlapping ranges upstream.

> 🧠 **Thought Process**
> The real interview signal here isn't "can you base62-encode a number" - it's recognizing that *any* scheme requiring a synchronous uniqueness check or a shared counter on the write path reintroduces a bottleneck the whole system was designed to avoid. The fix is always the same shape: move the coordination cost off the hot path and into a background process that hands out pre-verified, disjoint units of work.

## Observability

- **Cache hit ratio on the redirect path** - the single most important health metric given the read-skewed traffic; a drop signals either a cold cache (recent restart/rebalance) or a shift in traffic pattern (new viral link outside the previously-cached hot set).
- **Key-pool exhaustion rate** (if using pre-generated pools) - alert before the pool runs dry, not after write requests start blocking.
- **Redirect latency p50/p99** - p99 specifically, since a slow redirect is directly customer-visible (a user clicking a link from an ad or SMS).
- **404/expired-link rate** - a spike can indicate either normal expiration behavior at scale or a data-integrity bug in the mapping store.

## Production Failure Modes & Gotchas

- **Synchronous click-count increments at peak QPS** - incrementing `click_count` on every redirect as a synchronous DB write turns a cheap read-only redirect into a write-amplified hot path at 15K QPS peak. Fix: batch/async increments (buffer counts in memory or a queue, flush periodically) rather than a write per redirect.
- **Custom alias collisions with the generation pool** - if users can request custom short codes, that write path must check against both existing mappings *and* reserve that code out of the pre-generated pool (or the pool may later hand out a code that collides with a user-chosen one) - an easy edge case to miss.
- **Unbounded long_url length** - without a length cap and content validation on write, arbitrary large payloads or malicious schemes (`javascript:`, `data:`) can be stored and later served back to a browser as a redirect target.

### Common Misconceptions

- "A URL shortener is basically a database with a redirect" - the actual hard problem is collision-free code generation under high write concurrency without a shared bottleneck, not the redirect itself, which is a trivial lookup.
- "301 redirects are strictly better because they're faster" - 301's client-side caching improves repeat-visit latency but sacrifices server-side click tracking and the ability to change the target later; most production shorteners deliberately choose 302 to keep tracking.

## Trade-off Summary

| Decision | Options Considered | Choice | Why |
| --- | --- | --- | --- |
| Short-code generation | Hash-based, random+retry, pre-generated key pool | Pre-generated key pool | Removes the synchronous collision-check/coordination cost from the write path entirely; the other two cap write throughput at the DB's read capacity |
| Storage engine | Relational DB, key-value store | Key-value store | Access pattern is pure key lookup with no joins/ranges - a KV store fits natively and avoids unneeded relational overhead |
| Redirect status code | 301 (permanent), 302 (temporary) | 302 | Preserves server-side click analytics and the ability to update/expire targets; the small client-caching win from 301 isn't worth losing tracking |
| Consistency model | Strong, eventual | Eventual (AP) | Mappings are immutable once written, and redirect availability matters more to the user than millisecond-fresh consistency right after creation |
| Click counting | Synchronous DB increment, async/batched | Async/batched | A synchronous write on every redirect turns a cheap read into a write-amplified hot path at peak QPS |

## Interview Scenario Bank

> 🗣️ **First 30 seconds**
> "I'd clarify the read/write ratio and whether custom aliases or analytics are required, since those shape the design. Assuming standard read-heavy behavior with random short codes - the core challenge isn't the redirect, it's generating collision-free codes at write volume without a shared bottleneck like a single counter. I'll size the traffic, then build up from short-code generation through the read path."

> 🎯 **Interview Lens**
> **Q:** How do you generate short codes such that they're unique, without a database round-trip on every write?
> **Ideal answer:** A distributed key-generation service that pre-allocates disjoint ID ranges to write nodes (via a coordination service), encodes them to base62, and stores ready-to-use codes in a fast pool - the write path pops a pre-verified code with no synchronous collision check.
> **Common trap:** Proposing `hash(url)` truncated to N characters without addressing that truncation reintroduces collisions that then require a synchronous existence check anyway.
> **Next question:** What happens if two write nodes are both handed overlapping ID ranges due to a coordination-service bug - how would you detect and recover?

> 🎯 **Interview Lens**
> **Q:** Your redirect endpoint needs to handle 15K QPS at peak with tens-of-milliseconds latency. What's the architecture?
> **Ideal answer:** Cache-first read path (the 100:1 read/write skew means nearly all traffic should be absorbed by cache), DB only on cache miss, and click-count updates moved off the synchronous path entirely (batched/async) so the hot path stays a pure cached lookup.
> **Common trap:** Designing the redirect path around the database as the primary read source instead of treating cache-hit-ratio as the dominant latency lever.
> **Next question:** A single short link goes viral and now accounts for 30% of total redirect traffic - does your architecture handle that, and if not, what changes?

> 🎯 **Interview Lens**
> **Q:** Should short codes be sequential (auto-increment + encode) or random?
> **Ideal answer:** Sequential codes leak creation-rate information and are enumerable (guessing `code+1` reveals another user's link), which is a security concern for anything meant to be unlisted/private; random or range-allocated-then-shuffled codes avoid that at the cost of needing a generation/allocation mechanism instead of a trivial counter.
> **Common trap:** Treating this purely as a technical uniqueness question and missing the enumeration/security angle entirely.
> **Next question:** If a customer wants a custom, memorable alias, how does that interact with your uniqueness guarantees for the auto-generated pool?

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| KV | Key-Value (store) | Database optimized for lookup by key with no joins/range queries |
| QPS | Queries Per Second | Request throughput measure |
| AP | Availability + Partition tolerance | CAP-theorem stance prioritizing uptime over strict consistency |

### Anti-patterns

- A single auto-increment counter for short-code generation - creates a write bottleneck and produces sequentially guessable, enumerable codes; use a distributed pre-generated key pool instead.
- Synchronous click-count increment on the redirect hot path - turns a cheap cached read into a write-amplified request at peak QPS; batch/async the counter instead.
- Skipping URL validation on write - allows unsafe schemes (`javascript:`, `data:`) to be stored and later served as redirect targets; validate and sanitize on the write path.
