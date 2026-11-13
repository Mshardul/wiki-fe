# Replication Lag and Read-Your-Writes (`inside-replication-lag-and-read-your-writes`)

**Status:** draft

## Objective

Show **async replication**: after a primary **COMMIT**, a **replica** read can be stale until replay catches up. Separate **routing** (read pool) from **durability** (what COMMIT promised). Separate **app cache** from replica lag.

## Prereqs

- `inside-the-postgres-wal` (commit + fsync).

## Tracing device

**Whiteboard at the aha step (stale chip):** **primary** and **replica** nodes, **lag meter** (ticks behind), **session** pin. Write lands on primary; read arrow hits replica **before** lag reaches zero.

**Why:** read-your-writes failures are **cross-node ordering**; lag must be visible.

**Implementer note:** **new** — `replication-lag` twin-node shape.

## About (teaching notes for stale chip)

- **COMMIT** with `synchronous_commit=on` means the primary won’t lose the write on crash — not that every replica has applied it yet.
- **Quorum / sync replica** changes who must ack before COMMIT returns; it does not replace read-your-writes unless reads are routed to nodes that acked.
- Tie mentally to WAL visualizer for primary durability; this page owns **reader routing + lag**.

## Scenarios

### happy — Read your write on the primary

Question: User saves, then reloads on the same DB connection / primary — why is the row there?

Misconception: Any read after any write is fresh everywhere.

Interview question: When is “sticky write, read primary” enough?

Aha: step 2

Steps:

1. Client **WRITE** → primary; tuple version bumps; **COMMIT** ack to client.
2. Client **READ** → same primary; new version visible — **aha:** no replica in path.

### stale — Read replica too soon

Question: Write on primary; read hits a replica moments later — user says the save failed. What happened?

Misconception: COMMIT updates all replicas immediately.

Interview question: How do you tell lag from an app bug?

Aha: step 3

Steps:

1. **COMMIT** on primary; WAL arrow to replica starts; **lag = 3 ticks**.
2. Read routed to **replica** (read pool).
3. Replica tuple still **old version** — **aha:** stale read, not lost write.
4. Lag **0**; same read on replica shows new version.

### cache — App cache outruns the database

Question: Replica is caught up but the UI still shows the old profile — which layer?

Misconception: Fixing replication fixes every stale read.

Interview question: Where do you invalidate on write in cache-aside?

Aha: step 2

Steps:

1. Primary **COMMIT**; replica **lag 0**.
2. App **Redis** still holds pre-write value; read path hits cache — **aha:** not replica lag.
3. Cache key **deleted** on write path; next read loads fresh tuple from DB.

## Read article

`/system-design/components/caching/#replication-lag-causing-stale-reads`; `/system-design/algorithms/replication-strategies/#replication-lag`

## Notes

- See also: WAL, MVCC, stampede, `inside-http-caching-and-cdns` (edge layer).
- **Three chips** — no separate “promise” chip; durability vs visibility lives in **About** above.

## Approval

- [x] Reviewer pass
- [ ] Shardul
