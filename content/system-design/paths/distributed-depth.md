# Learning Path: Distributed Depth

Senior-bar depth track - the distributed-systems algorithms and internals a standard loop skips, plus the HLDs that actually demand them. Assumes [Components Foundation](./components-foundation.md) or equivalent background. ~6-8 weeks at a steady pace.

See [SD Learning Paths](../index.md#learning-paths) for the other tracks.

---

## Path

| Stage | Topic                                                                | Type      | Notes                       |
| ----- | ----------------------------------------------------------------------- | --------- | ---------------------------- |
| 1     | [Replication Strategies](../algorithms/replication-strategies.md)       | Algorithm |                              |
| 1     | [Sharding Strategies](../algorithms/sharding-strategies.md)             | Algorithm |                              |
| 2     | [Consensus (Raft / Paxos)](../algorithms/consensus-raft-paxos.md)       | Algorithm |                              |
| 2     | [Saga Pattern](../algorithms/saga-pattern.md)                           | Algorithm |                              |
| 4     | [Key-Value Store](../hld/key-value-store.md)                            | HLD       | LSM tree, compaction        |
| 4     | [Distributed ID Generator](../hld/distributed-id-generator.md)          | HLD       | Snowflake IDs, clock skew   |
| 6     | [Distributed Cache](../hld/distributed-cache.md)                        | HLD       | revisited at depth          |

---

## Explicitly skipped in this track

Warm-up HLDs and standard-loop coverage already handled in [HLD Interview Loop](./hld-interview-loop.md).
