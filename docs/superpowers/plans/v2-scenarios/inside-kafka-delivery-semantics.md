# Kafka Delivery Semantics (`inside-kafka-delivery-semantics`)

**Status:** draft

## Objective

Trace **at-least-once**: poll → process → **commit offset**, and where **redelivery** appears. Show **producer duplicate records** when retries meet a lost ACK (lab: idempotence **off**, then **on**). Bound **exactly-once** to **Kafka-to-Kafka** transactions; external sinks still need **idempotent consumers**. **Consumer rebalance** is a separate slug (v1 backlog).

## Prereqs

- `inside-celery-prefetch` (ack timing analogue).
- Optional: idempotency **consumer** chip.

## Tracing device

**Whiteboard at the aha step (crash chip):** partition **log**, consumer **processed** pointer vs **committed** offset; crash glyph between them; on restart the read cursor **rewinds**.

**Why:** semantics live in **commit ordering** vs side effects.

**Implementer note:** **new** — `kafka-offset-log` shape.

## Scenarios

### happy — Process then commit

Question: Manual commit after process — what defines restart position?

Misconception: Commit-after-process is exactly-once.

Interview question: Where is the duplicate window?

Aha: step 3

Steps:

1. Partition offsets 100–102 visible; consumer polls **100**.
2. Process **100**; sink shows effect.
3. `commitSync` advances **committed** to **101** (next fetch offset) — **aha:** restart only skips records before the commit.

### crash — Crash before commit

Question: Worker dies after sink write, before `commitSync` — what on restart?

Misconception: The broker “remembers” processing.

Interview question: Broker fault or consumer fault?

Aha: step 3

Steps:

1. Poll **105**; process **105**; sink updated; **committed** was **105** entering the poll.
2. Crash before `commitSync`; **committed** still **105**.
3. Restart polls **105** again — **aha:** at-least-once redelivery; sink must dedupe.

### producer-dup — ACK lost (broken, then fix)

Question: Producer retries after a lost ACK — when do **two records** appear on the log?

Misconception: Duplicates are only a consumer problem.

Interview question: What do PID / sequence / idempotent producer do?

Aha: step 2

Steps:

1. Producer config shown: **`enable.idempotence=false`** (lab only; see Notes).
2. Send seq=7; broker appends; ACK **lost**; producer retries seq=7 — **two offsets** on the log — **aha:** duplicate at produce path.
3. Replay from step 1 with **`enable.idempotence=true`**; broker **dedupes** retry; log shows **one** offset.

### eos — Exactly-once scope

Question: Transactional consume–produce — what is atomic?

Misconception: Exactly-once fixes Postgres writes.

Interview question: Quote the article scope boundary.

Aha: step 2

Steps:

1. Transaction box: read A, write B, commit offsets together.
2. **Abort** — no `read_committed` output — **aha:** atomicity **inside Kafka only**.
3. Sink arrow labeled **application idempotency required**.

## Read article

`/system-design/components/message-queues/#reliability--delivery-semantics` (producer idempotency subsection in same doc).

## Notes

- **Offset labels on stage:** **committed** = **next offset to fetch** (same convention as Java `commitSync` metadata / position after a successful commit). Process record at offset *N*, then commit → *N + 1*.
- **Kafka producer idempotence:** `enable.idempotence=true` is the default in modern Java clients (3.0+); producer-dup steps **1–2 explicitly disable** it so the duplicate is visible on stage. Step 3 turns it back on — cite [Kafka producer configs](https://kafka.apache.org/documentation/#producerconfigs_enable.idempotence) in About if needed.
- Turning idempotence back on in **producer-dup** step 3 does not make consumers exactly-once.
- Rebalance visualizer: future slug; not this page.
- No `max.poll.interval` chip here.

## Approval

- [x] Reviewer pass
- [ ] Shardul
