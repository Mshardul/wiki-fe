# Retries, Timeouts and Retry Storms (`inside-retry-timeouts-and-storms`)

**Status:** draft

## Objective

Show how **retries** should behave on a transient failure (backoff, jitter, cap), how **many clients retrying together** creates a **retry storm**, how **nested retry owners** blow one client deadline, and why **timeout ≠ failure** for unsafe replays. Timeout status codes on a single proxy chain live on `inside-an-http-request`.

## Prereqs

- Optional: `inside-a-connection-pool` (keep-alive / idle drops).

## Tracing device

**Whiteboard at the aha step (storm chip):** several **client lanes** each with a **retry counter** and **next-retry tick**, plus one **backend capacity row** (max in-flight vs current). After a 503, every client retries on the **same tick** with no jitter; in-flight climbs above max while errors remain — load rises **after** the fault.

**Why:** retry storms are **multi-actor timing**; per-caller clocks on a shared axis show amplification.

**Implementer note:** **extend** — `schedule` with one row per caller class plus one capacity row.

## Scenarios

### happy — One client, polite retry

Question: A single client gets one **503** on a blip — what retry policy lets the next attempt succeed without hammering the backend?

Misconception: Retry immediately on every failure; more retries always help.

Interview question: Why add jitter to backoff?

Aha: step 3

Steps:

1. Client **GET** → backend returns **503** once; error strip brief.
2. Client waits **backoff** tick with **jitter** (next-retry clock visible); no second attempt yet.
3. Retry **200**; backend **in-flight** unchanged — **aha:** one client + spacing avoids pile-on.
4. **max attempts** counter shows 1 used of 3 (cap visible for later chips).

### storm — Retry storm

Question: Half the backends drop out — why do healthy nodes spike CPU while 503s linger?

Misconception: Retries only replay work that already failed; healthy capacity absorbs them.

Interview question: A brief AZ blip leaves you in a ten-minute 503 tail — what did clients do?

Aha: step 4

Steps:

1. Two backends up; **max in-flight 4** (2 each); in-flight 2; clients show `retries: 0`.
2. One backend removed; LB returns **503** for part of traffic; error strip bad.
3. All client lanes fire **retry on the same tick** (1 s fixed backoff, no jitter).
4. One backend remains; **in-flight 8** vs **max 2** — **aha:** retries overload survivors.
5. Backend returns to pool; client retry counters still high; latency stays up before errors fall.
6. Replay steps 2–5 with exponential backoff, jitter, and max attempts; in-flight stays under max; errors decay faster.

### budget — Retry budget exhausted

Question: Product rule: at most **3 attempts within 15 s** — what breaks when the gateway also retries upstream (3 × **6 s** slow-fail)?

Misconception: Each hop can retry independently without exceeding the client SLA.

Interview question: The mobile client cancelled at 15 s but the gateway was on attempt 3 — who owned the budget?

Aha: step 3

Steps:

1. Client **deadline 15 s** bracket and product cap **3 attempts / 15 s** appear; gateway policy **3× upstream** retries.
2. Attempt 1 fails at 6 s; attempt 2 at 12 s; attempt 3 starts at 12 s (each upstream leg **6 s**).
3. Client deadline fires **cancelled** while attempt 3 is still in flight — **aha:** nested retries multiply wall time.
4. Attempt 3 completes after cancel; gateway logs a **late 200** the client never reads.
5. Replay with **single retry owner** and propagated deadline; client cancel and gateway stop align before attempt 3 starts.

### leak — Retry on non-idempotent success

Question: Client timed out on `POST /order` and retried — why are there two rows when the server returned 201 on the first try?

Misconception: A timeout means the server did not execute.

Interview question: How does this connect to retry storms vs safe retries?

Aha: step 2

Steps:

1. `POST /order` past client deadline while server still working.
2. Server returns **201**; client times out and **retries** — **aha:** success was invisible; retry without a key is unsafe.
3. Second `POST` inserts a second row; bad strip shows duplicate orders.

## Read article

`/system-design/components/load-balancer/#snat-port-exhaustion--connection-tracking-limits`; `#backpressure--load-shedding`. Deploy herd: `#thundering-herd-on-backend-restart`.

## Notes

- Do not implement idempotency storage on this page.
- **leak** chip: See also `inside-idempotency-keys` in About only.

## Approval

- [x] Reviewer pass
- [ ] Shardul
