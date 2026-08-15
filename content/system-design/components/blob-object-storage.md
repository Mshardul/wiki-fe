# Blob / Object Storage

## Prerequisites

- **[Consistent Hashing](../algorithms/consistent-hashing.md)** [Should read]
- **[Replication Strategies](../algorithms/replication-strategies.md)** [Should read]

---

## Table of Contents

- [TLDR](#tldr)
- [Core Mechanics](#core-mechanics)
- [Chunking & Multipart Upload](#chunking--multipart-upload)
- [Durability & Replication](#durability--replication)
- [Quick Decision Guide](#quick-decision-guide)
- [Comparison / Selection Matrix](#comparison--selection-matrix)
- [Consistency Model](#consistency-model)
- [Performance & Optimization](#performance--optimization)
- [Security & Access Control](#security--access-control)
- [Resilience & Failure Handling](#resilience--failure-handling)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

Object storage trades a filesystem's hierarchical directories and in-place edits for a flat key-value namespace of immutable binary objects, each fetched whole via a simple `PUT`/`GET`/`DELETE` API instead of byte-range file operations. That immutability is the core design decision: an object can't be partially modified, only replaced wholesale or versioned as a new object, which is exactly what makes it trivial to shard, replicate, and serve at durability numbers (S3's famous "11 nines") a general-purpose filesystem doesn't target. The trade-off a candidate must defend: no random-write support and no native directory semantics (folders are a UI convention over key prefixes, not a real structure) - this is a storage layer for write-once-read-many binary data, not a POSIX filesystem replacement.

---

## Core Mechanics

**Think of it as a giant, distributed key-value store where the value happens to be an arbitrary binary blob and the key is a string.** There's no tree of directories underneath - `photos/2024/vacation.jpg` is one opaque key containing literal slash characters that a UI layer renders as folder navigation; the storage engine itself has no concept of `photos/` as a real container.

Every object write is a full replacement: `PUT` a new value for a key, and the old value is either gone (if versioning is off) or retained as a prior version (if versioning is on) - there is no `PUT` operation that modifies bytes 1000-2000 of an existing object in place. This immutable-object model is what enables the rest of the architecture: since an object never changes after it's written, the system can freely replicate it, cache it anywhere, and serve reads from any replica without a coordination protocol to keep concurrent writers consistent - there's only ever one writer's worth of state to reconcile per key at a time.

Metadata (content-type, custom key-value tags, ACLs, storage class) is stored alongside the object in a separate metadata index, decoupled from the object bytes themselves - this is why listing a bucket or checking an object's size doesn't require reading the object's actual data off disk.

---

## Chunking & Multipart Upload

### Why Objects Are Chunked

Large objects (video files, backups, datasets) are split into fixed-size chunks (commonly 5MB-100MB per chunk) both for **upload parallelism** (upload 10 chunks concurrently instead of one giant sequential stream) and for **replication granularity** (a chunk is the unit of erasure coding / replication, not the whole object - see [Durability & Replication](#durability--replication)).

### Multipart Upload Mechanics

```
Client                                   Object Storage
  │── InitiateMultipartUpload ──────────────►│
  │◄──────────────── UploadId ───────────────│
  │
  │── UploadPart(1) ─────────────►│           │  (parallel, any order)
  │── UploadPart(2) ───────────────────►│      │
  │── UploadPart(3) ─────────────────────────►│
  │◄── ETag(1) ── ETag(2) ── ETag(3) ─────────│
  │
  │── CompleteMultipartUpload([1,2,3]) ──────►│
  │◄──────────── 200 OK (object now visible) ─│
```

1. Client calls `InitiateMultipartUpload`, receives an `UploadId`.
2. Client uploads each chunk independently via `UploadPart(UploadId, partNumber, bytes)`, in any order, potentially in parallel across multiple connections. Each part upload returns an `ETag` (a checksum of that part).
3. Client calls `CompleteMultipartUpload(UploadId, [partNumber → ETag, ...])`. The storage service verifies every part's checksum, assembles them in `partNumber` order, and the object becomes visible atomically - no partial object is ever readable mid-upload.
4. If the client abandons the process, an `AbortMultipartUpload` (or a lifecycle-policy timeout) releases the uploaded-but-incomplete parts.

⚠️ **Gotcha** - abandoned multipart uploads that are never explicitly aborted silently consume storage (and cost) indefinitely without appearing in a normal object listing. Production systems set a lifecycle rule to auto-abort incomplete multipart uploads after N days - a common real cost leak in unmanaged buckets.

### Resumability

Because each part is uploaded and acknowledged independently, a failed upload can resume from the last successfully-acknowledged part rather than restarting the entire object - critical for large files over unreliable networks.

---

## Durability & Replication

### Erasure Coding vs Full Replication

Two mechanisms achieve durability, often combined:

- **Full replication** - store N complete copies of each chunk across independent failure domains (different racks/AZs). Simple, but storage overhead is `N×` (3× for triple replication).
- **Erasure coding** - split a chunk into `k` data fragments and compute `m` additional parity fragments (Reed-Solomon is the standard algorithm), such that any `k` of the `k+m` fragments reconstruct the original chunk. Tolerates losing any `m` fragments at `(k+m)/k` storage overhead - typically ~1.4-1.5× instead of 3×, at the cost of CPU to encode/decode and higher latency to reconstruct a fragment after a failure.

```
Original chunk (k=4 data fragments)     + m=2 parity fragments
┌────┬────┬────┬────┐                   ┌────┬────┐
│ D1 │ D2 │ D3 │ D4 │                    │ P1 │ P2 │
└────┴────┴────┴────┘                   └────┴────┘
        any 4 of these 6 fragments reconstruct the original
        (survives losing any 2 - e.g. D2 and P1 both lost, still recoverable)
```

🧠 **Thought Process** - the real design question isn't "replication or erasure coding" but where the line sits: hot, frequently-accessed data favors full replication (fast reads, no reconstruction cost), while cold archival data favors erasure coding (the storage savings compound over petabytes, and reconstruction latency rarely matters for data accessed once a year). This is exactly why storage classes (see [Comparison / Selection Matrix](#comparison--selection-matrix)) exist as a first-class concept.

### Failure Domains

Chunks/replicas are placed to survive correlated failures - not just "3 copies" but 3 copies in 3 different racks (surviving a rack power failure) or 3 different availability zones (surviving a full datacenter outage). Placement logic explicitly avoids putting two copies of the same chunk behind the same top-of-rack switch or power circuit.

---

## Quick Decision Guide

### When to Use Object Storage

Binary/unstructured data accessed as whole objects: images, videos, backups, logs, data lake files, static website assets, ML training datasets. The workload is read-heavy or write-once, and objects are fetched in full (or via byte-range for streaming), never edited in place.

### When NOT to Use Object Storage

- **Random in-place writes to small regions of a file** - a database needing to update one row's bytes needs a block/file store, not object storage's replace-the-whole-object model.
- **Low-latency small-object access at extreme request rates** (sub-millisecond, millions of ops/sec on tiny values) - a key-value store or cache fits better; object storage's per-request overhead (HTTP-based API, metadata lookup) is higher than a purpose-built KV store.
- **POSIX filesystem semantics required** (a legacy app expecting directories, file locks, append-in-place) - see **[Distributed File System](./distributed-file-system.md)** instead.

### Which Storage Class Fits the Access Pattern

Storage classes trade retrieval latency/cost for storage cost, at the same durability. The decision is driven entirely by **how often** and **how fast** the data needs to be read - not by object size or type.

---

## Comparison / Selection Matrix

| Storage Class | Retrieval latency | Storage cost | Use case |
| --- | --- | --- | --- |
| Standard (hot) | Milliseconds | Highest | Actively-served content, frequent reads |
| Infrequent Access | Milliseconds | Lower, but per-retrieval fee | Backups accessed monthly, DR copies |
| Archive (e.g. Glacier) | Minutes to hours | Lowest | Compliance retention, cold logs rarely read |

**Pick it when:** the crossover point is read frequency, not data age directly - a 5-year-old dataset still queried daily belongs in Standard; a week-old backup nobody has touched belongs in Infrequent Access already. Getting this wrong in either direction is a real cost lever: storing hot data in Archive class means paying a retrieval fee (and waiting hours) on every read; storing genuinely cold data in Standard means paying the highest per-GB rate for data nobody's reading.

---

## Consistency Model

Modern object stores (S3 since Dec 2020, GCS) provide **strong read-after-write consistency** for both new object PUTs and overwrites/deletes - a `GET` immediately after a successful `PUT` is guaranteed to return the new data, and a `LIST` immediately reflects the write. This wasn't always true: S3's original model was eventually-consistent for overwrites, and older-generation object stores (and self-hosted alternatives) may still be - always verify per-provider rather than assuming strong consistency by default in an interview answer.

⚠️ **Warning / Gotcha** - strong consistency for object *existence and content* doesn't imply strong consistency for object *listing under high write concurrency* on every implementation - some systems still have brief propagation delay specifically for `LIST` operations against a prefix under heavy concurrent writes. State the specific guarantee you're relying on rather than "it's consistent" as a blanket claim.

---

## Performance & Optimization

### Byte-Range Requests

Clients can request a specific byte range (`Range: bytes=0-1048575`) instead of downloading a full object - this is how video streaming seeks to a timestamp and how large-file downloads are parallelized across multiple concurrent range requests to the same object.

### Key Naming and Partition Hotspots

Object stores historically partitioned by key prefix (lexicographic key ranges mapped to storage partitions). Sequential key patterns - timestamps, auto-incrementing IDs - concentrate all writes into whichever partition currently owns that lexicographic range, creating a **hot partition** even though the overall request rate is well within the system's aggregate capacity. The classic fix: prefix keys with a hash or reversed-timestamp segment (`a3f9-2024-01-15-...` instead of `2024-01-15-...`) to spread writes across the keyspace. Modern implementations (S3 since mid-2018) auto-partition based on request rate rather than pure lexicographic ranges, reducing but not eliminating the need to think about this for extreme-throughput workloads.

### CDN Fronting

Object storage is commonly placed behind a CDN for read-heavy public content (see **[CDN](./cdn.md)**) - the origin serves the object once per edge cache miss, and subsequent reads for the same key are served from edge, cutting both latency and origin load.

---

## Security & Access Control

Access control operates at two independent layers: **bucket/object policies** (IAM-style rules: which principals can `GET`/`PUT`/`DELETE` on which key prefixes) and **pre-signed URLs** (a time-limited, cryptographically-signed URL granting temporary access to a specific object without requiring the requester to have any IAM credentials at all - the standard mechanism for letting an end user's browser upload/download directly to/from object storage without proxying bytes through the application server).

Encryption at rest is typically server-side (the storage provider encrypts on write, decrypts on read, transparent to the client) or client-side (the application encrypts before upload, storage never sees plaintext) - server-side is the default for most workloads; client-side is chosen when the storage provider itself must not be able to read the data.

---

## Resilience & Failure Handling

A single chunk-server failure is masked transparently by replication/erasure coding (see [Durability & Replication](#durability--replication)) - reads are served from a surviving replica or reconstructed from parity fragments, and a background repair process re-replicates the lost chunk's data to restore full redundancy, all without the failure being visible to a client. The metadata index (mapping keys to chunk locations) is itself typically a strongly-consistent distributed system (see **[Consensus (Raft / Paxos)](../algorithms/consensus-raft-paxos.md)**) - its availability, not the bulk data plane, is usually the actual bottleneck during a large-scale failure, since every read/write needs a metadata lookup before touching data.

---

## Production Failure Modes & Gotchas

### Small-Object Overhead

Object storage's per-request overhead (metadata lookup, HTTP request/response framing) is roughly constant regardless of object size - so a workload storing millions of tiny objects (a few KB each) pays that fixed overhead per object far more often than a workload storing the same total bytes as fewer, larger objects. At real scale this shows up as a throughput ceiling driven by request rate, not bandwidth - the fix is batching small items into fewer larger objects (e.g. a log shipper batching many small log lines into one rolled-up object) rather than trying to raise the request-rate limit.

### Eventual Consistency Assumptions Baked Into Old Code

Application code written against an older object store's eventually-consistent guarantees (retry-with-backoff after a write, "list may not show a just-written object") is often left in place even after the underlying store moves to strong consistency - harmless but wasted latency, and a trap if a *different* provider with genuinely weaker guarantees is swapped in later without re-auditing that assumption.

### Common Misconceptions

- "Folders are a real structure in object storage" - no, `a/b/c.txt` is one flat key; folder-style navigation in a UI is purely a client-side convention of splitting on `/`, not a filesystem-level container the storage engine understands.
- "Object storage supports partial in-place updates like a filesystem" - no, every write replaces the object wholesale (or creates a new version); there is no operation that modifies a byte range of an existing object without rewriting it entirely.
- "More replicas always means better durability" - past the failure-domain diversity that actually matters (independent racks/AZs), adding more copies in the *same* failure domain doesn't meaningfully improve durability against the failure modes that matter (rack power loss, AZ outage) - placement diversity matters more than raw copy count.

---

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** Why can't you just append to or partially modify an object in object storage the way you would a file?
> **Ideal answer:** The immutable-object model is the foundation the rest of the system is built on - because an object never changes in place, any replica can serve any read without coordinating with other replicas about "which version is current mid-write," which is what makes trivial replication and caching possible. Supporting in-place partial writes would require exactly the kind of write-coordination protocol object storage is designed to avoid.
> **Common trap:** Treating this as an arbitrary API limitation rather than connecting it to the specific architectural payoff (coordination-free replication and caching) it buys.
> **Next question:** Given that, how does multipart upload let you build a large object without violating "objects are written atomically"?

> 🎯 **Interview Lens**
> **Q:** A data-lake pipeline is writing millions of small (2KB) JSON event files per hour and hitting a throughput ceiling well below the storage system's advertised bandwidth. What's happening and how do you fix it?
> **Ideal answer:** Small-object overhead - the bottleneck is request rate (each object pays a roughly-fixed per-request cost for metadata lookup and HTTP overhead), not bandwidth, since 2KB objects are almost entirely overhead. The fix is batching: buffer events and write fewer, larger objects (e.g. one rolled-up file per minute per partition) instead of one object per event.
> **Common trap:** Trying to solve this by requesting a rate-limit increase from the provider - that treats the symptom, not the actual per-request-overhead cause, and the ceiling will just reappear at a higher volume.
> **Next question:** What's the trade-off this batching approach introduces for downstream consumers that need near-real-time access to individual events?

> 🎯 **Interview Lens**
> **Q:** How would you design key naming for a workload writing time-series data (one object per sensor reading, keyed by timestamp) to avoid a hot partition?
> **Ideal answer:** Prefix the key with a hash or a reversed/bucketed component before the timestamp (e.g. `<hash-of-sensor-id>/2024-01-15T...`) so writes distribute across the keyspace instead of all landing in whatever partition currently owns the lexicographically-latest timestamp range. On providers that auto-partition by request rate rather than pure lexicographic range, this matters less but is still good practice for extreme-throughput cases.
> **Common trap:** Assuming this is purely a legacy concern with no modern relevance - some providers still partition by key range, and even auto-partitioning systems benefit from avoiding a single hot prefix at high enough throughput.
> **Next question:** How does this same hot-partition problem show up differently in a sharded database versus object storage?

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| ACL | Access Control List | Per-object/bucket permission rules governing read/write access |
| DR | Disaster Recovery | Backup/failover strategy for surviving a large-scale outage |

### Anti-patterns

- Treating object storage as a POSIX filesystem replacement (expecting directory listing performance, file locks, or in-place edits) - fix by using a real distributed file system for that workload instead, see **[Distributed File System](./distributed-file-system.md)**.
- Leaving abandoned multipart uploads un-aborted - fix with a lifecycle policy auto-aborting incomplete uploads after N days.
- Storing millions of tiny objects without batching, then hitting a request-rate ceiling - fix by batching into fewer, larger objects.
- Sequential/timestamp-prefixed keys on a lexicographically-partitioned store causing write hotspots - fix by hash-prefixing keys.

### Selection Matrix

See [Comparison / Selection Matrix](#comparison--selection-matrix) above for storage-class trade-offs.
