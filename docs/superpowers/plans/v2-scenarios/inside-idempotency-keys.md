# Idempotency Keys (`inside-idempotency-keys`)

**Status:** draft

## Objective

Teach **client-generated idempotency keys** for safe retries: one key **K** per logical operation, **order row + dedup record** in a **single DB transaction** (workloads you own — not an external PSP call inside the same txn). On replay, return the **stored response** without a second insert. Cover **TOCTOU** on concurrent duplicates and **partition + offset** dedup at a Kafka sink.

## Prereqs

- Optional: `inside-retry-timeouts-and-storms` **leak** chip.

## Tracing device

**Whiteboard at the aha step (race chip):** **dedup ledger** beside an **orders** table row. Requests **R1** and **R2** share key **K**; the student watches one **transaction boundary** vs a **SELECT** then **INSERT** race.

**Why:** idempotency is **atomic admission**, not header decoration.

**Implementer note:** **new** — `idempotency-ledger` shape.

## Scenarios

### happy — First attempt wins

Question: `POST /orders` with `Idempotency-Key: K` — what happens on the first try and on a retry with the same K?

Misconception: The server checks the key only after the insert succeeds.

Interview question: Walk server steps for K on first request and after a network blip.

Aha: step 3

Steps:

1. Client mints **K** once; request arrives with K.
2. Dedup store has no K; handler opens a transaction on **orders**.
3. Transaction commits **order row** + **{K → status, body}** — **aha:** effect and dedup record are one commit.
4. Retry with same K: lookup K; return stored body; **no second insert**.

### race — Concurrent duplicate keys

Question: Two requests with the same K arrive together — can both insert?

Misconception: `SELECT` then `INSERT` is safe if the window is tiny.

Interview question: Why are two round-trips unsafe?

Aha: step 3

Steps:

1. **R1** and **R2** (same K) enter handlers on the same tick.
2. Both **SELECT** dedup — both see “missing K”.
3. Both run **INSERT order** — **aha:** no unique constraint → two rows.
4. Replay: unique on K or `INSERT … ON CONFLICT`; second request gets **conflict**, returns first stored response.
5. Outcome strip: one admitted effect per K.

### timeout — Success invisible to client

Question: Server returned 201 but the client saw a timeout — why must the retry reuse K?

Misconception: Timeout means no commit happened.

Interview question: Same rationale as mandatory keys on payment APIs — applied here to **your** order table.

Aha: step 2

Steps:

1. Request with K completes order insert + dedup commit.
2. **201** response lost on the wire; client times out — **aha:** state already committed.
3. Retry with **same K**; server returns stored 201; order count unchanged.
4. Retry with **new K** by mistake; **second order row**; bad strip.

### consumer — At-least-once dedup

Question: Kafka redelivers after crash-before-commit — how does the sink stay correct?

Misconception: Broker delivery mode removes the need for consumer idempotency.

Interview question: Dedup with `(partition, offset)` in the database.

Aha: step 3

Steps:

1. Consumer polls **105** (`committed` **105**); processes **105**; sink write visible.
2. Crash before `commitSync`; **committed** still **105**.
3. Redelivery of **105**: `INSERT` with unique `(partition, offset)` **conflicts**; handler skips write — **aha:** idempotency at the sink.
4. `commitSync` → **committed 106**.

## Read article

`/system-design/algorithms/idempotency/#core-mechanics`

## Notes

- **About:** Stripe-style APIs often call an external network before respond; dedup still lives in your DB, but the **charge** is not in the same transaction as the ledger — cite article, don’t fake a joint commit on stage.
- Cached **4xx** responses: one sentence in About only (no extra happy step unless Shardul approves).
- See also: `inside-kafka-delivery-semantics` — scope boundary for exactly-once. Use the same **committed = next fetch offset** labels as that slug.

## Approval

- [x] Reviewer pass
- [ ] Shardul
