# Distributed File System

## Prerequisites

- **[Blob / Object Storage](./blob-object-storage.md)** [Should read]
- **[Consensus (Raft / Paxos)](../algorithms/consensus-raft-paxos.md)** [Should read]

---

## Table of Contents

- [TLDR](#tldr)
- [Core Mechanics](#core-mechanics)
- [Metadata Management](#metadata-management)
- [Fault Tolerance & Data Placement](#fault-tolerance--data-placement)
- [Quick Decision Guide](#quick-decision-guide)
- [Comparison / Selection Matrix](#comparison--selection-matrix)
- [Consistency & Locking](#consistency--locking)
- [Performance & Optimization](#performance--optimization)
- [Resilience & Failure Handling](#resilience--failure-handling)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

A distributed file system presents a single hierarchical namespace - real directories, file paths, byte-range reads/writes, often POSIX-like semantics - spread transparently across many machines, so applications keep working with familiar file operations while the data and its replication live on a cluster instead of one disk. The core design decision is splitting **metadata** (the directory tree, file-to-block mapping, permissions) from **data** (the actual file bytes, stored as large fixed-size blocks/chunks across many data nodes) - a single, usually strongly-consistent metadata service coordinates a large, horizontally-scaled data plane. The trade-off a candidate must defend: that metadata service is a structural bottleneck and, in older designs, a single point of failure - HDFS's original single NameNode is the canonical cautionary example - unlike [object storage](./blob-object-storage.md)'s flatter, more horizontally-scalable design that gave up POSIX semantics specifically to avoid this coupling.

---

## Core Mechanics

**Think of it as a real filesystem's directory tree and inode table, except the inode table lives on a dedicated metadata cluster and each file's actual bytes are chunked and scattered across a much larger pool of storage nodes.** A client asking to read `/data/logs/2024/jan.log` first resolves the path against the metadata service (which directory contains what, which chunks make up this file, which nodes hold those chunks), then talks directly to the relevant data nodes to fetch the bytes - the metadata service is on the path for every lookup but not for the actual byte transfer.

Files are split into large, fixed-size chunks (64MB-128MB in HDFS, comparable in GFS-derived designs) - large relative to a typical filesystem's 4KB block, a deliberate choice to keep per-chunk metadata overhead low relative to the metadata service's total tracked-chunk count, and to make sequential large-file reads (the dominant workload these systems are built for) efficient with fewer, larger network transfers instead of many small ones.

```
Client
  │  1. resolve path → chunk list + locations
  ▼
[Metadata Service]  ── directory tree, file → chunk mapping, chunk → node mapping
  │
  │  2. chunk locations returned
  ▼
Client ──────────────► [Data Node A] [Data Node B] [Data Node C]   (direct data transfer)
```

---

## Metadata Management

### What Metadata Tracks

The directory hierarchy (which files live in which directories), per-file attributes (size, permissions, modification time), and the file-to-chunk-to-node mapping (which chunks make up a file, and which data nodes currently hold each chunk's replicas).

### Why Metadata Doesn't Scale the Same Way as Data

Every file, regardless of size, contributes a roughly fixed amount of metadata (path entry, chunk list). A workload with millions of small files produces proportionally more metadata load (more directory entries, more chunk-mapping lookups) than the same total bytes stored as fewer, larger files - metadata service capacity is bound by file/chunk *count*, not stored *bytes*, which is exactly the opposite scaling axis from the data plane.

> ⚠️ **Warning / Gotcha** - this is why "just store everything in a distributed file system" is the wrong default for workloads dominated by small files (a data lake landing zone ingesting millions of tiny JSON files): the metadata service becomes the bottleneck long before the data nodes' aggregate storage or bandwidth does, regardless of how many data nodes are added.

### Single vs Federated Metadata Service

Early designs (GFS, original HDFS) used a **single active metadata node** holding the entire namespace in memory for fast lookups - simple, but a hard ceiling on namespace size (bounded by one machine's RAM) and a single point of failure without a hot-standby. Later designs **federate** metadata across multiple independent metadata services, each owning a disjoint subtree of the namespace (HDFS Federation), trading "one simple global namespace" for horizontal metadata scalability - closer in spirit to how [sharding](../algorithms/sharding-strategies.md) splits a dataset across nodes, applied to the metadata layer specifically.

```
Single metadata node:                Federated metadata services:

  [Metadata Node]                     [MDS 1]        [MDS 2]
   entire namespace                   /data/logs     /data/models
   in one machine's RAM               (subtree A)    (subtree B)

  Ceiling: one machine's RAM          Ceiling: RAM of ALL MDS nodes combined
  bounds total file/chunk count       - each MDS only holds its own subtree
```

> ⚖️ **Decision Framework**
> A single metadata node is simpler to operate and reason about (one source of truth, no cross-MDS routing) - correct default while the namespace comfortably fits one machine's memory. Federate only once namespace size (file/chunk count, not data volume) is the actual, measured bottleneck - federation trades that simplicity for a routing layer that must know which subtree lives on which MDS, and cross-subtree operations (a rename moving a file between two federated subtrees) become materially harder than a single-namespace rename.

---

## Fault Tolerance & Data Placement

Each chunk is replicated (commonly 3x) across data nodes chosen to survive correlated failures - not just 3 arbitrary nodes, but nodes spread across different racks so a single rack or top-of-rack switch failure doesn't take out every replica of a chunk simultaneously. This is the same failure-domain-diversity principle [Blob / Object Storage](./blob-object-storage.md#durability--replication) applies to erasure-coded chunks, applied here to full replication instead - full replication is standard for distributed file systems' typically larger, sequentially-read chunks, where erasure coding's reconstruction latency cost is a worse trade than for object storage's more varied access patterns.

> ⚖️ **Decision Framework**
> Full replication (3x storage overhead, instant reads from any replica with no reconstruction cost) is the default for hot, actively-processed chunks - exactly the access pattern distributed file systems target. Erasure coding (~1.4-1.5x overhead, CPU cost to reconstruct after a failure) only pays off once storage cost at scale outweighs the reconstruction-latency cost, which is why some deployments (HDFS's Erasure Coding mode) offer it as an opt-in for cold, infrequently-accessed data rather than the default - the same crossover logic [Blob / Object Storage](./blob-object-storage.md#erasure-coding-vs-full-replication) applies for its storage classes.

**Rack-aware placement (the common heuristic):** one replica on the writing client's local rack (fast write, no cross-rack hop for the first copy), a second replica on a different rack (survives a full rack failure), a third replica on the same rack as the second (balances network cost against failure-domain diversity - two full independent racks is enough to survive the realistic single-rack-failure case without paying for three fully independent racks' worth of cross-rack traffic).

```
Rack 1 (client's rack)      Rack 2                    Rack 3
┌──────────────────┐       ┌──────────────────┐
│ [Replica 1] ◄──── client writes here first
└──────────────────┘       │ [Replica 2]      │
                            │ [Replica 3]      │
                            └──────────────────┘
Rack 1 failure → Replica 1 lost, Replicas 2 & 3 (different rack) survive
Rack 2 failure → Replicas 2 & 3 lost, Replica 1 (different rack) survives
```

The metadata service continuously tracks each chunk's actual replica count against its target and triggers **re-replication** when a data node fails or a chunk drops below its target replica count - background, automatic, and invisible to clients issuing reads/writes during the repair.

---

## Quick Decision Guide

### When to Use a Distributed File System

Workloads that genuinely need a real hierarchical namespace, POSIX-like semantics (or close to it), and large sequential file access - the canonical case is a big-data processing pipeline (Hadoop MapReduce/Spark reading large input files, appending to log files, organizing intermediate output by directory) where the processing framework itself is designed around filesystem-shaped input.

### When NOT to Use a Distributed File System

- **Simple key-based binary object access with no directory semantics needed** - [object storage](./blob-object-storage.md) is simpler to operate, scales further horizontally (no coupled metadata bottleneck), and is the better default for images/videos/backups/static assets. See [Blob / Object Storage](./blob-object-storage.md#quick-decision-guide) for the reverse direction of this comparison.
- **Millions of small files** - the metadata service becomes the bottleneck; batch small files into fewer, larger units, or use a system explicitly designed for small-file workloads.
- **Low-latency random reads/writes to small regions of many files at high request rates** - a real database or key-value store fits better; a distributed file system's chunk-oriented design targets large sequential I/O, not fine-grained random access at scale.

---

## Comparison / Selection Matrix

| System | Metadata design | Consistency | Best for |
| --- | --- | --- | --- |
| HDFS (with HA NameNode) | Active/standby NameNode pair, consensus-backed failover | Strong for metadata; write-once-read-many for data | Batch analytics (Hadoop/Spark) over large files |
| GFS | Single master (original design) | Relaxed - designed for append-heavy, large-file workloads | Large-scale batch processing at Google-internal scale |
| CephFS | Distributed metadata servers (MDS cluster) | POSIX-compliant, strongly consistent | General-purpose POSIX workloads needing real file semantics at scale |

**Pick it when:** the workload is genuinely filesystem-shaped (large sequential files, a real directory hierarchy applications navigate, a processing framework expecting file input) - not merely "we need to store a lot of files," which object storage usually serves better and more simply.

HDFS is the workhorse behind most on-premise Hadoop/Spark deployments; CephFS is common where a POSIX-compliant distributed filesystem is needed outside the Hadoop ecosystem specifically. At scale, the failure mode that actually surfaces past a few hundred million tracked files is metadata-node heap exhaustion - a single active NameNode holding the entire namespace in JVM heap runs into garbage-collection pauses and eventual out-of-memory failure well before any data node's disk fills up, which is the concrete threshold that forces a move to Federation (splitting the namespace across multiple NameNodes, each with its own heap ceiling) rather than a hypothetical concern.

---

## Consistency & Locking

Most distributed file systems target **write-once-read-many** semantics for file data - a file is written once (possibly via append), then read many times, rather than supporting arbitrary concurrent random writes the way a local filesystem does. Concurrent writers to the same file typically require explicit application-level coordination (or the file system serializes writes via the metadata service) - this is a materially weaker concurrent-write model than a local filesystem's POSIX guarantees, and a common source of surprise for applications ported from single-machine assumptions.

> ⚠️ **Warning / Gotcha** - "POSIX-like" in most distributed file system marketing does not mean full POSIX compliance. Byte-range locking, atomic rename-over-existing-file, and hard-link semantics are frequently relaxed or unsupported - verify the specific guarantees of the system in question rather than assuming local-filesystem behavior carries over.

---

## Performance & Optimization

### Locality-Aware Scheduling

Because chunk locations are known to the metadata service, compute frameworks (Hadoop MapReduce, Spark) schedule processing tasks on (or near) the data node already holding the relevant chunk - "move computation to the data" instead of moving large chunks of data across the network to wherever compute happens to run. This is a first-order performance lever specific to distributed file systems' tight metadata-to-location coupling; object storage's decoupled, provider-hosted data plane doesn't expose this same locality information to a compute scheduler.

### Large Sequential I/O Optimization

Large chunk sizes (64-128MB) mean a sequential read of a large file issues far fewer, larger network requests than the same read against a system using small blocks - directly trading flexibility for small-file/random-access workloads (see [Metadata Management](#metadata-management)) for throughput on the large-sequential-file case these systems are built around.

---

## Resilience & Failure Handling

Data-node failure is masked by replication (see [Fault Tolerance & Data Placement](#fault-tolerance--data-placement)) - reads route to a surviving replica, and re-replication restores the target count in the background. Metadata-service failure is the more structurally serious case: a single, unreplicated metadata node failing makes the *entire namespace* unavailable, even though every data node and every chunk replica is perfectly healthy - which is precisely why production HDFS deployments run an active/standby NameNode pair with consensus-backed (or shared-storage-backed) failover rather than a single NameNode, and why CephFS distributes metadata across an MDS cluster from the start.

**How active/standby metadata failover actually works (HDFS HA):** the active NameNode writes every namespace mutation (file created, chunk assigned) to a shared **edit log**, replicated via a small [consensus](../algorithms/consensus-raft-paxos.md) group (JournalNodes, a Paxos-based quorum) rather than living on the active node alone. The standby NameNode continuously tails that same edit log, replaying each mutation to keep its own in-memory namespace state converged with the active node's - so at the moment of failover, the standby is already caught up, not starting cold.

```
[Active NameNode] ──writes──► [JournalNode Quorum] ◄──tails── [Standby NameNode]
        │                      (consensus-backed                    │
        │                       shared edit log)                    │
        ▼                                                           ▼
  serves client                                          replays log, stays
  requests                                                warm, ready to promote

On active failure: fencing (STONITH or an epoch/generation number) stops the
old active from accepting writes it thinks are still valid, THEN standby
promotes - skipping the fencing step risks two NameNodes both believing
they're active (split-brain) over the shared namespace.
```

**Fencing is the non-negotiable step**, not an optional hardening: without it, a NameNode that's merely slow or network-partitioned (not actually dead) can keep accepting writes after a standby has already been promoted, producing two independently-mutating views of the same namespace - a failure mode structurally identical to the split-brain risk any single-leader system faces on failover (see [Replication Strategies](../algorithms/replication-strategies.md#leader-election--failover)), applied here to the metadata plane specifically.

---

## Production Failure Modes & Gotchas

### Small-File Metadata Overload

A workload that accumulates millions of small files (each contributing roughly fixed metadata overhead regardless of size) degrades metadata service performance system-wide, even though aggregate data-node capacity is nowhere near exhausted - the classic HDFS "small files problem." The fix is application-level batching (combine many small files into fewer larger container files, e.g. Hadoop SequenceFiles) rather than adding more data nodes, which does nothing for a metadata-bound bottleneck.

### Metadata Service as Single Point of Failure

Deployments running a single, unreplicated metadata node (an easy default to reach for, since it's the simplest configuration) have effectively made the entire filesystem's availability equal to that one machine's uptime - a data-plane failure only affects the specific chunks involved, but a metadata-plane failure is total.

### Common Misconceptions

- "A distributed file system is just object storage with folders." No - the coupling is architectural, not cosmetic: a distributed file system's metadata service tracks a real hierarchical structure and mediates every path resolution, while object storage's flat namespace has no directory-tree data structure to maintain or bottleneck on at all (see [Blob / Object Storage](./blob-object-storage.md#core-mechanics)).
- "More data nodes always improves throughput." Not once the metadata service is the bottleneck - see [Small-File Metadata Overload](#small-file-metadata-overload). Scaling the wrong tier doesn't help.
- "Replication count alone determines durability." As with object storage, failure-domain placement diversity (different racks, not just different disks) matters more than raw copy count past the point where copies stop being independently-failing.

---

## Interview Scenario Bank

> 💬 **First 30 seconds:** "Before I design this, I'd confirm the workload actually needs a real hierarchical namespace and POSIX-like semantics, since that's what separates this from simpler object storage. Assuming it's a large-file, sequential-access batch-processing workload with a directory structure the application relies on, the core challenge becomes: how do we keep the metadata service (which tracks that structure) from becoming the bottleneck or single point of failure the data plane doesn't have to worry about."

> 🎯 **Interview Lens**
> **Q:** Why does a distributed file system need a separate metadata service at all - why not just derive file locations from a hash, the way object storage or a hash-sharded database does?
> **Ideal answer:** A distributed file system has to support a real hierarchical namespace with directory listing, rename, and path-based lookup - operations a pure hash-based scheme can't serve, since there's no formula mapping a directory listing request to a set of nodes. The metadata service exists specifically to maintain that structure explicitly, which is also exactly why it becomes a scaling bottleneck the flatter, formula-driven designs (object storage, hash-sharded stores) don't have.
> **Common trap:** Treating the metadata service as an implementation detail rather than the central architectural trade-off that distinguishes this system from object storage.
> **Next question:** Given that, how does HDFS Federation address the single-metadata-node scaling ceiling without abandoning the hierarchical namespace entirely?

> 🎯 **Interview Lens**
> **Q:** A data pipeline ingesting millions of small (few-KB) sensor readings as individual files onto a distributed file system starts seeing cluster-wide slowdowns, even though disk utilization across data nodes is low. What's happening?
> **Ideal answer:** The small-files problem - metadata overhead is roughly per-file/per-chunk, not per-byte, so millions of tiny files overwhelm the metadata service's lookup/tracking capacity long before the data plane's actual storage or bandwidth is stressed. The fix is batching many small readings into fewer, larger container files before landing them in the filesystem, not adding data nodes.
> **Common trap:** Diagnosing this as a data-node capacity problem and scaling the wrong tier, since disk/bandwidth metrics look healthy.
> **Next question:** What's the trade-off this batching approach introduces for a downstream consumer that needs to process readings individually and close to real-time?

> 🎯 **Interview Lens**
> **Q:** When would you choose a distributed file system over object storage for a new large-scale storage requirement?
> **Ideal answer:** When the workload genuinely needs POSIX-like semantics and a real directory hierarchy that an existing processing framework or application expects to navigate - most commonly, a big-data batch-processing pipeline (Hadoop/Spark) built around file/directory-shaped input and locality-aware scheduling. If the requirement is really just "store and retrieve binary blobs by key," object storage is simpler, avoids the metadata-coupling bottleneck entirely, and is the better default.
> **Common trap:** Reaching for a distributed file system by default for any large-scale storage need, without checking whether the workload actually needs hierarchical/POSIX semantics or would be equally well served (and more simply) by object storage.
> **Next question:** Your compute framework needs locality-aware scheduling (run tasks where the data already lives) - does that requirement change the answer, and why?

> 🎯 **Interview Lens**
> **Q:** Walk through what happens when the active NameNode in an HDFS HA deployment stops responding - what could go wrong if failover isn't implemented carefully?
> **Ideal answer:** The standby, which has been tailing the shared consensus-backed edit log, promotes itself once it detects the active is unreachable - but only safely if a fencing step (STONITH or an epoch number) first guarantees the old active can no longer accept writes. Without fencing, if the old active was merely slow or partitioned rather than truly dead, both NameNodes can end up believing they're active simultaneously, mutating the namespace independently - split-brain, applied to metadata instead of data.
> **Common trap:** Describing only the promotion step (standby becomes active) without naming fencing as the step that makes promotion safe - promotion without fencing is the actual failure mode being tested here.
> **Next question:** How is this the same underlying problem as split-brain in a single-leader database's failover, and how is the fix conceptually identical?

---

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| HDFS | Hadoop Distributed File System | Distributed file system underlying the Hadoop big-data ecosystem |
| GFS | Google File System | Google's internal distributed file system, HDFS's design predecessor |
| MDS | Metadata Server | The component (or cluster) that tracks the file/directory hierarchy and chunk locations |
| POSIX | Portable Operating System Interface | Standard defining traditional Unix-like filesystem behavior/semantics |

### Anti-patterns

- Storing millions of small files without batching - overloads the metadata service while data-node capacity sits idle. Fix: batch into fewer, larger container files.
- Running a single, unreplicated metadata node in production - makes the entire namespace's availability equal to one machine's uptime. Fix: active/standby failover (HDFS HA) or a distributed metadata cluster (CephFS MDS).
- Reaching for a distributed file system when the actual requirement is simple key-based blob access - adds metadata-coupling complexity for no benefit over object storage. Fix: see **[Blob / Object Storage](./blob-object-storage.md)**.
- Assuming full POSIX compliance (byte-range locking, atomic rename semantics) without verifying the specific system's actual guarantees.

### Selection Matrix

See [Comparison / Selection Matrix](#comparison--selection-matrix) above for system-level trade-offs.
