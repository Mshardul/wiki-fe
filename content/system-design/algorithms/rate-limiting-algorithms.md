# Rate Limiting Algorithms

## Prerequisites

- **[Rate Limiter](../components/rate-limiter.md)** [Must read]

---

## Table of Contents

- [TLDR](#tldr)
- [Mental Model](#mental-model)
- [Token Bucket](#token-bucket)
- [Leaky Bucket](#leaky-bucket)
- [Fixed Window Counter](#fixed-window-counter)
- [Sliding Window Log](#sliding-window-log)
- [Sliding Window Counter](#sliding-window-counter)
- [Often Confused With](#often-confused-with)
- [Performance & Complexity](#performance--complexity)
- [Common Misapplications & Gotchas](#common-misapplications--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)
- [Appendices](#appendices)

---

## TLDR

Five algorithms answer the same question - "has this identifier sent too many requests too fast?" - by making different trade-offs between memory cost, boundary accuracy, and burst tolerance. Token bucket and leaky bucket differ in whether bursts are absorbed or smoothed away; the three window-based algorithms (fixed, sliding log, sliding counter) trade memory for boundary precision. **[Rate Limiter](../components/rate-limiter.md)** covers which one to pick and where to enforce it - this page is the mechanics, complexity, and implementation detail underneath that decision.

---

## Mental Model

Every algorithm here is a different way of answering "was this request sent too fast?" by choosing **what state to keep** and **what "too fast" means precisely**. Token/leaky bucket model a physical container with a rate in and a rate out; the window algorithms instead slice time into buckets and count occupants - the entire design space is just how coarse that time-slicing is, traded against memory.

---

## Token Bucket

### Mechanics

A bucket holds up to `capacity` tokens and refills at `rate` tokens/second, capped at `capacity`. Each incoming request attempts to remove one token: if available, the request proceeds; if the bucket is empty, the request is rejected (or queued, depending on implementation).

```
refill: tokens = min(capacity, tokens + elapsed_seconds * rate)

on_request():
    refill()
    if tokens >= 1:
        tokens -= 1
        return ALLOW
    return REJECT
```

State needed per identifier: `tokens` (float) and `last_refill_timestamp`. Refill is computed lazily on each request (elapsed-time-based), not via a background timer - this avoids needing a scheduled job per identifier.

### Why Bursts Are Allowed

A bucket that's been idle accumulates tokens up to `capacity`, so a client that hasn't made a request in a while can burst up to `capacity` requests instantly before being throttled back to the steady-state `rate`. This is the algorithm's defining trade-off: burst-friendly by design, not a flaw.

---

## Leaky Bucket

### Mechanics

Requests enter a fixed-size FIFO queue (the "bucket") and are processed ("leak out") at a constant rate, regardless of how bursty the input is. A request arriving when the queue is full is dropped.

```
on_request():
    if queue.size() < capacity:
        queue.push(request)
        return ALLOW
    return REJECT

# separate process, runs continuously:
every 1/rate seconds:
    if queue not empty:
        process(queue.pop())
```

Two implementation variants exist: a literal queue (as above, requests wait and are processed at the output rate) and a **leaky bucket as a meter** (no queue - just a counter that decrements at a fixed rate and rejects when it would go negative, functionally closer to token bucket but with output smoothing instead of burst absorption). Interview answers should default to the queue variant unless asked otherwise.

### Why Output Is Always Smooth

Because processing happens at a fixed rate independent of arrival rate, the leaky bucket **cannot** pass a burst downstream - the queue absorbs the burst and the drain rate is constant. This is the direct opposite trade-off from token bucket: smoothness is guaranteed, but a legitimate burst gets queued (added latency) or dropped, not served immediately.

---

## Fixed Window Counter

### Mechanics

Divide time into fixed-size windows aligned to clock boundaries (e.g., `[00:00-00:59]`, `[01:00-01:59]`). Keep one counter per identifier per window; increment on each request, reject once the counter exceeds the limit. Reset the counter to zero when the window rolls over.

```
window_id = floor(now / window_size)
key = identifier + ":" + window_id

on_request():
    count = INCR(key)          # atomic increment
    if count == 1:
        EXPIRE(key, window_size)  # first request sets TTL
    return ALLOW if count <= limit else REJECT
```

State: one integer counter per identifier, expiring automatically at window boundary - O(1) space per identifier, the cheapest of the five algorithms.

### The Boundary Spike Problem

A client can send up to `2 × limit` requests within any short span by timing requests around a window boundary: `limit` requests at the very end of window N, then `limit` more at the very start of window N+1 - two full quotas separated by a few milliseconds, not `window_size`. The algorithm is correct per its own definition (each window individually respects the limit) but the *effective* instantaneous rate a client can achieve is double the intended steady-state rate.

```
limit = 100

Window N (00:00-00:59)        Window N+1 (01:00-01:59)
├──────────────────────┤      ├──────────────────────┤
                    [100 reqs][100 reqs
                     at 00:59] at 01:00]
                        └──── 200 requests in ~1 second ────┘
                              (both windows individually ≤ limit)
```

---

## Sliding Window Log

### Mechanics

Store a timestamp for every accepted request per identifier (typically a sorted set or list). On each new request: discard timestamps older than `now - window_size`, count what remains, allow if under `limit`, then record the new timestamp if allowed.

```
on_request():
    remove_all(log[identifier], older_than = now - window_size)
    if len(log[identifier]) < limit:
        log[identifier].append(now)
        return ALLOW
    return REJECT
```

State: up to `limit` timestamps per identifier - O(n) space where n = the allowed request count, not O(1). This is the exact-accuracy algorithm: no boundary spike is possible because the window is truly continuous, sliding with `now` rather than snapping to clock boundaries.

### Why It's Expensive at Scale

Every request requires a prune-then-count operation over up to `limit` stored timestamps, and the storage itself scales linearly with the limit - a generous `limit = 10,000/hour` means up to 10,000 timestamps held per identifier at once. At high identifier cardinality (millions of users) this becomes a real memory and CPU cost, which is exactly the gap sliding window counter closes.

---

## Sliding Window Counter

### Mechanics

Approximates the sliding log's accuracy using only two fixed-window counters (current and previous), weighted by how far into the current window `now` falls:

```
estimated_count = previous_window_count * (1 - elapsed_fraction_of_current_window)
                 + current_window_count

on_request():
    estimated = weighted_estimate()
    if estimated < limit:
        INCR(current_window_count)
        return ALLOW
    return REJECT
```

State: two integers per identifier (current + previous window counts) - O(1) space, same as fixed window, but with a weighted estimate that approximates the true sliding count instead of resetting hard at the boundary. The approximation assumes requests are evenly distributed within the previous window, which is not always true but is close enough in practice that error stays small.

---

## Often Confused With

**Sliding Window Log vs Sliding Window Counter** - both "slide," but the Log is exact (stores every timestamp) and the Counter is an approximation (stores two aggregate counts). The Counter can under- or over-count slightly when traffic within the previous window was bursty rather than uniform; the Log never has this error. Pick the Log only when perfect accuracy is worth the O(n) memory cost.

**Leaky Bucket vs Token Bucket** - both use a "bucket" metaphor but model opposite things: leaky bucket constrains the **output** rate (smooths bursts away), token bucket constrains the **input** rate while explicitly allowing bursts up to capacity. A common wrong answer conflates them as "the same algorithm with different names."

---

## Performance & Complexity

| Algorithm | Space per identifier | Time per request | Boundary accuracy |
| --- | --- | --- | --- |
| Token Bucket | O(1) | O(1) | N/A (no fixed windows) |
| Leaky Bucket | O(capacity) (queue) or O(1) (meter variant) | O(1) | N/A (continuous drain) |
| Fixed Window Counter | O(1) | O(1) | Poor - up to 2× burst at boundary |
| Sliding Window Log | O(n), n = limit | O(n) worst case (prune), amortized O(1) | Exact |
| Sliding Window Counter | O(1) | O(1) | Approximate, small bounded error |

The practical takeaway: only Sliding Window Log pays real memory cost proportional to the limit itself - every other algorithm is O(1) per identifier regardless of how high the limit is set, which is why it's the one algorithm avoided at high-cardinality, high-limit scale (e.g. a public API with a 100k req/day limit and millions of identifiers).

---

## Common Misapplications & Gotchas

### Off-by-One at Window Boundaries (Fixed Window)

Implementers sometimes use `count > limit` instead of `count >= limit` (or vice versa) as the rejection condition, silently allowing one extra request per window. Minor in isolation, but it compounds with the boundary spike problem - the effective burst becomes `2 × limit + 2` instead of `2 × limit`.

### Assuming Sliding Window Counter Is Exact

The weighted estimate assumes uniform request distribution within the previous window. Under genuinely bursty traffic (e.g. all of the previous window's requests landed in its last second), the estimate under-counts what a true sliding log would show, letting slightly more traffic through than the configured limit near a window transition. This is an accepted, bounded approximation error, not a bug - but it's a real gap between the algorithm's *stated* limit and its *actual* worst-case behavior, and worth naming explicitly when asked to defend accuracy claims.

### Non-Atomic Increment Under Concurrency

A naive `read count → check < limit → write count + 1` sequence has a race: two concurrent requests can both read the same pre-increment count, both pass the check, and both get allowed - overshooting the limit. Production implementations use an atomic increment-and-check (Redis `INCR` + `EXPIRE`, or a Lua script for multi-step atomicity) specifically to close this race - see **[Rate Limiter § Distributed Rate Limiting](../components/rate-limiter.md#distributed-rate-limiting)** for the full distributed-counting treatment.

### Common Misconceptions

- "Token bucket and leaky bucket produce the same throttling behavior" - no, they optimize for opposite goals: token bucket explicitly allows bursts (burst-friendly), leaky bucket explicitly eliminates them (smoothness-friendly). Choosing one when the requirement calls for the other is a design bug, not a style preference.
- "Sliding window log's O(n) memory cost is only a problem at extreme scale" - the cost scales with the **configured limit**, not request volume; a generous per-user limit (e.g. 50,000/day) makes this expensive even for a moderately-sized user base, independent of how much traffic actually arrives.

---

## Interview Scenario Bank

> 🎯 **Interview Lens**
> **Q:** Why does fixed window counter allow up to 2× the configured rate?
> **Ideal answer:** Because the window boundary is a hard reset, not a rolling threshold - a client can send a full quota in the last instant of window N and a full quota again in the first instant of window N+1, achieving `2 × limit` requests within a span far shorter than one window, while each window individually still reports as compliant.
> **Common trap:** Explaining this as "the counter has a bug" rather than an inherent property of clock-aligned, non-overlapping windows - the algorithm is working exactly as specified, the specification itself has the gap.
> **Next question:** How does sliding window counter reduce this without paying sliding window log's memory cost?

> 🎯 **Interview Lens**
> **Q:** You need to rate limit a payment-processing pipeline where downstream throughput must never spike. Which algorithm, and why not token bucket?
> **Ideal answer:** Leaky bucket - its entire design guarantees a constant output rate regardless of input burstiness, which is exactly the downstream-smoothness requirement. Token bucket is disqualified specifically because it *allows* bursts up to capacity, which is the opposite of what a throughput-sensitive downstream needs.
> **Common trap:** Picking token bucket because "it's the default for most APIs" without checking whether this specific requirement (smooth output, not burst tolerance) is the one token bucket is wrong for.
> **Next question:** What happens to a burst of legitimate requests when they hit a leaky bucket with a full queue?

> 🎯 **Interview Lens**
> **Q:** Under what conditions does sliding window counter's approximation produce a materially wrong answer?
> **Ideal answer:** When request distribution within the previous window is highly non-uniform - e.g. a burst concentrated at the very end of the previous window. The weighted-average formula assumes even spread, so it under-weights that burst's true recency, letting more requests through near the window transition than a true sliding log would allow.
> **Common trap:** Claiming the algorithm is "basically exact" - it's a bounded approximation, and defending it requires naming the specific assumption (uniform distribution) that can be violated.
> **Next question:** For a use case that truly cannot tolerate any approximation error, what do you give up by switching to sliding window log?

---

## Appendices

### Anti-patterns

- Using fixed window counter for a security-sensitive limit (login attempts, password reset) where the 2× boundary spike is an actual exploitable weakness - use sliding window counter or log instead.
- Implementing the check-then-increment as two separate non-atomic operations against a shared store - fix with an atomic increment primitive or a Lua script, per [Non-Atomic Increment](#non-atomic-increment-under-concurrency).
- Reaching for sliding window log at very high limits (100k+/window) purely for "maximum accuracy" without checking whether sliding window counter's bounded approximation error is actually acceptable for the use case - the memory cost difference is real and often not worth paying.

### Selection Matrix

See **[Rate Limiter § Rate Limiting Algorithms](../components/rate-limiter.md#rate-limiting-algorithms)** for the "which one when" decision table - this page covers mechanics, not selection.
