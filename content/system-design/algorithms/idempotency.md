# Idempotency

## Prerequisites

**[Message Queues](../components/message-queues.md)** [Should read]
**[CAP Theorem](./cap-theorem.md)** [Should read]

## Table of Contents

- [TLDR](#tldr)
- [Mental Model](#mental-model)
- [Formal Definition](#formal-definition)
- [Assumptions & Preconditions](#assumptions--preconditions)
- [Core Mechanics](#core-mechanics)
- [Often Confused With](#often-confused-with)
- [Variants & Extensions](#variants--extensions)
- [Real-World Applications](#real-world-applications)
- [Common Misapplications & Gotchas](#common-misapplications--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

## TLDR

Idempotency means an operation produces the same end-state no matter how many times it's applied - retry it 1 time or 100, the result is identical. It's the property that makes retries safe in a world where networks drop acknowledgments but not always the underlying request. The core decision it enables: whether a caller can blindly retry on timeout, or must first ask "did that actually happen?" before trying again. The key trade-off is where the dedup state lives - client-generated idempotency key, server-side dedup table, or a naturally idempotent operation shape - and each costs differently in storage, latency, and correctness under concurrent retries.

## Mental Model

**An idempotent operation is a light switch, not a coin flip into a jar.** Flipping a switch to "on" five times leaves it on - the fifth flip is a no-op because the state was already there. Dropping a coin into a jar five times leaves five coins - every action changes the total, so replaying it changes the outcome. System design retries need switches, not jars: `SET balance = 100` is a switch (idempotent - reapply freely). `balance += 100` is a jar (not idempotent - reapply and you've paid the customer five times).

## Formal Definition

An operation `f` is idempotent if applying it multiple times produces the same result as applying it once: `f(f(x)) = f(x)`. In distributed systems this is usually relaxed to the practically useful version: **repeating the same logical request (same idempotency key, same inputs) any number of times produces the same observable end-state and the same response**, even if the underlying resource was already mutated by an earlier attempt of that same request.

## Assumptions & Preconditions

Idempotency guarantees hold only under specific conditions, and each has a real failure mode when violated:

- **The dedup key must be scoped correctly.** An idempotency key tied to a client session but replayed from a different session (e.g. a mobile app retrying after a backgrounding event that rotated its session ID) won't be recognized as a duplicate - the server sees a "new" request.
- **The dedup window must outlive the retry window.** If a client can plausibly retry up to 24 hours later (offline queueing, exponential backoff with a long cap) but the server's dedup record expires after 1 hour, a legitimate retry after expiry is treated as a fresh, non-idempotent request. This is the same reasoning **[CAP Theorem](./cap-theorem.md)** forces during a network partition: a client that can't confirm whether its first attempt landed has no choice but to retry blind, so the dedup window has to outlast the longest partition the system is expected to tolerate, not just the client's typical retry backoff.
- **Concurrent retries of the same key must be serialized, not just deduplicated after the fact.** Two retries of the same idempotency key arriving within milliseconds of each other (double-click, client-side race) must not both pass a "have I seen this key?" check before either has recorded it - that's a TOCTOU race that defeats the entire guarantee.
- **The operation's side effects must all be covered, not just the primary write.** A payment write can be idempotent while its downstream email-receipt send is not - the guarantee is only as strong as its narrowest link.

## Core Mechanics

Idempotency is implemented one of three ways, each with a different mechanism for detecting "have I done this already?":

**1. Naturally idempotent operation shape.** Some operations are idempotent by construction - no dedup state needed. `PUT /users/42 {name: "Alice"}` (absolute assignment) is idempotent: replay it and the end-state is identical. `DELETE /users/42` is idempotent: the second call finds nothing to delete but the end-state (user gone) is unchanged. Contrast with `POST /users {name: "Alice"}` (creates a new resource each call - not idempotent by shape) and `PATCH /accounts/42 {balance: balance + 100}` (a relative delta - not idempotent by shape).

**2. Client-generated idempotency key.** The client attaches a unique key (typically a UUID generated once per logical operation, reused across retries of that same operation) to the request. The server maintains a dedup table keyed on it:

```
1. Client generates key K = uuid4() once, before the first attempt.
2. Client sends request with key K.
3. Server checks: does a record for K exist?
   - No  -> execute the operation, atomically store {K: result} in the same
            transaction as the mutation, return result.
   - Yes -> skip execution, return the previously stored result.
4. On timeout, client retries with the SAME key K (not a new one).
```

The atomicity in step 3 is the entire guarantee - the write and the dedup-record write must commit together, or a crash between them re-opens the race.

**3. Server-side deterministic dedup key.** When the client can't be trusted or modified (e.g. deduplicating at-least-once message-queue delivery), the server derives a key from the message itself - partition + offset, or a content hash - and does an idempotent upsert:

```sql
INSERT INTO processed_events (event_id, result)
VALUES ($1, $2)
ON CONFLICT (event_id) DO NOTHING
```

This is the pattern **[Message Queues](../components/message-queues.md)** uses for consumer-side dedup of at-least-once delivery.

## Often Confused With

**Idempotency vs retriable.** Retriable just means "safe to attempt again on failure" - it says nothing about the outcome if the first attempt actually succeeded before the failure was observed. An operation can be retriable-but-unsafe: retrying a non-idempotent `POST /charge` after a timeout is "retriable" in the sense that the client *can* send it again, but doing so may double-charge. Idempotency is what makes retriable safe.

**Idempotency vs exactly-once delivery.** Exactly-once delivery is a messaging-system guarantee about how many times a message is *delivered* to a consumer. Idempotency is a property of what the consumer *does* with it. They solve overlapping problems from different layers: even a system with only at-least-once delivery achieves an effectively-exactly-once *outcome* if the consumer is idempotent - which is why most production systems use at-least-once delivery plus idempotent consumers rather than paying for true exactly-once, per **[Message Queues](../components/message-queues.md)**'s Reliability & Delivery Semantics section.

**Idempotency vs `PUT` semantics in REST.** HTTP defines `PUT`, `DELETE`, `GET`, `HEAD`, `OPTIONS` as idempotent by spec and `POST`, `PATCH` as not. This is a useful default, not a guarantee about your implementation - a `PUT` handler that appends to a log instead of overwriting state violates the spec's intent while still being syntactically a `PUT`.

## Variants & Extensions

**Idempotency-Key header (Stripe-style).** The now-common HTTP convention: client sends an `Idempotency-Key` header, server caches the *entire response* (status code, body) keyed on it, not just a "was it done" boolean - so a retried request gets byte-identical output, including on requests that legitimately failed validation (a 400 response is also cached, so retrying a malformed request doesn't re-run business logic to produce the same 400).

**Conditional idempotency (optimistic concurrency).** `PUT /accounts/42 {balance: 100, version: 5}` - idempotent *conditional on* the version matching. Replaying it after another write bumped the version to 6 correctly fails rather than silently overwriting - this is idempotent in the "same input produces same outcome" sense (both attempts against version 5 fail once version moves to 6) even though it's not a blind overwrite.

**Idempotent aggregation via absolute values.** Converting a relative operation into an idempotent one by sending the *computed* absolute result instead of the delta: instead of `increment inventory by -3`, the client computes and sends `set inventory to 47`, tagged with the same idempotency key - turns a jar into a switch at the cost of the client needing to know the pre-operation state (introducing its own race if two clients compute "the" absolute value from different reads).

## Real-World Applications

**Payment processing** is the canonical idempotency use case: Stripe's API requires an `Idempotency-Key` on every charge-creation call specifically because a client timing out on a charge request has no way to know if the charge succeeded before the timeout - retrying blindly without the key risks a double-charge. **At scale**, the dedup table itself becomes a bottleneck and a growth liability: a naive unbounded `processed_requests` table grows forever, so production systems TTL-expire dedup records after a bounded retry window (Stripe: 24 hours) and accept that a retry arriving after expiry is (correctly, by then) treated as a new request.

## Common Misapplications & Gotchas

- **Assuming `POST` can be made idempotent just by checking a business-key.** "I'll dedupe on `user_id + timestamp`" fails because two legitimate distinct requests can share both fields (a user submitting the same form twice on purpose, seconds apart) - only a client-generated-once key or a truly unique natural key avoids false-positive dedup.
- **Storing the dedup record without the response.** Storing only `{key: "seen"}` and not `{key: result}` means a retry after the original succeeded returns nothing useful (or worse, re-derives a *different* result) - the client can't tell if the retry means "already done, here's what happened" vs "already done, no idea what happened."
- **Read-then-write instead of atomic upsert.** `SELECT ... WHERE key = K` followed by a conditional `INSERT` is a race: two concurrent retries can both pass the `SELECT` check before either commits the `INSERT`. Must be a single atomic operation (`INSERT ... ON CONFLICT`, a unique constraint that throws, or a compare-and-swap) - not two round-trips.

### Common Misconceptions

- **"Idempotent means the operation does nothing on retry."** No - it means retries produce the *same end-state*, not that the retry is a true no-op internally. A `PUT` that's retried still executes a write; it just writes the same value it wrote before, so the *observable* state doesn't change.
- **"Making an endpoint idempotent is purely a client-side concern (just don't double-click)."** The server must enforce it - a client that never double-submits still needs the server-side guarantee, because the retry that matters is the one caused by a dropped ACK on an actually-successful request, which the client cannot distinguish from an actually-failed one.

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** How would you make a payment-charging endpoint safe to retry?
> **Ideal answer:** Require an `Idempotency-Key` from the client, generated once per logical charge attempt and reused across retries. Server does an atomic `INSERT ... ON CONFLICT DO NOTHING` (or equivalent unique-constraint check) against a dedup table in the *same transaction* as the charge write, storing the full response. On conflict, return the stored response instead of re-executing.
> **Common trap:** Deduplicating by `SELECT` then `INSERT` in two steps - a race window lets two concurrent retries both pass the check and both charge the card.
> **Next question:** "What happens if the process crashes between charging the card and writing the dedup record?"
> **Next question:** "How long do you keep dedup records, and what happens to a retry that arrives after they expire?"

> 🎯 **Interview Lens**
> **Q:** Is `DELETE /resource/42` idempotent, and what about the response code on the second call?
> **Ideal answer:** Yes - the end-state (resource gone) is identical whether called once or five times, which is what idempotency actually guarantees. The response code commonly differs (`204` first call, `404` on replay) without violating idempotency, since idempotency is a state guarantee, not a byte-for-byte response guarantee - unless the system additionally promises identical responses via a cached-response idempotency key, in which case the second call should return the original `204`, not a `404`.
> **Common trap:** Assuming idempotent implies "returns the exact same HTTP response every time" - that's a stronger guarantee (response caching) layered on top, not what idempotency itself requires.
> **Next question:** "Would you design it to return the identical response, and what would that cost?"

## Appendices

### Acronyms & Abbreviations

| Acronym | Full Form | One-line meaning |
| --- | --- | --- |
| TOCTOU | Time-Of-Check to Time-Of-Use | The race between checking a condition and acting on it, where concurrent execution invalidates the check before the action completes. |

### Anti-patterns

- **Dedup via `SELECT`-then-`INSERT`** - races under concurrent retries - use a single atomic upsert or unique-constraint insert instead.
- **Idempotency key generated fresh on every retry attempt** - defeats the entire mechanism, since the server sees each retry as a new key - generate once per logical operation, reuse across retries.
- **Unbounded dedup table with no TTL** - grows forever and eventually dominates storage/query cost - bound the retry window and expire records past it.
